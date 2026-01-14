const express = require('express');
const axios = require('axios');
const qs = require('qs');
const { v4: uuidv4 } = require('uuid');
const prettyHtml = require('json-pretty-html').default;
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
  const { login_hint, carrier_hint, client_id: clientId, operation, scope: reqScope } = req.body;
  const { clients, auth_server_url, realm } = res.locals;
  const client = findClientByClientId(clients, clientId);

  if (!client) {
    console.log(`client(${clientId}) not found`);
    res.status(HTTP_STATUS.UNAUTHORIZED).send(ERROR_MESSAGES.CLIENT_NOT_FOUND);
    return;
  }

  const { client_secret: clientSecret, scope } = client;

  try {
    // CIBA auth endpoint
    const authUrl = `${auth_server_url}/realms/${realm}/protocol/openid-connect/ext/ciba/auth`;
    const ts43_nonce = uuidv4();

    const formData = buildCibaAuthFormData(clientId, clientSecret, reqScope, scope, login_hint, carrier_hint);

    console.log('authUrl', authUrl);
    console.log('formData', formData);

    const authResponse = await axios.post(authUrl, qs.stringify(formData), getFormUrlEncodedConfig());
    console.log('Auth response:', authResponse.data);

    const authReqId = authResponse.data.auth_req_id;

    if (!authReqId) {
      throw new Error('No authReqId received from auth response');
    }

    const resolvedOperation = resolveOperation(operation, login_hint);

    // Make the second API call to dcql endpoint
    const dcqlUrl = `${auth_server_url}/realms/${realm}/protocol/openid-connect/ext/bc/ts43/dcql`;
    const dcqlPayload = {
      operation: resolvedOperation,
      nonce: ts43_nonce
    };

    console.log('dcqlUrl', dcqlUrl);
    console.log('dcqlPayload', dcqlPayload);

    const dcqlResponse = await axios.post(dcqlUrl, dcqlPayload, {
      headers: {
        'Authorization': `Bearer ${authReqId}`,
        ...getJsonConfig().headers
      }
    });

    console.log('DCQL response:', dcqlResponse.data);

    // Return both responses
    res.json({
      auth_req_id: authReqId,
      nonce: ts43_nonce,
      digital_request: buildDigitalRequest(ts43_nonce, dcqlResponse.data)
    });

  } catch (error) {
    console.error('CIBA Auth Error:', error.message);

    const errorResponse = {
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
  console.log('--> log');
  console.log(JSON.stringify(data));
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
    console.log('callbackUrl', callbackUrl);
    console.log('callbackPayload', callbackPayload);

    const callbackResponse = await axios.post(callbackUrl, callbackPayload, {
      headers: {
        'Authorization': `Bearer ${authReqId}`,
        ...getJsonConfig().headers
      }
    });

    console.log('Callback response:', callbackResponse.data);
  } catch (error) {
    console.error('Callback Error:', error.message);
  }
}

router.post('/token', async (req, res) => {
  console.log('--> token');
  console.log(JSON.stringify(req.body));
  const { vp_token: vpToken, auth_req_id: authReqId, client_id: clientId, nonce } = req.body;
  const { clients, auth_server_url, realm } = res.locals;
  const client = findClientByClientId(clients, clientId);

  if (!client) {
    res.status(HTTP_STATUS.UNAUTHORIZED).send({ error: ERROR_MESSAGES.CLIENT_NOT_FOUND });
    return;
  }

  const { client_secret: clientSecret } = client;
  const callbackUrl = `${auth_server_url}/realms/${realm}/protocol/openid-connect/ext/bc/ts43/callback`;

  try {
    await callCallbackEndpoint(callbackUrl, vpToken, authReqId);

    const tokenUrl = `${auth_server_url}/realms/${realm}/protocol/openid-connect/token`;
    const formData = {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "urn:openid:params:grant-type:ciba",
      auth_req_id: authReqId,
    };

    console.log('tokenUrl', tokenUrl);
    console.log('formData', formData);

    const authResponse = await axios.post(tokenUrl, qs.stringify(formData), getFormUrlEncodedConfig());
    console.log('Token response:', authResponse.data);

    const { access_token: accessToken } = authResponse.data;
    const userUrl = `${auth_server_url}/realms/${realm}/protocol/openid-connect/userinfo`;

    const userInfo = await getUserInfo(userUrl, accessToken);

    req.session.isAuthenticated = true;
    req.session.userData = buildSessionUserData(userInfo, clientId, nonce);

    res.json(userInfo);
  } catch (error) {
    console.error('Token Auth Error:', error.message);

    const errorResponse = {
      error: error.message,
      status: error.response?.status || HTTP_STATUS.INTERNAL_SERVER_ERROR
    };

    if (error.response?.data) {
      errorResponse.data = error.response.data;
    }

    console.error('Token Auth errorResponse:', errorResponse);

    req.session.isAuthenticated = true;
    req.session.userData = buildSessionUserData(errorResponse, clientId, nonce);

    res.status(error.response?.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json(errorResponse);
  }
})

module.exports = router;

