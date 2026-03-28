---
name: mush-readme
description: "Generate or update a README.md for a RhostMUSH softcode project — installation, usage, command reference, configuration, and contributing guide."
context: fork
effort: medium
paths: "**/*.mush,**/src/**,**/dist/**,**/help/**"
argument-hint: "[section to regenerate, or leave blank for full README]"
date_added: "2026-03-28"
---

> **Act immediately. Read existing src/ and dist/ files, generate the README. Do not scaffold code.**

# mush-readme

Generate or update a complete `README.md` for a RhostMUSH softcode project. Reads existing `src/`, `help/`, `dist/manifest.json`, and `package.json` to produce an accurate, up-to-date README without manual effort.

## Phase 1 — Gather project facts

Read the following (all read-only):

1. `package.json` — name, version, description, author, repo URL, scripts
2. `dist/manifest.json` — list of objects, attribute counts, version
3. `src/*.mush` — extract command list (`$+cmd` patterns), UDF list, data attributes
4. `help/help.txt` — topic list for the +help reference section
5. `CLAUDE.md` (if present) — project-specific notes

## Phase 2 — Generate README sections

### Header

```markdown
# <Project Name>

> <one-line description from package.json>

**Version:** <version>  **Server:** RhostMUSH  **Author:** <author>
```

### Installation

```markdown
## Installation

### Prerequisites
- RhostMUSH server (see `config(version)` for minimum version)
- Node.js + `@rhost/testkit` (for tests)
- Wizard-level access to paste the installer

### Install

1. Open your MU* client and connect as a wizard.
2. Paste the contents of `dist/<project>.installer.txt` into the client.
3. Verify installation:
   ```
   +version
   ```
   Expected output: `<project> v<version> loaded.`

### Rollback

If something goes wrong, paste `dist/<project>.rollback.txt` to remove all objects and attributes.
```

### Command Reference

Auto-generated from `$+cmd` patterns in `src/*.mush`:

```markdown
## Commands

| Command | Description |
|---------|-------------|
| `+example <arg>` | Does the example thing |
| `+example/list` | Lists all examples |
...
```

### Configuration

```markdown
## Configuration

Configuration is stored on the config object (`<cfg>`).

| Attribute | Default | Description |
|-----------|---------|-------------|
| `D_MAX_ENTRIES` | `100` | Maximum number of entries allowed |
| `D_STAFF_FLAG` | `STAFF` | Flag required for staff commands |
```

### Help

```markdown
## In-game help

If your game uses the +help system included with this package, install
`help/<project>.help.installer.txt` in addition to the main installer.

Topics available: <comma-separated list from help/help.txt>
```

### Development

```markdown
## Development

### Project structure

```
src/           — softcode source files
dist/          — compiled installer and rollback files
help/          — in-game help text
tests/         — @rhost/testkit test suites
mush-patterns/ — extracted patterns (submodule)
```

### Build

```bash
npm run build    # compile installer
npm run test     # run @rhost/testkit tests
npm run lint     # run mush-lint checks
```

### Workflow

Use the mush-architect skill suite in Claude Code for all development:
- `/mush-build` — build installer from src/
- `/mush-test` — run tests
- `/mush-lint` — lint checks
- `/mush-release` — version bump and release
```

### Contributing

```markdown
## Contributing

1. Fork the repo and create a feature branch.
2. Write tests in `tests/` before code.
3. Run `/mush-test` and `/mush-lint` before committing.
4. Open a PR — include the test output in the PR description.
```

### License

```markdown
## License

<license from package.json, or "See LICENSE file">
```

## Phase 3 — Regeneration modes

```
/mush-readme              Full README (create or overwrite)
/mush-readme commands     Commands section only
/mush-readme install      Installation section only
/mush-readme config       Configuration section only
/mush-readme help         In-game help section only
```

When regenerating a section, find the section header in the existing README and replace only that section — preserve surrounding content.

## Rules

- Never invent commands or features not found in src/ files
- Version comes from `package.json` — never hardcode it
- Command descriptions come from inline `@@` comments on the `$+cmd` line, or from help.txt
- If `dist/manifest.json` is missing, note that object dbrefs are not yet assigned
- If `help/help.txt` is missing, omit the help section
- Max line length 120 chars in README (wider than MUSH installers — Markdown is not constrained to 78)
