const express = require('express');
const axios = require('axios');
const qs = require('qs');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

router.post('/auth', async (req, res) => {
  const { login_hint, carrier_hint, client_id: clientId, operation: operation } = req.body;
  const { clients, auth_server_url, realm, scope: reqScope } = res.locals;
  const client = clients.find(item => item.client_id === clientId);
  if (!client) {
    res.status(401).send("Client not found");
    return;
  }

  const { client_secret: clientSecret, scope: scope } = client;
  try {
    // CIBA auth endpoint
    const authUrl = `${auth_server_url}/realms/${realm}/protocol/openid-connect/ext/ciba/auth`;
    const ts43_nonce = uuidv4();

    // Prepare form data
    const formData = {
      client_id: clientId,
      client_secret: clientSecret,
      scope: reqScope || scope || 'openid',
    };

    if(login_hint) {
      formData.login_hint = login_hint
    }

    if(carrier_hint) {
      formData.carrier_hint = carrier_hint
    }

    // Make the auth request
    console.log('authUrl', authUrl);
    console.log('formData', formData);
    const authResponse = await axios.post(authUrl, qs.stringify(formData), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('Auth response:', authResponse.data);

    // Extract access token from the auth response
    const authReqId = authResponse.data.auth_req_id;
    
    if (!authReqId) {
      throw new Error('No authReqId received from auth response');
    }

    // Make the second API call to dcql endpoint
    const dcqlUrl = `${auth_server_url}/realms/${realm}/protocol/openid-connect/ext/bc/ts43/dcql`;
    const dcqlPayload = {
      operation: operation || "VerifyPhoneNumber",
      nonce: ts43_nonce
    };

    console.log('dcqlUrl', dcqlUrl);
    console.log('dcqlPayload', dcqlPayload);

    const dcqlResponse = await axios.post(dcqlUrl, dcqlPayload, {
      headers: {
        'Authorization': `Bearer ${authReqId}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('DCQL response:', dcqlResponse.data);

    // Return both responses
    res.json({
      auth_req_id: authReqId,
      digital_request: {
        protocol: "openid4vp-v1-unsigned",
        data: {
          response_type: "vp_token",
          response_mode: "dc_api",
          nonce: ts43_nonce,
          dcql_query: {
            credentials: [
              dcqlResponse.data
            ]
          }
        }
      }
    });

  } catch (error) {
    console.error('CIBA Auth Error:', error.message);
    
    // Handle error response
    const errorResponse = {
      success: false,
      error: error.message,
      status: error.response?.status || 500
    };

    if (error.response?.data) {
      errorResponse.data = error.response.data;
    }

    res.status(error.response?.status || 500).json(errorResponse);
  }
});

router.post('/token', async (req, res) => {
  const { vp_token: vpToken, auth_req_id: authReqId, client_id: clientId  } = req.body;
  const { clients, auth_server_url, realm } = res.locals;
  const client = clients.find(item => item.client_id === clientId);
  if (!client) {
    res.status(401).send("Client not found");
    return;
  }

  const { client_secret: clientSecret } = client;

  const callbackUrl = `${auth_server_url}/realms/${realm}/protocol/openid-connect/ext/bc/ts43/callback`;
  const callbackPayload = {
    vp_token: vpToken
  };

  try {
    console.log('callbackUrl', callbackUrl);
    console.log('callbackPayload', callbackPayload);

    try {
      const callbackResponse = await axios.post(callbackUrl, callbackPayload, {
        headers: {
          'Authorization': `Bearer ${authReqId}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Callback response:', callbackResponse.data);
    } catch (error) {
      console.error('Callback Error:', error.message);
    }

    const tokenUrl = `${auth_server_url}/realms/${realm}/protocol/openid-connect/token`;

    // Prepare form data
    const formData = {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "urn:openid:params:grant-type:ciba",
      auth_req_id: authReqId,
    };

    // Make the auth request
    console.log('tokenUrl', tokenUrl);
    console.log('formData', formData);
    const authResponse = await axios.post(tokenUrl, qs.stringify(formData), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('Token response:', authResponse.data);

    const { access_token: accessToken } = authResponse.data;
    const userUrl = `${auth_server_url}/realms/${realm}/protocol/openid-connect/userinfo`;

    const { data: userInfo } = await axios.post(userUrl, qs.stringify({ access_token: accessToken }), { 
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    res.json(userInfo);
  } catch (error) {
    console.error('Token Auth Error:', error.message);
    
    // Handle error response
    const errorResponse = {
      success: false,
      error: error.message,
      status: error.response?.status || 500
    };

    if (error.response?.data) {
      errorResponse.data = error.response.data;
    }

    res.status(error.response?.status || 500).json(errorResponse);
  }
})

module.exports = router;

