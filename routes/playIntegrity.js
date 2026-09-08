const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { PlayIntegrityUnavailableError } = require('../services/playIntegrityService');

function createPlayIntegrityRouter({ verify, requestIdFactory = uuidv4 }) {
  const router = express.Router();

  router.use(express.json({ limit: '16kb' }));
  router.post('/verify', async (req, res) => {
    const requestId = requestIdFactory();
    const { integrityToken, action, payload } = req.body || {};

    if (!isValidRequest({ integrityToken, action, payload })) {
      res.status(400).json(createUnavailableResponse(requestId, 'INVALID_REQUEST'));
      return;
    }

    try {
      const result = await verify({ integrityToken, action, payload, requestId });
      const normalizedResult = normalizeResult(result, requestId);

      res.status(normalizedResult.decision === 'allow' ? 200 : 403).json(normalizedResult);
    } catch (error) {
      if (error instanceof PlayIntegrityUnavailableError) {
        res.status(503).json(createUnavailableResponse(requestId, error.reasonCode));
        return;
      }

      res.status(500).json(createUnavailableResponse(requestId, 'VERIFICATION_FAILED'));
    }
  });

  return router;
}

function isValidRequest({ integrityToken, action, payload }) {
  return typeof integrityToken === 'string'
    && integrityToken.trim().length > 0
    && typeof action === 'string'
    && action.trim().length > 0
    && action.length <= 128
    && isPlainObject(payload);
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

function createUnavailableResponse(requestId, reasonCode) {
  return {
    requestId,
    decision: 'deny',
    reasonCodes: [reasonCode],
    requestHashMatched: false,
    verdict: null,
  };
}

module.exports = { createPlayIntegrityRouter };
