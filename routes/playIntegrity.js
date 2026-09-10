const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { PlayIntegrityUnavailableError } = require('../services/playIntegrityService');

function createPlayIntegrityRouter({
  attemptService,
  verify,
  exchangeCodeAndGetUserInfo,
  expectedPackageName,
  maxAgeMs = 120_000,
  requestIdFactory = uuidv4,
  logCompletion = defaultLogCompletion,
}) {
  if (!attemptService || typeof attemptService.completeTransaction !== 'function'
    || typeof verify !== 'function' || typeof exchangeCodeAndGetUserInfo !== 'function') {
    throw new TypeError('attempt, verification, and exchange services are required');
  }

  const router = express.Router();
  router.use(express.json({ limit: '16kb' }));

  router.post('/attempt', async (req, res) => {
    const completion = createCompletion('attempt', requestIdFactory);
    const { phoneNumber, clientId, serverId } = req.body || {};
    if (!isNonEmptyString(phoneNumber) || !isNonEmptyString(clientId) || !isNonEmptyString(serverId)) {
      respond(res, 400, safeResponse(completion.requestId, 'deny', ['INVALID_REQUEST']), completion, logCompletion);
      return;
    }

    try {
      const result = await attemptService.createAttempt({
        phoneNumber,
        clientId,
        serverId,
        resolveClient: createClientResolver(res.locals, serverId),
        resolveServer: createServerResolver(res.locals),
      });
      if (!result) {
        respond(res, 409, safeResponse(completion.requestId, 'deny', ['ATTEMPT_UNAVAILABLE']), completion, logCompletion);
        return;
      }
      respond(res, 201, publicAttemptResponse(result), completion, logCompletion, 'allow');
    } catch {
      respond(res, 400, safeResponse(completion.requestId, 'deny', ['INVALID_REQUEST']), completion, logCompletion);
    }
  });

  router.post('/verify', async (req, res) => {
    const completion = createCompletion('verify', requestIdFactory);
    const { attemptId, integrityToken } = req.body || {};
    if (!isNonEmptyString(attemptId) || !isNonEmptyString(integrityToken)) {
      respond(res, 400, safeResponse(completion.requestId, 'deny', ['INVALID_REQUEST']), completion, logCompletion);
      return;
    }

    const attempt = await attemptService.claimAttempt(attemptId);
    if (!attempt) {
      respond(res, 409, safeResponse(completion.requestId, 'deny', ['ATTEMPT_UNAVAILABLE']), completion, logCompletion);
      return;
    }

    try {
      const verdict = await verify({ integrityToken, expectedRequestHash: attempt.requestHash, expectedPackageName, maxAgeMs });
      const reasonCodes = safeReasonCodes(verdict?.reasonCodes);
      if (verdict?.decision !== 'allow') {
        await attemptService.rejectAttempt(attempt.id, reasonCodes[0] || 'POLICY_DENIED');
        respond(res, 403, safeResponse(completion.requestId, 'deny', reasonCodes), completion, logCompletion);
        return;
      }

      const transaction = await attemptService.approveAttempt(attempt.id);
      if (!transaction) {
        respond(res, 409, safeResponse(completion.requestId, 'deny', ['ATTEMPT_UNAVAILABLE']), completion, logCompletion);
        return;
      }
      const state = attemptService.createSignedState(transaction);
      respond(res, 201, { state, expiresAt: transaction.expiresAt }, completion, logCompletion, 'allow');
    } catch (error) {
      if (error instanceof PlayIntegrityUnavailableError) {
        await rejectAttemptSafely(attemptService, attempt.id, error.reasonCode);
        respond(res, 503, safeResponse(completion.requestId, 'unavailable', [error.reasonCode]), completion, logCompletion);
        return;
      }
      await rejectAttemptSafely(attemptService, attempt.id, 'GOOGLE_VERIFICATION_FAILED');
      respond(res, 503, safeResponse(completion.requestId, 'unavailable', ['GOOGLE_VERIFICATION_FAILED']), completion, logCompletion);
    }
  });

  router.post('/token-exchange', async (req, res) => {
    const completion = createCompletion('token-exchange', requestIdFactory);
    const { code, state } = req.body || {};
    if (!isNonEmptyString(code) || !isWellFormedState(state)) {
      respond(res, 400, safeResponse(completion.requestId, 'deny', ['INVALID_REQUEST']), completion, logCompletion);
      return;
    }

    const transaction = await attemptService.claimTransaction(state);
    if (!transaction) {
      respond(res, 409, safeResponse(completion.requestId, 'deny', ['TRANSACTION_UNAVAILABLE']), completion, logCompletion);
      return;
    }

    try {
      const { tokenUrl, userUrl, params } = exchangeInputs(transaction.attempt, code);
      await exchangeCodeAndGetUserInfo(tokenUrl, userUrl, params);
      await completeTransactionSafely(attemptService, transaction.id, 'consumed');
      respond(res, 200, { decision: 'allow' }, completion, logCompletion, 'allow');
    } catch {
      await completeTransactionSafely(attemptService, transaction.id, 'failed');
      respond(res, 401, safeResponse(completion.requestId, 'deny', ['IPIFICATION_EXCHANGE_FAILED']), completion, logCompletion);
    }
  });

  router.use((error, req, res, next) => {
    if (error?.type === 'entity.parse.failed' || error?.type === 'entity.too.large') {
      const completion = createCompletion(requestEndpoint(req), requestIdFactory);
      respond(res, 400, safeResponse(completion.requestId, 'deny', ['INVALID_REQUEST']), completion, logCompletion);
      return;
    }
    next(error);
  });

  return router;
}

function createClientResolver(locals, serverId) {
  return (clientId) => {
    const client = Array.isArray(locals.clients)
      ? locals.clients.find((candidate) => candidate?.client_id === clientId)
      : null;
    if (!client) return null;
    const redirectUri = client.redirect_uri || `${locals.baseUrl}/auth/callback/${client.user_flow}/${serverId}`;
    return { ...client, id: clientId, redirectUri };
  };
}

function createServerResolver(locals) {
  return (serverId) => {
    const server = typeof locals.getAuthServer === 'function' ? locals.getAuthServer(serverId) : null;
    if (!server) return null;
    return { ...server, id: serverId, realm: locals.realm };
  };
}

function exchangeInputs(attempt, code) {
  const client = attempt?.client;
  const server = attempt?.server;
  if (!isNonEmptyString(client?.client_id) || !isNonEmptyString(client?.client_secret)
    || !isNonEmptyString(client?.redirectUri) || !isNonEmptyString(server?.url)
    || !isNonEmptyString(server?.realm)) {
    throw new TypeError('frozen attempt snapshot is incomplete');
  }
  const root = server.url.replace(/\/$/, '');
  const protocolRoot = `${root}/realms/${encodeURIComponent(server.realm)}/protocol/openid-connect`;
  return {
    tokenUrl: `${protocolRoot}/token`,
    userUrl: `${protocolRoot}/userinfo`,
    params: {
      code,
      redirect_uri: client.redirectUri,
      grant_type: 'authorization_code',
      client_id: client.client_id,
      client_secret: client.client_secret,
    },
  };
}

function publicAttemptResponse(result) {
  return { attemptId: result.attemptId, requestHash: result.requestHash, expiresAt: result.expiresAt };
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isWellFormedState(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
}

function safeReasonCodes(reasonCodes) {
  const safe = Array.isArray(reasonCodes)
    ? reasonCodes.filter((reason) => typeof reason === 'string' && /^[A-Z0-9_]{1,80}$/.test(reason))
    : [];
  return safe.length > 0 ? safe : ['POLICY_DENIED'];
}

function safeResponse(requestId, decision, reasonCodes) {
  return { requestId, decision, reasonCodes: safeReasonCodes(reasonCodes) };
}

function createCompletion(endpoint, requestIdFactory) {
  return { endpoint, requestId: requestIdFactory(), startedAt: Date.now() };
}

function requestEndpoint(req) {
  return req.path?.replace(/^\//, '') || 'unknown';
}

function respond(res, status, body, completion, logCompletion, decision = body.decision, reasonCodes = body.reasonCodes || []) {
  logCompletionSafely(logCompletion, {
    requestId: completion.requestId,
    endpoint: completion.endpoint,
    decision,
    reasonCodes: decision === 'allow' ? [] : safeReasonCodes(reasonCodes),
    duration: Date.now() - completion.startedAt,
  });
  res.status(status).json(body);
}

async function rejectAttemptSafely(attemptService, attemptId, reason) {
  try {
    await attemptService.rejectAttempt(attemptId, reason);
  } catch {
    // Dependency response takes priority over best-effort state bookkeeping.
  }
}

async function completeTransactionSafely(attemptService, transactionId, status) {
  try {
    await attemptService.completeTransaction(transactionId, status);
  } catch {
    // The transaction was already claimed, so completion bookkeeping cannot permit replay.
  }
}

function logCompletionSafely(logCompletion, event) {
  try {
    logCompletion(event);
  } catch {
    // Completion logging must not change the endpoint response.
  }
}

function defaultLogCompletion(event) {
  console.info(JSON.stringify(event));
}

module.exports = { createPlayIntegrityRouter, exchangeInputs };
