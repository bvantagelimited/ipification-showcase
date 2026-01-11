const express = require('express');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const createError = require('http-errors');
const config = require('config');
const helmet = require("helmet");
const fs = require('fs');

require('dotenv').config()

const { deepMerge } = require('./utils/helpers');

// Load locale.json and merge with locale from default.json if exists
const localePath = path.join(__dirname, 'config', 'locale.json');
const defaultLocale = JSON.parse(fs.readFileSync(localePath, 'utf8'));

const locale = config.locale ? deepMerge(defaultLocale, config.locale) : defaultLocale;

const app = express();

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginOpenerPolicy: false
}));

app.set('trust proxy', 1);
app.locals.pretty = true;

// app.use(nocache());
app.use(logger('dev'));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(session({
  secret: 'secret-session-key',
  resave: false,
  saveUninitialized: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(require('stylus').middleware({ src: __dirname + '/public' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  res.locals = {
    ...res.locals,
    title: 'IPification Showcase',
    stage_url: process.env.STAGE_URL,
    live_url: process.env.LIVE_URL,
    live_id_url: process.env.LIVE_ID_URL,
    ...config,
    locale: locale,
    baseUrl: `${req.protocol}://${req.headers.host}`,
    get_flow_title: (user_flow, default_title) => {
      const client = config.clients.find(item => item.user_flow === user_flow);
      return client ? client.title : default_title;
    },
    app_env: process.env.NODE_ENV || 'development'
  }

  // res.setHeader('Server', 'IPification');

  next();
});

const indexRouter = require('./routes/index');
const userRouter = require('./routes/user');
const authRouter = require('./routes/auth');
const deviceRouter = require('./routes/device');
const ts43Router = require('./routes/ts43');

app.use('/', indexRouter);
app.use('/user', userRouter);
app.use('/auth', authRouter);
app.use('/device', deviceRouter);
app.use('/ts43', ts43Router);

// error handler
app.use(function (err, req, res, next) {
  next(createError(500, err.message));
});

module.exports = app;
