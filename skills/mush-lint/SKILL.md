---
name: mush-lint
description: Static analysis for RhostMUSH softcode and installer files. Use before packaging to catch unsafe patterns, missing guards, and formatting violations.
context: fork
agent: general-purpose
effort: medium
paths: "**/*.mush,**/dist/*.installer.txt,**/src/**"
date_added: "2026-03-28"
---

> **Act immediately. Run the CLI tool, report findings by severity, stop. Do not fix anything without being asked.**

# mush-lint

Static analysis for MUSH softcode and installer files. Run before `/mush-build` Phase 5 (Package). Catches problems that `/mush-security` doesn't cover — formatting, completeness, and style — as well as reinforcing security checks at the code level.

## CLI tool

`rhost-testkit lint` implements all checks listed below. Always run it first:

```bash
# Lint a .mush source file
rhost-testkit lint softcode/my-system.mush

# Lint a compiled installer
rhost-testkit lint dist/my-system.installer.txt

# Machine-readable output for CI
rhost-testkit lint --json dist/my-system.installer.txt

# Fail on warnings too
rhost-testkit lint --strict softcode/my-system.mush
```

The CLI exit code is 1 if any ERROR is found (or any WARN with `--strict`). Use `--json` to get structured output for integration with other tools.

If the CLI reports findings, present them verbatim. Then describe what each finding means and ask the user which ones to fix.

## When to run

- Mandatory: before every `/mush-build` Phase 5 — Package step
- Optional: any time softcode is written or modified mid-session
- Automatically triggered by `/mush-build` if configured

## Severity levels

| Level | Meaning | Blocks packaging? |
|-------|---------|-------------------|
| `ERROR` | Must fix before packaging | Yes |
| `WARN` | Should fix; explain if skipping | No |
| `INFO` | Style suggestion | No |

---

## Check catalogue

### Safety checks (ERROR if found)

**S1 — Bare user input in output**
Flag any `@pemit`, `@emit`, `think`, or attribute set that interpolates `%0`–`%9` or `%va`–`%vz` without a stripping function (`stripchars`, `escape`, `secure`, `ansi`).

```
ERROR S1: Bare %0 in @pemit on line N — use stripchars(%0,[]{};|) or secure(%0)
```

**S2 — Unlocked system object**
Flag any `@create` not followed by both `@set <obj>=safe` and `@lock <obj>=`.

```
ERROR S2: @create "Foo <sys>" has no @lock — all system objects must be locked
```

**S3 — execscript with user input**
Flag any `execscript()` call where the first or second argument contains `%0`–`%9`.

```
ERROR S3: execscript() with user-controlled argument — never pass %N to execscript
```

**S4 — User input in @switch case label**
Flag any `@switch` where a case label (not the body) contains `%0`–`%9`.

```
ERROR S4: User input in @switch case label — case labels are evaluated, this is injectable
```

**S5 — Hardcoded dbref in help text**
Flag any `&HELP*` attribute containing `#[0-9]+`.

```
ERROR S5: Hardcoded dbref #42 in HELP_FOO — help text must use names only
```

---

### Completeness checks (ERROR if found)

**C1 — UDF missing guard**
Flag any `&FN_*` attribute that accepts `%0` without an `if(not(%0),#-1 ...)` or equivalent guard as the outermost expression.

```
ERROR C1: FN_BAR accepts %0 but has no input guard — add if(not(%0),#-1 MISSING ARG,...)
```

**C2 — Command missing help**
Flag any `&CMD_*` attribute with no corresponding `&HELP*` attribute on the same or help object.

```
ERROR C2: CMD_FROBNITZ has no HELP entry — every command needs help text
```

**C3 — Missing header in installer**
Flag any installer file missing the `@@ Mushcode Installer for:` line.

```
ERROR C3: dist/foo.installer.txt is missing @@ Mushcode Installer for: header
```

**C4 — Missing UNINSTALL section**
Flag any installer file with no `@@ ---[ UNINSTALL ]---` section.

```
ERROR C4: dist/foo.installer.txt has no UNINSTALL section
```

**C5 — Missing progress messages**
Flag any installer file with no `@pemit me=>>` start banner or no `@pemit me=>>` completion banner.

```
WARN C5: dist/foo.installer.txt has no @pemit me=>> start banner — add install progress messages
WARN C5: dist/foo.installer.txt has no @pemit me=>> completion banner
```

---

### Formatting checks (WARN if found)

**F1 — Line exceeds 78 characters**
Flag any line in `help/help.txt` or an installer comment (`@@`) that exceeds 78 characters.

```
WARN F1: help/help.txt line 42 is 83 chars — max is 78
```

**F2 — Separator line not 78 chars**
Flag any `@@ ===` or `@@ ---[` line that is not exactly 78 characters.

```
WARN F2: Separator on line 7 is 76 chars — must be exactly 78
```

**F3 — Wrong attribute order**
Flag objects where attributes appear out of order (Config → UDFs → Commands → Help).

```
WARN F3: CMD_FOO appears before FN_BAR on object #42 — order must be Config, UDFs, Commands, Help
```

**F4 — Comment style mismatch**
Flag any remaining `#`, `##`, or `//` comment that was not converted to `@@`.

```
WARN F4: Line 23 uses // comment — convert to @@
```

**F5 — Inline comment not using @@(...) format**
Flag inline comments not using `@@(comment)` notation.

```
WARN F5: Line 31 has inline comment not in @@(comment) format
```

---

**L1 — Attribute body exceeds 7500 characters**
Flag any attribute body approaching RhostMUSH's ~8000-char limit. Recommend chunking into `FN_NAME.0`, `FN_NAME.1` etc.

```
WARN L1: FN_BIGCOMPLEX is 7823 chars — approaching 8000-char Rhost limit, consider chunking
```

---

### Style checks (INFO)

**I1 — UDF name not uppercase**
```
INFO I1: Attribute fn_foo should be FN_FOO — use uppercase for all attribute names
```

**I2 — No version in header**
```
INFO I2: Version field is missing from installer header
```

**I3 — No Requires: field in header**
```
INFO I3: No @@ Requires: line in header — add "None" if there are no prerequisites
```

---

## Output format

```
mush-lint: dist/my-cool-system.installer.txt
============================================
ERROR   S2  @create "Foo <sys>" has no @lock
ERROR   C2  CMD_FROBNITZ has no HELP entry
WARN    F1  help/help.txt line 42 is 83 chars
INFO    I1  Attribute fn_foo should be FN_FOO

2 errors, 1 warning, 1 info
Packaging blocked until errors are resolved.
```

## Integration with mush-build

Phase 5 — Package must not proceed if `mush-lint` reports any ERROR. WARNs may be acknowledged and skipped with an explanation. INFOs are always optional.

After the user resolves errors, re-run `mush-lint` and confirm clean before packaging.
