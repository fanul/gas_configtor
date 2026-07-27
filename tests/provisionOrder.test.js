import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('provision attaches dummy DNS only after Worker script and route exist', async () => {
  const source = await readFile(new URL('../gas/CloudflareApi.gs', import.meta.url), 'utf8')
  const body = source.slice(
    source.indexOf('function provisionCloudflareRoute'),
    source.indexOf('function runProvisionStep_'),
  )

  assert.ok(body.indexOf("'upload Worker ") < body.indexOf("'Worker Route "))
  assert.ok(body.indexOf("'Worker Route ") < body.indexOf("'DNS record untuk "))
})