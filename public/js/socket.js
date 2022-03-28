(function () {
  var start_session_listener = function(state){

    var socket = io();

    socket.on('connect', () => {
      // emit socket server to join state channel
      socket.emit('init', { state: state })
    })

    // listener messages from socket server
    socket.on('messages', (response) => {
      // console.log('socket response: ', response);
      var event_name = response.event_name;

      if(event_name == 'url'){
        window.location.href = response.url;
      }
    });
  }

  if(typeof(window.start_session_listener) === 'undefined'){
    window.start_session_listener = start_session_listener;
  }

})();