---
name: mush-publish
description: "Package mushcode and open a PR into the public mush-softcode community repo. Validates all quality gates, structures the submission, and files the PR via gh. Use when the user wants to share, publish, or submit a finished system to the community."
disable-model-invocation: true
effort: medium
argument-hint: "[target-repo e.g. mush-community/mush-softcode]"
date_added: "2026-03-28"
---

> **Act immediately. Run every phase in order. Stop before filing the PR and confirm with the user.**

# mush-publish

One command to share a finished mushcode system with the community. Validates quality gates, structures the package, and opens a PR into the public `mush-softcode` repo.

## Preconditions

This skill assumes the project has already been through the full build pipeline. If any of the following are missing, stop immediately and tell the user which step to run first.

| Required | Check |
|----------|-------|
| `dist/manifest.json` | Exists and has `name`, `version`, `server_type`, `authors[]` |
| `dist/[project].installer.txt` | Exists and ends with `@@ [END OF FILE]` |
| Version is not `0.0.0` | Must be a real release — run `/mush-release` first |
| Git tag `v[version]` exists | Run `/mush-release` to tag |
| Working tree is clean | `git status` is clean |

---

## Phase 1 — Pre-flight

Run these checks before touching anything:

```bash
# 1. Working tree clean?
git status

# 2. Read the manifest
cat dist/manifest.json

# 3. Confirm installer exists and ends correctly
tail -3 dist/*.installer.txt
```

Parse `dist/manifest.json` and extract:

| Field | From manifest | Fail if |
|-------|--------------|---------|
| `slug` | `name` (slugified: lowercase, hyphens) | missing |
| `version` | `version` | `"0.0.0"` or missing |
| `server_type` | `server_type` | missing |
| `description` | `description` | missing — ask the user for one |
| `authors` | `authors[]` | empty array |
| `repo_url` | `repo` | warn if empty, but don't block |
| `license` | `license` | warn if missing, default to `"MIT"` |

Confirm the installer file ends with `@@ [END OF FILE]` (exact string). If not, stop — the installer is incomplete.

Confirm a git tag `v[version]` exists:

```bash
git tag --list "v[version]"
```

If the tag is missing, stop and tell the user to run `/mush-release` first.

**Security scan before publishing:**

Scan the installer for hardcoded dbrefs:

```bash
grep -n '#[0-9]\+' dist/*.installer.txt
```

If any dbrefs are found outside of comments (`@@`-prefixed lines), stop and warn:

```
⚠ PUBLISH BLOCKED: Hardcoded dbrefs found in installer (lines [N]).
  Dbrefs are server-specific and will not work for other users.
  Fix these in the source and regenerate the installer, then try again.
```

---

## Phase 2 — Determine target repo

If the user provided a repo argument (e.g. `mush-community/mush-softcode`), use it.

Otherwise ask:
> "Which repo should I PR this into? Default: `mush-community/mush-softcode`. Enter a different `owner/repo` or press enter to accept the default."

Store the answer as `TARGET_REPO`. Verify it exists:

```bash
gh repo view [TARGET_REPO] --json name,url
```

If `gh` returns an error, stop and tell the user:
- The repo may not exist yet — offer to create it: "Should I create `[TARGET_REPO]` as a public repo now?"
- If yes, follow [Creating the community repo](#creating-the-community-repo) below.

---

## Phase 3 — Clone or update the target repo

Check if `../[repo-name]/` already exists:

```bash
ls ../[repo-name]
```

**If it exists:**
```bash
cd ../[repo-name] && git fetch origin && git checkout main && git pull
```

**If it does not exist:**
```bash
cd .. && gh repo clone [TARGET_REPO]
```

Confirm the repo is clean and on `main` before proceeding.

---

## Phase 4 — Build the package directory

In the target repo, create (or overwrite) the package directory:

```
packages/[slug]/
  [slug].installer.txt          ← copy of dist/[project].installer.txt
  [slug].help.installer.txt     ← copy of help/[project].help.installer.txt (if exists)
  README.md                     ← generated (see Phase 5)
  manifest.json                 ← sanitized copy of dist/manifest.json
```

**Copy the installer:**
```bash
cp dist/[project].installer.txt ../[repo-name]/packages/[slug]/[slug].installer.txt
```

**Copy the help installer (if it exists):**
```bash
[ -f help/[project].help.installer.txt ] && \
  cp help/[project].help.installer.txt ../[repo-name]/packages/[slug]/[slug].help.installer.txt
```

**Sanitize the manifest** before copying — remove or redact any server-specific fields that would mislead other users:

Fields to keep: `name`, `version`, `description`, `server_type`, `authors`, `license`, `repo`, `objects` (name, type, flags, role only — no `dbref`), `attributes` (name, type, checksum, version_added, version_modified).

Fields to strip: `dbref` on every object, `installed` timestamps on installers.

Write the sanitized manifest as `packages/[slug]/manifest.json`.

---

## Phase 5 — Generate the package README

Write `packages/[slug]/README.md`:

```markdown
# [Project Name]

> [one-sentence description from manifest]

**Author:** [author name(s)]
**Version:** [version]
**Server:** [server_type]
**License:** [license]

[repo_url as linked text, if present]

## What it does

[Ask the user for 2–4 sentences if the manifest description is too short. Otherwise expand the description into a short paragraph.]

## Requirements

[From the installer `@@ Requires:` line — or "None" if not present.]

## Objects created

| Object | Role |
|--------|------|
[one row per object in the manifest — name and role]

## Installation

Paste `[slug].installer.txt` directly into your MUSH client, or use `@paste`:

```
@paste [slug].installer.txt
```

[If a help installer exists, add:]
Then install the help file:
```
@paste [slug].help.installer.txt
```

## Help

[List commands with one-line descriptions, from the installer's `@@ ---[ COMMANDS ]---` section or the help/help.txt file.]

## Uninstall

[Copy the UNINSTALL block comment from the installer verbatim.]

## Changelog

[Copy from CHANGELOG.md — latest version entry only.]
```

Rules:
- Never put a dbref in the README.
- If `help/help.txt` exists, copy the full content into a `## Help reference` fenced block at the bottom.
- Keep the README under 200 lines — if it would exceed this, link to the source repo instead of inlining.

---

## Phase 6 — Commit and prepare the PR

In `../[repo-name]`:

```bash
cd ../[repo-name]

# Create a branch named packages/[slug]-[version]
git checkout -b packages/[slug]-[version]

git add packages/[slug]/

git commit -m "feat([slug]): add [Project Name] v[version]

[one-paragraph description from manifest or README intro]

Server: [server_type]
Author: [author(s)]"
```

---

## Phase 7 — Confirm before filing the PR

**Stop here.** Show the user:

```
=== READY TO PUBLISH ===
Package:    [Project Name] v[version]
Target:     [TARGET_REPO]
Branch:     packages/[slug]-[version]
Files:
  packages/[slug]/[slug].installer.txt        (installer)
  packages/[slug]/[slug].help.installer.txt   (help — if present)
  packages/[slug]/README.md                   (generated)
  packages/[slug]/manifest.json               (sanitized)

File the PR? (y/n)
========================
```

Only proceed on explicit "yes" / "y" / "file it" / "go".

---

## Phase 8 — File the PR

```bash
cd ../[repo-name]

git push -u origin packages/[slug]-[version]

gh pr create \
  --repo [TARGET_REPO] \
  --title "feat([slug]): [Project Name] v[version]" \
  --body "$(cat <<'EOF'
## [Project Name]

[one-paragraph description]

**Version:** [version]
**Server:** [server_type]
**Author:** [authors]
**License:** [license]
[**Source:** [repo_url] — if present]

## Package contents

- `[slug].installer.txt` — main installer
[- `[slug].help.installer.txt` — help installer (if present)]
- `README.md` — documentation
- `manifest.json` — sanitized manifest

## Checklist

- [ ] All lint checks pass (`/mush-lint`)
- [ ] All tests pass (`/mush-test`)
- [ ] Security audit clean (`/mush-security`)
- [ ] No hardcoded dbrefs in installer
- [ ] Installer ends with `@@ [END OF FILE]`
- [ ] Uninstall instructions included

🤖 Published with [mush-architect](https://github.com/kumakun/mush-architect)
EOF
)"
```

Report the PR URL to the user.

---

## Phase 9 — Post-publish

After the PR is filed:

1. Record the PR URL in `dist/manifest.json` under a new `published[]` array:

```json
"published": [
  {
    "repo": "[TARGET_REPO]",
    "pr_url": "[PR URL]",
    "version": "[version]",
    "date": "[today's date]"
  }
]
```

2. Commit the manifest update to the **source** repo:

```bash
# Back in the source repo
git add dist/manifest.json
git commit -m "chore: record publish PR for v[version]"
```

3. Tell the user what happens next:
   - The PR is open for community review.
   - Maintainers may ask for changes — watch the PR for comments.
   - Once merged, the package will appear in the community index.

---

## Creating the community repo

If `[TARGET_REPO]` does not exist and the user wants to create it:

```bash
gh repo create [TARGET_REPO] \
  --public \
  --description "Community collection of RhostMUSH and other MUSH softcode systems" \
  --clone
```

Then initialize the repo structure:

```
mush-softcode/
  README.md          ← repo index (generated)
  packages/          ← one directory per package
  CONTRIBUTING.md    ← how to submit a package
  .github/
    PULL_REQUEST_TEMPLATE.md
```

**README.md** (repo index):
```markdown
# mush-softcode

Community collection of ready-to-install MUSH softcode systems.

## Packages

| Package | Version | Server | Description |
|---------|---------|--------|-------------|
[one row per package, filled in as packages are merged]

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) to submit your own package.

## Built with

[mush-architect](https://github.com/kumakun/mush-architect) — the RhostMUSH softcode development suite.
```

**CONTRIBUTING.md**:
```markdown
# Contributing to mush-softcode

## How to submit a package

The easiest way: use the `/mush-publish` skill in [mush-architect](https://github.com/kumakun/mush-architect).

## Manual submission

1. Fork this repo.
2. Create `packages/[your-slug]/` with:
   - `[slug].installer.txt` — your installer (must end with `@@ [END OF FILE]`)
   - `README.md` — documentation
   - `manifest.json` — see existing packages for format
3. Open a PR with the title `feat([slug]): [Package Name] v[version]`.

## Requirements for acceptance

- [ ] Installer has no hardcoded dbrefs
- [ ] Installer has an UNINSTALL section
- [ ] README includes: what it does, requirements, installation steps, uninstall steps
- [ ] `manifest.json` is present and valid
- [ ] Code compiles and runs on the stated server type
```

**PULL_REQUEST_TEMPLATE.md**:
```markdown
## Package

**Name:**
**Version:**
**Server:**
**Author:**

## Description

[What does this package do?]

## Checklist

- [ ] No hardcoded dbrefs in installer
- [ ] Installer ends with `@@ [END OF FILE]`
- [ ] UNINSTALL section included
- [ ] README complete
- [ ] `manifest.json` present and sanitized
```

Commit and push the skeleton, then re-run `/mush-publish` to file the first package PR.

---

## Rules

- Never file the PR without explicit user confirmation in Phase 7.
- Never include hardcoded dbrefs in any published file.
- Never publish a `0.0.0` version — it signals an unreleased build.
- The manifest written to the package dir must have dbrefs stripped — the original `dist/manifest.json` is never modified.
- Always update `dist/manifest.json`'s `published[]` array after a successful PR (Phase 9).
- If the target repo does not have a `packages/` directory, create it before adding the package.
