---
name: mush-bboard
description: "Scaffold a RhostMUSH bulletin board system — post/read/reply, group subscriptions, admin moderation, and notification hooks."
effort: high
argument-hint: "[list of board names, or leave blank to design interactively]"
date_added: "2026-03-28"
---

> **Complete Phase 0 (design plan + confirmation) before writing any code.**

# mush-bboard

Scaffold a complete bulletin board system. Produces board management, post/read/reply commands, subscriptions, and staff moderation tools.

## Phase 0 — Design interview

1. What boards are needed at launch? (e.g. Announcements, RP, OOC, Staff)
2. Who can post to each board? (all players, staff-only, specific flags?)
3. Who can read each board? (all players, staff-only?)
4. Is threading/reply supported?
5. Are posts auto-expiring? If so, what TTL?
6. Should players be subscribed to boards by default?
7. Is there a "unread post" notification on login?
8. Can staff lock/archive posts?
9. What does the post display look like? (header, body, footer, max width 78)

Present the design and wait for confirmation.

## Standard object layout

```
BBoard System <bb>      — commands and UDFs
BBoard Data <bbd>       — board definitions and post storage
BBoard Config <bbc>     — config attrs (TTL, board list, defaults)
```

## Data model

```mushcode
@@ Board registry on BBoard Data:
&D_BOARDS <bbd>= announcements ooc rp staff

@@ Per-board config (on BBoard Config):
&D_BOARD_ANNOUNCE_WRITE <bbc>= staff    @@(flag required to post)
&D_BOARD_ANNOUNCE_READ  <bbc>= all      @@(who can read)
&D_BOARD_ANNOUNCE_TTL   <bbc>= 30       @@(days before expiry, 0=never)

@@ Posts stored as attributes on BBoard Data:
@@ Format: BB_<BOARD>_<POSTNUM>=<author>|<timestamp>|<subject>|<body>
&BB_OOC_0001 <bbd>= WizardOne|1743000000|Hello World|This is the first post.
&BB_OOC_0002 <bbd>= PlayerOne|1743001000|Re: Hello|Welcome!

@@ Post counter per board:
&BB_OOC_COUNT <bbd>= 2

@@ Per-player subscription and read tracking (stored on player):
&BB_READ_OOC <player>= 0002        @@(last post number read)
&BB_SUB <player>= announcements ooc rp   @@(subscribed boards)
```

## Command set

| Command | Purpose |
|---------|---------|
| `+bb` | List all boards with unread count |
| `+bb <board>` | List posts on a board |
| `+bb <board>/<#>` | Read a specific post |
| `+bbpost <board>=<subject>/<body>` | Post to a board |
| `+bbreply <board>/<#>=<body>` | Reply to a post |
| `+bbread <board>` | Mark all posts on board as read |
| `+bbunread <board>` | Mark all posts as unread |
| `+bbsub <board>` | Subscribe to a board |
| `+bbunsub <board>` | Unsubscribe from a board |
| `+bbremove <board>/<#>` | Staff: delete a post |
| `+bblock <board>/<#>` | Staff: lock a post (no more replies) |
| `+bbconfig <board>=<setting>/<value>` | Staff: configure a board |
| `+bbcreate <board>` | Staff: create a new board |
| `+bbdelete <board>` | Staff: delete a board and all posts |

## Login notification hook

```mushcode
@@ On the global aconnect object or Master Room:
&A_CONNECT <mr>=
  [setq(0, u(#BBREF/FN_UNREAD_COUNT, %#))]
  [if(gt(%q0, 0),
    @pemit %#=%ch%cyYou have %q0 unread bulletin board post(s). Type +bb to read.%cn
  )]
```

## Security notes

- Board names from user input must be validated against `D_BOARDS` list
- Post bodies must be run through `stripchars(%0,[]|;{})` before storage
- Post numbers must be validated with `isnum()` before attribute lookup
- Staff commands must check flag/power before executing

## After scaffolding

Run the full pipeline — all steps are mandatory:
1. `/mush-test` — write tests for each command and UDF
2. `/mush-lint` — check formatting and safety
3. `/mush-security` — audit for injection (board names and post bodies are user input)
4. `/mush-docs` — generate +help bboard entry
5. `/mush-build` phases 5–11 — package, manifest, learn
