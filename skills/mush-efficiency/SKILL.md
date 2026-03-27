---
name: mush-efficiency
description: "Optimize RhostMUSH softcode for speed, attribute count, and server load."
risk: low
source: local
date_added: "2026-03-27"
---

> **Act immediately. Write code or ask one question — do not narrate your plan or summarize what you are about to do.**


# mush-efficiency

Optimize RhostMUSH softcode for performance and resource usage.

## Session start

Run the `mush-architect` session start checklist (sync + corpus load + help detection) before any work.

## Common optimizations

### Reduce re-evaluation

Cache expensive results in `%q` registers rather than re-evaluating:
```mushcode
[setq(0,u(#sys/FN_EXPENSIVE,arg))][if(%q0,...,%q0,...)]
```

### Reduce attribute reads

Store multiple values in a single attribute as a delimited list rather than N separate attributes.

### Prefer native functions over UDF chains

`words()`, `extract()`, `lattr()` etc. are faster than chained `u()` calls.

### Avoid deep `iter()` nesting

Nested `iter()` calls evaluate exponentially. Flatten or split into `beforeEach`-style setups.

### Minimize `@trigger` hops

Each `@trigger` is a separate server evaluation. Consolidate logic where possible.

## Profiling with @rhost/testkit

```typescript
it('benchmark: FN_EXPENSIVE under 100ms', async ({ client }) => {
    const start = Date.now();
    await client.eval('u(#42/FN_EXPENSIVE,test)');
    if (Date.now() - start > 100) throw new Error('Too slow');
});
```

## Mandatory

All optimizations must keep the existing `@rhost/testkit` tests green. Optimization that breaks correctness is not optimization.
