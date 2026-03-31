---
name: mush-robot
description: "Build the @robot bridge process for TinyMUX external integration. Generates the Node/Deno telnet bot, JSON-over-pemit protocol, async request queue, and softcode event handlers needed to connect an external process (e.g. an AI GM) to a stock TinyMUX server with no C-code changes."
effort: high
paths: "**/robot/**,**/bridge/**,**/src/**"
argument-hint: "[what the robot should do, e.g. 'AI GM event handler' or 'external stats service']"
date_added: "2026-03-31"
---

> **Act immediately. Present the design plan (Phase 0) and stop. Do not write code until the user confirms.**

# mush-robot

Build the @robot bridge — a telnet bot that connects to TinyMUX as a robot player and bridges softcode events to an external process. This is the standard integration point for AI GMs, external services, and any code that can't run as MUX softcode.

## Why @robot

Stock TinyMUX has no plugin API and no HTTP server. The only external communication channel is a robot player connection: an external process connects via telnet, authenticates as a robot-flagged player, and exchanges plain text. Everything else (websocket modules, execscript) requires a custom C build. This skill works with vanilla TinyMUX.

## Phase 0 — Design plan (BLOCKING GATE)

Before writing any code, produce a plan covering:

1. **Robot player** — name, dbref (or TBD), required flags (ROBOT + WIZARD recommended)
2. **What events the robot handles** — which in-game actions send data to the robot
3. **What the robot sends back** — commands the bridge process issues to the game
4. **Protocol** — sentinel format for extracting AI GM messages from the telnet stream
5. **Async strategy** — how pending requests are queued and responses correlated
6. **Files to create** — bridge process file(s), softcode file(s), test file(s)
7. **Open questions** — anything requiring user input before proceeding

Stop and wait for confirmation before Phase 1.

---

## Phase 1 — TinyMUX setup

### Create the robot player

Run in-game as a wizard:

```
@robot AI_GM
@set AI_GM=WIZARD
@lock AI_GM=AI_GM
@desc AI_GM=The game's AI game master. Do not disturb.
@fo me=&D.ROBOT me=search(name=AI_GM)
```

`WIZARD` flag is required so the robot can `@trigger`, `@pemit`, `@set`, and move freely. Lock it to itself so only it can @force itself.

### Get the robot's dbref

```
think search(name=AI_GM)
```

Record the dbref — it goes in the bridge config and the softcode event emitters.

---

## Phase 2 — Protocol design

The telnet stream is noisy: room descriptions, system messages, `Who has connected.` notices, and other output mix in. Use a sentinel wrapper so the bridge can reliably extract structured messages:

**Softcode → robot (event notification):**
```
@pemit AI_GM=^GM^{"id":"[guid()]","type":"<event>","player":"[num(%#)]","room":"[loc(%#)]","data":{...}}^GM^
```

**Bridge → softcode (response/action):**
Robot issues commands directly as a wizard player — no wrapper needed:
```
@trigger #<room>/GM_RESPONSE=<id>|<escaped-narrative>
@pemit #<player>=<message>
@set #<obj>/<attr>=<value>
```

### Sentinel format rules

- Sentinel: `^GM^` (unlikely to appear in normal MUX output; change if your game uses this string)
- Every message is a single line (TinyMUX truncates very long lines — keep JSON under 900 chars)
- If context exceeds 900 chars, use multiple `@pemit` calls with a sequence header: `^GM^{"id":"<id>","seq":0,"total":3,...}^GM^`

### Minimum viable message payload

Keep payloads small to stay under line length limits:

```json
{
  "id": "req_abc123",
  "type": "room_enter",
  "player": "#123",
  "room": "#456",
  "data": {
    "desc": "A dark forest path.",
    "who": ["#123","#789"],
    "recent": ["Bob defeated a goblin"]
  }
}
```

**Event types to define (fill in for your use case):**

| Type | Trigger | Minimum data |
|------|---------|-------------|
| `room_enter` | Player moves to a room | player, room, desc, who |
| `command` | Player uses a `+gm` command | player, room, command, args |
| `combat_start` | Combat begins | player, room, opponents |
| `npc_interact` | Player speaks to an NPC | player, room, npc_dbref, speech |
| `idle_tick` | Periodic GM heartbeat | room, who, elapsed |

---

## Phase 3 — Bridge process

Generate `robot/bridge.ts` (or `.js`). The bridge:

1. Connects to TinyMUX via telnet
2. Authenticates as the robot player
3. Strips ANSI from incoming lines
4. Extracts `^GM^...^GM^` messages (reassembles multi-part if needed)
5. Queues requests and calls the AI/external service asynchronously
6. Sends response commands back via the telnet connection

### Template (Deno/TypeScript)

```typescript
import { createConnection } from "node:net";
import { stripAnsi } from "./utils.ts";

const CONFIG = {
  host: Deno.env.get("MUSH_HOST") ?? "localhost",
  port: parseInt(Deno.env.get("MUSH_PORT") ?? "4201"),
  username: Deno.env.get("ROBOT_NAME") ?? "AI_GM",
  password: Deno.env.get("ROBOT_PASS") ?? "",
};

const SESSION_ID = "robot-" + Date.now().toString(36);
const GM_PATTERN = /\^GM\^(.+?)\^GM\^/;
const pending = new Map<string, GMRequest>();

const conn = createConnection({ host: CONFIG.host, port: CONFIG.port });
let buffer = "";

conn.on("data", (chunk) => {
  buffer += chunk.toString();
  const lines = buffer.split("\n");
  buffer = lines.pop() ?? "";
  for (const line of lines) handleLine(stripAnsi(line));
});

function handleLine(line: string): void {
  const match = GM_PATTERN.exec(line);
  if (!match) return;
  try {
    const msg = JSON.parse(match[1]) as GMMessage;
    handleMessage(msg);
  } catch {
    console.error("[bridge] failed to parse:", match[1]);
  }
}

async function handleMessage(msg: GMMessage): Promise<void> {
  // Ack immediately so softcode doesn't wait
  send(`@pemit ${msg.player}=<The GM is thinking...>`);
  pending.set(msg.id, msg);

  try {
    const response = await callExternalService(msg);
    // Fire response trigger on the room object
    send(`@trigger ${msg.room}/GM_RESPONSE=${msg.id}|${escapeMux(response.narrative)}`);
    if (response.actions?.length) {
      for (const action of response.actions) {
        send(buildActionCommand(action));
      }
    }
  } catch (err) {
    console.error("[bridge] handler error:", err);
    send(`@pemit ${msg.player}=<The GM is unavailable. Please try again.>`);
  } finally {
    pending.delete(msg.id);
  }
}

function send(cmd: string): void {
  conn.write(cmd + "\n");
}

function escapeMux(s: string): string {
  // Escape pipe and percent — both have meaning in MUX trigger args
  return s.replace(/\|/g, "%|").replace(/%/g, "%%").replace(/\[/g, "%[").replace(/\]/g, "%]");
}

// Login sequence
conn.on("connect", () => {
  setTimeout(() => {
    send(`connect ${CONFIG.username} ${CONFIG.password}`);
    send(`@pemit me=^BRIDGE^online:${SESSION_ID}^BRIDGE^`);
    console.log(`[bridge] connected as ${CONFIG.username}`);
  }, 500);
});

conn.on("error", (err) => { console.error("[bridge] connection error:", err); });
conn.on("close", () => { console.log("[bridge] disconnected"); process.exit(1); });
```

### Rate limiting

If multiple players trigger GM events simultaneously, the bridge should process them concurrently (each has its own `id`) but cap inflight requests to avoid overwhelming the external service:

```typescript
const CONCURRENCY_LIMIT = 3;
let inflight = 0;
const queue: GMMessage[] = [];

async function handleMessage(msg: GMMessage): Promise<void> {
  if (inflight >= CONCURRENCY_LIMIT) {
    queue.push(msg);
    send(`@pemit ${msg.player}=<The GM is busy. Your request is queued.>`);
    return;
  }
  inflight++;
  try { await processMessage(msg); }
  finally {
    inflight--;
    if (queue.length > 0) handleMessage(queue.shift()!);
  }
}
```

---

## Phase 4 — Softcode event emitters

Generate `src/robot-events.mush` with the softcode side of the protocol.

### Global event object

```mushcode
@create GM Events <gme>
@set GM Events <gme>=inherit safe
@fo me=&D.GME me=search(name=GM Events <gme>)
```

### Event emission UDF

```mushcode
&FN_GM_EMIT [D.GME]=
  @@ FN_GM_EMIT(<type>, <player>, <room>, <data-json>)
  @@ Sends a structured event to the robot player.
  [if(not(and(%0,%1,%2)),#-1 MISSING ARGS,
    @pemit [v(D.ROBOT)]=^GM^[
      objeval(me, strcat(
        "{",
          squote(id), ":", squote(guid()), ",",
          squote(type), ":", squote(%0), ",",
          squote(player), ":", squote(%1), ",",
          squote(room), ":", squote(%2), ",",
          squote(data), ":", if(%3, %3, "{}")
        "}"
      ))
    ]^GM^
  )]
```

### Room enter trigger

```mushcode
@@ Add to each room that should notify the GM:
&ADESC <room>=
  @trigger [v(D.GME)]/CMD_GM_ROOM_ENTER=%#

&CMD_GM_ROOM_ENTER [D.GME]=$+gmenter *:
  @@ Also triggerable by @trigger directly
  @switch/first 1=
    not(v(D.ROBOT)), {@pemit %#=<GM offline>},
    {
      @pemit/list loc(%#)=<A presence stirs as you arrive.>;
      @trigger me/FN_GM_EMIT=room_enter|num(%#)|loc(%#)|[
        strcat(
          "{",
            squote(desc), ":", squote(get(loc(%#)/DESCRIBE)), ",",
            squote(who), ":", squote(setunion(lwho(loc(%#)), "")), ",",
            squote(recent), ":", squote(get(loc(%#)/GM_RECENT))
          "}"
        )
      ]
    }
```

### Response receiver

```mushcode
@@ On the room object — fired by the bridge via @trigger:
&GM_RESPONSE <room>=$+gmresponse *|*:
  @@ %0 = request id (for logging), %1 = narrative text
  @pemit/list loc(%#)=[ansi(hy, %1)]

@@ Rolling recent-events log on each room:
&GM_RECENT <room>=   @@ starts empty; bridge may @set this
```

---

## Phase 5 — Lint & security

Run `/mush-lint` and `/mush-security` in parallel on `src/robot-events.mush` before deploying.

Key checks to verify manually:
- `FN_GM_EMIT` never echoes raw `%0`–`%2` into `@pemit` without the `^GM^` wrapper
- `GM_RESPONSE` trigger escapes `%1` before emitting to room (player-visible output)
- The bridge process reads `ROBOT_PASS` from environment, never hardcoded
- Robot player is locked so only it can `@force` itself

---

## Phase 6 — Tests

Write `@rhost/testkit` tests that:

1. Verify `FN_GM_EMIT` produces valid JSON with the correct sentinel wrapper
2. Verify `GM_RESPONSE` emits formatted output to the room (mock `@pemit/list`)
3. Verify the bridge strips ANSI correctly (unit test in TypeScript)
4. Verify multi-request concurrency doesn't clobber responses (two simultaneous requests with different IDs)

---

## Phase 7 — Security hardening checklist

- [ ] Robot password read from env var, not hardcoded
- [ ] Bridge validates JSON parse before processing (try/catch)
- [ ] `escapeMux()` applied to ALL text going back into MUX from external service
- [ ] Robot player object locked (`@lock AI_GM=AI_GM`)
- [ ] Robot NOT set IMMORTAL (wizard is enough; immortal prevents @destroy safety)
- [ ] Rate limiting on bridge prevents external service from being hammered
- [ ] Response narrative length capped before `@pemit` (MUX output limits apply)
- [ ] Bridge process runs as a non-root OS user with no filesystem write access outside its working dir

---

## Deployment

```bash
# 1. Set up environment
export MUSH_HOST=localhost
export MUSH_PORT=4201
export ROBOT_NAME=AI_GM
export ROBOT_PASS=<robot-password>

# 2. Install softcode
RHOST_PASS=<wiz-pass> node scripts/eval.js < dist/robot-events.installer.txt

# 3. Start the bridge
deno run --allow-net --allow-env robot/bridge.ts

# 4. Verify
# In-game: @trigger #<room>/CMD_GM_ROOM_ENTER=<your dbref>
# Should see: <A presence stirs as you arrive.> then a GM response within ~3s
```

## Reconnection

The bridge should auto-restart on disconnect. Use a simple supervisor:

```bash
while true; do
  deno run --allow-net --allow-env robot/bridge.ts
  echo "[supervisor] bridge exited, restarting in 5s..."
  sleep 5
done
```

Or as a systemd service / PM2 process for production.

---

## Rules

- Never hardcode the robot player's dbref in the bridge — use a config object loaded at startup
- Never log the robot password to stdout/stderr
- The bridge should emit a `^BRIDGE^online:<session-id>^BRIDGE^` marker on connect so the softcode can detect reconnects and flush any pending queues
- All external service responses MUST be sanitized via `escapeMux()` before being sent to TinyMUX — treat AI output as untrusted user input
