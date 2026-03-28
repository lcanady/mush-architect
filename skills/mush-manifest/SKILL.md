---
name: mush-manifest
description: Create and maintain dist/manifest.json tracking all objects, dbrefs, and attribute checksums. Use after installs, patches, or rollbacks to keep the manifest current.
disable-model-invocation: true
effort: low
argument-hint: "[init|sync|checksum|report]"
date_added: "2026-03-28"
---

> **Act immediately. Write or update the manifest, report changes, stop. Do not narrate.**

# mush-manifest

Track every object, dbref, and attribute this project has ever installed. The manifest is the source of truth for `mush-patch` (diffs), `mush-rollback` (teardown), and `mush-session` (project state).

## File location

`dist/manifest.json` — committed to version control alongside installers.

## Manifest schema

```json
{
  "project": "my-cool-system",
  "version": "0.1.0",
  "server_type": "RhostMUSH",
  "last_install": "2026-03-28T00:00:00Z",
  "authors": ["Author Name"],
  "repo": "https://github.com/owner/repo",
  "objects": [
    {
      "name": "My Cool System <sys>",
      "dbref": "#42",
      "type": "thing",
      "flags": ["inherit", "safe"],
      "lock": "#1",
      "role": "Main system object",
      "attributes": [
        {
          "name": "FN_FOO",
          "type": "udf",
          "checksum": "sha256:<hash>",
          "version_added": "0.1.0",
          "version_modified": "0.1.0"
        },
        {
          "name": "CMD_BAR",
          "type": "command",
          "checksum": "sha256:<hash>",
          "version_added": "0.1.0",
          "version_modified": "0.1.0"
        }
      ]
    }
  ],
  "help_objects": [
    {
      "name": "My Cool Help <hlp>",
      "dbref": "#43",
      "attributes": ["HELP_FOO", "HELP_BAR"]
    }
  ],
  "installers": [
    {
      "file": "dist/my-cool-system.installer.txt",
      "version": "0.1.0",
      "installed": "2026-03-28T00:00:00Z",
      "checksum": "sha256:<hash>"
    }
  ]
}
```

## When to run mush-manifest

| Trigger | Action |
|---------|--------|
| New project (no manifest exists) | Create manifest from the current installer file |
| After `/mush-build` completes | Update attribute checksums and version fields |
| After `/mush-install` completes | Record dbrefs, set `last_install` timestamp |
| After `/mush-rollback` completes | Remove destroyed objects from manifest |
| After `/mush-patch` completes | Bump version, update modified attributes |

## Commands

### `init` — create manifest from installer

Parse `dist/[project].installer.txt` to extract:
- All `@create` → objects list
- All `&ATTR` → attributes list per object
- All `@set` flags
- All `@lock` entries

Write `dist/manifest.json`. Report object count and attribute count.

### `sync` — update dbrefs after install

After a live install, read actual dbrefs from the server and write them into the manifest:

```bash
RHOST_PASS=<pass> node scripts/eval.js "search(name=My Cool System <sys>)"
```

Update `objects[n].dbref` with the result.

### `checksum` — update attribute checksums

Re-read the current installer, recompute SHA-256 for each attribute body, update `version_modified` for any that changed.

### `report` — print manifest summary

```
Project:    my-cool-system v0.1.0
Objects:    2 (dbrefs: #42, #43)
Attributes: 14 (8 UDFs, 4 commands, 2 help)
Installed:  2026-03-28
Installer:  dist/my-cool-system.installer.txt
```

## Rules

- Never delete dbref entries from manifest without running `/mush-rollback` first
- `checksum` field uses SHA-256 of the raw attribute body (not the `&ATTR obj=` line)
- `version_modified` updates on any change; `version_added` never changes after creation
- Manifest must be committed to git before any deploy — it is part of the release artifact
