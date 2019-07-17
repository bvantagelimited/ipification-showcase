'use strict';
var debug = require('debug')('info'),
    _ = require('lodash');

var ioEvents = function(io){
  
  io.on('connection', function (socket) {
    const state = socket.state;
    debug('[%s] allow connection', socket.id);
    debug('[%s] state: %o', socket.id, state);
    socket.emit('messages', { event_name: 'socket_info', socket_id: socket.id, data: state });

    // join client to room channel
    const channel = `state_${state}`;
    debug('[%s] joins to %o', socket.id, channel);
    socket.join(channel);

  });
};

var init_socket = function(app){

  var server 	= require('http').Server(app),
      io 		= require('socket.io')(server);

  io.set('transports', ['polling', 'websocket']);

  // middleware
  io.use((socket, next) => {
    var state = socket.handshake.query.state;
    debug("[%s] client begin connect query: %o", socket.id, socket.handshake.query);
    debug('[%s] state: %s', socket.id, state);
    
    if(!state || state == ''){
      return next(new Error('state required'));
    }
    socket.state = state;
    next();
    
  });

  // Define all Events
  ioEvents(io);

  // check server is live
  app.get('/ping', function (req, res) {
    res.send('pong');
  });

  app.set('socket.io', io);

	// The server object will be then used to list to a port number
  return server;

};

module.exports = init_socket;