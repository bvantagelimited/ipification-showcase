const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const htmlEntities = require('html-entities');
const qs = require('qs');
const axios = require("axios");
const debug = require('debug')('info');
const jwt = require('jwt-simple');
const prettyHtml = require('json-pretty-html').default;

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
    consent_id: 'ip-consent-001-eng',
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

router.get('/callback/:userFlow', async function(req, res){
  const { userFlow } = req.params || {};
  // default check qrcode in state
  const { state, code, qrcode = '1' } = req.query || {};
  const { clients, auth_server_url, realm, baseUrl } = res.locals;

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

  
  const channel = `auth:${state}`;

  // if check qr code in state and state have qrcode text
  // forward url to desktop browser to continue auth flow and exchange code
  
  if(qrcode === '1' && state.indexOf('-qrcode') >= 0) {
    // emit to desktop browser
    req.app.get('socket').to(channel).emit('messages', { 
      event_name: 'url',
      url: `${baseUrl}${req.originalUrl}&qrcode=0` // stop check qrcode from state
    });
    res.redirect('/auth/qrcode/complete');
    return;
  }

	const params = {
		code: code,
		redirect_uri: redirectUri,
		grant_type: 'authorization_code',
		client_id: clientId,
		client_secret: clientSecret
	};

	try {
		const config = {headers: {'Content-Type': 'application/x-www-form-urlencoded'}}
		const { data: tokenInfo } = await axios.post(tokenUrl, qs.stringify(params), config);
		const { access_token: accessToken } = tokenInfo;

		const { data: userInfo } = await axios.post(userUrl, qs.stringify({ access_token: accessToken }), config);

		const response = {
			userInfo: prettyHtml(userInfo), 
			client_id: clientId,
			client_title: pageTitle,
			state
		}

    // set user is logined in
    req.session.isAuthenticated = true;
    req.session.userData = response;

    res.redirect('/user/info');
	} catch (err) {
		console.log('---> get token error: ', err.message);
		res.status(400).send(err.message);
	}
})

router.get('/qrcode/complete', async (req, res) => {
  res.render('qr_success');
})

module.exports = router;
