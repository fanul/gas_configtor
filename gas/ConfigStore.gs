const CONFIG_KEY = 'GAS_CONFIGTOR_CONFIG';
const ROUTES_KEY = 'GAS_CONFIGTOR_ROUTES';
const RESOURCES_KEY = 'GAS_CONFIGTOR_RESOURCES';
const CF_TOKEN_KEY = 'CF_API_TOKEN';

function parseProperty_(key, fallback) {
  const raw = PropertiesService.getScriptProperties().getProperty(key);
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch (_) { return fallback; }
}

function loadConfig() {
  const legacy = parseProperty_(CONFIG_KEY, {});
  const config = legacy.config || legacy || {};
  const routes = parseProperty_(ROUTES_KEY, legacy.routes || []);
  const resources = parseProperty_(RESOURCES_KEY, legacy.resources || { zones: [], kvNamespaces: [] });
  delete config.apiToken;
  delete config.routes;
  delete config.resources;
  return { config: config, routes: routes, resources: resources };
}

function saveConfig(data) {
  const properties = PropertiesService.getScriptProperties();
  const current = loadConfig();
  const incomingConfig = Object.assign({}, data.config || {});
  if (incomingConfig.apiToken) setSecret_(CF_TOKEN_KEY, incomingConfig.apiToken);
  delete incomingConfig.apiToken;

  const config = Object.assign({}, current.config, incomingConfig);
  const routes = data.routes || current.routes || [];
  const resources = data.resources || current.resources || { zones: [], kvNamespaces: [] };

  properties.setProperties({
    [CONFIG_KEY]: JSON.stringify(config),
    [ROUTES_KEY]: JSON.stringify(routes),
    [RESOURCES_KEY]: JSON.stringify(resources),
  });

  return { ok: true, savedAt: Date.now(), config: config, routes: routes, resources: resources };
}

function saveCloudflareConfig(config) {
  const current = loadConfig();
  return saveConfig({ config: config || {}, routes: current.routes, resources: current.resources });
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
