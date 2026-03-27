---
name: mush-test
description: "Write and run @rhost/testkit tests for RhostMUSH softcode. Full TDD workflow."
risk: low
source: local
date_added: "2026-03-27"
---

> **Act immediately. Write code or ask one question — do not narrate your plan or summarize what you are about to do.**


# mush-test

Write and run `@rhost/testkit` tests for RhostMUSH softcode.

## ⚠ tdd-audit is MANDATORY

**Any session that writes TypeScript test code MUST run `/tdd-audit` before closing.**

- Run it on all test files written or modified this session.
- Do not mark the session complete until tdd-audit passes.
- There are no exceptions.

## Prerequisites

```bash
npm install @rhost/testkit
# Server must be running (local or Docker):
docker compose up -d   # from rhostmush-docker repo
# OR connect to an existing server
```

`RHOST_PASS` must be set in the environment. Never use the default.

---

## Minimal test file

```typescript
import { RhostRunner } from '@rhost/testkit';

const PASS = process.env.RHOST_PASS;
if (!PASS) { console.error('RHOST_PASS env var is required'); process.exit(1); }

const runner = new RhostRunner();

runner.describe('MySystem', ({ it, beforeAll }) => {
    // Suppress background cron/queue output that can bleed into eval results
    beforeAll(async ({ client }) => {
        await client.command('@halt/all me');
    });

    it('happy path', async ({ expect }) => {
        await expect('u(#42/FN_NAME,arg1)').toBe('expected');
    });

    it('returns error on bad input', async ({ expect }) => {
        await expect('u(#42/FN_NAME,)').toBeError();
    });
});

runner
    .run({ host: 'localhost', port: 4201, username: 'Wizard', password: PASS, timeout: 10000 })
    .then(r => {
        console.log(`${r.passed} passed, ${r.failed} failed`);
        process.exit(r.failed > 0 ? 1 : 0);
    })
    .catch(err => { console.error('Fatal:', err.message); process.exit(1); });
```

Run:

```bash
RHOST_PASS=<pass> npx ts-node my-system.test.ts
```

---

## Runner API

```typescript
const runner = new RhostRunner();

runner.describe('suite name', ({ it, test, describe, beforeAll, afterAll, beforeEach, afterEach }) => {
    it('test name', async ({ expect, client, world }) => { ... });
    it.skip('skipped test', async ({ expect }) => { ... });
    it.only('focused test', async ({ expect }) => { ... });  // runs only this test in the suite

    describe('nested suite', ({ it }) => { ... });
});

const result = await runner.run({
    host: 'localhost',
    port: 4201,
    username: 'Wizard',
    password: PASS,
    timeout: 10000,        // per-eval timeout ms (default 10000)
    verbose: true,         // print per-test results (default true)
    paceMs: 0,             // delay between commands ms (default 0)
    stripAnsi: true,       // strip color codes (default true)
});
// result: { passed, failed, skipped, total, duration, failures }
```

---

## Matchers

```typescript
await expect('add(2,3)').toBe('5');                   // exact match (trimmed)
await expect('strlen(hello)').toBeNumber();            // parses as finite number
await expect('add(0.1,0.2)').toBeCloseTo(0.3, 2);    // |actual - expected| < 0.01
await expect('lattr(#1)').toContainWord('ALIAS');      // word in space-delimited list
await expect('lattr(#1)').toHaveWordCount(5);          // list has exactly 5 words
await expect('u(#42/FN,)').toBeError();               // starts with #-1, #-2, or #-3
await expect('create(Foo)').toBeDbref();               // matches #\d+
await expect('lcstr(HELLO)').toBeTruthy();             // non-empty, non-zero, non-error
await expect('u(#42/FN,)').toBeFalsy();               // empty, "0", or error
await expect('add(1,1)').not.toBe('3');               // negation
```

---

## Fixtures with world

```typescript
it('creates and tests an object', async ({ world, client, expect }) => {
    // world is fresh per-test and auto-cleaned after (even on failure)
    const obj = await world.create('TestObj');
    await world.set(obj, 'HP', '100');
    await world.set(obj, 'HP_MAX', '100');
    await world.flag(obj, 'SAFE');

    await expect(`get(${obj}/HP)`).toBe('100');

    // world.cleanup() is called automatically — no afterEach needed
});

it('digs a room and tests it', async ({ world, expect }) => {
    const room = await world.dig('TestRoom');
    await expect(`name(${room})`).toBe('TestRoom');
});

it('triggers a command', async ({ world }) => {
    const obj = await world.create('TestChar');
    await world.set(obj, 'CMD_ATTACK', '@pemit %#=You attack %0!');
    const lines = await world.trigger(obj, 'CMD_ATTACK', 'goblin');
    if (!lines.some(l => l.includes('attack'))) {
        throw new Error(`Expected attack output, got: ${JSON.stringify(lines)}`);
    }
});
```

---

## Low-level client

```typescript
it('uses client directly', async ({ client }) => {
    const result = await client.eval('add(2,3)');   // evaluates softcode expression
    const lines  = await client.command('+vote Alice');  // runs a MUSH command

    // Subscribe to raw output
    const log: string[] = [];
    client.onLine(l => log.push(l));
    await client.command('+who');
    client.offLine(/* same ref */);
});
```

---

## Docker-isolated tests

```typescript
import { RhostRunner, RhostContainer } from '@rhost/testkit';

const PASS = process.env.RHOST_PASS;
if (!PASS) throw new Error('RHOST_PASS env var is required');

const container = RhostContainer.fromSource();  // builds from Dockerfile
const info = await container.start();           // { host, port }

const runner = new RhostRunner();
runner.describe('isolated', ({ it }) => {
    it('add works', async ({ expect }) => {
        await expect('add(1,1)').toBe('2');
    });
});

const result = await runner.run({ ...info, username: 'Wizard', password: PASS });
await container.stop();
process.exit(result.failed > 0 ? 1 : 0);
```

---

## Common test patterns

**Test a UDF:**
```typescript
await expect(`u(#42/FN_GREET,Alice)`).toBe('Hello, Alice!');
```

**Test command output:**
```typescript
const lines = await client.command('+vote Alice');
if (!lines.some(l => l.includes('Vote'))) throw new Error('Expected vote output');
```

**Test attribute modification:**
```typescript
const obj = await world.create('Target');
await client.command(`+setstat ${obj}=STR/18`);
await expect(`get(${obj}/STAT.STR)`).toBe('18');
```

**Test error handling:**
```typescript
await expect('u(#42/FN_DIVIDE,10,0)').toBeError();
await expect('u(#42/FN_DIVIDE,10,0)').toContain('ZERO');
```

**Test lists:**
```typescript
await expect('iter(1 2 3,mul(##,2))').toBe('2 4 6');
await expect('lattr(#1)').toContainWord('ALIAS');
```

**Suppress background noise:**
```typescript
beforeAll(async ({ client }) => {
    await client.command('@halt/all me');
});
```
