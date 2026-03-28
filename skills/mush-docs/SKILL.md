---
name: mush-docs
description: Generate help text and documentation for RhostMUSH softcode. Use when writing help, docs, or documentation for commands and UDFs.
effort: medium
paths: "**/*.mush,**/help/**"
date_added: "2026-03-27"
---

> **Act immediately. Write code or ask one question — do not narrate your plan or summarize what you are about to do.**


# mush-docs

Generate in-game help text, wiki documentation, and code comments for RhostMUSH softcode.

## Session start

Run the `mush-architect` session start checklist (sync + corpus load + help detection) before any work.

## Output formats

- **In-game help** — formatted for `help <topic>`, `+help <topic>` using MUSH display codes
- **Code comments** — `/* ... */` block comments above softcode sections
- **README** — plain-text installation and usage notes for code packages

## Help text format

```
+COMMAND[/<switch>] <arg>                        p. N
  Brief description (one line).

  Longer explanation. Use %r for line breaks inside MUSH, or actual
  newlines in external docs.

  Switches:
    /switch1    What it does.
    /switch2    What it does.

  Examples:
    +command foo        Does the thing.
    +command/switch foo Does the other thing.

  See also: +other, +related
```

## Mandatory

All softcode documented here must have `@rhost/testkit` tests. See `/mush-test`.
