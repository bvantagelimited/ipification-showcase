const http = require('node:http');
const test = require('node:test');
const assert = require('node:assert/strict');

function loadFeatureEnabledApp(verify) {
  const appPath = require.resolve('../../app');
  const playIntegrityService = require('../../services/playIntegrityService');
  const originalEnabled = process.env.PLAY_INTEGRITY_ENABLED;
  const originalCreateService = playIntegrityService.createPlayIntegrityService;

  process.env.PLAY_INTEGRITY_ENABLED = 'true';
  playIntegrityService.createPlayIntegrityService = () => ({ verify });
  delete require.cache[appPath];

  try {
    return require('../../app');
  } finally {
    playIntegrityService.createPlayIntegrityService = originalCreateService;
    if (originalEnabled === undefined) delete process.env.PLAY_INTEGRITY_ENABLED;
    else process.env.PLAY_INTEGRITY_ENABLED = originalEnabled;
  }
}

async function withServer(app, run) {
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  try {
    await run(`http://127.0.0.1:${port}/api/play-integrity/verify`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

async function assertInvalidRequest(response) {
  assert.equal(response.status, 400);
  const responseBody = await response.json();
  assert.equal(typeof responseBody.requestId, 'string');
  assert.notEqual(responseBody.requestId, '');
  assert.deepEqual({ ...responseBody, requestId: 'generated-request-id' }, {
    requestId: 'generated-request-id',
    decision: 'deny',
    reasonCodes: ['INVALID_REQUEST'],
    requestHashMatched: false,
    verdict: null,
  });
}

test('mounted Play Integrity endpoint safely rejects malformed and oversized JSON', async () => {
  let verifyCalls = 0;
  const app = loadFeatureEnabledApp(async () => {
    verifyCalls += 1;
    return {
      decision: 'allow',
      reasonCodes: [],
      requestHashMatched: true,
      verdict: null,
    };
  });

  await withServer(app, async (url) => {
    await assertInvalidRequest(await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"integrityToken":',
    }));

    await assertInvalidRequest(await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        integrityToken: 'opaque-integrity-token',
        action: 'demo.protected-action.v1',
        payload: { value: 'x'.repeat(17 * 1024) },
      }),
    }));
  });

  assert.equal(verifyCalls, 0);
});
