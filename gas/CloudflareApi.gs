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
  return { ok: true, status: result.result && result.result.status };
}

function listCloudflareResources() {
  const config = getCloudflareConfig_();
  const accountId = requireField_(config.accountId, 'Account ID');
  const zones = cfRequest_('/zones?per_page=50', { method: 'get' }).result || [];
  const kv = cfRequest_('/accounts/' + encodeURIComponent(accountId) + '/storage/kv/namespaces?per_page=100', { method: 'get' }).result || [];
  return {
    zones: zones.map(function (zone) { return { id: zone.id, name: zone.name, status: zone.status }; }),
    kvNamespaces: kv.map(function (ns) { return { id: ns.id, title: ns.title }; }),
  };
}

function provisionCloudflareRoute(route) {
  validateRoute_(route);
  const config = getCloudflareConfig_();
  const accountId = requireField_(config.accountId, 'Account ID');
  const zoneId = route.zoneId || config.zoneId;
  if (!zoneId) throw new Error('Zone ID wajib diisi atau pilih zone dari hasil Fetch Resources.');

  const normalized = normalizeRoute_(route);
  ensureDnsRecord_(zoneId, normalized.hostname);
  uploadWorker_(accountId, normalized.workerName, buildProxyWorker_(normalized));
  const routeResult = upsertWorkerRoute_(zoneId, normalized.pattern, normalized.workerName);

  const saved = loadConfig();
  const routes = saved.routes || [];
  const index = routes.findIndex(function (item) { return item.id === normalized.id; });
  normalized.cloudflareRouteId = routeResult.id;
  if (index >= 0) routes[index] = normalized; else routes.push(normalized);
  saveConfig({ config: saved.config || {}, routes: routes });

  return {
    ok: true,
    appliedAt: Date.now(),
    route: normalized,
    cloudflareRouteId: routeResult.id,
    publicUrl: 'https://' + normalized.hostname + normalized.pathPrefix,
  };
}

function removeCloudflareRoute(route) {
  const config = getCloudflareConfig_();
  const zoneId = route.zoneId || config.zoneId;
  if (!zoneId || !route.cloudflareRouteId) throw new Error('Zone ID dan Cloudflare route ID diperlukan.');
  cfRequest_('/zones/' + encodeURIComponent(zoneId) + '/workers/routes/' + encodeURIComponent(route.cloudflareRouteId), { method: 'delete' });
  return { ok: true };
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

function upsertWorkerRoute_(zoneId, pattern, workerName) {
  const base = '/zones/' + encodeURIComponent(zoneId) + '/workers/routes';
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
  requireField_(route.hostname, 'Hostname');
  requireField_(route.targetUrl, 'Target URL');
  if (!/^https:\/\//i.test(route.targetUrl)) throw new Error('Target URL harus memakai HTTPS.');
  if (!/^[a-z0-9.-]+$/i.test(route.hostname)) throw new Error('Hostname tidak valid.');
}

function normalizeRoute_(route) {
  const hostname = route.hostname.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
  let pathPrefix = (route.pathPrefix || '/').trim();
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
    createdAt: route.createdAt || Date.now(),
    updatedAt: Date.now(),
  };
}
