---
name: mush-install
description: "Deploy RhostMUSH softcode to a live server using @rhost/testkit or scripts/eval.js."
risk: low
source: local
date_added: "2026-03-27"
---

> **Act immediately. Write code or ask one question — do not narrate your plan or summarize what you are about to do.**


# mush-install

Deploy softcode to a live RhostMUSH server.

## Session start

Run the `mush-architect` session start checklist (sync + corpus load + help detection) before any work.

## Deployment methods

### scripts/eval.js — one command at a time

```bash
RHOST_PASS=<pass> node scripts/eval.js "@create MySystem <sys>"
RHOST_PASS=<pass> node scripts/eval.js "&FN_NAME #42=..."
```

### @rhost/testkit client — programmatic, scriptable

```typescript
import { RhostClient } from '@rhost/testkit';

const PASS = process.env.RHOST_PASS;
if (!PASS) throw new Error('RHOST_PASS env var is required');

const client = new RhostClient({ host: 'localhost', port: 4201 });
await client.connect();
await client.login('Wizard', PASS);

await client.command('@create MySystem <sys>');
const dbref = await client.eval('search(name=MySystem <sys>)');
await client.command(`&FN_NAME ${dbref}=...`);

await client.disconnect();
```

### Docker — fresh isolated environment

```bash
docker compose up --build -d   # from rhostmush-docker repo
RHOST_PASS=<pass> node scripts/eval.js "@create MySystem <sys>"
```

## Deployment checklist

- [ ] Server is running and reachable
- [ ] `RHOST_PASS` is set (not the default `Nyctasia`)
- [ ] Object created and dbref noted
- [ ] All attributes/commands set
- [ ] Object locked (`@set <obj>=safe`, `@lock <obj>=<owner>`)
- [ ] `@rhost/testkit` tests pass against the deployed code

## Mandatory

Do not mark an install complete until the `@rhost/testkit` test suite passes against the live server. See `/mush-test`.
