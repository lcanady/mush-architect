---
name: mush-config
description: "Read, set, and persistently save RhostMUSH server config parameters using @admin and the admin_object pattern. Use when tuning server limits, enabling features, or managing rhost_ingame.conf."
disable-model-invocation: true
effort: medium
argument-hint: "[param=value | read param | list | save | execute]"
date_added: "2026-03-28"
---

> **Act immediately. Execute the requested config operation and report the result.**

# mush-config

Dedicated workflow for RhostMUSH server configuration. Wraps `@admin`, `config()`, and the `admin_object` / `rhost_ingame.conf` persistence pattern so config changes survive reboots.

See pattern: `mush-patterns/patterns/systems/rhost-config-admin-001.md`

## Operations

### `read <param>` — read current value

```bash
RHOST_PASS=<pass> node scripts/eval.js "config(<param>)"
```

Output: current live value, whether it differs from the default, and where it's set (conf file or @admin).

### `set <param>=<value>` — set live (not persistent)

```bash
RHOST_PASS=<pass> node scripts/eval.js "@admin <param>=<value>"
```

**Always warn:** this change is lost on reboot. Prompt: "Save to rhost_ingame.conf? (y/n)"

### `save <param>=<value>` — set and persist

1. Set live: `@admin <param>=<value>`
2. Find the next available `_LINE#` on the admin_object
3. Set the attribute: `&_LINE[N] #<admin_obj>=<param> <value>`
4. Run `@admin/save` to write `rhost_ingame.conf`
5. Verify with `@admin/list`

### `remove <param>` — remove from rhost_ingame.conf

1. Find which `_LINE#` holds the param: `grep <param>` the `@admin/list` output
2. Delete that attribute from the admin_object
3. Renumber remaining `_LINE#` attrs to close the gap (no gaps allowed)
4. Run `@admin/save`
5. Verify with `@admin/list`

### `list` — show all persisted params

```bash
RHOST_PASS=<pass> node scripts/eval.js "@admin/list"
```

Shows everything currently in `rhost_ingame.conf`.

### `execute` — apply all persisted params now

```bash
RHOST_PASS=<pass> node scripts/eval.js "@admin/execute"
```

Equivalent to running every `@admin param=value` in `rhost_ingame.conf`. Use after `/load` or after a `@reboot` that didn't pick up changes.

### `check` — verify admin_object is configured

Confirm:
1. `config(admin_object)` returns a valid dbref
2. That object exists and is owned by an Immortal
3. `_LINE*` attributes are sequential (no gaps)
4. `netrhost.conf` contains `include rhost_ingame.conf`

Report pass/fail for each check.

## Common config params quick-set

```
/mush-config save function_invocation_limit=100000
/mush-config save function_recursion_limit=100
/mush-config save player_queue_limit=500
/mush-config save wizard_queue_limit=1000
/mush-config save idle_timeout=-1
/mush-config save sideeffects=SET CREATE EMIT OEMIT NAME
/mush-config save master_room=#<dbref>
/mush-config save global_error_obj=#<dbref>
```

## First-time setup (no admin_object configured)

If `config(admin_object)` returns `-1`, walk the user through one-time setup:

1. Create the admin object (must be Immortal-owned)
2. Note the dbref
3. Tell the user to add to `netrhost.conf`:
   ```
   admin_object #<dbref>
   include rhost_ingame.conf
   ```
4. `@reboot` the server
5. Return here to verify with `check`

## Rules

- Never set a param without confirming whether it should be persisted
- Always verify `@admin/list` after a save to confirm the write succeeded
- Never leave gaps in `_LINE#` numbering — they stop the load at the gap
- Maximum 1000 `_LINE#` attributes — warn if approaching this limit
- Some params are shell-only — if `@admin` skips a param with a warning, note it in the report

## See also

- `wizhelp @admin` — full command reference (local: `reference/rhost-wizhelp.txt`)
- `wizhelp admin_object` — setup instructions
- `wizhelp config parameters` — full param list
- Pattern: `mush-patterns/patterns/systems/rhost-config-admin-001.md`
- Pattern: `mush-patterns/patterns/server-help/rhost-config-params-001.md`
