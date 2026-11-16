// Usage: node tools/make-icon.mts | rsvg-convert -o plugin/.claude-plugin/icon.png
// The marketplace takes the listing icon only from the first save or submission; a later change does not reach it.
const SIZE = 1024
const BG = '#1c2230'
const LINE = '#8b95a7'
const LIVE = '#4f8ff7'
const DOT = 120
const GAP = 220
const LEFT = 232

const rows = [
  { isGone: false, width: 440 },
  { isGone: false, width: 300 },
  { isGone: true, width: 380 },
].map((row, i) => {
  const cy = SIZE / 2 + (i - 1) * GAP
  const cx = LEFT + DOT / 2
  const dot = row.isGone
    ? `<circle cx="${cx}" cy="${cy}" r="${DOT / 2 - 8}" fill="none" stroke="${LINE}" stroke-width="16" stroke-dasharray="34 26" stroke-linecap="round" opacity="0.7"/>`
    : `<circle cx="${cx}" cy="${cy}" r="${DOT / 2}" fill="${LIVE}"/>`
  const line = `<rect x="${LEFT + DOT + 60}" y="${cy - 16}" width="${row.width}" height="32" rx="16" fill="${LINE}"${row.isGone ? ' opacity="0.4"' : ''}/>`
  return `${dot}\n${line}`
})

process.stdout.write(`<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
<rect width="${SIZE}" height="${SIZE}" fill="${BG}"/>
${rows.join('\n')}
</svg>
`)
