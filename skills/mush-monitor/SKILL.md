---
name: mush-monitor
description: "Monitor a live RhostMUSH server — check connectivity, queue depth, player count, memory usage, error log tail, and attribute health. Read-only diagnostic."
disable-model-invocation: true
effort: low
argument-hint: "[check to run, or leave blank for full status]"
date_added: "2026-03-28"
---

> **Act immediately. Run all checks, report status. Do not modify anything.**

# mush-monitor

Read-only diagnostic tool for a live RhostMUSH server. Checks connectivity, player count, queue depth, error logs, and attribute health. All checks are non-destructive.

## Phase 1 — Connectivity check

```bash
RHOST_PASS=<pass> node scripts/eval.js "1+1"
```

If this returns `2`, the server is reachable. If it fails, report the error and stop.

## Phase 2 — Server status

```bash
@@ Player count:
RHOST_PASS=<pass> node scripts/eval.js "lwho()"

@@ Connected wizards:
RHOST_PASS=<pass> node scripts/eval.js "iter(lwho(), if(hasflag(##,WIZARD),##,))"

@@ Server uptime (if available):
RHOST_PASS=<pass> node scripts/eval.js "convsecs(sub(secs(), config(starttime)))"

@@ Current queue depth (approximation via @ps):
@@ (use @ps if exposed, otherwise note as unavailable)
```

## Phase 3 — Object health

Check key objects from the manifest (if available):

```bash
@@ Verify objects exist and are accessible:
RHOST_PASS=<pass> node scripts/eval.js "get(#<dbref>/VER)"

@@ Check attribute count on key objects:
RHOST_PASS=<pass> node scripts/eval.js "words(lattr(#<dbref>))"
```

Report:
- Object exists and VER matches manifest: `OK`
- Object exists but VER mismatch: `DRIFT — expected <a>, got <b>`
- Object missing or inaccessible: `MISSING`

## Phase 4 — Error log tail

```bash
@@ Tail the server error log if accessible:
tail -n 50 <server_log_path>

@@ Or use the configured log path from package.json / .env
```

Flag any lines containing:
- `PANIC` — critical server error
- `SYSERR` — system error
- `UNIMPLEMENTED` — missing function
- `recursion limit` — code hitting recursion cap
- `invocation limit` — code hitting function cap

## Phase 5 — Produce status report

```
=== MUSH MONITOR: <project> ===
Timestamp:    <ISO timestamp>
Server:       <host>:<port>

CONNECTIVITY:   OK  (eval roundtrip 42ms)
PLAYER COUNT:   7 connected (2 wizards)
UPTIME:         3d 14h 22m

OBJECT HEALTH:
  #42  My System <sys>     OK  (VER=1.2.0)
  #43  My Config <cfg>     OK  (VER=1.2.0)
  #44  My Data <dat>       DRIFT  (expected VER=1.2.0, got VER=1.1.0)

ERROR LOG (last 50 lines):
  No PANIC / SYSERR found.
  1 invocation limit warning at 2026-03-28 04:12:17

OVERALL STATUS:  WARN
  ⚠ #44 My Data has drifted from expected version
  ⚠ Invocation limit hit — investigate CMD_HEAVY_PROCESS
=====================================
```

## Status levels

| Level | Meaning |
|-------|---------|
| `OK` | All checks passed |
| `WARN` | Minor issues found — review recommended |
| `ERROR` | Critical issue — action required |
| `OFFLINE` | Server unreachable |

## Usage variants

```
/mush-monitor              Full status report
/mush-monitor connectivity  Connectivity check only
/mush-monitor objects       Object health only
/mush-monitor logs          Error log tail only
/mush-monitor players       Player count and connected wizards
```

## Rules

- Never write to the server during a monitor run
- If the manifest is missing, skip object health check and note it
- Log file path is read from `package.json` `scripts.logfile` or `.env LOG_PATH`
- If no log path is configured, skip Phase 4 and note it
- Always report timestamp so status checks can be compared over time
