const redis = require('ioredis');
const JSONCache = require('redis-json');

const redis_client = new redis(process.env.REDIS_URL);
const dataStore = new JSONCache(redis_client, {prefix: 'ip-demo:'});

module.exports = dataStore;
