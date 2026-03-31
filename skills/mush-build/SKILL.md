---
name: mush-build
description: "Write RhostMUSH softcode — commands, UDFs, and systems. Use when the user wants to build, write, create, or code a MUSH system, feature, command, or function."
effort: high
paths: "**/*.mush,**/src/**,**/tests/**"
argument-hint: "[system or feature to build]"
date_added: "2026-03-27"
---

> **Phases are mandatory and ordered. Complete Phase 0 (Session) before anything else. Do NOT skip to code.**


# mush-build

Write RhostMUSH softcode. Every task produces softcode, tests, a packaged installer, and help files.

## ⚠ /mush-session is MANDATORY FIRST

**Every session MUST begin with `/mush-session` — corpus sync, manifest load, server detection.**

- Do not design, write, or test anything until `/mush-session` completes green.
- There are no exceptions.

## ⚠ /mush-lint is MANDATORY before packaging

**Every session MUST run `/mush-lint` before Phase 6 — Package.**

- All ERRORs must be resolved. WARNs may be acknowledged with explanation.
- Do not write the installer file until lint is clean.
- There are no exceptions.

## Parallel execution

`/mush-lint` (Phase 5) and `/mush-security` (Phase 11) are both read-only analysis passes on the same source. They have no dependencies on each other and can run concurrently. When time matters, launch both at once:

```
(/mush-lint & /mush-security) → review findings → fix → rerun if needed → Phase 6
```

Similarly, `/mush-docs` (Phase 4) and `/mush-review` can run in parallel once code is written — docs generates output, review produces findings, neither blocks the other.

## ⚠ /mush-test is MANDATORY

**Every session that writes softcode MUST run `/mush-test` — write the test first, verify it passes last.**

- Do not write softcode without writing the `@rhost/testkit` test first (Phase 2).
- Do not mark any task complete until `/mush-test` is run and all tests pass (green).
- There are no exceptions.

## ⚠ /mush-security is MANDATORY

**Every session that produces softcode MUST run `/mush-security` before closing.**

- Run it on all softcode written in the session — not just the final output.
- Do not mark the session complete until mush-security has run and all Critical/High findings are resolved.
- There are no exceptions.

```
Phase 0 — Session    → Run /mush-session (corpus sync, manifest load, server detect) — MANDATORY FIRST
Phase 1 — Design     → Understand requirements; check ../mush-patterns corpus
Phase 2 — Test first → Write the @rhost/testkit test (RED — it will fail)
Phase 3 — Code       → Write the softcode
Phase 4 — Docs       → Generate help/help.txt + help/[project].help.installer.txt (MANDATORY)
Phase 5 — Lint       → Run /mush-lint — fix all ERRORs before proceeding (MANDATORY)
Phase 6 — Package    → Run /mush-format compress to write dist/[project].installer.txt (MANDATORY)
Phase 7 — Manifest   → Run /mush-manifest to record objects and checksums (MANDATORY)
Phase 8 — Deploy     → Install softcode + help attributes to server
Phase 9 — Verify     → Run the test (GREEN — task is now complete)
Phase 10 — Learn     → Run /mush-learn to extract patterns into ../mush-patterns corpus (MANDATORY)
Phase 11 — Security  → Run /mush-security on all softcode written this session (MANDATORY)
```

**Phases are mandatory and ordered. Skipping any phase is a protocol violation.**

---

## Phase 1 — Design

Before writing any code:

1. **Corpus must already be loaded** — the `mush-architect` session start checklist (sync + corpus load + help detection) MUST have run before this phase. If it has not, stop and run it now.
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

### Local variable scoping — prefer `ulocal()` over `setq()`

Use `ulocal()` when calling a UDF that uses registers internally — it scopes `%q0`–`%q9` to the call frame and prevents register bleed across nested calls:

```mushcode
@@ Caller — safe, registers not clobbered
[ulocal(#DBREF/FN_NAME, arg)]

@@ Inside FN_NAME — use setq freely, ulocal isolates them
&FN_NAME <obj>= [setq(0, <computed>)][if(%q0, ...)]
```

Use `setq()` / `u()` only when you explicitly need the register to propagate up to the caller.

### Version guard — add to every system object

Every `@create`d object must carry a `VER` attribute. The installer checks it before overwriting:

```mushcode
&VER <obj>=0.1.0

@@ Version check — run before full install in upgrade scenarios:
@@ think if(gt(numver(get(#DBREF/VER)), numver(0.1.0)), @pemit %#=Already up to date., <install commands>)
```

### Attribute chunking — for functions exceeding 8000 chars

RhostMUSH has an ~8000 character attribute limit. Split large functions:

```mushcode
&FN_NAME.0 <obj>= [first half of logic]
&FN_NAME.1 <obj>= [second half of logic]

@@ Dispatcher
&FN_NAME <obj>=
  [case(1,
    lt(strlen(%0), 4000), u(me/FN_NAME.0, %0, %1),
    u(me/FN_NAME.1, %0, %1)
  )]
```

`mush-lint` check **L1** flags any attribute body exceeding 7500 chars and recommends chunking.

### Error return convention

- `#-1 REASON` — generic error / not found
- `#-2` — permission denied
- `#-3` — wrong number of arguments

Always include a human-readable reason after `#-1`.

---

## Phase 4 — Docs (MANDATORY)

Every command and every UDF written in Phase 3 MUST have help text before deployment.

Phase 4 always produces **two output files** in `help/`:

| File | Purpose |
|------|---------|
| `help/help.txt` | Plain-text help reference, 78-char max width |
| `help/[project].help.installer.txt` | Softcode installer for the server's help system |

### Step 1 — Detect the help system

Ask the user (once per session, remember the answer):

> "What help system does your server use? (e.g. `+help`, `&HELPFILE`, a custom `$help` command, or none?)"

**Do not assume `+help` or any specific system.** Wait for the user's answer before generating any softcode help attributes.

| Answer | Action |
|--------|--------|
| **Describes a system** | Generate `help/[project].help.installer.txt` in that exact format (see [Softcoded help installer](#softcoded-help-installer) below) |
| **None / no softcoded help** | Generate only `help/help.txt`; set a plain `HELP` attribute on the system object in the main installer |

### help/help.txt — plain text format

Always generate this file regardless of whether a softcoded help system exists. 78-character max line width, hard-wrapped.

```
&[TOPIC]
------------------------------------------------------------------------------
+command [<arg>] [/<switch>]

  One-sentence description of what the command does.

  Switches:
    /switch   What this switch does.

  Examples:
    +command foo       Does the thing.
    +command/sw foo    Does the other thing.

  See also: [related topic]

&[TOPIC2]
------------------------------------------------------------------------------
...
```

Rules:
- Topic headers: `&[TOPIC]` on its own line (uppercase, matches attribute name)
- Divider: exactly 78 `-` dashes on the line below each `&[TOPIC]`
- Blank line before and after every paragraph block
- Hard-wrap all lines at 78 characters
- No ANSI codes, no `%r`, no MUSH syntax — plain ASCII only
- One entry per command or UDF; UDFs documented with argument types and return value

### Softcoded help installer

`help/[project].help.installer.txt` follows the same header/footer/section rules as the main installer (metadata block, 78-char separators), but contains **only** help attributes.

Generate the attribute format the user described. Common patterns for reference:

**Attribute-per-topic on a help object:**
```mushcode
&HELP_<TOPIC> <helpobj>=
  %ch%cy+<COMMAND>[/<switch>] <args>%cn%r
  %r
    Description.%r
  %r
  Switches:%r
    /<switch>   What it does.%r
  %r
  Examples:%r
    +<command> foo     Result.%r
  %r
  See also: [topic]
```

**`&HELPFILE` pointer style:**
```mushcode
&HELPFILE <obj>=<helpobj>
&HELP_<TOPIC> <helpobj>=<text as above>
```

**Command-based help (`$help <topic>`):**
```mushcode
&CMD_HELP_<TOPIC> <obj>=$help <topic>:
  @pemit %#=<formatted help text>
```

Generate whichever format matches the server's actual system. If unsure, ask again.

### Help text rules (always)

- First line: syntax with argument types in `<angle brackets>`, optional in `[square brackets]`
- In softcode: use `%r` for newlines, `%t` for tab, `%ch%cy` for bold-cyan headers, `%cn` to reset
- Include at least one working example per command
- List every switch
- "See also" section if related commands exist
- No hard-coded dbrefs in any help text

---

## Phase 6 — Package (MANDATORY)

Every build session produces the following output files:

| File | Purpose |
|------|---------|
| `dist/[project].installer.txt` | Main softcode installer |
| `help/help.txt` | Plain-text help reference (78-char max width) |
| `help/[project].help.installer.txt` | Softcode help installer for the server's help system |

Create `dist/` and `help/` if they don't exist.

### Step 1 — Compress softcode

Run `/mush-format compress` to produce the installer from the readable source:

```bash
rhost-testkit mush-format compress softcode/[project].mush
```

This reads meta from `manifest.json` (or `package.json`) automatically, producing `dist/[project].installer.txt` with the correct header and comment conversion. Pass `--name`, `--version`, `--author`, `--requires` to override meta fields.

After compressing, verify the output has a correct header block and an `UNINSTALL` section.

### Output rules

**File location and name:**
- Always write to `dist/[project].installer.txt` (create `dist/` if it doesn't exist)
- `[project]` is the slugified project name (lowercase, hyphens, no spaces): e.g. `my-cool-system.installer.txt`

**Comment conversion (handled automatically by `/mush-format compress`):**
- All `//` line comments in `.mush` files → `@@` in the installer
- All inline comments → `@@(comment)` on the same line

**Attribute ordering within each object block:**
1. Config / data attributes (`&D_*`, `&CONF_*`)
2. UDFs (`&FN_*`)
3. Commands (`&CMD_*`, `$`-triggered)
4. Help attributes (`&HELP*`)

**Separator and section divider rules (strictly enforced):**
- Every `@@ ===...` separator line must be exactly **78 characters** total: `@@ ` (3 chars) + 75 `=` signs
- Every `@@ ---[ SECTION ]---` divider must be exactly **78 characters** total: `@@ ` (3 chars) + section label centered in 75 chars of `-` dashes
- Use this centering formula: `floor((75 - len(label)) / 2)` dashes left, remainder right

### Installer file structure

Progress `@pemit me=` lines are **mandatory** in every installer. They run during paste and give the installing wizard real-time feedback. Use the format below exactly — `>>` for start/end banners, three spaces + verb for section steps.

```
@@ https://github.com/[owner]/[repo]
@@
@@ ===========================================================================
@@ Mushcode Installer for: [Project Name]
@@
@@ Author:  [Author Name]
@@ Server:  [Server Type]
@@ Version: 0.0.0
@@
@@ Requires:   [list prerequisites — flags, objects, other installers — or "None"]
@@ Objects Created:
@@   - [Object Name] ([role])
@@
@@ Usage: Paste directly into client or use @paste
@@ WARNING: Must be run as Wizard   ← include only if wizard privs required
@@ ===========================================================================
@@
@@ CHANGED:   ← omit this block if version is 0.0.0
@@   0.0.0 → 0.1.0  [description of change]

@pemit me=>> Installing [Project Name] v[version]...

@@ --------------------------------[ CONFIG ]----------------------------------
@pemit me=   Creating objects...
@@ NOTE: Run '@search name=<ObjectName>' first — reinstall overwrites, does not duplicate
@create [Object Name]=<type>
@set [Object Name]=inherit safe
@fo me=&D_SYS me=search(name=[Object Name])

@@ ------------------------------[ FUNCTIONS ]--------------------------------
@pemit me=   Loading functions...
&FN_NAME [obj]= ...

@@ ------------------------------[ COMMANDS ]--------------------------------
@pemit me=   Loading commands...
&CMD_NAME [obj]= ...

@@ ----------------------------------[ HELP ]---------------------------------
@pemit me=   Loading help...
&HELP [obj]= ...

@pemit me=>> [Project Name] v[version] installed. Type 'help [topic]' to get started.

@@ ------------------------------[ UNINSTALL ]--------------------------------
@@ To remove this installer completely, run:
@@   @destroy [obj]
@@   @del [helpobj]/HELP_[TOPIC]   ← if a separate help object was used

@@
@@ ===========================================================================
@@ Created with MUSH-ARCHITECT (https://github.com/kumakun/mush-architect)
@@ ===========================================================================
```

**Progress message rules:**
- `@pemit me=>> [text]` — start banner and completion banner only
- `@pemit me=   [verb]...` — one per section (three leading spaces, present-tense verb, trailing `...`)
- Section verbs should describe what's happening: `Creating objects`, `Loading functions`, `Loading commands`, `Loading help`, `Applying config`, `Registering hooks`
- Completion message names the project, version, and gives a useful next step
- `@pemit me=` sends only to the installing wizard — not broadcast to the room
- These lines pass through `/mush-format compress` unchanged (they are commands, not attributes)

---

## Phase 8 — Deploy

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

## Phase 9 — Verify (green)

```bash
RHOST_PASS=<pass> npx ts-node my-system.test.ts
```

All tests must pass before the task is complete.

---

## Phase 10 — Patterns

After completing the task, check if any new patterns emerged that aren't in `../mush-patterns/`. If so, add them following the format in `../mush-patterns/CONTRIBUTING.md`.

---

## Common patterns (from ../mush-patterns corpus)

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
