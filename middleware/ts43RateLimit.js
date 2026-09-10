const crypto = require('crypto');

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_IP_MAX_REQUESTS = 20;
const DEFAULT_IDENTITY_MAX_REQUESTS = 5;
const MAX_BUCKETS = 10_000;

function readPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function hashLoginHint(loginHint) {
  return crypto.createHash('sha256').update(String(loginHint || '')).digest('hex');
}

function getClientIp(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function removeExpiredBuckets(buckets, now) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

function consume(buckets, key, limit, windowMs, now) {
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) removeExpiredBuckets(buckets, now);
    if (buckets.size >= MAX_BUCKETS) buckets.delete(buckets.keys().next().value);
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }

  if (bucket.count >= limit) {
    return Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  }

  bucket.count += 1;
  return 0;
}

function createTs43AuthRateLimiter(options = {}) {
  const windowMs = readPositiveInteger(options.windowMs || process.env.TS43_RATE_LIMIT_WINDOW_MS, DEFAULT_WINDOW_MS);
  const maxRequests = readPositiveInteger(options.maxRequests, 0);
  const ipMaxRequests = maxRequests || readPositiveInteger(options.ipMaxRequests || process.env.TS43_RATE_LIMIT_IP_MAX, DEFAULT_IP_MAX_REQUESTS);
  const identityMaxRequests = maxRequests || readPositiveInteger(options.identityMaxRequests || process.env.TS43_RATE_LIMIT_IDENTITY_MAX, DEFAULT_IDENTITY_MAX_REQUESTS);
  const now = options.now || Date.now;
  const ipBuckets = new Map();
  const identityBuckets = new Map();

  return (req, res, next) => {
    const timestamp = now();
    const ipRetryAfter = consume(ipBuckets, getClientIp(req), ipMaxRequests, windowMs, timestamp);
    const identityKey = `${req.body?.client_id || ''}:${hashLoginHint(req.body?.login_hint)}`;
    const identityRetryAfter = consume(identityBuckets, identityKey, identityMaxRequests, windowMs, timestamp);
    const retryAfter = Math.max(ipRetryAfter, identityRetryAfter);

    if (retryAfter) {
      res.set('Retry-After', String(retryAfter));
      res.status(429).json({ error: 'RATE_LIMITED' });
      return;
    }

    next();
  };
}

module.exports = { createTs43AuthRateLimiter };
