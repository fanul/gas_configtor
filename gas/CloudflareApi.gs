const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

function cfRequest_(path, options) {
  const token = options.token || getSecret_('CF_API_TOKEN');
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
  saveCloudflareConfig(config || {});
  const result = cfRequest_('/user/tokens/verify', { method: 'get' });
  const permissionCheck = checkCloudflarePermissions();
  return {
    ok: permissionCheck.ok,
    status: result.result && result.result.status,
    permissions: permissionCheck,
  };
}

function checkCloudflarePermissions() {
  const config = getCloudflareConfig_();
  const accountId = requireField_(config.accountId, 'Account ID');
  const zoneId = requireField_(config.zoneId, 'Zone ID');
  const checks = [
    { name: 'Zone Read', path: '/zones/' + encodeURIComponent(zoneId) },
    { name: 'DNS scope', path: '/zones/' + encodeURIComponent(zoneId) + '/dns_records?per_page=1' },
    { name: 'Workers Scripts scope', path: '/accounts/' + encodeURIComponent(accountId) + '/workers/scripts' },
    { name: 'Workers Routes scope', path: '/zones/' + encodeURIComponent(zoneId) + '/workers/routes' },
  ];
  const results = checks.map(function (check) {
    try {
      cfRequest_(check.path, { method: 'get' });
      return { name: check.name, ok: true };
    } catch (err) {
      return { name: check.name, ok: false, error: err.message };
    }
  });
  return { ok: results.every(function (item) { return item.ok; }), checks: results };
}

function listCloudflareResources() {
  const config = getCloudflareConfig_();
  const accountId = requireField_(config.accountId, 'Account ID');
  const zones = cfRequest_('/zones?per_page=50', { method: 'get' }).result || [];
  const kv = cfRequest_('/accounts/' + encodeURIComponent(accountId) + '/storage/kv/namespaces?per_page=100', { method: 'get' }).result || [];
  const resources = {
    zones: zones.map(function (zone) { return { id: zone.id, name: zone.name, status: zone.status }; }),
    kvNamespaces: kv.map(function (ns) { return { id: ns.id, title: ns.title }; }),
  };
  const saved = loadConfig();
  saveConfig({ config: saved.config, routes: saved.routes, resources: resources });
  return resources;
}

function loadCloudflareDashboard() {
  const saved = loadConfig();
  const result = {
    config: saved.config || {},
    routes: saved.routes || [],
    resources: saved.resources || { zones: [], kvNamespaces: [] },
    tokenConfigured: Boolean(getSecret_('CF_API_TOKEN')),
    warning: '',
  };
  if (!result.tokenConfigured || !result.config.accountId) return result;
  try {
    result.resources = listCloudflareResources();
  } catch (err) {
    result.warning = 'Resource Cloudflare gagal direfresh; memakai cache GAS Properties. ' + err.message;
  }
  return result;
}

function saveCloudflareRouteDraft(route) {
  validateRoute_(route);
  const saved = loadConfig();
  const routes = saved.routes || [];
  const normalized = normalizeRoute_(route);
  normalized.status = route.status === 'provisioned' ? 'provisioned' : 'draft';
  normalized.cloudflareRouteId = route.cloudflareRouteId || '';
  const index = routes.findIndex(function (item) { return item.id === normalized.id; });
  if (index >= 0) routes[index] = normalized; else routes.push(normalized);
  saveConfig({ config: saved.config, routes: routes, resources: saved.resources });
  return normalized;
}

function provisionCloudflareRoute(route) {
  validateRoute_(route);
  const config = getCloudflareConfig_();
  const accountId = requireField_(config.accountId, 'Account ID');
  const zoneId = route.zoneId || config.zoneId;
  if (!zoneId) throw new Error('Zone ID wajib diisi atau pilih zone dari hasil Fetch Resources.');

  const saved = loadConfig();
  const routes = saved.routes || [];
  const previous = routes.find(function (item) { return item.id === route.id; });
  const normalized = normalizeRoute_(route);
  runProvisionStep_('DNS record untuk ' + normalized.hostname, function () {
    return ensureDnsRecord_(zoneId, normalized.hostname);
  });
  runProvisionStep_('upload Worker ' + normalized.workerName, function () {
    return uploadWorker_(accountId, normalized.workerName, buildProxyWorker_(normalized));
  });
  const routeResult = runProvisionStep_('Worker Route ' + normalized.pattern, function () {
    return upsertWorkerRoute_(zoneId, normalized.pattern, normalized.workerName, previous);
  });

  const index = routes.findIndex(function (item) { return item.id === normalized.id; });
  normalized.cloudflareRouteId = routeResult.id;
  normalized.status = 'provisioned';
  if (index >= 0) routes[index] = normalized; else routes.push(normalized);
  saveConfig({ config: saved.config || {}, routes: routes, resources: saved.resources });

  return {
    ok: true,
    appliedAt: Date.now(),
    route: normalized,
    cloudflareRouteId: routeResult.id,
    publicUrl: 'https://' + normalized.hostname + normalized.pathPrefix,
  };
}

function runProvisionStep_(label, operation) {
  try {
    return operation();
  } catch (err) {
    throw new Error('Provision gagal pada tahap [' + label + ']: ' + err.message);
  }
}

function deleteCloudflareRoute(route) {
  const config = getCloudflareConfig_();
  const zoneId = route.zoneId || config.zoneId;
  if (route.cloudflareRouteId) {
    if (!zoneId) throw new Error('Zone ID diperlukan untuk menghapus route Cloudflare.');
    cfRequest_('/zones/' + encodeURIComponent(zoneId) + '/workers/routes/' + encodeURIComponent(route.cloudflareRouteId), { method: 'delete' });
  }
  const saved = loadConfig();
  const routes = (saved.routes || []).filter(function (item) { return item.id !== route.id; });
  saveConfig({ config: saved.config, routes: routes, resources: saved.resources });
  return { ok: true, id: route.id };
}

function ensureDnsRecord_(zoneId, hostname) {
  const query = '/zones/' + encodeURIComponent(zoneId) + '/dns_records?type=AAAA&name=' + encodeURIComponent(hostname);
  const existing = cfRequest_(query, { method: 'get' }).result || [];
  if (existing.length) {
    const record = existing[0];
    if (record.proxied) return record;
    return cfRequest_('/zones/' + encodeURIComponent(zoneId) + '/dns_records/' + record.id, {
      method: 'put', payload: { type: 'AAAA', name: hostname, content: '100::', proxied: true, ttl: 1 },
    }).result;
  }
  return cfRequest_('/zones/' + encodeURIComponent(zoneId) + '/dns_records', {
    method: 'post', payload: { type: 'AAAA', name: hostname, content: '100::', proxied: true, ttl: 1 },
  }).result;
}

function uploadWorker_(accountId, workerName, source) {
  return cfRequest_('/accounts/' + encodeURIComponent(accountId) + '/workers/scripts/' + encodeURIComponent(workerName), {
    method: 'put', contentType: 'application/javascript', payload: source,
  }).result;
}

function upsertWorkerRoute_(zoneId, pattern, workerName, previous) {
  const base = '/zones/' + encodeURIComponent(zoneId) + '/workers/routes';
  if (previous && previous.cloudflareRouteId && previous.zoneId === zoneId) {
    return cfRequest_(base + '/' + previous.cloudflareRouteId, {
      method: 'put', payload: { pattern: pattern, script: workerName },
    }).result;
  }
  const routes = cfRequest_(base, { method: 'get' }).result || [];
  const existing = routes.find(function (item) { return item.pattern === pattern; });
  const payload = { pattern: pattern, script: workerName };
  if (existing) {
    return cfRequest_(base + '/' + existing.id, { method: 'put', payload: payload }).result;
  }
  return cfRequest_(base, { method: 'post', payload: payload }).result;
}

function requireField_(value, label) {
  if (!value) throw new Error(label + ' wajib diisi.');
  return value;
}

function validateRoute_(route) {
  if (!route) throw new Error('Route tidak boleh kosong.');
  const parts = splitHostnamePath_(requireField_(route.hostname, 'Hostname'), route.pathPrefix);
  requireField_(route.targetUrl, 'Target URL');
  if (!/^https:\/\//i.test(route.targetUrl)) throw new Error('Target URL harus memakai HTTPS.');
  if (!/^[a-z0-9.-]+$/i.test(parts.hostname)) throw new Error('Hostname tidak valid. Gunakan contoh game.uploadx.my.id dan taruh /path di Path Prefix.');
}

function normalizeRoute_(route) {
  const parts = splitHostnamePath_(route.hostname, route.pathPrefix);
  const hostname = parts.hostname;
  let pathPrefix = parts.pathPrefix;
  if (pathPrefix.charAt(0) !== '/') pathPrefix = '/' + pathPrefix;
  pathPrefix = pathPrefix.replace(/\/+$/, '') || '/';
  const slug = (route.workerName || ('gas-' + hostname + '-' + pathPrefix))
    .toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 63);
  const pattern = pathPrefix === '/' ? hostname + '/*' : hostname + pathPrefix + '*';
  return {
    id: route.id || Utilities.getUuid(),
    zoneId: route.zoneId || '',
    hostname: hostname,
    pathPrefix: pathPrefix,
    targetUrl: route.targetUrl.replace(/\/$/, ''),
    workerName: slug,
    pattern: pattern,
    stripPrefix: route.stripPrefix !== false,
    cloudflareRouteId: route.cloudflareRouteId || '',
    status: route.status || 'draft',
    createdAt: route.createdAt || Date.now(),
    updatedAt: Date.now(),
  };
}

function splitHostnamePath_(hostnameValue, pathValue) {
  const raw = String(hostnameValue || '').trim().replace(/^https?:\/\//i, '');
  const slash = raw.indexOf('/');
  const hostname = (slash < 0 ? raw : raw.substring(0, slash)).replace(/\/$/, '').toLowerCase();
  let pathPrefix = String(pathValue || '/').trim();
  if (slash >= 0 && (!pathPrefix || pathPrefix === '/')) {
    pathPrefix = '/' + raw.substring(slash + 1).replace(/^\/+|\/+$/g, '');
  }
  return { hostname: hostname, pathPrefix: pathPrefix || '/' };
}
