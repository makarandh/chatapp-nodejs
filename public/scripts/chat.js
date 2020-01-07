"use strict"

const socket = io()

const messageWindow = document.getElementById("messages")
const chatText = document.getElementById("new_text")
const chatForm = document.getElementById("chat_form")
const chatButton = document.getElementById("btn_send")
const btnLoc = document.getElementById("send-location")

const messageTemplate = document.getElementById("message-template").innerHTML
const systemMessageTemplate = document.getElementById("system-message-template").innerHTML
const locationTemplate = document.getElementById("location-template").innerHTML
const sidebarTemplate = document.getElementById("sidebar-template").innerHTML

const {username, room} = Qs.parse(location.search, {ignoreQueryPrefix: true})


const autoscroll = () => {
    // New message element
    const newMessage = messageWindow.lastElementChild
    
    // Height of new message = text height + margin
    const newMessageStyles = getComputedStyle(newMessage)
    const newMessageMargin = parseInt(newMessageStyles.marginBottom) + parseInt(newMessageStyles.marginTop)
    const newMessageHeight = newMessage.offsetHeight + newMessageMargin
    
    // Visible Height
    const visibleHeight = messageWindow.offsetHeight
    
    // Height of message container
    const containerHeight = messageWindow.scrollHeight
    
    // How far have I scrolled
    const scrollOffset = messageWindow.scrollTop + visibleHeight
    
    if (containerHeight - newMessageHeight <= scrollOffset) {
        messageWindow.scrollTop = messageWindow.scrollHeight
    }
}


const processMessage = (message, sender) => {
    console.log(message)
    const mesgObj = {
        message: message.text,
        createdAt: moment(message.createdAt).format("h:mm:ss a")
    }

    let html
    switch(sender) {
        case "self":
            mesgObj.username = "Me"
            html = Mustache.render(messageTemplate, mesgObj)
            break
        case "other":
            mesgObj.username = message.username
            html = Mustache.render(messageTemplate, mesgObj)
            break
        case "server":
            html = Mustache.render(systemMessageTemplate, mesgObj)
    }
    messageWindow.insertAdjacentHTML("beforeend", html)
    autoscroll()
}


const processLocation = (location, sender) => {
    const locObj = {
        location_url: location.text,
        createdAt: moment(location.createdAt).format("h:mm:ss a")
    }
    
    let html
    if(sender === "self") {
        locObj.username = "Me"
        html = Mustache.render(locationTemplate, locObj)
    } else {
        locObj.username = location.username
        html = Mustache.render(locationTemplate, locObj)
    }
    messageWindow.insertAdjacentHTML("beforeend", html)
    autoscroll()
}


chatForm.addEventListener("submit", (e) => {
    e.preventDefault()
    chatButton.disabled = true
    const newMessage = chatText.value
    chatText.value = ""
    chatText.focus()
    socket.emit("newMessage", newMessage, (serverMsg) => {
        chatButton.disabled = false
        if(serverMsg) {
            alert(serverMsg)
            console.log("Message delivered and cleaned.")
        } else {
            console.log("Message delivered")
        }
    })
})


btnLoc.addEventListener("click", (e) => {
    e.target.disabled = true
    e.target.innerText = "Processing geo-location..."
    if(!navigator.geolocation) {
        e.target.innerText = "Your browser doesn't support geolocation"
        return
    }
    
    navigator.geolocation.getCurrentPosition((position) => {
        const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        }
        socket.emit("sendLocation", location, (serverMsg) => {
            e.target.disabled = false
            e.target.innerText = "Send Location"
            if(serverMsg) {
                alert(serverMsg)
            }
            console.log("location delivered")
        })
    })
})


socket.on("sysMessage", (message) => {
    processMessage(message, "server")
})

socket.on("newMessage", (message) => {
    processMessage(message, "other")
})

socket.on("newMessageSelf", (message) => {
    processMessage(message, "self")
})

socket.on("locMesg", (message) => {
    processLocation(message, "other")
})

socket.on("locMesgOrigin", (message) => {
    processLocation(message, "self")
})

socket.on("roomData", ({room, users}) => {
    const html = Mustache.render(sidebarTemplate, {
        room,
        users
    })
    document.getElementById("sidebar").innerHTML = html
})

socket.emit("join", {username, room}, (error) => {
    if(error) {
        alert(error)
        document.location.replace("/")
    }
})
