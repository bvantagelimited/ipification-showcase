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

function resolveOperation(operation, loginHint) {
  if (operation) {
    return operation;
  }
  return loginHint ? "VerifyPhoneNumber" : "GetPhoneNumber";
}

function buildCibaAuthFormData(clientId, clientSecret, reqScope, scope, loginHint, carrierHint) {
  const formData = {
    client_id: clientId,
    client_secret: clientSecret,
    scope: reqScope || scope || 'openid',
  };

  if (loginHint) {
    formData.login_hint = loginHint;
  }

  if (carrierHint) {
    formData.carrier_hint = carrierHint;
  }

  return formData;
}

function buildDigitalRequest(nonce, dcqlData) {
  return {
    protocol: "openid4vp-v1-unsigned",
    data: {
      response_type: "vp_token",
      response_mode: "dc_api",
      nonce: nonce,
      dcql_query: {
        credentials: [dcqlData]
      }
    }
  };
}

router.post('/auth', async (req, res) => {
  const { login_hint, carrier_hint, client_id: clientId, operation, scope: reqScope, server_id: serverId } = req.body;
  const { clients, getAuthServer, realm } = res.locals;

  // Get auth server (defaults to first server if serverId not provided)
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
    // CIBA auth endpoint
    const authUrl = `${authServerUrl}/realms/${realm}/protocol/openid-connect/ext/ciba/auth`;
    const ts43_nonce = uuidv4();

    const formData = buildCibaAuthFormData(clientId, clientSecret, reqScope, scope, login_hint, carrier_hint);

    logger.log('authUrl', authUrl);
    logger.log('formData', formData);

    const authResponse = await axios.post(authUrl, qs.stringify(formData), getFormUrlEncodedConfig());
    logger.log('Auth response:', authResponse.data);

    const authReqId = authResponse.data.auth_req_id;

    if (!authReqId) {
      throw new Error('No authReqId received from auth response');
    }

    const resolvedOperation = resolveOperation(operation, login_hint);

    // Make the second API call to dcql endpoint
    const dcqlUrl = `${authServerUrl}/realms/${realm}/protocol/openid-connect/ext/bc/ts43/dcql`;
    const dcqlPayload = {
      operation: resolvedOperation,
      nonce: ts43_nonce
    };

    logger.log('dcqlUrl', dcqlUrl);
    logger.log('dcqlPayload', dcqlPayload);

    const dcqlResponse = await axios.post(dcqlUrl, dcqlPayload, {
      headers: {
        'Authorization': `Bearer ${authReqId}`,
        ...getJsonConfig().headers
      }
    });

    logger.log('DCQL response:', dcqlResponse.data);

    // Return both responses
    res.json({
      auth_server: authServer,
      auth_req_id: authReqId,
      nonce: ts43_nonce,
      digital_request: buildDigitalRequest(ts43_nonce, dcqlResponse.data)
    });

  } catch (error) {
    logger.error('CIBA Auth Error:', error.message);

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
  const { data: data } = req.body;
  logger.log('--> log');
  logger.log(JSON.stringify(data));
  res.send('OK');
});

function buildSessionUserData(userInfo, clientId, nonce) {
  return {
    userInfo: prettyHtml(userInfo),
    client_id: clientId,
    client_title: 'SIM',
    state: nonce,
  };
}

async function callCallbackEndpoint(callbackUrl, vpToken, authReqId) {
  try {
    const callbackPayload = { vp_token: vpToken };
    logger.log('callbackUrl', callbackUrl);
    logger.log('callbackPayload', callbackPayload);

    const callbackResponse = await axios.post(callbackUrl, callbackPayload, {
      headers: {
        'Authorization': `Bearer ${authReqId}`,
        ...getJsonConfig().headers
      }
    });

    logger.log('Callback response:', callbackResponse.data);
  } catch (error) {
    logger.error('Callback Error:', error.message);
  }
}

router.post('/token', async (req, res) => {
  logger.log('--> token');
  logger.log(JSON.stringify(req.body));
  const { vp_token: vpToken, auth_req_id: authReqId, client_id: clientId, nonce, server_id: serverId } = req.body;
  const { clients, getAuthServer, realm } = res.locals;

  // Get auth server (defaults to first server if serverId not provided)
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
  const callbackUrl = `${authServerUrl}/realms/${realm}/protocol/openid-connect/ext/bc/ts43/callback`;

  try {
    await callCallbackEndpoint(callbackUrl, vpToken, authReqId);

    const tokenUrl = `${authServerUrl}/realms/${realm}/protocol/openid-connect/token`;
    const formData = {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "urn:openid:params:grant-type:ciba",
      auth_req_id: authReqId,
    };

    logger.log('tokenUrl', tokenUrl);
    logger.log('formData', formData);

    const authResponse = await axios.post(tokenUrl, qs.stringify(formData), getFormUrlEncodedConfig());
    logger.log('Token response:', authResponse.data);

    const { access_token: accessToken } = authResponse.data;
    const userUrl = `${authServerUrl}/realms/${realm}/protocol/openid-connect/userinfo`;

    const userInfo = await getUserInfo(userUrl, accessToken);

    req.session.isAuthenticated = true;
    req.session.userData = buildSessionUserData(userInfo, clientId, nonce);

    const tokenResponse = {
      auth_server: authServer,
      ...userInfo,
    }

    res.json(tokenResponse);
  } catch (error) {
    logger.error('Token Auth Error:', error.message);

    const errorResponse = {
      error: error.message,
      status: error.response?.status || HTTP_STATUS.INTERNAL_SERVER_ERROR
    };

    if (error.response?.data) {
      errorResponse.data = error.response.data;
    }

    logger.error('Token Auth errorResponse:', errorResponse);

    req.session.isAuthenticated = true;
    req.session.userData = buildSessionUserData(errorResponse, clientId, nonce);

    res.status(error.response?.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse);
  }
})

module.exports = router;
