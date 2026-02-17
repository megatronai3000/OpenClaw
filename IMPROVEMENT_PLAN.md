# IMPROVEMENT_PLAN.md - Agent Architecture Roadmap

## Source: OpenAI Agentic Primitives Analysis
**Date:** 2026-02-11
**Based on:** OpenAI Skills + Shell + Compaction patterns

---

## Phase 1: Skill Standardization (THIS WEEK) ✅

**Goal:** Explicit routing descriptions for better skill selection

**Action Items:**
- [ ] Update `bluebubbles/SKILL.md` - Add "use when/don't use when"
- [ ] Update `healthcheck/SKILL.md` - Add routing description
- [ ] Update `weather/SKILL.md` - Add negative examples
- [ ] Update `openai-image-gen/SKILL.md` - Add output specifications
- [ ] Update `openai-whisper-api/SKILL.md` - Add edge cases

**Template for each SKILL.md:**
```yaml
---
name: skill-name
description: |
  Use when: [specific trigger conditions]
  Don't use when: [anti-patterns to avoid]
  Outputs: [expected artifacts/files]
  Success criteria: [how to verify it worked]
---
```

---

## Phase 2: Explicit Skill Invocation (SKIP)

**Decision:** Skip this phase
**Reason:** Goes against Claude's auto-routing design
**Alternative:** Improve skill descriptions for better routing

---

## Phase 3: Container/Shell Strategy (DEFER)

**Decision:** Defer to future sprint
**Reason:** 
- High effort (2-3 days)
- File-based coordination works fine currently
- Revisit when scaling to 10+ agents

**Future Implementation:**
```
~/.openclaw/containers/
├── {agent-id}/
│   ├── /workspace/     # Agent-specific files
│   ├── /shared/        # Shared context mount
│   └── /output/        # Artifact output
```

---

## Phase 4: Artifact Handling (THIS WEEK) ✅✅✅

**Priority:** HIGH - Biggest architectural gap

**Implementation:**
```
~/.openclaw/artifacts/
├── {session-id}/
│   ├── outputs/        # Generated files
│   ├── reports/        # Summaries
│   └── temp/           # Working files
└── index.json          # Artifact registry
```

**Benefits:**
- Clean handoff boundary
- Easy retrieval and review
- Audit trail
- Garbage collection

---

## Phase 5: Enhanced Kanban Board (THIS WEEK) ✅✅✅ ✅ COMPLETED

**Revised Approach:** Use existing Kanban infrastructure instead of new "Roadmap" tab

**Status:** ✅ COMPLETED 2026-02-11

**What was built:**
1. ✅ `~/.openclaw/shared-context/kanban/cards.json` - Data structure
2. ✅ API endpoints: `GET /api/kanban/cards`, `PUT /api/kanban/cards/:id`
3. ✅ Enhanced Kanban cards with progress bars, task counts, estimates
4. ✅ Detail view modal with full description, task checklist, move actions
5. ✅ Auto-status updates based on task completion
6. ✅ Drag-and-drop between columns
7. ✅ Improvement plan phases imported as cards (Backlog column)

**Files created/modified:**
- `shared-context/kanban/cards.json` - Card data
- `server.js` - Kanban API endpoints
- `api/client.ts` - API client methods
- `KanbanBoard.tsx` - Enhanced component (completely rewritten)

**Cost:** $0.55 (3.5 hours)

---

## Phase 6: Decision Persistence Fix (CRITICAL) ✅ COMPLETED

**Status:** ✅ COMPLETED 2026-02-11

**Issue:** Decisions weren't persisting to feedback log

**Root Cause:** Path calculation bug in API
- Wrong: `path.join(__dirname, '..', '..', '.openclaw', ...)` 
- Created: `~/.openclaw/.openclaw/shared-context/feedback` (wrong!)

**Fix Applied:**
1. Changed to use `SHARED_CONTEXT_DIR` constant
2. Added `GET /api/decisions` and `GET /api/decisions/:id` endpoints
3. Added `fs.mkdirSync` to create feedback dir if missing
4. Standardized on `decision-log.md` for all decisions

**Verification:**
```bash
curl -X PUT http://localhost:3001/api/decisions/{id} \
  -d '{"status":"approved","decidedBy":"Raleigh"}'
# ✓ Database updated
# ✓ Feedback log written
```

**Cost:** $0.15 (30 min)

---

**Original Plan:**

### Why This is Better
- No new tab needed (less complexity)
- Natural workflow: Backlog → In Progress → Review → Complete
- Kanban already has structure (columns, cards, drag-drop)
- Just needs richer card content + detail modal

### Implementation

**1. Richer Kanban Cards**
```
┌────────────────────────────┐
│ 📋 Phase 1: Skills         │
│ 3/5 tasks complete         │
│ ████░░ 60%                 │
│                            │
│ Megatron • High Priority   │
│ Est: 1hr, $0.25            │
└────────────────────────────┘
```

**Fields to add:**
- Progress bar (% complete)
- Task count (3/5 done)
- Estimated effort & cost
- Priority badge
- Icon/emoji

**2. Detail View Modal (CRITICAL)**
```
┌─────────────────────────────────────────────┐
│ Phase 1: Skill Standardization              │
│ Status: In Progress • Priority: High        │
├─────────────────────────────────────────────┤
│                                             │
│ Description:                                │
│ Add "use when/don't use when" descriptions  │
│ to all SKILL.md files...                    │
│                                             │
│ Tasks (3/5 complete):                       │
│ ☑ Update bluebubbles SKILL.md               │
│ ☑ Update healthcheck SKILL.md               │
│ ☐ Update weather SKILL.md                   │
│                                             │
│ Estimated: 1 hour • $0.25                   │
│ Target: Feb 12 • Assigned: Megatron         │
│                                             │
│ [Edit] [Archive] [Move to →] [Close]        │
└─────────────────────────────────────────────┘
```

**3. Data Structure**
File: `~/.openclaw/shared-context/kanban/cards.json`
```json
{
  "cards": [
    {
      "id": "phase-1-skills",
      "title": "Phase 1: Skill Standardization",
      "status": "in-progress",
      "priority": "high",
      "description": "Add 'use when/don't use when' descriptions...",
      "tasks": [
        {"title": "Update bluebubbles SKILL.md", "done": true},
        {"title": "Update healthcheck SKILL.md", "done": false}
      ],
      "estimate": {"effort": "1 hour", "cost": "$0.25"},
      "assigned": "megatron",
      "createdAt": "2026-02-11"
    }
  ]
}
```

**4. Workflow**
- **Backlog column** = Ideas & planned work
- **In Progress** = Active implementation  
- **Review** = Needs testing/approval
- **Completed** = Done

### Benefits
- ✅ Roadmap is visible (Backlog column)
- ✅ Progress is tracked (In Progress cards)
- ✅ History is preserved (Completed column)
- ✅ No new navigation needed

---

## Phase 5: Network Security (NEXT WEEK)

**Implementation:**
```json
// openclaw.json
{
  "network": {
    "orgAllowlist": [
      "api.openai.com",
      "api.moonshot.ai",
      "api.telegram.org",
      "api.brave.com"
    ],
    "requestAllowlist": {
      "web_search": ["api.brave.com"],
      "default": []
    }
  }
}
```

---

## Phase 6: Long-Run Patterns (DEFER)

**Decision:** Defer until validation complete
**Patterns to implement later:**
- Install → Fetch → Write artifact
- Skill + Shell for repeatable workflows
- Enterprise SOPs as Skills

---

## Phase 7: Compaction Strategy (ONGOING)

**Current:** Relying on OpenClaw's built-in compaction
**Target:** Explicit compaction control for long runs

**Implementation:**
```javascript
// Before long runs
if (sessionTokens > 100000) {
  await compactSession();
}
```

---

## Multi-Model Optimization (NEXT WEEK)

**Current Burn Rate:** ~$45/month
**Target Burn Rate:** ~$15/month (66% savings)

| Task Type | Current Model | New Model | Cost |
|-----------|--------------|-----------|------|
| Heartbeat | Kimi K2.5 | Llama 3.3 70B (free) | $0 |
| Web Search | Kimi K2.5 | GPT-4o-mini | $0.40/M |
| Coding | Kimi K2.5 | Qwen3-Coder (free) | $0 |
| Complex coding | Kimi K2.5 | GPT-4o | $0.01/1K |

**Expected Savings:** ~$165/month at current usage

---

## Priority Order

### TODAY (Critical Fixes)
1. ✅ Fix approval UI reload (DONE)
2. ✅ Fix Kanban Board error (DONE)
3. ✅ Verify feedback log writes (DONE - API already writes)
4. [ ] Fix Decision → Document flow (attachments inline)

### THIS WEEK
5. [ ] Skill standardization (Phase 1)
6. [ ] Artifact directory structure (Phase 4)
7. [ ] Decision → Document linking

### NEXT WEEK
8. [ ] Multi-model optimization
9. [ ] Network security allowlist (Phase 5)
10. [ ] Scale to 3 agents

### FUTURE
11. [ ] Containers (Phase 3) - if needed
12. [ ] Long-run patterns (Phase 6) - if needed

---

## Budget Tracking

| Phase | Est. Cost | Status |
|-------|-----------|--------|
| Critical Fixes | $0.75 | In Progress |
| Skill Standardization | $0.25 | Planned |
| Artifact Handling | $0.10 | Planned |
| Multi-Model | $0.50 | Planned |
| **Total** | **$1.60** | - |

---

*Last Updated: 2026-02-11*
*Next Review: After validation complete*
