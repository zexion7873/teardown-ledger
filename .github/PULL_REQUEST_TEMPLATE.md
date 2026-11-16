## What and why

<!-- What changed, and what it fixes or adds. WHY rather than WHAT: the diff
     already says what. If it fixes an issue, link it. -->

## How you know it works

<!-- Delete the lines that do not apply. -->

- [ ] `claude plugin validate .`, `claude plugin validate --strict plugin` and
      `claude plugin test plugin` pass.
- [ ] I looked at the count and the pane in a real session: desktop Code tab,
      terminal, or both. Which, and what I saw:
- [ ] I changed a test, and **showed the old code fails it**: which case, and
      what it printed:
- [ ] I changed what is recorded or what settles an entry, and ran the real
      command in a session with the mod loaded. The command, and what the
      ledger did:
- [ ] I changed how the count is laid out, and looked at it both alone on its
      row and on another mod's row. A terminal run does not show the desktop
      layout. What I saw on each:
- [ ] I changed what an entry looks like in the store, and loaded entries the
      previous version had stored. What the pane showed:
- [ ] I changed what the count or the pane shows, and regenerated
      `docs/hero.svg` and `docs/social-card.png`. (Nothing checks either, and
      the card is not live until re-uploaded at Settings → General → Social
      preview.)

> [!IMPORTANT]
> **Do not bump `plugin/.claude-plugin/plugin.json`.** That one line *is* the
> publish: this repository is the marketplace people install from.

## Merge danger

<!-- Door: two-way if reverting this PR undoes it; one-way if it cannot be
     walked back (data deleted or rewritten, something published). Blast
     radius: who or what breaks if this is wrong. -->

- **Door:**
- **Blast radius:**

## Docs this makes stale

<!-- Which docs does this change invalidate? "None" is a fine answer; say it
     out loud rather than leaving this blank. CONTRIBUTING.md lists the ones
     that usually go stale. -->
