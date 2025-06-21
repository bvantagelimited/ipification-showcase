const { createCache } = require('cache-manager');

// Create memory-only cache
const dataStore = createCache({
  ttl: 60 * 60 * 1000, // 10 minutes TTL
});

module.exports = dataStore;
