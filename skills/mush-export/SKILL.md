---
name: mush-export
description: "Pull existing softcode off a live RhostMUSH server into local src/ files. Use when inheriting a codebase, backing up live code, or reverse-engineering an installed system."
disable-model-invocation: true
effort: high
argument-hint: "[object name or dbref to export]"
date_added: "2026-03-28"
---

> **Act immediately. Connect, pull, write files, report. Do not narrate.**

# mush-export

Reverse of `/mush-install`. Pulls softcode off a live server and writes it into the local `src/` directory structure, creating or updating `dist/manifest.json` with discovered dbrefs.

## When to use

- Inheriting an existing game's codebase
- Backing up live code before a risky change
- Bootstrapping a manifest for a system that was installed without mush-architect
- Recovering src/ files after they were lost

## Phase 1 — Identify what to export

Ask the user (if not provided):
> "What do you want to export? Provide object name(s), dbref(s), or 'all' for the full codebase."

For each target, resolve the dbref:
```bash
RHOST_PASS=<pass> node scripts/eval.js "search(name=<ObjectName>)"
```

## Phase 2 — Pull attribute list

For each object:
```bash
RHOST_PASS=<pass> node scripts/eval.js "lattr(#DBREF)"
```

Categorize attributes by prefix:

| Prefix pattern | Category | Output file |
|---------------|---------|------------|
| `FN_*`, `UDF_*` | UDFs | `src/functions.mush` |
| `CMD_*`, `$`-triggered | Commands | `src/commands.mush` |
| `D_*`, `CONF_*`, `VER` | Config/data | `src/config.mush` |
| `HELP*` | Help | `src/help.mush` |
| `_LINE*` | Admin config lines | `src/admin-config.mush` |
| Everything else | Misc | `src/misc.mush` |

## Phase 3 — Pull each attribute value

```typescript
import { RhostClient } from '@rhost/testkit';
const client = new RhostClient({ host: 'localhost', port: 4201 });
await client.connect();
await client.login('Wizard', PASS);

const attrs = await client.eval(`lattr(#${dbref})`);
for (const attr of attrs.split(' ')) {
    const value = await client.eval(`get(#${dbref}/${attr})`);
    // write to appropriate src/ file
}
```

## Phase 4 — Write src/ files

Format each attribute in expanded, human-readable source format:

```mushcode
@@ Object: [Object Name] (#DBREF)
@@ Exported: [date]

@@ ---[ FUNCTIONS ]---

&FN_EXAMPLE #DBREF=
  [if(not(%0), #-1 MISSING ARG,
    <body>
  )]

@@ ---[ COMMANDS ]---

&CMD_EXAMPLE #DBREF=$+example *:
  @pemit %#=[%0]
```

Rules:
- Use the actual dbref in attribute lines (not object name) — manifest will track names
- Preserve the exact attribute body, no modifications
- Add `@@ Exported: [date]` comment at top of each file
- If `src/` files already exist, **ask before overwriting** — show a diff summary first

## Phase 5 — Update manifest

Run `/mush-manifest init` or `sync` to record all discovered objects and attributes with their current checksums.

## Phase 6 — Report

```
=== EXPORT COMPLETE ===
Objects exported:    3
  #42  My System <sys>      14 attributes
  #43  My Help <hlp>         8 attributes
  #44  My Config <cfg>       5 attributes
Total attributes:   27

Files written:
  src/config.mush      (5 attrs)
  src/functions.mush   (8 attrs)
  src/commands.mush    (6 attrs)
  src/help.mush        (8 attrs)

Next: run /mush-manifest sync to record dbrefs, then /mush-lint to check for issues.
======================
```

## Notes

- Export does NOT modify the server — read-only operation
- Attribute bodies are pulled verbatim — run `/mush-explain` if you need them annotated
- For large codebases (100+ attrs), this may take several minutes due to per-attr queries
- After export, run `/mush-audit` to verify the local files match what's live
