# Security Policy

## Reporting a vulnerability

**Do not open a public issue.** This repository is the marketplace people
install from, and an installed copy runs inside their Claude Code session on
every Bash tool call, so a working exploit in a public issue is a working
exploit against every install.

Use [GitHub's private vulnerability reporting](https://github.com/zexion7873/teardown-ledger/security/advisories/new).

This is a one-person project. You will get a first response within a few days,
not within hours. The fix ships as a version bump in
`plugin/.claude-plugin/plugin.json` on `main`.

## Supported versions

The version on `main` only. There are no releases, tags or maintenance
branches, and older versions are never patched.

## What this plugin does

Worth knowing before you decide whether something is in scope. It is one mod
module run inside Claude Code's own engine.

- It reads the command and the output of every Bash tool call in a session
  where it is loaded, a subagent's calls included, after the call has run.
- It writes one list to Claude Code's per-plugin store on your machine. An
  entry holds the text it was recognised by (a background job's command with
  leading `VAR=value` assignments and redirections removed, a tmux session's
  name, or a temp folder's path), a pid or port when the command showed one,
  the session's working directory and the time.
- A secret passed as an argument to a background job stays in that text, on
  disk and in the pane, until the entry settles or is dismissed.
- It puts an entry's check command on the clipboard when you press Copy check.
- It asks the engine whether each temp folder on its list still exists, at each
  Bash call and each session start, and drops the ones that do not. It reads no
  file's contents and asks about no other path.
- It never runs a command, never blocks or rewrites one, and returns every
  tool call's result as it received it.
- It makes no model calls and no network requests, and holds no credentials.

### In scope

- A command or its output that makes the mod run, block or rewrite anything,
  or change what a tool call returns.
- Text from a command or its output reaching anywhere other than the store,
  the count and the pane.
- A command or its output that hangs or crashes the hook, so that Bash calls
  stall or other mods' rows stop drawing.

### Out of scope

- An entry recorded wrongly, missed, or settled by output written to look like
  a check's. Matching is by text and the ledger is a reminder, not a guarantee;
  the README's Limits say so.
- Command text in the store. It is a file in your own Claude Code folder, and
  the session's transcript there already holds the same commands.
- Anything that needs an attacker who already controls your account, your
  machine or this repository.
