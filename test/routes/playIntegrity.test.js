const http = require('node:http');
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { PlayIntegrityUnavailableError } = require('../../services/playIntegrityService');
const { createPlayIntegrityRouter } = require('../../routes/playIntegrity');

async function withServer(router, run) {
  const app = express();
  app.use('/api/play-integrity', router);
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  try {
    await run(`http://127.0.0.1:${port}/api/play-integrity/verify`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

function createRouter(verify) {
  return createPlayIntegrityRouter({
    verify,
    requestIdFactory: () => 'request-1',
  });
}

const validRequest = {
  integrityToken: 'opaque-integrity-token',
  action: 'demo.protected-action.v1',
  payload: { transactionId: 'demo-123', amount: 100 },
};

test('returns an allow decision and forwards the complete verified request', async () => {
  let received;
  const router = createRouter(async (input) => {
    received = input;
    return {
      requestId: input.requestId,
      decision: 'allow',
      reasonCodes: [],
      requestHashMatched: true,
      verdict: {
        appRecognition: 'PLAY_RECOGNIZED',
        deviceIntegrity: ['MEETS_DEVICE_INTEGRITY'],
        appLicensing: 'LICENSED',
      },
      decodedToken: 'sensitive-token-payload',
    };
  });

  await withServer(router, async (url) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validRequest),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
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

  assert.deepEqual(received, {
    integrityToken: 'opaque-integrity-token',
    action: 'demo.protected-action.v1',
    payload: { transactionId: 'demo-123', amount: 100 },
    requestId: 'request-1',
  });
});

test('returns a forbidden normalized denial from the verifier', async () => {
  const router = createRouter(async () => ({
    requestId: 'request-1',
    decision: 'deny',
    reasonCodes: ['DEVICE_INTEGRITY_NOT_MET'],
    requestHashMatched: true,
    verdict: {
      appRecognition: 'PLAY_RECOGNIZED',
      deviceIntegrity: [],
      appLicensing: 'LICENSED',
    },
    accessToken: 'sensitive-access-token',
  }));

  await withServer(router, async (url) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validRequest),
    });

    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), {
      requestId: 'request-1',
      decision: 'deny',
      reasonCodes: ['DEVICE_INTEGRITY_NOT_MET'],
      requestHashMatched: true,
      verdict: {
        appRecognition: 'PLAY_RECOGNIZED',
        deviceIntegrity: [],
        appLicensing: 'LICENSED',
      },
    });
  });
});

test('returns a safe dependency failure without error internals', async () => {
  const router = createRouter(async () => {
    throw new PlayIntegrityUnavailableError('GOOGLE_DECODE_TIMEOUT', new Error('credential secret'));
  });

  await withServer(router, async (url) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validRequest),
    });

    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      requestId: 'request-1',
      decision: 'deny',
      reasonCodes: ['GOOGLE_DECODE_TIMEOUT'],
      requestHashMatched: false,
      verdict: null,
    });
  });
});

test('rejects an invalid request before calling the verifier', async () => {
  let calls = 0;
  const router = createRouter(async () => {
    calls += 1;
  });

  await withServer(router, async (url) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ integrityToken: '', action: 'demo.protected-action.v1', payload: null }),
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      requestId: 'request-1', decision: 'deny', reasonCodes: ['INVALID_REQUEST'],
      requestHashMatched: false, verdict: null,
    });
  });

  assert.equal(calls, 0);
});
