# mush-architect

A Claude Code skill suite for RhostMUSH softcode development. Provides a structured, AI-assisted workflow for writing, testing, securing, documenting, migrating, and deploying RhostMUSH softcode — with mandatory quality gates at every step.

## Table of Contents

- [What This Is](#what-this-is)
- [Skills Overview](#skills-overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [How It Works](#how-it-works)
- [Skill Reference](#skill-reference)
  - [/mush-architect](#mush-architect-orchestrator)
  - [/mush-build](#mush-build)
  - [/mush-test](#mush-test)
  - [/mush-security](#mush-security)
  - [/mush-natural](#mush-natural)
  - [/mush-explain](#mush-explain)
  - [/mush-docs](#mush-docs)
  - [/mush-efficiency](#mush-efficiency)
  - [/mush-troubleshoot](#mush-troubleshoot)
  - [/mush-migrate](#mush-migrate)
  - [/mush-install](#mush-install)
- [Mandatory Gates](#mandatory-gates)
- [The mush-patterns Corpus](#the-mush-patterns-corpus)
- [Session Start Checklist](#session-start-checklist)
- [Contributing](#contributing)

---

## What This Is

`mush-architect` is a set of [Claude Code](https://claude.ai/code) skills — structured prompt files that guide Claude through specialized workflows. Drop them into your `.claude/skills/` directory and invoke them with `/mush-*` commands inside any Claude Code session.

This is **not** a traditional code library. There is no build step, no package to install, no runtime. The skills are markdown files that become part of Claude's working instructions for a session.

The suite is designed around three non-negotiable principles:

1. **Test first.** Every piece of softcode gets a `@rhost/testkit` test written before the code.
2. **Security always.** Every softcode session ends with a `/mush-security` audit.
3. **Corpus-driven.** Every session starts by loading the `mush-patterns` corpus so patterns are reused, not reinvented.

---

## Skills Overview

| Skill | Purpose |
|-------|---------|
| `/mush-architect` | Master orchestrator — routes to sub-skills, manages the corpus, enforces session start |
| `/mush-build` | Write new softcode (commands, UDFs, systems) with full TDD workflow |
| `/mush-test` | Write and run `@rhost/testkit` tests |
| `/mush-security` | Audit softcode for injection, privilege escalation, and data integrity issues |
| `/mush-natural` | Translate plain-English feature descriptions into softcode specs, then delegates to build |
| `/mush-explain` | Annotate and explain existing softcode line by line |
| `/mush-docs` | Generate in-game help text, code comments, and README-style docs |
| `/mush-efficiency` | Optimize softcode for speed, attribute count, and server load |
| `/mush-troubleshoot` | Debug failing softcode with systematic isolation |
| `/mush-migrate` | Port softcode between MUSH server flavors (PennMUSH, TinyMUX, TinyMUSH → RhostMUSH) |
| `/mush-install` | Deploy softcode to a live server via `@rhost/testkit` or `scripts/eval.js` |

---

## Prerequisites

- **[Claude Code](https://claude.ai/code)** — the CLI or desktop app. Skills are a Claude Code feature.
- **A RhostMUSH server** — local or remote, for running `@rhost/testkit` tests. See [rhostmush-docker](https://github.com/lcanady/rhostmush-docker) for a quick local setup.
- **Node.js 18+** — required by `@rhost/testkit`.
- **`@rhost/testkit`** — the test runner that connects to a live RhostMUSH server:
  ```bash
  npm install @rhost/testkit
  ```
- **The `mush-patterns` corpus** — companion repo, cloned alongside this one:
  ```bash
  git clone https://github.com/lcanady/mush-patterns ../mush-patterns
  ```
- **`gh` CLI** — for opening pull requests back to `mush-patterns` (optional but recommended):
  ```bash
  brew install gh && gh auth login
  ```

---

## Installation

Clone this repo and register the skills with Claude Code:

```bash
# 1. Clone mush-architect
git clone https://github.com/lcanady/mush-architect
cd mush-architect

# 2. Clone the patterns corpus alongside it (must be at ../mush-patterns)
git clone https://github.com/lcanady/mush-patterns ../mush-patterns

# 3. Tell Claude Code where the skills live
#    Add to ~/.claude/settings.json or your project's .claude/settings.json:
```

```json
{
  "skills": {
    "directories": ["/path/to/mush-architect/skills"]
  }
}
```

Alternatively, symlink the skills directory into your project's `.claude/skills/`:

```bash
ln -s /path/to/mush-architect/skills .claude/skills/mush
```

Once registered, the skills are available as `/mush-*` commands in any Claude Code session.

---

## How It Works

Every session flows through `/mush-architect`, which enforces a three-step session start before any code is written:

```
Step 1 — Sync check     → Verify ../mush-patterns is up to date with remote
Step 2 — Corpus load    → Read patterns relevant to the current task
Step 3 — Help detection → Check if any provided help file is from an unknown server
```

After that, work is routed to the appropriate sub-skill. Each sub-skill has its own mandatory gates — the most important being:

- **Mushcode written?** → `/mush-security` must run before the session closes.
- **Non-mushcode written?** → `/tdd-audit` must run before the session closes.
- **Any softcode at all?** → A `@rhost/testkit` test must be written and pass.

The session ends by writing any new patterns or security findings back to `../mush-patterns` via pull request.

### Directory layout

```
mush-architect/
├── SKILL.md                    ← /mush-architect (orchestrator)
└── skills/
    ├── mush-build/
    │   └── SKILL.md            ← /mush-build
    ├── mush-docs/
    │   └── SKILL.md            ← /mush-docs
    ├── mush-efficiency/
    │   └── SKILL.md            ← /mush-efficiency
    ├── mush-explain/
    │   └── SKILL.md            ← /mush-explain
    ├── mush-install/
    │   └── SKILL.md            ← /mush-install
    ├── mush-migrate/
    │   └── SKILL.md            ← /mush-migrate
    ├── mush-natural/
    │   └── SKILL.md            ← /mush-natural
    ├── mush-security/
    │   └── SKILL.md            ← /mush-security
    ├── mush-test/
    │   └── SKILL.md            ← /mush-test
    └── mush-troubleshoot/
        └── SKILL.md            ← /mush-troubleshoot
```

The companion repo at `../mush-patterns` is expected at that exact relative path. All skills read from it at session start and write back to it at session end.

---

## Skill Reference

### /mush-architect (Orchestrator)

The entry point for all MUSH work. Invoked implicitly at the start of every session.

**What it does:**
- Runs the three-step session start checklist (sync, corpus load, help detection)
- Routes to the appropriate sub-skill based on the task
- Enforces the planning gate: no softcode may be written until the design is stated, patterns are checked, and the test is written

**Session start output** (reported at the top of every session):
```
✓ mush-patterns synced (or: N commits behind — pulled)
✓ Corpus loaded: 3 patterns matched for [task domain]
✓ No unknown help files detected (or: new server found — PR offered)
```

---

### /mush-build

Write new RhostMUSH softcode. The core build workflow.

**Phase sequence (all mandatory, in order):**

| Phase | What happens |
|-------|-------------|
| 1 — Design | State the object, inputs, outputs, and error cases. Check mush-patterns. |
| 2 — Test first | Write the `@rhost/testkit` test. It will fail (red). |
| 3 — Code | Write the softcode. |
| 4 — Docs | Generate help text for every command and UDF. |
| 5 — Deploy | Install softcode + help attributes to the server. |
| 6 — Verify | Run the test. It must pass (green). |
| 7 — Patterns | Extract reusable patterns and add to `../mush-patterns`. |
| 8 — Security | Run `/mush-security` on all softcode written this session. |

**UDF template:**
```mushcode
&FN_NAME <obj>=
  [if(not(%0), #-1 MISSING ARG,
    <expression using %0 %1 etc.>
  )]
```

**Command template:**
```mushcode
&CMD_NAME <obj>=$+name[/<switch>] *:
  @switch/first %0=
    /switch1, <action1>,
    /switch2, <action2>,
    @pemit %#=Unknown switch.
```

**Error conventions:**
- `#-1 REASON` — generic error / not found
- `#-2` — permission denied
- `#-3` — wrong number of arguments

---

### /mush-test

Write and run `@rhost/testkit` tests.

**Minimal test file:**
```typescript
import { RhostRunner } from '@rhost/testkit';

const PASS = process.env.RHOST_PASS;
if (!PASS) { console.error('RHOST_PASS env var is required'); process.exit(1); }

const runner = new RhostRunner();

runner.describe('MySystem', ({ it, beforeAll }) => {
    beforeAll(async ({ client }) => {
        await client.command('@halt/all me');  // suppress background noise
    });

    it('happy path', async ({ expect }) => {
        await expect('u(#42/FN_NAME,arg1)').toBe('expected');
    });

    it('returns error on bad input', async ({ expect }) => {
        await expect('u(#42/FN_NAME,)').toBeError();
    });
});

runner
    .run({ host: 'localhost', port: 4201, username: 'Wizard', password: PASS })
    .then(r => process.exit(r.failed > 0 ? 1 : 0))
    .catch(err => { console.error(err.message); process.exit(1); });
```

**Run:**
```bash
RHOST_PASS=<pass> npx ts-node my-system.test.ts
```

**Matcher quick reference:**

| Matcher | Use when |
|---------|----------|
| `.toBe('x')` | Exact string match (trimmed) |
| `.toContain('x')` | Output includes substring |
| `.toMatch(/regex/)` | Regex match |
| `.toBeNumber()` | Output is a number |
| `.toBeCloseTo(n, p)` | Floating point comparison |
| `.toBeTruthy()` | Non-empty, non-zero, non-error |
| `.toBeFalsy()` | Empty, `"0"`, or error |
| `.toBeError()` | Starts with `#-1`, `#-2`, `#-3` |
| `.toBeDbref()` | Matches `#<digits>` |
| `.toContainWord('x')` | Word in space-delimited list |
| `.toHaveWordCount(n)` | List has exactly n words |
| `.not.toBe(...)` | Negation |

**Mandatory gate:** Any session that writes TypeScript test code must run `/tdd-audit` before closing.

---

### /mush-security

Audit RhostMUSH softcode for security issues.

**Audit checklist:**

*Injection*
- User input (`%0`–`%9`, `%+`, `%_`) interpolated without stripping
- `[` or `]` in user input opening evaluation contexts
- `;` as command separator with user-controlled values
- `execscript()` with user-controlled script name or arguments

*Privilege*
- Command accessible at wrong lock level
- `@fo`/`@force` without proper lock check
- Object not flagged `SAFE`
- Parent chain not locked

*Data integrity*
- No `isnum()` check on numeric inputs
- No empty-arg guard (`not(%0)`)
- DB writes without `canEdit` check

*Output*
- ANSI/color codes stored to DB without stripping
- Return values not normalized

**Severity levels:**
- **Critical** — arbitrary code execution or privilege escalation
- **High** — data corruption or unauthorized access
- **Medium** — information disclosure or denial of service
- **Low** — style/hygiene issues with security implications

**After every audit — mandatory:** Write findings (patterns AND anti-patterns) to `../mush-patterns/patterns/` and open a PR. This step is not optional even if no issues were found — document the secure patterns observed.

---

### /mush-natural

Translate plain-English feature descriptions into softcode specs, then hand off to `/mush-build`.

**Workflow:**
1. Ask one targeted clarifying question at a time (lock level, inputs, success/failure shape, state changes)
2. Produce a concrete spec:
   > `+sheet` (connected) — emit a formatted table of `STAT.*` attributes on `u.me` to `%#`. Columns: name (left-padded 20), value (right-padded 5).
3. Delegate the spec to `/mush-build` and proceed through the full phase sequence.

---

### /mush-explain

Annotate and explain existing softcode.

**Output format:**
```
&FN_CLAMP #obj=                        ← define a UDF named FN_CLAMP on #obj
  [if(lt(%0,%1),%1,                    ← if arg0 < arg1 (min), return min
    if(gt(%0,%2),%2,                   ← else if arg0 > arg2 (max), return max
      %0))]                            ← else return arg0 unchanged
```

After explaining, if the code contains patterns not in `../mush-patterns`, offers to extract and PR them.

---

### /mush-docs

Generate in-game help text, code comments, and README-style docs.

**Help text format:**
```
+COMMAND[/<switch>] <arg>
  Brief description.

  Longer explanation.

  Switches:
    /switch1    What it does.

  Examples:
    +command foo        Does the thing.

  See also: +other
```

Supports three output formats: in-game help (`+help`, `help`), code comments (`/* ... */`), and plain-text README.

---

### /mush-efficiency

Optimize softcode for performance. Key techniques:

- **Cache with `%q` registers** — avoid re-evaluating expensive expressions
- **Store lists, not N attributes** — one attribute with a delimiter beats N separate reads
- **Prefer native functions** — `words()`, `extract()`, `lattr()` are faster than chained `u()` calls
- **Flatten nested `iter()`** — nesting evaluates exponentially
- **Minimize `@trigger` hops** — each hop is a separate server eval

**Profiling:**
```typescript
it('benchmark: FN_EXPENSIVE under 100ms', async ({ client }) => {
    const start = Date.now();
    await client.eval('u(#42/FN_EXPENSIVE,test)');
    if (Date.now() - start > 100) throw new Error('Too slow');
});
```

**Mandatory:** All optimizations must keep existing tests green.

---

### /mush-troubleshoot

Debug failing softcode with systematic isolation.

**Diagnostic workflow:**
1. Write a `@rhost/testkit` test that captures the failure — before touching any code
2. Reduce to the smallest failing expression
3. Use `think` and `@pemit` to expose intermediate values
4. Form one hypothesis, test it
5. Make the minimal fix
6. Verify the test from step 1 now passes

**Common failure modes:**

| Symptom | Likely cause |
|---------|-------------|
| `#-1 NO MATCH` | Wrong dbref or object destroyed |
| Empty output | `%0` empty; attribute unset; `u()` on wrong object |
| Wrong number | Off-by-one in `extract()`; `#@` vs `##` in `iter()` |
| Command fires for wrong players | Lock too broad |
| Command never fires | Pattern regex mismatch; `$` prefix missing |
| Infinite loop / lag | `@trigger` or `u()` cycle; missing base case |

**Isolation:**
```bash
RHOST_PASS=<pass> node scripts/eval.js "extract(a b c,2,1)"
```

---

### /mush-migrate

Port softcode between MUSH server flavors.

**Compatibility matrix (common differences):**

| Feature | RhostMUSH | PennMUSH | TinyMUX | TinyMUSH |
|---------|-----------|----------|---------|---------|
| `execscript()` | yes | no | no | no |
| `encode64()`/`decode64()` | yes | no | no | no |
| `digest()` | yes | no | no | no |
| `localize()` | yes | yes | no | no |
| `@hook` | yes | yes | limited | no |
| `@program` | no | yes | no | no |
| `@dolist` | yes | yes | yes | limited |

**Migration steps:**
1. Inventory all functions and commands in the source
2. Flag incompatibilities against the matrix
3. Substitute with equivalent patterns from `../mush-patterns/`
4. Write `@rhost/testkit` tests for each migrated function
5. All tests green on the target server

**Mandatory:** `/mush-security` must run on all migrated softcode before closing. Migration often carries forward vulnerabilities from the source.

---

### /mush-install

Deploy softcode to a live server.

**Methods:**

*One command at a time:*
```bash
RHOST_PASS=<pass> node scripts/eval.js "@create MySystem <sys>"
RHOST_PASS=<pass> node scripts/eval.js "&FN_NAME #42=..."
```

*Programmatic (scriptable):*
```typescript
import { RhostClient } from '@rhost/testkit';

const client = new RhostClient({ host: 'localhost', port: 4201 });
await client.connect();
await client.login('Wizard', process.env.RHOST_PASS);

const dbref = await client.eval('@create MySystem <sys>');
await client.command(`&FN_NAME ${dbref}=...`);
await client.disconnect();
```

**Deployment checklist:**
- [ ] Server is running and reachable
- [ ] `RHOST_PASS` is set (not the default `Nyctasia`)
- [ ] Object created and dbref noted
- [ ] All attributes/commands set
- [ ] Object locked (`@set <obj>=safe`, `@lock <obj>=<owner>`)
- [ ] `@rhost/testkit` tests pass against the deployed code

**Mandatory:** Any deployment scripts written must have `/tdd-audit` run before the session closes.

---

## Mandatory Gates

These gates apply across the entire suite and cannot be skipped:

| Trigger | Gate |
|---------|------|
| Any softcode written | `@rhost/testkit` test written and passing |
| Any softcode written | `/mush-security` run before session closes |
| Softcode migrated | `/mush-security` run (migration carries forward source vulns) |
| TypeScript/shell code written | `/tdd-audit` run before session closes |
| Any security audit completed | Findings written to `../mush-patterns` via PR |
| Session start | Sync check + corpus load + help file detection |

---

## The mush-patterns Corpus

`mush-architect` is one half of a two-repo system. The other half is [`mush-patterns`](https://github.com/lcanady/mush-patterns) — a community RAG corpus of documented softcode patterns.

```
mush-patterns/
└── patterns/
    ├── functions/     ← Reusable UDFs and function patterns
    ├── commands/      ← Command implementations (+cmd, @cmd)
    ├── systems/       ← Complete systems (bboard, chargen, stats, etc.)
    └── server-help/   ← Annotated help files from specific servers
```

**Every session reads from it. Every session writes back to it.**

Patterns extracted during a session are contributed as PRs. Security findings (both secure patterns and anti-patterns) are contributed after every `/mush-security` audit. Over time the corpus grows richer and every future session starts with more to work from.

The corpus must be cloned at `../mush-patterns` relative to this repo. This path is hardcoded in every skill.

---

## Session Start Checklist

Run at the top of every session via `/mush-architect`:

### Step 1 — Sync check

```bash
cd ../mush-patterns && git fetch origin && git status
```

| Status | Action |
|--------|--------|
| Up to date | Proceed |
| Behind by N commits | Ask user to pull |
| Ahead by N commits | Ask user to push |
| Diverged | Stop — ask user to resolve |
| Repo missing | Tell user to clone: `git clone https://github.com/lcanady/mush-patterns ../mush-patterns` |

### Step 2 — Corpus load

Read `../mush-patterns/README.md` and `CONTRIBUTING.md`, then read the domain-specific patterns for the current task. Report which patterns were loaded and whether any match.

### Step 3 — Help file detection

If the user has pasted a help file from a server not in `../mush-patterns/patterns/server-help/`, offer to extract patterns and open a PR.

---

## Contributing

Contributions to the skill suite are welcome. Each skill is a single `SKILL.md` file — edit it, test it in a real Claude Code session, and open a PR.

When adding a new skill:
1. Create `skills/<skill-name>/SKILL.md`
2. Use the frontmatter format from an existing skill
3. Add the skill to the sub-skills table in the root `SKILL.md`
4. Document it in this README

For patterns extracted during sessions, contribute them to [`mush-patterns`](https://github.com/lcanady/mush-patterns) directly.
