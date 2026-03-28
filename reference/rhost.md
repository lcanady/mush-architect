# RhostMUSH Reference — Local Help Corpus

The full RhostMUSH help files are stored locally in this directory. Never fetch from GitHub — use these files directly.

## Files

| File | Lines | Topics | Contents |
|------|-------|--------|----------|
| `reference/rhost-help.txt` | 37,239 | 1,951 | Player + builder help (functions, softcode, attributes, flags, commands) |
| `reference/rhost-wizhelp.txt` | 16,367 | 1,278 | Wizard-level help (@aflags, @power, @config, @admin, snoop, news, API) |
| `reference/rhost-help-topics.txt` | — | — | Sorted topic index for rhost-help.txt (one topic per line) |
| `reference/rhost-wizhelp-topics.txt` | — | — | Sorted topic index for rhost-wizhelp.txt (one topic per line) |

**Source:** https://github.com/RhostMUSH/trunk/tree/master/Server/game/txt
**Last fetched:** 2026-03-28

## How to look up a topic

Topics are delimited by `& <TOPIC NAME>` lines (ampersand at column 0).

### Find if a topic exists
```bash
grep -i "^& <topic>" reference/rhost-help.txt reference/rhost-wizhelp.txt
```

### Read a full topic entry
Use Grep with context lines (-A N) to read everything until the next `& ` marker:
```bash
grep -n "^& setq$" reference/rhost-help.txt
# → line 4521: & setq
# Then: Read reference/rhost-help.txt from line 4521 to next & marker
```

Or use this pattern to extract a complete topic:
```bash
awk '/^& setq$/,/^& [a-z]/' reference/rhost-help.txt | head -60
```

### Search for a function or command
```bash
grep -n "setq\|setr" reference/rhost-help-topics.txt
grep -n "@lock\|@alock" reference/rhost-wizhelp-topics.txt
```

## Topic categories (help.txt)

Key categories to know:

| Prefix / Pattern | Category |
|-----------------|---------|
| `@a*` | Action attributes (aconnect, adrop, etc.) |
| `@*` | Softcode commands (@create, @set, @lock, @switch, etc.) |
| `CODING*` | Softcode tutorials and patterns |
| `FUNCTION*` | Function reference index |
| `FLAG*` | Object flags |
| `ATTRIBUTE*` | Attribute system |
| `TYPE*` | Object types |
| Bare names | Callable functions (setq, iter, switch, if, etc.) |

## Topic categories (wizhelp.txt)

| Prefix / Pattern | Category |
|-----------------|---------|
| `@aflags*` | Attribute flags system |
| `@admin*` | Server administration |
| `@api*` | External API configuration |
| `@power*` / `@depower*` | Player powers system |
| `@config*` | Runtime configuration |
| `news*` / `newsdb*` | News system |
| `snoop*` / `@snoop*` | Monitoring/snooping |
| `TOGGLE*` | Server toggle flags |

## Updating the corpus

When a new version of RhostMUSH is released, refresh with:
```bash
curl -sL "https://raw.githubusercontent.com/RhostMUSH/trunk/master/Server/game/txt/help.txt" \
  -o reference/rhost-help.txt
curl -sL "https://raw.githubusercontent.com/RhostMUSH/trunk/master/Server/game/txt/wizhelp.txt" \
  -o reference/rhost-wizhelp.txt
grep "^& " reference/rhost-help.txt | sed 's/^& //' | sort > reference/rhost-help-topics.txt
grep "^& " reference/rhost-wizhelp.txt | sed 's/^& //' | sort > reference/rhost-wizhelp-topics.txt
```
