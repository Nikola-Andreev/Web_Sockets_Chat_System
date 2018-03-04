'use strict'

const WEB_SOCKET_SERVER = require('websocket').server
const HTTP = require('http')
const SERVER_PORT = 1337
const SERVER = HTTP.createServer(function(req, res) { // HTTP server
    // Not important for us. We're writing WebSocket server, not HTTP server
}).listen(SERVER_PORT, function() {
    console.log((new Date()) + " Server is listening on port " + SERVER_PORT)
})
const WS_SERVER = new WEB_SOCKET_SERVER({ // WebSocket server
    // WebSocket server is tied to a HTTP server. WebSocket request is just an enhanced HTTP request.
    // For more info http://tools.ietf.org/html/rfc6455#page-6
    httpServer: SERVER
})

process.title = 'node-chat' // Optional. You will see this name in eg. 'ps' or 'top' command

let history = [ ] // latest 100 messages
let clients = [ ] // list of currently connected clients (users)
// Array with some colors
let colors = [ 'red', 'green', 'blue', 'magenta', 'purple', 'plum', 'orange' ]
// ... in random order
colors.sort(function(a,b) { return Math.random() > 0.5 })

// This callback function is called every time someone tries to connect to the WebSocket server.
WS_SERVER.on('request', function(request) {
    console.log((new Date()) + ' Connection from origin ' + request.origin + '.')
    // accept connection - you should check 'request.origin' to make sure that client is
    // connecting from your website (http://en.wikipedia.org/wiki/Same_origin_policy)
    let connection = request.accept(null, request.origin)
    // we need to know client index to remove them on 'close' event
    let index = clients.push(connection) - 1
    let userName = false
    let userColor = false
    console.log((new Date()) + ' Connection accepted.')
    // send back chat history
    if (history.length > 0) {
        connection.sendUTF(JSON.stringify({ type: 'history', data: history} ))
    }
    // user sent some message
    connection.on('message', function(message) {
        if (message.type === 'utf8') { // accept only text
            // first message sent by user is their name
            if (userName === false) {
                userName = htmlEntities(message.utf8Data) // remember user name
                userColor = colors.shift() // get random color and send it back to the user
                connection.sendUTF(JSON.stringify({ type:'color', data: userColor }))
                console.log((new Date()) + ' User is known as: ' + userName
                    + ' with ' + userColor + ' color.')
            } else { // log and broadcast the message
                console.log((new Date()) + ' Received Message from '
                    + userName + ': ' + message.utf8Data)
                // we want to keep history of all sent messages
                let obj = {
                    time: (new Date()).getTime(),
                    text: htmlEntities(message.utf8Data),
                    author: userName,
                    color: userColor
                }
                history.push(obj)
                history = history.slice(-100)
                // broadcast message to all connected clients
                let json = JSON.stringify({ type:'message', data: obj })
                for (let i = 0; i < clients.length; i++) {
                    clients[i].sendUTF(json)
                }
            }
        }
    })
    // user disconnected
    connection.on('close', function(connection) {
        if (userName !== false && userColor !== false) {
            console.log((new Date()) + " Peer " + connection + " disconnected.")
            clients.splice(index, 1) // remove user from the list of connected clients
            colors.push(userColor) // push back user's color to be reused by another user
        }
    })
})

function htmlEntities(str) { // Helper function for escaping input strings
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}