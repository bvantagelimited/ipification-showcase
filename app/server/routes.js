const querystring = require('querystring');
const debug = require('debug')('info');
const request = require('request');
const appConfig = require('config');
const _ = require('lodash');
const prettyHtml = require('json-pretty-html').default;
const ROOT_URL = appConfig.get('root_url');
const QRCode = require('qrcode');
const uuidv4 = require('uuid/v4');
const {promisify} = require('util');

const redisURL = `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`;

const redis = require("redis");
const redisClient = redis.createClient({url: redisURL});
const getAsync = promisify(redisClient.get).bind(redisClient);

console.log('redisURL:', redisURL);

const orange_redirect_uri = `${ROOT_URL}/orange/callback`

function generateClientQrCode(client) {
	return new Promise((resolve, reject) => {
		QRCode.toDataURL(client.authUrl,  (err, image) => {
			if(err){
				reject(err);
			}else{
				resolve({...client, qrCode: image});
			}
		})
	})
}

function getHomeURL(index, qrcode) {
	const homePage = qrcode == "1" ? "qrcode" : "login";
	return `${ROOT_URL}/${homePage}?env=${index}`;
}

module.exports = function(app) {

	const socketIO = app.get('socket.io');

	app.get('/', function(req, res){
		var URL = `${ROOT_URL}/login?env=1`;
		res.redirect(URL);
	})

	// main login page //
	app.get('/login', async function(req, res){
		// check realm exist in config
		let env_index = req.query.env || 1;
		
		if(!appConfig.has('env.' + env_index)){
			res.render('404', { title: 'Env not found'});
			return;
		}

		const page_config = appConfig.get('env.' + env_index);
		const auth_server_url = page_config['auth-server-url'];
		const state = uuidv4();

		if(env_index === 'orange'){
			const redirect_uri = encodeURI(orange_redirect_uri)
			const orange_auth_url = `${page_config.auth_url}?scope=openid&response_type=code&client_id=${page_config.client_id}&state=${state}&redirect_uri=${redirect_uri}`
			res.render('orange', {
				orange_auth_url: orange_auth_url,
				ROOT_URL: ROOT_URL,
				env_index: env_index,
			})
			return
		}

		const page_options = {
			ROOT_URL: ROOT_URL,
			env_index: env_index,
			title: `Realm ${page_config.realm}`, 
			fa_clients: _.filter(page_config.clients, row => row.display_block.length == 0 || row.display_block.indexOf(1) >= 0),
			sfa_clients: _.filter(page_config.clients, row => row.display_block.length == 0 || row.display_block.indexOf(2) >= 0),
			auth_server_url: auth_server_url,
			realm: page_config.realm,
			state: state
		}

		const state_param = req.query.state;
		const channel = `state_${state_param}`;

		const data = await getAsync(channel);
		// qrcode
		const client = page_config.clients[0];
		const authUrl = `${ROOT_URL}/auth?env=${env_index}&client_id=${client.client_id}&state=${state}&qrcode=1`
		const qrCode = await QRCode.toDataURL(authUrl);
		page_options.qrCode = qrCode;
		
		try {
			const ip_data = JSON.parse(data);
			if(ip_data){
				console.log('ip_data', data)
				page_options.ip_data = ip_data;
				res.render('login', page_options);
			}else{
				res.render('login', page_options);
			}
		} catch (error) {
			res.render('login', page_options);
		}
		
		
	});

	app.get('/orange/callback', function(req, res){
		let params = {
			code: req.query.code,
			redirect_uri: encodeURI(orange_redirect_uri),
			grant_type: 'authorization_code'
		};

		const env_index = 'orange'

		const page_config = appConfig.get('env.' + env_index);

		const tokenEndpointURL = page_config.token_url
		request({
			method: 'POST',
			uri: tokenEndpointURL,
			headers: {'Authorization': page_config.auth_header},
			form: params,
			}, (error, response, body) => {
			if (error) { 
				console.log('error: ', error);
				res.status(400).send(error);
			}else{

				const html_body = prettyHtml(JSON.parse(body));

				const response = {
					ROOT_URL,
					body: html_body, 
					client_id: page_config.client_id,
					env_index,
					state: req.query.state,
					homeURL: getHomeURL(env_index)
				}

				res.render('home', response);
			}
		})

	})

	app.get('/qrcode', function(req, res){
		if(!req.query.env){
			var URL = `${ROOT_URL}/qrcode?env=1`;
			res.redirect(URL);
			return;
		}
		let env_index = req.query.env || 1;
		
		if(!appConfig.has('env.' + env_index)){
			res.render('404', { title: 'Env not found'});
			return;
		}

		const page_config = appConfig.get('env.' + env_index);
		const auth_server_url = page_config['auth-server-url'];

		// const client = page_config.clients[0];
		const state = uuidv4();

		let { clients } = page_config;

		clients = clients.map( (client) => {
			return {
				...client,
				authUrl: `${ROOT_URL}/auth?env=${env_index}&client_id=${client.client_id}&state=${state}&qrcode=1`
			}
		});

		const proClients = [clients[0]].map((client) => generateClientQrCode(client));

		Promise.all(proClients)
			.then( (newClients) => {
				res.render('login_qrcode', {
					ROOT_URL: ROOT_URL,
					env_index: env_index,
					title: `Realm ${page_config.realm}`, 
					clients: newClients,
					auth_server_url: auth_server_url,
					realm: page_config.realm,
					state: state
				});
			})
			.catch(err => {
				res.render('404', { title: 'Generate qrcode have error'});
			})
	});

	app.get('/auth', function(req, res){
		let env_index = req.query.env;
		let page_config = appConfig.get('env.' + env_index);

		if(!page_config){
			res.render('404', { title: 'Page not found'});
			return;
		}

		let auth_server_url = page_config['auth-server-url'];
		let realm_name = page_config.realm;
		let client_id = req.query.client_id;
		let phone = req.query.phone;
		let qrcode = req.query.qrcode || 0;

		// check client
		let clients = page_config.clients;
		let client = _.find(clients, function(client) { return client.client_id == client_id; });
		if(!client){
			res.status(200).send("Client not found");
			return;
		}

		let redirectClientURL = `${ROOT_URL}/ipification/${env_index}/${client_id}/${qrcode}/callback`;

		let params = {
			response_type: 'code',
			client_id: client_id,
			redirect_uri: redirectClientURL,
			scope: 'openid',
			state: req.query.state || uuidv4()
		};

		if(phone){
			params.login_hint = phone;
			params.nonce = `${uuidv4()}:${phone}`;
		}
		let redirectURL = `${auth_server_url}/realms/${realm_name}/protocol/openid-connect/auth?` + querystring.stringify(params);
		console.log(`redirectURL: ${redirectURL} - ${new Date().getTime()}`);
		res.redirect(redirectURL);
	})

	app.get('/ipification/:env/:client_id/:qrcode/callback', function(req, res){
		const env_index = req.params.env;
		const page_config = appConfig.get('env.' + env_index);
		const auth_server_url = page_config['auth-server-url'];
		const realm_name = page_config.realm;
		const client_id = req.params.client_id;
		const state = req.query.state;
		const qrcode = req.params.qrcode;

		// check client
		let clients = page_config.clients;
		let client = _.find(clients, function(client) { return client.client_id == client_id; });
		if(!client){
			res.status(200).send("Client not found");
			return;
		}

		let redirectClientURL = `${ROOT_URL}/ipification/${env_index}/${client_id}/${qrcode}/callback`;

		let tokenEndpointURL = auth_server_url + '/realms/' + realm_name + '/protocol/openid-connect/token';
		let userEndpointURL = auth_server_url + '/realms/' + realm_name + '/protocol/openid-connect/userinfo';

		if(req.query.error){
			res.status(200).send(req.query.error);
			return;
		}

		let params = {
			code: req.query.code,
			redirect_uri: redirectClientURL,
			grant_type: 'authorization_code',
			client_id: client_id,
			client_secret: client.client_secret
		};

		debug('call token endpoint: %o', params);

		request.post(tokenEndpointURL, {form: params}, (error, response, body) => {
			if (error) { 
				console.log('error: ', error);
				res.status(400).send(error);
			}else{
				var info = JSON.parse(body);
				if(info.error){
					res.redirect(`${ROOT_URL}/login?env=${env_index}`)
					return;
				}

				let access_token = info.access_token;

				request.post(userEndpointURL, {form: {access_token: access_token}}, (error, response, body) => {
					if (error) { 
						console.log('error: ', error); 
						res.status(400).send(error);
					}else{

						const info = JSON.parse(body);

						const formated_response = info
						const html_body = prettyHtml(formated_response);

						const response = {
							ROOT_URL,
							body: html_body, 
							client_id,
							env_index,
							state,
							homeURL: getHomeURL(env_index, qrcode)
						}

						const channel = `state_${state}`;
						redisClient.set(channel, JSON.stringify(response), 'EX', 5);
						if(qrcode == "1"){
							socketIO.to(channel).emit('messages', { event_name: 'login_success', state: state, data: response })
							res.redirect(`${ROOT_URL}/login?env=${env_index}&state=${state}`)
						}else{
							res.redirect(`${ROOT_URL}/login?env=${env_index}&state=${state}`)
						}
						
					}
				});
			}
		});

		
	})

	app.get('/qrcode/:state', function(req, res){
		const state = req.params.state;
		const channel = `state_${state}`;

		redisClient.get(channel, function(err, data) {

			try {
				const response = JSON.parse(data);
				if(response){
					// res.render('home', response);
					res.redirect(`${ROOT_URL}/login?env=${response.env_index}&state=${state}`)
				}else{
					res.status(200).send("State not found");
				}
			} catch (error) {
				res.status(200).send("State not found");
			}
			
		});
		

	})
	
	
	app.get('*', function(req, res) { 
		res.render('404', { title: 'Page Not Found'}); 
	});

};
