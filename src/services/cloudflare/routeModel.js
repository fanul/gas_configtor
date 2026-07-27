function routeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `route-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function normalizeCloudflareConfig(config) {
  return {
    ...config,
    accountId: String(config.accountId || '').trim(),
    zoneId: String(config.zoneId || '').trim(),
    apiToken: String(config.apiToken || '').trim(),
  }
}

export function emptyRoute(zoneId = '') {
  return {
    id: routeId(),
    zoneId,
    hostname: '',
    pathPrefix: '/',
    targetUrl: '',
    workerName: '',
    stripPrefix: true,
    deliveryMode: 'redirect',
    pattern: '',
    cloudflareRouteId: '',
    status: 'draft',
  }
}

export function normalizeRouteInput(route) {
  const value = { ...route }
  const raw = String(value.hostname || '').trim().replace(/^https?:\/\//i, '')
  const slash = raw.indexOf('/')
  value.hostname = (slash < 0 ? raw : raw.slice(0, slash)).replace(/\/$/, '').toLowerCase()
  if (slash >= 0 && (!value.pathPrefix || value.pathPrefix === '/')) {
    value.pathPrefix = `/${raw.slice(slash + 1).replace(/^\/+|\/+$/g, '')}`
  }
  value.pathPrefix = value.pathPrefix || '/'
  if (!value.pathPrefix.startsWith('/')) value.pathPrefix = `/${value.pathPrefix}`
  value.workerName = String(value.workerName || '')
    .toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 63)
  value.deliveryMode = value.deliveryMode === 'full_proxy' ? 'full_proxy' : 'redirect'
  return value
}

export function upsertRoute(routes, route) {
  const index = routes.findIndex((item) => item.id === route.id)
  if (index < 0) return [...routes, { ...route }]
  return routes.map((item) => (item.id === route.id ? { ...item, ...route } : item))
}

export function removeRoute(routes, id) {
  return routes.filter((item) => item.id !== id)
}
