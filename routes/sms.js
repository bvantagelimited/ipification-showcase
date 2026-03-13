const express = require('express');
const axios = require('axios');
const qs = require('qs');
const { v4: uuidv4 } = require('uuid');
const prettyHtml = require('json-pretty-html').default;
const logger = require('../utils/logger');
const { findClientByClientId } = require('../utils/helpers');
const { ERROR_MESSAGES, HTTP_STATUS } = require('../utils/constants');
const { getFormUrlEncodedConfig, getJsonConfig, getUserInfo } = require('../utils/httpClient');

const router = express.Router();

function buildCibaAuthFormData(clientId, clientSecret, reqScope, scope, loginHint) {
  const formData = {
    client_id: clientId,
    client_secret: clientSecret,
    scope: reqScope || scope || 'openid',
    login_hint: loginHint,
    channel: 'sms',
    message: 'Your verification PIN is: {{code}}'
  };

  return formData;
}

router.post('/auth', async (req, res) => {
  const { client_id: clientId, scope: reqScope, server_id: serverId, login_hint: loginHint } = req.body;
  const { clients, getAuthServer, realm } = res.locals;

  const authServer = getAuthServer(serverId);
  if (!authServer) {
    res.status(HTTP_STATUS.BAD_REQUEST).send({ error: serverId ? `Invalid server_id: '${serverId}'` : 'No auth servers configured' });
    return;
  }

  const { url: authServerUrl } = authServer;
  const client = findClientByClientId(clients, clientId);

  if (!client) {
    logger.log(`client(${clientId}) not found`);
    res.status(HTTP_STATUS.UNAUTHORIZED).send(ERROR_MESSAGES.CLIENT_NOT_FOUND);
    return;
  }

  const { client_secret: clientSecret, scope } = client;

  try {
    const authUrl = `${authServerUrl}/realms/${realm}/protocol/openid-connect/ext/ciba/auth`;
    const smsNonce = uuidv4();
    const formData = buildCibaAuthFormData(clientId, clientSecret, reqScope, scope, loginHint);

    logger.log('sms authUrl', authUrl);
    logger.log('sms formData', formData);

    const authResponse = await axios.post(authUrl, qs.stringify(formData), getFormUrlEncodedConfig());
    logger.log('SMS auth response:', authResponse.data);

    const authReqId = authResponse.data.auth_req_id;

    if (!authReqId) {
      throw new Error('No authReqId received from auth response');
    }

    res.json({
      auth_server: authServer,
      auth_req_id: authReqId,
      nonce: smsNonce,
    });
  } catch (error) {
    logger.error('SMS auth error:', error.message);

    const errorResponse = {
      auth_server: authServer,
      success: false,
      error: error.message,
      status: error.response?.status || HTTP_STATUS.INTERNAL_SERVER_ERROR
    };

    if (error.response?.data) {
      errorResponse.data = error.response.data;
    }

    res.status(error.response?.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse);
  }
});

router.post('/log', async (req, res) => {
  const { data } = req.body;
  logger.log('--> sms log');
  logger.log(JSON.stringify(data));
  res.send('OK');
});

function buildSessionUserData(userInfo, client, nonce) {
  return {
    userInfo: prettyHtml(userInfo),
    client_id: client.client_id,
    client_title: client.title || 'SMS',
    state: nonce,
  };
}

async function callCallbackEndpoint(callbackUrl, authReqId, smsCode) {
  try {
    const callbackPayload = { code: smsCode };
    logger.log('sms callbackUrl', callbackUrl);
    logger.log('sms authReqId', authReqId);
    logger.log('sms callbackPayload', callbackPayload);

    const callbackResponse = await axios.post(callbackUrl, callbackPayload, {
      headers: {
        Authorization: `Bearer ${authReqId}`,
        ...getJsonConfig().headers
      }
    });

    logger.log(`SMS callback response status: ${callbackResponse.status}, data: ${JSON.stringify(callbackResponse.data)}`);
  } catch (error) {
    logger.error('SMS callback error:', error.message);
  }
}

router.post('/token', async (req, res) => {
  logger.log('--> sms token');
  logger.log(JSON.stringify(req.body));
  const { auth_req_id: authReqId, code: smsCode, client_id: clientId, nonce, server_id: serverId } = req.body;
  const { clients, getAuthServer, realm } = res.locals;

  const authServer = getAuthServer(serverId);
  if (!authServer) {
    res.status(HTTP_STATUS.BAD_REQUEST).send({ error: serverId ? `Invalid server_id: '${serverId}'` : 'No auth servers configured' });
    return;
  }

  const { url: authServerUrl } = authServer;
  const client = findClientByClientId(clients, clientId);

  if (!client) {
    res.status(HTTP_STATUS.UNAUTHORIZED).send({ error: ERROR_MESSAGES.CLIENT_NOT_FOUND });
    return;
  }

  const { client_secret: clientSecret } = client;
  const callbackUrl = `${authServerUrl}/realms/${realm}/protocol/openid-connect/ext/bc/sms/callback`;

  try {
    await callCallbackEndpoint(callbackUrl, authReqId, smsCode);

    const tokenUrl = `${authServerUrl}/realms/${realm}/protocol/openid-connect/token`;
    const formData = {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'urn:openid:params:grant-type:ciba',
      auth_req_id: authReqId,
    };

    logger.log('sms tokenUrl', tokenUrl);
    logger.log('sms formData', formData);

    const authResponse = await axios.post(tokenUrl, qs.stringify(formData), getFormUrlEncodedConfig());
    logger.log('SMS token response:', authResponse.data);

    const { access_token: accessToken } = authResponse.data;
    const userUrl = `${authServerUrl}/realms/${realm}/protocol/openid-connect/userinfo`;
    const userInfo = await getUserInfo(userUrl, accessToken);

    req.session.isAuthenticated = true;
    req.session.userData = buildSessionUserData(userInfo, client, nonce);

    res.json({
      auth_server: authServer,
      ...userInfo,
    });
  } catch (error) {
    logger.error('SMS token error:', error.message);

    const errorResponse = {
      error: error.message,
      status: error.response?.status || HTTP_STATUS.INTERNAL_SERVER_ERROR
    };

    if (error.response?.data) {
      errorResponse.data = error.response.data;
    }

    logger.error('SMS token errorResponse:', errorResponse);

    req.session.isAuthenticated = true;
    req.session.userData = buildSessionUserData(errorResponse, client, nonce);

    res.status(error.response?.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse);
  }
});

module.exports = router;
