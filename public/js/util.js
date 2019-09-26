const util = {
    strToHexCharCode(str) {
    　　if(str === "")
    　　　　return "";
    　　var hexCharCode = [];
    　　hexCharCode.push("0x"); 
    　　for(var i = 0; i < str.length; i++) {
    　　　　hexCharCode.push((str.charCodeAt(i)).toString(16));
    　　}
    　　return hexCharCode.join("");
    },

    hexCharCodeToStr(hexCharCodeStr) {
    　　var trimedStr = hexCharCodeStr.trim();
    　　var rawStr = 
    　　trimedStr.substr(0,2).toLowerCase() === "0x"
    　　? 
    　　trimedStr.substr(2) 
    　　: 
    　　trimedStr;
    　　var len = rawStr.length;
    　　if(len % 2 !== 0) {
    　　　　alert("Illegal Format ASCII Code!");
    　　　　return "";
    　　}
    　　var curCharCode;
    　　var resultStr = [];
    　　for(var i = 0; i < len;i = i + 2) {
    　　　　curCharCode = parseInt(rawStr.substr(i, 2), 16); // ASCII Code Value
    　　　　resultStr.push(String.fromCharCode(curCharCode));
    　　}
    　　return resultStr.join("");
    },

    intToAscii(intArr){
        const sarr = []
        intArr.forEach(item => {
            sarr.push(String.fromCharCode(item))
        })
        return sarr.join('');
    },

    intToHex(intArr){
        if (intArr.length < 20)
            return []
        const sarr = []
        const len = intArr.length
        const n = Math.ceil(len / 24);
        for(let i =0; i<n; i++){
            let one = []
            for(let j=8; j<20;j++){
                let index = i*24+j;
                if(typeof intArr[index] !== "undefined"){
                    let str = intArr[index].toString(16)
                    if(str.length == 1)
                        str = '0' + str
                    one.push(str.toUpperCase())
                } 
            }
            sarr.push(one.join(''))
        }
        return sarr;
    },
    ///rfid?type=bind
    resolveUrl(url){
        // const reg = /\/(\w+)\?(\w+)=(\w+)/
        const reg = /\/(\w+)\/(\w+)/
        const res = reg.exec(url)
        if(!res)
            return false
        return [res[1],res[2]]
    }
}

module.exports = util;