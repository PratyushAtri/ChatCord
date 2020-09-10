const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const formatMessage = require('./utils/messages');
const { userJoin, getCurrentUser, userLeave, getRoomUsers } = require('./utils/users');

const app = express();
const server = http.createServer(app);
const io = socketio(server);
const bot = 'ChatCord Bot';

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

// Run when a client connects
io.on('connection', socket => {
    socket.on('joinRoom', ({ username, room }) => {
        const user = userJoin(socket.id, username, room);

        socket.join(user.room);

        // Welcome current user
        socket.emit('message', formatMessage(bot, 'Welcome to ChatCord'));

        // Broadcast when a user connects
        socket.broadcast.to(user.room).emit('message', formatMessage(bot, `${user.username} has joined the chat`));

        // Send users and info
        io.to(user.room).emit('roomUsers', {
            room: user.room,
            users: getRoomUsers(user.room)
        });

    });

    // Listen for chat message
    socket.on('chatMessage', (msg) => {
        const user = getCurrentUser(socket.id);

        io.to(user.room).emit('message', formatMessage(user.username, msg));
    });

    // Broadcast when a user disconnects
    socket.on('disconnect', () => {
        const user = userLeave(socket.id);

        if (user) {
            io.to(user.room).emit('message', formatMessage(bot, `${user.username} has left the chat`));

            // Send users and info
            io.to(user.room).emit('roomUsers', {
                room: user.room,
                users: getRoomUsers(user.room)
            });
        }
    });

});

// Server static assets in production
if (process.env.NODE_ENV === 'production') {
    // Set static folder
    app.use(express.static('public'));

    app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
    });
}

const PORT = 3000 || process.env.PORT;

server.listen(PORT, () => {
    console.log(`Sever running on port ${PORT}`);
});
