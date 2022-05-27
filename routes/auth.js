const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const htmlEntities = require('html-entities');
const qs = require('qs');
const axios = require("axios");
const debug = require('debug')('info');
const jwt = require('jwt-simple');
const prettyHtml = require('json-pretty-html').default;
const redis = require('ioredis');
const JSONCache = require('redis-json');

const redis_client = new redis(process.env.REDIS_URL);
const jsonCache = new JSONCache(redis_client, {prefix: 'ip-demo:'});

router.get('/login', function(req, res) {
  const error_message = req.session.error_message;
  req.session.error_message = null;

  res.render('login', {
    error_message: htmlEntities.encode(error_message),
    node_env: process.env.NODE_ENV
  });
});

router.get('/start', function(req, res) {
  const { clients, auth_server_url, realm, baseUrl } = res.locals;
  const { user_flow: userFlow, phone, state } = req.query || {};
  const client = clients.find(item => item.user_flow === userFlow);
  
  if(!client){
    res.send("Client not found");
    return;
  }

  if(!state || state == ''){
    res.redirect('/auth/login');
    return;
  }

  // build auth url
  const { client_id: clientId, client_secret: clientSecret, scope, channel } = client;
  const redirectUrl = `${baseUrl}/auth/callback/${userFlow}`;
  let params = {
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUrl,
    scope: scope,
    state: state,
    nonce: uuidv4(),
    ui_locales: 'en',
    consent_id: 'ipconsent001eng',
    consent_timestamp: Math.floor(Date.now() / 1000)
  };
	if(channel) params.channel = channel;

	if(phone){
		params.request = jwt.encode({
			login_hint: phone, 
			client_id: clientId, 
			state: state, 
			scope,
			response_type:'code',
			redirect_uri: redirectUrl
		}, clientSecret);
	}
	const authUrl = `${auth_server_url}/realms/${realm}/protocol/openid-connect/auth?` + qs.stringify(params);
	debug(`authUrl: ${authUrl}`);
	res.redirect(authUrl);
});

/*

  desktop flow
  1. user access home page
  2. generate qrcode "***-qrcode" -> show qrcode
  
  3. user scan qr code from mobile
    - user complete auth process

  4. server side receive callback request
    5.1 check if state content "-qrcode"
      - socket notify to desktop browser -> show qr code page success

  5. desktop browser receive socket event
  6. redirect to event url with set qrcode = 0
  7. start callback with code -> exchange to token and get user information
  8. show user info page

  mobile web flow
  1. user access home page
  2. user click IM button
  
  3. user complete IM process

  4. server side receive callback request
  5. show user info page

*/

router.get('/callback/:userFlow', async function(req, res){
  // console.log('req.headers', req.headers);

  const { userFlow } = req.params || {};
  const { state, code } = req.query || {};
  const { clients, auth_server_url, realm, baseUrl } = res.locals;
  const ipBackchannelAuth = req.headers['ip-backchannel-im-auth'] === 'true';

  if(req.query.error || req.query.error_description){
    const error_message = req.query.error_description || req.query.error;
    req.session.error_message = error_message;
    res.redirect(`/auth/login`);
    return;
  }

  const client = clients.find(item => item.user_flow === userFlow);
  if(!client){
    res.send("Client not found");
    return;
  }

  const { client_id: clientId, client_secret: clientSecret, title: pageTitle } = client;

  const redirectUri = `${baseUrl}/auth/callback/${userFlow}`;
  const tokenUrl = `${auth_server_url}/realms/${realm}/protocol/openid-connect/token`;
  const userUrl = `${auth_server_url}/realms/${realm}/protocol/openid-connect/userinfo`;

	const params = {
		code: code,
		redirect_uri: redirectUri,
		grant_type: 'authorization_code',
		client_id: clientId,
		client_secret: clientSecret
	};

	try {
		const config = {headers: {'Content-Type': 'application/x-www-form-urlencoded'}}
    // console.log('token params', params);
		const { data: tokenInfo } = await axios.post(tokenUrl, qs.stringify(params), config);
		const { access_token: accessToken } = tokenInfo;
    // console.log('tokenInfo', tokenInfo);

		const { data: userInfo } = await axios.post(userUrl, qs.stringify({ access_token: accessToken }), config);

		const response = {
			userInfo: prettyHtml(userInfo), 
			client_id: clientId,
			client_title: pageTitle,
			state
		}

    console.log(`store state: ${state}, response: ${JSON.stringify(response)}`);
    await jsonCache.set(state, response);
    const auth_complete_url = `/auth/complete?state=${state}`;

    if(ipBackchannelAuth) {
      console.log('ipBackchannelAuth: true -> render 200');
      res.send();
      return;
    }

    // if check qr code in state and state have qrcode text
    // forward url to desktop browser to continue auth flow and exchange code
    
    if(state.indexOf('-qrcode') >= 0) {
      // emit to desktop browser
      const channel = `auth:${state}`;
      req.app.get('socket').to(channel).emit('messages', { 
        event_name: 'url',
        url: auth_complete_url
      });
      res.redirect('/auth/qrcode/complete');
      return;
    }

    res.redirect(auth_complete_url);
	} catch (err) {
		console.log('---> get token error: ', err.message);
		res.status(400).send(err.message);
	}
})

router.get('/complete', async (req, res) => {
  const { state } = req.query || {};

  let i = 0;
  let response;

  while (i <= 4) {
    response = await jsonCache.get(state || '');
    if(response) {
      break;
    } else {
      await delay(1000);
    }
    i += 1
  }

  if(response) {
    // set user is logined in
    req.session.isAuthenticated = true;
    req.session.userData = response;
    res.redirect('/user/info');
    return;
  }
  res.redirect('/');
})

router.get('/qrcode/complete', async (req, res) => {
  res.render('qr_success');
})

function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
} 

module.exports = router;
