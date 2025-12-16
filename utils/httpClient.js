const axios = require('axios');
const qs = require('qs');

const getFormUrlEncodedConfig = () => ({
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
});

const getJsonConfig = () => ({
  headers: { 'Content-Type': 'application/json' }
});

async function exchangeCodeForToken(tokenUrl, params) {
  const config = getFormUrlEncodedConfig();
  const { data: tokenInfo } = await axios.post(tokenUrl, qs.stringify(params), config);
  return tokenInfo;
}

async function getUserInfo(userUrl, accessToken) {
  const config = getFormUrlEncodedConfig();
  const { data: userInfo } = await axios.post(
    userUrl,
    qs.stringify({ access_token: accessToken }),
    config
  );
  return userInfo;
}

async function exchangeCodeAndGetUserInfo(tokenUrl, userUrl, params) {
  const tokenInfo = await exchangeCodeForToken(tokenUrl, params);
  const { access_token: accessToken } = tokenInfo;
  const userInfo = await getUserInfo(userUrl, accessToken);
  return { tokenInfo, userInfo };
}

module.exports = {
  getFormUrlEncodedConfig,
  getJsonConfig,
  exchangeCodeForToken,
  getUserInfo,
  exchangeCodeAndGetUserInfo
};

