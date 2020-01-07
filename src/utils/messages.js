"use strict"


const generateMessage = (text, username) => {
    return {
        text,
        username,
        createdAt: new Date().getTime()
    }
}


module.exports = {
    generateMessage
}
