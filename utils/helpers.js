function deepMerge(target, source) {
  const output = { ...target };
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}

function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

function findClientByUserFlow(clients, userFlow) {
  return clients.find(item => item.user_flow === userFlow);
}

function findClientByClientId(clients, clientId) {
  return clients.find(item => item.client_id === clientId);
}

module.exports = {
  deepMerge,
  isObject,
  delay,
  findClientByUserFlow,
  findClientByClientId
};

