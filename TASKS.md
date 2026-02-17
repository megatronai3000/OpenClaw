# TASKS.md - Active & Backlog

## Active (In Progress)

## Backlog (Come Back To)

### Enhance Kanban Board with Detail View
**Priority:** HIGH  
**Added:** 2026-02-11  
**Context:** Improvement plan visibility

**Problem:**
- Improvement plan saved but not visible in dashboard
- Can't track progress on phases
- Easy to forget planned work

**Solution:**
Use existing Kanban infrastructure:
- Backlog column = Ideas & planned work (improvement plan phases)
- In Progress = Active implementation
- Review = Needs testing/approval
- Completed = Done

**Implementation:**
1. Richer Kanban cards (progress bars, task counts, estimates)
2. Detail view modal when clicking cards
3. Data structure: `~/.openclaw/shared-context/kanban/cards.json`
4. Task checklists with progress tracking

**Benefits:**
- No new tab needed
- Natural workflow
- Reuses existing drag-drop
- Makes roadmap actionable

---

### Build Auto-Router Tool for Model Selection
**Priority:** Medium  
**Added:** 2026-02-11  
**Context:** Multi-model architecture (Kimi + Codex) requires intelligent routing

**Problem:**
- Kimi ($0.015/1K) good for 80% of tasks
- Codex ($0.01/1K) better for complex coding but expensive
- Currently manual switching via `/model` command

**Solution:**
Build custom tool/wrapper that:
1. Analyzes task complexity (line count, keywords)
2. Auto-selects model:
   - >100 lines of code → Codex
   - CSS/layout/overflow issues → Codex  
   - Algorithm implementation → Codex
   - Simple edits → Kimi
   - Business logic → Kimi
3. Routes request to selected model
4. Tracks cost per task type
5. Learns from success/failure patterns

**Implementation Notes:**
- OpenClaw doesn't natively support auto-routing
- Requires custom tool or middleware layer
- Could be a wrapper around `sessions_spawn`
- Store routing rules in `shared-context/routing-rules.json`

**Cost Optimization Goal:**
- 80% tasks on Kimi (cheap)
- 20% tasks on Codex (when needed)
- Target: <$3/day with better success rate

---

*Add new tasks at the top of Backlog section*
