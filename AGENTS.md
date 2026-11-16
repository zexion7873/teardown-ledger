# Working on teardown-ledger

A Claude Code mod: a plugin of function hooks, one module
(`plugin/hooks/register.tsx`). No package manager, no dependencies. `README.md`
says what the mod is for; this file covers what will waste your time.

Public at `zexion7873/teardown-ledger`. That repository is the marketplace an
install fetches.

## `plugin/` is what ships

The repo root is the marketplace; `plugin/` is the plugin
(`source: "./plugin"`). Docs and CI live outside it so they stay out of an
install.

The version line in `plugin/.claude-plugin/plugin.json` landing on `main` is
the publish; a tag or a GitHub release publishes nothing.

## What the mod must keep doing

Pinned by `plugin/tests/ledger.test.tsx`.

- **With nothing unsettled, the band is only what is beneath.** A band hook
  awaits `next(e)` and returns it; dropping it erases every other mod's band.
- **Only a check's own output settles an entry.** Never the `kill` or `rm`,
  and never silence from a check that may not have run. Settling something
  still alive is the one error the mod exists to prevent; an entry that sticks
  has Dismiss.
- **Recording leans towards missing a spawn.** A false entry teaches the reader
  to ignore the count. The owner chose this over matching anything that
  mentions a port or a temp path.
- **One ledger for the machine**, under one store key, read at each draw. The
  owner chose this over a ledger per working directory (handoff-ledger's shape)
  and one per session: a process outlives its session and belongs to no repo.
- **A subagent's commands are recorded**, marked as such.
- **An entry can be dismissed by hand**: one at a time, or all with a second
  press.
- **The mod only keeps the ledger.** It never runs, blocks or rewrites a
  command, the checks included, though the engine would let it.

## What the engine does not tell a hook

- **A failed Bash call carries no `stdout` or `stderr`**, only `text`. That
  text has a line `Exit code N` when the shell ran; a call that was refused or
  blocked errors without it, and its silence must not read as an empty check.
- **Nothing fires when a background task ends, and its end is not absence.**
  The shell of `server & echo $!` run as a background task completes with exit
  0 while the server lives.
- **Another process's write to the store does not redraw this one.** A read
  gets the fresh value; nothing prompts the read.
- **Tool calls of one turn run side by side.** Each rewrites the whole list, so
  writes go through one queue.
- **Opening a pane that is already open only retitles it.** One sitting behind
  another pane's tab stays there. `focus` on the open raises it, but only over
  an empty composer; closing it and opening it again raises it always, which
  is what the count and `/teardown` do.
- **Which of two mods on one band row is the outer hook is set by how they
  load**, not by either mod. On another mod's row the count arrives as that
  mod's `below` when it is the inner one, and is laid out as that mod lays
  `below` out.
- **Core's own drawing takes no cell on a terminal, so no terminal run shows
  what it does to a row.** `next(e)` answers `{ type: 'engine' }` when no mod
  beneath drew. In a row with a button, handoff-ledger 0.2.4 had its button at
  the right edge of the desktop app's band; that the engine element takes the
  row's width there is read from that mod's screenshots, not inspected. The
  count goes in a Box of its own under it, and in a row only beside another
  mod's content.
- **The test harness cannot put another mod above this one.** Its own hooks
  draw as a mod named `test`, always beneath, and a bare `key` in `find`
  addresses the mounted mod's elements only. What a shared row looks like with
  the other mod outside is seen in a real session.

## Traps that cost time in the sibling mods

- **A new desktop session does not start where it ends up.** The app claims a
  pre-warmed session that started in a folder of its own, and no
  `session.start` follows the move. Read anything keyed by working directory
  when you draw, never at `session.start`.
- **A store file is named from the plugin id alone**
  (`<plugin>@<marketplace>`), so the same mod loaded from a checkout and from
  an install keeps two separate stores. A checkout loaded by `--plugin-dir`
  and one linked into a desktop session's mods folder are both `@inline` and
  share one.
- **An option is kept per plugin id too.** Settings hold it under
  `pluginConfigs`, keyed by the bare name for a checkout and by
  `<plugin>@<marketplace>` for an install, so a `row` set for one is unset for
  the other. `claude plugin configure <plugin>@<marketplace>` shows and sets
  the install's.
- **A terminal `claude` in an untrusted folder asks to trust it with "No, exit"
  preselected.** A tmux probe sends Down before Enter. This checkout is not
  trusted; trusting it is the owner's call, so a probe starts in a folder that
  already is and names `--plugin-dir` by absolute path.
- **A probe's `pkill -f X` kills every shell whose command line mentions X**,
  the one waiting on the probe included. Keep X out of the waiting command.
- **In a terminal, ctrl+x Tab walks the band's buttons only.** A pane's button
  takes a click: an SGR mouse press and release through `tmux send-keys -l`.
- **`tsc` fails on a fresh clone.** `plugin/tsconfig.json` extends
  `plugin/.claude-plugin/types/`, which the engine writes the first time the
  mod loads and git ignores.
- **`tsc` judges against wherever the mod last loaded.** Each load rewrites
  those types with the MCP tools connected then, and `$.tool.call` is typed
  over all of them: after a desktop session with many connectors a plain
  `$.tool.call(...)` in a test fails with TS2589. The tests call it through a
  narrow signature for that reason.

## The hero and the social card

`docs/hero.svg` (the README's image) and `docs/social-card.png` (the repo's
social preview) are drawn by `tools/make-hero.mts` and
`tools/make-social-card.mts` from `tools/pane.mts`, a hand-drawn copy of the
pane: the mod's own tree needs the engine. Change a button label or what an
entry's rows show in `register.tsx` and both are stale; nothing checks either.
The card also renders `plugin.json`'s description and throws if it stops
reading `<tagline>: <accent>`. GitHub takes the social preview only through
Settings → General → Social preview, so a regenerated PNG is not live until
someone uploads it there. The README's `width=` must match the SVG's own
`width`. The PNG depends on the machine's rasteriser, so CI checks neither.

## Commands

```bash
claude plugin validate .                 # the marketplace manifest only
claude plugin validate --strict plugin   # the plugin and every engine call it makes
claude plugin test plugin                # plugin/**/*.test.tsx in the engine's harness
(cd plugin && tsc -p .)                  # only after the mod has loaded once
claude --plugin-dir plugin               # a session running this checkout
node tools/make-hero.mts > docs/hero.svg                                  # README hero
node tools/make-social-card.mts | rsvg-convert -o docs/social-card.png    # social preview
```
