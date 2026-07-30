import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Cloudflare provisioner uses the available Worker generator', async () => {
  const source = await readFile(new URL('../gas/CloudflareApi.gs', import.meta.url), 'utf8')

  assert.match(source, /const content = buildProxyWorker_\(options\)/)
  assert.doesNotMatch(source, /generateWorkerScript/)
})
import vm from 'node:vm'

async function generatedWorker(route) {
  const gasSource = await readFile(new URL('../gas/WorkerTemplate.gs', import.meta.url), 'utf8')
  const context = { JSON }
  vm.createContext(context)
  vm.runInContext(gasSource, context)
  return context.buildProxyWorker_(route)
}

async function runWorker(route, incomingUrl, upstream = new Response('ok', { status: 200 })) {
  const source = await generatedWorker(route)
  let target
  let fetchInit
  const context = {
    URL, Headers, Request, Response, atob,
    addEventListener() {},
    async fetch(url, init) {
      target = String(url)
      fetchInit = init
      return upstream
    },
  }
  vm.createContext(context)
  vm.runInContext(source, context)
  const response = await context.handleRequest(new Request(incomingUrl))
  return { target, fetchInit, response }
}

async function capturedTarget(route, incomingUrl) {
  return (await runWorker(route, incomingUrl)).target
}

test('generated Worker defaults an empty pathPrefix instead of throwing 1101', async () => {
  const result = await runWorker({
    hostname: 'example.com', pathPrefix: '', targetUrl: 'https://example.org/exec',
    stripPrefix: true, deliveryMode: 'redirect', faviconDataUrl: '',
  }, 'https://example.com/')

  assert.equal(result.response.status, 200)
})

test('worker serves provisioned favicon without proxying upstream', async () => {
  const result = await runWorker({
    hostname: 'x.test', pathPrefix: '/app', targetUrl: 'https://example.com',
    stripPrefix: true, faviconDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
  }, 'https://x.test/app/favicon.ico')
  assert.equal(result.target, undefined)
  assert.equal(result.response.headers.get('content-type'), 'image/png')
})

test('proxy keeps exact target URL when stripped path has no suffix', async () => {
  const target = await capturedTarget({
    hostname: 'game.uploadx.my.id',
    pathPrefix: '/backpack_jianghu',
    targetUrl: 'https://example.com/app',
    stripPrefix: true,
    deliveryMode: 'full_proxy',
  }, 'https://game.uploadx.my.id/backpack_jianghu')

  assert.equal(target, 'https://example.com/app')
})

test('proxy appends only real suffix after stripped prefix', async () => {
  const target = await capturedTarget({
    hostname: 'game.uploadx.my.id',
    pathPrefix: '/backpack_jianghu',
    targetUrl: 'https://example.com/base',
    stripPrefix: true,
  }, 'https://game.uploadx.my.id/backpack_jianghu/api/users?id=1')

  assert.equal(target, 'https://example.com/base/api/users?id=1')
})

test('proxy injects upstream base URL so root-relative assets stay upstream', async () => {
  const html = '<html><head><link href="/static/macros/client/app.css"></head><body></body></html>'
  const upstream = new Response(html, { headers: {
    'content-type': 'text/html; charset=utf-8',
    'content-security-policy': "script-src 'self';base-uri 'self';object-src 'none'",
    'content-length': String(html.length),
  } })
  const { response } = await runWorker({
    hostname: 'game.uploadx.my.id',
    pathPrefix: '/backpack_jianghu',
    targetUrl: 'https://example.com/app',
    stripPrefix: true,
    deliveryMode: 'full_proxy',
  }, 'https://game.uploadx.my.id/backpack_jianghu', upstream)

  const body = await response.text()
  assert.match(body, /<base href="https:\/\/example\.com\/">/)
  assert.equal(
    response.headers.get('content-security-policy'),
    "script-src 'self';base-uri 'self' https://example.com;object-src 'none'",
  )
  assert.equal(response.headers.get('content-length'), null)
})

test('proxy adds a base-uri directive when upstream CSP does not define one', async () => {
  const upstream = new Response('<html><head></head></html>', { headers: {
    'content-type': 'text/html',
    'content-security-policy': "script-src 'self'",
  } })
  const { response } = await runWorker({
    hostname: 'game.uploadx.my.id',
    pathPrefix: '/backpack_jianghu',
    targetUrl: 'https://example.com/app',
    stripPrefix: true,
    deliveryMode: 'full_proxy',
  }, 'https://game.uploadx.my.id/backpack_jianghu', upstream)

  assert.equal(
    response.headers.get('content-security-policy'),
    "script-src 'self';base-uri https://example.com",
  )
})

test('browser navigation redirects to GAS so Google runtime keeps its required origin', async () => {
  const route = {
    hostname: 'game.uploadx.my.id',
    pathPrefix: '/backpack_jianghu',
    targetUrl: 'https://script.google.com/macros/s/deployment/exec',
    stripPrefix: true,
    deliveryMode: 'redirect',
  }
  const source = await generatedWorker(route)
  let fetchCalled = false
  const context = {
    URL, Headers, Request, Response, atob,
    addEventListener() {},
    async fetch() {
      fetchCalled = true
      return new Response('unexpected')
    },
  }
  vm.createContext(context)
  vm.runInContext(source, context)
  const request = new Request('https://game.uploadx.my.id/backpack_jianghu?view=compact', {
    headers: { accept: 'text/html,application/xhtml+xml' },
  })
  const response = await context.handleRequest(request)

  assert.equal(fetchCalled, false)
  assert.equal(response.status, 302)
  assert.equal(response.headers.get('location'), 'https://script.google.com/macros/s/deployment/exec?view=compact')
  assert.equal(response.headers.get('x-gas-route-mode'), 'redirect')
})

test('redirect mode does not depend on the browser Accept header', async () => {
  const { response } = await runWorker({
    hostname: 'game.uploadx.my.id',
    pathPrefix: '/backpack_jianghu',
    targetUrl: 'https://script.google.com/macros/s/deployment/exec',
    stripPrefix: true,
    deliveryMode: 'redirect',
  }, 'https://game.uploadx.my.id/backpack_jianghu')

  assert.equal(response.status, 302)
  assert.equal(response.headers.get('x-gas-route-mode'), 'redirect')
})

test('Workspace-scoped GAS always redirects so Google authentication stays on its origin', async () => {
  const targetUrl = 'https://script.google.com/a/macros/example.org/s/deployment/exec'
  const { target, response } = await runWorker({
    hostname: 'kpi.example.com',
    pathPrefix: '/',
    targetUrl,
    stripPrefix: true,
    deliveryMode: 'full_proxy',
  }, 'https://kpi.example.com/')

  assert.equal(target, undefined)
  assert.equal(response.status, 302)
  assert.equal(response.headers.get('location'), targetUrl)
  assert.equal(response.headers.get('x-gas-route-mode'), 'redirect')
  assert.equal(response.headers.get('x-gas-redirect-reason'), 'workspace-auth')
})

test('full proxy mode keeps browser navigation on the custom origin for regular targets', async () => {
  const upstream = new Response('<html><head></head><body>proxied</body></html>', {
    headers: { 'content-type': 'text/html' },
  })
  const { target, response } = await runWorker({
    hostname: 'game.uploadx.my.id',
    pathPrefix: '/backpack_jianghu',
    targetUrl: 'https://example.com/app',
    stripPrefix: true,
    deliveryMode: 'full_proxy',
  }, 'https://game.uploadx.my.id/backpack_jianghu', upstream)

  assert.equal(target, 'https://example.com/app')
  assert.equal(response.status, 200)
  assert.match(await response.text(), /proxied/)
})

test('full proxy serves a Worker-native GAS shell with an RPC shim', async () => {
  const upstream = Response.json({
    ok: true,
    html: '<!doctype html><html><head><title>App</title></head><body>native app</body></html>',
  })
  const { target, response } = await runWorker({
    hostname: 'game.uploadx.my.id',
    pathPrefix: '/backpack_jianghu',
    targetUrl: 'https://script.google.com/macros/s/deployment/exec',
    stripPrefix: true,
    deliveryMode: 'full_proxy',
  }, 'https://game.uploadx.my.id/backpack_jianghu', upstream)
  const body = await response.text()

  assert.equal(target, 'https://script.google.com/macros/s/deployment/exec?__full_proxy_html=1')
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('x-gas-route-mode'), 'full_proxy')
  assert.equal(response.headers.get('x-gas-runtime'), 'worker-native-rpc')
  assert.match(body, /window\.google\.script\.run=runner\(\)/)
  assert.match(body, /\/backpack_jianghu\?__gas_rpc=1/)
  assert.match(body, /native app/)
})

test('full proxy forwards same-origin RPC POST requests to the GAS deployment', async () => {
  const source = await generatedWorker({
    hostname: 'game.uploadx.my.id',
    pathPrefix: '/backpack_jianghu',
    targetUrl: 'https://script.google.com/macros/s/deployment/exec',
    stripPrefix: true,
    deliveryMode: 'full_proxy',
  })
  let target
  let fetchInit
  const context = {
    URL, Headers, Request, Response, atob,
    addEventListener() {},
    async fetch(url, init) {
      target = String(url)
      fetchInit = init
      return Response.json({ ok: true, result: { hasAccess: true } })
    },
  }
  vm.createContext(context)
  vm.runInContext(source, context)
  const rpcBody = JSON.stringify({ functionName: 'checkSettingsAccess', args: [] })
  const response = await context.handleRequest(new Request(
    'https://game.uploadx.my.id/backpack_jianghu?__gas_rpc=1',
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: rpcBody },
  ))

  assert.equal(target, 'https://script.google.com/macros/s/deployment/exec')
  assert.equal(fetchInit.method, 'POST')
  assert.equal(fetchInit.redirect, 'manual')
  assert.equal(await new Response(fetchInit.body).text(), rpcBody)
  assert.deepEqual(await response.json(), { ok: true, result: { hasAccess: true } })
})

test('full proxy executes RPC by POST then reads the GAS result redirect with GET', async () => {
  const source = await generatedWorker({
    hostname: 'game.uploadx.my.id', pathPrefix: '/backpack_jianghu',
    targetUrl: 'https://script.google.com/macros/s/deployment/exec',
    stripPrefix: true, deliveryMode: 'full_proxy',
  })
  const calls = []
  const redirectUrl = 'https://script.googleusercontent.com/macros/echo?user_content_key=key&lib=lib'
  const context = {
    URL, Headers, Request, Response, atob, addEventListener() {},
    async fetch(url, init) {
      calls.push({ url: String(url), init })
      if (calls.length === 1) return new Response(null, { status: 302, headers: { location: redirectUrl } })
      return Response.json({ ok: true, result: ['recipe'] })
    },
  }
  vm.createContext(context)
  vm.runInContext(source, context)
  const rpcBody = JSON.stringify({ functionName: 'listRecipesFromSheet', args: [] })
  const response = await context.handleRequest(new Request(
    'https://game.uploadx.my.id/backpack_jianghu?__gas_rpc=1',
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: rpcBody },
  ))

  assert.equal(calls.length, 2)
  assert.equal(calls[0].init.method, 'POST')
  assert.equal(await new Response(calls[0].init.body).text(), rpcBody)
  assert.equal(calls[1].url, redirectUrl)
  assert.equal(calls[1].init.method, 'GET')
  assert.equal(calls[1].init.body, undefined)
  assert.deepEqual(await response.json(), { ok: true, result: ['recipe'] })
})

test('full proxy injects a nonce-compatible same-origin CORS bridge', async () => {
  const html = '<html><head><script nonce="runtime-nonce">start()</script></head></html>'
  const upstream = new Response(html, { headers: {
    'content-type': 'text/html',
    'content-security-policy': "script-src 'nonce-runtime-nonce';base-uri 'self'",
  } })
  const { response } = await runWorker({
    hostname: 'game.uploadx.my.id',
    pathPrefix: '/backpack_jianghu',
    targetUrl: 'https://example.com/app',
    stripPrefix: true,
    deliveryMode: 'full_proxy',
  }, 'https://game.uploadx.my.id/backpack_jianghu', upstream)
  const body = await response.text()

  assert.match(body, /<script nonce="runtime-nonce">\(function\(\)/)
  assert.match(body, /const endpoint=location\.origin\+"\/backpack_jianghu\?__gas_cors_proxy="/)
  assert.match(body, /setTimeout\(function\(\)\{location\.replace\(fallback\)\},3000\)/)
  assert.doesNotMatch(body, /markReady|ready=false/)
  assert.match(body, /<meta http-equiv="refresh" content="3;url=https:\/\/example\.com\/app">/)
  assert.equal(response.headers.get('refresh'), '3; url=https://example.com/app')
  assert.match(body, /__gas_cors_proxy=/)
  assert.match(body, /XMLHttpRequest\.prototype\.open/)
})

test('full proxy fetches allowlisted Google runtime URLs server-side', async () => {
  const targetUrl = 'https://script.google.com/wardeninit?_reqid=123&rt=j'
  const upstream = new Response('runtime response', { headers: {
    'content-type': 'application/json',
    'set-cookie': 'private=value',
  } })
  const { target, fetchInit, response } = await runWorker({
    hostname: 'game.uploadx.my.id',
    pathPrefix: '/backpack_jianghu',
    targetUrl: 'https://script.google.com/macros/s/deployment/exec',
    stripPrefix: true,
    deliveryMode: 'full_proxy',
  }, `https://game.uploadx.my.id/backpack_jianghu?__gas_cors_proxy=${encodeURIComponent(targetUrl)}`, upstream)

  assert.equal(target, targetUrl)
  assert.equal(fetchInit.method, 'GET')
  assert.equal(response.headers.get('access-control-allow-origin'), '*')
  assert.equal(response.headers.get('set-cookie'), null)
  assert.equal(await response.text(), 'runtime response')
})

test('full proxy rejects non-Google targets instead of becoming an open proxy', async () => {
  const { target, response } = await runWorker({
    hostname: 'game.uploadx.my.id',
    pathPrefix: '/backpack_jianghu',
    targetUrl: 'https://script.google.com/macros/s/deployment/exec',
    stripPrefix: true,
    deliveryMode: 'full_proxy',
  }, 'https://game.uploadx.my.id/backpack_jianghu?__gas_cors_proxy=https%3A%2F%2Fevil.example%2Fsecret')

  assert.equal(target, undefined)
  assert.equal(response.status, 403)
})

test('full proxy answers runtime CORS preflight locally', async () => {
  const source = await generatedWorker({
    hostname: 'game.uploadx.my.id', pathPrefix: '/backpack_jianghu',
    targetUrl: 'https://script.google.com/macros/s/deployment/exec',
    stripPrefix: true, deliveryMode: 'full_proxy',
  })
  const context = { URL, Headers, Request, Response, addEventListener() {}, fetch() { throw new Error('fetch must not run') } }
  vm.createContext(context)
  vm.runInContext(source, context)
  const targetUrl = encodeURIComponent('https://script.google.com/wardeninit')
  const response = await context.handleRequest(new Request(`https://game.uploadx.my.id/backpack_jianghu?__gas_cors_proxy=${targetUrl}`, {
    method: 'OPTIONS', headers: { 'access-control-request-headers': 'content-type,x-custom' },
  }))

  assert.equal(response.status, 204)
  assert.equal(response.headers.get('access-control-allow-methods'), 'GET,HEAD,POST,OPTIONS')
  assert.equal(response.headers.get('access-control-allow-headers'), 'content-type,x-custom')
})
