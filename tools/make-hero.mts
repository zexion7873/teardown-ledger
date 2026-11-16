// Usage: node tools/make-hero.mts > docs/hero.svg
// The README's width= must match W; nothing checks that.
import { COLOR, ENTRIES, MONO, PANE, SANS, pane } from './pane.mts'

const W = 760
const H = PANE.height + 48
const LEFT = 28
const COLUMN = 356
const BAND = H - 24 - 100

const calls = [
  'npm run dev -- --port 5173 &amp;',
  'tmux new-session -d -s probe',
  'mkdir -p /tmp/qa-run',
].map(
  (command, i) => `<text x="${LEFT}" y="${52 + i * 26}" font-size="13" font-family="${MONO}"><tspan fill="${COLOR.accent}">●</tspan><tspan dx="8" fill="${COLOR.dim}">Bash(</tspan><tspan fill="${COLOR.text}">${command}</tspan><tspan fill="${COLOR.dim}">)</tspan></text>`,
)

process.stdout.write(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${SANS}">
<rect width="${W}" height="${H}" rx="14" fill="${COLOR.bg}"/>
${calls.join('\n')}
<text x="${LEFT}" y="${52 + calls.length * 26 + 22}" font-size="15" fill="${COLOR.text}">The page renders. Done.</text>
<rect x="${LEFT}" y="${BAND}" width="${COLUMN}" height="100" rx="12" fill="${COLOR.panel}"/>
<text x="${LEFT + 18}" y="${BAND + 32}" font-size="15">🧹</text>
<text x="${LEFT + 44}" y="${BAND + 32}" font-size="15" fill="${COLOR.text}">Teardown ${ENTRIES.length}</text>
<rect x="${LEFT + 14}" y="${BAND + 50}" width="${COLUMN - 28}" height="36" rx="8" fill="${COLOR.bg}"/>
<text x="${LEFT + 28}" y="${BAND + 73}" font-size="14" fill="${COLOR.dim}">Reply…</text>
<g transform="translate(${W - PANE.width - LEFT} 24)">
${pane()}
</g>
</svg>
`)
