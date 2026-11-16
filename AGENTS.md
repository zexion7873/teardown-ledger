# Working on teardown-ledger

A Claude Code mod: a plugin of function hooks, one module
(`plugin/hooks/register.tsx`). No package manager, no dependencies. `README.md`
says what the mod is for; this file covers what will waste your time.

The repository is a shell: the module registers nothing and one test pins the
empty band. Unpublished, with no remote.

## `plugin/` is what ships

The repo root is the marketplace; `plugin/` is the plugin
(`source: "./plugin"`). Docs and CI live outside it so they stay out of an
install.

## What the mod must keep doing

Pinned by `plugin/tests/ledger.test.tsx`.

- **With nothing unsettled, the band is only what is beneath.** A band hook
  awaits `next(e)` and returns it; dropping it erases every other mod's band.

## Traps that cost time in the sibling mods

- **A new desktop session does not start where it ends up.** The app claims a
  pre-warmed session that started in a folder of its own, and no
  `session.start` follows the move. Read anything keyed by working directory
  when you draw, never at `session.start`.
- **A store file is named from the plugin id alone**
  (`<plugin>@<marketplace>`), so the same mod loaded from a checkout and from
  an install keeps two separate stores.
- **A terminal `claude` in an untrusted folder asks to trust it with "No, exit"
  preselected.** A tmux probe sends Down before Enter.
- **`tsc` fails on a fresh clone.** `plugin/tsconfig.json` extends
  `plugin/.claude-plugin/types/`, which the engine writes the first time the
  mod loads and git ignores.

## Commands

```bash
claude plugin validate .                 # the marketplace manifest only
claude plugin validate --strict plugin   # the plugin and every engine call it makes
claude plugin test plugin                # plugin/**/*.test.tsx in the engine's harness
(cd plugin && tsc -p .)                  # only after the mod has loaded once
claude --plugin-dir plugin               # a session running this checkout
```
