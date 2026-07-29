const ACCOUNTS_KEY = 'GAS_CONFIGTOR_ACCOUNTS';
const ACTIVE_ACCOUNT_KEY = 'GAS_CONFIGTOR_ACTIVE_ACCOUNT';
const ROUTES_KEY = 'GAS_CONFIGTOR_ROUTES';
const RESOURCES_KEY = 'GAS_CONFIGTOR_RESOURCES';

function parseProperty_(key, fallback) {
  const raw = PropertiesService.getScriptProperties().getProperty(key);
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch (_) { return fallback; }
}

function loadConfig() {
  let accounts = parseProperty_(ACCOUNTS_KEY, []);
  let activeId = PropertiesService.getScriptProperties().getProperty(ACTIVE_ACCOUNT_KEY) || '';

  // Migration from legacy single config
  if (!accounts || accounts.length === 0) {
    const legacy = parseProperty_('GAS_CONFIGTOR_CONFIG', {});
    const legacyConfig = normalizeCloudflareConfig_(legacy.config || legacy || {});
    const token = getSecret_('CF_API_TOKEN');
    if (legacyConfig.accountId || token) {
      const accId = legacyConfig.accountId || 'account-1';
      const name = legacyConfig.name || 'Account 1';
      accounts = [{
        id: accId,
        name: name,
        accountId: legacyConfig.accountId,
        zoneId: legacyConfig.zoneId || '',
        tokenConfigured: Boolean(token),
      }];
      activeId = accId;
      saveAccounts_(accounts, activeId);
    }
  }

  if (accounts.length > 0 && !accounts.some(a => a.id === activeId)) {
    activeId = accounts[0].id;
  }

  const routes = parseProperty_(ROUTES_KEY, []);
  const resources = parseProperty_(RESOURCES_KEY, { zones: [], kvNamespaces: [] });

  const activeAccount = accounts.find(a => a.id === activeId) || { id: '', name: '', accountId: '', zoneId: '', tokenConfigured: false };

  return {
    config: activeAccount,
    accounts: accounts,
    activeAccountId: activeId,
    routes: routes,
    resources: resources,
  };
}

function saveAccounts_(accounts, activeId) {
  const properties = PropertiesService.getScriptProperties();
  properties.setProperties({
    [ACCOUNTS_KEY]: JSON.stringify(accounts.map(a => ({
      id: a.id,
      name: a.name || a.accountId || 'Account',
      accountId: a.accountId,
      zoneId: a.zoneId || '',
      tokenConfigured: Boolean(a.tokenConfigured),
    }))),
    [ACTIVE_ACCOUNT_KEY]: String(activeId || ''),
  });
}

function saveAccount(data) {
  const loaded = loadConfig();
  let accounts = loaded.accounts;
  const inputAcc = data.account || {};

  if (!inputAcc.accountId) throw new Error('Account ID wajib diisi');

  const accId = inputAcc.id || inputAcc.accountId;
  let existing = accounts.find(a => a.id === accId || a.accountId === inputAcc.accountId);

  if (inputAcc.apiToken) {
    setSecret_('CF_TOKEN_' + accId, inputAcc.apiToken);
  }

  const hasToken = Boolean(inputAcc.apiToken || (existing && existing.tokenConfigured) || getSecret_('CF_TOKEN_' + accId));

  const updatedAcc = {
    id: accId,
    name: inputAcc.name || inputAcc.accountId,
    accountId: inputAcc.accountId,
    zoneId: inputAcc.zoneId || '',
    tokenConfigured: hasToken,
  };

  if (existing) {
    const idx = accounts.indexOf(existing);
    accounts[idx] = updatedAcc;
  } else {
    accounts.push(updatedAcc);
  }

  saveAccounts_(accounts, accId);
  return loadConfig();
}

function switchAccount(accId) {
  const loaded = loadConfig();
  if (!loaded.accounts.some(a => a.id === accId)) {
    throw new Error('Account ID tidak ditemukan: ' + accId);
  }
  PropertiesService.getScriptProperties().setProperty(ACTIVE_ACCOUNT_KEY, String(accId));
  return loadConfig();
}

function deleteAccount(accId) {
  let loaded = loadConfig();
  let accounts = loaded.accounts.filter(a => a.id !== accId);
  deleteSecret_('CF_TOKEN_' + accId);

  let nextActive = loaded.activeAccountId === accId ? (accounts[0]?.id || '') : loaded.activeAccountId;
  saveAccounts_(accounts, nextActive);
  return loadConfig();
}

function saveConfig(data) {
  const current = loadConfig();
  const routes = data.routes !== undefined ? data.routes : current.routes;
  const resources = data.resources !== undefined ? data.resources : current.resources;

  PropertiesService.getScriptProperties().setProperties({
    [ROUTES_KEY]: JSON.stringify(routes),
    [RESOURCES_KEY]: JSON.stringify(resources),
  });

  return loadConfig();
}

function saveCloudflareConfig(config) {
  return saveAccount({ account: config });
}

function getCloudflareConfig_() {
  return loadConfig().config || {};
}

function getSecret_(key) {
  return PropertiesService.getScriptProperties().getProperty(key) || '';
}

function setSecret_(key, value) {
  PropertiesService.getScriptProperties().setProperty(key, String(value || '').trim());
}

function deleteSecret_(key) {
  PropertiesService.getScriptProperties().deleteProperty(key);
}

function normalizeCloudflareConfig_(config) {
  config.accountId = String(config.accountId || '').trim();
  config.zoneId = String(config.zoneId || '').trim();
  if (config.apiToken) config.apiToken = String(config.apiToken).trim();
  return config;
}
