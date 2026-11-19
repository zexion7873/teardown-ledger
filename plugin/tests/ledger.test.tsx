import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

const BAND = {
  plugin: 'teardown-ledger',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isCollapsed: false,
    isWorking: false,
    maxRows: 3,
    bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 3 },
    view: {},
  },
} as const

const PANE = {
  plugin: 'teardown-ledger',
  component: 'Pane',
  requestId: 'teardown',
  props: {
    title: 'Teardown ledger',
    isFocused: false,
    bodyColumns: 40,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
} as const

const DAY = 86_400_000

type Ran = { out?: string; fail?: string; deny?: string }
type Bash = { tool: 'Bash'; command: string; run_in_background?: boolean; agentId?: string }

// `$.tool.call` is typed over every MCP tool connected where the mod last loaded; after a desktop session that is too deep for tsc.
const call = ($: { tool: { call: unknown } }, input: Bash) => ($.tool.call as (input: Bash) => Promise<unknown>)(input)

const engine = (on: On, entries: readonly object[] = [], now = 0, hasBeneath = true) => {
  const runs = new Map<string, Ran>()
  mock.store(on, { entries })
  mock.clock(on, { now })
  on('session.cwd', () => ({ value: '/repo' }))
  on('command.register', () => ({ value: { command: 'teardown' } }))
  const ui = { calls: [] as string[], isShown: undefined as boolean | undefined }
  on('ui.open', (_, e) => {
    ui.calls.push(`open ${e.id}`)
    return { value: { isPlaced: true } }
  })
  on('ui.close', (_, e) => {
    ui.calls.push(`close ${e.id}`)
    return { value: undefined }
  })
  on('ui.panes', () => ({
    value: ui.isShown === undefined ? [] : [{ id: 'teardown', title: 'Teardown ledger', isShown: ui.isShown, isFocused: false, isPlaced: true }],
  }))
  on('tool.call', (_, e) => {
    const ran = runs.get(e.tool === 'Bash' ? e.command : '') ?? {}
    if (ran.deny !== undefined) return { deny: ran.deny }
    if (ran.fail !== undefined) return { result: ran.fail, text: ran.fail, isError: true as const }
    return { result: { stdout: ran.out ?? '', stderr: '', interrupted: false } }
  })
  if (hasBeneath)
    on('ui.render', ($, e) => {
      const { Box, Text } = $.ui.resolve(e)
      return Box({ children: Text({ children: 'beneath' }) })
    })
  const sh = (command: string, ran: Ran = {}) => {
    runs.set(command, ran)
    return { tool: 'Bash', command } as const
  }
  return Object.assign(sh, { ui })
}

const shown = async (pane: { findAll: (query: object) => Promise<readonly { type: string; text: string }[]> }) =>
  (await pane.findAll({ type: 'Text' })).map(e => e.text)

const SEEDED = [
  { id: 'a', at: 0, cwd: '/repo', kind: 'process', handle: 'node server.js', pid: '4242' },
  { id: 'b', at: 0, cwd: '/repo', kind: 'process', handle: 'npm run dev', port: '5173' },
  { id: 'c', at: 0, cwd: '/repo', kind: 'process', handle: 'npm run watch' },
  { id: 'd', at: 0, cwd: '/repo', kind: 'tmux', handle: 'probe' },
  { id: 'e', at: 0, cwd: '/repo', kind: 'dir', handle: '/tmp/qa-run' },
] as const

test('with nothing unsettled the band is only what is beneath', async ($, on) => {
  engine(on)

  for (const surface of ['terminal', 'desktop'] as const) {
    const band = await $.ui.mount({ ...BAND, surface })
    expect((await band.findAll({ type: 'Text' })).map(t => t.text)).toEqual(['beneath'])
    await band.unmount()
  }
})

test('what a command leaves running or lying around lands in the band count and the pane, with the check that settles it', async ($, on) => {
  const sh = engine(on)
  await call($, sh('npm run dev -- --port 5173 > /tmp/dev.log 2>&1 &'))
  await call($, sh('tmux new-session -d -s probe "claude"'))
  await call($, sh('mkdir -p /tmp/qa-run/out'))
  await call($, sh('d=$(mktemp -d /tmp/probe.XXXXXX); echo "$d"', { out: '/tmp/probe.a1B2c3' }))
  await call($, sh('node server.js & echo $!', { out: '4242' }))
  await call($, { ...sh('cd web && npm run watch'), run_in_background: true })

  for (const surface of ['terminal', 'desktop'] as const) {
    const band = await $.ui.mount({ ...BAND, surface })
    expect((await band.find({ key: 'teardown' }))?.props.label).toBe('🧹 Teardown 6')
    expect(await band.find({ type: 'Text', text: /^beneath$/ })).toBeDefined()
    await band.unmount()

    const pane = await $.ui.mount({ ...PANE, surface })
    expect(await shown(pane)).toEqual([
      'npm run dev -- --port 5173',
      'process · /repo',
      'lsof -i :5173',
      'probe',
      'tmux session · /repo',
      "tmux has-session -t 'probe'",
      '/tmp/qa-run/out',
      'temp folder · /repo',
      "ls -d '/tmp/qa-run/out'",
      '/tmp/probe.a1B2c3',
      'temp folder · /repo',
      "ls -d '/tmp/probe.a1B2c3'",
      'node server.js',
      'process · /repo',
      'ps -p 4242',
      'npm run watch',
      'process · /repo',
      "pgrep -f 'npm run watch'",
    ])
    await pane.unmount()
  }
})

test('killing or removing settles nothing, nor does a check that still finds it; the absence check’s own output does', async ($, on) => {
  const sh = engine(on, SEEDED)
  const count = async () => {
    const band = await $.ui.mount({ ...BAND, surface: 'desktop' })
    const label = (await band.find({ key: 'teardown' }))?.props.label
    await band.unmount()
    return label
  }

  await call($, sh('kill 4242'))
  await call($, sh('pkill -f "npm run"'))
  await call($, sh('tmux kill-session -t probe'))
  await call($, sh('rm -r /tmp/qa-run'))
  expect(await count()).toBe('🧹 Teardown 5')

  await call($, sh('ps -p 4242', { out: '  PID TTY           TIME CMD\n 4242 ttys001    0:00.10 node server.js' }))
  await call($, sh('lsof -i :5173', { out: 'COMMAND  PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME\nnode    4242 kevin  21u  IPv6    0x1      0t0  TCP *:5173 (LISTEN)' }))
  await call($, sh("pgrep -f 'npm run watch'", { out: '4301' }))
  await call($, sh('tmux has-session -t probe'))
  await call($, sh('tmux ls', { out: 'probe: 1 windows (created Mon Nov 16 15:00:00 2026)' }))
  await call($, sh('ls -d /tmp/qa-run', { out: '/tmp/qa-run' }))
  expect(await count()).toBe('🧹 Teardown 5')

  await call($, sh('ps -p 4242', { fail: 'Exit code 1\n  PID TTY           TIME CMD' }))
  expect(await count()).toBe('🧹 Teardown 4')
  await call($, sh('lsof -i :5173', { fail: 'Exit code 1' }))
  expect(await count()).toBe('🧹 Teardown 3')
  await call($, sh("pgrep -fl 'npm run watch'", { fail: 'Exit code 1' }))
  expect(await count()).toBe('🧹 Teardown 2')
  await call($, sh('tmux has-session -t probe', { fail: "Exit code 1\ncan't find session: probe" }))
  expect(await count()).toBe('🧹 Teardown 1')
  await call($, sh('ls -d /private/tmp/qa-run', { fail: 'Exit code 1\nls: /private/tmp/qa-run: No such file or directory' }))
  expect(await count()).toBeUndefined()
})

test('a silent check that could have been skipped, piped away, redirected or never run is no receipt', async ($, on) => {
  const sh = engine(on, [SEEDED[2]])
  const pane = await $.ui.mount({ ...PANE, surface: 'desktop' })

  await call($, sh("cd /nowhere && pgrep -f 'npm run watch'", { fail: 'Exit code 1\ncd: no such file or directory: /nowhere' }))
  await call($, sh("pgrep -f 'npm run watch' | wc -l", { out: '0' }))
  await call($, sh("pgrep -f 'npm run watch' > /dev/null", { fail: 'Exit code 1' }))
  await call($, sh("pgrep 'npm run watch'", { fail: 'Exit code 1' }))
  await call($, sh("pgrep -f 'npm run watch'", { fail: 'The user doesn’t want to proceed with this tool use.' }))
  await call($, sh("pgrep -f 'npm run watch'", { deny: 'blocked by a guard' }))
  expect((await shown(pane))[0]).toBe('npm run watch')

  await call($, sh("pkill -f 'npm run watch'; sleep 1; pgrep -f 'npm run watch' || echo gone", { out: 'gone' }))
  expect(await shown(pane)).toEqual(['Nothing unsettled.'])
  await pane.unmount()
})

test('a command that mentions a temp path, quotes an ampersand, waits for its jobs or never ran records nothing', async ($, on) => {
  const sh = engine(on)
  await call($, sh('ls /tmp'))
  await call($, sh('cat /tmp/dev.log'))
  await call($, sh('echo "a & b"'))
  await call($, sh('curl -s "http://localhost:3000/a?x=1&y=2"'))
  await call($, sh('npm test && echo ok'))
  await call($, sh('npm test > /tmp/out.log 2>&1'))
  await call($, sh('npm test &> /tmp/out.log'))
  await call($, sh('npm run lint & npm run types & wait'))
  await call($, sh('mkdir -p build/tmp "$d/sub"'))
  await call($, sh('tmux new-session -d'))
  await call($, sh('d=$(mktemp -d)'))
  await call($, sh('sleep 600 &', { fail: 'The user doesn’t want to proceed with this tool use.' }))
  await call($, sh('sleep 601 &', { deny: 'blocked by a guard' }))

  const band = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await band.find({ key: 'teardown' })).toBeUndefined()
  await band.unmount()
})

test('an ampersand in a heredoc’s body starts no job; one after the heredoc does', async ($, on) => {
  const sh = engine(on)
  await call($, sh("python3 - <<'EOF'\ncommon = set(a) & set(b)\nprint(len(common))\nEOF"))
  await call($, sh('cd /repo && python3 -I - "$T/x" <<EOF\n    hit=sorted(seen & wip)\nEOF'))

  const band = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await band.find({ key: 'teardown' })).toBeUndefined()
  await band.unmount()

  await call($, sh("cat > notes.txt <<-'END'\n\ta & b\n\tEND\nnode server.js &"))
  const pane = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await shown(pane)).toEqual(['node server.js', 'process · /repo', "pgrep -f 'node server\\.js'"])
  await pane.unmount()
})

test('a background command is named by its first part that runs something, not by a variable it sets', async ($, on) => {
  const sh = engine(on)
  await call($, { ...sh('T=/tmp/work; cd $T && python3 runner.py last'), run_in_background: true })

  const pane = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await shown(pane)).toEqual(['python3 runner.py last', 'process · /repo', "pgrep -f 'python3 runner\\.py last'"])
  await pane.unmount()
})

test('a spawn is kept when a later part of its command failed, once however often it is seen, and marked when a subagent made it', async ($, on) => {
  const sh = engine(on)
  await call($, sh('npm run dev & sleep 2; curl -sf localhost:5173', { fail: 'Exit code 7' }))
  await call($, sh('npm run dev &'))
  await call($, { ...sh('sleep 600 &'), agentId: 'agent-1' })

  const pane = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await shown(pane)).toEqual([
    'npm run dev',
    'process · /repo',
    "pgrep -f 'npm run dev'",
    'sleep 600',
    'process · /repo · subagent',
    "pgrep -f 'sleep 600'",
  ])
  await pane.unmount()
})

test('a check settles what its own command made only when it comes after it', async ($, on) => {
  const sh = engine(on)
  await call($,
    sh('mkdir /tmp/qa-x && npm test; rm -r /tmp/qa-x; ls -d /tmp/qa-x', {
      fail: 'Exit code 1\nls: /tmp/qa-x: No such file or directory',
    }),
  )
  const pane = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await shown(pane)).toEqual(['Nothing unsettled.'])

  await call($, sh("pgrep -f 'sleep 600'; sleep 600 &", { fail: 'Exit code 1' }))
  expect((await shown(pane))[0]).toBe('sleep 600')
  await pane.unmount()
})

test('a folder shown gone takes what was made under it; a tmux listing without the session settles it', async ($, on) => {
  const sh = engine(on, [
    { id: 'a', at: 0, cwd: '/repo', kind: 'dir', handle: '/tmp/qa-run/out' },
    { id: 'b', at: 0, cwd: '/repo', kind: 'dir', handle: '/tmp/qa-runner' },
    { id: 'c', at: 0, cwd: '/repo', kind: 'tmux', handle: 'probe' },
    { id: 'd', at: 0, cwd: '/repo', kind: 'tmux', handle: 'keep' },
  ])
  await call($, sh('ls /tmp/qa-run', { fail: 'Exit code 1\nls: /tmp/qa-run: No such file or directory' }))
  await call($, sh('tmux ls', { out: 'keep: 1 windows (created Mon Nov 16 15:00:00 2026)' }))

  const pane = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await shown(pane)).filter((_, i) => i % 3 === 0)).toEqual(['/tmp/qa-runner', 'keep'])
  await pane.unmount()
})

test('the ledger is the machine’s: another folder’s entry shows with where and how long ago, and Dismiss removes it for good', async ($, on) => {
  engine(
    on,
    [
      { id: 'a', at: 0, cwd: '/elsewhere', kind: 'process', handle: 'npm run dev', port: '5173' },
      { id: 'b', at: 3 * DAY, cwd: '/repo', kind: 'tmux', handle: 'probe' },
    ],
    3 * DAY + 1000,
  )

  const pane = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await shown(pane)).toEqual([
    'npm run dev',
    'process · /elsewhere · 3d ago',
    'lsof -i :5173',
    'probe',
    'tmux session · /repo',
    "tmux has-session -t 'probe'",
  ])
  await pane.press({ key: 'dismiss-a' })
  expect((await shown(pane))[0]).toBe('probe')
  await pane.unmount()

  const band = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await band.find({ key: 'teardown' }))?.props.label).toBe('🧹 Teardown 1')
  await band.unmount()
})

test('with only core’s own drawing beneath, the count gets a Box of its own under it and nothing is laid in a row', async ($, on) => {
  engine(on, [SEEDED[3]], 0, false)

  for (const surface of ['terminal', 'desktop'] as const) {
    const band = await $.ui.mount({ ...BAND, surface })
    expect((await band.findAll({})).map(e => `${e.type} ${e.props.flexDirection ?? ''}`)).toEqual(['Box column', 'engine ', 'Box ', 'Button '])
    await band.unmount()
  }
})

// The harness's own hooks draw as a mod named `test`, whose row is the `beneath` Box.
test('the row option puts the count on the named mod’s row, beside what is there, and draws no row of its own', { options: { row: 'test' } }, async ($, on) => {
  engine(on, [SEEDED[3]])

  for (const surface of ['terminal', 'desktop'] as const) {
    const band = await $.ui.mount({ ...BAND, surface })
    expect((await band.findAll({})).map(e => `${e.type} ${e.text}`)).toEqual([
      'Box beneath🧹 Teardown 1',
      'Box beneath',
      'Text beneath',
      'Button 🧹 Teardown 1',
    ])
    await band.unmount()
  }

  const pane = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await pane.press({ key: 'dismiss-d' })
  await pane.unmount()

  const band = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await band.find({ key: 'teardown' })).toBeUndefined()
  expect((await band.findAll({ type: 'Text' })).map(t => t.text)).toEqual(['beneath'])
  await band.unmount()
})

test('the count brings its pane forward: one open behind another tab is closed and opened again, any other is only opened', async ($, on) => {
  const { ui } = engine(on, [SEEDED[3]])
  const band = await $.ui.mount({ ...BAND, surface: 'desktop' })

  await band.press({ key: 'teardown' })
  expect(ui.calls).toEqual(['open teardown'])

  ui.isShown = true
  await band.press({ key: 'teardown' })
  expect(ui.calls).toEqual(['open teardown', 'open teardown'])

  ui.isShown = false
  await band.press({ key: 'teardown' })
  expect(ui.calls).toEqual(['open teardown', 'open teardown', 'close teardown', 'open teardown'])
  await band.unmount()
})

test('Dismiss all asks once, Keep backs out, and the second press empties the ledger', async ($, on) => {
  engine(on, SEEDED.slice(0, 2))

  const pane = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await pane.find({ key: 'clear' }))?.props.label).toBe('Dismiss all')
  expect(await pane.find({ key: 'keep' })).toBeUndefined()

  await pane.press({ key: 'clear' })
  expect((await pane.find({ key: 'clear' }))?.props.label).toBe('Dismiss all 2?')

  await pane.press({ key: 'keep' })
  expect((await pane.find({ key: 'clear' }))?.props.label).toBe('Dismiss all')

  await pane.press({ key: 'clear' })
  await pane.press({ key: 'dismiss-a' })
  expect((await pane.find({ key: 'clear' }))?.props.label).toBe('Dismiss all')
  expect((await shown(pane))[0]).toBe('npm run dev')

  await pane.press({ key: 'clear' })
  await pane.press({ key: 'clear' })
  expect(await shown(pane)).toEqual(['Nothing unsettled.'])
  expect(await pane.find({ key: 'clear' })).toBeUndefined()
  await pane.unmount()
})
