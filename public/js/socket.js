window.subscribe_session = function(state){
  var socketPath = '/socket.io';

  window.socket = io('', { 
    path: socketPath,
    query: {
      state: state
    }
  });

  window.socket.on('messages', function (response) {
    console.log('socket response: ', response);
    var event_name = response.event_name;

    if(event_name == 'login_success'){
      window.location.href = '/auth/complete';
    }
  });
}

if(typeof session_state !== 'undefined') window.subscribe_session(session_state)