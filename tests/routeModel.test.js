import test from 'node:test'
import assert from 'node:assert/strict'
import { emptyRoute, normalizeCloudflareConfig, normalizeRouteInput, upsertRoute, removeRoute } from '../src/services/cloudflare/routeModel.js'

test('emptyRoute creates an independent editable draft', () => {
  const first = emptyRoute('zone-1')
  const second = emptyRoute('zone-1')
  assert.equal(first.zoneId, 'zone-1')
  assert.equal(first.pathPrefix, '/')
  assert.equal(first.deliveryMode, 'redirect')
  assert.equal(first.faviconDataUrl, '')
  assert.equal(first.status, 'draft')
  assert.notEqual(first.id, second.id)
})

test('normalizeRouteInput splits hostname and path and sanitizes worker name', () => {
  const route = normalizeRouteInput({
    hostname: 'game.uploadx.my.id/backpack_jianghu',
    pathPrefix: '/',
    workerName: 'gas-game-uploadx-backpack_jianghu',
  })
  assert.equal(route.hostname, 'game.uploadx.my.id')
  assert.equal(route.pathPrefix, '/backpack_jianghu')
  assert.equal(route.workerName, 'gas-game-uploadx-backpack-jianghu')
  assert.equal(route.deliveryMode, 'redirect')
})

test('normalizeRouteInput preserves only the supported full proxy mode', () => {
  assert.equal(normalizeRouteInput({ deliveryMode: 'full_proxy' }).deliveryMode, 'full_proxy')
  assert.equal(normalizeRouteInput({ deliveryMode: 'unknown' }).deliveryMode, 'redirect')
})

test('normalizeRouteInput forces Workspace-scoped GAS to redirect mode', () => {
  assert.equal(normalizeRouteInput({
    targetUrl: 'https://script.google.com/a/macros/example.org/s/deployment/exec',
    deliveryMode: 'full_proxy',
  }).deliveryMode, 'redirect')
})

test('normalizeCloudflareConfig trims copied identifiers and token', () => {
  const config = normalizeCloudflareConfig({
    accountId: ' 1a7341a5191b0985189879190307e821 ',
    zoneId: '\nzone-id\t',
    apiToken: ' token-value\n',
  })
  assert.equal(config.accountId, '1a7341a5191b0985189879190307e821')
  assert.equal(config.zoneId, 'zone-id')
  assert.equal(config.apiToken, 'token-value')
})

test('upsertRoute adds multiple routes and updates one by id', () => {
  let routes = []
  routes = upsertRoute(routes, { id: 'a', hostname: 'a.example.com' })
  routes = upsertRoute(routes, { id: 'b', hostname: 'b.example.com' })
  routes = upsertRoute(routes, { id: 'a', hostname: 'updated.example.com' })
  assert.equal(routes.length, 2)
  assert.equal(routes.find((item) => item.id === 'a').hostname, 'updated.example.com')
})

test('removeRoute removes only selected route', () => {
  const routes = [{ id: 'a' }, { id: 'b' }]
  assert.deepEqual(removeRoute(routes, 'a'), [{ id: 'b' }])
})
