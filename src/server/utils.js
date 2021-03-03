module.exports = {
    calcControlBit: (bitNumber, str) => {
        let controlBitValue = 0
        for (let i = bitNumber - 1; i < str.length; i += bitNumber * 2 ) {
            const substr = str.substring(i, i + bitNumber)
            for (let j = 0; j < substr.length; j++) {
                if (substr[j] === '1') {
                    controlBitValue++
                }
            }
        }
        return controlBitValue
    },
    getOppositeValueInIndex: (str, index) => {
        return `${str.substring(0, index - 1)}${(str[index - 1] === '1' ? '0' : '1')}${str.substring(index !== str.length - 1 ? index: index - 1)}`
    },
    decodeMessage: (message) => {
        const splitMessage = message.match(new RegExp(`.{1,${11}}`, 'g'))
        return splitMessage.reduce((acc, current) => {
            return `${acc}${String.fromCharCode(parseInt(current, 2))}`
        }, '')
    }
}
