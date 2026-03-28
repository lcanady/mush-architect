---
name: mush-coverage
description: "Find which attributes have no @rhost/testkit test. Produces a gap report sorted by risk level — untested commands are higher risk than untested config attrs."
context: fork
agent: general-purpose
effort: medium
paths: "**/*.mush,**/src/**,**/tests/**"
date_added: "2026-03-28"
---

> **Act immediately. Scan src/ and tests/, produce the gap report, stop.**

# mush-coverage

Identifies which softcode attributes have no corresponding `@rhost/testkit` test. Sorted by risk: untested commands that accept user input are the most dangerous gaps.

## Phase 1 — Inventory src/ attributes

Parse all `src/*.mush` files and extract every attribute definition:

```
&FN_FOO     → type: udf
&CMD_BAR    → type: command
&D_CONFIG   → type: data
&HELP_FOO   → type: help
&VER        → type: data
```

## Phase 2 — Inventory tests/

Parse all `tests/*.test.ts` files. For each `it()` block, extract what attribute or function it's testing:

```typescript
// Patterns that map to attribute coverage:
await expect('u(#DBREF/FN_FOO,...)').toBe(...)  → covers: FN_FOO
await expect('+bar test').toContain(...)         → covers: CMD_BAR (if pattern matches)
```

## Phase 3 — Compute coverage

Match test coverage to attributes:

| Attribute | Type | Tested | Risk |
|-----------|------|--------|------|
| FN_FOO | udf | ✓ | — |
| CMD_BAR | command | ✗ | HIGH |
| FN_HELPER | udf | ✗ | MEDIUM |
| D_CONFIG | data | ✗ | LOW |

### Risk classification

| Type | Risk if untested | Priority |
|------|-----------------|---------|
| Commands (`CMD_*`, `$`-triggered) | HIGH — accepts user input, has side effects | Fix first |
| UDFs called by commands | HIGH — directly in input path | Fix first |
| UDFs called only by other UDFs | MEDIUM | Fix next |
| Data/config attrs (`D_*`, `CONF_*`) | LOW — set once, rarely change | Optional |
| Help attrs (`HELP*`) | LOW — display only | Optional |

## Phase 4 — Report

```
=== COVERAGE REPORT: my-cool-system ===
Attributes total:  24
Tested:            11  (46%)
Untested:          13  (54%)

HIGH PRIORITY (untested commands + their direct UDF dependencies)
  ✗ CMD_FROBNITZ      command    — no test
  ✗ FN_VALIDATE_ARG   udf        — called by CMD_FROBNITZ, no test
  ✗ CMD_ADMIN_RESET   command    — no test (wizard-only but still needs a test)

MEDIUM PRIORITY (untested UDFs not in command path)
  ✗ FN_FORMAT_NAME    udf        — utility function, no test
  ✗ FN_CALC_SCORE     udf        — math helper, no test

LOW PRIORITY (data and help attrs)
  ✗ D_MAX_ENTRIES     data       — config attr, no test
  ✗ HELP_FROBNITZ     help       — display attr, no test
  [+ 6 more low-priority]

Recommended: write tests for 3 HIGH, 2 MEDIUM before next release.
Run /mush-test to scaffold the test file.
==========================================
```

## Phase 5 — Optionally scaffold missing tests

Ask the user:
> "Want me to scaffold `@rhost/testkit` test stubs for the HIGH priority gaps?"

If yes, add `it()` stubs to the appropriate test file:

```typescript
it.todo('CMD_FROBNITZ — happy path', async ({ expect }) => {
    // TODO: test +frobnitz <arg> produces expected output
});

it.todo('CMD_FROBNITZ — missing arg returns error', async ({ expect }) => {
    await expect('+frobnitz').toBeError();
});
```

Mark with `.todo` so they appear as pending in the test runner, not failing.

## Rules

- Coverage percentage is a vanity metric — risk classification matters more
- A command with zero tests is always HIGH regardless of how simple it looks
- Wizard-only commands still need tests — privilege doesn't excuse untested behavior
- `_LINE*` admin config attributes are excluded from coverage (not testable via testkit)
