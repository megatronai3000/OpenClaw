# HEARTBEAT.md

# Cost-Efficient Heartbeat Checks
# Runs periodically - uses LOCAL MODELS exclusively (cost: $0)

## Model Assignment
- **All heartbeats:** Use local Ollama models (llama3.1:8b, qwen2.5:7b)
- **Cost:** $0 per heartbeat
- **Fallback:** MiniMax (with explicit approval only if local fails)

## Daily Checks (Local Models / $0 Cost)

### Morning Brief (7am EST) - Cost: $0
**Model:** ollama/llama3.1:8b (local)
- [ ] Check calendar for day ahead
- [ ] Review any HIGH priority blockers from yesterday
- [ ] Surface urgent deadlines (<24h)

### Evening Summary (5pm EST) - Cost: $0
**Model:** ollama/llama3.1:8b (local)
- [ ] Log today's cost summary from /usage
- [ ] Note any blockers for tomorrow
- [ ] Update project progress in PROJECTS.md if significant

## Weekly Checks (Batch on Mondays) - Cost: $0

### Monday Morning Batch
**Model:** ollama/qwen2.5:7b (local)
- [ ] Review last 7 days cost trend
- [ ] Check project deadlines (<2 weeks out)
- [ ] Memory maintenance: review daily logs, update MEMORY.md
- [ ] Clean up old session files (>30 days)

## Weekly Memory Curation (Sundays 11pm) - Cost: $0

### Autonomous Memory Maintenance
**Model:** ollama/qwen2.5:7b (local)
- [ ] Review daily_logs/ from past week
- [ ] Extract patterns and learnings (preferences, mistakes, context changes)
- [ ] Update USER.md with new preferences
- [ ] Update PROJECTS.md with new context
- [ ] Create/update autonomous-work-patterns.md
- [ ] Archive logs >30 days to daily_logs/archive/
- [ ] Generate weekly summary in memory/weekly-summaries/

**Agent:** Megatron  
**Schedule:** Every Sunday 23:00 EST  
**First Run:** February 16, 2026  
**Model:** Local (qwen2.5:7b) - $0 cost

## Bi-Weekly Checks (1st & 15th) - Cost: $0

### Deep Review
**Model:** ollama/qwen2.5:14b (local)
- [ ] Review all active project health
- [ ] Competitive scan for DDI (if in active development)
- [ ] File organization cleanup
- [ ] USER.md/SOUL.md review and updates

## Skip Conditions (Don't Run If)

- [ ] User is in meeting (calendar busy)
- [ ] Last heartbeat was <4 hours ago
- [ ] Cost already >$2 today (API tasks only - heartbeats are $0)
- [ ] Late night (11pm-6am) unless urgent

## Cost Tracking

**Target:** $0/week in heartbeat costs (all local models)
**Current:** $0 - All heartbeats use local Ollama models
**Tracked as:** `provider: 'local'` in cost_tracking table

## Automation Notes

- Batch similar checks together
- Use web_search sparingly (most expensive)
- Prefer local file reads over external calls
- Heartbeat is silent unless something needs attention
