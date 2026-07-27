import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
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
  const context = {
    URL, Headers, Request, Response,
    addEventListener() {},
    async fetch(url) {
      target = String(url)
      return upstream
    },
  }
  vm.createContext(context)
  vm.runInContext(source, context)
  const response = await context.handleRequest(new Request(incomingUrl))
  return { target, response }
}

async function capturedTarget(route, incomingUrl) {
  return (await runWorker(route, incomingUrl)).target
}

test('proxy keeps exact GAS /exec URL when stripped path has no suffix', async () => {
  const target = await capturedTarget({
    hostname: 'game.uploadx.my.id',
    pathPrefix: '/backpack_jianghu',
    targetUrl: 'https://script.google.com/macros/s/deployment/exec',
    stripPrefix: true,
  }, 'https://game.uploadx.my.id/backpack_jianghu')

  assert.equal(target, 'https://script.google.com/macros/s/deployment/exec')
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

test('proxy injects Google base URL so root-relative runtime assets stay on Google', async () => {
  const html = '<html><head><link href="/static/macros/client/app.css"></head><body></body></html>'
  const upstream = new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } })
  const { response } = await runWorker({
    hostname: 'game.uploadx.my.id',
    pathPrefix: '/backpack_jianghu',
    targetUrl: 'https://script.google.com/macros/s/deployment/exec',
    stripPrefix: true,
  }, 'https://game.uploadx.my.id/backpack_jianghu', upstream)

  const body = await response.text()
  assert.match(body, /<base href="https:\/\/script\.google\.com\/">/)
})
