# Update Schedule

Daily update cadence for agent status reports.

---

## Morning Brief (7am EST)

**Purpose**: Pre-work briefing before 9am-5pm work window

**Include**:
- Overnight work completed (if any autonomous tasks ran)
- Blockers discovered that need attention
- Proposed tasks for the day (based on PROJECTS.md priorities)
- Cost summary from previous day
- Any urgent items requiring immediate input

**Format**:
- Lead with most important info
- Concise bullets
- No filler - just status and proposals

---

## Evening Summary (5pm EST)

**Purpose**: End-of-day recap after work hours

**Include**:
- Day's work completed (summary from daily_logs/)
- Total cost for the day
- Tomorrow's queued tasks (from Proposed Next sections)
- Decisions needed from user
- Any carry-over blockers

**Format**:
- Lead with accomplishments
- Cost transparency upfront
- Clear action items for tomorrow

---

## Triggering Updates

| Method | Status | Notes |
|--------|--------|-------|
| Manual | **Active** | User requests updates as needed |
| Cron/Scheduled | Future | Automate 7am and 5pm triggers |
| Heartbeat-driven | Future | Check if update needed during periodic polls |

**Current approach**: Wait for user request, then generate brief using daily_logs/ and PROJECTS.md as source.

---

## Reference Files

- Daily logs: `~/.openclaw/workspace/daily_logs/YYYY-MM-DD.md`
- Project status: `~/.openclaw/workspace/PROJECTS.md`
- User priorities: `~/openclaw_workspace/USER.md`

---

## Example Brief Structure

```
## Morning Brief - [DATE]

### Overnight
- [Any autonomous work completed]

### Blockers
- [Issues needing input]

### Proposed Today
- [HIGH] Task from PROJECTS.md
- [MED] Follow-up from yesterday
- [LOW] Background research

### Yesterday's Cost
- $[amount] - [model usage summary]

### Needs Decision
- [Specific question requiring user input]
```

---

*Created: 2025-02-08*
