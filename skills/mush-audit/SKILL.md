---
name: mush-audit
description: "Compare live server state against dist/manifest.json. Finds orphaned attributes, missing objects, version drift, and objects on the server not tracked in the manifest."
disable-model-invocation: true
effort: high
argument-hint: "[object name, dbref, or 'all']"
date_added: "2026-03-28"
---

> **Act immediately. Connect, compare, report findings by severity. Do not modify anything.**

# mush-audit

Audit the live server against `dist/manifest.json`. Produces a drift report: what's changed, what's missing, what's untracked. Read-only — never modifies the server or manifest without explicit user approval.

## When to use

- Before a patch or upgrade — confirm the server matches the manifest baseline
- After an outage or manual hotfix — find what changed outside of mush-architect
- Routine health check — catch drift before it becomes a problem
- After inheriting a codebase — map what's actually installed

## Phase 1 — Load manifest

Read `dist/manifest.json`. If missing, stop and recommend `/mush-export` first.

## Phase 2 — Query live server

For each object in the manifest:

```bash
# Verify object exists
RHOST_PASS=<pass> node scripts/eval.js "search(name=<ObjectName>)"

# Pull live attribute list
RHOST_PASS=<pass> node scripts/eval.js "lattr(#DBREF)"

# Pull each attribute body and compute SHA-256
RHOST_PASS=<pass> node scripts/eval.js "get(#DBREF/ATTR_NAME)"
```

## Phase 3 — Compare and classify

Compare every finding against the manifest:

| Status | Meaning |
|--------|---------|
| `MATCH` | Attribute body checksum matches manifest |
| `DRIFT` | Attribute exists but checksum differs — modified live |
| `MISSING` | Attribute in manifest but not on server |
| `UNTRACKED` | Attribute on server but not in manifest |
| `OBJECT_MISSING` | Object in manifest not found on server |
| `DBREF_CHANGED` | Object found by name but at a different dbref |

## Phase 4 — Produce drift report

```
=== AUDIT REPORT: my-cool-system ===
Manifest version: 0.2.0
Audited: 2026-03-28 14:30:00

OBJECT_MISSING  (1)
  ✗ My Help <hlp>  — in manifest as #43, not found on server

DBREF_CHANGED  (0)

DRIFT  (3)
  ~ #42/FN_FOO       manifest: sha256:abc123  live: sha256:def456
  ~ #42/CMD_BAR      manifest: sha256:111aaa  live: sha256:222bbb
  ~ #42/VER          manifest: 0.2.0          live: 0.1.0

MISSING  (2)
  ✗ #42/FN_NEWSTUFF  — in manifest, not on server
  ✗ #42/HELP_FOO     — in manifest, not on server

UNTRACKED  (4)
  ? #42/HOTFIX_001   — on server, not in manifest
  ? #42/HOTFIX_002   — on server, not in manifest
  ? #42/TMP_DEBUG    — on server, not in manifest
  ? #42/OLD_CMD_BAR  — on server, not in manifest

MATCH  (9)  — 9 attributes match manifest exactly

Summary: 1 missing object, 3 drifted, 2 missing attrs, 4 untracked, 9 clean
=====================================
```

## Phase 5 — Recommendations

After the report, recommend actions for each finding:

| Finding | Recommended action |
|---------|-------------------|
| `DRIFT` | Review the live change — was it intentional? If yes: `/mush-export` then `/mush-patch`. If no: `/mush-install` to restore. |
| `MISSING` | Run `/mush-patch` to push missing attributes |
| `UNTRACKED` | Review each — if keeper: `/mush-export` to capture; if trash: `@del` manually |
| `OBJECT_MISSING` | Re-run installer or investigate — object was destroyed |
| `DBREF_CHANGED` | Run `/mush-manifest sync` to update manifest dbrefs |

## Rules

- Never modify the server during audit — report only
- Never auto-resolve drift — present findings and let the user decide
- Untracked attributes get `?` prefix in report — they may be legitimate hotfixes or may be garbage
- DRIFT on `VER` attribute is always highlighted — version mismatch is the most important signal
