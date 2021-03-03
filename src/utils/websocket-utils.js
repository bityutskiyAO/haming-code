export const createWebSocket = (url) => {
    const wsConnection = new WebSocket(url)
    wsConnection.onopen = () => {
        console.log("Соединение установлено.")
    }

    wsConnection.onclose = (event) => {
        if (event.wasClean) {
            console.log('Соединение закрыто чисто')
        } else {
            console.log('Обрыв соединения') // например, "убит" процесс сервера
        }
        console.log('Код: ' + event.code + ' причина: ' + event.reason)
    }

    wsConnection.onerror = (error) => {
        console.log("Ошибка " + error.message)
    }
    return wsConnection
}

export const wsSend = (wsConnection) => (data) => {
// readyState - true, если есть подключение
    if (!wsConnection.readyState) {
        setTimeout( () => {
            wsSend(data)
        }, 100)
    } else {
        wsConnection.send(data)
    }
}
