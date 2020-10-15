const { v4: uuidv4 } = require("uuid");

let users = [];
let queue = [];

const createUser = (socket, room) =>{
    const user = {
        id: socket.id,
        username: socket.handshake.query["username"],
        gender: socket.handshake.query["gender"],
        ip: socket.request.connection.remoteAddress,
        room: room || uuidv4(),
    };

    socket.join(user.room);
    return user;
};

const addUser = (socket, callback) => {
    //we make sure the user doesnt exist already
    removeUser(socket);
    //Check first if there is no waiting users.
    const waitingUser = queue.shift();
    if (!waitingUser){
      // If there is no waiting user we create a new user and add it to the queue.
      const user = createUser(socket);
      queue = queue.concat([user]);   
    } else {
      // If there is already a waiting user we remove the waiting user from the queue and both the users to the users array
      const user = createUser(socket, waitingUser.room);
      users = users.concat([user, waitingUser]); 
      callback(user, waitingUser);
    }
}


const removeUser = (socket, callback) => {
    const user = users.find((user) => user.id === socket.id ) || queue.find((user) => user.id === socket.id );
    if (user){
        users = users.filter((user) => user.id !== socket.id);
        queue = queue.filter((user) => user.id !== socket.id);
        if (callback)
        callback(user.room);
    }
}

const getUser = (id) => {
    const user = users.find((user) => user.id === id );
    return user;
 
}

const getUsersInSameRoom = (id) => {
    const user = getUser(id);
    if( user){
        const room = user.room;
        return users.filter((user) => user.room === room);
    }
    return null;
    
}

const getCount = () => {
    return users.length + queue.length;
}



module.exports =  {
    addUser,
    removeUser,
    getUser,
    getUsersInSameRoom,
    getCount,
}
