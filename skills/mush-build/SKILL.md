---
name: mush-build
description: "Write RhostMUSH softcode (commands, UDFs, systems). Always paired with @rhost/testkit tests."
risk: low
source: local
date_added: "2026-03-27"
---

> **Act immediately. Write code or ask one question — do not narrate your plan or summarize what you are about to do.**


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
Phase 4 — Docs       → Generate help text for every command and UDF (MANDATORY)
Phase 5 — Deploy     → Install softcode + help attributes to server
Phase 6 — Verify     → Run the test (GREEN — task is now complete)
Phase 7 — Patterns   → Extract any reusable patterns and add to mush-patterns
```

**Phases are mandatory and ordered. Skipping any phase is a protocol violation.**

---

## Phase 1 — Design

Before writing any code:

1. **Corpus must already be loaded** — the `mush-architect` session start checklist (sync + load) MUST have run before this phase. If it has not, stop and run it now.
2. **Check loaded patterns** for any that match the task. If a matching pattern exists, use it as the starting point — do not rewrite from scratch.
3. Clarify: What object will hold this code? What are the inputs/outputs? What errors should it handle?
4. Identify the object dbref (or use a fixture via `world.create()`).

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

## Phase 4 — Docs (MANDATORY)

Every command and every UDF written in Phase 3 MUST have help text before deployment.

### Step 1 — Detect the help system

Ask the user (once per session, remember the answer):

> "Does this server have a softcoded help system (e.g. `+help`, `&HELPFILE`, custom `$help*` command)?"

| Answer | Action |
|--------|--------|
| **Yes** | Ask: "What's the command and attribute format?" Then generate help in that format (see [Softcoded help system](#softcoded-help-system) below). |
| **No / unsure** | Generate a generic `HELP` attribute on the object (see [Generic help attribute](#generic-help-attribute) below). |

### Softcoded help system

Once the user describes the format, generate attributes that match it exactly. Common patterns:

**`+help` topic-on-object style** (attribute per topic on a help object):
```mushcode
&HELP_<TOPIC> <helpobj>=
  %ch%cy+<COMMAND>[/<switch>] <args>%cn%r
  %r
    Description of what the command does.%r
  %r
  Switches:%r
    /<switch>   What this switch does.%r
  %r
  Examples:%r
    +<command> foo     Does the thing.%r
    +<command>/sw foo  Does the other thing.%r
  %r
  See also: +<related>
```

**`&HELPFILE` pointer style** (object has a HELPFILE attr pointing to help text):
```mushcode
&HELPFILE <obj>=<helpobj>
&HELP_<TOPIC> <helpobj>=<text as above>
```

**`$help <topic>:` command style** (help is a command on the system object):
```mushcode
&CMD_HELP_<TOPIC> <obj>=$+help <topic>:
  @pemit %#=<formatted help text>
```

Generate whichever format matches the server. Ask if unsure.

### Generic help attribute

When there is no softcoded help system, set a `HELP` attribute on the system object:

```mushcode
&HELP <obj>=
  %ch%cy+<COMMAND>[/<switch>] <args>%cn%r
  %r
    <One-sentence description.>%r
  %r
  Switches:%r
    /<switch>   <What it does.>%r
  %r
  Examples:%r
    +<command> foo     <What happens.>%r
    +<command>/sw foo  <What happens.>
```

For UDFs, add a `HELP` attribute documenting arguments and return value:

```mushcode
&HELP <obj>=
  u(<obj>/FN_NAME, %0=<type>, %1=<type>) → <return type>%r
  %r
    <Description.>%r
  %r
  Returns #-1 <REASON> if: <error conditions.>%r
  %r
  Example: u(<obj>/FN_NAME, foo, 42) → <expected>
```

### Help text rules (always)

- First line: syntax with argument types in `<angle brackets>`, optional in `[square brackets]`
- Use `%r` for newlines, `%t` for tab, `%ch%cy` for bold-cyan headers, `%cn` to reset
- Include at least one working example
- List every switch
- "See also" section if related commands exist
- Plain text — no hard-coded dbrefs in help text

---

## Phase 5 — Deploy

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

## Phase 6 — Verify (green)

```bash
RHOST_PASS=<pass> npx ts-node my-system.test.ts
```

All tests must pass before the task is complete.

---

## Phase 7 — Patterns

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
