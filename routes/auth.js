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
  const { live = 0 } = req.query || {};
  const state = uuidv4() + ':' + live;
  const error_message = req.session.error_message;
  req.session.error_message = null;
  req.session.state = state;

  res.render('login', {
    state: state,
    error_message: htmlEntities.encode(error_message),
    node_env: process.env.NODE_ENV === 'stage' ? (process.env.NODE_ENV + `-${live}`) : process.env.NODE_ENV
  });
});

router.get('/start', function(req, res) {
  const { clients, auth_server_url, realm, baseUrl } = res.locals;
  const { user_flow: userFlow, phone, qrcode = 0, state } = req.query || {};
  const client = clients.find(item => item.user_flow === userFlow);
  
  if(!client){
    res.send("User flow not found");
    return;
  }

  if(!state || state == ''){
    res.redirect('/auth/login');
    return;
  }

  const live = state.split(':').pop();

  debug(`---> live: ${live}`);

  const { client_id: clientId, client_secret: clientSecret, scope, channel } = client;
  const redirectUrl = `${baseUrl}/auth/callback/${userFlow}/${qrcode}`;
  let params = {
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUrl,
    scope: scope,
    state: state,
    nonce: uuidv4()
  };
  if(live === '1') params = {...params, mcc: '000', mnc: '00'};
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

router.get('/callback/:userFlow/:qrcode', async function(req, res){
  const { userFlow, qrcode } = req.params || {};
  const { state, code } = req.query || {};
  const { clients, auth_server_url, realm, baseUrl, dataStore } = res.locals;

  if(req.query.error || req.query.error_description){
    const error_message = req.query.error_description || req.query.error;
    req.session.error_message = error_message;
    res.redirect('/auth/login');
    return;
  }

  debug(`---> state: ${state}`);

  const client = clients.find(item => item.user_flow === userFlow);
  if(!client){
    res.send("Client not found");
    return;
  }

  const { client_id: clientId, client_secret: clientSecret, title: pageTitle } = client;

  const redirectUrl = `${baseUrl}/auth/callback/${userFlow}/${qrcode}`;
  const tokenUrl = `${auth_server_url}/realms/${realm}/protocol/openid-connect/token`;
  const userUrl = `${auth_server_url}/realms/${realm}/protocol/openid-connect/userinfo`;

	const params = {
		code: code,
		redirect_uri: redirectUrl,
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

		const channel = `auth:${state}`;
		await dataStore.set(channel, response);

		if(qrcode == "1"){
			req.app.get('socket').to(channel).emit('messages', { event_name: 'login_success', state: state, data: response })
			res.redirect('/auth/qrcode/complete');
		}else{
			res.redirect(`/auth/complete`);
		}
	} catch (err) {
		console.log('---> get token error: ', err.message);
		res.status(400).send(err.message);
	}
})

router.get('/qrcode/complete', async (req, res) => {
  res.render('qr_success');
})

router.get('/complete', async (req, res) => {
  const { dataStore } = res.locals;
  const state = req.session.state;
  const channel = `auth:${state}`;

  const response = await dataStore.get(channel);
  if(response) {
    req.session.isAuthenticated = true;
    req.session.userData = response;

    res.redirect('/user/info');
  } else {
    res.status(401).send();
  }
})

module.exports = router;
