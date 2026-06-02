---
name: mush-session
description: Initialize a MUSH-ARCHITECT session: sync corpus, load manifest, detect server config. Run at the start of every session before any other skill.
disable-model-invocation: true
effort: low
date_added: "2026-03-28"
---

> **Act immediately. This is a checklist — execute each step in order, report status, then stop. Do not begin any softcode work until this skill completes green.**

# mush-session

Initialize a MUSH-ARCHITECT working session. Every session — build, test, install, patch — MUST start here.

## Why this exists

Other skills reference "the session start checklist" but cannot run without it. This skill is that checklist.

## Checklist (run in order)

### 1 — Sync mush-patterns corpus

```bash
cd ../mush-patterns && git pull --ff-only
```

If this fails (dirty tree, conflicts): stop and report. Do not proceed with stale patterns.

### 2 — Load patterns index

Read `../mush-patterns/INDEX.md` and confirm it loaded. Report how many pattern categories are available.

### 2b — Load memory layers (L0–L3)

After the patterns index loads, build the session context stack in order.
Each layer has a token budget. Do not load L3 unless L2 is insufficient.

**L0 — Project identity (~100 tokens, fixed for the session)**

Cache these facts once. Never re-read them mid-session.

| Fact | Source |
|------|--------|
| Project name | `dist/manifest.json` → `.name`, or first `@create` in installers |
| Server type | User input or manifest |
| Help system | User input or manifest |
| Server version | `version()` result from Step 7 |

**L1 — Critical facts (~200 tokens, loaded at session start)**

Read these at session start; refresh them only if the user says something changed.

1. Last 5 git commits: `git log --oneline -5`
2. Any failing tests from the previous session (look for `SESSION_DIARY.md` → "Test status" line)
3. Open decisions from `IMPLEMENTATION_PLAN.md` (if it exists)
4. Any ERRORs from the last lint run logged in `SESSION_DIARY.md`

If `SESSION_DIARY.md` exists, read it now and report its last entry to the user.

**L2 — Domain patterns (~500 tokens, loaded on demand)**

Load the wing of `../mush-patterns` that matches the current task domain.
This is the corpus load in Step 2 above; structure it here:

| Task domain | Wing to load |
|-------------|-------------|
| Writing a UDF / function | `patterns/functions/` |
| Writing a command | `patterns/commands/` |
| Building a system | `patterns/systems/` + `patterns/functions/` |
| Security audit | `patterns/security/` |
| Writing an installer | `patterns/installers/` |
| Unknown server behavior | `patterns/server-help/` |

Use the `## Signal` block (`USE:` field) of each pattern to decide if it's
relevant. Skip patterns where `USE:` does not match the task.

**L3 — Deep search (on demand, no token budget limit)**

Only drop into L3 if L2 didn't surface a matching pattern:
```bash
grep -r "<keyword>" ../mush-patterns/patterns/
```

Report the search terms used and results found before proceeding.

---

### 3 — Load project manifest

Check for `dist/manifest.json`.

| State | Action |
|-------|--------|
| Exists | Load it. Report: project name, version, object count, last install date. |
| Missing | Report "No manifest found — this appears to be a new project." Do not create it yet (that is `mush-manifest`'s job). |

### 4 — Detect server configuration (ask once, cache for session)

If not already known from manifest, ask the user:

> "What is your server's connection info? (host, port, Wizard username)"
> "What help system does your server use? (e.g. +help with attribute-per-topic, &HELPFILE pointer, custom $help command, or none)"
> "What server type is this? (RhostMUSH, PennMUSH, TinyMUX, other)"

Record answers for use by all skills in this session. Never ask again after the first answer.

### 5 — Verify local RhostMUSH help corpus

Confirm the bundled help files exist and are non-empty:

```bash
wc -l reference/rhost-help.txt reference/rhost-wizhelp.txt
```

Expected: ~37,239 lines (help) and ~16,367 lines (wizhelp). If missing or empty, run:
```bash
curl -sL "https://raw.githubusercontent.com/RhostMUSH/trunk/master/Server/game/txt/help.txt" -o reference/rhost-help.txt
curl -sL "https://raw.githubusercontent.com/RhostMUSH/trunk/master/Server/game/txt/wizhelp.txt" -o reference/rhost-wizhelp.txt
grep "^& " reference/rhost-help.txt | sed 's/^& //' | sort > reference/rhost-help-topics.txt
grep "^& " reference/rhost-wizhelp.txt | sed 's/^& //' | sort > reference/rhost-wizhelp-topics.txt
```

### 6 — Portability check (RhostMUSH)

Run `@config/list` to confirm the server has the softcode functions this project depends on. Compare against any `@@ Requires:` entries in the project's existing installers.

```bash
RHOST_PASS=<pass> node scripts/eval.js "@config/list"
```

Flag any required function that is not listed as enabled. This prevents deploy-time failures when code calls a function the server hasn't compiled in.

### 7 — Verify server reachability

```bash
RHOST_PASS=<pass> node scripts/eval.js "version()"
```

| Result | Action |
|--------|--------|
| Returns version string | Green — server is up. |
| Timeout / error | Warn user. Other skills can still run in offline mode (design, write, package) but deploy/verify phases are blocked. |

### 8a — Read session diary (if exists)

Check for `SESSION_DIARY.md` in the project root.

If it exists, read the last entry and surface:
- What was last worked on
- Any open decisions that were not resolved
- Next steps noted by the previous session

This gives multi-session continuity without relying on context window persistence.
If the diary is empty or missing, continue — it will be written at session end.

---

### 8 — Generate session ID

Generate a unique session ID for this work session using a short prefix + timestamp:

```
SESSION_ID = "ms-" + Date.now().toString(36)
Example:    ms-lzxj4k2
```

This ID travels through all phases and appears in lint/security reports, commit messages, and the session summary. It lets you correlate output from parallel skill runs back to a single session.

### 9 — Report session summary

Print a compact session header:

```
=== MUSH-ARCHITECT SESSION ===
Session:  [session-id]
Project:  [name from manifest, or "new project"]
Version:  [version, or "0.0.0"]
Server:   [host:port] ([server type])
Help:     [help system]
Patterns: [N categories loaded] — [matched/unmatched for current task]
Memory:   L0 cached | L1 loaded | L2 [wing name] | L3 standby
Diary:    [last entry date + first line, or "no prior sessions"]
Status:   [ONLINE / OFFLINE]
==============================
```

Session is now initialized. Proceed to the requested skill.

---

### Session diary protocol

The session diary (`SESSION_DIARY.md` in the project root) is a rolling
log of what happened in each session. Write to it at the **end** of
every session (or when the PreCompact hook fires).

Each entry format:

```markdown
## Session [SESSION_ID] — [ISO date]

**Built/modified:** [one-line summary of what was done]
**Decisions:** [key decisions made, with brief rationale]
**Tests:** [green / red / not-run]
**Patterns extracted:** [list of ids, or "none"]
**Open questions:** [anything unresolved for next session]
**Next steps:** [what to do next session to continue]
```

Prepend new entries at the top of the file (newest first).
Keep entries brief — this is a navigation aid, not a log file.

## Session state (carry through all skills)

| Variable | Set from |
|----------|----------|
| `SESSION_ID` | Step 8 — generated once per session |
| `SERVER_HOST` | User input or manifest (L0) |
| `SERVER_PORT` | User input or manifest (L0) |
| `SERVER_TYPE` | User input or manifest (L0) |
| `HELP_SYSTEM` | User input or manifest (L0) |
| `PROJECT_NAME` | Manifest or first `@create` in session (L0) |
| `PROJECT_VERSION` | Manifest (L0) |
| `CORPUS_LOADED` | Step 2 + L2 confirmation |
| `MEMORY_LAYER` | Current highest layer loaded (L0/L1/L2/L3) |
| `SERVER_ONLINE` | Step 7 reachability check |
| `PRIOR_SESSION` | SESSION_DIARY.md last entry (L1) |

## Mandatory

No other mush-* skill may begin work until `/mush-session` has completed with all steps green (or offline mode explicitly acknowledged by user).
