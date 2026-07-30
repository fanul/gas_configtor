import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('provision attaches dummy DNS only after Worker script and route exist', async () => {
  const source = await readFile(new URL('../gas/CloudflareApi.gs', import.meta.url), 'utf8')
  const body = source.slice(
    source.indexOf('function provisionRoute('),
    source.indexOf('function deleteRoute('),
  )

  assert.ok(body.indexOf("runProvisionStep_('Worker Script ") < body.indexOf("runProvisionStep_('Worker Route "))
  assert.ok(body.indexOf("runProvisionStep_('Worker Route ") < body.indexOf("runProvisionStep_('DNS record untuk "))
  assert.ok(body.indexOf("runProvisionStep_('DNS record untuk ") < body.indexOf("runProvisionStep_('Smoke Test "))
})

test('provision creates a root favicon Worker route', async () => {
  const source = await readFile(new URL('../gas/CloudflareApi.gs', import.meta.url), 'utf8')
  assert.match(source, /faviconPattern:\s*hostname\s*\+\s*'\/favicon\.ico'/)
  assert.match(source, /faviconCloudflareRouteId/)
})

test('store preserves the provision result envelope used by the route form', async () => {
  const source = await readFile(new URL('../src/stores/modules/cloudflareStore.js', import.meta.url), 'utf8')
  const body = source.slice(source.indexOf('async function provisionRoute('), source.indexOf('async function saveRouteDraft('))

  assert.match(body, /return result\s/)
  assert.doesNotMatch(body, /return result\.route/)
})

test('provision surfaces the failing Cloudflare step instead of reading undefined result', async () => {
  const source = await readFile(new URL('../gas/CloudflareApi.gs', import.meta.url), 'utf8')
  const body = source.slice(source.indexOf('function runProvisionStep_('), source.indexOf('function provisionRoute('))

  assert.match(body, /throw new Error\('Provision gagal pada tahap/)
  assert.doesNotMatch(body, /ok:\s*false/)
})

test('GAS normalization preserves pathPrefix required by the Worker and favicon handler', async () => {
  const source = await readFile(new URL('../gas/CloudflareApi.gs', import.meta.url), 'utf8')

  assert.match(source, /source\.pathPrefix \|\| source\.pathPattern/)
  assert.match(source, /pathPrefix: pathPrefix/)
  assert.match(source, /Target URL HTTPS wajib diisi/)
})

test('Cloudflare store only calls implemented service methods or gasBridge', async () => {
  const source = await readFile(new URL('../src/stores/modules/cloudflareStore.js', import.meta.url), 'utf8')

  assert.doesNotMatch(source, /service\.value\.(verifyCloudflare|fetchCloudflareResources|callGas)/)
})

test('provision smoke-tests route and optional favicon before saving success', async () => {
  const source = await readFile(new URL('../gas/CloudflareApi.gs', import.meta.url), 'utf8')
  const smoke = source.slice(source.indexOf('function smokeTestRoute_('), source.indexOf('function provisionRoute('))

  assert.match(smoke, /route\.hostname \+ route\.pathPrefix/)
  assert.match(smoke, /favicon\.ico/)
  assert.match(smoke, /status >= 500/)
})
