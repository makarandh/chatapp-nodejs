"use strict"

const express = require("express")
const http = require("http")
const socketio = require("socket.io")
const path = require("path")
const Filter = require("bad-words")
const {generateMessage} = require("./utils/messages")
const {addUser, getUser, getUsersInRoom, removeUser} = require("./utils/users")


const app = express()
const server = http.createServer(app)
const io = socketio(server)

const PORT = process.env.POT || 3000
const pubDir = path.join(__dirname, "../public")

app.use(express.static(pubDir))


// Ways to emit events:
// *********************
// io.emit() -- emits events to every client
// socket.broadcast.emit() -- emits events to every client except for source client
// socket.emit() -- emit events only to the source client
// ******************
// Emit events to rooms
// *********************
// io.to(room).emit() -- emits events to everyone in room.
// socket.broadcast.to(room).emit() -- emits events to every client in room except for source


io.on("connection", (socket) => {
    
    let usernameG = undefined
    let roomG = undefined
    
    socket.on("join", ({username, room}, callback) => {
        const {error, user} = addUser({id: socket.id, username, room})
        if(error) {
            callback(error)
            return
        }
        username = user.username
        room = user.room
        socket.join(room)
        usernameG = username
        roomG = room
        socket.emit("sysMessage", generateMessage(`Welcome to room ${room}`))
        socket.broadcast.to(room).emit("sysMessage", generateMessage(`${username} has joined the chat`))
        io.to(room).emit("roomData", {
            room,
            users: getUsersInRoom(room)
        })
        console.log(`${username} has joined room ${room}`)
        callback()
    })
    
    socket.on("newMessage", (message, callback) => {
        const filter = new Filter()
        
        if(filter.isProfane(message)) {
            callback("Language!")
        }
        const mesgObj = generateMessage(filter.clean(message), usernameG)
        socket.emit("newMessageSelf", mesgObj)
        socket.broadcast.to(roomG).emit("newMessage", mesgObj)
        console.log(message)
        callback()
    })
    
    socket.on("disconnect", () => {
        const user = removeUser(socket.id)
        roomG = undefined
        if(user) {
            io.to(user.room).emit("sysMessage", generateMessage(`${usernameG} has left the chat.`))
            io.to(user.room).emit("roomData", {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
    
    socket.on("sendLocation", (location, callback) => {
        const locObj = generateMessage(`https://www.google.com/maps?q=${location.latitude},${location.longitude}`, usernameG)
        socket.broadcast.to(roomG).emit("locMesg", locObj)
        socket.emit("locMesgOrigin", locObj)
        callback()
    })
})


server.listen(PORT, () => {
    console.log(`Express running on port ${PORT}`)
})

