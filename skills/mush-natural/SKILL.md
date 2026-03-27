---
name: mush-natural
description: "Translate natural-language feature descriptions into RhostMUSH softcode."
risk: low
source: local
date_added: "2026-03-27"
---

# mush-natural

Translate natural-language descriptions into RhostMUSH softcode. Immediately delegates to `/mush-build` for implementation.

## Session start

Run the `mush-architect` session start checklist (sync + corpus load + help detection) before any work.

## Workflow

1. **Clarify** — ask one targeted question at a time until the spec is unambiguous:
   - Who can run this? (lock level)
   - What are the inputs? (args, switches)
   - What does success look like? (exact output)
   - What does failure look like? (error cases)
   - What state does it change? (DB, flags, attributes)

2. **Draft spec** in concrete terms — not "show the player their stats" but:
   > `+sheet` (connected) — emit a formatted table of `STAT.*` attributes on `u.me` to `%#`. Columns: name (left-padded 20), value (right-padded 5). Header and footer with `u.util.center(78,"=")`.

3. **Hand off to `/mush-build`** — pass the concrete spec and proceed through the full build + test workflow.

## Mandatory

Natural-language translation is not complete until the spec has been implemented and tested with `@rhost/testkit`.
