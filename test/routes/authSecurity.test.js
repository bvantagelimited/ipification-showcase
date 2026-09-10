const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const express = require('express');
const session = require('express-session');

const authRouter = require('../../routes/auth');

async function withAuthApp(handler) {
  const app = express();
  app.use(session({ secret: 'test-session-secret', resave: false, saveUninitialized: true }));
  app.use((req, res, next) => {
    res.locals = {
      clients: [],
      getAuthServer: () => null,
      realm: 'ipification',
      baseUrl: 'http://127.0.0.1',
    };
    next();
  });
  app.use('/auth', authRouter);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    await handler(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test('rejects an invalid server_id without reflecting it in the response', async () => {
  const payload = '<script>alert(document.domain)</script>';

  await withAuthApp(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/auth/start?server_id=${encodeURIComponent(payload)}`);

    assert.equal(response.status, 400);
    assert.match(response.headers.get('content-type'), /^application\/json/);
    assert.deepEqual(await response.json(), { error: 'INVALID_SERVER_ID' });
  });
});
