# Cost Tracking Data Schema

## Core Tables

### cost_ground_truth
Authoritative source for actual spend (user-provided).

| Field | Type | Description |
|-------|------|-------------|
| id | TEXT PK | Provider name ('moonshot', 'openai') |
| total_ever | REAL | Total USD spent since account creation |
| currency | TEXT | 'USD' |
| updated_at | TEXT | ISO timestamp |

### cost_tracking
Daily aggregated costs (corrected).

| Field | Type | Description |
|-------|------|-------------|
| id | TEXT PK | 'moonshot-YYYY-MM-DD' |
| date | TEXT | 'YYYY-MM-DD' |
| sessionName | TEXT | Source identifier |
| cost | REAL | USD cost for that day (CORRECTED) |
| tokens | INTEGER | Token count for that day |
| model | TEXT | Model used |
| createdAt | TEXT | ISO timestamp |

### moonshot_usage_snapshots
Raw API responses with deltas.

| Field | Type | Description |
|-------|------|-------------|
| id | INTEGER PK | Auto-increment |
| timestamp | TEXT | ISO timestamp of snapshot |
| token_usage | INTEGER | Cumulative tokens (raw API value) |
| delta_from_previous | INTEGER | Change since last snapshot |
| estimated_cost_usd | REAL | Raw cost calc (uncorrected) |
| estimated_cost_cny | REAL | Raw CNY cost |

## Data Quality Flags

Entries should be flagged based on:

1. **Age**: Data older than first API sync = FAKE
2. **Source**: sessionName containing 'ESTIMATE' = SIMULATED
3. **Variance**: >50% off ground truth = UNRELIABLE
4. **Recency**: No sync in 24h = STALE

## Daily Cost Calculation

Correct formula:
```
daily_tokens = today_max - yesterday_max
daily_cost_usd = daily_tokens * pricing_per_token * correction_factor
```

Where:
- `today_max` = MAX(token_usage) WHERE date = today
- `yesterday_max` = MAX(token_usage) WHERE date = yesterday
- `correction_factor` = ground_truth_total / sum(all_raw_daily_costs)

## Common Queries

### Get today's actual spend
```sql
SELECT 
  (SELECT MAX(token_usage) FROM moonshot_usage_snapshots WHERE date(timestamp) = date('now')) -
  (SELECT MAX(token_usage) FROM moonshot_usage_snapshots WHERE date(timestamp) = date('now', '-1 day'))
  as today_tokens;
```

### Get data quality report
```sql
SELECT 
  date,
  cost,
  CASE 
    WHEN id LIKE 'ESTIMATE%' THEN 'FAKE'
    WHEN date < (SELECT MIN(date(timestamp)) FROM moonshot_usage_snapshots) THEN 'FAKE'
    ELSE 'REAL'
  END as quality
FROM cost_tracking;
```
