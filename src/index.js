const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))

// Add a catch-all route to serve index.html for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(publicDirectoryPath, 'index.html'))
})

io.on('connection', (socket) => {
    console.log('New WebSocket connection')

    socket.emit('message', 'Welcome!')
    socket.broadcast.emit('message', 'A new user has joined!')

    socket.on('sendMessage', (message, callback) => {
        const filter = new Filter()
        if (filter.isProfane(message)) {
            return callback(filter.replaceWord(message))
            // return callback('Profanity is not allowed')
        }
        io.emit('message', message)
        callback('Delivered!')
    })

    socket.on('disconnect', () => {
        io.emit('message', 'A user has left!')
    })

    socket.on('sendLocation', (coords) => {
        io.emit('message', `http://google.com/maps?q=${coords.latitude},${coords.longitude}`)
    })
})

server.listen(port, () => {
    console.log(`Server is up on port ${port}!`)
})