---
name: mush-hook
description: "Build and manage RhostMUSH @hook systems — before/after/permit/ignore/fail hooks on commands and attributes stored on the hook_obj. Distinct from Claude Code hooks (mush-hooks)."
effort: high
paths: "**/*.mush,**/src/**"
argument-hint: "[command to hook, or 'list' to show existing hooks]"
date_added: "2026-03-28"
---

> **Act immediately. Design the hook, write the attributes, report. Do not confuse RhostMUSH @hook with Claude Code hooks.**

# mush-hook

Build, document, and manage RhostMUSH's `@hook` system. Hooks intercept built-in commands to add before/after behavior, restrict access, or replace failure messages — without modifying the command itself.

## RhostMUSH hook attribute naming

All hooks live on the object specified by `config(hook_obj)`. Attribute names follow this convention:

| Prefix | Hook type | When it fires |
|--------|-----------|--------------|
| `B_<CMD>` | before | Before the command executes — can cancel |
| `A_<CMD>` | after | After the command executes |
| `P_<CMD>` | permit | Lock expression — if false, command is denied |
| `I_<CMD>` | ignore | If true, command is silently ignored |
| `AF_<CMD>` | fail | Fires instead of the default "permission denied" |
| `AO_<CMD>` | after-offline | Fires after connect-screen commands |
| `M_<CMD>` | mogrify | Rewrites command output before display |

## Phase 1 — Check hook_obj is configured

```bash
RHOST_PASS=<pass> node scripts/eval.js "config(hook_obj)"
```

If `-1`, the hook system is not set up. Walk the user through:

```mushcode
@create Hook Object <hk>
@set Hook Object <hk>=inherit safe
@fo me=&D.HOOKOBJ me=search(name=Hook Object <hk>)
@@(then in netrhost.conf or via @admin:)
@admin hook_obj=#<dbref>
@admin/save
```

## Phase 2 — Design the hook

Ask:
1. Which command are you hooking? (e.g. `@pemit`, `say`, `page`, `+cmd`)
2. What type of hook? (before/after/permit/ignore/fail/mogrify)
3. What should it do?

Look up the command in `reference/rhost-wizhelp.txt` to understand its percent substitutions and behavior before writing the hook.

## Phase 3 — Write the hook attribute

### Before hook — fires before the command, can cancel it

```mushcode
@@ B_ hooks receive %# (enactor), %0 (command args), %1+ (additional)
&B_SAY #<hook_obj>=
  @switch/first 1=
    isstaff(%#), ,
    @@(cancel command by emitting and returning false-ish — see wizhelp sub_override)
    @pemit %#=You cannot speak here.
```

### After hook — fires after successful execution

```mushcode
&A_PAGE #<hook_obj>=
  @log Page from %# to %0: [secure(%1)]
```

### Permit hook — lock expression, false = deny command

```mushcode
@@(P_ hooks are lock expressions — evaluated like @lock)
&P_+MYCOMMAND #<hook_obj>=isstaff(%#)|flag(%#,wizard)
@@(if returns false/0, command is denied with default or AF_ message)
```

### Fail hook — custom denial message

```mushcode
&AF_+MYCOMMAND #<hook_obj>=
  @pemit %#=%chYou don't have permission to use +mycommand.%cn
```

### Ignore hook — silently swallow the command

```mushcode
&I_WHISPER #<hook_obj>=isguest(%#)
@@(if true, whisper silently does nothing for guests)
```

### Mogrify hook — rewrite output before display

```mushcode
&M_SAY #<hook_obj>=
  [ansi(cy,%0)]
@@(%0 is the text being output — return modified version)
```

## Phase 4 — Install the hook

```bash
RHOST_PASS=<pass> node scripts/eval.js "&B_SAY #<hook_obj>=..."
```

Verify it's set:
```bash
RHOST_PASS=<pass> node scripts/eval.js "get(#<hook_obj>/B_SAY)"
```

## Phase 5 — Test the hook

Write a `@rhost/testkit` test:

```typescript
it('B_SAY blocks non-staff from speaking', async ({ client, expect }) => {
    // Switch to a non-staff character and attempt say
    await client.command('@switch me=isstaff(me),@pemit me=SKIP,say test message');
    // verify hook fired
});
```

## Phase 6 — Document in src/

Add the hook to `src/commands.mush` under a `@@ ---[ HOOKS ]---` section. Include in the installer.

## Hook naming for softcoded commands

For `$`-triggered commands on softcode objects (not built-ins), the hook attribute uses the trigger pattern with special characters normalized:

```
$+mycommand * → attribute name: B_+MYCOMMAND
$+foo/bar *   → attribute name: B_+FOO/BAR
```

## Common hook recipes

### Log all uses of a command
```mushcode
&A_@BOOT #<hook_obj>=
  @log [convsecs(secs())] %N(%#) used @boot on %0
```

### Block guests from paging
```mushcode
&P_PAGE #<hook_obj>=not(isguest(%#))
&AF_PAGE #<hook_obj>=@pemit %#=Guests cannot page.
```

### Add timestamp to all @pemit output
```mushcode
&M_@PEMIT #<hook_obj>=[time()] %0
```

## Rules

- Always check `config(hook_obj)` before writing hook attributes — wrong target = silent failure
- `B_` hooks that return nothing do not cancel the command — they must emit and use `sub_override` behavior (see `wizhelp sub_override`)
- `P_` hooks are lock expressions, not softcode — they evaluate like `@lock`, not like a function
- Test every hook — a broken permit hook can lock everyone out of a command
- Document all hooks in `src/` so the installer can reproduce them after a rollback
