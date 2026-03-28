---
name: mush-architect
description: "Master orchestrator for all RhostMUSH softcode work. Auto-activates when the user mentions MUSH, softcode, mushcode, RhostMUSH, PennMUSH, TinyMUX, builders, wizards, @create, &attributes, or any MUSH game development topic. Routes to the right sub-skill or chains multiple skills together."
effort: high
user-invocable: true
date_added: "2026-03-27"
---

> **HARD STOP: Do NOT write any softcode — not a single line, not a stub — until you have presented a written design plan and the user has explicitly confirmed it. Skipping this is a protocol violation.**


# mush-architect

Master skill for RhostMUSH softcode development. All MUSH work flows through this skill.

## Skill routing map

Read the user's intent, then route to the right skill or chain. When in doubt, ask one clarifying question.

### By intent

| User says / wants | Route to |
|-------------------|----------|
| "build", "write", "create", "code", "make a system/command/UDF" | `/mush-build` |
| "test", "verify", "check if this works", "write a test" | `/mush-test` |
| "explain", "what does this do", "walk me through", "how does this work" | `/mush-explain` |
| "document", "write help", "help text", "docs" | `/mush-docs` |
| "security", "audit", "is this safe", "injection", "vulnerable" | `/mush-security` |
| "optimize", "speed up", "too slow", "lag", "performance" | `/mush-efficiency` |
| "debug", "broken", "not working", "error", "wrong output" | `/mush-troubleshoot` |
| "migrate", "port", "convert to Penn/MUX/Rhost", "move this code" | `/mush-migrate` |
| "install", "deploy", "push to server", "put this on the game" | `/mush-install` |
| "I want a system that...", natural-language description | `/mush-natural` → `/mush-build` |
| "start session", "begin", "new session" | `/mush-session` |
| "new project", "start from scratch", "scaffold" | `/mush-init` |
| "update manifest", "track objects", "record dbrefs" | `/mush-manifest` |
| "uninstall", "remove", "rollback", "tear down" | `/mush-rollback` |
| "patch", "upgrade", "update existing install", "what changed" | `/mush-patch` |
| "lint", "check code", "validate installer" | `/mush-lint` |
| "watch", "auto-rebuild", "dev mode" | `/mush-watch` |
| "set up hooks", "automate gates", "auto-lint" | `/mush-hooks` |
| "extract patterns", "save what I learned", "add to corpus" | `/mush-learn` |

### Standard workflow chains

**New feature (full pipeline):**
```
/mush-session → /mush-build (phases 0-4) → /mush-lint → /mush-build (phases 5-7) → /mush-manifest → /mush-install → /mush-test → /mush-security → /mush-learn
```

**Fix a bug (minimal):**
```
/mush-session → /mush-troubleshoot → /mush-build (phase 3 only) → /mush-lint → /mush-patch → /mush-install → /mush-test
```

**Natural language to deployed:**
```
/mush-natural → /mush-build → /mush-lint → /mush-install → /mush-test → /mush-security → /mush-learn
```

**Explain and document existing code:**
```
/mush-explain → /mush-docs → /mush-build (phase 4 only)
```

**New project from zero:**
```
/mush-init → /mush-session → /mush-hooks → /mush-build
```

### Skill invocation rules

| Skill | Invocation | Why |
|-------|-----------|-----|
| `mush-session` | Manual only — always first | Side-effect: loads corpus, sets session state |
| `mush-init` | Manual only | Side-effect: creates files/dirs |
| `mush-install` | Manual only | Side-effect: deploys to live server |
| `mush-rollback` | Manual only | Side-effect: destroys live objects |
| `mush-patch` | Manual only | Side-effect: writes installer files |
| `mush-manifest` | Manual only | Side-effect: writes manifest.json |
| `mush-watch` | Manual only | Side-effect: starts background process |
| `mush-hooks` | Manual only | Side-effect: writes settings.json |
| `mush-security` | Auto + manual | Runs in fork — safe to trigger on code review |
| `mush-lint` | Auto + manual | Runs in fork — safe to trigger on file write |
| All others | Auto + manual | Claude can trigger based on context |

---

## ⚠ PHASE 0 — PLAN FIRST (BLOCKING GATE)

**This phase MUST complete before Phase 1. Do not skip it, abbreviate it, or defer it.**

After the SESSION START CHECKLIST (Steps 1–3 below) completes:

1. **Write a design plan** covering ALL of the following:
   - **System name and object** — what object(s) will be created, flags, locks
   - **Commands** — full list: pattern, access level (all/wizard), inputs, outputs
   - **Data model** — how data is stored (attributes, naming conventions, index attrs)
   - **Hook/extension points** — any user-overridable attributes or UDFs
   - **File structure** — softcode file(s), test file(s), doc file(s) to be created
   - **Test scenarios** — bulleted list of cases the test suite will cover (red → green)
   - **Open questions** — anything that requires user input before you can proceed

2. **Stop and wait.** Output the plan and end your response. Do not write code.

3. **Wait for explicit user confirmation** — e.g. "looks good", "proceed", "yes". A question from the user is NOT confirmation. Silence is NOT confirmation.

4. **Only after written confirmation** — proceed to Phase 1 (SESSION START CHECKLIST) and then implementation.

**Why this matters:** Jumping straight to code without agreement on scope wastes time on rework and produces systems the user didn't ask for. The plan conversation is the cheapest part of the process.

---

## ⚠ PLANNING GATE — MANDATORY BEFORE WRITING ANY CODE

Before any softcode is written, you MUST:

1. Complete Phase 0 (design plan + user confirmation — see above)
2. Complete the SESSION START CHECKLIST (Steps 1–3 below)
3. Check mush-patterns for an existing matching pattern
4. Write the `@rhost/testkit` test **before** the softcode (red first)

Only after all four are done may you proceed to write softcode.

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

### Step 3 — Server help corpus check (MANDATORY)

Identify the target MUSH server from the task context (e.g. "RhostMUSH", "PennMUSH", "TinyMUSH").

**RhostMUSH — full help corpus is bundled locally. Never fetch from GitHub.**

| File | Use for |
|------|---------|
| `reference/rhost-help.txt` | Functions, softcode, @commands, flags, attributes |
| `reference/rhost-wizhelp.txt` | @power, @config, @aflags, @admin, news, snoop |
| `reference/rhost-help-topics.txt` | Fast topic lookup (grep this first) |
| `reference/rhost-wizhelp-topics.txt` | Fast wiz topic lookup |

See `reference/rhost.md` for the full lookup guide.

**Before writing any RhostMUSH softcode — look up the relevant topics:**
```bash
# Find if a topic exists
grep -i "^& <function-or-command>" reference/rhost-help.txt reference/rhost-wizhelp.txt

# Read a full entry (replace TOPIC with actual topic)
awk '/^& TOPIC$/,/^& /' reference/rhost-help.txt | head -80
```

**For other servers:**
1. Check `../mush-patterns/patterns/server-help/` for an existing file.
2. If missing — fetch from the server's public repo, extract patterns, run `/mush-learn` to record them.

**Known fetch URLs (other servers):**
| Server | URL |
|--------|-----|
| PennMUSH | `https://raw.githubusercontent.com/pennmush/pennmush/master/game/txt/hlp/pennmush.hlp` |

Add to this table when new servers are encountered. RhostMUSH is already local — do not add it here.

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

## ⚠ /mush-test — MANDATORY, NO EXCEPTIONS

**Every piece of softcode written or modified in any mush-* skill session MUST have `/mush-test` run.**

- Write the test FIRST (red), then the softcode, then run `/mush-test` to verify (green).
- A task is not complete until `/mush-test` passes.
- There are no exceptions — not for "small" fixes, not for "obvious" code.
