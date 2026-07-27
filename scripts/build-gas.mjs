import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const dist = resolve(root, 'dist')
const source = await readFile(resolve(dist, 'index.html'), 'utf8')
const jsPath = source.match(/<script type="module"[^>]*src="([^"]+)"/)?.[1]
const cssPath = source.match(/<link rel="stylesheet"[^>]*href="([^"]+)"/)?.[1]

if (!jsPath || !cssPath) throw new Error('Vite assets tidak ditemukan di dist/index.html')

const [js, css] = await Promise.all([
  readFile(resolve(dist, jsPath.replace(/^\//, '')), 'utf8'),
  readFile(resolve(dist, cssPath.replace(/^\//, '')), 'utf8'),
])

const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GAS Configtor</title>
  <style>\n${css}\n</style>
</head>
<body>
  <div id="app"></div>
  <script type="module">\n${js}\n</script>
</body>
</html>
`

if (html.includes('</script>>') || html.includes('</style>>')) {
  throw new Error('Inline build mengandung tag artifact')
}
await writeFile(resolve(root, 'gas/index.html'), html)
console.log(`gas/index.html generated (${Buffer.byteLength(html)} bytes)`)
