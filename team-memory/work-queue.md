# Work Queue
# Pending tasks for autonomous agent team
# Updated by: Megatron and agents

## Status Legend
- [ ] = Pending (ready to assign)
- [~] = In Progress (agent working)
- [x] = Complete
- [!] = Blocked (needs human)

## Budget Status
**Daily Budget:** $10.00  
**Spent Today:** $0.00  
**Remaining:** $10.00  
**Last Updated:** 2026-02-10 23:30 EST

---

## High Priority

- [ ] **Task ID:** dashboard-phase2-deployment  
  **Agent:** megatron  
  **Priority:** HIGH  
  **Type:** feature  
  **Description:** Dashboard Phase 2 Deployment - New Decisions tab and System Health tab added  
  **Context:** ~/openclaw/workspace/megatron-dashboard/src/components/  
  **Estimated Cost:** $0.00  
  **Queued:** 2026-02-11 10:52  
  **Due:** 2026-02-11 12:00  
  **Note:** TEST DECISION for approval workflow


- [ ] **Task ID:** ddi-design-review  
  **Agent:** petty  
  **Priority:** HIGH  
  **Type:** Design critique  
  **Description:** Review DDI project brief and provide design feedback on MVP approach  
  **Context:** ~/openclaw_workspace/ddi/project_brief.md  
  **Estimated Cost:** $0.02  
  **Queued:** 2026-02-10 23:15  
  **Due:** 2026-02-11 09:00


- [x] **Task ID:** agent-team-landing-page  
  **Agent:** petty  
  **Priority:** HIGH  
  **Type:** Design  
  **Description:** Design simple landing page for agent team (for internal use)  
  **Context:** Show team structure: Megatron (Chief), Petty (Design), Scout (Research)  
  **Estimated Cost:** $0.03  
  **Actual Cost:** $0.02  
  **Queued:** 2026-02-10 23:30  
  **Completed:** 2026-02-10 23:48  
  **Due:** 2026-02-11 12:00  
  **Deliverable:** ~/openclaw_workspace/team-memory/agents/landing-page-design.md


---

## Medium Priority

- [ ] **Task ID:** enhance-kanban-board
  **Agent:** megatron
  **Priority:** HIGH
  **Type:** Development
  **Description:** Enhance Kanban Board with progress bars, task checklists, and detail view modal. Use Backlog column for roadmap/ideas. Add cards.json data structure. Enables tracking improvement plan progress.
  **Context:** ~/openclaw/workspace/megatron-dashboard/src/components/KanbanBoard.tsx
  **Estimated Cost:** $0.50
  **Queued:** 2026-02-11 22:50
  **Due:** 2026-02-12

- [ ] **Task ID:** codex-auto-router-2026-02-11
  **Agent:** megatron
  **Priority:** MEDIUM
  **Type:** tool
  **Description:** Build Auto-Router Tool: Intelligent model selection (Kimi vs Codex) based on task complexity. Routes simple tasks to Kimi ($0.015/1K), complex coding to Codex ($0.01/1K). Target: 80/20 split, <$3/day.


- [x] **Task ID:** dashboard-phase2-3  
  **Agent:** megatron  
  **Priority:** MEDIUM  
  **Type:** Development  
  **Description:** Build Dashboard Phase 2 + 3 features (Project Health, Decisions Queue, System Health)  
  **Context:** ~/openclaw/workspace/megatron-dashboard/  
  **Estimated Cost:** $0.50  
  **Actual Cost:** $0.50  
  **Queued:** 2026-02-11 07:42  
  **Completed:** 2026-02-11 10:42  
  **Deliverable:** 4 new components + shared context architecture

- [x] **Task ID:** shared-context-deployment  
  **Agent:** megatron  
  **Priority:** MEDIUM  
  **Type:** Architecture  
  **Description:** Deploy shared brain architecture for agent coordination  
  **Context:** ~/.openclaw/shared-context/  
  **Estimated Cost:** $0.10  
  **Actual Cost:** $0.05  
  **Queued:** 2026-02-11 10:37  
  **Completed:** 2026-02-11 10:42  
  **Deliverable:** Directory structure, SOUL.md updates, design system docs

- [ ] **Task ID:** scout-recruit-brief  
  **Agent:** megatron  
  **Priority:** MEDIUM  
  **Type:** Architecture  
  **Description:** Write recruitment brief for Scout (Research Lead) - SOUL.md template  
  **Context:** Follow Petty's SOUL.md format, analytical personality  
  **Estimated Cost:** $0.02  
  **Queued:** 2026-02-10 23:30  
  **Due:** 2026-02-11 18:00

- [x] **Task ID:** cost-analysis-weekly  
  **Agent:** megatron  
  **Priority:** MEDIUM  
  **Type:** Analysis  
  **Description:** Review this week's agent costs, project burn rate  
  **Context:** Check team-memory/budget-tracker.md  
  **Estimated Cost:** $0.01  
  **Actual Cost:** $0.01  
  **Queued:** 2026-02-11 09:00  
  **Completed:** 2026-02-11 07:01  
  **Result:** Monthly total: $13.39, on track

---

## Low Priority / Backlog

- [ ] **Task ID:** memory-system-design  
  **Agent:** architect (when recruited)  
  **Priority:** LOW  
  **Type:** Architecture  
  **Description:** Design proper session-to-session memory system  
  **Context:** Current file-based memory is temporary hack  
  **Estimated Cost:** $0.05  
  **Queued:** TBD  
  **Due:** TBD

- [ ] **Task ID:** relationship-dashboard  
  **Agent:** petty  
  **Priority:** LOW  
  **Type:** Design  
  **Description:** Visualize agent relationship scores over time  
  **Context:** Use data from team database  
  **Estimated Cost:** $0.03  
  **Queued:** TBD  
  **Due:** TBD

---

## Recently Completed

- [x] **Task ID:** phase1-infrastructure  
  **Agent:** megatron  
  **Completed:** 2026-02-10 23:00  
  **Cost:** $0.15  
  **Result:** Message bus, agent registry, Petty created

- [x] **Task ID:** petty-ddi-review  
  **Agent:** petty  
  **Completed:** 2026-02-10 23:15  
  **Cost:** $0.01  
  **Result:** 7/10 confidence, 3 specific design recommendations

---

## How This Works

1. **Orchestrator runs every 30 min** (via cron)
2. **Megatron reads this file** and spawns appropriate agents
3. **Agents update status** as they work (~ → x)
4. **Costs logged** in budget-tracker.md
5. **Humans can add tasks** anytime - just append to queue

## Adding New Tasks

Copy this template:
```markdown
- [ ] **Task ID:** [unique-id]
  **Agent:** [agent-name]
  **Priority:** [HIGH/MEDIUM/LOW]
  **Type:** [Design/Research/Code/Analysis]
  **Description:** [what needs to be done]
  **Context:** [relevant files/links]
  **Estimated Cost:** $0.0X
  **Queued:** [YYYY-MM-DD HH:MM]
  **Due:** [YYYY-MM-DD HH:MM]
```
