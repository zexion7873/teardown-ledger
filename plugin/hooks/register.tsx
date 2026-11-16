import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Entry } from '../types'

type Thing = Pick<Entry, 'kind' | 'handle' | 'pid' | 'port'>
type Part = { text: string; before: string; after: string }
type Draft = Thing & { part: number }
type Receipt = { part: number; clears: (x: Thing) => boolean }

const PANE = 'teardown'
const TITLE = 'Teardown ledger'
const KEY = 'entries'
const DAY = 86_400_000
const KIND = { process: 'process', tmux: 'tmux session', dir: 'temp folder' } as const
const QUOTED = /'[^']*'|"(?:[^"\\]|\\.)*"/g
const PORT = /(?:--port[=\s]|\bPORT=|localhost:|127\.0\.0\.1:|0\.0\.0\.0:|http\.server\s)(\d{2,5})\b/
const TMP = /^(?:\/private)?\/tmp\/[^$*?`]+$/
const GONE = /can't find session|no server running|error connecting to/
const LSOF = /^(?:-[nPt]+|-[nPt]*i(?:(?:tcp|udp)?:\d+)?|(?:tcp|udp)?:\d+|-stcp:listen)$/i

// Only redraws the readers: the ledger is read from the store at each draw, because
// a desktop session starts in a spare folder and gets its real cwd afterwards.
const tick = atom({ plugin: 'teardown-ledger', key: 'tick' } as const, 0, { shape: 'tick-1' })
const armed = atom({ plugin: 'teardown-ledger', key: 'armed' } as const, false, { shape: 'armed-1' })

const mask = (s: string) => s.replace(QUOTED, q => '_'.repeat(q.length))

const split = (command: string): Part[] => {
  const parts: Part[] = []
  let from = 0
  let before = ''
  for (const m of mask(command).matchAll(/\d*>&\d*|&>|\|&|\|\||&&|[;\n|&]/g)) {
    if (m[0].includes('>')) continue
    parts.push({ text: command.slice(from, m.index).trim(), before, after: m[0] })
    from = m.index + m[0].length
    before = m[0]
  }
  parts.push({ text: command.slice(from).trim(), before, after: '' })
  return parts.filter(p => p.text !== '')
}

const words = (text: string) => (text.match(/'[^']*'|"[^"]*"|\S+/g) ?? []).map(w => w.replace(/^(['"])(.*)\1$/, '$2'))

const tidy = (text: string) =>
  text
    .replace(/\s(?:\d*>>?|&>)\s*\S+|\s\d*>&\d+/g, '')
    .replace(/^[({\s]+|[)}\s]+$/g, '')
    .replace(/^(?:(?:\w+=\S*|nohup|exec|setsid)\s+)+/, '')

// macOS spells one temp folder two ways.
const bare = (path: string) => path.replace(/^\/private(?=\/(?:tmp|var)\/)/, '').replace(/\/+$/, '')

const spawned = (command: string, parts: readonly Part[], isBackground: boolean, lines: readonly string[]): Draft[] => {
  const found: Draft[] = []
  const jobs: Draft[] = []
  const job = (p: Part, part: number) => {
    const port = PORT.exec(p.text)?.[1]
    jobs.push({ kind: 'process', handle: tidy(p.text), part, ...(port !== undefined && { port }) })
  }
  const isAwaited = parts.some(p => /^wait\b/.test(p.text))

  parts.forEach((p, part) => {
    const w = words(p.text)
    if (p.after === '&' && !isAwaited) job(p, part)
    if (w[0] === 'tmux' && (w.includes('new-session') || w.includes('new'))) {
      const name = w.includes('-s') ? w[w.indexOf('-s') + 1] : undefined
      if (name !== undefined && !name.includes('$')) found.push({ kind: 'tmux', handle: name, part })
    }
    if (w[0] === 'mkdir') {
      for (const arg of w.slice(1)) if (TMP.test(arg)) found.push({ kind: 'dir', handle: arg.replace(/\/+$/, ''), part })
    }
    if (/\bmktemp\b.*\s-\w*d\b/.test(p.text)) {
      const prefix = /(\/\S*?)X{3,}/.exec(p.text)?.[1]
      const isMade = (l: string) => (prefix === undefined ? /\/tmp\.\w+$/.test(l) : bare(l).startsWith(bare(prefix)))
      for (const l of lines) if (/^\/\S+$/.test(l) && isMade(l)) found.push({ kind: 'dir', handle: l, part })
    }
  })

  if (isBackground) {
    const part = parts.findIndex(p => !/^(?:cd|export|source|set|\.)\s/.test(p.text))
    const p = parts[part]
    if (p !== undefined) job(p, part)
  }
  const pid = command.includes('$!') ? lines.find(l => /^\d+$/.test(l)) : undefined
  const [only] = jobs
  if (only !== undefined && jobs.length === 1 && pid !== undefined) only.pid = pid
  return [...jobs, ...found]
}

const receipts = (parts: readonly Part[], lines: readonly string[]): Receipt[] => {
  const has = (re: RegExp) => lines.some(l => re.test(l))

  return parts.flatMap((p, part): Receipt[] => {
    const text = p.text.replace(/\s2>\s*(?:&1|\/dev\/null)/g, '')
    if (/[<>]/.test(mask(text)) || p.after === '|' || p.after === '|&') return []
    const w = words(text)
    const flags = w.slice(1).filter(x => x.startsWith('-'))
    const args = w.slice(1).filter(x => !x.startsWith('-'))
    // A check that prints nothing either way proves absence only where it must have run.
    const isSure = ['', ';', '\n', '&'].includes(p.before)

    if (w[0] === 'pgrep') {
      const [pattern] = args
      const isRead = args.length === 1 && flags.every(f => /^-[flai]+$/.test(f)) && flags.some(f => f.includes('f'))
      if (pattern === undefined || !isRead || !isSure || has(/^\d+(?:\s|$)|pgrep:/)) return []
      let re: RegExp
      try {
        re = new RegExp(pattern, flags.some(f => f.includes('i')) ? 'i' : '')
      } catch {
        return []
      }
      return [{ part, clears: x => x.kind === 'process' && re.test(x.handle) }]
    }
    if (w[0] === 'ps') {
      const pid = w.includes('-p') ? w[w.indexOf('-p') + 1] : undefined
      if (pid === undefined || !/^\d+$/.test(pid) || !has(/\bPID\b/) || has(new RegExp(`^${pid}\\b`))) return []
      return [{ part, clears: x => x.pid === pid }]
    }
    if (w[0] === 'lsof') {
      const port = w.map(x => /^(?:-[nPt]*i)?(?:tcp|udp)?:(\d+)$/i.exec(x)?.[1]).find(x => x !== undefined)
      const isRead = w.slice(1).every(x => LSOF.test(x)) && flags.some(f => /^-[nPt]*i/.test(f))
      if (port === undefined || !isRead || !isSure || has(/^COMMAND\b|^\d+$|lsof:/)) return []
      return [{ part, clears: x => x.port === port }]
    }
    if (w[0] === 'tmux' && (w[1] === 'has-session' || w[1] === 'has') && w[2] === '-t' && has(GONE)) {
      const name = w[3]?.replace(/^=|:$/g, '')
      return [{ part, clears: x => x.kind === 'tmux' && x.handle === name }]
    }
    if (w[0] === 'tmux' && w.length === 2 && (w[1] === 'ls' || w[1] === 'list-sessions')) {
      if (!has(/^[^\s:]+: \d+ windows/) && !has(GONE)) return []
      return [{ part, clears: x => x.kind === 'tmux' && !lines.some(l => l.startsWith(`${x.handle}:`)) }]
    }
    if (w[0] === 'ls' || w[0] === 'stat') {
      const missing = args.filter(a => has(new RegExp(`^(?:ls|stat): .*${a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*No such file or directory`)))
      return [{ part, clears: x => x.kind === 'dir' && missing.some(a => `${bare(x.handle)}/`.startsWith(`${bare(a)}/`)) }]
    }
    return []
  })
}

const check = (item: Entry) => {
  const quote = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`
  if (item.kind === 'tmux') return `tmux has-session -t ${quote(item.handle)}`
  if (item.kind === 'dir') return `ls -d ${quote(item.handle)}`
  if (item.pid !== undefined) return `ps -p ${item.pid}`
  if (item.port !== undefined) return `lsof -i :${item.port}`
  return `pgrep -f ${quote(item.handle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))}`
}

const load = async ($: EngineInterface): Promise<Entry[]> => {
  const stored = await $.store.get(KEY)
  return Array.isArray(stored) ? (stored as Entry[]) : []
}

// Tool calls of one turn run side by side, and each rewrites the whole list.
let queue: Promise<unknown> = Promise.resolve()

const change = ($: EngineInterface, fn: (list: Entry[]) => Entry[]) => {
  const work = async () => {
    await $.store.set(KEY, fn(await load($)))
    // A Dismiss all armed against one list must not fire on another.
    await update($, armed, () => false)
    await update($, tick, n => n + 1)
  }
  queue = queue.then(work, work)
  return queue
}

// Opening an open pane only retitles it: one behind another tab comes forward by being reopened.
const show = async ($: EngineInterface) => {
  const pane = (await $.ui.panes()).find(p => p.id === PANE)
  if (pane?.isShown === false) await $.ui.close({ id: PANE })
  await $.ui.open({ id: PANE, title: TITLE })
}

export const register: Register = (on, options) => {
  const row = (options.row as string).trim() || 'teardown-ledger'

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'teardown', description: 'Open the teardown ledger pane' })
    return next(e)
  })

  on('command.run', { command: 'teardown' }, async $ => {
    await show($)
    return { text: 'Teardown ledger opened.' }
  })

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny !== undefined) return ran
    // An errored call that never reached the shell printed nothing, and that silence is no receipt.
    if (ran.isError && !/^Exit code \d+/m.test(ran.text ?? '')) return ran

    const out = ran.isError ? (ran.text ?? '') : `${ran.result.stdout}\n${ran.result.stderr}`
    const lines = out.split('\n').map(l => l.trim())
    const parts = split(e.command)
    const isBackground = e.run_in_background === true || (!ran.isError && ran.result.backgroundTaskId !== undefined)
    const drafts = spawned(e.command, parts, isBackground, lines)
    const found = receipts(parts, lines)
    if (drafts.length === 0 && found.length === 0) return ran

    const at = await $.clock.now()
    const cwd = await $.session.cwd()
    const isSame = (a: Thing, b: Thing) => a.kind === b.kind && a.handle === b.handle
    await change($, list => [
      ...list.filter(o => !found.some(r => r.clears(o))),
      ...drafts
        .filter((d, i) => !list.some(o => isSame(o, d)) && drafts.findIndex(o => isSame(o, d)) === i)
        // A check clears what the same command made only when it comes after it.
        .filter(d => !found.some(r => r.part > d.part && r.clears(d)))
        .map(({ part, ...d }, i) => ({ ...d, id: `${at}-${i}`, at, cwd, ...(e.agentId !== undefined && { isAgent: true as const }) })),
    ])
    return ran
  })

  // The engine asks for one row per mod: naming another mod's row is the only way onto it.
  on('ui.render', { component: 'AbovePrompt', plugin: row }, async ($, e, next) => {
    const below = await next(e)
    await read($, tick)
    const list = await load($)
    if (e.props.hasSurvey || list.length === 0) return below

    const { Box, Button } = $.ui.resolve(e)
    return (
      <Box flexDirection="row" gap={2}>
        {below}
        <Button
          key="teardown"
          plain
          label={`🧹 Teardown ${list.length}`}
          onPress={() => {
            void show($)
          }}
        />
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    await read($, tick)
    const list = await load($)
    const now = await $.clock.now()
    const isArmed = await read($, armed)

    return (
      <Box flexDirection="column" gap={1}>
        {list.length === 0 && <Text dimColor>Nothing unsettled.</Text>}
        {list.map(item => {
          const days = Math.floor((now - item.at) / DAY)
          const settle = check(item)
          const from = [KIND[item.kind], item.cwd, item.isAgent && 'subagent', days >= 1 && `${days}d ago`]
          return (
            <Box flexDirection="column">
              <Text>{item.handle}</Text>
              <Text dimColor>{from.filter(Boolean).join(' · ')}</Text>
              <Text dimColor>{settle}</Text>
              <Box flexDirection="row" gap={1}>
                <Button
                  key={`copy-${item.id}`}
                  label="Copy check"
                  onPress={press => {
                    void $.ui.copy({ text: settle, surface: press.surface })
                  }}
                />
                <Button
                  key={`dismiss-${item.id}`}
                  label="Dismiss"
                  onPress={() => {
                    void change($, l => l.filter(o => o.id !== item.id))
                  }}
                />
              </Box>
            </Box>
          )
        })}
        {list.length > 0 && (
          <Box flexDirection="row" gap={1}>
            <Button
              key="clear"
              label={isArmed ? `Dismiss all ${list.length}?` : 'Dismiss all'}
              onPress={() => {
                void (isArmed ? change($, () => []) : update($, armed, () => true))
              }}
            />
            {isArmed && (
              <Button
                key="keep"
                label="Keep"
                onPress={() => {
                  void update($, armed, () => false)
                }}
              />
            )}
          </Box>
        )}
      </Box>
    )
  })
}
