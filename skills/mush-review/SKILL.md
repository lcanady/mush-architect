---
name: mush-review
description: "Senior code review for RhostMUSH softcode. Reviews logic, idioms, design patterns, and architecture — distinct from mush-security (vulns) and mush-lint (formatting)."
context: fork
agent: general-purpose
model: opus
effort: high
paths: "**/*.mush,**/src/**,**/dist/**"
argument-hint: "[file, attribute, or system to review]"
date_added: "2026-03-28"
---

> **Act immediately. Review the code, produce findings, stop. Do not rewrite anything without being asked.**

# mush-review

Senior code review from the perspective of a 20-year MUSH veteran. Evaluates logic, architecture, idioms, and maintainability — things that pass lint and security but are still wrong or fragile.

## What this covers that mush-lint and mush-security do not

| Concern | mush-lint | mush-security | mush-review |
|---------|-----------|--------------|------------|
| Unsafe input | ✓ | ✓ | ✓ |
| Formatting | ✓ | | |
| Logic correctness | | | ✓ |
| Idiomatic patterns | | | ✓ |
| Architecture | | | ✓ |
| Maintainability | | | ✓ |
| Edge cases | | | ✓ |
| Performance hints | | | ✓ |
| Testability | | | ✓ |

## Review dimensions

### 1 — Logic correctness

- Does the code do what it claims?
- Are all branches reachable and correct?
- Are error conditions handled and propagated properly?
- Do `#-1` returns have meaningful reasons?
- Are boolean conditions evaluated in the right order?

### 2 — Idiomatic RhostMUSH

Flag non-idiomatic patterns and suggest the RhostMUSH-preferred alternative:

| Anti-pattern | Preferred |
|-------------|----------|
| `u(me/FN, ...)` inside a UDF that modifies registers | `ulocal(me/FN, ...)` |
| Deep `setq()`/`%q` chains instead of named registers | `setq()` with named labels via `setqlabel` if available |
| `@switch` with many case labels | `case()` or `@switch/first` |
| Bare `iter()` for side effects | `@dolist` for clarity |
| `get(#DBREF/ATTR)` in a tight loop | Cache with `setq()` before the loop |
| Hardcoded dbref in softcode body | Indirect via `u(me/D_OBJ)` or a config attr |
| `if(x, y, )` with empty else | `if(x, y)` — empty else is implicit |

### 3 — Architecture

- Is the system object layout sensible? (one object per subsystem vs. monolith)
- Is data separated from code? (data attrs like `D_*` vs. function attrs `FN_*`)
- Are public UDFs documented and private UDFs prefixed to signal internal-only?
- Is there a clear entry point command and clear data flow?
- Would a new developer understand the structure in 10 minutes?

### 4 — Maintainability

- Are attribute names descriptive enough to be self-documenting?
- Are magic numbers (`if(gt(%0,42),...)`) named via config attrs?
- Is the code DRY? (same logic copy-pasted across multiple attrs is a smell)
- Are dependencies between attrs documented with `@@ Requires:` comments?

### 5 — Edge cases

Common MUSH edge cases to check:

- Empty string input (`%0` is `""`) — handled?
- Input that is a dbref (`#42`) — treated as number or string correctly?
- Input containing special chars (`[`, `]`, `;`, `{`, `}`) — stripped or escaped?
- Objects that may not exist — `hasattr()` / `isdbref()` guards present?
- List operations on empty lists — `iter()` on `""` produces `""`; guarded?
- Queue depth — can this command trigger itself recursively?

### 6 — Testability

- Can each UDF be tested in isolation?
- Are side effects (emit, queue, set) separated from pure computation?
- Does the test cover the error path, not just the happy path?

## Output format

```
=== MUSH-REVIEW: [system/file] ===

CRITICAL  (things that are wrong and will cause bugs)
  C1  FN_FOO: Returns empty string on missing arg instead of #-1 —
      callers can't detect failure. Add: if(not(%0), #-1 MISSING ARG, ...)

CONCERN  (things that work but are fragile or non-idiomatic)
  W1  CMD_BAR: Uses u() instead of ulocal() — register %q0 leaks to caller.
      Change u(me/FN_HELPER,...) → ulocal(me/FN_HELPER,...)
  W2  FN_CALC: Hardcoded dbref #42 in body — breaks on db wipe or object move.
      Store in &D_CALC_OBJ and reference via u(me/D_CALC_OBJ)

SUGGESTION  (improvements worth making but not urgent)
  S1  FN_FORMAT: get(#42/CONFIG) is called 3 times in this function.
      Cache: setq(0, get(#42/CONFIG)) and use %q0 throughout.
  S2  Attribute names FN_A, FN_B, FN_C give no indication of purpose.
      Consider: FN_PARSE_INPUT, FN_FORMAT_OUTPUT, FN_VALIDATE_ARGS

POSITIVE  (things done well worth noting)
  ✓  Guard pattern on all UDFs is correct and consistent
  ✓  Error returns include human-readable reasons
  ✓  Data attrs properly separated from function attrs

1 critical, 2 concerns, 2 suggestions
===================================
```

## Rules

- CRITICAL means "this will cause a bug" — always explain why
- CONCERN means "this works but I wouldn't ship it" — offer the alternative
- SUGGESTION is optional — user can skip these
- POSITIVE findings are mandatory — always acknowledge what's done well
- Never rewrite code without being asked — produce findings only
- Check patterns against `../mush-patterns/` before flagging as non-idiomatic
