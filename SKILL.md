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
| "export from server", "pull attrs from live", "sync src from game" | `/mush-export` |
| "audit", "has anything drifted", "compare live to manifest" | `/mush-audit` |
| "review code", "senior review", "architecture feedback" | `/mush-review` |
| "release", "cut a version", "version bump" | `/mush-release` |
| "publish", "share", "submit to community", "PR to softcode repo", "contribute softcode", "community repo" | `/mush-publish` |
| "coverage", "what's untested", "missing tests" | `/mush-coverage` |
| "config", "@admin", "read config", "set config param" | `/mush-config` |
| "@hook", "hook a command", "before/after hook", "permit hook" | `/mush-hook` |
| "simulate", "trace execution", "what does this evaluate to" | `/mush-simulate` |
| "deps", "dependencies", "what calls this", "what breaks if I remove" | `/mush-deps` |
| "chargen", "character generation", "stat system", "approval workflow" | `/mush-chargen` |
| "bulletin board", "bboard", "post system", "+bb" | `/mush-bboard` |
| "jobs", "request system", "ticket system", "+job" | `/mush-jobs` |
| "monitor", "server status", "is the game up", "queue depth" | `/mush-monitor` |
| "robot", "@robot", "bot bridge", "external process", "robot player", "connect external", "tinymux robot" | `/mush-robot` |
| "readme", "generate docs", "update README" | `/mush-readme` |
| "upgrade", "migrate version", "apply upgrade" | `/mush-upgrade` |
| "format", "pretty format", "expand", "make readable", "unminify" | `/mush-format expand` |
| "compress", "minify", "unformat", "pack", "make installer", "single-line" | `/mush-format compress` |

### Standard workflow chains

**New feature (full pipeline):**
```
/mush-session → /mush-build (phases 0-4) → (/mush-lint & /mush-security) → /mush-format compress → /mush-build (phases 6-7) → /mush-manifest → /mush-install → /mush-test → /mush-learn
```

**Fix a bug (minimal):**
```
/mush-session → /mush-troubleshoot → /mush-build (phase 3 only) → /mush-lint → /mush-patch → /mush-install → /mush-test
```

**Natural language to deployed:**
```
/mush-natural → /mush-build → (/mush-lint & /mush-security) → /mush-install → /mush-test → /mush-learn
```

**Explain and document existing code:**
```
(/mush-explain & /mush-review) → /mush-docs → /mush-build (phase 4 only)
```

**New project from zero:**
```
/mush-init → /mush-session → /mush-hooks → /mush-build
```

**Scaffold a new system (chargen / bboard / jobs):**
```
/mush-chargen (or /mush-bboard or /mush-jobs) → /mush-test → (/mush-lint & /mush-security) → /mush-docs → /mush-build phases 6-11
```

**Upgrade a deployed system:**
```
/mush-audit → /mush-review → /mush-release → /mush-upgrade → /mush-monitor
```

**Publish to the community repo:**
```
/mush-release → /mush-publish
```

**Sync and audit a live server:**
```
/mush-export → (/mush-audit & /mush-deps & /mush-coverage)
```

**Pre-refactor safety check:**
```
(/mush-deps <attr> & /mush-coverage) → /mush-simulate <attr>
```

**AI GM bridge (TinyMUX via @robot):**
```
/mush-session → /mush-robot (bridge process + protocol) → /mush-build (event handlers + softcode) → /mush-test → /mush-security
```

### Skill invocation rules

`Blast radius` — scope of damage if something goes wrong. `Reversible` — can the action be undone without data loss?

| Skill | Invocation | Blast radius | Reversible? |
|-------|-----------|--------------|-------------|
| `mush-session` | Manual only — always first | Local — session state only | Yes |
| `mush-init` | Manual only | Local — creates dirs/files | Yes (delete files) |
| `mush-install` | Manual only | **Live server** — creates/overwrites objects | Yes (run rollback) |
| `mush-rollback` | Manual only | **Live server** — destroys objects | **No** |
| `mush-patch` | Manual only | Local — writes installer files | Yes (git revert) |
| `mush-manifest` | Manual only | Local — writes manifest.json | Yes (git revert) |
| `mush-watch` | Manual only | Local — starts background process | Yes (kill process) |
| `mush-hooks` | Manual only | Local — writes settings.json | Yes (git revert) |
| `mush-export` | Manual only | Local — writes src/ files | Yes (git revert) |
| `mush-audit` | Manual only | Live server — read-only | Yes (no changes) |
| `mush-release` | Manual only | Remote — commits, tags, pushes | Difficult (revert tag/push) |
| `mush-publish` | Manual only | **Remote** — pushes branch, files PR | Difficult (close PR, delete branch) |
| `mush-upgrade` | Manual only | **Live server** — overwrites objects | Partial (if backup exists) |
| `mush-config` | Manual only | **Live server** — writes @admin attrs | Yes (restore from backup) |
| `mush-monitor` | Manual only | Live server — read-only | Yes (no changes) |
| `mush-robot` | Manual only | Local + live server — writes bridge process, creates robot player | Yes (destroy player, delete files) |
| `mush-format` | Auto + manual | Local — writes dist/ or src/ files | Yes (git revert) |
| `mush-security` | Auto + manual | None — fork, read-only | Yes |
| `mush-lint` | Auto + manual | None — fork, read-only | Yes |
| `mush-deps` | Auto + manual | None — fork, read-only | Yes |
| `mush-coverage` | Auto + manual | None — fork, read-only | Yes |
| `mush-simulate` | Auto + manual | None — fork, read-only | Yes |
| `mush-review` | Auto + manual | None — fork, read-only | Yes |
| All others | Auto + manual | Local only | Yes |

---

## Concurrency guide

Skills shown with `&` in a workflow chain can run in parallel — launch them as concurrent agent calls. This is safe when:
- Both skills have `context: fork` (isolated, no shared file writes)
- Neither skill writes to files the other reads mid-run
- Combined output is reviewed together before the next step

**Always parallel-safe (read-only forks):**
- `mush-lint & mush-security` — independent static analysis of the same source
- `mush-review & mush-docs` — review produces findings; docs produces help text; no overlap
- `mush-deps & mush-coverage & mush-simulate` — all read-only analysis
- `mush-audit & mush-deps & mush-coverage` — all read-only server/code inspection

**Never parallelize:**
- Any two skills that both write to `dist/` or `src/` files
- `mush-install` with anything — live server writes must be sequential
- `mush-rollback` with anything — destructive, needs full attention
- `mush-session` with anything — must complete before all others

**Background execution:** `mush-security` and `mush-review` (both `model: opus`, higher latency) can be launched in the background while the user reviews lint output or writes docs. They do not block the critical path.

---

## ⚠ FILE FORMAT CONTRACT — MANDATORY

**These rules apply to every file written or modified in any mush-* skill session:**

| File type | Required format | Tool |
|-----------|----------------|------|
| `src/*.mush` | **Pretty** — multi-line, indented, `//` comments allowed | `/mush-format expand` to convert from compressed |
| `dist/*.installer.txt` | **Compressed** — one attribute per line, no `//` comments, collapsed whitespace | `/mush-format compress` to produce from src |

**Never hand-write a `dist/*.installer.txt` line-by-line.** Write in `src/*.mush` (pretty format), then run `/mush-format compress`.

**Never hand-edit a `dist/*.installer.txt` in place.** Edit the corresponding `src/*.mush` file, then recompress.

If you must make an emergency patch directly to a dist file (e.g. the src is unavailable), run `/mush-format expand` immediately after to restore the src, then commit both.

**Compress runs before every lint and package step, no exceptions.**

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
| Repo missing or git not initialized | **Stop. Tell the user** the repo is missing at `mush-patterns` and ask them to clone it: `git clone https://github.com/lcanady/mush-patterns ../mush-patterns`. |

Do not proceed with any softcode task until the repo is in sync.

---

### Step 2 — Corpus load (MANDATORY)

After sync, read the pattern files relevant to the current task:

1. **Always read:** `../mush-patterns/README.md` and `../mush-patterns/CONTRIBUTING.md`
2. **Read by domain** based on what the task involves:
   - Writing a function → read `../../mush-patterns/patterns/functions/`
   - Writing a command → read `../../mush-patterns/patterns/commands/`
   - Building a system → read `../../mush-patterns/patterns/systems/`
   - Working with a specific server → read `../../mush-patterns/patterns/server-help/`
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
1. Check `../../mush-patterns/patterns/server-help/` for an existing file.
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
