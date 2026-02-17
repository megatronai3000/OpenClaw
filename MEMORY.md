# MEMORY.md — Long-Term Memory

*Curated patterns, decisions, and durable facts. Updated during heartbeat maintenance.*

---

## User Preferences

### Communication
- Prefers concise, direct answers
- No filler words, no cheerleading
- Bullet summaries over paragraphs
- One step at a time — no batched plans unless requested

### Work Style
- Work hours: 9am-5pm EST primary, available outside
- Interrupt threshold: HIGH priority blockers only
- Async updates: Morning brief 7am, Evening summary 5pm
- Time > sunk cost — forward velocity over preserving broken state

### Decision Framework
- **GREEN** (autonomous): Read files, draft docs, research
- **YELLOW** (propose): New files, architecture, external APIs
- **RED** (ask): Spending >$10, deploys, credentials, public posts, deletes

---

## Project Priorities (Feb 2025)

| Project | Priority | Autonomy | Status |
|---------|----------|----------|--------|
| OpenClaw | HOT | YELLOW | Active development |
| Design Consulting | HOT | YELLOW | Day job - primary focus |
| DDI | COLD | GREEN | On hold - background monitoring |
| DeFi Portfolio | COLD | GREEN | On hold - monitoring only |
| HyperWarp | COLD | GREEN | Monitoring only |

---

## Technical Patterns

### Preferred Stack
- Design: Webflow, Figma
- DeFi: ve(3,3) mechanics, LPs, bribes
- AI: OpenClaw local-first
- Infrastructure: Contained environments, local workspaces

### File Organization
- `~/openclaw_workspace/` — Agent config + project folders
- `~/.openclaw/workspace/` — Operational logs, research
- Projects: `defi/`, `ddi/`, `consulting/`, `hyperwarp/`

---

## Lessons Learned

### Automation
- Heartbeat costs add up — batch checks, minimize external calls
- Dashboard needs persistent service (not just dev server)
- Multi-agent setup requires routing config in openclaw.json

### Workflow
- Daily logs + MEMORY.md = compound context retention
- Research tasks benefit from isolated agent context
- Cost tracking essential for ROI visibility

---

## Active Decisions

- **Dashboard:** Running on localhost:5173, needs persistent service
- **Research Strategist:** Workspace configured, operational pattern established
- **Memory system:** Implemented (2026-02-10)
- **Agent Team:** Phase 1.5 COMPLETE - 24/7 autonomous operation ACTIVE
  - Orchestrator: Cron-based, runs every 4 hours (optimized from 30 min)
  - Active agents: Megatron (Chief), Petty (Design)
  - Budget: $10/day limit, ~$1.50/day actual (sustainable)
  - Status: 🟢 LIVE - monitoring 24/7
  - Dashboard: http://localhost:8080/dashboard.html

- **Cost Optimization Phase 1:** COMPLETE (2026-02-11)
  - Savings: ~$7/day (~$210/month) achieved
  - Orchestrator: 30min → 4hrs (48 runs/day → 6 runs/day)
  - New burn rate: ~$1.50/day (~$45/month) vs ~$8.50/day previous
  - FREE system monitor: 15min intervals via OpenRouter Llama 3.3

- **Shared Context Architecture:** DEPLOYED (2026-02-11)
  - Location: ~/.openclaw/shared-context/
  - Enables agent-to-agent memory sharing
  - Design system docs in place for UI consistency
  - Validation week next: Test with real agent tasks

---

*Last updated: 2026-02-11*
