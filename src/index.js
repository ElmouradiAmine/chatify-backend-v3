const express = require('express');
const http = require("http");
const app = express();
const cors = require("cors");
const socketio = require("socket.io");
const server = http.createServer(app);
const io = socketio(server);

const { addUser, removeUser, getUsersInSameRoom, getUser, getCount } = require('./user/user');

var Ddos = require('ddos')
var ddos = new Ddos({burst:10, limit:4})


app.use(cors());
app.use(ddos.express);

app.get('/count', (req,res) => {
  res.json(getCount());
})
io.on('connect', (socket) => {
  //When a new user joins either add it on the users list or on the queue list 
  //depending if there is already a waiting user.
    addUser(socket, (user, matchedUser) => {
      if (matchedUser && user) {
        io.to(user.id).emit('match', matchedUser);
        io.to(matchedUser.id).emit('match', user);
      }
    });

  io.emit('count', getCount());


    //Send leave event to both client if one of them wants to stop the chat
    socket.on('stop', () => {
      const matchedUsers = getUsersInSameRoom(socket.id)
      const room = matchedUsers[0].room;
      if (matchedUsers) {
        io.to(room).emit('leave'); 
        io.sockets.connected[matchedUsers[0].id].leave(room);
        io.sockets.connected[matchedUsers[1].id].leave(room);
      }
    })

    socket.on('isTyping', (isTyping) => {
      const user = getUser(socket.id);
      if (user) {
        socket.broadcast.to(user.room).emit('isTyping', isTyping);
      }
    })

    socket.on('message', (message) => {
      const user = getUser(socket.id);
      if (user) {
        const room = user.room;
        io.to(room).emit('message', {message, id: socket.id, createdAt: Date.now()});
      }
    })

    //Add the user to the queue again if he sents a next event
    socket.on('next', () => {
      addUser(socket, (user, matchedUser) => {
        if (matchedUser && user) {
          io.to(user.id).emit('match', matchedUser);
          io.to(matchedUser.id).emit('match', user);
        }
      });
    });

    socket.on('disconnect', () => {
      removeUser(socket, (room) => {
        if (room) {
          io.in(room).emit('leave');
          const matchedUsers = getUsersInSameRoom(socket.id)
          if (matchedUsers) {
          io.to(matchedUsers[0].room).emit('leave'); 
          io.sockets.connected[matchedUsers[0].id].leave();
          io.sockets.connected[matchedUsers[1].id].leave();
      }
        }
  io.emit('count', getCount());

      });
    })
})

const port = process.env.PORT || 8000;
server.listen(port, () => {
  console.log("Server listening into port,", port);
});

module.exports = io;

