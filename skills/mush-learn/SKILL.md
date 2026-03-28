---
name: mush-learn
description: "Extract reusable patterns from completed softcode work and contribute them to the mush-patterns corpus. Triggers automatically after any mush-build or mush-migrate session produces new code."
user-invocable: true
context: fork
agent: general-purpose
effort: medium
paths: "**/*.mush,**/dist/*.installer.txt,**/src/**"
date_added: "2026-03-28"
---

# mush-learn

The system's learning loop. After every build or migrate session, extract what was discovered — patterns, idioms, server quirks, guard techniques — and commit them to `mush-patterns`. The corpus grows with every session.

## Why this exists

A system that only produces output is a tool. A system that learns from its output is an architecture. Every softcode session contains patterns worth keeping. This skill captures them.

## Triggers

Run automatically at the end of any `/mush-build` Phase 10 — Patterns step.
Invoke manually with `/mush-learn` after any session that produced novel code.

## Phase 1 — Identify what's worth keeping

Scan all softcode written in the session. Ask: **Would this pattern be useful in a different project?**

Extract candidates in these categories:

| Category | What to look for |
|----------|-----------------|
| **Guard patterns** | New input validation idioms, novel `#-1` error handling |
| **UDF idioms** | Useful function compositions, `ulocal()` scoping techniques |
| **Command patterns** | `@switch` dispatch, permission check patterns, switch routing |
| **Server quirks** | Rhost-specific behaviors discovered, flag/power differences, `@config` findings |
| **Security idioms** | Novel `stripchars` applications, lock patterns, injection-resistant constructs |
| **System architecture** | Object relationships, attribute naming schemes, data layout |
| **Installer patterns** | Unusual `@create` / `@set` sequences, version-guard variations |
| **Help text formats** | Server-specific help attribute patterns for unknown help systems |

**Skip if:**
- It's a one-off specific to this project's data model
- It's already in the corpus (check `mush-patterns/patterns/` first)
- It's a textbook example with no novel technique

## Phase 2 — Format each pattern

Each pattern goes in its own file in the appropriate subdirectory. Follow `mush-patterns/CONTRIBUTING.md` exactly.

Pattern file format:

```markdown
# [Pattern Name]

**Category:** [functions | commands | systems | server-help | security | installers]
**Server:** [RhostMUSH | PennMUSH | TinyMUX | All]
**Tags:** [comma-separated tags]

## Problem

One sentence: what situation does this solve?

## Pattern

\`\`\`mushcode
[the actual softcode, minimal and generic — no project-specific names]
\`\`\`

## How it works

2–4 sentences explaining the mechanism. Focus on the non-obvious parts.

## Variants

List variations if applicable (e.g. with/without switch, strict vs. permissive guard).

## When NOT to use

Any known failure modes or contexts where this pattern breaks.

## Source

Extracted from: [project name], session [date]
```

## Phase 3 — Check for conflicts

Before writing any file:

```bash
cd mush-patterns
grep -rl "[pattern keyword]" patterns/
```

If a similar pattern exists:
- If ours is strictly better → replace it
- If ours adds a variant → add a "Variants" section to the existing file
- If they're equivalent → skip ours

## Phase 4 — Write pattern files

Write each pattern to the correct subdirectory:

```
mush-patterns/patterns/
├── functions/       → UDF patterns, guard patterns, iter/map idioms
├── commands/        → $-command patterns, switch dispatch, access control
├── systems/         → full system architectures (bboard, chargen, combat, etc.)
├── server-help/     → per-server quirks, functions, flags, config
├── security/        → injection guards, lock patterns, safe eval patterns
└── installers/      → @create sequences, version guards, chunking, headers
```

## Phase 5 — Update the INDEX

Read `mush-patterns/INDEX.md` and add a one-line entry for each new pattern file.

Format: `- [Pattern Name](patterns/category/file.md) — one-line description`

## Phase 6 — Commit and PR

```bash
cd mush-patterns
git checkout -b learn/[project-slug]-$(date +%Y-%m-%d)
git add patterns/ INDEX.md
git commit -m "feat: patterns from [project-slug] — [N] new patterns"
gh pr create \
  --title "feat: patterns from [project-slug]" \
  --body "$(cat <<'EOF'
## Patterns added

[bulleted list of each pattern with one-line description]

## Source project
[project-slug] session [date]

## Categories
[list categories touched]
EOF
)"
```

Report the PR URL to the user.

## Phase 7 — Session learning summary

After the PR is created, print a compact summary:

```
=== MUSH-LEARN SESSION SUMMARY ===
Patterns extracted:  [N]
  functions/         [N]
  commands/          [N]
  server-help/       [N]
  security/          [N]
Corpus size before:  [N patterns]
Corpus size after:   [N patterns]
PR: [url]
==================================
```

## Rules

- Never add project-specific code to the corpus — only generic, reusable patterns
- Generalize names: `FN_MY_PROJECT_THING` → `FN_EXAMPLE` in pattern files
- One pattern per file — do not bundle unrelated patterns
- Patterns must be tested (seen to work in a real session) — no speculative patterns
- If in doubt whether something is worth keeping, keep it — the corpus can always be pruned, but lost patterns can't be recovered
