'use strict';
const debug = require('debug')('socket');
const { Server } = require("socket.io");


const init_socket = (server) => {
  const socketIO = new Server(server)

  // middleware
  socketIO.use((socket, next) => {
    var state = socket.handshake.query.state
    debug("[%s] client begin connect query: %o", socket.id, socket.handshake.query)
    debug('[%s] state: %s', socket.id, state)
    
    if(!state || state == ''){
      return next(new Error('state required'))
    }
    socket.state = state
    next()
    
  })

  socketIO.on('connection', function (socket) {
    const state = socket.state
    debug('[%s] allow connection', socket.id)
    debug('[%s] state: %o', socket.id, state)
    socket.emit('messages', { event_name: 'socket_info', socket_id: socket.id, data: state })

    // join client to room channel
    const channel = `auth:${state}`
    debug('[%s] joins to %o', socket.id, channel)
    socket.join(channel)

  });

  return socketIO;
};

module.exports = init_socket
