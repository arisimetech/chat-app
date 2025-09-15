const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')
const { Socket } = require('dgram')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public/')

app.use(express.static(publicDirectoryPath))

io.on('connection', (socket) => {
    console.log('New WebSocket connection')

    socket.on('join', ({ username, room }, callback) => {
        const {error, user} = addUser({id: socket.id, username, room})
        if(error) {
            return callback(error)
        }
        socket.join(user.room)
        socket.emit('message', generateMessage('System Message', 'Welcome!')) // 1 to user that connects
        socket.broadcast.to(user.room).emit('message', generateMessage('System Message', `${username} has joined ${user.room}`)) // 2 to all users
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
        callback()
    })

    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id)
        const filter = new Filter()
        if (filter.isProfane(message)) {
            io.to(user.room).emit('message', generateMessage(user.username, filter.clean(message))) // 3 to user that sends
            callback('Delivered!')
            // return callback('Profanity is not allowed')
        } else {
            io.to(user.room).emit('message', generateMessage(user.username, message)) // 3 to user that sends
            callback('Delivered!')
        }
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage('System Message', `${user.username} has left ${user.room}!`)) // 4 to all users about the user that left
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            }
            )
        }

    })

    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `http://google.com/maps?q=${coords.latitude},${coords.longitude}`))
        callback()
    })
})

server.listen(port, () => {
    console.log(`Server is up on port ${port}!`)
})