function timestamp() {
  return new Date().toISOString();
}

function log(...args) {
  console.log(`[${timestamp()}]`, ...args);
}

function info(...args) {
  console.info(`[${timestamp()}]`, ...args);
}

function warn(...args) {
  console.warn(`[${timestamp()}]`, ...args);
}

function error(...args) {
  console.error(`[${timestamp()}]`, ...args);
}

module.exports = {
  log,
  info,
  warn,
  error
};
