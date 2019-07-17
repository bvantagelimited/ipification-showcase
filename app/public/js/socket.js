window.subscribe_topic = function(){
  const socket = window.socket;
  var state = window.STATE_PARAM;
  var appURL = new URL(window.ROOT_URL);

  if(socket){
    socket.close();
  }

  var socketPath = (appURL.pathname == '/' ? '' : appURL.pathname) + '/socket.io';

  window.socket = io(appURL.origin, { 
    path: socketPath,
    query: {
      state: state
    }
  });

  window.socket.on('messages', function (response) {
    console.log('socket response: ', response);
    var event_name = response.event_name;
    var state = response.state;

    if(state){
      window.location.href = window.ROOT_URL + '/qrcode/' + state;
    }
  });
}

window.subscribe_topic()