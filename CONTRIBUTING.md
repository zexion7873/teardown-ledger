# Contributing

Read [AGENTS.md](AGENTS.md) first: it says what the mod must keep doing and what
the engine does not tell a hook. The traps below are the ones that look like
your change failing when it has not.

## Three things that will cost you an afternoon

**`tsc` fails on a fresh clone, and it is not your change.**
`plugin/tsconfig.json` extends `plugin/.claude-plugin/types/`, which Claude Code
writes the first time the mod loads and git ignores. Load the mod once with
`claude --plugin-dir plugin`, then type-check.

**A terminal run cannot show you the desktop band.** Core's own drawing takes
no cell on a terminal, so a row that is laid out wrongly on the desktop app
looks right in every terminal run. A change to the count's layout is looked at
on both, or said to be unseen on one.

**An entry another process just recorded is not on screen yet.** The ledger is
one list for the machine and a read gets the fresh value, but nothing prompts
the read. In a session that did not run the command itself, submit `/teardown`
before deciding the count is missing.

## Working on it

```bash
claude --plugin-dir plugin               # a session running this checkout
claude plugin validate .
claude plugin validate --strict plugin
claude plugin test plugin
```

A fresh clone runs all of it with no secret and no network, given the Claude
Code build the README's Requirements name. The last three are what CI runs.

"Verified" means: those three pass, and **in a session with the mod loaded you
ran a command that leaves something behind, saw the count above the prompt, ran
the check, and saw the entry go**. A green test is one more kind of evidence,
not a replacement for looking.

## Pull requests

Do not open a pull request you could not explain line by line if asked. That
rule, and the two beside it, are in the
[Code of Conduct](CODE_OF_CONDUCT.md#send-work-you-understand).

Conventional Commits (`feat:` / `fix:` / `refactor:` / `docs:` / `chore:` /
`test:` / `perf:`), in English, saying WHY rather than WHAT. One logical change
per commit.

If your change alters behaviour, interfaces, or project state, the docs it makes
stale are part of the diff: the README's two tables (what is recorded, what
settles an entry), its Options, its hook table and its Limits; `AGENTS.md`;
`SECURITY.md`, when what the mod reads or stores changes; the two descriptions
in `plugin/.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`;
and the Claude Code version, which the README's Requirements and
`.github/workflows/check.yml` both name.
