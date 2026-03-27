---
name: mush-build
description: "Write RhostMUSH softcode (commands, UDFs, systems). Always paired with @rhost/testkit tests."
risk: low
source: local
date_added: "2026-03-27"
---

# mush-build

Write RhostMUSH softcode. Every task produces softcode **and** a matching `@rhost/testkit` test file.

## ⚠ @rhost/testkit is MANDATORY

**Every piece of softcode produced in this skill MUST have a corresponding `@rhost/testkit` test.**

- Do not write softcode without writing the test first.
- Do not mark any task complete until the test passes (green).
- There are no exceptions.

```
Phase 1 — Design     → Understand requirements; check mush-patterns corpus
Phase 2 — Test first → Write the @rhost/testkit test (RED — it will fail)
Phase 3 — Code       → Write the softcode
Phase 4 — Deploy     → Install to server via scripts/eval.js or @rhost/testkit client
Phase 5 — Verify     → Run the test (GREEN — task is now complete)
Phase 6 — Patterns   → Extract any reusable patterns and add to mush-patterns
```

**Phases are mandatory and ordered. Skipping any phase is a protocol violation.**

---

## Phase 1 — Design

Before writing any code:

1. **Check `../mush-patterns/patterns/`** for existing patterns that match the task.
2. Clarify: What object will hold this code? What are the inputs/outputs? What errors should it handle?
3. Identify the object dbref (or use a fixture via `world.create()`).

---

## Phase 2 — Test first (red)

Write the `@rhost/testkit` test before writing the softcode. The test will fail until Phase 3.

```typescript
import { RhostRunner } from '@rhost/testkit';

const PASS = process.env.RHOST_PASS;
if (!PASS) { console.error('RHOST_PASS env var is required'); process.exit(1); }

const runner = new RhostRunner();

runner.describe('<SystemName>', ({ it, beforeAll }) => {
    beforeAll(async ({ client }) => {
        await client.command('@halt/all me');
    });

    it('<description of happy path>', async ({ expect }) => {
        await expect('u(#DBREF/FN_NAME,arg1)').toBe('expected');
    });

    it('returns error on bad input', async ({ expect }) => {
        await expect('u(#DBREF/FN_NAME,)').toBeError();
    });
});

runner
    .run({ host: 'localhost', port: 4201, username: 'Wizard', password: PASS })
    .then(r => process.exit(r.failed > 0 ? 1 : 0))
    .catch(err => { console.error(err.message); process.exit(1); });
```

Replace `#DBREF` with the actual dbref once the object is created in Phase 4.

### Matchers quick reference

| Matcher | Use when |
|---------|----------|
| `.toBe('x')` | Exact string match (trimmed) |
| `.toContain('x')` | Output includes substring |
| `.toMatch(/regex/)` | Regex match |
| `.toBeNumber()` | Output is a number |
| `.toBeCloseTo(n, precision)` | Floating point comparison |
| `.toBeTruthy()` | Non-empty, non-zero, non-error |
| `.toBeFalsy()` | Empty, `"0"`, or error |
| `.toBeError()` | Starts with `#-1`, `#-2`, `#-3` |
| `.toBeDbref()` | Matches `#<digits>` |
| `.toContainWord('x')` | Word in space-delimited list |
| `.toHaveWordCount(n)` | List has exactly n words |
| `.not.toBe(...)` | Negation |

---

## Phase 3 — Write the softcode

### Object setup

```mushcode
@create <SystemName> <sys>
@set <SystemName> <sys>=inherit safe
@fo me=&d.sys me=search(name=<SystemName> <sys>)
```

### UDF template

```mushcode
&FN_NAME <obj>=
  [if(not(%0), #-1 MISSING ARG,
    <expression using %0 %1 etc.>
  )]
```

### Command template

```mushcode
&CMD_NAME <obj>=$+name[/<switch>] *:
  @switch/first %0=
    /switch1, <action1>,
    /switch2, <action2>,
    @pemit %#=Unknown switch.
```

### Guard pattern (always validate args)

```mushcode
[if(not(%0), #-1 MISSING ARG, <rest>)]
[if(not(isnum(%0)), #-1 NOT A NUMBER, <rest>)]
```

### Error return convention

- `#-1 REASON` — generic error / not found
- `#-2` — permission denied
- `#-3` — wrong number of arguments

Always include a human-readable reason after `#-1`.

---

## Phase 4 — Deploy

### Via scripts/eval.js (single commands)

```bash
RHOST_PASS=<pass> node scripts/eval.js "@create MySystem <sys>"
RHOST_PASS=<pass> node scripts/eval.js "&FN_NAME #42=..."
```

### Via @rhost/testkit client (programmatic)

```typescript
import { RhostClient } from '@rhost/testkit';

const PASS = process.env.RHOST_PASS;
if (!PASS) throw new Error('RHOST_PASS env var is required');

const client = new RhostClient({ host: 'localhost', port: 4201 });
await client.connect();
await client.login('Wizard', PASS);

const dbref = await client.eval('@create MySystem <sys>');
await client.command(`&FN_NAME ${dbref}=[if(not(%0),#-1 MISSING ARG,%0)]`);

await client.disconnect();
```

### Via world fixture (tests that also deploy)

```typescript
it('creates and tests in one step', async ({ world, client, expect }) => {
    const obj = await world.create('MySystem');
    await world.set(obj, 'FN_NAME', '[if(not(%0),#-1 MISSING ARG,%0)]');
    await expect(`u(${obj}/FN_NAME,hello)`).toBe('hello');
    // world auto-destroys obj after the test
});
```

---

## Phase 5 — Verify (green)

```bash
RHOST_PASS=<pass> npx ts-node my-system.test.ts
```

All tests must pass before the task is complete.

---

## Phase 6 — Patterns

After completing the task, check if any new patterns emerged that aren't in `../mush-patterns/`. If so, add them following the format in `../mush-patterns/CONTRIBUTING.md`.

---

## Common patterns (from mush-patterns corpus)

Check `../mush-patterns/patterns/` before writing from scratch. Common categories:

- **functions/** — iter/map, UDF guards, string formatting, math
- **commands/** — switch dispatch, permission checks, target resolution
- **systems/** — bboard, chargen, stats, combat, economy

---

## Security rules

- Never interpolate user input directly into `@pemit`, `think`, or attribute values without stripping: use `stripchars(%0,[]|;{})` or equivalent guards.
- `execscript()` — never pass user-controlled values as the script name or arguments.
- Lock all system objects: `@set <obj>=safe` and `@lock <obj>=#<wizard-dbref>`.
- `@switch` outputs are evaluated — never put user input in the case label.
