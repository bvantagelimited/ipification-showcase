
var express = require('express');
var bodyParser = require('body-parser');
const nocache = require('nocache');
const appConfig = require('config');
const cookieSession = require('cookie-session');

var app = express();

app.locals.pretty = true;
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/app/server/views');
app.set('view engine', 'pug');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(require('stylus').middleware({ src: __dirname + '/app/public' }));
app.use(express.static(__dirname + '/app/public'));
app.use(nocache());

app.use(cookieSession({
  name: 'ipshowcase',
  keys: [appConfig.get('secret')],
  // Cookie Options
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}))

var ioServer = require('./app/server/socket')(app);
require('./app/server/routes')(app);

const sv_port = app.get('port');
ioServer.listen(sv_port);
ioServer.on('error', onError);
ioServer.on('listening', onListening);

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error('port ' + sv_port + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error('port ' + sv_port + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  console.log('Listening on ' + sv_port);
}

