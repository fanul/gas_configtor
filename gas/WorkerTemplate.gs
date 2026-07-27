function buildProxyWorker_(route) {
  const config = JSON.stringify({
    hostname: route.hostname,
    pathPrefix: route.pathPrefix,
    targetUrl: route.targetUrl,
    stripPrefix: route.stripPrefix,
  });

  return [
    "const ROUTE = " + config + ";",
    "addEventListener('fetch', event => event.respondWith(handleRequest(event.request)));",
    "async function handleRequest(request) {",
    "  const incoming = new URL(request.url);",
    "  const base = new URL(ROUTE.targetUrl);",
    "  let suffix = incoming.pathname;",
    "  if (ROUTE.stripPrefix && ROUTE.pathPrefix !== '/' && suffix.startsWith(ROUTE.pathPrefix)) {",
    "    suffix = suffix.slice(ROUTE.pathPrefix.length);",
    "  }",
    "  if (suffix && suffix !== '/') base.pathname = joinPath(base.pathname, suffix);",
    "  base.search = incoming.search;",
    "  const headers = new Headers(request.headers);",
    "  headers.delete('host');",
    "  headers.set('x-forwarded-host', incoming.hostname);",
    "  headers.set('x-forwarded-proto', 'https');",
    "  const init = { method: request.method, headers, redirect: 'follow' };",
    "  if (!['GET', 'HEAD'].includes(request.method)) init.body = request.body;",
    "  const response = await fetch(base.toString(), init);",
    "  return new Response(response.body, { status: response.status, headers: response.headers });",
    "}",
    "function joinPath(left, right) {",
    "  return (left.replace(/\\/$/, '') + '/' + right.replace(/^\\//, '')).replace(/\\/{2,}/g, '/');",
    "}",
  ].join('\n');
}
