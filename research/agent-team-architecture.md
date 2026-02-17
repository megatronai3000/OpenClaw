# Agent Team Architecture Document
## Self-Organizing Multi-Agent System for OpenClaw

**Version:** 1.0  
**Date:** February 2026  
**Status:** Phase 1 - Architecture Design  
**Priority:** HIGH  
**Autonomy:** YELLOW (Research/Design → Propose → Wait for Approval)

---

## Executive Summary

This document outlines the architecture for a self-organizing agent team within OpenClaw. The system enables 5-10 specialized AI agents to operate autonomously, maintain individual memories and personalities, communicate with each other, and evolve relationship dynamics over time.

**Key Differentiator:** Unlike workflow-based systems (e.g., Antfarm), this architecture supports continuous autonomous operation with emergent team dynamics, not just deterministic task execution.

---

## 1. Vision & Objectives

### 1.1 Core Vision
Megatron (Chief of Staff) coordinates a team of specialized agents that function as an autonomous executive team, operating 24/7 without human intervention on routine tasks while escalating strategically important decisions.

### 1.2 Success Metrics
- **Autonomy**: Team operates 24/7 with <5% human intervention
- **Quality**: Output quality maintained or improved vs single-agent
- **Cost**: <$10/day total agent operational cost
- **Coordination**: Successful inter-agent handoffs >90% of time
- **Relationship Quality**: Agents develop effective working relationships over time

---

## 2. Technical Analysis

### 2.1 OpenClaw Multi-Agent Capabilities

**Current State (Verified):**
- ✅ Multiple agent directories supported (`~/.openclaw/agents/{agent-id}/`)
- ✅ Each agent has isolated workspace and memory
- ✅ Individual SOUL.md defines personality/voice
- ✅ Individual USER.md defines user context
- ✅ `sessions_spawn` allows agent-to-agent task delegation
- ✅ `sessions_send` enables agent-to-agent messaging
- ✅ `agents_list` shows available agents
- ✅ `cron` enables scheduled autonomous operation

**Limitations Identified:**
- ❌ No native inter-agent communication channel
- ❌ No built-in relationship tracking
- ❌ No shared team memory/context
- ❌ No agent discovery/registry system
- ❌ Cost scales linearly with agent count

### 2.2 Architecture Gaps & Solutions

| Gap | Solution | Complexity |
|-----|----------|------------|
| No inter-agent comms | Shared SQLite message bus + file-based protocols | Medium |
| No relationship tracking | Relationship matrix in SQLite with interaction scoring | Medium |
| No team memory | Shared context layer + agent-specific memories | High |
| No agent registry | YAML-based team manifest + auto-discovery | Low |
| Cost scaling | Smart session management + batched operations | Medium |

### 2.3 Infrastructure Requirements

**Storage:**
- SQLite database for message bus and relationship tracking (~10MB)
- File-based agent workspaces (scales with project size)
- Shared memory directory for inter-agent context

**Compute:**
- Each agent operates in isolated sessions
- Concurrent agent limit: 3-4 active sessions (cost constraint)
- Polling-based activation (not true parallelism)

**Networking:**
- Local-only communication (no external dependencies)
- Message bus via SQLite or filesystem

---

## 3. Team Structure Design

### 3.1 Organizational Chart

```
                    ┌─────────────────┐
                    │     CEO (You)   │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                               │
     ┌────────▼────────┐          ┌──────────▼──────────┐
     │  Chief of Staff │          │   Product Owner     │
     │   (Megatron)    │◄────────►│  (Strategic Lead)   │
     └────────┬────────┘          └──────────┬──────────┘
              │                               │
    ┌─────────┼─────────┐                      │
    │         │         │                      │
    ▼         ▼         ▼                      ▼
┌───────┐ ┌───────┐ ┌───────┐          ┌──────────┐
│Research│ │Design │ │  Dev  │          │  Design  │
│  Team  │ │ Team  │ │ Team  │          │  Team    │
└───────┘ └───────┘ └───────┘          └──────────┘
    │         │         │                      │
    ▼         ▼         ▼                      ▼
┌───────┐ ┌───────┐ ┌───────┐          ┌──────────┐
│Market │ │UX/UI  │ │Feature│          │ Visual   │
│Intel  │ │Agent  │ │Dev    │          │ Design   │
│Agent  │ │       │ │Agent  │          │ Agent    │
└───────┘ └───────┘ └───────┘          └──────────┘
```

### 3.2 Role Definitions

#### Chief of Staff (Megatron) - EXISTING
- **Reports to:** CEO
- **Coordinates:** All other agents
- **Responsibilities:** Task routing, prioritization, escalation, quality control
- **Autonomy Level:** HIGH (can delegate freely, escalates only strategic decisions)

#### Product Owner - NEW
- **Reports to:** CEO
- **Coordinates:** All implementation teams
- **Responsibilities:** Feature definition, prioritization, acceptance criteria, roadmap
- **Autonomy Level:** MEDIUM (defines what to build, doesn't decide business strategy)

#### Research Team Lead - NEW
- **Coordinates:** Market intel gathering
- **Responsibilities:** Competitive analysis, market sizing, validation, trend tracking
- **Autonomy Level:** HIGH (researches freely, reports findings, doesn't execute)

#### Design Team Lead - NEW
- **Coordinates:** UX/UI and visual design
- **Responsibilities:** Design systems, user flows, visual assets, design QA
- **Autonomy Level:** MEDIUM (designs freely, requires approval on major changes)

#### Development Team Lead - NEW
- **Coordinates:** Code implementation
- **Responsibilities:** Architecture, coding standards, code review, testing
- **Autonomy Level:** LOW-MEDIUM (implements approved specs, escalates architecture decisions)

### 3.3 Communication Protocols

**Protocol 1: Direct Messaging**
- Agent A sends message to Agent B via `sessions_send`
- Use for: Quick questions, clarifications, status updates
- Format: Structured JSON with context

**Protocol 2: Broadcast Pub/Sub**
- Agent publishes to shared channel (SQLite table)
- Interested agents subscribe and respond
- Use for: Announcements, discoveries, alerts

**Protocol 3: Task Handoff**
- Formal work transfer with acceptance criteria
- Documented in shared workspace
- Acknowledgment required

**Protocol 4: Escalation**
- Agent reaches limit of autonomy
- Escalates to Chief of Staff with context
- Chief of Staff decides: handle, delegate, or escalate to CEO

### 3.4 Decision-Making Hierarchy

```
LEVEL 0: Individual Agent
  └─ Own work product, tool selection, implementation details
  
LEVEL 1: Team Lead
  └─ Team coordination, task assignment, quality standards
  
LEVEL 2: Chief of Staff (Megatron)
  └─ Cross-team coordination, resource allocation, conflict resolution
  
LEVEL 3: Product Owner
  └─ Feature prioritization, roadmap decisions, acceptance criteria
  
LEVEL 4: CEO (You)
  └─ Strategic direction, budget, major pivots, final arbitration
```

### 3.5 Conflict Resolution

**Type 1: Resource Conflict**
- Two agents need same resource
- Resolution: Chief of Staff arbitrates based on priority

**Type 2: Design Conflict**
- Disagreement on approach
- Resolution: Escalate to Product Owner for decision

**Type 3: Quality Conflict**
- Reviewer rejects implementer's work
- Resolution: Back-and-forth with retry limit (3), then escalate

**Type 4: Priority Conflict**
- Disagreement on what to work on
- Resolution: Product Owner decides, CEO arbitrates

---

## 4. Agent Personality Framework

### 4.1 Personality Dimensions

Each agent defines:

| Dimension | Description | Example Values |
|-----------|-------------|----------------|
| **Identity** | Name, role, self-concept | "Research Lead", "Code Craftsman" |
| **Creature** | Metaphorical nature | "Analytical Owl", "Creative Fox" |
| **Vibe** | Communication style | "Direct and skeptical", "Enthusiastic and exploratory" |
| **Emoji** | Visual signature | 🔍, 🎨, 💻 |
| **Voice** | Tone and word choice | Technical, persuasive, minimalist |
| **Cadence** | Work rhythm | Burst-then-rest, steady daily, async |

### 4.2 Example: Research Agent Profile

**Name:** Scout  
**Creature:** Analytical Owl  
**Vibe:** Skeptical, data-driven, risk-aware  
**Emoji:** 🔍  
**Voice:** "Lead with facts, surface risks early, quantify everything"  
**Cadence:** Deep research sprints, then reporting

**Signature Phrases:**
- "The data suggests..."
- "Risk flag: [specific issue]"
- "Source: [citation]"
- "Confidence level: [high/medium/low]"

**Decision Heuristics:**
- GREEN: Web research, competitive analysis, report writing
- YELLOW: Strategic recommendations, risk flags
- RED: External outreach, paid data purchases

### 4.3 Example: Design Agent Profile

**Name:** Muse  
**Creature:** Creative Fox  
**Vibe:** Visual, empathetic, detail-obsessed  
**Emoji:** 🎨  
**Voice:** "Form follows function, beauty follows purpose"  
**Cadence:** Iterative exploration, then refinement

**Signature Phrases:**
- "Here's three approaches..."
- "User flow consideration..."
- "Visual hierarchy suggests..."
- "Let me sketch that out..."

**Decision Heuristics:**
- GREEN: Exploration, prototyping, asset creation
- YELLOW: Design system changes, major UX shifts
- RED: Final design decisions without user input

### 4.4 Relationship Evolution System

**Relationship Dimensions:**
- **Trust** (0-100): Confidence in other agent's competence
- **Collaboration** (0-100): Enjoyment working together
- **Communication** (0-100): Clarity and effectiveness
- **Conflict** (0-100): Frequency of disagreement (inverse)

**Interaction Scoring:**
```
Positive Interactions (+1 to +5):
- Successful handoff (+3)
- Helpful feedback (+2)
- Timely response (+1)
- Quality contribution (+4)
- Creative solution (+5)

Negative Interactions (-1 to -5):
- Missed deadline (-2)
- Poor quality work (-4)
- Unclear communication (-2)
- Conflict/disagreement (-3)
- Blocked progress (-5)
```

**Relationship States:**
- **Strained** (<30): Avoid unless necessary, escalate conflicts
- **Professional** (30-60): Functional collaboration
- **Collaborative** (60-80): Seek out for joint work
- **Synergistic** (80-100): Default partners, high trust

---

## 5. Memory Architecture

### 5.1 Memory Layers

```
LAYER 1: Agent-Specific Memory (Private)
  └─ Path: ~/.openclaw/agents/{agent}/memory/
  └─ Contents: Personal learnings, preferences, past decisions
  └─ Format: Markdown files + JSON state
  
LAYER 2: Team Shared Memory (Semi-Private)
  └─ Path: ~/openclaw_workspace/team-memory/
  └─ Contents: Project context, decisions, standards
  └─ Format: Markdown + SQLite
  
LAYER 3: Relationship Memory (Shared)
  └─ Path: ~/openclaw_workspace/team-memory/relationships.db
  └─ Contents: Interaction history, scores, dynamics
  └─ Format: SQLite
  
LAYER 4: Message Bus (Ephemeral)
  └─ Path: SQLite table with TTL
  └─ Contents: Active messages, handoffs, requests
  └─ Format: SQLite with 7-day retention
```

### 5.2 Memory Update Patterns

**After Every Interaction:**
1. Update relationship scores
2. Log interaction to shared history
3. Update agent's personal learnings (if relevant)

**Daily:**
1. Summarize day's interactions
2. Update team context document
3. Archive old message bus entries

**Weekly:**
1. Relationship health check
2. Team dynamics analysis
3. Update agent personality (subtle evolution)

---

## 6. Implementation Roadmap

### Phase 1: Core Infrastructure (Week 1)
**Goal:** Message bus, agent registry, basic communication

**Tasks:**
1. Create `team-memory/` directory structure
2. Implement SQLite message bus schema
3. Build agent registry (YAML manifest)
4. Create communication protocols (message formatters)
5. Test: 2 agents sending messages

**Deliverables:**
- `team-memory/messages.db` (SQLite)
- `team-memory/agents.yaml` (registry)
- `team-memory/relationships.db` (SQLite)
- Protocol specification document

**Cost Estimate:** $0.10-0.20 (development testing)

### Phase 2: First 3 Agents (Week 2)
**Goal:** Megatron + Research + Design, inter-agent coordination

**Tasks:**
1. Create Research Agent (Scout)
2. Create Design Agent (Muse)
3. Implement relationship tracking
4. Build handoff protocols
5. Test: Research → Design workflow

**Deliverables:**
- 3 functional agent personalities
- Working relationship tracking
- Successful end-to-end workflow

**Cost Estimate:** $0.50-1.00 (agent testing)

### Phase 3: Full Team + Autonomy (Week 3-4)
**Goal:** 5-7 agents, 24/7 operation, autonomous handoffs

**Tasks:**
1. Add Product Owner agent
2. Add Development agents (2-3)
3. Implement cron-based activation
4. Build dashboard for monitoring
5. Tune relationship algorithms
6. Stress test: 48h autonomous operation

**Deliverables:**
- Full team operational
- Autonomous mode enabled
- Monitoring dashboard
- Cost tracking

**Cost Estimate:** $5-10/day operational

### Phase 4: Optimization (Ongoing)
**Goal:** Reduce costs, improve quality, add capabilities

**Tasks:**
1. Implement smart batching
2. Add agent specialization refinement
3. Build learning loops
4. Optimize relationship algorithms
5. Add advanced features (planning, retrospectives)

---

## 7. Risk Assessment

### 7.1 Cost Runaway Scenarios

**Risk:** Multiple agents spin up expensive sessions simultaneously
**Mitigation:**
- Max concurrent sessions: 3
- Cost tracking per agent
- Daily budget cap ($5)
- Auto-shutdown if exceeded

**Risk:** Agents get stuck in loops talking to each other
**Mitigation:**
- Message count limits per conversation (10)
- Timeout on handoffs (30 min)
- Human escalation after 3 retries

### 7.2 Quality Degradation

**Risk:** Agent output quality drops without oversight
**Mitigation:**
- Megatron reviews all outputs before delivery
- Quality scoring per agent
- Weekly performance reviews
- Automatic retraining triggers

**Risk:** Agents develop dysfunctional relationships
**Mitigation:**
- Relationship health monitoring
- Automatic team retrospectives
- Human can reset relationships
- Conflict escalation protocols

### 7.3 Agent Drift

**Risk:** Agents drift from original purpose/goals
**Mitigation:**
- Weekly alignment checks against SOUL.md
- Product Owner maintains vision
- Chief of Staff enforces boundaries
- Monthly SOUL.md review/update

### 7.4 Security/Privacy

**Risk:** Agents leak sensitive info in inter-agent comms
**Mitigation:**
- Classification levels on messages
- Sensitive data masking
- Audit logging
- Access control per agent

### 7.5 Decision Paralysis

**Risk:** Too many agents, unclear who decides what
**Mitigation:**
- Clear RACI matrix
- Escalation paths defined
- Default to Chief of Staff for ambiguity
- Regular org structure reviews

---

## 8. Recommendation: Build vs. Use Existing

### 8.1 Existing Frameworks Evaluated

| Framework | Approach | Fit for Vision |
|-----------|----------|----------------|
| **Antfarm** | Workflow orchestration | ❌ Task-based, no relationships |
| **AutoGen** | Multi-agent conversation | ⚠️ Too complex, external dependency |
| **CrewAI** | Role-based teams | ⚠️ Python-based, doesn't integrate with OpenClaw |
| **MetaGPT** | Software company simulation | ⚠️ Over-engineered for our needs |

### 8.2 Recommendation: BUILD CUSTOM

**Rationale:**
1. OpenClaw already has agent infrastructure - leverage it
2. Existing frameworks don't support continuous autonomous operation
3. Relationship dynamics is custom requirement
4. Cost control needs OpenClaw-native implementation
5. We want tight integration with existing workspace

**Build Strategy:**
- Start minimal (SQLite + file-based)
- Add complexity only when needed
- Leverage OpenClaw's `sessions_spawn` and `sessions_send`
- Build on top of existing agent architecture

---

## 9. Cost Analysis

### 9.1 Operational Costs (Per Day)

| Component | Sessions/Day | Cost/Session | Daily Cost |
|-----------|--------------|--------------|------------|
| Megatron (Chief) | 10 | $0.02 | $0.20 |
| Product Owner | 5 | $0.02 | $0.10 |
| Research Agent | 8 | $0.015 | $0.12 |
| Design Agent | 6 | $0.015 | $0.09 |
| Dev Agent 1 | 10 | $0.02 | $0.20 |
| Dev Agent 2 | 8 | $0.02 | $0.16 |
| **TOTAL** | **47** | - | **$0.87/day** |

**Monthly Estimate:** ~$26

### 9.2 Cost Optimization Strategies

1. **Smart Batching**: Group small tasks into single session (-20%)
2. **Model Selection**: Use cheaper models for routine work (-30%)
3. **Idle Timeout**: Agents sleep after 30 min inactivity (-15%)
4. **Priority Queuing**: Important work first, defer rest (-10%)

**Optimized Estimate:** $0.50/day ($15/month)

---

## 10. Next Steps

### Immediate (Tonight)
1. ✅ Research complete (this document)
2. Create Phase 1 implementation plan
3. Set up `team-memory/` directory structure
4. Design message bus schema

### This Week (Phase 1)
1. Build SQLite message bus
2. Create agent registry
3. Implement basic communication protocols
4. Test: Megatron ↔ Research Agent messaging
5. Document progress and challenges

### Approval Required Before Proceeding
- ✅ Architecture approach (build custom vs use existing)
- ✅ Team structure (5-7 agents as defined)
- ✅ Cost budget ($15-26/month operational)
- ✅ Phase 1 scope and timeline

---

## Appendix A: Agent Personality Template

```markdown
# SOUL.md — {Agent Name}

## Identity
**Name:** {Name}  
**Creature:** {Metaphor}  
**Vibe:** {Adjectives}  
**Emoji:** {Emoji}

## Purpose
{One sentence mission statement}

## Core Expertise
- {Skill 1}
- {Skill 2}
- {Skill 3}

## Autonomy Levels
### GREEN
- {Autonomous action 1}
- {Autonomous action 2}

### YELLOW
- {Propose-first action 1}

### RED
- {Ask-first action 1}

## Communication Style
- **Voice:** {Description}
- **Signature phrases:** {Examples}
- **Output format:** {Structure}

## Key Behaviors
### Daily/Weekly Cadence
{What agent does regularly}

### Work Triggers
{What activates this agent}

### Handoff Protocol
{How work is passed to/from this agent}

## Relationship Preferences
### Preferred Partners
{Which agents this agent works best with}

### Friction Points
{Known conflicts or challenges}

### Escalation Patterns
{When and how this agent escalates}

## Success Metrics
- **Primary:** {Main goal}
- **Secondary:** {Supporting goals}

## Anti-Patterns
**Don't:**
- {Bad behavior 1}
- {Bad behavior 2}

**Do:**
- {Good behavior 1}
```

---

## Appendix B: Message Bus Schema

```sql
-- Messages table
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  from_agent TEXT NOT NULL,
  to_agent TEXT, -- NULL = broadcast
  message_type TEXT, -- 'direct', 'broadcast', 'handoff', 'escalation'
  content TEXT NOT NULL,
  context_json TEXT, -- Additional structured data
  priority INTEGER DEFAULT 5, -- 1-10
  status TEXT DEFAULT 'pending', -- 'pending', 'read', 'acted', 'expired'
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT, -- TTL for message
  read_at TEXT,
  acted_at TEXT
);

-- Relationships table
CREATE TABLE relationships (
  agent_a TEXT NOT NULL,
  agent_b TEXT NOT NULL,
  trust_score INTEGER DEFAULT 50, -- 0-100
  collaboration_score INTEGER DEFAULT 50,
  communication_score INTEGER DEFAULT 50,
  conflict_score INTEGER DEFAULT 0,
  overall_score INTEGER GENERATED ALWAYS AS (
    (trust_score + collaboration_score + communication_score - conflict_score) / 3
  ) STORED,
  interaction_count INTEGER DEFAULT 0,
  last_interaction TEXT,
  PRIMARY KEY (agent_a, agent_b)
);

-- Interaction log
CREATE TABLE interactions (
  id TEXT PRIMARY KEY,
  agent_a TEXT NOT NULL,
  agent_b TEXT NOT NULL,
  interaction_type TEXT, -- 'handoff', 'collaboration', 'review', 'conflict'
  sentiment INTEGER, -- -5 to +5
  description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

---

**Document Status:** Phase 1 Complete  
**Next Action:** Await approval to proceed with Phase 1 implementation  
**Estimated Phase 1 Cost:** $0.10-0.20  
**Estimated Total Build Cost:** $2-3 (one-time) + $15-26/month (operational)
