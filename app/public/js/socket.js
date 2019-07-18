window.subscribe_topic = function(){
  const socket = window.socket;
  var appURL = new URL(window.ROOT_URL);

  if(socket){
    socket.close();
  }

  var socketPath = (appURL.pathname == '/' ? '' : appURL.pathname) + '/socket.io';

  window.socket = io(appURL.origin, { 
    path: socketPath,
    query: {
      state: window.STATE_PARAM
    }
  });

  window.socket.on('messages', function (response) {
    console.log('socket response: ', response);
    var event_name = response.event_name;

    if(event_name == 'login_success'){
      var state = response.state;
      var data = response.data;
      window.location.href = window.ROOT_URL + '/qrcode/' + state + '?env=' + data.env_index;
    }
  });
}

window.subscribe_topic()