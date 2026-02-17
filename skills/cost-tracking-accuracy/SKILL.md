---
name: cost-tracking-accuracy
description: Audit, validate, and fix cost tracking data accuracy across the dashboard. Use when cost numbers appear wrong, when data sources conflict, when fake/unreliable data needs flagging, or when implementing proper daily/weekly/monthly cost calculations with ground truth reconciliation.
---

# Cost Tracking Accuracy

## Purpose

Ensure cost data is accurate, auditable, and properly attributed. Flag fake/simulated data. Reconcile estimates with ground truth.

## Core Concepts

### Data Quality Levels

| Level | Description | Display |
|-------|-------------|---------|
| **REAL** | Live API data, verified ground truth | Show number with ✅ |
| **PARTIAL** | Mix of real and estimated | Show number with ⚠️ |
| **FAKE** | Simulated, placeholder, or missing | Show "Fake Data" |

### Cost Types

1. **Daily Spend** - Tokens consumed TODAY only (00:00-23:59)
2. **Total Ever** - Cumulative since account creation
3. **Budget Remaining** - Monthly budget minus total ever
4. **Projected** - Forecast based on current burn rate

### Ground Truth Reconciliation

When user provides actual spend (e.g., "$52.22 total ever"):
1. Store as `cost_ground_truth.total_ever`
2. Calculate correction factor: `ground_truth / tracked`
3. Apply to all future daily calculations
4. Flag period as "corrected" in UI

## Quick Fixes

### Fix Daily Spend Display

```javascript
// Get today's actual spend (not total ever)
const todaySpend = getDailyCostFromDeltas(date('now'));
const totalEver = getGroundTruth().total_ever;
```

### Flag Fake Data

```javascript
if (dataSource === 'simulated' || data.confidence < 0.5) {
  display = 'Fake Data';
  tooltip = 'Based on estimates, not actual API data';
}
```

### Reconcile Ground Truth

```javascript
const correctionFactor = groundTruth / rawTracked;
const correctedDaily = rawDaily * correctionFactor;
```

## Workflows

### Audit Dashboard for Fake Data

1. Query all tables for data provenance
2. Check timestamps vs real API sync times
3. Flag entries older than first sync or marked simulated
4. Update UI to show quality indicators

### Fix Kanban Cost Estimates

1. Parse decision/task files for cost metadata
2. Cross-reference with actual cost_tracking data
3. Calculate per-task accuracy: `|estimated - actual| / estimated`
4. Update estimates with corrected formulas

### Calculate Accurate Daily Costs

```javascript
// Proper daily calculation
dailyCost = (todayMaxTokens - yesterdayMaxTokens) * costPerToken * correctionFactor;
```

## Scripts

- `audit-data-quality.js` - Scan all tables, flag fake data
- `fix-daily-costs.js` - Recalculate daily spend from deltas
- `update-kanban-estimates.js` - Sync task estimates with reality
- `reconcile-ground-truth.js` - Apply user-provided corrections

## Data Schema Reference

See [references/data-schema.md](references/data-schema.md) for table structures and relationships.

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Today = Total Ever | Tracking started mid-period | Use delta calculation, not max |
| Negative daily costs | API returned lower token count | Filter negative deltas |
| Wild variance | No ground truth applied | Run reconcile script |
| Kanban estimates off | Outdated formulas | Run update-kanban-estimates.js |
