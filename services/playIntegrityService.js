const axios = require('axios');
const { GoogleAuth } = require('google-auth-library');
const { createRequestHash } = require('../utils/canonicalJson');

const PLAY_INTEGRITY_SCOPE = 'https://www.googleapis.com/auth/playintegrity';

class PlayIntegrityUnavailableError extends Error {
  constructor(reasonCode, cause) {
    super(reasonCode);
    this.name = 'PlayIntegrityUnavailableError';
    this.reasonCode = reasonCode;
    void cause;
  }
}

function createPlayIntegrityService({
  packageName,
  requireLicensedApp = false,
  authClient = new GoogleAuth({ scopes: [PLAY_INTEGRITY_SCOPE] }),
  httpClient = axios,
  timeoutMs,
}) {
  async function verify({ integrityToken, action, payload, requestId }) {
    const accessToken = await getAccessToken(authClient);
    const decoded = await decodeIntegrityToken({
      httpClient,
      packageName,
      integrityToken,
      accessToken,
      timeoutMs,
    });

    return evaluateVerdict({
      decoded,
      action,
      payload,
      requestId,
      requireLicensedApp,
    });
  }

  return { verify };
}

async function getAccessToken(authClient) {
  try {
    const credential = await authClient.getAccessToken();
    const token = typeof credential === 'string' ? credential : credential?.token;
    if (!token) throw new Error('access token unavailable');
    return token;
  } catch (error) {
    throw new PlayIntegrityUnavailableError('GOOGLE_CREDENTIALS_UNAVAILABLE', error);
  }
}

async function decodeIntegrityToken({ httpClient, packageName, integrityToken, accessToken, timeoutMs }) {
  try {
    const response = await httpClient.post(
      `https://playintegrity.googleapis.com/v1/${packageName}:decodeIntegrityToken`,
      { integrity_token: integrityToken },
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: timeoutMs,
      },
    );
    return response.data;
  } catch (error) {
    const reasonCode = error?.code === 'ECONNABORTED'
      ? 'GOOGLE_DECODE_TIMEOUT'
      : 'GOOGLE_DECODE_FAILED';
    throw new PlayIntegrityUnavailableError(reasonCode, error);
  }
}

function evaluateVerdict({ decoded, action, payload, requestId, requireLicensedApp }) {
  const tokenPayload = decoded?.tokenPayloadExternal;
  const requestHash = tokenPayload?.requestDetails?.requestHash;
  const appRecognition = tokenPayload?.appIntegrity?.appRecognitionVerdict ?? null;
  const deviceIntegrity = Array.isArray(tokenPayload?.deviceIntegrity?.deviceRecognitionVerdict)
    ? tokenPayload.deviceIntegrity.deviceRecognitionVerdict
    : [];
  const appLicensing = tokenPayload?.accountDetails?.appLicensingVerdict ?? null;
  const requestHashMatched = requestHash === createRequestHash(action, payload);
  const reasonCodes = [];

  if (!requestHashMatched) reasonCodes.push('REQUEST_HASH_MISMATCH');
  if (appRecognition !== 'PLAY_RECOGNIZED') reasonCodes.push('APP_NOT_RECOGNIZED');
  if (!deviceIntegrity.includes('MEETS_DEVICE_INTEGRITY')) {
    reasonCodes.push('DEVICE_INTEGRITY_NOT_MET');
  }
  if (requireLicensedApp && appLicensing !== 'LICENSED') reasonCodes.push('APP_NOT_LICENSED');

  return {
    requestId,
    decision: reasonCodes.length === 0 ? 'allow' : 'deny',
    reasonCodes,
    requestHashMatched,
    verdict: {
      appRecognition,
      deviceIntegrity,
      appLicensing,
    },
  };
}

module.exports = { createPlayIntegrityService, PlayIntegrityUnavailableError };
