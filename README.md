# teardown-ledger

**Status: unpublished. It runs from a checkout: `claude --plugin-dir plugin`.**

A Claude Code mod that keeps a ledger of what a session's shell commands
spawned and have not yet been shown to be gone.

An agent that runs a dev server, opens a tmux session or makes a temp folder
during a check is supposed to tear it down afterwards, and to show that it is
gone rather than say that it killed it. teardown-ledger watches the Bash tool
calls of a session and its subagents, records what they leave behind, and
clears an entry only when a later command's own output shows its absence:

- a count above the prompt while something is unsettled
- a pane (`/teardown`) listing each unsettled thing, where it was made and the
  check that would settle it, with Dismiss per entry and a two-press Dismiss all

There is one ledger for the machine: every session shows every unsettled
entry, wherever it was made. A session catches up with another session's
changes the next time it redraws.

It never runs, blocks or rewrites a command, and it makes no model calls and no
network requests.

## What is recorded

| A command that | is kept as |
| --- | --- |
| puts a job in the background with `&`, unless it also `wait`s | a process, named by that job's text |
| runs as a background task | a process, named by its first part that is not `cd`, `export`, `source` or `set` |
| runs `tmux new-session -s NAME` | a tmux session |
| runs `mkdir` on a literal path under `/tmp` or `/private/tmp` | a temp folder |
| runs `mktemp -d` and prints the path it made | a temp folder |

A process also keeps its pid when the command echoes `$!`, and its port when
the text names one (`--port N`, `PORT=N`, `localhost:N`, `http.server N`).

## What settles an entry

Only the output of a check:

| Entry | Check | Settles when |
| --- | --- | --- |
| process | `pgrep -f PATTERN` | it prints no pid and PATTERN matches the entry's text |
| process with a pid | `ps -p PID` | its header prints without that pid's row |
| process with a port | `lsof -i :PORT` | it prints nothing |
| tmux session | `tmux has-session -t NAME` | it prints `can't find session`, or that no server is running |
| tmux session | `tmux ls` | it lists the sessions, or no server, without NAME |
| temp folder | `ls PATH`, `stat PATH` | it prints `No such file or directory` for the folder or one above it |

`kill`, `pkill`, `tmux kill-session` and `rm` settle nothing. `pgrep` and `lsof`
print nothing either way, so they count only where they must have run and kept
their output: not after `&&` or `||`, not piped, not redirected (`2>/dev/null`
and `2>&1` aside), and not on a call that never reached the shell. An
`|| echo gone` after one is fine; the check ran first.

## Options

- `row`: the name of another mod whose row above the prompt the count joins,
  so the two take one row. Empty, the default, gives the count a row of its
  own. While that mod is not loaded, the count is not drawn.

  The count is drawn inside that mod's row. It sits beside that mod's own
  content when teardown-ledger is the outer of the two hooks, or when that mod
  lays out what it is handed in a row; a mod that stacks it shows the count on
  the line above its own.

## Limits

It is a reminder, not a guarantee. Commands are matched by their text, and the
matching leans towards missing a spawn over recording one that never happened,
so an empty ledger does not prove a clean machine.

- Not recorded: a server started inside a tmux pane with `send-keys`, the
  app's own preview server, a daemon that forks by itself, a command typed into
  a terminal by hand, a `mktemp -d` whose path is never printed.
- A background command that ends by itself stays until a check or a Dismiss
  clears it. A background task reported as completed is not a receipt: the
  shell of `server & echo $!` completes while the server lives.
- Exercised on macOS only. A `pgrep` that counts the shell wrapping it never
  prints nothing; `ps -p` and `lsof` settle the entry there.

## Requirements

A Claude Code build with function-hook plugins; CI validates and tests against
2.1.325.

## License

MIT
