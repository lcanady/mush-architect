#!/usr/bin/env node

'use strict';

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

// ── constants ────────────────────────────────────────────────────────────────

const PKG_ROOT    = path.join(__dirname, '..');
const GLOBAL_DIR  = path.join(os.homedir(), '.claude', 'skills');
const SKILL_NAME  = 'mush-architect';
const PATTERNS_NAME = 'mush-patterns';
const PATTERNS_REPO = 'https://github.com/lcanady/mush-patterns.git';

const VERSION = (() => {
  try {
    return require(path.join(PKG_ROOT, 'package.json')).version;
  } catch {
    return '(unknown)';
  }
})();

// ── colour helpers ───────────────────────────────────────────────────────────

const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  green:  '\x1b[32m',
  cyan:   '\x1b[36m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  white:  '\x1b[37m',
};

const ok   = (s) => console.log(`  ${c.green}✓${c.reset} ${s}`);
const info = (s) => console.log(`  ${c.cyan}→${c.reset} ${s}`);
const warn = (s) => console.log(`  ${c.yellow}!${c.reset} ${s}`);
const fail = (s) => console.error(`  ${c.red}✗${c.reset} ${s}`);
const head = (s) => console.log(`\n${c.bold}${s}${c.reset}`);
const dim  = (s) => console.log(`  ${c.dim}${s}${c.reset}`);

// ── prompt helper ────────────────────────────────────────────────────────────

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function confirm(question, defaultYes = true) {
  const hint = defaultYes ? '[Y/n]' : '[y/N]';
  const answer = await prompt(`  ${question} ${c.dim}${hint}${c.reset} `);
  if (!answer) return defaultYes;
  return /^y(es)?$/i.test(answer);
}

// ── git helpers ──────────────────────────────────────────────────────────────

function hasGit() {
  const r = spawnSync('git', ['--version'], { stdio: 'ignore' });
  return r.status === 0;
}

function cloneOrUpdate(repoUrl, targetDir) {
  if (fs.existsSync(path.join(targetDir, '.git'))) {
    info(`Updating ${path.basename(targetDir)}…`);
    const r = spawnSync('git', ['-C', targetDir, 'pull', '--ff-only'], { stdio: 'pipe' });
    if (r.status !== 0) {
      warn(`git pull failed — ${r.stderr.toString().trim()}`);
      warn('Skipping update; existing corpus may be stale.');
    } else {
      ok(`${path.basename(targetDir)} up to date`);
    }
  } else {
    info(`Cloning ${path.basename(targetDir)}…`);
    fs.mkdirSync(targetDir, { recursive: true });
    const r = spawnSync('git', ['clone', '--depth=1', repoUrl, targetDir], { stdio: 'pipe' });
    if (r.status !== 0) {
      throw new Error(`git clone failed: ${r.stderr.toString().trim()}`);
    }
    ok(`${path.basename(targetDir)} cloned`);
  }
}

// ── copy helper ──────────────────────────────────────────────────────────────

function copySkills(srcRoot, destDir) {
  fs.mkdirSync(destDir, { recursive: true });

  for (const entry of ['SKILL.md', 'reference', 'skills']) {
    const src  = path.join(srcRoot, entry);
    const dest = path.join(destDir, entry);
    if (!fs.existsSync(src)) {
      warn(`Package missing: ${entry} — skipping`);
      continue;
    }
    fs.cpSync(src, dest, { recursive: true, force: true });
    ok(`Installed ${entry}`);
  }
}

// ── install flow ─────────────────────────────────────────────────────────────

async function install(flags) {
  head(`@rhost/mush-architect v${VERSION} — Installer`);
  console.log();

  // ── resolve target dir ──────────────────────────────────────────────────
  let skillsBase;

  if (flags.global) {
    skillsBase = GLOBAL_DIR;
  } else if (flags.project) {
    skillsBase = path.join(process.cwd(), '.claude', 'skills');
  } else if (flags.dir) {
    skillsBase = flags.dir;
  } else {
    // interactive
    console.log('  Where should the skills be installed?\n');
    console.log(`  ${c.bold}1${c.reset}  Global  ${c.dim}(${path.join(GLOBAL_DIR, SKILL_NAME)})${c.reset}`);
    console.log(`  ${c.bold}2${c.reset}  Project ${c.dim}(${path.join('.claude', 'skills', SKILL_NAME)})${c.reset}`);
    console.log();
    const choice = await prompt(`  Choice ${c.dim}[1]${c.reset} `);
    if (choice === '2') {
      skillsBase = path.join(process.cwd(), '.claude', 'skills');
    } else {
      skillsBase = GLOBAL_DIR;
    }
  }

  const skillDir    = path.join(skillsBase, SKILL_NAME);
  const patternsDir = path.join(skillsBase, PATTERNS_NAME);

  // ── existing install check ───────────────────────────────────────────────
  if (fs.existsSync(skillDir) && !flags.yes) {
    warn(`${SKILL_NAME} already exists at ${skillDir}`);
    const overwrite = await confirm('Overwrite?', false);
    if (!overwrite) {
      console.log('\n  Aborted.\n');
      process.exit(0);
    }
  }

  head('Installing skills…');

  copySkills(PKG_ROOT, skillDir);

  // ── mush-patterns ────────────────────────────────────────────────────────
  head('Fetching mush-patterns corpus…');

  if (!flags.noPatterns) {
    if (!hasGit()) {
      warn('git not found — skipping mush-patterns clone.');
      warn('Clone manually: git clone ' + PATTERNS_REPO + ' ' + patternsDir);
    } else {
      try {
        cloneOrUpdate(PATTERNS_REPO, patternsDir);
      } catch (err) {
        warn(`Could not fetch mush-patterns: ${err.message}`);
        warn('You can clone it manually later:');
        dim(`git clone ${PATTERNS_REPO} "${patternsDir}"`);
      }
    }
  } else {
    info('Skipped (--no-patterns)');
  }

  // ── done ─────────────────────────────────────────────────────────────────
  head('Done!');
  console.log();
  ok(`Skills installed to:  ${skillDir}`);
  ok(`Patterns corpus at:   ${patternsDir}`);
  console.log();
  info('Open a Claude Code session and type /mush-architect to get started.');
  console.log();
}

// ── update flow ───────────────────────────────────────────────────────────────

async function update(flags) {
  head(`@rhost/mush-architect v${VERSION} — Updater`);
  console.log();

  const candidates = [
    path.join(GLOBAL_DIR, SKILL_NAME),
    path.join(process.cwd(), '.claude', 'skills', SKILL_NAME),
  ];

  const found = candidates.filter((d) => fs.existsSync(d));

  if (found.length === 0) {
    fail('No existing install found. Run without arguments to install.');
    process.exit(1);
  }

  for (const skillDir of found) {
    const skillsBase  = path.dirname(skillDir);
    const patternsDir = path.join(skillsBase, PATTERNS_NAME);

    head(`Updating ${skillDir}…`);
    copySkills(PKG_ROOT, skillDir);

    if (!flags.noPatterns && hasGit()) {
      head('Updating mush-patterns…');
      try {
        cloneOrUpdate(PATTERNS_REPO, patternsDir);
      } catch (err) {
        warn(`Could not update mush-patterns: ${err.message}`);
      }
    }
  }

  console.log();
  ok('Update complete.');
  console.log();
}

// ── uninstall flow ────────────────────────────────────────────────────────────

async function uninstall(flags) {
  head(`@rhost/mush-architect — Uninstaller`);
  console.log();

  const candidates = [
    path.join(GLOBAL_DIR, SKILL_NAME),
    path.join(process.cwd(), '.claude', 'skills', SKILL_NAME),
  ];

  const found = candidates.filter((d) => fs.existsSync(d));

  if (found.length === 0) {
    info('No install found. Nothing to remove.');
    process.exit(0);
  }

  for (const skillDir of found) {
    if (!flags.yes) {
      const go = await confirm(`Remove ${skillDir}?`, false);
      if (!go) continue;
    }
    fs.rmSync(skillDir, { recursive: true, force: true });
    ok(`Removed ${skillDir}`);
  }

  console.log();
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  const flags = {
    global:     args.includes('--global'),
    project:    args.includes('--project'),
    yes:        args.includes('--yes') || args.includes('-y'),
    noPatterns: args.includes('--no-patterns'),
    dir:        (() => {
      const i = args.indexOf('--dir');
      return i !== -1 ? args[i + 1] : null;
    })(),
  };

  const command = args.find((a) => !a.startsWith('-')) || 'install';

  try {
    switch (command) {
      case 'install':   await install(flags);   break;
      case 'update':    await update(flags);    break;
      case 'uninstall': await uninstall(flags); break;
      default:
        fail(`Unknown command: ${command}`);
        console.log('\n  Usage: mush-architect [install|update|uninstall] [options]');
        console.log('  Options: --global  --project  --dir <path>  --no-patterns  --yes\n');
        process.exit(1);
    }
  } catch (err) {
    fail(err.message);
    process.exit(1);
  }
}

main();
