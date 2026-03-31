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
Patterns: [N categories loaded]
Status:   [ONLINE / OFFLINE]
==============================
```

Session is now initialized. Proceed to the requested skill.

## Session state (carry through all skills)

| Variable | Set from |
|----------|----------|
| `SESSION_ID` | Step 8 — generated once per session |
| `SERVER_HOST` | User input or manifest |
| `SERVER_PORT` | User input or manifest |
| `SERVER_TYPE` | User input or manifest |
| `HELP_SYSTEM` | User input or manifest |
| `PROJECT_NAME` | Manifest or first `@create` in session |
| `PROJECT_VERSION` | Manifest |
| `CORPUS_LOADED` | Step 2 confirmation |
| `SERVER_ONLINE` | Step 7 reachability check |

## Mandatory

No other mush-* skill may begin work until `/mush-session` has completed with all steps green (or offline mode explicitly acknowledged by user).
