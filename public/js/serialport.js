const util = require('./util.js')

let rfidSet = new Set()
let rtype = ''
let bindEPC = ''
const sptool = {
    // 获取低位数据
    getLower(number){
        return  parseInt((number & 0x0000FF).toString(16),16)
    },
    // 获取高位数据
    getHigh(number){
        return  parseInt((number & 0x00FF00).toString(16),16) / 256
    },
    // 获取二进制流的字符串表示[数组]
    getFormatHexArr(arr){
        const letter = []
        arr.forEach(item => {
            let hex = item.toString(16).toUpperCase()
            if(hex.length === 1)
                hex = '0' + hex
            letter.push(hex)
        })
        return letter
    },
    // 【字符串】
    getFormatHex(arr,sp=' '){
        return this.getFormatHexArr(arr).join(sp)
    },
    // 单独
    singleRead(port,parser){
        if (port == {} || port == null) 
            return false
        const that = this
        rtype = 'single';
        return new Promise(function(resolve,reject){
            parser.on('data',(data) => {
                if(rtype === 'single'){
                    const res = that.getFormatHex(data)
                    console.log('singleRead received',res)
                    if(res.includes('BB 01 FF')){
                        reject('no rfid')
                    } else if(res.includes('BB 02 22')) {
                        const rfids = that.getRfidArr(data)
                        resolve(rfids)
                    }
                }
            })
            const buf = Buffer.from([0xBB,0x00,0x22,0x00,0x00,0x22,0x7E])
            port.write(buf);
        })
    },
    // 多次读，串口发送 BB 00 27 00 03 22 FF FF 4A 7E 
    multiRead(port,parser,times=10){
        if (port == {} || port == null) 
            return false
        const that = this
        rtype = 'multi'
        return new Promise(function(resolve,reject){
            parser.on('data',(data) => {
                if(rtype === 'multi'){
                    const res = that.getFormatHex(data)
                    console.log('multiRead received',res)
                    if(res.includes('BB 01 FF')){
                        console.log('no rfid')
                    } else if(res.includes('BB 02 22')) {
                        const rfids = util.intToHex(data)
                        rfids.forEach(item => {
                            if(item)
                                rfidSet.add(item)
                        })
                    }
                }
            })
            const ba = new Array(0xBB,0x00,0x27,0x00,0x03,0x22,0xFF,0xFF,0x4A,0x7E)
            // 填入读取字数
            ba[7] = that.getLower(times)
            ba[6] = that.getHigh(times)
            // 计算校验和
            let sum = 0
            for(let i=1;i<8;i++){
                sum += ba[i]
            }
            ba[8] = that.getLower(sum)
            console.log('multi send', that.getFormatHex(ba))
            const buf = Buffer.from(ba)
            port.write(buf);
            // 1秒后执行回调
            setTimeout(function(){
                const rfids = Array.from(rfidSet)
                that.endRead(port,parser)
                resolve(rfids)
            },500)
        })
    },
    // 结束群读 BB 00 28 00 00 28 7E
    endRead(port,parser){
        rtype = 'endread'
        parser.on('data',(data) => {
            if(rtype === 'endread'){
                const res = this.getFormatHex(data)
                console.log('endread received',res)
                if(res.includes('BB 01 28')){
                    rfidSet.clear()
                }
            }
        })
        const buf = Buffer.from([0xBB,0x00,0x28,0x00,0x00,0x28,0x7E])
        port.write(buf, function(err){
        });
    },

    // select参数设置  BB 00 0C 00 13 05 00 00 00 20 60 00 (E2) 校验 7E
    setSelect(port,parser,rfids){
        const that = this
        rtype = 'select'
        return new Promise(function(resolve,reject){
            parser.on('data',(data) => {
                if(rtype === 'select'){
                    const res = that.getFormatHex(data)
                    console.log('setSelect received',res)
                    if(res.includes('BB 01 0C')){
                        resolve(true)
                    }
                }
            })
            let ba = new Array(0xBB,0x00,0x0C,0x00,0x13,0x05,0x00,0x00,0x00,0x20,0x60,0x00)
            const epc = rfids[0]['epc']
            ba = ba.concat(epc)
            let sum = 0
            for(let i=1;i<ba.length;i++){
                sum += ba[i]
            }
            ba.push(that.getLower(sum))
            ba.push(0x7E)
            console.log('setSelect Send',that.getFormatHex(ba))
            const buf = Buffer.from(ba)
            port.write(buf);
        })
    },

    // BB 00 49 00 15 00 00 00 00 01 00 02 00 06 (E2) 校验 E7
    bind(port,parser){
        if (port == {} || port == null) 
            return false
        const that = this
        return new Promise(function(resolve,reject){
            const sp = that.singleRead(port,parser)
            sp.then(rfids => {
                if(rfids){
                    const selectsp = that.setSelect(port,parser,rfids)
                    selectsp.then(res => {
                        console.log('set Select',res)
                        if(res){
                            rtype = 'bind'
                            parser.on('data',(data) => {
                                if(rtype==='bind'){
                                    const res = that.getFormatHex(data)
                                    console.log('bind received',res)
                                    // BB 01 49 00 10 0E 34 00 (E2) 00 4E 7E
                                    if(res.includes('BB 01 49')){
                                        resolve([that.getFormatHex(bindEPC,'')])
                                    } else if(res.includes('BB 01 FF')){
                                        reject('错误码：' + data[5])
                                    }
                                }
                            })
                            let ba = new Array(0xBB,0x00,0x49,0x00,0x15,0x00,0x00,0x00,0x00,0x01,0x00,0x02,0x00,0x06)
                            bindEPC = that.prepareCard()
                            ba = ba.concat(bindEPC)
                            let sum = 0
                            for(let i=1;i<ba.length;i++){
                                sum += ba[i]
                            }
                            ba.push(that.getLower(sum))
                            ba.push(0x7E)
                            console.log('bind Send',that.getFormatHex(ba))
                            const buf = Buffer.from(ba)
                            port.write(buf);
                            
                        }
                    })
                } else {
                    reject('no card')
                }
            }).catch(err => {reject(err)})
        })
    },

    // BB 00 49 00 15 00 00 00 00 03 00 00 00 06 01 02 03 04 05 06 07 08 09 10 11 12 85 7E
    prepareCard(){
        const ba = new Array()
        const d = new Date()
        ba.push(0xE2)
        ba.push(this.getHigh(d.getFullYear()))
        ba.push(this.getLower(d.getFullYear()))
        ba.push(d.getMonth())
        ba.push(d.getDate())
        ba.push(d.getHours())
        ba.push(d.getMinutes())
        ba.push(d.getSeconds())
        ba.push(this.getHigh(d.getMilliseconds()))
        ba.push(this.getLower(d.getMilliseconds()))
        ba.push(Math.round(Math.random()*255))
        ba.push(Math.round(Math.random()*255))
        console.log('prepare card',ba)
        return ba
    },

    // 获取卡号[{卡号：[],信号:''}] ,类似这样的结构
    getRfidArr(arr){
        const intArr = Array.from(arr)
        if (intArr.length < 20)
            return []
        const sarr = []
        const len = intArr.length
        const n = Math.ceil(len / 24);
        for(let i =0; i<n; i++){
            let one = intArr.slice(8,20)
            sarr.push({
                epc:one,
                rssi:intArr[i*24 + 5]
            })
        }
        return sarr;
    }
}
module.exports = sptool