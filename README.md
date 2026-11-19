<div align="center">

# 🧹 teardown-ledger

[![CI: check](https://github.com/zexion7873/teardown-ledger/actions/workflows/check.yml/badge.svg)](https://github.com/zexion7873/teardown-ledger/actions/workflows/check.yml)

<img src="docs/hero.svg" width="760" title="Drawn by hand from sample entries, not a screenshot." alt="A drawing of the mod, not a screenshot. On the left, a session has run three Bash commands: a dev server put in the background on port 5173, a tmux session named probe, and a temp folder made at /tmp/qa-run. Its reply says The page renders. Done. Under it, above the prompt box, a button reads Teardown 3. On the right, a pane titled Teardown ledger lists the same three things: each shows what it is and where it was made, the check that would settle it (lsof on the port, tmux has-session, ls on the folder), a Copy check button and a Dismiss button; the folder is marked 2d ago, and a Dismiss all button sits under the list.">

**Keeps the processes, ports and temp folders a Claude Code session spawned
until their absence is shown: a count above the prompt and a pane.**

[![License: MIT](https://img.shields.io/github/license/zexion7873/teardown-ledger?style=flat)](LICENSE)
[![Surface: desktop | terminal](https://img.shields.io/badge/surface-desktop%20%7C%20terminal-lightgrey?style=flat)](#what-it-reads-and-writes)
[![Network: none](https://img.shields.io/badge/network-none-brightgreen?style=flat)](#what-it-reads-and-writes)

No model calls. No network requests. No running, blocking or rewriting a
command. One mod reading the Bash calls the session already made.

</div>

---

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
| runs as a background task | a process, named by its first part that is not `cd`, `export`, `source`, `set` or a bare `VAR=value` |
| runs `tmux new-session -s NAME` | a tmux session |
| runs `mkdir` on a literal path under `/tmp` or `/private/tmp` | a temp folder |
| runs `mktemp -d` and prints the path it made | a temp folder |

A process also keeps its pid when the command echoes `$!`, and its port when
the text names one (`--port N`, `PORT=N`, `localhost:N`, `http.server N`).

A heredoc's body is not read for jobs: the `&` in `python3 - <<'EOF'` is
Python's. A job that a `sh <<EOF` body starts is missed for the same reason.

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

## Install

Requirements are below. At the prompt of a terminal session:

```
/plugin install teardown-ledger --marketplace zexion7873/teardown-ledger
```

From a shell:

```bash
claude plugin install teardown-ledger --marketplace zexion7873/teardown-ledger
```

In the desktop app, where `/plugin` does not run: click + next to the prompt
box, then Plugins, Add marketplace with `zexion7873/teardown-ledger`, then Add
plugin.

## Options

- `row`: the name of another mod whose row above the prompt the count joins,
  so the two take one row. Empty, the default, gives the count a row of its
  own. While that mod is not loaded, the count is not drawn. From a shell it
  can be set at install: `--config row=<that mod's name>`.

  The count is drawn inside that mod's row. It sits beside that mod's own
  content when teardown-ledger is the outer of the two hooks, or when that mod
  lays out what it is handed in a row; a mod that stacks it shows the count on
  the line above its own.

## What it reads and writes

| Hook | Reads | Changes |
| --- | --- | --- |
| `session.start` | nothing | registers `/teardown` |
| `command.run` (`/teardown`) | whether the mod's pane is open and shown | opens the pane; one open behind another pane's tab is closed and opened again, which brings it forward |
| `tool.call` (`Bash`) | the command and, once it has run, its output; the session's working directory | adds what the command left behind to the ledger and removes what its checks showed gone; the call and its result pass through as they were |
| `ui.render` (`AbovePrompt`, `Pane`) | the ledger, at each draw | draws the count and the pane; the count opens the pane as `/teardown` does; **Dismiss** deletes an entry, **Dismiss all** deletes every entry after a second press, **Copy check** puts an entry's check on the clipboard |

The ledger lives in Claude Code's per-plugin store on your machine, one list
for every session. An entry holds the text it was recognised by, a pid or port
when the command showed one, the working directory and the time. For a
background job that text is its command with leading `VAR=value` assignments
and redirections removed, so a secret passed as an argument is kept there until
the entry settles or is dismissed.

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
