---
name: mush-architect
description: "Orchestrating skill for RhostMUSH softcode development. Routes to sub-skills, detects help files from unknown servers, and manages the mush-patterns corpus."
risk: low
source: local
date_added: "2026-03-27"
---

> **Act immediately. Write code or ask one question — do not narrate your plan or summarize what you are about to do.**


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

## ⚠ SESSION START CHECKLIST — MANDATORY, RUN BEFORE ANYTHING ELSE

**These three steps MUST complete successfully before any softcode work begins. No exceptions.**

```
Step 1 — Sync check     → Verify mush-patterns is up to date with remote
Step 2 — Corpus load    → Read patterns relevant to the current task
Step 3 — Help detection → Check if any provided help file is from an unknown server
```

Skipping any step is a protocol violation. Do not proceed to the task until all three complete.

---

### Step 1 — Sync check (MANDATORY)

Run this at the start of every session:

```bash
cd ../mush-patterns && git fetch origin && git status
```

Interpret the output:

| Status | Action |
|--------|--------|
| `Your branch is up to date with 'origin/main'` | Proceed to Step 2. |
| `Your branch is behind 'origin/main' by N commits` | **Stop. Ask the user:** "mush-patterns is N commits behind remote. Pull now before we continue?" If yes: `git pull`. |
| `Your branch is ahead of 'origin/main' by N commits` | **Stop. Ask the user:** "mush-patterns has N unpushed commits. Push them now?" If yes: `git push`. |
| `diverged` | **Stop. Ask the user:** "mush-patterns has diverged from remote. Resolve before continuing?" Show `git log --oneline --left-right HEAD...origin/main`. |
| Repo missing or git not initialized | **Stop. Tell the user** the repo is missing at `../mush-patterns` and ask them to clone it: `git clone https://github.com/lcanady/mush-patterns ../mush-patterns`. |

Do not proceed with any softcode task until the repo is in sync.

---

### Step 2 — Corpus load (MANDATORY)

After sync, read the pattern files relevant to the current task:

1. **Always read:** `../mush-patterns/README.md` and `../mush-patterns/CONTRIBUTING.md`
2. **Read by domain** based on what the task involves:
   - Writing a function → read `../mush-patterns/patterns/functions/`
   - Writing a command → read `../mush-patterns/patterns/commands/`
   - Building a system → read `../mush-patterns/patterns/systems/`
   - Working with a specific server → read `../mush-patterns/patterns/server-help/`
3. **Check for an existing pattern** that matches the task before writing new code. If one exists, use it as the starting point.
4. **Report to the user** which patterns were loaded and whether any matched the current task.

If the corpus is empty or sparse for the task domain, note this and proceed — but remember to extract patterns after completing the task (see Step 3 and the Pattern extraction workflow below).

---

### Step 3 — Help file detection (MANDATORY)

Scan the current conversation for any help files or blocks of help text the user has provided.

**Trigger:** If a help file is from a server NOT represented in `../mush-patterns/patterns/server-help/`, ask:

> "I don't see patterns for **[server-name]** in `mush-patterns` yet. Want me to extract softcode patterns from this help file and open a PR to add them?"

How to detect "unknown server":
1. Check `../mush-patterns/patterns/server-help/` for a file whose name matches the server slug.
2. If no match → trigger the prompt above.
3. If the user confirms → run the [Pattern extraction workflow](#pattern-extraction-workflow) below.

---

## Pattern extraction workflow

When the user confirms they want patterns extracted from a help file:

1. **Identify the server name** — from the help file header, file name, or user input.
2. **Extract patterns** — scan for:
   - UDF definitions (`&FUNCTION_NAME`, `u()` calls)
   - Command patterns (`$+cmd`, `$@cmd`)
   - System objects (`@create`, `@parent`, `@set ... inherit safe`)
   - Notable softcode idioms
3. **Create pattern files** in `../mush-patterns/patterns/` following the format in `CONTRIBUTING.md`.
4. **Create a PR:**

```bash
cd ../mush-patterns
git checkout -b patterns/<server-slug>-$(date +%Y-%m-%d)
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

## ⚠ @rhost/testkit — MANDATORY, NO EXCEPTIONS

**Every piece of softcode written or modified in any mush-* skill session MUST have a corresponding `@rhost/testkit` test.**

- Write the test FIRST (red), then the softcode, then verify (green).
- A task is not complete until the test passes.
- There are no exceptions — not for "small" fixes, not for "obvious" code.

See `/mush-test` for the full testing API reference.
