const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { PlayIntegrityUnavailableError } = require('../services/playIntegrityService');
const { canonicalJson } = require('../utils/canonicalJson');

function createPlayIntegrityRouter({
  verify,
  requestIdFactory = uuidv4,
  logCompletion = defaultLogCompletion,
}) {
  const router = express.Router();

  router.use(express.json({ limit: '16kb' }));
  router.post('/verify', async (req, res) => {
    const startedAt = Date.now();
    const requestId = requestIdFactory();
    const { integrityToken, action, payload } = req.body || {};

    if (!isValidRequest({ integrityToken, action, payload })) {
      respond(res, 400, createResponse(requestId, 'deny', 'INVALID_REQUEST'), startedAt, logCompletion);
      return;
    }

    try {
      const result = await verify({ integrityToken, action, payload, requestId });
      const normalizedResult = normalizeResult(result, requestId);

      respond(
        res,
        normalizedResult.decision === 'allow' ? 200 : 403,
        normalizedResult,
        startedAt,
        logCompletion,
      );
    } catch (error) {
      if (error instanceof PlayIntegrityUnavailableError) {
        respond(
          res,
          503,
          createResponse(requestId, 'unavailable', error.reasonCode),
          startedAt,
          logCompletion,
        );
        return;
      }

      respond(res, 500, createResponse(requestId, 'deny', 'VERIFICATION_FAILED'), startedAt, logCompletion);
    }
  });

  router.use((error, req, res, next) => {
    if (error?.type === 'entity.parse.failed' || error?.type === 'entity.too.large') {
      const startedAt = Date.now();
      respond(
        res,
        400,
        createResponse(requestIdFactory(), 'deny', 'INVALID_REQUEST'),
        startedAt,
        logCompletion,
      );
      return;
    }

    next(error);
  });

  return router;
}

function isValidRequest({ integrityToken, action, payload }) {
  return typeof integrityToken === 'string'
    && integrityToken.trim().length > 0
    && typeof action === 'string'
    && action.trim().length > 0
    && action.length <= 128
    && isPlainObject(payload)
    && isCanonicalizable(payload);
}

function isCanonicalizable(payload) {
  try {
    canonicalJson(payload);
    return true;
  } catch {
    return false;
  }
}

function isPlainObject(value) {
  if (value === null || Object.prototype.toString.call(value) !== '[object Object]') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function normalizeResult(result, requestId) {
  const verdict = result?.verdict;

  return {
    requestId,
    decision: result?.decision === 'allow' ? 'allow' : 'deny',
    reasonCodes: Array.isArray(result?.reasonCodes) ? result.reasonCodes : [],
    requestHashMatched: result?.requestHashMatched === true,
    verdict: verdict && typeof verdict === 'object'
      ? {
        appRecognition: verdict.appRecognition ?? null,
        deviceIntegrity: Array.isArray(verdict.deviceIntegrity) ? verdict.deviceIntegrity : [],
        appLicensing: verdict.appLicensing ?? null,
      }
      : null,
  };
}

function createResponse(requestId, decision, reasonCode) {
  return {
    requestId,
    decision,
    reasonCodes: [reasonCode],
    requestHashMatched: false,
    verdict: null,
  };
}

function respond(res, status, response, startedAt, logCompletion) {
  logCompletionSafely(logCompletion, {
    requestId: response.requestId,
    decision: response.decision,
    reasonCodes: response.reasonCodes,
    duration: Date.now() - startedAt,
  });
  res.status(status).json(response);
}

function logCompletionSafely(logCompletion, event) {
  try {
    logCompletion(event);
  } catch {
    // Completion logging must not change the endpoint's response.
  }
}

function defaultLogCompletion(event) {
  console.info(JSON.stringify(event));
}

module.exports = { createPlayIntegrityRouter };
