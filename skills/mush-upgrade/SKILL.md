---
name: mush-upgrade
description: "Upgrade a deployed RhostMUSH softcode system from one version to another — diff manifest, generate migration patch, apply to live server, verify."
disable-model-invocation: true
effort: high
argument-hint: "[current version] [target version], e.g. '1.1.0 1.2.0'"
date_added: "2026-03-28"
---

> **Do not touch the live server until Phase 4, after the user has reviewed and confirmed the patch.**

# mush-upgrade

Managed version upgrade for a deployed softcode system. Diffs two manifest snapshots, generates a migration patch installer, applies it to the live server, and verifies the result. Safer than a full reinstall — only touches what changed.

## Phase 1 — Determine upgrade scope

```bash
@@ Check current live version:
RHOST_PASS=<pass> node scripts/eval.js "get(#<dbref>/VER)"

@@ Check target version in dist/manifest.json:
cat dist/manifest.json | jq '.version'

@@ Run audit to see current drift:
/mush-audit
```

If no live version is found, recommend a fresh install via `/mush-build` instead of an upgrade.

## Phase 2 — Generate migration patch

Run `/mush-patch <current_version> <target_version>` which produces:

```
dist/<project>.patch.<old>-<new>.txt
```

The patch file contains three sections:

```mushcode
@@ ===[ DELETIONS ]===
@@ Attributes removed in new version:
@wipe #<dbref>/OLD_ATTR

@@ ===[ CHANGES ]===
@@ Attributes modified in new version:
&CHANGED_ATTR #<dbref>= <new value>

@@ ===[ NEW ]===
@@ Attributes added in new version:
&NEW_ATTR #<dbref>= <value>

@@ ===[ OBJECT CHANGES ]===
@@ New objects to create (if any):
@create New Object <no>
@set New Object <no>=inherit safe
```

## Phase 3 — Pre-upgrade review

Present the patch summary to the user:

```
=== UPGRADE PLAN: <project> v<old> → v<new> ===

DELETIONS (3):
  #42/OLD_HELPER — no longer used
  #42/DEPRECATED_CMD — replaced by CMD_NEW
  #43/TEMP_DATA — migration artifact

CHANGES (7):
  #42/CMD_FROBNITZ — updated input validation
  #42/FN_VALIDATE_ARG — added isnum() guard
  ... (5 more)

NEW (2):
  #42/CMD_NEW_FEATURE — new feature command
  #43/D_NEW_CONFIG — new config parameter

OBJECT CHANGES:
  None

ESTIMATED DOWNTIME: <1 minute (attribute writes only, no object recreation)

ROLLBACK: dist/<project>.rollback.<old>.txt
          (run this to return to v<old> state)
```

**Stop here and wait for explicit user confirmation before proceeding.**

## Phase 4 — Apply the patch

Only after user confirms:

```bash
@@ Apply patch to live server:
RHOST_PASS=<pass> node scripts/install.js dist/<project>.patch.<old>-<new>.txt
```

Monitor output for errors. If any line returns `#-1` or an error string, halt and report.

## Phase 5 — Post-upgrade verification

```bash
@@ Verify new version:
RHOST_PASS=<pass> node scripts/eval.js "get(#<dbref>/VER)"

@@ Run audit to confirm drift is resolved:
/mush-audit

@@ Run smoke tests:
npm run test -- --grep "smoke"
```

## Phase 6 — Update manifest

```bash
@@ Sync manifest to post-upgrade state:
/mush-manifest sync
```

## Phase 7 — Report

```
=== UPGRADE COMPLETE: <project> ===

v<old> → v<new>

APPLIED:
  3 deletions
  7 changes
  2 new attributes

VERIFICATION:
  VER attribute: v<new>  ✓
  Audit: 0 DRIFT, 0 MISSING  ✓
  Smoke tests: 12/12 passing  ✓

NEXT STEPS:
  - Monitor /mush-monitor for the next hour
  - Keep dist/<project>.rollback.<old>.txt until stable
=====================================
```

## Rollback from failed upgrade

If the upgrade fails partway through:

```bash
@@ Apply the old-version rollback:
RHOST_PASS=<pass> node scripts/install.js dist/<project>.rollback.<old>.txt
```

Then investigate what went wrong before retrying.

## Rules

- Never apply a patch to a live server without user confirmation at Phase 3
- Always generate and verify the rollback file exists before starting Phase 4
- If the audit shows the live server already matches the target version, report "already up to date" and stop
- If objects need to be recreated (dbref changed), warn that dbrefs in other systems may need updating
- Major version upgrades (1.x → 2.x) may require manual migration steps — flag these prominently
