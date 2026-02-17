# How the System Works

**Reference Guide for Daily Operations**

---

## Overview

This is your autonomous AI coordination system. Agents work 24/7, you review and decide.

**Core Loop:**
1. You add work to Kanban
2. Orchestrator assigns to agents
3. Agents execute autonomously
4. Decisions appear for your approval
5. You review, approve, repeat

---

## Morning Routine (8:00 AM)

### Step 1: Check Dashboard
Open http://localhost:5173 → Dashboard tab

**What you see:**
- System: ✅ Operational
- Agents: 2/2 active
- Completed overnight: 3 tasks
- Decisions pending: 2
- Budget: $2.50 spent overnight, $5.50 remaining

**Time:** 30 seconds

### Step 2: Review Decisions
Click **Decisions** tab

**What you see:**
- 2 decisions from overnight work
- Each shows: title, agent, deliverables

**Actions:**
1. Click first decision → Modal opens
2. Review deliverables (artifacts linked)
3. Click "View Strategy Doc" → Read in modal
4. Click **Approve** → Feedback logged
5. Repeat for second decision

**Time:** 3-5 minutes

### Step 3: Check Daily Reports
Click **Daily Reports** tab

**What you see:**
- Yesterday's synthesis
- Social media post (copy/paste to Twitter)
- Cost breakdown by agent
- Work completed summary

**Actions:**
- Read synthesis
- Copy social post to Twitter/LinkedIn if desired
- Review costs

**Time:** 2-3 minutes

### Step 4: Check Agent Outputs
Click **Agent Outputs** tab

**What you see:**
- 3 new files from overnight
- Grouped by agent
- Download links

**Actions:**
- Download anything needed
- Review outputs

**Time:** 2-3 minutes

### Total Morning Time: 10 minutes

---

## Adding New Work

### Go to Kanban Board

**Path:** http://localhost:5173 → Kanban Board

**Action:**
1. Click **"+ Add Card"** in Backlog column
2. Fill in:
   - **Title:** "Design landing page for new feature"
   - **Priority:** High
   - **Agent:** Petty (or leave blank for auto-routing)
   - **Description:** Full brief
   - **Tasks:** List subtasks
3. Click **Save**

**Result:** Card appears in Backlog

---

## Autonomous Execution (Happens Automatically)

### 10:00 AM — Next Orchestrator Cycle

System runs without you:

**Orchestrator wakes up** (every 30 min):
```
1. Reads Kanban backlog
2. Finds "Design landing page" (high priority)
3. Checks budget: $5.50 remaining ✅
4. Assigns to Petty (design task)
5. Moves card to "In Progress"
```

**Petty executes autonomously:**
```
1. Reads task from Kanban
2. Creates design strategy
3. Writes to: artifacts/outputs/landing-page-design.md
4. Creates decision file
5. Updates Kanban: 50% → 100%
6. Moves card to "Review"
```

**Result:**
- Decision appears in your Decisions tab
- Card shows in "Review" column
- Output files ready

---

## Afternoon Check-In (2:00 PM)

### Return to Dashboard

**What you see:**
- Dashboard shows: "New decision pending: Landing Page Design"
- Kanban shows: 1 task in Review

**Actions:**
1. Click **Decisions** → Review
2. Review design deliverables
3. Click **Approve**
4. Feedback logged → Petty learns

**Orchestrator immediately:**
- Picks next task from backlog
- Assigns to appropriate agent
- Cycle continues

**Time:** 2-3 minutes

---

## Evening (6:00 PM)

### You Step Away, System Continues

**5:00 PM — Daily synthesis runs:**
- Summarizes day's work
- Generates social media post
- Tracks costs
- Identifies blockers

**Orchestrator every 30 min:**
- Picks tasks from backlog
- Assigns to agents
- Agents execute
- Creates decisions

**You sleep, agents work.**

---

## Next Morning (8:00 AM)

### Wake Up To

- 4-5 completed tasks
- Pending decisions ready for review
- Daily report summarizing everything
- New outputs in artifacts

**Your action:** Review, approve, repeat.

---

## Key Principles

### 1. You Decide, Agents Execute
- You: Set priorities, approve work, provide feedback
- Agents: Do the work, track progress, learn from feedback

### 2. Kanban is Source of Truth
- Backlog = Work to do
- In Progress = Agent working
- Review = Waiting for your approval
- Completed = Done

### 3. Decisions are Quality Gates
- Every major output needs approval
- Your feedback trains agents
- Approval → Agent learns what works

### 4. Budget Protects You
- Daily limit: $10
- Orchestrator skips if over $7
- You control spending

### 5. Artifacts are Permanent
- All outputs in `~/.openclaw/artifacts/outputs/`
- Decisions in `shared-context/decisions/`
- Full audit trail

---

## Emergency Overrides

### Stop Everything
```bash
# Disable orchestrator
crontab -e
# Comment out orchestrator line
```

### Check Current Activity
```bash
# See what's in progress
cat ~/.openclaw/shared-context/current-work.md

# See Kanban status
cat ~/.openclaw/shared-context/kanban/cards.json | jq '.[] | select(.status == "in-progress")'
```

### Manual Task Assignment
```bash
# Directly assign task
echo "# Current Work
**Agent:** megatron
**Task:** [Your task here]
" > ~/.openclaw/shared-context/current-work.md
```

---

## Success Metrics

After 2 weeks of this workflow:
- ✅ Morning review takes < 10 minutes
- ✅ Agents complete 3-5 tasks overnight
- ✅ You approve 90%+ of decisions
- ✅ Costs stay under $10/day
- ✅ System runs without intervention

---

## Troubleshooting

### No decisions appearing
- Check Kanban has high-priority backlog items
- Verify orchestrator running: `ps aux | grep orchestrator`
- Check budget not exceeded

### Agent not executing
- Check `current-work.md` has agent assignment
- Verify agent SOUL.md has execution template
- Check logs: `~/.openclaw/logs/orchestrator.log`

### Costs too high
- Review Kanban priorities (high = expensive)
- Check Cost Analytics tab
- Adjust daily budget limit if needed

---

*Last updated: 2026-02-12*
*System version: Option A - Semi-Autonomous*
