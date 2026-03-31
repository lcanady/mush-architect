---
name: mush-patch
description: Generate a minimal patch installer containing only changed attributes since the last version. Use when upgrading an existing installed system without full reinstall.
disable-model-invocation: true
effort: medium
paths: "**/*.mush,**/src/**,**/dist/**"
argument-hint: "[old-version] [new-version]"
date_added: "2026-03-28"
---

> **Act immediately. Diff the manifest, generate the patch, report what changed. Do not regenerate the full installer.**

# mush-patch

Generate a minimal patch installer containing only what changed since the last install. Avoids re-running every attribute on a live server — critical for large systems where full reinstall causes downtime or side effects.

## When to use

- Fixing a bug in one or two attributes after a full install
- Shipping a new feature to an already-running system
- Incrementing a version without touching unrelated code

## Phase 1 — Load manifest

Read `dist/manifest.json`. If missing, stop: a full install must run first (`/mush-build` + `/mush-install`).

Extract:
- Current version (e.g. `0.1.0`)
- All attribute checksums

## Phase 2 — Compute diff

For every attribute in the current working softcode:
1. Compute SHA-256 of the attribute body
2. Compare to `manifest.json` checksum for that attribute

Classify each attribute:

| Status | Meaning |
|--------|---------|
| `CHANGED` | Checksum differs — include in patch |
| `NEW` | Not in manifest at all — include in patch |
| `DELETED` | In manifest but not in current code — include `@del` in patch |
| `UNCHANGED` | Checksums match — omit from patch |

Report the diff summary before writing the patch:

```
Patch diff for my-cool-system 0.1.0 → 0.2.0:
  CHANGED:    FN_FOO, CMD_BAR
  NEW:        FN_NEWSTUFF
  DELETED:    FN_OLDTHING
  UNCHANGED:  12 attributes (omitted)
```

Ask user to confirm before writing the patch file.

## Phase 3 — Determine new version

Ask the user:

> "What is the new version? (current: 0.1.0)"

If the user says "bump patch / minor / major", apply semver rules:
- Patch bump (bug fix, no new commands): `0.1.0 → 0.1.1`
- Minor bump (new UDF or command, backwards compatible): `0.1.0 → 0.2.0`
- Major bump (breaking change, removed commands, restructured objects): `0.1.0 → 1.0.0`

## Phase 4 — Generate patch installer

Write to `dist/[project].patch.[old]-[new].txt` (e.g. `my-cool-system.patch.0.1.0-0.2.0.txt`).

Follows all standard installer formatting rules (metadata block, 78-char separators, sections, footer), with patch-specific metadata:

```
@@ Mushcode PATCH for: [Project Name]
@@ Patches: 0.1.0 → 0.2.0
@@ Changed: [N] attributes
@@ New:     [N] attributes
@@ Deleted: [N] attributes
```

### Patch file structure

```
@@ [metadata block]

@@ ----------------------------[ DELETIONS ]----------------------------------
@@ Remove attributes that no longer exist
@del #[dbref]/FN_OLDTHING

@@ ----------------------------[ CHANGES ]------------------------------------
@@ Update changed attributes
&FN_FOO #[dbref]= [new body]
&CMD_BAR #[dbref]= [new body]

@@ --------------------------------[ NEW ]------------------------------------
@@ Add new attributes
&FN_NEWSTUFF #[dbref]= [body]

@@ [footer]
```

## Phase 5 — Update help (if needed)

If any changed or new attribute has a corresponding help entry, generate a matching patch in `help/[project].help.patch.[old]-[new].txt` using the same diff approach.

Also update `help/help.txt` with the new/changed entries.

## Phase 6 — Update manifest

After the patch is confirmed and installed, run `/mush-manifest checksum` to update all checksums and bump `version` to the new value. Add a record to `installers[]` for the patch file.

## Phase 7 — Update main installer

Merge the patch back into `dist/[project].installer.txt` so it stays current for future fresh installs. Increment the version in the header and add a `@@ CHANGED:` entry.

## Rules

- Never include UNCHANGED attributes in a patch — the whole point is minimal surface area
- Always diff against manifest checksums, not file timestamps
- Patch files are cumulative records — never delete them from `dist/`
- If dbrefs changed since the manifest was written, stop and alert the user — dbrefs must be re-synced via `/mush-manifest sync` before patching
