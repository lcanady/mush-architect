---
name: mush-watch
description: Watch src/ for softcode changes and auto-rebuild the installer with lint on every save. Use during active development to keep the installer in sync.
disable-model-invocation: true
effort: low
date_added: "2026-03-28"
---

> **Act immediately. Start the watch loop. Report each rebuild. Do not narrate.**

# mush-watch

Development mode: watch `src/` for changes and automatically rebuild `dist/[project].installer.txt` + run `/mush-lint` on every save. Keeps the installer in sync during active coding without manual `/mush-build` invocations.

## Prerequisites

- `/mush-session` must have completed green
- Project manifest exists (`dist/manifest.json`)

## Watch mode — Claude-native rebuild

If mush-format is not installed, use this polling approach:

```bash
# Run in background terminal
while true; do
  inotifywait -r -e modify,create,delete src/ 2>/dev/null || \
  fswatch -1 src/ 2>/dev/null || \
  sleep 3
  echo "[$(date +%H:%M:%S)] Change detected — rebuilding..."
done
```

On each detected change, trigger a rebuild:
1. Re-read all `src/*.mush` files
2. Apply all Phase 5 — Package formatting rules (comments, ordering, header/footer, separators)
3. Write `dist/[slug].installer.txt`
4. Run `/mush-lint` on the new output
5. Report lint status inline

## Watch output format

Each rebuild cycle reports:

```
[14:23:01] src/functions.mush changed
[14:23:01] Rebuilding dist/my-cool-system.installer.txt...
[14:23:02] Build OK — 3 UDFs, 2 commands, 1 help block
[14:23:02] mush-lint: CLEAN (0 errors, 1 warning)
           WARN F1: help/help.txt line 42 is 83 chars
[14:23:02] Watching for changes... (Ctrl+C to stop)
```

If lint finds ERRORs:

```
[14:23:02] mush-lint: 2 ERRORS — fix before packaging
           ERROR S1: Bare %0 in @pemit on line 47
           ERROR C1: FN_BAR missing input guard
[14:23:02] ⚠ Installer updated but not safe to deploy until errors resolved.
```

## What watch mode does NOT do

- Does **not** auto-deploy to the server (that is `/mush-install`, always manual)
- Does **not** run the full test suite on every save (too slow; run `/mush-test` explicitly)
- Does **not** update `dist/manifest.json` (that is `/mush-manifest`, run after intentional builds)
- Does **not** bump the version (that is `/mush-patch`)

## Stopping watch mode

`Ctrl+C` in the terminal running the watch process. Always run `/mush-lint` one final time after stopping to confirm the installer is clean before moving to deploy.

## Relationship to mush-format

mush-watch implements the same watch-mode concept as mush-format's `-w` flag (mush-format is a companion project). When mush-format integration is complete, this skill will delegate compilation to it and layer the mush-architect lint rules on top.
