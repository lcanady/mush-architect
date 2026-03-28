---
name: mush-release
description: "Full release workflow: bump version, update installer header, generate patch installer, write changelog entry, create git tag, push. Use when shipping a new version of a softcode system."
disable-model-invocation: true
effort: medium
argument-hint: "[patch|minor|major] or [version number]"
date_added: "2026-03-28"
---

> **Act immediately. Ask for version bump type, then execute all steps in order. Stop before git push and confirm.**

# mush-release

One command to ship a release. Bumps the version, updates all artifacts, writes the changelog, tags git, and pushes. Pairs with `/mush-patch` for the installer artifact.

## Phase 1 — Pre-flight checks

Before touching any files:

1. Run `/mush-lint` — must be clean (no ERRORs)
2. Run `/mush-test` — all tests must pass
3. Run `/mush-audit` — server must match current manifest (no unexpected drift)
4. Confirm working tree is clean: `git status`

If any check fails, stop and report. Do not proceed with a dirty release.

## Phase 2 — Determine new version

Ask if not provided as argument:
> "What kind of release? `patch` (bug fix), `minor` (new feature), or `major` (breaking change)? Or specify a version number directly."

Apply semver:

| Type | Example |
|------|---------|
| `patch` | `0.2.1 → 0.2.2` |
| `minor` | `0.2.1 → 0.3.0` |
| `major` | `0.2.1 → 1.0.0` |

## Phase 3 — Update version in all artifacts

Update the version string everywhere it appears:

1. `dist/manifest.json` — `"version"` field
2. `dist/[project].installer.txt` — `@@ Version:` line in header
3. `src/config.mush` — `&VER <obj>=` attribute value
4. `CHANGELOG.md` — add new version section (see Phase 4)

## Phase 4 — Write changelog entry

Append to `CHANGELOG.md` (create if missing):

```markdown
## [0.3.0] — 2026-03-28

### Added
- [list new commands or UDFs]

### Changed
- [list modified behavior]

### Fixed
- [list bug fixes]

### Removed
- [list removed attributes or commands]
```

If this is the first release (0.0.0 → any), create `CHANGELOG.md` with an `[Unreleased]` section template above the first entry.

## Phase 5 — Generate patch installer

Run `/mush-patch` to generate `dist/[project].patch.[old]-[new].txt` with only changed attributes.

If this is version `0.1.0` from `0.0.0`, generate the full installer instead (no patch — first real install).

## Phase 6 — Update main installer

Merge patch back into `dist/[project].installer.txt`:
- Update `@@ Version:` in header
- Add `@@ CHANGED: [old] → [new] [brief description]` line
- Update `&VER` attribute value in the installer body

## Phase 7 — Update manifest installer record

Add an entry to `dist/manifest.json` `installers[]`:

```json
{
  "file": "dist/my-cool-system.patch.0.2.1-0.3.0.txt",
  "version": "0.3.0",
  "installed": null,
  "checksum": "sha256:<hash>"
}
```

## Phase 8 — Commit and tag

```bash
git add dist/ src/ help/ CHANGELOG.md
git commit -m "release: v[new-version]

[one-paragraph summary of what changed]"

git tag -a "v[new-version]" -m "Release v[new-version]"
```

## Phase 9 — Confirm before push

**Stop here.** Show the user:

```
=== READY TO RELEASE ===
Version:   0.2.1 → 0.3.0
Commit:    release: v0.3.0
Tag:       v0.3.0
Artifacts:
  dist/my-cool-system.installer.txt        (updated)
  dist/my-cool-system.patch.0.2.1-0.3.0.txt (new)
  CHANGELOG.md                             (updated)

Push to origin? (y/n)
========================
```

Only push on explicit "yes" / "y" / "push".

## Phase 10 — Push

```bash
git push && git push --tags
```

Report the tag URL and remind the user to run `/mush-install` on the target server using the new patch installer.

## Rules

- Never push without explicit user confirmation in Phase 9
- Never skip the pre-flight checks in Phase 1
- Patch releases never generate a new `@create` — only attribute changes
- Major releases should include a `BREAKING CHANGES` section in the changelog
- Tag format is always `v[semver]` — e.g. `v0.3.0`, never `0.3.0` or `release-0.3.0`
