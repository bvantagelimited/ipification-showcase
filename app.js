
const express = require('express');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const createError = require('http-errors');
const config = require('config');
const redis = require("ioredis");
const nocache = require("nocache");
const helmet = require("helmet");
const RedisStore = require('connect-redis').default;

const redisClient = new redis(process.env.REDIS_URL);

const redisStore = new RedisStore({
  client: redisClient,
  ttl: 86400
})

const app = express();

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginOpenerPolicy: false
}));

app.set('trust proxy', 1);
app.locals.pretty = true;

app.use(nocache());
app.use(logger('dev'));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(session({
  secret: 'secret-session-key',
  resave: false,
  saveUninitialized: true,
  store: redisStore
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(require('stylus').middleware({ src: __dirname + '/public' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  res.locals = {
    title: 'IPification Showcase',
    ...res.locals,
    ...config,
    baseUrl: `${req.protocol}://${req.headers.host}`,
    get_flow_title: (user_flow, default_title) => {
      const client = config.clients.find(item => item.user_flow === user_flow);
      return client ? client.title : default_title;
    }
  }
  next();
});

const indexRouter = require('./routes/index');
const userRouter = require('./routes/user');
const authRouter = require('./routes/auth');

app.use('/', indexRouter);
app.use('/user', userRouter);
app.use('/auth', authRouter);

// error handler
app.use(function(err, req, res, next) {
  next(createError(500, err.message));
});

module.exports = app;
