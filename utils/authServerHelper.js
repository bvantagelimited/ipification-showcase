/**
 * Auth Server Helper
 * Utility functions for working with auth servers configuration
 */

/**
 * Get auth server by server_id
 * @param {Array} authServers - Array of auth server configurations
 * @param {string} serverId - Server ID to lookup (optional)
 * @returns {Object|null} Auth server object with {id, url} or null if not found
 * 
 * @example
 * const server = getAuthServer(authServers, 'stage');
 * // Returns: { id: 'stage', url: 'https://api.stage.ipification.com/auth' }
 * 
 * @example
 * const server = getAuthServer(authServers); // no serverId
 * // Returns first server: { id: 'stage', url: '...' }
 */
function getAuthServer(authServers, serverId) {
  // If no serverId provided, return first server as default
  if (!serverId) {
    return authServers && authServers.length > 0 ? authServers[0] : null;
  }
  
  // Find server by id
  const server = authServers.find(s => s.id === serverId);
  return server || null;
}

/**
 * Get all available auth server IDs
 * @param {Array} authServers - Array of auth server configurations
 * @returns {Array<string>} Array of server IDs
 * 
 * @example
 * const ids = getAuthServerIds(authServers);
 * // Returns: ['stage', 'live']
 */
function getAuthServerIds(authServers) {
  if (!authServers || !Array.isArray(authServers)) {
    return [];
  }
  return authServers.map(s => s.id);
}

/**
 * Check if a server ID exists
 * @param {Array} authServers - Array of auth server configurations
 * @param {string} serverId - Server ID to check
 * @returns {boolean} True if server exists
 * 
 * @example
 * const exists = hasAuthServer(authServers, 'stage');
 * // Returns: true
 */
function hasAuthServer(authServers, serverId) {
  if (!authServers || !Array.isArray(authServers) || !serverId) {
    return false;
  }
  return authServers.some(s => s.id === serverId);
}

module.exports = {
  getAuthServer,
  getAuthServerIds,
  hasAuthServer
};
