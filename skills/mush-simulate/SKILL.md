---
name: mush-simulate
description: "Trace RhostMUSH softcode execution without a live server — follow function call chains, predict output, detect infinite recursion and limit violations before deploy."
context: fork
agent: general-purpose
effort: high
paths: "**/*.mush,**/src/**"
argument-hint: "[expression or attribute to simulate]"
date_added: "2026-03-28"
---

> **Act immediately. Trace the execution, show each step, predict the output. Flag any issues found.**

# mush-simulate

Static execution tracer for RhostMUSH softcode. Walks through function calls step by step, substituting values, resolving `u()` calls against local src/ files, and predicting output — without needing a live server.

## When to use

- Pre-deploy validation when the server is offline
- Debugging complex nested function chains
- Detecting infinite recursion before it kills the queue
- Understanding what a piece of inherited code actually does
- Verifying register (`%q`) flow through `ulocal()` / `u()` calls

## How it works

The simulator reads src/ files to resolve attribute bodies, then traces expression evaluation step by step:

1. Read the expression or attribute body
2. Identify all function calls, substitutions, and branches
3. Substitute known values (from user-provided test inputs)
4. Resolve `u(#DBREF/ATTR)` by looking up that attr in src/
5. Evaluate each step, showing intermediate values
6. Flag any recursion, limit violations, or dead branches

## Usage

Invoke with an expression and test inputs:

```
/mush-simulate u(#42/FN_FOO, hello, 42)
  → Simulating with %0=hello, %1=42
```

Or simulate a command trigger:

```
/mush-simulate +frobnitz hello world
  → Simulating $+frobnitz *: with %0=hello world
```

## Trace output format

```
=== SIMULATE: u(#42/FN_FOO, hello, 42) ===
Input:  %0=hello  %1=42

STEP 1  u(#42/FN_FOO, hello, 42)
        → Resolving FN_FOO from src/functions.mush
        → Body: [if(not(%0), #-1 MISSING ARG, [setq(0,%0)][u(me/FN_BAR,%q0,%1)])]

STEP 2  if(not(%0), #-1 MISSING ARG, ...)
        → not(hello) = 0 (false)
        → Branch: ELSE — continuing

STEP 3  setq(0, hello)
        → %q0 = "hello"
        → Returns: ""  (setq returns empty)

STEP 4  u(me/FN_BAR, hello, 42)
        → Resolving FN_BAR from src/functions.mush
        → Body: [add(%0, %1)]
        ⚠ WARNING: %0 is "hello" (non-numeric), add() will return #-1

STEP 5  add(hello, 42)
        → #-1 INCORRECT DATA TYPE

FINAL OUTPUT: #-1 INCORRECT DATA TYPE

ISSUES FOUND:
  ⚠ STEP 4: FN_BAR receives string "hello" but calls add() — type mismatch
             Suggest: add isnum(%0) guard in FN_FOO before calling FN_BAR
=====================================
```

## Recursion detection

If a `u()` call resolves to an attribute that eventually calls itself:

```
STEP 7  u(me/FN_RECURSIVE, hello)
        ⚠ RECURSION DETECTED: FN_RECURSIVE → FN_HELPER → FN_RECURSIVE
        Current depth: 3 (limit: config(function_recursion_limit) = 50)
        This will abort with: #-1 FUNCTION RECURSION LIMIT EXCEEDED
        at depth 50.
```

## Limit violation detection

Flag expressions that will exceed server limits:

```
STEP 3  iter(:100000:>:, [u(me/FN_HEAVY,##)])
        ⚠ ITERATION: 100,000 iterations × ~200 function calls each
        Estimated total function invocations: 20,000,000
        Server limit: config(function_invocation_limit) = 100,000
        This will abort early — redesign to process in smaller batches.
```

## Register flow tracking

Track `%q` register values through the call chain:

```
STEP 2  setq(0, parse_result)  → %q0 = "parse_result"
STEP 3  ulocal(me/FN_HELPER, %q0)
        → ulocal() — %q registers are scoped, will not leak
        → Inside FN_HELPER: %q0 is re-scoped
STEP 4  return to caller
        → %q0 restored to "parse_result"  ✓ (no bleed)
```

## @rhost/vision integration

If `@rhost/vision` is available in the project, use it to enhance simulation with live server data:

```bash
@@ Pull live attribute values for get() calls:
npx @rhost/vision get #<dbref>/ATTR_NAME

@@ Pull live object state for hasattr() / lattr() calls:
npx @rhost/vision lattr #<dbref>

@@ Pull live config values:
npx @rhost/vision config function_invocation_limit
```

When @rhost/vision is available, replace mock values with real server data automatically. Flag which values came from the live server vs. user-provided mocks:

```
STEP 3  get(#42/D_MAX_ENTRIES)
        → @rhost/vision: #42/D_MAX_ENTRIES = "100"  [LIVE]
        → Using value: 100
```

If @rhost/vision is not available, prompt for mock values as usual:
> "search() will return what dbref? (leave blank to use #MOCK)"

## Limitations

- Cannot simulate `@pemit`, `@set`, or other side-effect commands (output only)
- Database queries (`search()`, `lattr()`, `get()`) use placeholder values unless @rhost/vision provides them
- Timing and queue interactions cannot be modeled
- Some Rhost-specific substitutions (`%!`, `%+`, etc.) are approximated

## Rules

- Always show intermediate steps — the trace is the value, not just the final output
- Flag every type mismatch, even if it won't error in Rhost (might in PennMUSH)
- Recursion warnings appear at depth 10, errors at depth = `config(function_recursion_limit)`
- If src/ files are missing, ask the user to run `/mush-export` first
