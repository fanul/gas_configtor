const CONFIG_KEY = 'GAS_CONFIGTOR_CONFIG';
const CF_TOKEN_KEY = 'CF_API_TOKEN';

function loadConfig() {
  const raw = PropertiesService.getScriptProperties().getProperty(CONFIG_KEY);
  if (!raw) return { config: {}, routes: [] };
  try {
    const data = JSON.parse(raw);
    data.config = data.config || {};
    data.routes = data.routes || [];
    delete data.config.apiToken;
    return data;
  } catch (err) {
    return { config: {}, routes: [], parseError: err.message };
  }
}

function saveConfig(data) {
  const current = loadConfig();
  const incomingConfig = data.config || {};
  if (incomingConfig.apiToken) setSecret_(CF_TOKEN_KEY, incomingConfig.apiToken);
  delete incomingConfig.apiToken;

  const payload = {
    config: Object.assign({}, current.config || {}, incomingConfig),
    routes: data.routes || current.routes || [],
    savedAt: Date.now(),
  };
  PropertiesService.getScriptProperties().setProperty(CONFIG_KEY, JSON.stringify(payload));
  return { ok: true, savedAt: payload.savedAt, config: payload.config, routes: payload.routes };
}

function saveCloudflareConfig(config) {
  return saveConfig({ config: config || {}, routes: loadConfig().routes || [] });
}

function getCloudflareConfig_() {
  return loadConfig().config || {};
}

function getSecret_(key) {
  return PropertiesService.getScriptProperties().getProperty(key) || '';
}

function setSecret_(key, value) {
  PropertiesService.getScriptProperties().setProperty(key, value);
}
