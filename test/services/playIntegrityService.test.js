const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createPlayIntegrityService,
  PlayIntegrityUnavailableError,
} = require('../../services/playIntegrityService');
const { createRequestHash } = require('../../utils/canonicalJson');

const validInput = {
  integrityToken: 'opaque-integrity-token',
  action: 'demo.protected-action.v1',
  payload: { transactionId: 'demo-123', amount: 100 },
  requestId: 'request-1',
};

function decodedFixture(overrides = {}) {
  return {
    tokenPayloadExternal: {
      requestDetails: {
        requestHash: createRequestHash(validInput.action, validInput.payload),
      },
      appIntegrity: { appRecognitionVerdict: 'PLAY_RECOGNIZED' },
      deviceIntegrity: { deviceRecognitionVerdict: ['MEETS_DEVICE_INTEGRITY'] },
      accountDetails: { appLicensingVerdict: 'LICENSED' },
      ...overrides,
    },
  };
}

function createService({ decoded = decodedFixture(), authError, httpError, requireLicensedApp = false } = {}) {
  const authClient = {
    async getAccessToken() {
      if (authError) throw authError;
      return { token: 'access-token' };
    },
  };
  const httpClient = {
    async post() {
      if (httpError) throw httpError;
      return { data: decoded };
    },
  };
  return {
    service: createPlayIntegrityService({
      packageName: 'com.example.demo',
      requireLicensedApp,
      authClient,
      httpClient,
      timeoutMs: 10_000,
    }),
    httpClient,
  };
}

test('allows a recognized app with matching hash and device integrity', async () => {
  const { service } = createService();

  const result = await service.verify(validInput);

  assert.deepEqual(result, {
    requestId: 'request-1',
    decision: 'allow',
    reasonCodes: [],
    requestHashMatched: true,
    verdict: {
      appRecognition: 'PLAY_RECOGNIZED',
      deviceIntegrity: ['MEETS_DEVICE_INTEGRITY'],
      appLicensing: 'LICENSED',
    },
  });
});

test('denies a mismatched request hash before other policy failures', async () => {
  const { service } = createService({
    decoded: decodedFixture({
      requestDetails: { requestHash: 'wrong-hash' },
      appIntegrity: { appRecognitionVerdict: 'UNRECOGNIZED_VERSION' },
      deviceIntegrity: { deviceRecognitionVerdict: [] },
      accountDetails: { appLicensingVerdict: 'UNLICENSED' },
    }),
    requireLicensedApp: true,
  });

  const result = await service.verify(validInput);

  assert.deepEqual(result.reasonCodes, [
    'REQUEST_HASH_MISMATCH',
    'APP_NOT_RECOGNIZED',
    'DEVICE_INTEGRITY_NOT_MET',
    'APP_NOT_LICENSED',
  ]);
  assert.equal(result.decision, 'deny');
  assert.equal(result.requestHashMatched, false);
});

test('denies missing app or device verdicts', async () => {
  const { service } = createService({
    decoded: decodedFixture({
      appIntegrity: {},
      deviceIntegrity: {},
    }),
  });

  const result = await service.verify(validInput);

  assert.equal(result.decision, 'deny');
  assert.deepEqual(result.reasonCodes, [
    'APP_NOT_RECOGNIZED',
    'DEVICE_INTEGRITY_NOT_MET',
  ]);
  assert.deepEqual(result.verdict, {
    appRecognition: null,
    deviceIntegrity: [],
    appLicensing: 'LICENSED',
  });
});

test('denies an unlicensed app only when strict licensing is enabled', async () => {
  const { service } = createService({
    decoded: decodedFixture({ accountDetails: { appLicensingVerdict: 'UNLICENSED' } }),
    requireLicensedApp: true,
  });

  const result = await service.verify(validInput);

  assert.equal(result.decision, 'deny');
  assert.deepEqual(result.reasonCodes, ['APP_NOT_LICENSED']);
});

test('does not expose decoded payloads or access tokens in normal results', async () => {
  const { service } = createService();

  const serialized = JSON.stringify(await service.verify(validInput));

  assert.doesNotMatch(serialized, /access-token/);
  assert.doesNotMatch(serialized, /tokenPayloadExternal/);
});

test('maps authentication failures to unavailable credential errors', async () => {
  const { service } = createService({ authError: new Error('credential details') });

  await assert.rejects(
    service.verify(validInput),
    (error) => error instanceof PlayIntegrityUnavailableError
      && error.reasonCode === 'GOOGLE_CREDENTIALS_UNAVAILABLE'
      && !JSON.stringify(error).includes('credential details'),
  );
});

test('maps decode network failures to unavailable decode errors', async () => {
  const { service } = createService({ httpError: new Error('network response body') });

  await assert.rejects(
    service.verify(validInput),
    (error) => error instanceof PlayIntegrityUnavailableError
      && error.reasonCode === 'GOOGLE_DECODE_FAILED'
      && !JSON.stringify(error).includes('network response body'),
  );
});

test('maps decode timeout failures to unavailable timeout errors', async () => {
  const timeoutError = new Error('request timed out');
  timeoutError.code = 'ECONNABORTED';
  const { service } = createService({ httpError: timeoutError });

  await assert.rejects(
    service.verify(validInput),
    (error) => error instanceof PlayIntegrityUnavailableError
      && error.reasonCode === 'GOOGLE_DECODE_TIMEOUT',
  );
});
