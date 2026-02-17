# Weekly Memory Curation Task

**Schedule:** Every Sunday at 11:00 PM EST  
**Agent:** Megatron (Chief of Staff)  
**Recurring:** Weekly  
**Cost:** ~$0.25  
**Duration:** ~1 hour

---

## Purpose
Autonomous memory maintenance. Agents review their own work, extract patterns, and update durable memory files. This creates compound learning and reduces repetitive explanations.

---

## Workflow

### 1. Review daily_logs/ (15 min)
Read all `memory/YYYY-MM-DD.md` files from past 7 days:
- What work was done
- What decisions were made
- What blockers occurred
- What patterns emerged

### 2. Extract Patterns & Learnings (20 min)
Identify:
- **New preferences**: How user wants things done (communication style, formatting, depth)
- **Mistakes to avoid**: Errors that were made, incorrect assumptions
- **Context changes**: Project priorities shifted, new constraints
- **Communication patterns**: When user intervenes vs lets agent work
- **Decision reasoning**: Why certain approaches were chosen

### 3. Update Memory Files (20 min)

#### USER.md Updates
Add to relevant sections:
```markdown
## Preferences Observed (Week of Feb 10)
- Prefers X over Y when Z
- Wants concise answers for simple questions
- Expects detailed breakdowns for complex decisions
- Dislikes [specific pattern observed]
```

#### PROJECTS.md Updates
- Update project statuses
- Add new context discovered
- Note blockers or dependencies

#### Create autonomous-work-patterns.md (if not exists)
```markdown
# Autonomous Work Patterns

## Patterns That Work
- [Pattern]: [When to use] → [Outcome]

## Patterns To Avoid
- [Pattern]: [Why it failed] → [What to do instead]

## Decision Heuristics
- When X, prefer Y because Z
```

### 4. Archive Old Logs (5 min)
```bash
# Move logs >30 days to archive
mv memory/2026-01-*.md memory/archive/
```

### 5. Generate Weekly Summary (5 min)
Write to `memory/weekly-summaries/2026-W07.md`:
```markdown
# Weekly Summary: Feb 10-16, 2026

## Accomplishments
- [Major deliverables]

## Key Learnings
- [Patterns discovered]

## Memory Updates
- USER.md: [what was added]
- PROJECTS.md: [what was updated]
- autonomous-work-patterns.md: [new patterns]

## Proposed Improvements
- [Suggested changes to operating patterns]

## Cost
- Total spent: $X.XX
- Efficiency: [tasks completed / cost]
```

---

## Success Metrics (After 4 Weeks)

| Metric | Baseline | Target |
|--------|----------|--------|
| USER.md richness | Sparse | Rich with context |
| Repeated mistakes | Common | Rare |
| Communication friction | High | Low |
| Explanations needed | Frequent | Minimal |

---

## First Run
**Date:** Sunday, February 16, 2026  
**Focus:** Establish pattern, create autonomous-work-patterns.md template

---

## Integration with Orchestrator

This task should be treated as a **standing order** in the Kanban:
- Always in backlog
- Auto-assigned every Sunday at 23:00
- High priority (but after any urgent user tasks)
- Creates decision file for user review of summary
