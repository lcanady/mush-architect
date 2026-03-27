---
name: mush-security
description: "Audit RhostMUSH softcode for injection, privilege escalation, and other security issues."
risk: low
source: local
date_added: "2026-03-27"
---

> **Act immediately. Write code or ask one question — do not narrate your plan or summarize what you are about to do.**


# mush-security

Audit RhostMUSH softcode for security issues.

## Session start

Run the `mush-architect` session start checklist (sync + corpus load + help detection) before any work.

## Audit checklist

### Injection

- [ ] User input (`%0`–`%9`, `%+`, `%_`) interpolated into `@pemit`, `think`, `@trigger`, or attribute values without stripping
- [ ] `[` or `]` in user input that could open evaluation contexts
- [ ] `;` used as command separator with user-controlled values
- [ ] `execscript()` with user-controlled script name or arguments

### Privilege

- [ ] Command accessible at wrong lock level (too permissive)
- [ ] `@fo` or `@force` without proper lock check
- [ ] Object not flagged `SAFE` (vulnerable to accidental `@destroy`)
- [ ] Parent chain not locked — child inherits permissions unintentionally

### Data integrity

- [ ] No validation on numeric inputs (`isnum()` check missing)
- [ ] No empty-arg guard (`not(%0)` check missing)
- [ ] DB writes without `canEdit` check on target objects

### Output

- [ ] ANSI/color codes included in values stored to DB (strip before storing)
- [ ] Return values not normalized — caller can't distinguish error from valid output

## Severity levels

- **Critical** — allows arbitrary code execution or privilege escalation
- **High** — allows data corruption or unauthorized access
- **Medium** — allows information disclosure or denial of service
- **Low** — style/hygiene issues with security implications

## Fix → test

All fixes must be accompanied by a `@rhost/testkit` test that proves the vulnerability is closed. See `/mush-test`.

## Update mush-patterns — MANDATORY

After every security audit (even if no issues are found), write findings to `../mush-patterns/patterns/`.

**This step is not optional.** Do not end the session without completing it.

### What to write

| Finding type | Where | Tag |
|---|---|---|
| Secure pattern (input sanitized correctly, lock pattern, etc.) | `patterns/functions/` or `patterns/commands/` | `security`, `safe` |
| Vulnerability / anti-pattern | `patterns/functions/` or `patterns/commands/` | `security`, `anti-pattern` |
| Injection example (real or synthesized) | `patterns/functions/` | `injection`, `anti-pattern` |

### File format

```markdown
---
id: sec-<domain>-<NNN>
domain: functions   # or commands, systems
server: RhostMUSH
source: mush-security audit
complexity: low     # low / medium / high
tags: [security, anti-pattern]   # or [security, safe]
date_added: "YYYY-MM-DD"
---

# Pattern: <title>

One-sentence description.

## Code

```mushcode
<the relevant code snippet>
```

## Why this matters

- What the risk is (or why the safe pattern works)
- How an attacker could exploit it (for anti-patterns)
- The fix / correct approach

## @rhost/testkit snippet

```typescript
// minimal proof of concept or fix verification
```
```

### Commit and PR

```bash
cd ../mush-patterns
git checkout -b patterns/security-YYYY-MM-DD
# write pattern files
git add patterns/
git commit -m "feat: security patterns from mush-security audit YYYY-MM-DD"
gh pr create --title "feat: security patterns YYYY-MM-DD" --body "Patterns and anti-patterns captured during mush-security audit."
```
