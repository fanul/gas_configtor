import test from 'node:test'
import assert from 'node:assert/strict'
import { emptyRoute, normalizeRouteInput, upsertRoute, removeRoute } from '../src/services/cloudflare/routeModel.js'

test('emptyRoute creates an independent editable draft', () => {
  const first = emptyRoute('zone-1')
  const second = emptyRoute('zone-1')
  assert.equal(first.zoneId, 'zone-1')
  assert.equal(first.pathPrefix, '/')
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
