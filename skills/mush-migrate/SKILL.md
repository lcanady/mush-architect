---
name: mush-migrate
description: Port RhostMUSH softcode between MUSH server flavors — TinyMUX, PennMUSH, TinyMUSH, RhostMUSH. Use when converting or migrating softcode to run on a different server type.
effort: high
argument-hint: "[source server] to [target server]"
date_added: "2026-03-27"
---

> **Act immediately. Write code or ask one question — do not narrate your plan or summarize what you are about to do.**


# mush-migrate

Port softcode between MUSH server flavors.

## Session start

Run the `mush-architect` session start checklist (sync + corpus load + help detection) before any work.

## Compatibility matrix (common differences)

| Feature | RhostMUSH | PennMUSH | TinyMUX | TinyMUSH |
|---------|-----------|----------|---------|---------|
| `iter()` loop var | `##` / `#@` | `##` / `#@` | `##` | `##` |
| `u()` calling convention | standard | standard | standard | standard |
| `lattr()` separator | space | space | space | space |
| `@switch` | yes | yes | yes | yes |
| `@dolist` | yes | yes | yes | limited |
| `execscript()` | yes | no | no | no |
| `encode64()`/`decode64()` | yes | no (use `encode()`) | no | no |
| `digest()` | yes | no | no | no |
| `localize()` | yes | yes | no | no |
| `@hook` | yes | yes | limited | no |
| `@program` | no | yes | no | no |

## Migration steps

1. **Inventory** — list all functions and commands used in the source code.
2. **Flag incompatibilities** — identify anything in the matrix above that differs.
3. **Substitute** — find equivalent patterns in `mush-patterns/` or write replacements.
4. **Write tests** — `@rhost/testkit` tests for each migrated function.
5. **Verify** — all tests green on the target server.

## Mandatory

Run `/mush-test` on all migrated softcode — tests must prove behavior is identical to the source before the session closes.

Run `/mush-security` on all migrated softcode before closing the session. Migration often carries forward vulnerabilities from the source server — security audit is not optional.
