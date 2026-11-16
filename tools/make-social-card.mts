// Usage: node tools/make-social-card.mts | rsvg-convert -o docs/social-card.png
// The text is plugin.json's description, so editing it stales the card.
// GitHub has no API for the social preview: the PNG is uploaded by hand at Settings → General → Social preview.
import { readFileSync } from 'node:fs'

import { COLOR, PANE, SANS, pane } from './pane.mts'

const plugin = JSON.parse(readFileSync(new URL('../plugin/.claude-plugin/plugin.json', import.meta.url), 'utf8'))
const [tagline, accent] = (plugin.description as string).split(': ')
if (accent === undefined) throw new Error('plugin.json description no longer reads "<tagline>: <accent>"')

const W = 1280
const H = 640
const SCALE = 1.4
const WRAP = 40

const lines: string[] = []
for (const word of tagline.split(' ')) {
  const last = lines.at(-1)
  if (last !== undefined && `${last} ${word}`.length <= WRAP) lines[lines.length - 1] = `${last} ${word}`
  else lines.push(word)
}
const text = lines.map((line, i) => `<text x="96" y="${298 + i * 42}" font-size="30" fill="#b8bec9">${line}</text>`)
const below = 298 + lines.length * 42

process.stdout.write(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${SANS}">
<rect width="${W}" height="${H}" fill="${COLOR.bg}"/>
<text x="96" y="220" font-size="72" font-weight="700" fill="#f0f2f5">teardown-ledger</text>
${text.join('\n')}
<text x="96" y="${below + 10}" font-size="30" font-weight="700" fill="${COLOR.accent}">${accent}</text>
<text x="96" y="${below + 64}" font-size="23" fill="#7d8592">Desktop and terminal. No network, no model calls.</text>
<g transform="translate(${W - PANE.width * SCALE - 72} ${(H - PANE.height * SCALE) / 2}) scale(${SCALE})">
${pane()}
</g>
</svg>
`)
