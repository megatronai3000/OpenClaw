# OpenClaw Quota Integration

## Quick Setup

To capture real quota data from OpenClaw, you need to hook into the API responses.

## Option 1: Config Hook (Recommended)

Add to your `~/.openclaw/config.json`:

```json
{
  "hooks": {
    "afterApiCall": "node /Users/openclaw-megatron/.openclaw/workspace/megatron-dashboard-api/hooks/capture-quota.js"
  }
}
```

## Option 2: Manual Test

Trigger a test quota report:

```bash
curl -X POST http://localhost:3001/api/analytics/quotas/report \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "model": "gpt-4o",
    "headers": {
      "x-ratelimit-limit-requests": "500",
      "x-ratelimit-remaining-requests": "350",
      "x-ratelimit-limit-tokens": "30000",
      "x-ratelimit-remaining-tokens": "15000"
    }
  }'
```

## Expected Headers by Provider

### OpenAI
- `x-ratelimit-limit-requests`
- `x-ratelimit-remaining-requests`
- `x-ratelimit-limit-tokens`
- `x-ratelimit-remaining-tokens`
- `x-ratelimit-reset-tokens`

### Anthropic
- `anthropic-ratelimit-requests-limit`
- `anthropic-ratelimit-requests-remaining`
- `anthropic-ratelimit-reset`

### Moonshot
- `x-ratelimit-limit`
- `x-ratelimit-remaining`

## Verification

Check the dashboard "Quota Limits" tab. Real data shows:
- Green dot: Live data (< 5 min old)
- Yellow "Waiting...": No data yet (using defaults)
- Reset time showing actual window

Fallback data shows:
- "Not connected" label
- All limits at 100%
- No timestamp