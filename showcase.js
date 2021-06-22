
const express = require('express');
const bodyParser = require('body-parser');
const nocache = require('nocache');
const appConfig = require('config');
const session = require('express-session');
const redis = require('redis');
const redisClient = redis.createClient();
const redisStore = require('connect-redis')(session);
const logger = require('./app/server/winston');

const app = express();

app.set('trust proxy', 1);

app.locals.pretty = true;
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/app/server/views');
app.set('view engine', 'pug');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(require('stylus').middleware({ src: __dirname + '/app/public' }));
app.use(express.static(__dirname + '/app/public'));
app.use(nocache());

app.use(session({
  secret: appConfig.get('secret'),
  name: 'ipshowcase',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }, // Note that the cookie-parser module is no longer needed
  store: new redisStore({ host: 'localhost', port: 6379, client: redisClient, ttl: 86400 }),
}));

app.use((req, res, next) => {
  let method = req.method;
  let url = req.url;
  let status = res.statusCode;
  let log = `[${req.session.id}] ${method} "${url}" ${status}`;
  logger.info(log);
  next();
});

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

