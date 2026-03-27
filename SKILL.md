---
name: mush-architect
description: "Orchestrating skill for RhostMUSH softcode development. Routes to sub-skills, detects help files from unknown servers, and manages the mush-patterns corpus."
risk: low
source: local
date_added: "2026-03-27"
---

# mush-architect

Master skill for RhostMUSH softcode development. All MUSH work flows through this skill.

## Sub-skills

| Skill | When to use |
|-------|-------------|
| `/mush-build` | Writing new softcode (commands, UDFs, systems) |
| `/mush-test` | Writing or running @rhost/testkit tests |
| `/mush-explain` | Explaining what existing softcode does |
| `/mush-docs` | Generating help text or documentation |
| `/mush-security` | Auditing softcode for injection or privilege issues |
| `/mush-efficiency` | Optimizing softcode performance |
| `/mush-troubleshoot` | Debugging failing softcode |
| `/mush-migrate` | Porting code between MUSH server flavors |
| `/mush-install` | Deploying softcode to a live server |
| `/mush-natural` | Translating natural-language specs to softcode |

---

## ⚠ Help file detection — always active

**This behavior runs at the start of every session, regardless of which sub-skill is invoked.**

### Trigger

When the user pastes or provides a help file (or block of help text) from a MUSH server that is NOT already represented in `../mush-patterns/patterns/server-help/`, ask:

> "I don't see patterns for **[server-name]** in `mush-patterns` yet. Want me to extract softcode patterns from this help file and open a PR to add them?"

### How to detect "unknown server"

1. Check `../mush-patterns/patterns/server-help/` for a file matching the server name or slug.
2. If no match → trigger the prompt above.
3. If the user confirms → run the [Pattern extraction workflow](#pattern-extraction-workflow) below.

### Pattern extraction workflow

1. **Identify the server name** — from the help file header, file name, or user input.
2. **Extract patterns** — scan for:
   - UDF definitions (`&FUNCTION_NAME`, `u()` calls)
   - Command patterns (`$+cmd`, `$@cmd`)
   - System objects (`@create`, `@parent`, `@set ... inherit safe`)
   - Notable softcode idioms
3. **Create pattern files** in `../mush-patterns/patterns/` following the format in `CONTRIBUTING.md`.
4. **Create a PR** to `mush-patterns`:

```bash
cd ../mush-patterns
git checkout -b patterns/<server-slug>-$(date +%Y-%m-%d)
# (pattern files were created in step 3)
git add patterns/
git commit -m "feat: add patterns from <server-name>"
gh pr create \
  --title "feat: patterns from <server-name>" \
  --body "Extracted from help file provided in session on $(date +%Y-%m-%d).

## Patterns added
<list patterns>

## Source
<server-name> help file"
```

5. **Report the PR URL** to the user.

---

## Pattern corpus location

`../mush-patterns/` — read patterns at the start of any session where MUSH softcode is discussed.

When writing softcode, check `../mush-patterns/patterns/` for existing patterns that match the task before writing from scratch.

---

## ⚠ @rhost/testkit — MANDATORY, NO EXCEPTIONS

**Every piece of softcode written or modified in any mush-* skill session MUST have a corresponding `@rhost/testkit` test.**

- Write the test FIRST (red), then the softcode, then verify (green).
- A task is not complete until the test passes.
- There are no exceptions — not for "small" fixes, not for "obvious" code.

See `/mush-test` for the full testing API reference.
