---
name: mush-deps
description: "Map dependencies between softcode attributes and objects. Shows what calls what, what would break if removed, and cross-object coupling. Use before refactoring or removing code."
context: fork
agent: general-purpose
effort: medium
paths: "**/*.mush,**/src/**"
argument-hint: "[attribute, object, or 'all' for full dependency map]"
date_added: "2026-03-28"
---

> **Act immediately. Scan src/ files, build the dependency graph, report. Do not modify anything.**

# mush-deps

Dependency analysis for RhostMUSH softcode. Answers: "What calls this?", "What does this call?", and "What breaks if I remove this?" Essential before any refactor or deletion.

## Phase 1 — Build the call graph

Scan all `src/*.mush` files. For each attribute, extract:

**Outbound calls** (what this attribute calls):
- `u(#DBREF/ATTR, ...)` → calls ATTR on object DBREF
- `ulocal(#DBREF/ATTR, ...)` → calls ATTR on object DBREF
- `u(me/ATTR, ...)` → calls ATTR on same object
- `get(#DBREF/ATTR)` → reads ATTR on DBREF
- `hasattr(#DBREF, ATTR)` → checks ATTR on DBREF
- `@trigger #DBREF/ATTR` → triggers ATTR

**Inbound calls** (what calls this attribute):
- Reverse of the above — which other attrs reference this one?

## Phase 2 — Classify relationships

| Relationship type | Meaning |
|------------------|---------|
| `calls` | A `u()`/`ulocal()` invocation |
| `reads` | A `get()` or direct attribute read |
| `triggers` | A `@trigger` |
| `listens` | An `@listen` / `@ahear` dependency |
| `parents` | Object inherits attrs from this object |

## Phase 3 — Produce dependency report

### Dependency map for a single attribute

```
/mush-deps FN_VALIDATE_ARG
```

```
=== DEPS: FN_VALIDATE_ARG (#42) ===

CALLED BY (inbound — 3):
  CMD_FROBNITZ     (#42)  — u(me/FN_VALIDATE_ARG, %0)
  CMD_ADMIN_RESET  (#42)  — u(me/FN_VALIDATE_ARG, %0)
  FN_PROCESS       (#42)  — ulocal(me/FN_VALIDATE_ARG, %0)

CALLS (outbound — 2):
  FN_STRIP_INPUT   (#42)  — ulocal(me/FN_STRIP_INPUT, %0)
  config()         (builtin) — reads function_invocation_limit

IMPACT IF REMOVED:
  HIGH: CMD_FROBNITZ would lose input validation — security risk
  HIGH: CMD_ADMIN_RESET would lose input validation — security risk
  MEDIUM: FN_PROCESS would need its own guard

SAFE TO REMOVE: NO
=====================================
```

### Full dependency map

```
/mush-deps all
```

```
=== DEPENDENCY MAP: my-cool-system ===

OBJECTS
  #42  My Cool System <sys>   14 attrs
  #43  My Cool Help <hlp>      8 attrs

CALL GRAPH
  CMD_FROBNITZ
    → FN_VALIDATE_ARG   (u)
    → FN_PROCESS        (u)
      → FN_STRIP_INPUT  (ulocal)
      → FN_FORMAT_OUT   (ulocal)
        → D_PREFIX      (get)

  CMD_ADMIN_RESET
    → FN_VALIDATE_ARG   (u)
    → FN_RESET_DATA     (u)
      → D_MAX_ENTRIES   (get)

ORPHANED ATTRIBUTES (nothing calls these):
  ? FN_OLD_HELPER   — not called by anything. Safe to delete?
  ? HELP_DEFUNCT    — not referenced. Safe to delete?

CROSS-OBJECT DEPENDENCIES:
  #42/FN_FORMAT_OUT → get(#43/HELP_FORMAT_TEMPLATE)
  ⚠ If #43 is deleted, FN_FORMAT_OUT will get() empty string

EXTERNAL DEPENDENCIES (config params, built-in functions):
  config(function_invocation_limit)
  config(master_room)
  search()
  lattr()
=====================================
```

## Phase 4 — Impact analysis for a proposed change

```
/mush-deps impact FN_STRIP_INPUT
```

> "If FN_STRIP_INPUT is removed or renamed, what breaks?"

```
IMPACT ANALYSIS: removing FN_STRIP_INPUT
  DIRECT CALLERS (will break immediately):
    FN_PROCESS — ulocal(me/FN_STRIP_INPUT, ...) → returns #-1 or empty

  INDIRECT CALLERS (will break transitively):
    CMD_FROBNITZ → FN_PROCESS → FN_STRIP_INPUT
    CMD_ADMIN_RESET → FN_PROCESS → FN_STRIP_INPUT

  SAFE REMOVAL: NO — 2 commands depend on this function
```

## Rules

- Orphaned attributes are reported as `?` not as errors — they may be intentional stubs
- Cross-object dependencies are highlighted in orange — they create coupling risk
- Built-in function calls (`search()`, `lattr()`, etc.) are listed as `(builtin)` not as deps
- If src/ files are incomplete, note which objects are missing from the analysis
- Does not trace runtime-dynamic calls like `u(#DBREF/[get(me/DYNATTR)],...)` — flag these as unresolvable
