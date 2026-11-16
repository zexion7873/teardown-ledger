export type Entry = {
  id: string
  at: number
  cwd: string
  kind: 'process' | 'tmux' | 'dir'
  handle: string
  pid?: string
  port?: string
  isAgent?: true
}

declare module 'claude-code' {
  interface PluginState {
    'teardown-ledger': { tick: Shaped<number>; armed: Shaped<boolean> }
  }
}
