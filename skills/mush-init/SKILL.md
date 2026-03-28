---
name: mush-init
description: Scaffold a new MUSH-ARCHITECT project: creates directory structure, manifest, package.json, and starter files. Use when starting a brand new MUSH softcode project.
disable-model-invocation: true
effort: low
argument-hint: "[project name]"
date_added: "2026-03-28"
---

> **Act immediately. Ask the four questions below, then scaffold the project. Do not narrate — build.**

# mush-init

Bootstrap a new MUSH-ARCHITECT project from scratch. Run this once per project, at the very start, before any other skill.

## Step 1 — Ask four questions (all required)

Ask these together in one message:

> 1. **Project name** — what is this system called? (e.g. "My Cool Chargen")
> 2. **Author name** — who is writing this?
> 3. **Server type** — RhostMUSH, PennMUSH, TinyMUX, or other?
> 4. **GitHub repo URL** — where will this live? (or "TBD" if not yet known)

Do not proceed until all four are answered.

## Step 2 — Derive slugs and paths

From the project name, derive:
- **slug**: lowercase, hyphens, no spaces (e.g. `my-cool-chargen`)
- **Object name convention**: Title Case with `<sys>` suffix (e.g. `My Cool Chargen <sys>`)
- **Attribute prefix**: uppercase slug with underscores (e.g. `MCC_`)

## Step 3 — Create directory structure

```
[project-slug]/
├── dist/                        # Compiled installers
├── help/                        # Help files
├── src/                         # Source softcode (human-readable, expanded)
│   ├── config.mush              # Config/data attributes
│   ├── functions.mush           # UDFs
│   ├── commands.mush            # Commands
│   └── help.mush                # Help attributes (softcode format)
├── tests/                       # @rhost/testkit test files
├── mush-patterns/               # Git submodule — community patterns corpus
├── .gitignore
├── CLAUDE.md                    # Project constitution for Claude
├── package.json                 # Node deps (@rhost/testkit)
└── dist/manifest.json           # Created empty by mush-manifest init
```

## Step 4 — Write project files

### `.gitignore`
```
node_modules/
.env
*.log
dist/*.rollback.txt
```

### `package.json`
```json
{
  "name": "[slug]",
  "version": "0.0.0",
  "description": "[Project Name] — RhostMUSH softcode",
  "scripts": {
    "test": "ts-node tests/[slug].test.ts",
    "lint": "echo 'Run /mush-lint via Claude Code'",
    "build": "echo 'Run /mush-build via Claude Code'"
  },
  "dependencies": {
    "@rhost/testkit": "latest"
  },
  "devDependencies": {
    "typescript": "latest",
    "ts-node": "latest"
  }
}
```

### `CLAUDE.md`
```markdown
# [Project Name]

## Project
- **Slug**: [slug]
- **Server**: [server type]
- **Author**: [author]
- **Repo**: [repo url]
- **Object prefix**: [PREFIX]_

## Rules
- Run `/mush-session` at the start of every session
- Run `/mush-lint` before every package step
- Run `/mush-test` before every deploy
- Run `/mush-security` before closing any session
- Installer output: `dist/[slug].installer.txt`
- Help output: `help/help.txt` and `help/[slug].help.installer.txt`

## Server config
- Server type: [server type]
- Help system: [to be filled in during first session]
- Connection: [to be filled in during first session]
```

### `src/config.mush` (starter template)
```mushcode
@@ ---[ CONFIG ]---
@@ Project: [Project Name]
@@ Version: 0.0.0

@@ Object: [Object Name] <sys>
@create [Object Name] <sys>
@set [Object Name] <sys>=inherit safe
@fo me=&D_SYS me=search(name=[Object Name] <sys>)

@@ Version guard — installer checks this before overwriting
&VER [obj]=0.0.0
```

### `tests/[slug].test.ts` (starter template)
```typescript
import { RhostRunner } from '@rhost/testkit';

const PASS = process.env.RHOST_PASS;
if (!PASS) { console.error('RHOST_PASS env var is required'); process.exit(1); }

const runner = new RhostRunner();

runner.describe('[Project Name]', ({ it }) => {
    it('placeholder — replace with real tests', async ({ expect }) => {
        await expect('1').toBe('1');
    });
});

runner
    .run({ host: 'localhost', port: 4201, username: 'Wizard', password: PASS })
    .then(r => process.exit(r.failed > 0 ? 1 : 0))
    .catch(err => { console.error(err.message); process.exit(1); });
```

## Step 5 — Initialize manifest

Run `/mush-manifest init` to create `dist/manifest.json` with project metadata and zero objects.

## Step 6 — Initialize mush-patterns submodule

```bash
git submodule add https://github.com/[owner]/mush-patterns mush-patterns
git submodule update --init --recursive
```

If no mush-patterns repo exists yet, create an empty `mush-patterns/INDEX.md` and note it for future population.

## Step 7 — Note sister project

This project is the companion to **mush-format** (a standalone MUSH build tool / preprocessor). The two projects share compatible conventions: `@@` comments preserved, `//` stripped, installer output format. Integration between them is a future goal.

## Step 8 — Report

Print a project summary:

```
=== PROJECT INITIALIZED ===
Name:     [Project Name]
Slug:     [slug]
Server:   [server type]
Repo:     [url]
Prefix:   [PREFIX]_

Files created:
  dist/           (empty)
  help/           (empty)
  src/config.mush
  src/functions.mush (empty)
  src/commands.mush  (empty)
  src/help.mush      (empty)
  tests/[slug].test.ts
  CLAUDE.md
  package.json
  .gitignore
  dist/manifest.json

Next: run /mush-session to start your first build session.
===========================
```
