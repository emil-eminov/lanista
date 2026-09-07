/**
 * Packs the built game into one self-contained HTML fragment for publishing.
 * The Google Fonts stylesheet stays a link: fonts.googleapis.com is the one
 * external host the artifact host allows.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const dist = process.env.LANISTA_DIST ?? join(homedir(), 'lanista-build', 'dist')
const out = process.argv[2] ?? join(dist, 'lanista.html')

const html = readFileSync(join(dist, 'index.html'), 'utf8')
const script = html.match(/src="([^"]+\.js)"/)
if (!script) throw new Error(`No script tag found in ${join(dist, 'index.html')}`)
const bundle = readFileSync(join(dist, script[1].replace(/^\.\//, '')), 'utf8').replaceAll('</script', '<\\/script')

const css = html.match(/href="([^"]+\.css)"/)
const styles = css ? readFileSync(join(dist, css[1].replace(/^\.\//, '')), 'utf8') : ''

writeFileSync(
  out,
  `<title>Lanista</title>
${styles ? `<style>${styles}</style>` : ''}
<script type="module">${bundle}</script>
`,
)
console.log(`${out}  ${(Buffer.byteLength(readFileSync(out)) / 1024).toFixed(0)} KB`)
