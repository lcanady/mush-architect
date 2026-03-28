---
name: mush-jobs
description: "Scaffold a RhostMUSH job/request tracking system — players submit requests, staff claim and resolve them, with queuing, priority, and notification."
effort: high
argument-hint: "[list of job types, or leave blank to design interactively]"
date_added: "2026-03-28"
---

> **Complete Phase 0 (design plan + confirmation) before writing any code.**

# mush-jobs

Scaffold a complete job/request system. Produces job submission, staff claim/resolve workflow, priority queuing, and notifications.

## Phase 0 — Design interview

1. What job types are needed? (e.g. Request, Bug, Typo, Build, Plot, Chargen)
2. Who can submit jobs? (all players, approved only, staff only?)
3. Who can view jobs? (submitter + staff? all staff? only assigned staff?)
4. What priority levels exist? (e.g. Low/Normal/High/Critical)
5. Is there job assignment (staff claims a job)?
6. Can players add comments after submitting?
7. Are there notifications? (on submit, claim, resolve — to player? to staff?)
8. Are closed jobs archived or deleted?
9. What does a job display look like? (header, fields, comments, 78 char wide)
10. Is there a staff-only job type?

Present the design and wait for confirmation.

## Standard object layout

```
Jobs System <jobs>      — commands and UDFs
Jobs Data <jbd>         — job storage
Jobs Config <jbc>       — config attrs (types, statuses, priorities)
```

## Data model

```mushcode
@@ Job storage on Jobs Data:
@@ Format: JOB_<NUM>=<submitter>|<timestamp>|<type>|<priority>|<status>|<subject>|<body>
&JOB_0001 <jbd>= PlayerOne|1743000000|Request|Normal|Open|Need help|Please help me with X.
&JOB_0002 <jbd>= PlayerTwo|1743001000|Bug|High|Claimed|Broken exit|North exit from room #123 is broken.

@@ Job counter:
&JOB_COUNT <jbd>= 2

@@ Per-job comments:
@@ JOB_COMMENT_<NUM>_<SEQ>=<author>|<timestamp>|<body>
&JOB_COMMENT_0001_01 <jbd>= StaffOne|1743002000|Looking into this now.

@@ Per-job assignment:
&JOB_ASSIGN_0001 <jbd>= StaffOne

@@ Config:
&D_JOB_TYPES <jbc>= Request Bug Typo Build Plot
&D_JOB_PRIORITIES <jbc>= Low Normal High Critical
&D_JOB_STATUSES <jbc>= Open Claimed Resolved Closed
&D_STAFF_FLAG <jbc>= STAFF
```

## Command set

| Command | Purpose |
|---------|---------|
| `+job/submit <type>=<subject>/<body>` | Submit a new job |
| `+job/list` | List your open jobs |
| `+job/read <#>` | Read a specific job |
| `+job/comment <#>=<comment>` | Add a comment to a job |
| `+job/cancel <#>` | Cancel your own job |
| `+jobs` | Staff: list all open/claimed jobs |
| `+job/claim <#>` | Staff: claim a job |
| `+job/unclaim <#>` | Staff: release a claimed job |
| `+job/resolve <#>=<resolution>` | Staff: mark job resolved |
| `+job/close <#>` | Staff: close a resolved job |
| `+job/priority <#>=<level>` | Staff: set priority |
| `+job/assign <#>=<staff>` | Staff: assign to specific staff member |
| `+job/delete <#>` | Staff: delete a job |
| `+job/all` | Staff: list all jobs including closed |

## Notification pattern

```mushcode
@@ Notify staff on new submission:
&FN_NOTIFY_STAFF <jobs>=
  [iter(search(flag=STAFF type=PLAYER),
    [pemit(##, %ch%cy[JOB #%0] New %1 submitted by %2: %3%cn)]
  )]

@@ Notify player on resolution:
&FN_NOTIFY_PLAYER <jobs>=
  [pemit(%0, %ch%cgYour job #%1 has been resolved by %2.%cn)]
  [if(isconnected(%0),,
    @@(store offline notification)
    [setattr(%0, JOB_NOTIFY, get(%0/JOB_NOTIFY) %1)]
  )]
```

## Login notification hook

```mushcode
@@ On aconnect or Master Room:
&A_CONNECT <mr>=
  [setq(0, u(#JOBSREF/FN_PENDING_JOBS, %#))]
  [if(gt(%q0, 0),
    @pemit %#=%ch%cyYou have %q0 open job(s). Type +job/list to view.%cn
  )]
```

## Security notes

- Job numbers must be validated with `isnum()` before attribute lookup
- Job bodies must be sanitized with `stripchars(%0,[]|;{})` before storage
- Staff commands must check flag/power before executing
- Players may only read/comment their own jobs (unless staff)
- Priority and assignment changes are staff-only

## After scaffolding

Run the full pipeline — all steps are mandatory:
1. `/mush-test` — write tests for each command and UDF
2. `/mush-lint` — check formatting and safety
3. `/mush-security` — audit for injection (job numbers and bodies are user input)
4. `/mush-docs` — generate +help jobs entry
5. `/mush-build` phases 5–11 — package, manifest, learn
