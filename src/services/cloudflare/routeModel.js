function routeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `route-${Date.now()}-${Math.random().toString(16).slice(2)}`
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
    pattern: '',
    cloudflareRouteId: '',
    status: 'draft',
  }
}

export function upsertRoute(routes, route) {
  const index = routes.findIndex((item) => item.id === route.id)
  if (index < 0) return [...routes, { ...route }]
  return routes.map((item) => (item.id === route.id ? { ...item, ...route } : item))
}

export function removeRoute(routes, id) {
  return routes.filter((item) => item.id !== id)
}
