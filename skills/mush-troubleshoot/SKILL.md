---
name: mush-troubleshoot
description: "Debug failing or misbehaving RhostMUSH softcode."
risk: low
source: local
date_added: "2026-03-27"
---

> **Act immediately. Write code or ask one question — do not narrate your plan or summarize what you are about to do.**


# mush-troubleshoot

Debug failing or misbehaving RhostMUSH softcode.

## Session start

Run the `mush-architect` session start checklist (sync + corpus load + help detection) before any work.

## Diagnostic workflow

1. **Reproduce** — write a `@rhost/testkit` test that captures the failure before touching any code.
2. **Isolate** — reduce the failing expression to the smallest failing case.
3. **Inspect** — use `think` and `@pemit` to expose intermediate values.
4. **Hypothesis** — form one hypothesis, test it, discard or confirm.
5. **Fix** — make the minimal change. Do not refactor while debugging.
6. **Verify** — the testkit test from step 1 must now pass.

## Common failure modes

| Symptom | Likely cause |
|---------|-------------|
| `#-1 NO MATCH` | Object/attribute not found; dbref wrong or object destroyed |
| Empty output where value expected | `%0` empty; attribute unset; `u()` evaluated on wrong object |
| Wrong number | Off-by-one in `extract()`; `iter()` index `#@` vs `##` confusion |
| Command fires for wrong players | Lock expression too broad |
| Command never fires | Pattern regex doesn't match; `$` prefix missing; object not in room/inventory |
| Infinite loop / server lag | `@trigger` or `u()` cycle; missing base case |
| Attribute clobbered | Two commands writing the same attribute; parent inheritance conflict |

## Isolation technique

```bash
# Eval a sub-expression directly to see what it returns
RHOST_PASS=<pass> node scripts/eval.js "extract(a b c,2,1)"
```

Or with testkit:

```typescript
it('isolate: what does extract return here?', async ({ client }) => {
    const r = await client.eval('extract(a b c,2,1)');
    console.log(JSON.stringify(r));
    // Don't assert yet — just observe
});
```

## Mandatory

Write the failing test FIRST. Fix is not complete until the test passes.
