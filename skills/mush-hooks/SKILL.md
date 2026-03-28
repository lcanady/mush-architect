---
name: mush-hooks
description: Configure Claude Code settings.json hooks to automatically enforce mush-lint and mush-test gates on every softcode edit. Run once per project to set up automation.
disable-model-invocation: true
effort: low
date_added: "2026-03-28"
---

> **Act immediately. Write the hooks configuration to .claude/settings.json. Do not narrate.**

# mush-hooks

Configure `PostToolUse` and `Stop` hooks in `.claude/settings.json` so that quality gates run automatically — without the developer needing to invoke `/mush-lint` or `/mush-test` manually.

## What these hooks enforce

| Hook | Trigger | Action |
|------|---------|--------|
| `PostToolUse` on Write/Edit | Any `.mush` or `.installer.txt` file written/edited | Auto-runs mush-lint; surfaces ERRORs inline |
| `PostToolUse` on Write | Any `*.test.ts` file written | Reminds Claude to run mush-test before closing |
| `Stop` | Claude attempts to end session | Blocks if mush-security has not been run this session |

## Step 1 — Check for existing settings.json

Read `.claude/settings.json` if it exists. Merge the new hooks into any existing configuration — do not overwrite existing hooks.

## Step 2 — Write hooks configuration

Add to `.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "prompt",
            "prompt": "A softcode file was just written or edited. Check if the file path ends in .mush or .installer.txt. If so, immediately run /mush-lint on that file and report any ERROR-level findings inline. Do not wait for the user to ask. If there are ERRORs, block further packaging until they are resolved."
          }
        ]
      },
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "prompt",
            "prompt": "If the file just written ends in .test.ts, remind Claude that /mush-test must be run before this session can be marked complete. Add it to the pending checklist."
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Before ending this session, verify: (1) /mush-lint was run and returned no ERRORs, (2) /mush-test was run and all tests passed green, (3) /mush-security was run and all Critical/High findings are resolved. If any of these are incomplete, do NOT end the session — report which gates are still open and ask the user how to proceed."
          }
        ]
      }
    ]
  }
}
```

## Step 3 — Verify the configuration

Read back `.claude/settings.json` and confirm all three hooks are present and correctly formatted.

## Step 4 — Report

```
=== MUSH HOOKS CONFIGURED ===
PostToolUse (Write/Edit *.mush):     mush-lint auto-runs on every softcode edit
PostToolUse (Write *.test.ts):       mush-test reminder added to session checklist
Stop:                                Session blocked until lint/test/security gates pass

Hooks written to: .claude/settings.json
To disable: add "disableAllHooks": true to settings.json
==============================
```

## Notes

- These hooks use `type: "prompt"` — they instruct Claude rather than running shell commands. This is intentional: Claude has context about the session state that a shell script does not.
- For shell-based hooks (e.g. running `mform` or a linter binary), use `type: "command"` instead and specify the command path.
- Hooks are project-local when placed in `.claude/settings.json` at the project root. They do not affect other Claude Code projects.
- See [Claude Code hooks reference](https://code.claude.com/docs/en/hooks) for full hook event documentation.
