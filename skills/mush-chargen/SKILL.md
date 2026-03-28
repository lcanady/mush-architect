---
name: mush-chargen
description: "Scaffold a RhostMUSH character generation system — stat arrays, sheet display, approval workflow, staff review commands, and approval locks."
effort: high
argument-hint: "[game theme or stat system description]"
date_added: "2026-03-28"
---

> **Complete Phase 0 (design plan + user confirmation) before writing any softcode. Chargen systems are highly game-specific — get the design right first.**

# mush-chargen

Scaffold a character generation system. Produces a complete chargen suite: stat storage, sheet display, submission/approval workflow, and staff tools. Always runs the full `/mush-build` phase pipeline.

## Phase 0 — Design interview (MANDATORY before any code)

Ask all of the following before writing a single line:

**Stats and attributes:**
1. What stats does the system have? (e.g. Strength, Dexterity, etc.)
2. Are stats numeric, text, or a mix?
3. Are there derived stats (calculated from other stats)?
4. Are there stat caps (max/min values)?
5. Are stats grouped into categories?
6. Do stats have costs (points buy) or are they freeform?

**Character types:**
7. Are there character types/splats (e.g. human/vampire/werewolf)?
8. Does type affect available stats?

**Workflow:**
9. What is the approval flow? (submit → staff review → approve/reject?)
10. Who can approve? (Wizard? Staff flag? Custom power?)
11. Can players edit their sheet after submission?
12. Is there a waiting room / chargen room?
13. Are there mandatory fields that must be filled before submission?

**Display:**
14. What does the character sheet look like? (columns, headers, width)
15. Is the sheet public or private?

Present a written design plan and wait for confirmation before proceeding.

## Standard chargen object layout

```
Chargen System <cg>      — main code object (commands, UDFs)
Chargen Config <cfg>     — data/config attrs (stat lists, caps, costs)
Chargen Template <tmpl>  — display templates
```

## Minimum viable command set

| Command | Purpose |
|---------|---------|
| `+sheet [<player>]` | Display character sheet |
| `+set <stat>=<value>` | Set a stat during chargen |
| `+submit` | Submit character for staff review |
| `+approve <player>` | Staff: approve a character |
| `+reject <player>=<reason>` | Staff: reject with reason |
| `+roster` | Staff: list characters in chargen |
| `+chargen/reset <player>` | Staff: reset a character to chargen |

## Standard attribute naming

```mushcode
@@ Per-character data (stored on the player object):
&CG_STAT_<NAME> <player>= <value>
&CG_STATUS <player>= CHARGEN|SUBMITTED|APPROVED|REJECTED
&CG_SUBMITTED <player>= <timestamp>
&CG_APPROVED_BY <player>= <staff name>
&CG_NOTES <player>= <staff notes>

@@ Config (stored on Config object):
&D_STATS <cfg>= Strength Dexterity Constitution Intelligence Wisdom Charisma
&D_STAT_MIN <cfg>= 1
&D_STAT_MAX <cfg>= 5
&D_STARTING_POINTS <cfg>= 15
&D_STAFF_FLAG <cfg>= STAFF
```

## Approval lock pattern

```mushcode
@@ Lock the game to approved characters only:
@lock/enter <startroom>=CG_STATUS/APPROVED

@@ Or use a softcoded check:
&FN_IS_APPROVED <cg>=
  [if(hasattr(%0, CG_STATUS),
    eq(get(%0/CG_STATUS), APPROVED),
    0
  )]
```

## Sheet display template

```mushcode
&FN_SHEET_HEADER <cg>=
  [repeat(=,78)]%r
  %ch[center(Character Sheet: [name(%0)], 78)]%cn%r
  [repeat(=,78)]%r

&FN_SHEET_STAT_ROW <cg>=
  [ljust(%0, 20)][rjust(get(%1/CG_STAT_%0), 5)]%r

&CMD_SHEET <cg>=$+sheet*:
  @pemit %#=
    [u(me/FN_SHEET_HEADER, switch(1, t(%0), locate(%#,%0,P), %#))]
    [iter(u(me/D_STATS_LIST),
      u(me/FN_SHEET_STAT_ROW, ##, switch(1, t(%0), locate(%#,%0,P), %#))
    )]
    [repeat(=,78)]
```

## After scaffolding

Run the full pipeline:
1. `/mush-test` — write tests for each command and UDF
2. `/mush-lint` — check formatting and safety
3. `/mush-security` — audit for injection (stat names are user input)
4. `/mush-docs` — generate +help chargen entry
5. `/mush-build` phases 5–11 — package, manifest, learn

## Rules

- Stat values from players are always user input — strip and validate with `isnum()` / `isalpha()` guards
- Never store raw `%0` as a stat value without sanitization
- Approval status must be tamper-resistant — set by staff commands only, never by player commands
- Always test the rejection → re-edit → re-submit flow, not just the happy path
