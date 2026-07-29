const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

function cfRequest_(path, options) {
  options = options || {};
  let token = options.token;
  if (!token) {
    const config = getCloudflareConfig_();
    if (config.id) {
      token = getSecret_('CF_TOKEN_' + config.id);
    }
    if (!token) {
      token = getSecret_('CF_API_TOKEN');
    }
  }
  if (!token) throw new Error('Cloudflare API token belum disimpan.');

  const request = {
    method: options.method || 'get',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': options.contentType || 'application/json',
    },
    muteHttpExceptions: true,
  };
  if (options.payload !== undefined) {
    request.payload = options.contentType === 'application/javascript'
      ? options.payload
      : JSON.stringify(options.payload);
  }

  const response = UrlFetchApp.fetch(CF_API_BASE + path, request);
  const text = response.getContentText();
  let body;
  try { body = JSON.parse(text); } catch (_) { body = { raw: text }; }
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300 || body.success === false) {
    const messages = (body.errors || []).map(function (item) { return item.message; }).join('; ');
    throw new Error('Cloudflare ' + response.getResponseCode() + ': ' + (messages || text));
  }
  return body;
}

function verifyCloudflare(config) {
  if (config) saveCloudflareConfig(config);
  const result = cfRequest_('/user/tokens/verify', { method: 'get' });
  const permissionCheck = checkCloudflarePermissions();
  return {
    ok: true,
    status: result.result ? result.result.status : 'active',
    permissions: permissionCheck,
    config: getCloudflareConfig_(),
  };
}

function checkCloudflarePermissions() {
  const currentConfig = getCloudflareConfig_();
  const checks = [
    { key: 'userToken', label: 'User -> API Tokens -> Read', fn: function () { return cfRequest_('/user/tokens/verify'); } },
    { key: 'accountWorker', label: 'Account -> Workers Scripts -> Edit', fn: function () { return cfRequest_('/accounts/' + currentConfig.accountId + '/workers/scripts'); } },
    { key: 'accountKv', label: 'Account -> Workers KV Storage -> Read', fn: function () { return cfRequest_('/accounts/' + currentConfig.accountId + '/storage/kv/namespaces'); } },
  ];
  if (currentConfig.zoneId) {
    checks.push(
      { key: 'zoneDns', label: 'Zone -> DNS -> Edit', fn: function () { return cfRequest_('/zones/' + currentConfig.zoneId + '/dns_records?per_page=1'); } },
      { key: 'zoneWorkerRoute', label: 'Zone -> Workers Routes -> Edit', fn: function () { return cfRequest_('/zones/' + currentConfig.zoneId + '/workers/routes'); } }
    );
  }

  const results = {};
  checks.forEach(function (item) {
    try {
      item.fn();
      results[item.key] = { ok: true, label: item.label };
    } catch (err) {
      results[item.key] = { ok: false, label: item.label, error: err.message };
    }
  });
  return results;
}

function fetchCloudflareResources() {
  const currentConfig = getCloudflareConfig_();
  const zonesResult = cfRequest_('/zones?per_page=50', { method: 'get' });
  const kvResult = cfRequest_('/accounts/' + currentConfig.accountId + '/storage/kv/namespaces?per_page=50', { method: 'get' });

  const zones = (zonesResult.result || []).map(function (item) {
    return { id: item.id, name: item.name, status: item.status };
  });
  const kvNamespaces = (kvResult.result || []).map(function (item) {
    return { id: item.id, title: item.title };
  });

  const resources = { zones: zones, kvNamespaces: kvNamespaces };
  const loaded = loadConfig();
  saveConfig({ config: loaded.config, routes: loaded.routes, resources: resources });
  return resources;
}

function ensureWorkerScript_(accountId, scriptName, options) {
  const content = generateWorkerScript(options);
  return cfRequest_('/accounts/' + accountId + '/workers/scripts/' + scriptName, {
    method: 'put',
    contentType: 'application/javascript',
    payload: content,
  });
}

function deleteWorkerScript_(accountId, scriptName) {
  try {
    return cfRequest_('/accounts/' + accountId + '/workers/scripts/' + scriptName, { method: 'delete' });
  } catch (err) {
    if (String(err.message).indexOf('10007') >= 0 || String(err.message).indexOf('404') >= 0) return { ok: true };
    throw err;
  }
}

function ensureWorkerRoute_(zoneId, pattern, scriptName, previousRouteId) {
  if (previousRouteId) {
    try {
      cfRequest_('/zones/' + zoneId + '/workers/routes/' + previousRouteId, {
        method: 'put',
        payload: { pattern: pattern, script: scriptName },
      });
      return { id: previousRouteId, pattern: pattern, script: scriptName };
    } catch (_) {}
  }

  const existingRoutes = cfRequest_('/zones/' + zoneId + '/workers/routes', { method: 'get' });
  const matched = (existingRoutes.result || []).find(function (item) {
    return item.pattern === pattern;
  });

  if (matched) {
    cfRequest_('/zones/' + zoneId + '/workers/routes/' + matched.id, {
      method: 'put',
      payload: { pattern: pattern, script: scriptName },
    });
    return { id: matched.id, pattern: pattern, script: scriptName };
  }

  const created = cfRequest_('/zones/' + zoneId + '/workers/routes', {
    method: 'post',
    payload: { pattern: pattern, script: scriptName },
  });
  return { id: created.result.id, pattern: pattern, script: scriptName };
}

function deleteWorkerRoute_(zoneId, routeId) {
  if (!routeId) return { ok: true };
  try {
    return cfRequest_('/zones/' + zoneId + '/workers/routes/' + routeId, { method: 'delete' });
  } catch (err) {
    if (String(err.message).indexOf('404') >= 0) return { ok: true };
    throw err;
  }
}

function ensureDnsRecord_(zoneId, hostname) {
  const existing = cfRequest_('/zones/' + zoneId + '/dns_records?name=' + encodeURIComponent(hostname), { method: 'get' });
  const matched = (existing.result || [])[0];
  const payload = {
    type: 'AAAA',
    name: hostname,
    content: '100::',
    ttl: 1,
    proxied: true,
  };

  if (matched) {
    const updated = cfRequest_('/zones/' + zoneId + '/dns_records/' + matched.id, {
      method: 'put',
      payload: payload,
    });
    return { id: updated.result.id, hostname: hostname };
  }

  const created = cfRequest_('/zones/' + zoneId + '/dns_records', {
    method: 'post',
    payload: payload,
  });
  return { id: created.result.id, hostname: hostname };
}

function runProvisionStep_(name, fn) {
  try {
    const result = fn();
    return { name: name, ok: true, result: result };
  } catch (err) {
    return { name: name, ok: false, error: err.message };
  }
}

function provisionRoute(routeInput) {
  const saved = loadConfig();
  const routes = saved.routes || [];
  const normalized = normalizeRouteInput_(routeInput);

  const zoneId = normalized.zoneId || saved.config.zoneId;
  if (!zoneId) throw new Error('Zone ID Cloudflare belum dipilih.');
  if (!saved.config.accountId) throw new Error('Account ID Cloudflare belum diset.');

  const previous = routes.find(function (item) { return item.id === normalized.id; });
  let faviconRouteResult = null;

  runProvisionStep_('Worker Script ' + normalized.workerName, function () {
    return ensureWorkerScript_(saved.config.accountId, normalized.workerName, normalized);
  });
  const routeResult = runProvisionStep_('Worker Route ' + normalized.routePattern, function () {
    return ensureWorkerRoute_(zoneId, normalized.routePattern, normalized.workerName, previous && previous.cloudflareRouteId);
  }).result;
  if (normalized.faviconDriveFileId || normalized.faviconDataUrl) {
    faviconRouteResult = runProvisionStep_('Favicon Route ' + normalized.faviconPattern, function () {
      return ensureWorkerRoute_(zoneId, normalized.faviconPattern, normalized.workerName, previous && previous.faviconCloudflareRouteId);
    }).result;
  }
  runProvisionStep_('DNS record untuk ' + normalized.hostname, function () {
    return ensureDnsRecord_(zoneId, normalized.hostname);
  });

  const index = routes.findIndex(function (item) { return item.id === normalized.id; });
  normalized.cloudflareRouteId = routeResult.id;
  normalized.faviconCloudflareRouteId = faviconRouteResult ? faviconRouteResult.id : '';
  normalized.status = 'provisioned';
  normalized.accountId = saved.config.accountId;
  normalized.faviconDataUrl = '';
  if (index >= 0) routes[index] = normalized; else routes.push(normalized);
  saveConfig({ config: saved.config || {}, routes: routes, resources: saved.resources });

  return {
    ok: true,
    route: normalized,
  };
}

function deleteRoute(routeInput) {
  const saved = loadConfig();
  const routes = saved.routes || [];
  const normalized = normalizeRouteInput_(routeInput);
  const zoneId = normalized.zoneId || saved.config.zoneId;

  if (zoneId) {
    deleteWorkerRoute_(zoneId, normalized.cloudflareRouteId);
    deleteWorkerRoute_(zoneId, normalized.faviconCloudflareRouteId);
  }
  if (saved.config.accountId) {
    deleteWorkerScript_(saved.config.accountId, normalized.workerName);
  }

  const updatedRoutes = routes.filter(function (item) { return item.id !== normalized.id; });
  saveConfig({ config: saved.config || {}, routes: updatedRoutes, resources: saved.resources });
  return { ok: true, remainingRoutes: updatedRoutes };
}

function normalizeRouteInput_(route) {
  const source = route || {};
  const rawUrl = String(source.routePattern || source.url || '').trim();
  let hostname = String(source.hostname || '').trim();
  let pathPattern = String(source.pathPattern || '').trim();

  if (rawUrl) {
    const cleaned = rawUrl.replace(/^https?:\/\//i, '');
    const slashIndex = cleaned.indexOf('/');
    if (slashIndex >= 0) {
      hostname = hostname || cleaned.slice(0, slashIndex);
      pathPattern = pathPattern || cleaned.slice(slashIndex);
    } else {
      hostname = hostname || cleaned;
    }
  }

  if (!hostname) throw new Error('Hostname/URL route wajib diisi.');

  hostname = hostname.toLowerCase();
  pathPattern = pathPattern || '/*';
  if (!pathPattern.startsWith('/')) pathPattern = '/' + pathPattern;

  const targetUrl = String(source.targetUrl || '').trim();
  const workerName = String(source.workerName || ('gas-proxy-' + hostname.replace(/[^a-z0-9]/g, '-'))).trim();

  return {
    id: source.id || ('route_' + Date.now()),
    workerName: workerName,
    hostname: hostname,
    pathPattern: pathPattern,
    routePattern: hostname + pathPattern,
    targetUrl: targetUrl,
    deliveryMode: source.deliveryMode === 'full_proxy' ? 'full_proxy' : 'redirect',
    stripPrefix: Boolean(source.stripPrefix),
    corsBridge: Boolean(source.corsBridge),
    status: source.status || 'draft',
    zoneId: source.zoneId || '',
    accountId: source.accountId || '',
    cloudflareRouteId: source.cloudflareRouteId || '',
    faviconDriveFileId: source.faviconDriveFileId || '',
    faviconDataUrl: source.faviconDataUrl || '',
    faviconPattern: hostname + '/favicon.ico',
    faviconCloudflareRouteId: source.faviconCloudflareRouteId || '',
  };
}
