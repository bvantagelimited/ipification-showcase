'use strict';
const debug = require('debug')('socket');
const { Server } = require("socket.io");

const init_socket = (server) => {
  const socketIO = new Server(server)

  socketIO.on('connection', function (socket) {
   
    socket.emit("messages", {
      event_name: "connected",
      socket_id: socket.id
    });

    socket.on("init", async (data) => {
      // join client to room channel
      const channel = `auth:${data.state}`;
      debug('[%s] joins to %o', socket.id, channel);
      socket.join(channel);
    })

  });

  return socketIO;
};

module.exports = init_socket
