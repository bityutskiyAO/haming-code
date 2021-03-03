import React, {useState, useCallback, useMemo, useEffect} from 'react'
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import {createWebSocket, wsSend} from "./utils/websocket-utils";

const ws = createWebSocket('ws://localhost:8080')

const getBinaryAsciiFromChar = (char) => (char.charCodeAt(0) >>> 0).toString(2).padStart(11, '0')
const decodeMessage = (message) => {
    const splitMessage = message.match(new RegExp(`.{1,${11}}`, 'g'))
    return splitMessage.reduce((acc, current) => {
        return `${acc}${String.fromCharCode(parseInt(current, 2))}`
    }, '')
}
const WORD_LENGTH = 83
// WORD SIZE 83 chars
// Контрольные биты вставляются по степеням двойки: 1, 2, 4, 8, 16, 32, 64
// 001011101111111011111111111111101111111111111111111111111111110111111111111111111111111111

const getBinaryString = (str) => str.split('').map((val) => getBinaryAsciiFromChar(val)).join('')
const splitBinaryStringByLength = (str, length = WORD_LENGTH,) => {
    return str.match(new RegExp(`.{1,${length}}`, 'g'))
}

const calcControlBit = (bitNumber, str) => {
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
}

const getControlBits = (str) => {
    return [1, 2, 4, 8, 16, 32, 64].map((bit) => calcControlBit(bit, str)).map((bit) => {
        return bit % 2 === 0 ? 0 : 1
    })
}

const encodeString = (str, length) => {
    let extendStr = str.padEnd(WORD_LENGTH, '0')
    const [bit1, bit2, bit4, bit8, bit16, bit32, bit64] = getControlBits(extendStr)
    return {
        rawStr: extendStr,
        controlBits: [{position: 1, value: bit1}, {position: 2, value: bit2}, {position: 4, value: bit4}, {position: 8, value: bit8}, {position: 16, value: bit16}, {position: 32, value: bit32}, {position: 64, value: bit64}]
    }
}

const App = () => {
    const [value, setValue] = useState('')
    const [messages, setMessages] = useState('')
    const [errors, setErrors] = useState(0)
    const [serverResponse, setServerResponse] = useState(null)

    const send = useMemo(() => wsSend(ws), [ws])

    useEffect(() => {
        ws.onmessage = (event) => {
            setMessages((prevState => `${prevState}\n Сообщение от сервера: \n ${event.data}\n`))
        }
    }, [])

    const addErrorToRandomlyBit = (message, index) => {
        const addError = Math.random()
        if (addError > 0.7) {
            setErrors(prevState => prevState + 1)
            return `${message.substring(0, index)}${(message[index] === '1' ? '0' : '1')}${message.substring(index !== message.length - 1 ? index + 1: index)}`

        }
        return message
    }


    const addErrorToRandomlyBits = (message) => {
        const errorProbability = Math.random()
        console.log('message', message)
        console.log('errorProbability', errorProbability)
        let resultMessage = `${message}`
        if (errorProbability > 0.7) {
            const indexArray = []
            for (let i = 0; i < 10; i++) {
                indexArray.push(Math.floor(Math.random() * (WORD_LENGTH - 1)))
            }
            indexArray.forEach((index) => {
                console.log('index', index)
                setErrors(prevState => prevState + 1)
                resultMessage = `${resultMessage.substring(0, index)}${(resultMessage[index] === '1' ? '0' : '1')}${resultMessage.substring(index !== resultMessage.length - 1 ? index + 1: index)}`
                console.log('resultMessage', resultMessage)
            })
            return {resultMessage, state: 'multipleErrors'}
        }
        return {resultMessage, state: 'withoutErrors'}
    }


    const handleDataSend = useCallback((type) => {
        setMessages('')
        const binaryText = getBinaryString(value)
        const splitByLengthBinaryText = splitBinaryStringByLength(binaryText, WORD_LENGTH)
        const encodedBinaryText = splitByLengthBinaryText.map((str) => encodeString(str, str.length))

        let encodedTextToSend = []
        setErrors(0)
        switch(type) {
            case 'one error': {
                encodedTextToSend = encodedBinaryText.map((message) => {
                    const randomIndex = Math.floor(Math.random() * (WORD_LENGTH - 1))
                    return {
                        ...message,
                        rawStr: addErrorToRandomlyBit(message.rawStr, randomIndex)
                    }
                })
                break
            }
            case 'multiple errors': {
                encodedTextToSend = encodedBinaryText.map((message) => {
                    const { state, resultMessage } = addErrorToRandomlyBits(message.rawStr)
                    return {
                        ...message,
                        state,
                        rawStr: resultMessage
                    }
                })
                break
            }
            default: {
                break
            }
        }
        if (encodedTextToSend.length > 0 ) {
            setMessages((prevState => `${prevState}\n Отправляемый текст: \n ${decodeMessage(encodedTextToSend.map((text) => text.rawStr).join(''))}\n`))
            send(JSON.stringify(encodedTextToSend))
        } else {
            setMessages((prevState => `${prevState}\n Отправляемый текст: \n ${decodeMessage(encodedBinaryText.map((text) => text.rawStr).join(''))}\n`))
            send(JSON.stringify(encodedBinaryText))
        }
    }, [value, send])

    return (
        <div className="container main-container">
            <div className="message-container">
                <div>
                <label htmlFor="input" style={{fontSize: '24px'}}>Введите текст для отправки на сервер</label>
                <textarea
                    placeholder="Введите текст для кодировки кодом Хемминга"
                    maxLength={3000}
                    id="input"
                    className="container_input"
                    name="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                />
                </div>
                <div>
                <label htmlFor="input" style={{fontSize: '24px'}}>Обмен сообщениями с сервером</label>
                <textarea
                    title="Обмен сообщениями с сервером"
                    maxLength={3000}
                    id="input response"
                    className="container_input"
                    name="text"
                    disabled
                    value={messages}
                /></div>
            </div>
            <button className="btn btn-primary mt-4"
                    onClick={handleDataSend}
            >
                Оттправить данные
            </button>
            <button className="btn btn-primary mt-4"
                    onClick={() => handleDataSend('one error')}
            >
                Оттправить данные c 1 ошибкой на слово
            </button>
            <button className="btn btn-primary mt-4"
                    onClick={() => handleDataSend('multiple errors')}
            >
                Отправить данные с множественными ошибками
            </button>
        </div>

    )
}

export default App;
