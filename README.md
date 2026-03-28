# mush-architect

A Claude Code skill suite for RhostMUSH softcode development. Provides a structured, AI-assisted workflow for writing, testing, securing, documenting, deploying, and maintaining RhostMUSH softcode — with mandatory quality gates at every step.

## Table of Contents

- [What This Is](#what-this-is)
- [Skills Overview](#skills-overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [How It Works](#how-it-works)
- [Workflow Chains](#workflow-chains)
- [Skill Reference](#skill-reference)
- [Mandatory Gates](#mandatory-gates)
- [The mush-patterns Corpus](#the-mush-patterns-corpus)
- [Reference Corpus](#reference-corpus)
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

### Core workflow

| Skill | Purpose |
|-------|---------|
| `/mush-architect` | Master orchestrator — routes to sub-skills, manages corpus, enforces session start |
| `/mush-build` | Write new softcode (commands, UDFs, systems) with full TDD workflow |
| `/mush-test` | Write and run `@rhost/testkit` tests |
| `/mush-lint` | Static checks: safety, completeness, formatting, style |
| `/mush-security` | Audit for injection, privilege escalation, and data integrity issues |
| `/mush-docs` | Generate in-game help text, code comments, and README-style docs |
| `/mush-install` | Deploy softcode to a live RhostMUSH server |

### Development tools

| Skill | Purpose |
|-------|---------|
| `/mush-natural` | Translate plain-English feature descriptions into softcode specs |
| `/mush-explain` | Annotate and explain existing softcode line by line |
| `/mush-efficiency` | Optimize softcode for speed, attribute count, and server load |
| `/mush-troubleshoot` | Debug failing softcode with systematic isolation |
| `/mush-simulate` | Trace softcode execution statically — recursion detection, type checks, register flow |
| `/mush-deps` | Map dependencies between attrs — "what calls this?", "what breaks if removed?" |
| `/mush-review` | Senior-level code review: logic, idioms, architecture, edge cases |
| `/mush-coverage` | Map attributes to tests; identify untested high-risk code |

### Server operations

| Skill | Purpose |
|-------|---------|
| `/mush-monitor` | Check server health: connectivity, player count, error logs, object drift |
| `/mush-export` | Pull softcode off a live server into `src/` files |
| `/mush-audit` | Compare live server state to manifest — detect drift |
| `/mush-config` | Read/write `@admin` config params and manage `rhost_ingame.conf` |
| `/mush-hook` | Build and manage RhostMUSH `@hook` attributes (B_, A_, P_, I_, AF_, M_) |

### Project lifecycle

| Skill | Purpose |
|-------|---------|
| `/mush-session` | Session start checklist: sync corpus, load patterns, verify help corpus |
| `/mush-init` | Scaffold a new project: `src/`, `dist/`, `tests/`, `help/`, config files |
| `/mush-watch` | Dev-mode watch loop: auto-rebuild installer on file save |
| `/mush-hooks` | Configure Claude Code hooks for automated lint/security gates |
| `/mush-manifest` | Track objects, dbrefs, and attribute checksums in `dist/manifest.json` |
| `/mush-patch` | Diff two manifest versions and generate a minimal migration installer |
| `/mush-rollback` | Generate and apply a rollback installer to undo a deployment |
| `/mush-release` | Full release workflow: version bump, changelog, tag, push |
| `/mush-upgrade` | Managed version upgrade: diff → patch → apply → verify |
| `/mush-learn` | Extract reusable patterns from sessions and contribute to `mush-patterns` |

### System scaffolders

| Skill | Purpose |
|-------|---------|
| `/mush-chargen` | Scaffold a complete character generation system |
| `/mush-bboard` | Scaffold a bulletin board system (post/read/reply, subscriptions) |
| `/mush-jobs` | Scaffold a job/request tracking system |

### Documentation

| Skill | Purpose |
|-------|---------|
| `/mush-migrate` | Port softcode between MUSH server flavors |
| `/mush-readme` | Generate or update README.md from src/ and manifest files |

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
```

Add the skills directory to `~/.claude/settings.json` or your project's `.claude/settings.json`:

```json
{
  "skills": {
    "directories": ["/path/to/mush-architect/skills"]
  }
}
```

Or symlink directly into your project:

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

After that, work is routed to the appropriate sub-skill. Each sub-skill has its own mandatory gates:

- **Softcode written?** → `/mush-security` must run before the session closes.
- **Any softcode written?** → A `@rhost/testkit` test must be written and pass.
- **Session closes?** → New patterns extracted and contributed to `../mush-patterns` via PR.

### Directory layout

```
mush-architect/
├── SKILL.md                    ← /mush-architect (orchestrator)
├── reference/
│   ├── rhost-help.txt          ← Full RhostMUSH help corpus (37K lines, 1951 topics)
│   ├── rhost-wizhelp.txt       ← Full RhostMUSH wizhelp corpus (16K lines, 1278 topics)
│   ├── rhost-help-topics.txt   ← Sorted topic index for fast grep
│   ├── rhost-wizhelp-topics.txt
│   └── rhost.md                ← Lookup guide (awk/grep patterns)
└── skills/
    ├── mush-audit/
    ├── mush-bboard/
    ├── mush-build/
    ├── mush-chargen/
    ├── mush-config/
    ├── mush-coverage/
    ├── mush-deps/
    ├── mush-docs/
    ├── mush-efficiency/
    ├── mush-explain/
    ├── mush-export/
    ├── mush-hook/
    ├── mush-hooks/
    ├── mush-init/
    ├── mush-install/
    ├── mush-jobs/
    ├── mush-learn/
    ├── mush-lint/
    ├── mush-manifest/
    ├── mush-migrate/
    ├── mush-monitor/
    ├── mush-natural/
    ├── mush-patch/
    ├── mush-readme/
    ├── mush-release/
    ├── mush-review/
    ├── mush-rollback/
    ├── mush-security/
    ├── mush-session/
    ├── mush-simulate/
    ├── mush-test/
    ├── mush-troubleshoot/
    ├── mush-upgrade/
    └── mush-watch/
```

The companion repo at `../mush-patterns` is expected at that exact relative path. All skills read from it at session start and write back to it at session end.

---

## Workflow Chains

### New feature (full pipeline)

```
/mush-session → /mush-build (phases 0-4) → /mush-lint → /mush-build (phases 5-7)
→ /mush-manifest → /mush-install → /mush-test → /mush-security → /mush-learn
```

### Fix a bug (minimal)

```
/mush-session → /mush-troubleshoot → /mush-build (phase 3 only)
→ /mush-lint → /mush-patch → /mush-install → /mush-test
```

### Natural language to deployed

```
/mush-natural → /mush-build → /mush-lint → /mush-install
→ /mush-test → /mush-security → /mush-learn
```

### Scaffold a new system

```
/mush-chargen (or /mush-bboard or /mush-jobs)
→ /mush-test → /mush-lint → /mush-security → /mush-docs → /mush-build phases 5-11
```

### Upgrade a deployed system

```
/mush-audit → /mush-review → /mush-release → /mush-upgrade → /mush-monitor
```

### Sync and audit a live server

```
/mush-export → /mush-audit → /mush-deps → /mush-coverage
```

### Pre-refactor safety check

```
/mush-deps <attr> → /mush-coverage → /mush-simulate <attr>
```

### New project from zero

```
/mush-init → /mush-session → /mush-hooks → /mush-build
```

---

## Skill Reference

### /mush-architect (Orchestrator)

Entry point for all MUSH work. Routes tasks to the right sub-skill and enforces the session start checklist, planning gate, and mandatory `/mush-test` requirement.

**Mandatory before any code:** Design plan → pattern check → test written (red) → code → test passing (green).

---

### /mush-build

Write new RhostMUSH softcode. Phases 0–11 cover design, test-first, code, lint, manifest, install, verify, docs, help-install, patterns, security, and package.

---

### /mush-test

Write and run `@rhost/testkit` tests. Produces TypeScript test files in `tests/`. Every command and UDF must have coverage. Mandatory on every session that writes softcode.

---

### /mush-lint

16 static checks across safety (S1–S5), completeness (C1–C4), formatting (F1–F5), chunking (L1), and style (I1–I3). Reports ERROR/WARN/INFO. ERROR blocks packaging.

---

### /mush-security

Audit for injection (user input in `u()`, `[`, `;`), privilege escalation (`@fo`, lock levels), and data integrity (`isnum()` guards, `@set SAFE`). Findings go to `../mush-patterns` via PR.

---

### /mush-docs

Generate in-game help text (78-char max width, `&[TOPIC]` headers), code comments, and README entries. Produces `help/help.txt` and `help/<project>.help.installer.txt`.

---

### /mush-install

Deploy softcode to a live server via `scripts/eval.js` or `@rhost/testkit` client. Includes deployment checklist: server reachable, object locked, tests passing post-deploy.

---

### /mush-natural

Translate plain-English feature descriptions into concrete softcode specs. Asks one clarifying question at a time, then delegates to `/mush-build`.

---

### /mush-explain

Annotate existing softcode line by line. Outputs code with inline `@@` comments explaining every expression, register, and branch. Offers to extract patterns afterward.

---

### /mush-efficiency

Optimize for speed and resource use. Techniques: `%q` register caching, list attributes over N attrs, native functions over chained `u()`, flattened `iter()`, fewer `@trigger` hops.

---

### /mush-troubleshoot

Debug failing softcode. Workflow: capture failure in a test → reduce to minimal expression → form one hypothesis → fix → test green.

---

### /mush-simulate

Static execution tracer. Walks function call chains step by step, substitutes values, tracks `%q` registers, detects recursion and limit violations. Integrates with `@rhost/vision` for live server data.

---

### /mush-deps

Dependency map for softcode. Shows what calls what, orphaned attributes, cross-object coupling. Run before any refactor or deletion. Impact analysis: "what breaks if I remove X?"

---

### /mush-review

Senior code review. Four finding types: CRITICAL / CONCERN / SUGGESTION / POSITIVE. Covers logic, RhostMUSH idioms, architecture, maintainability, edge cases, testability.

---

### /mush-coverage

Maps every attribute to its tests. Classifies by risk: HIGH (commands), MEDIUM (UDFs), LOW (data/help). Can scaffold `.todo` test stubs for uncovered attrs.

---

### /mush-monitor

Read-only server diagnostic. Checks: connectivity, player count, uptime, object VER vs manifest, error log tail. Reports OK / WARN / ERROR / OFFLINE.

---

### /mush-export

Pulls softcode off a live server into `src/` files. Categorizes attrs by prefix: `CMD_*` → commands.mush, `FN_*` → functions.mush, `D_*` → data.mush, `A_*` → triggers.mush, etc. Never overwrites without confirmation.

---

### /mush-audit

Compares live server vs manifest. Classifies every attribute as MATCH / DRIFT / MISSING / UNTRACKED / OBJECT_MISSING / DBREF_CHANGED. Read-only — never modifies the server.

---

### /mush-config

Read/write `@admin` config params. Manages the `admin_object` + `_LINE#` + `rhost_ingame.conf` pattern for config that survives server reboots. First-time setup walkthrough included.

---

### /mush-hook

Build and manage RhostMUSH `@hook` attributes on `config(hook_obj)`. Hook types: `B_` (before), `A_` (after), `P_` (permit), `I_` (ignore), `AF_` (fail), `AO_` (after-offline), `M_` (mogrify). Not to be confused with Claude Code hooks (`/mush-hooks`).

---

### /mush-session

Session start checklist skill. Syncs `mush-patterns`, loads relevant patterns, verifies local help corpus, checks server reachability, and reports session summary.

---

### /mush-init

Scaffold a new softcode project. Creates: `dist/`, `help/`, `src/`, `tests/`, `mush-patterns/`, `.gitignore`, `CLAUDE.md`, `package.json`, `dist/manifest.json`. Asks 4 questions: name, author, server type, repo URL.

---

### /mush-watch

Dev-mode watch loop. Auto-rebuilds installer and runs `/mush-lint` whenever a `src/*.mush` file changes. Runs in the background.

---

### /mush-hooks

Configures Claude Code `PostToolUse` and `Stop` hooks in `.claude/settings.json` to auto-trigger lint and security gates. Sets up the automated quality pipeline.

---

### /mush-manifest

Tracks objects, dbrefs, and attribute checksums in `dist/manifest.json`. Commands: init, sync, checksum, report. Required by `/mush-patch` and `/mush-audit`.

---

### /mush-patch

Diffs two manifest versions and generates a minimal migration installer `dist/<project>.patch.<old>-<new>.txt`. Sections: DELETIONS, CHANGES, NEW.

---

### /mush-rollback

Generates `dist/<project>.rollback.txt` with teardown instructions for every object and attribute. Requires explicit user confirmation before execution.

---

### /mush-release

Full release workflow: pre-flight checks → version bump → update artifacts → changelog → patch installer → commit → tag → confirm → push. Stops before push for explicit user approval.

---

### /mush-upgrade

Managed version upgrade. Diffs manifest snapshots → generates migration patch → presents plan for user approval → applies to live server → verifies → syncs manifest.

---

### /mush-learn

Extract reusable patterns from a session and contribute to `../mush-patterns` via PR. 7 phases: identify → format → conflict check → write → update INDEX → commit/PR → summary.

---

### /mush-chargen

Scaffold a complete character generation system. 14-question design interview (stats, types, workflow, display) mandatory before any code. Produces chargen commands, sheet display, submit/approve/reject workflow, and staff tools.

---

### /mush-bboard

Scaffold a bulletin board system. 9-question design interview (boards, permissions, threading, expiry, notifications) mandatory before any code. Produces `+bb`, `+bbpost`, `+bbreply`, subscription commands, and staff moderation tools.

---

### /mush-jobs

Scaffold a job/request tracking system. 10-question design interview (types, permissions, priority, notifications) mandatory before any code. Produces `+job/submit`, `+job/claim`, `+job/resolve`, and staff management commands.

---

### /mush-migrate

Port softcode between MUSH server flavors (PennMUSH, TinyMUX, TinyMUSH → RhostMUSH). Inventories incompatibilities against a compatibility matrix, substitutes with patterns from `../mush-patterns`, runs tests on target server.

---

### /mush-readme

Generate or update `README.md` from project files. Reads `src/*.mush`, `dist/manifest.json`, `help/help.txt`, and `package.json` to produce accurate, up-to-date documentation. Supports regenerating individual sections.

---

## Mandatory Gates

| Trigger | Gate |
|---------|------|
| Any softcode written | `@rhost/testkit` test written and passing |
| Any softcode written | `/mush-security` run before session closes |
| Softcode migrated | `/mush-security` run (migration carries forward source vulns) |
| Security audit completed | Findings written to `../mush-patterns` via PR |
| Upgrade applied to live server | `/mush-audit` + smoke tests run post-apply |
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

Patterns extracted during a session are contributed as PRs. Security findings (both secure patterns and anti-patterns) are contributed after every `/mush-security` audit.

The corpus must be cloned at `../mush-patterns` relative to this repo:

```bash
git clone https://github.com/lcanady/mush-patterns ../mush-patterns
```

---

## Reference Corpus

The full RhostMUSH help files are bundled locally in `reference/` — never fetched from GitHub at session time.

| File | Contents |
|------|----------|
| `reference/rhost-help.txt` | 37,239 lines, 1,951 topics — functions, softcode, @commands, flags |
| `reference/rhost-wizhelp.txt` | 16,367 lines, 1,278 topics — @power, @config, @admin, @hook, snoop |
| `reference/rhost-help-topics.txt` | Sorted topic index for fast `grep` |
| `reference/rhost-wizhelp-topics.txt` | Sorted wiz topic index |
| `reference/rhost.md` | Lookup guide with `awk`/`grep` patterns |

Quick lookup:

```bash
# Check if a topic exists
grep -i "^& TOPIC" reference/rhost-help.txt reference/rhost-wizhelp.txt

# Read a full help entry
awk '/^& ITER$/,/^& /' reference/rhost-help.txt | head -60
```

---

## Session Start Checklist

Run at the top of every session via `/mush-architect` or `/mush-session`:

**Step 1 — Sync check**
```bash
cd ../mush-patterns && git fetch origin && git status
```

**Step 2 — Corpus load**
Read `../mush-patterns/README.md` and domain-specific patterns for the current task.

**Step 3 — Help file detection**
If any provided help file is from an unknown server, offer to extract patterns and open a PR.

---

## Contributing

Contributions to the skill suite are welcome. Each skill is a single `SKILL.md` file — edit it, test it in a real Claude Code session, and open a PR.

When adding a new skill:
1. Create `skills/<skill-name>/SKILL.md`
2. Use the frontmatter format from an existing skill (`name`, `description`, `effort`, `argument-hint`, `date_added`)
3. Add optional flags: `disable-model-invocation: true` for side-effect skills, `context: fork` for heavy analysis
4. Add the skill to the routing table in the root `SKILL.md`
5. Document it in this README

For patterns extracted during sessions, contribute them to [`mush-patterns`](https://github.com/lcanady/mush-patterns) directly.
