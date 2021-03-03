const express = require('express')
const http = require('http')
const WebSocket = require( "ws")
const {getOppositeValueInIndex, calcControlBit, decodeMessage} = require("./utils");


const app = express()
const port = process.env.PORT || 8080
const hostname = process.env.HOST_NAME || 'localhost'

const server = http.createServer(app)

const webSocketServer = new WebSocket.Server({ server });

webSocketServer.on('connection', ws => {
    ws.on('message', m => {
        let errorWordsAmount = 0
        let multipleErrorWordsAmount = 0
        let receivedText = ''

        const parsedMessage = JSON.parse(m)
        parsedMessage.forEach((message) => {
            const checkControlBits = [1, 2, 4, 8, 16, 32, 64].map((bit) => calcControlBit(bit, message.rawStr)).map((bit) => {
                return bit % 2 === 0 ? 0 : 1
            })

            let errorBit = null
            checkControlBits.forEach((bit, ind) => {
                if (bit !== message.controlBits[ind].value){
                    errorBit += message.controlBits[ind].position
                }
            })
            let gettingString = message.rawStr
            if (message.state === 'multipleErrors') {
                multipleErrorWordsAmount++
            } else {
                if (errorBit) {
                    errorWordsAmount++
                    gettingString = getOppositeValueInIndex(message.rawStr, errorBit)
                }
            }
            receivedText = `${receivedText}${gettingString}`
        })
        if (parsedMessage.some(message => message.state === 'multipleErrors')) {
            ws.send(`I have got: ${multipleErrorWordsAmount} words with multiple errors`)
            ws.send(`Try to decode text: ${decodeMessage(receivedText)}`)
        } else {
            if (errorWordsAmount) {
                ws.send(`I have got: ${errorWordsAmount} bit errors`)
                ws.send(`Words fixed correctly: ${errorWordsAmount}`)
                ws.send(`Decoded text: ${decodeMessage(receivedText)}`)
            } else {
                ws.send('Well done. No errors in received text')
            }
        }
    });

    ws.on("error", e => ws.send(e));
});

server.listen(port, hostname, () => {
    console.log("Server started")
})
