---
name: mush-explain
description: Explain what RhostMUSH softcode does. Use when the user asks 'what does this do', 'explain', 'how does this work', or wants code walked through.
effort: low
paths: "**/*.mush,**/src/**,**/dist/**"
date_added: "2026-03-27"
---

> **Act immediately. Write code or ask one question — do not narrate your plan or summarize what you are about to do.**


# mush-explain

Explain existing RhostMUSH softcode — what it does, how it works, and why it's written the way it is.

## Session start

Run the `mush-architect` session start checklist (sync + corpus load + help detection) before any work.

## Approach

1. **Load context** — check `../mush-patterns/` for patterns that match the code being explained.
2. **High-level summary first** — what the code does in plain English, in 1–3 sentences.
3. **Line-by-line breakdown** — annotate each significant expression.
4. **Identify patterns** — call out known idioms (iter/map, UDF guards, switch dispatch, etc.).
5. **Flag issues** — note security risks, inefficiencies, or portability problems.

## Annotation format

```
&FN_CLAMP #obj=                        ← define a UDF named FN_CLAMP on #obj
  [if(lt(%0,%1),%1,                    ← if arg0 < arg1 (min), return min
    if(gt(%0,%2),%2,                   ← else if arg0 > arg2 (max), return max
      %0))]                            ← else return arg0 unchanged
```

## After explaining

If the code contains patterns not in `../mush-patterns/`, offer to extract and PR them.
