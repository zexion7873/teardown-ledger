# teardown-ledger

**Status: a shell. The mod loads and does nothing yet.** Nothing below is
implemented; it is what the mod is for.

A Claude Code mod that keeps a ledger of what a session spawned and has not yet
shown to be gone.

An agent that runs a dev server, opens a tmux session or makes a temp folder
during a check is supposed to tear it down afterwards, and to show that it is
gone rather than say that it killed it. Today that rests on the agent
remembering. teardown-ledger is meant to watch the session's shell commands,
record each process, port and temp folder they create, and clear an entry only
when a later command's output shows its absence:

- a count above the prompt while something is unsettled
- a pane listing each unsettled thing and the command that made it

It is a reminder, not a guarantee: commands are matched by their text, so some
spawns will be missed and an empty ledger does not prove a clean machine. It
never runs, blocks or rewrites a command, and it makes no model calls and no
network requests.

## Requirements

A Claude Code build with function-hook plugins; CI validates and tests against
2.1.325.

## License

MIT
