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
