---
name: mush-learn
description: "Extract reusable patterns from completed softcode work and contribute them to the ../mush-patterns corpus. Triggers automatically after any mush-build or mush-migrate session produces new code."
user-invocable: true
context: fork
agent: general-purpose
effort: medium
paths: "**/*.mush,**/dist/*.installer.txt,**/src/**"
date_added: "2026-03-28"
---

# mush-learn

The system's learning loop. After every build or migrate session, extract what was discovered — patterns, idioms, server quirks, guard techniques — and commit them to `../mush-patterns`. The corpus grows with every session.

## Why this exists

A system that only produces output is a tool. A system that learns from its output is an architecture. Every softcode session contains patterns worth keeping. This skill captures them.

## Triggers

Run automatically at the end of any `/mush-build` Phase 10 — Patterns step.
Invoke manually with `/mush-learn` after any session that produced novel code.

## Phase 0 — Auto-classify candidates

Before scanning for patterns, classify the session's output into these
five types. This determines which patterns are worth extracting and how
to tag them.

| Type | Markers | Tags to apply |
|------|---------|--------------|
| **Guard** | Input validation, `#-N` error returns, permission checks, bounds | `guard`, `validation`, `error-handling` |
| **Idiom** | Clever function composition, novel `iter()` use, elegant shorthand | `idiom`, `functional`, `efficiency` |
| **Architecture** | Object layout, data model, UDF namespace scheme, multi-object patterns | `architecture`, `data-model`, `system-design` |
| **Security** | Injection prevention, lock patterns, privilege escalation guards | `security`, `injection`, `access-control` |
| **Server-quirk** | RhostMUSH-specific behavior, `@config` dependency, flag differences, portability limit | `server-quirk`, `rhost`, `portability` |

Report the classification breakdown before Phase 1 begins. A session
might produce: "2 Guard, 1 Idiom, 1 Server-quirk — proceeding to extract."

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
- It's already in the corpus (check `../mush-patterns/patterns/` first)
- It's a textbook example with no novel technique

## Phase 2 — Format each pattern

Each pattern goes in its own file in the appropriate subdirectory.
Follow `../mush-patterns/CONTRIBUTING.md` and `../mush-patterns/AAAK_SPEC.md`.

Pattern file format:

```markdown
---
id: [domain]-[slug]-[seq]
domain: [functions | commands | systems | security | installers | server-help]
server: [RhostMUSH | PennMUSH | TinyMUX | All]
source: [project name], session [date]
complexity: [low | medium | high]
tags: [auto-classified tags from Phase 0 + manual tags]
date_added: "[ISO date]"
tested: [true | false]
see_also: []
---

# Pattern: [Name]

One sentence: what situation does this solve?

## Signal
USE:    [when to apply — 1 tight line]
ALT:    [alternative if this doesn't fit — omit if none]
WARN:   [common pitfall — omit if none]
COMPAT: [server — omit if RhostMUSH only]
TEST:   [✓ | ✗ | –] [★ rating if not ★★★]

## Code

\`\`\`mushcode
[actual softcode — minimal, generic — no project-specific names]
\`\`\`

## Notes

2–4 sentences explaining the mechanism. Focus on the non-obvious parts.
List any `→ [id]` cross-references to related patterns here.

## @rhost/testkit snippet

\`\`\`typescript
[test snippet if applicable — omit section if none]
\`\`\`
```

After writing the file, check if any existing patterns should be linked
via `see_also`. Use the Phase 0 classification type to guide this:
- Guard patterns → check `func-udf-guard-001` family
- Security patterns → check `patterns/security/`
- Architecture patterns → check `patterns/systems/`

Add matching IDs to the `see_also` array in the new pattern AND in the
existing pattern files being referenced.

## Phase 3 — Check for conflicts

Before writing any file:

```bash
cd ../mush-patterns
grep -rl "[pattern keyword]" patterns/
```

If a similar pattern exists:
- If ours is strictly better → replace it
- If ours adds a variant → add a "Variants" section to the existing file
- If they're equivalent → skip ours

## Phase 4 — Write pattern files

Write each pattern to the correct subdirectory:

```
../mush-patterns/patterns/
├── functions/       → UDF patterns, guard patterns, iter/map idioms
├── commands/        → $-command patterns, switch dispatch, access control
├── systems/         → full system architectures (bboard, chargen, combat, etc.)
├── server-help/     → per-server quirks, functions, flags, config
├── security/        → injection guards, lock patterns, safe eval patterns
└── installers/      → @create sequences, version guards, chunking, headers
```

## Phase 5 — Update INDEX and PALACE

**INDEX.md:** Add a one-line entry for each new pattern file under the correct section.

Format: `- [Pattern Name](patterns/category/file.md) — one-line description`

**PALACE.md:** If a new Wing or Room was created, add rows to the Wings and Rooms tables.
If any `see_also` cross-references were added between wings, add a row to the Tunnels table.

## Phase 6 — Commit and PR

```bash
cd ../mush-patterns
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

## Phase 7 — Write session diary entry

Write a new entry to `SESSION_DIARY.md` in the project root (prepend — newest first):

```markdown
## Session [SESSION_ID] — [ISO date]

**Built/modified:** [one-line summary]
**Decisions:** [key decisions with brief rationale — or "none"]
**Tests:** [green / red / not-run]
**Patterns extracted:** [list of new pattern IDs — or "none"]
**Open questions:** [unresolved design questions — or "none"]
**Next steps:** [what to do next session]
```

## Phase 8 — Session learning summary

After the diary is written, print a compact summary:

```
=== MUSH-LEARN SESSION SUMMARY ===
Classification:
  Guard:           [N]
  Idiom:           [N]
  Architecture:    [N]
  Security:        [N]
  Server-quirk:    [N]
Patterns extracted: [N total]
  functions/         [N]
  commands/          [N]
  systems/           [N]
  security/          [N]
  installers/        [N]
  server-help/       [N]
Tunnels added:     [N]
Corpus size before: [N patterns]
Corpus size after:  [N patterns]
PR: [url]
Diary: SESSION_DIARY.md updated
==================================
```

## Rules

- Never add project-specific code to the corpus — only generic, reusable patterns
- Generalize names: `FN_MY_PROJECT_THING` → `FN_EXAMPLE` in pattern files
- One pattern per file — do not bundle unrelated patterns
- Patterns must be tested (seen to work in a real session) — no speculative patterns
- If in doubt whether something is worth keeping, keep it — the corpus can always be pruned, but lost patterns can't be recovered
