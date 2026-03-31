---
name: mush-format
description: "Softcode formatting and installer conversion for MUSH source files. Three operations: fmt (normalize source expressions), expand (installer→source), compress (source→installer). Use fmt on any .mush/.mux/.penn source file; use compress/expand only for installer conversion."
context: fork
agent: general-purpose
effort: fast
paths: "**/*.mush,**/*.mux,**/*.penn,**/*.softcode,**/dist/*.installer.txt"
argument-hint: "[fmt <file...> | expand <file> | compress <file> | preview '<value>']"
date_added: "2026-03-30"
---

> **Act immediately. Run the requested operation and report. Do not modify anything beyond the target output file.**

# mush-format

Three operations for RhostMUSH softcode files, all backed by the PEG grammar parser in `@rhost/testkit`:

- **fmt**: Normalize softcode expressions in any source file (`.mush`, `.mux`, `.penn`, etc.) — strips extra whitespace around function calls, optionally prettifies nested calls. **Run on all source files, always.**
- **expand**: `dist/*.installer.txt` → `softcode/*.mush` (minified one-liner → readable, indented)
- **compress**: `softcode/*.mush` → `dist/*.installer.txt` (readable → compressed installer)
- **preview**: Print the expanded form of a single attribute value string to stdout

---

## When to run

| Trigger | Operation |
|---------|-----------|
| After writing or editing any `.mush` / `.mux` / `.penn` source file | `fmt` |
| Before committing any source file | `fmt --check` |
| Before editing an existing installer file | `expand` |
| Phase 6 — Package, after writing softcode | `fmt` → `compress` |
| Debugging a complex attribute value | `preview` |

**Rule:** `fmt` runs on source files. `compress` runs on source files to produce installers. `expand` runs on installers to produce source files. Never run `compress` on a file that hasn't been through `fmt` first.

---

## fmt — normalize softcode source files

Formats softcode expressions in place. Strips extraneous whitespace around `(`, `,`, `)` while preserving meaningful whitespace inside argument text.

```bash
# Format one file
rhost-testkit fmt softcode/my-system.mush

# Format all source files in a project
rhost-testkit fmt softcode/**/*.mush

# Format multiple extensions
rhost-testkit fmt src/**/*.mush src/**/*.mux src/**/*.penn

# Check only — exit 1 if any file is not formatted (use in CI / pre-commit)
rhost-testkit fmt --check softcode/my-system.mush

# Pretty mode — indent nested function calls for human readability
rhost-testkit fmt --pretty softcode/my-system.mush

# Normalise function names to lowercase
rhost-testkit fmt --lowercase softcode/my-system.mush

# From stdin
echo "add( 2, 3 )" | rhost-testkit fmt
```

### Supported source extensions

`rhost-testkit fmt` accepts any file. Apply it to:

| Extension | Use for |
|-----------|---------|
| `.mush` | Primary RhostMUSH/PennMUSH source files |
| `.mux` | TinyMUX source files |
| `.penn` | PennMUSH source files |
| `.softcode` | Generic mushcode (server-agnostic) |
| `.msc` | Short-form mushcode snippets |

**Do not run `fmt` on `dist/*.installer.txt` files** — those are compressed output, not source.

### What fmt does

Input:
```
&FN_GREET #42=   if(  not(  %0  ),  #-1 MISSING ARG  ,  strcat(  Hello ,  %0  )  )
```

Output:
```
&FN_GREET #42=if(not(%0),#-1 MISSING ARG,strcat(Hello,%0))
```

With `--pretty`:
```
&FN_GREET #42=if(
  not(%0),
  #-1 MISSING ARG,
  strcat(Hello,%0)
)
```

`fmt` does **not** reorder attributes, change comment style, or touch non-expression content (command triggers, `@pemit` lines, `@@` comments).

---

## Usage

### expand — read an installer, write readable .mush

```bash
rhost-testkit mush-format expand dist/my-system.installer.txt
# Writes: softcode/my-system.mush
```

Multiple files:
```bash
rhost-testkit mush-format expand dist/*.installer.txt
```

From stdin:
```bash
cat dist/my-system.installer.txt | rhost-testkit mush-format expand
```

Options:
- `--indent=N` — indent size in spaces (default: 2)

### compress — write an installer from readable .mush

```bash
rhost-testkit mush-format compress softcode/my-system.mush
# Writes: dist/my-system.installer.txt
```

Options:
- `--name=NAME` — system display name (default: reads from manifest.json `displayName`)
- `--version=VER` — version string (default: reads from manifest.json `version`)
- `--author=AUTHOR` — author name (default: reads from manifest.json `author`)
- `--requires=DEPS` — prerequisite note (default: reads from manifest.json, or "None")
- `--lowercase` — normalise all function names to lowercase

Meta is read automatically from `manifest.json` or `package.json` in the softcode directory or its parent. CLI flags override file metadata.

### preview — inspect a single attribute value

```bash
rhost-testkit mush-format preview '$+finger *:@pemit %#=[u(me/FN_FINGER,%0)]'
```

From stdin:
```bash
echo "switch(1,1,one,2,two,other)" | rhost-testkit mush-format preview
```

---

## What expand produces

Input (`dist/my-system.installer.txt`):
```
&CMD_FINGER #42=$+finger *:@switch 1=[streq(%0,)],{@pemit %#=Usage: +finger <name>},{@pemit %#=[u(me/FN_FINGER,%0)]}
```

Output (`softcode/my-system.mush`):
```mush
&CMD_FINGER #42=
  $+finger *:
  @switch 1=
    [streq(%0,)],
    {
      @pemit %#=Usage: +finger <name>
    },
    {
      @pemit %#=[u(me/FN_FINGER, %0)]
    }
```

## What compress produces

The installer file includes:
- Header block: `@@ Mushcode Installer for: <name> v<version>`
- Author, date, requires lines
- `@pemit me=` progress lines (preserved as-is from source — these are commands, not attributes)
- Minified `&ATTR #DBREF=value` lines (one per line, no line breaks inside attr values)
- `@@ ---[ UNINSTALL ]---` section (preserved from source)

`@pemit me=` lines must not be removed or reordered during compress. They provide real-time install feedback to the wizard running the paste.

---

## File path conventions

| Expanded source | Compressed installer |
|----------------|---------------------|
| `softcode/foo.mush` | `dist/foo.installer.txt` |
| `softcode/sub/bar.mush` | `dist/sub/bar.installer.txt` |

The `expand` command derives the output path by replacing `/dist/` with `/softcode/` and `.installer.txt` with `.mush`. The `compress` command does the reverse.

---

## Integration with mush-build

**Phase 3 — Code**: If starting from an existing installer (e.g. patching a deployed system), run expand first so the softcode is in readable form for editing.

**Phase 6 — Package**: Run compress to produce the final `dist/*.installer.txt`. This replaces manual formatting and ensures consistent output.

```
Phase 6 — Package
  1. rhost-testkit mush-format compress softcode/my-system.mush
  2. Verify dist/my-system.installer.txt has correct header and UNINSTALL section
  3. Run /mush-lint on the output
```

---

## Rules

- Never edit `dist/*.installer.txt` directly — always edit `softcode/*.mush` and re-compress
- The `//` comment style is valid in `.mush` files (expand preserves them; compress strips them)
- Long attribute values (>7500 chars) are flagged by `/mush-lint` check L1 — mush-format does not split them automatically
- `@@` comments in the installer header/footer are preserved verbatim through compress/expand round-trips
