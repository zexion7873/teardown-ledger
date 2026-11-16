// The pane as the mod draws it, redrawn by hand: the mod's own tree needs the engine, which node does not have.
// Change the pane's rows or button labels in plugin/hooks/register.tsx and this follows by hand.
export const COLOR = {
  bg: '#1c2230',
  panel: '#232a3a',
  text: '#e6e9ee',
  dim: '#8b95a7',
  button: '#323c50',
  accent: '#5b8fe0',
} as const

export const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif"
export const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
export const TITLE = 'Teardown ledger'
export const PANE = { width: 320, height: 420 } as const

export const ENTRIES = [
  { handle: 'npm run dev -- --port 5173', from: 'process · /repo', check: 'lsof -i :5173' },
  { handle: 'probe', from: 'tmux session · /repo', check: "tmux has-session -t 'probe'" },
  { handle: '/tmp/qa-run', from: 'temp folder · /repo · 2d ago', check: "ls -d '/tmp/qa-run'" },
] as const

const button = (x: number, y: number, width: number, label: string) =>
  `<rect x="${x}" y="${y}" width="${width}" height="26" rx="6" fill="${COLOR.button}"/>
<text x="${x + width / 2}" y="${y + 18}" font-size="13" text-anchor="middle" fill="${COLOR.text}">${label}</text>`

export const pane = () => {
  const parts = [
    `<rect width="${PANE.width}" height="${PANE.height}" rx="12" fill="${COLOR.panel}"/>`,
    `<text x="20" y="34" font-size="15" font-weight="700" fill="${COLOR.dim}">${TITLE}</text>`,
  ]
  let y = 68
  for (const entry of ENTRIES) {
    parts.push(
      `<text x="20" y="${y}" font-size="15" fill="${COLOR.text}">${entry.handle}</text>`,
      `<text x="20" y="${y + 20}" font-size="13" fill="${COLOR.dim}">${entry.from}</text>`,
      `<text x="20" y="${y + 40}" font-size="13" font-family="${MONO}" fill="${COLOR.dim}">${entry.check}</text>`,
      button(20, y + 52, 96, 'Copy check'),
      button(124, y + 52, 70, 'Dismiss'),
    )
    y += 104
  }
  parts.push(button(20, y - 2, 88, 'Dismiss all'))
  return parts.join('\n')
}
