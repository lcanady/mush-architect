---
name: mush-rollback
description: Generate and execute a rollback installer to remove a deployed MUSH system from a live server. Use when uninstalling, removing, or reverting a softcode installation.
disable-model-invocation: true
effort: medium
argument-hint: "[project or object to roll back]"
date_added: "2026-03-28"
---

> **Rollback destroys live objects. Confirm with the user before executing. Generate first, execute only on explicit approval.**

# mush-rollback

Generate a rollback installer that undoes a previous `/mush-build` + `/mush-install` session. Removes objects, attributes, and help entries cleanly.

## When to use

- Removing a system entirely from the server
- Reverting a bad install before re-running a corrected installer
- Cleaning up test objects after a failed build

## Phase 1 — Source the teardown list

Read `dist/manifest.json`. If no manifest exists, ask the user to provide:
- Object names and dbrefs to destroy
- Help object dbrefs and attribute names to delete

Never guess dbrefs. Always confirm with the user before generating destruction commands.

## Phase 2 — Generate rollback installer

Write to `dist/[project].rollback.txt`. Follows the same header/footer/section rules as the main installer (Figlet, metadata block, 78-char separators, `[END OF FILE]`), with these differences in the metadata block:

```
@@ Mushcode ROLLBACK for: [Project Name]
@@ Version: [version being removed]
@@ WARNING: This will permanently destroy objects listed below.
@@ Objects to be destroyed:
@@   - [Object Name] (#dbref)
```

### Rollback file structure

```
@@ [Figlet header]
@@ [metadata block with ROLLBACK label]

@@ ------------------------------[ PRE-CHECK ]--------------------------------
@@ Verify objects exist before destroying
think search(name=[Object Name])

@@ ------------------------------[ ATTRIBUTES ]-------------------------------
@@ Remove individual attributes first (in case you want to keep the object)
@del #[dbref]/FN_FOO
@del #[dbref]/CMD_BAR

@@ --------------------------------[ HELP ]-----------------------------------
@@ Remove help attributes
@del #[helpdbref]/HELP_FOO
@del #[helpdbref]/HELP_BAR

@@ ------------------------------[ OBJECTS ]---------------------------------
@@ Destroy objects last
@destroy #[dbref]
@destroy #[helpdbref]

@@ ----------------------------[ POST-CHECK ]----------------------------------
@@ Confirm objects are gone
think search(name=[Object Name])
@@   Expected result: #-1

@@
@@ ===========================================================================
@@ ROLLBACK COMPLETE — run /mush-manifest to update dist/manifest.json
@@ ===========================================================================
@@ [END OF FILE]
```

## Phase 3 — Confirm before executing

**Always show the user the generated rollback installer and ask:**

> "This will permanently destroy: [list objects and dbrefs]. Proceed?"

Do not execute until the user says yes.

## Phase 4 — Execute (if approved)

```bash
RHOST_PASS=<pass> node scripts/eval.js "@destroy #[dbref]"
```

Execute each destruction command individually and report success/failure for each.

## Phase 5 — Update manifest

After successful execution, run `/mush-manifest` to remove the destroyed objects from `dist/manifest.json`.

## Phase 6 — Verify

Confirm each destroyed object no longer exists:

```bash
RHOST_PASS=<pass> node scripts/eval.js "search(name=[Object Name])"
```

Expected: `#-1` or empty. If the object still exists, report it and do not mark the rollback complete.

## Safety rules

- Never run `@destroy` without a confirmed dbref from the manifest or live server search
- Never destroy the `#1` object or any object with the `SAFE` flag set without explicit user confirmation
- If any destruction fails, stop and report — do not continue destroying other objects
- `@del` individual attributes before `@destroy` — this preserves the option to keep the object shell
- Always generate the rollback file before executing, even for simple single-object teardowns
