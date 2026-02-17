# Heartbeat Configuration — Local Models Only

## Overview
Heartbeat checks run frequently (every 30 min) and should use **local models exclusively** to save API costs.

## Local Model Assignment for Heartbeats

### Morning Brief (7:00 AM)
**Model:** llama3.1:8b (local)
**Cost:** $0
**Tasks:**
- Check calendar
- Review blockers
- Surface urgent deadlines

### Evening Summary (5:00 PM)
**Model:** llama3.1:8b (local)
**Cost:** $0
**Tasks:**
- Log cost summary
- Note blockers
- Update project progress

### Nightly Memory Maintenance (11:00 PM)
**Model:** qwen2.5:7b (local)
**Cost:** $0
**Tasks:**
- Review MEMORY.md
- Extract skill candidates
- Identify tool patterns
- Archive outdated content

## Cost Savings

| Check | Old Cost (API) | New Cost (Local) | Savings |
|-------|---------------|------------------|---------|
| Morning Brief | ~$0.01 | $0 | $0.01 |
| Evening Summary | ~$0.01 | $0 | $0.01 |
| Nightly Maintenance | ~$0.25 | $0 | $0.25 |
| **Daily Total** | **~$0.27** | **$0** | **$0.27** |
| **Monthly Total** | **~$8.10** | **$0** | **$8.10** |

## Implementation

### Model Router Rule
```javascript
if (taskType === 'heartbeat') {
  return 'local'; // Always use local models
}
```

### Cron Configuration
```json
{
  "morning-brief": {
    "model": "ollama/llama3.1:8b",
    "cost": 0
  },
  "evening-summary": {
    "model": "ollama/llama3.1:8b",
    "cost": 0
  },
  "nightly-maintenance": {
    "model": "ollama/qwen2.5:7b",
    "cost": 0
  }
}
```

## Override (Emergency Only)
If local models fail, fallback to MiniMax with explicit approval:
```
[HEARTBEAT FAILED - Local model down]
Approve MiniMax for this heartbeat? [Yes/No]
```

## Tracking
All heartbeat costs logged as `provider: 'local'` in cost_tracking table for visibility.
