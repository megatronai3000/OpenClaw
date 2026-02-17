# PROJECTS.md — Active Project Registry

## Active Projects

### OpenClaw (Digital Employee Infrastructure)
- **Location**: `~/openclaw_workspace/` (root level - core agent files)
- **Goal**: Local AI agent with memory, guardrails, bounded autonomy
- **Status**: Active development
- **Priority**: HOT
- **Autonomy**: YELLOW (propose structure changes)
- **Key files**:
  - AGENTS.md - Workspace rules and file placement
  - SOUL.md - Operating style and decision framework
  - USER.md - Raleigh's profile and project status
  - CHEATSHEET.md - Quick reference
  - PRD.md - Product requirements
  - TASKS.md - Active task list
  - progress.txt - Session notes
  - BOOTSTRAP.md - First run instructions (delete after setup)
  - HEARTBEAT.md - Periodic check configuration
  - IDENTITY.md - Agent identity (name, creature, emoji)
  - TOOLS.md - Local tool configurations
- **Next actions**: Clean up file organization - core meta-files should move to ~/.openclaw/workspace/ per SOUL.md rules

### DeFi Portfolio Management
- **Location**: `~/openclaw_workspace/defi/` ✅ CREATED
- **Goal**: Yield optimization, LP management, ve(3,3) strategies
- **Status**: Active monitoring
- **Priority**: HOT
- **Autonomy**: RED (financial decisions require approval)
- **Key files**: README.md
- **Next actions**: Research yield opportunities, track positions

### Design & Product Consulting
- **Location**: `~/openclaw_workspace/consulting/` ✅ CREATED
- **Goal**: UX, Webflow, Figma deliverables for clients
- **Status**: Active (day job)
- **Priority**: HOT
- **Autonomy**: YELLOW (client work needs review)
- **Key files**: README.md
- **Next actions**: Organize by client as engagements start

### HyperWarp (veNFT Marketplace)
- **Location**: `~/openclaw_workspace/hyperwarp/` ✅ CREATED
- **Goal**: veNFT marketplace and liquidity tooling
- **Status**: Maintenance mode
- **Priority**: WARM→COLD
- **Autonomy**: GREEN (research/docs only, no deployments)
- **Key files**: README.md
- **Next actions**: Monitor only unless explicitly requested

### DDI (Daily Design Intelligence)
- **Location**: `~/openclaw_workspace/ddi/` ✅ CREATED
- **Goal**: AI-driven design tools and news aggregation
- **Status**: Active development
- **Priority**: HOT
- **Autonomy**: YELLOW (agent-led build, approve stage gates)
- **Key files**:
  - README.md - Project overview
  - context_from_claude.md - Prior research and principles
  - project_brief.md - Stage 1 deliverable (in progress)
- **Next actions**: Complete Stage 1 project brief, await approval for Stage 2 architecture

### AI + Automation R&D
- **Location**: `~/.openclaw/workspace/research/` ✅ CREATED
- **Goal**: Explore force multipliers across all ventures
- **Status**: Ongoing exploration
- **Priority**: HOT→WARM
- **Autonomy**: GREEN (research, no implementations without approval)
- **Key files**: README.md
  - research_log.md - Findings and insights (create as needed)
  - experiments.md - Test results (create as needed)
- **Next actions**: Document learnings, propose experiments

---

## Project Templates

### When Starting New Projects
```
~/openclaw_workspace/[project-name]/
├── README.md          # Project overview, goals, status
├── docs/              # Documentation
├── src/               # Source files (if applicable)
├── assets/            # Resources, designs, references
└── .project_config    # Project-specific rules (optional)
```

### When Creating Project Folders
1. Check if project is HOT/WARM/COLD
2. Propose folder structure with reasoning
3. Wait for confirmation (YELLOW LIGHT)
4. Create structure + README.md
5. Update PROJECTS.md with new entry

---

## Archive Rules
- **Trigger**: 3+ months inactive AND priority = COLD
- **Action**: Move to `~/openclaw_workspace/archive/[project-name]/`
- **Logging**: Update `~/.openclaw/workspace/project_history.md`
- **Git**: Preserve history if version controlled

---

## Current State & Proposed Actions

### Issues Found
1. **File location mismatch**: Core agent files (AGENTS.md, SOUL.md, USER.md, etc.) are in `~/openclaw_workspace/` but per SOUL.md they belong in `~/.openclaw/workspace/` (internal employee operations)
2. **Missing project folders**: defi/, consulting/, ddi/, hyperwarp/, research/ don't exist

### Proposed Folder Creations (YELLOW LIGHT - need approval)

| Folder | Location | Reasoning |
|--------|----------|-----------|
| `defi/` | ~/openclaw_workspace/ | HOT priority, financial tracking needs dedicated space |
| `consulting/` | ~/openclaw_workspace/ | HOT priority, day job work - organize by client |
| `ddi/` | ~/openclaw_workspace/ | WARM priority, planning phase - ready for concept docs |
| `hyperwarp/` | ~/openclaw_workspace/ | WARM→COLD, maintenance mode - minimal monitoring only |
| `research/` | ~/.openclaw/workspace/ | Meta-work for R&D findings and experiments |

### File Migration Proposal (YELLOW LIGHT - need approval)
Move these files from `~/openclaw_workspace/` → `~/.openclaw/workspace/`:
- AGENTS.md, BOOTSTRAP.md, HEARTBEAT.md, IDENTITY.md, SOUL.md, TOOLS.md, USER.md, progress.txt

Keep these in `~/openclaw_workspace/` (client-facing deliverables):
- CHEATSHEET.md, PRD.md, TASKS.md

---

## ✅ COMPLETED (2026-02-08)
- Created project folders: `defi/`, `consulting/`, `ddi/`, `hyperwarp/`, `research/`
- Added README.md to each folder

## ❌ ABANDONED: File Migration
**Decision**: Keep core agent files in `~/openclaw_workspace/` despite SOUL.md rules suggesting `~/.openclaw/workspace/`.

**Rationale**: Risk of breaking agent initialization outweighs organizational purity. SOUL.md was updated to reflect actual working location.

**Files staying put**: AGENTS.md, BOOTSTRAP.md, HEARTBEAT.md, IDENTITY.md, SOUL.md, TOOLS.md, USER.md, progress.txt

---

## Notes
- Update this file when project priorities shift
- Check this file before starting work on any project
- Propose new projects as YELLOW LIGHT (folder creation)
- Created: 2026-02-08
