const querystring = require('querystring');
const debug = require('debug')('info');
const logger = require('./winston');
const request = require('request');
const appConfig = require('config');
const jsonwebtoken = require('jsonwebtoken');
const jwt = require('jwt-simple');
const _ = require('lodash');
const htmlEntities = require('html-entities');
const prettyHtml = require('json-pretty-html').default;
const ROOT_URL = appConfig.get('root_url');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

const redisURL = `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`;

const redis = require("redis");
const redisClient = redis.createClient({url: redisURL});

console.log('redisURL:', redisURL);

function getHomeURL(index) {
	return `${ROOT_URL}/login?env=${index}`;
}

module.exports = function(app) {

	const socketIO = app.get('socket.io');

	app.all("*", function (req, res, next) {  // runs on ALL requests
		var ua = req.header('user-agent');
		res.locals.isMobile = false;
		if(/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile|ipad|android|android 3.0|xoom|sch-i800|playbook|tablet|kindle/i.test(ua)) {
			res.locals.isMobile = true;
		}
		next()
	})

	app.get('/', function(req, res){
		res.redirect(getHomeURL(1));
	})

	app.get('/callback/mi', function(req, res){
		res.status(200).send();
	})

	// main login page //
	app.get('/login', async function(req, res){
		// check realm exist in config
		let env_index = req.query.env || 1;
		let iat = req.query.iat || 0;
		
		if(!appConfig.has('env.' + env_index)){
			res.redirect(getHomeURL(1));
			return;
		}

		const page_config = appConfig.get('env.' + env_index);
		const auth_server_url = page_config['auth-server-url'];
		const state = uuidv4();

		const page_options = {
			ROOT_URL: ROOT_URL,
			env_index: env_index,
			title: `IPification Showcase`, 
			fa_clients: _.filter(page_config.clients, row => row.display_block.length == 0 || row.display_block.indexOf(1) >= 0),
			sfa_clients: _.filter(page_config.clients, row => row.display_block.length == 0 || row.display_block.indexOf(2) >= 0),
			auth_server_url: auth_server_url,
			realm: page_config.realm,
			state: state,
			iat: iat
		}

		req.session.state = state;
		// qrcode
		const client = page_config.clients[0];
		const authUrl = `${ROOT_URL}/auth?env=${env_index}&client_id=${client.client_id}&state=${state}&qrcode=1&iat=${iat}`
		const qrCode = await QRCode.toDataURL(authUrl);
		page_options.qrCode = qrCode;
		
		logger.info(`state: ${state}, authUrl: ${authUrl}`);
		res.render('login', page_options);
		
	});

	app.get('/auth', function(req, res){
		let env_index = req.query.env;
		let page_config = appConfig.get('env.' + env_index);

		if(!page_config){
			logger.info(`env invalid`);
			res.render('404', { title: 'env invalid'});
			return;
		}

		let auth_server_url = page_config['auth-server-url'];
		let realm_name = page_config.realm;
		let client_id = req.query.client_id;
		let phone = req.query.phone;
		let qrcode = req.query.qrcode || 0;
		let iat = parseInt(req.query.iat || 0);
		let state = req.query.state || req.session.state;
		req.session.state = state;

		logger.info(`state: ${state}, query: ${querystring.stringify(req.query)}`);

		if(!state || state == ''){
			logger.info(`state params is missing`);
			res.status(200).send("state params is missing");
			return;
		}

		// check client
		let clients = page_config.clients;
		let client = _.find(clients, function(client) { return client.client_id == client_id; });
		if(!client){
			logger.info(`Client not found`);
			res.status(200).send("Client not found");
			return;
		}

		let redirectClientURL = `${ROOT_URL}/ipification/${env_index}/${client_id}/${qrcode}/callback`;
		
		let params = {
			response_type: 'code',
			client_id: client_id,
			redirect_uri: redirectClientURL,
			scope: 'openid',
			state: state,
			nonce: uuidv4()
		};

		if(phone){
			if(iat === 1){
				logger.info('iat == 1');
				params.request = jsonwebtoken.sign({login_hint: phone, client_id: client_id, state: state}, client.client_secret, {algorithm: 'HS256'}, {typ: 'JWT'});
			}else{
				logger.info('iat == 0');
				params.request = jwt.encode({login_hint: phone, client_id: client_id, state: state}, client.client_secret);
			}
			
		}
		let redirectURL = `${auth_server_url}/realms/${realm_name}/protocol/openid-connect/auth?` + querystring.stringify(params);
		logger.info(`redirectURL: ${redirectURL}`);

		setTimeout(() => {
			res.redirect(redirectURL);
		}, 100);
		
		
	})

	app.get('/ipification/:env/:client_id/:qrcode/callback', function(req, res){
		const env_index = req.params.env;
		const page_config = appConfig.get('env.' + env_index);
		const auth_server_url = page_config['auth-server-url'];
		const realm_name = page_config.realm;
		const client_id = req.params.client_id;
		const state = req.query.state;
		const qrcode = req.params.qrcode;

		logger.info(`params: %o`, req.params);
		logger.info(`query: %o`, req.query);

		// check client
		let clients = page_config.clients;
		let client = _.find(clients, function(client) { return client.client_id == client_id; });
		if(!client){
			logger.info('Client not found');
			res.status(200).send("Client not found");
			return;
		}

		let redirectClientURL = `${ROOT_URL}/ipification/${env_index}/${client_id}/${qrcode}/callback`;

		let tokenEndpointURL = auth_server_url + '/realms/' + realm_name + '/protocol/openid-connect/token';
		let userEndpointURL = auth_server_url + '/realms/' + realm_name + '/protocol/openid-connect/userinfo';

		if(req.query.error || req.query.error_description){
			res.status(200).send(htmlEntities.encode(req.query.error_description || req.query.error));
			return;
		}

		logger.info(`state: ${req.session.state}, query state: ${state}`);
		if(req.session.state !== state){
			logger.info(`state query not same session state`);
			res.redirect(getHomeURL(env_index));
			return;
		}

		let params = {
			code: req.query.code,
			redirect_uri: redirectClientURL,
			grant_type: 'authorization_code',
			client_id: client_id,
			client_secret: client.client_secret
		};

		logger.info('call token endpoint: %o', params);

		request.post(tokenEndpointURL, {form: params}, (error, response, body) => {
			if (error) { 
				logger.error(error);
				res.status(400).send(error);
			}else{
				var info = JSON.parse(body);
				if(info.error){
					logger.info('parse body error body: %o', body);
					res.redirect(`${ROOT_URL}/login?env=${env_index}`)
					return;
				}

				let access_token = info.access_token;

				request.post(userEndpointURL, {form: {access_token: access_token}}, (error, response, body) => {
					if (error) { 
						logger.error('call user endpoint error: %o', error); 
						res.status(400).send(error);
					}else{
						const info = JSON.parse(body);
						logger.info('user info response');
						logger.info('%o', info);

						const formated_response = info
						const html_body = prettyHtml(formated_response);

						const response = {
							realm_name: realm_name,
							ROOT_URL,
							body: html_body, 
							client_id,
							client_title: client.title,
							env_index,
							state,
							homeURL: getHomeURL(env_index)
						}

						const channel = `state_${state}`;
						redisClient.set(channel, JSON.stringify(response), 'EX', 5);
						if(qrcode == "1"){
							logger.info('emit qrcode success to channel: %s', channel)
							socketIO.to(channel).emit('messages', { event_name: 'login_success', state: state, data: response })
							res.render('qr_success', {
								ROOT_URL: ROOT_URL
							})
						}else{
							res.render('result', response);
						}
						
					}
				});
			}
		});

		
	})

	app.get('/qrcode/:state', function(req, res){
		const state = req.params.state;
		const env_index = req.query.env;
		const channel = `state_${state}`;

		redisClient.get(channel, function(err, data) {

			try {
				const response = JSON.parse(data);
				if(response){
					res.render('result', response);
				}else{
					res.redirect(getHomeURL(env_index || 1));
				}
			} catch (error) {
				res.redirect(getHomeURL(env_index || 1));
			}
			
		});
		

	})

};
