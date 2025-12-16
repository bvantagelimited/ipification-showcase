const { createCache } = require('cache-manager');

// Create memory-only cache
const dataStore = createCache({
  ttl: 60 * 60 * 1000, // 1 hour TTL
});

module.exports = dataStore;
