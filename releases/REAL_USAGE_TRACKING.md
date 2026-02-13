# Real-Time API Usage Tracking

**System:** `real-usage-tracker.js`
**Status:** ✅ Active

## How It Works

**OLD (Broken):** System guessed costs → logged fake data

**NEW (Fixed):** Every API response includes actual token usage → calculate real cost → store it

## Usage

### 1. Automatic Capture (Recommended)

The system captures usage automatically from every API response:

```javascript
const { captureLiveUsage } = require('./real-usage-tracker');

// After making any API call
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello' }]
});

// Automatically logs:
// - Input tokens: 8
// - Output tokens: 15  
// - Cost: $0.00017
```

### 2. Manual Capture (If Auto Fails)

```javascript
const { logManualUsage } = require('./real-usage-tracker');

// Log actual usage from API dashboard
logManualUsage('moonshot', 'kimi-k2.5', 1250, 3400, 'my-task');
```

### 3. View Live Report

```bash
cd megatron-dashboard-api
node real-usage-tracker.js
```

## Provider Pricing (from official APIs)

| Provider | Model | Input/1K | Output/1K |
|----------|-------|----------|-----------|
| **Moonshot** | kimi-k2.5 | $0.0015 | $0.0060 |
| **OpenAI** | gpt-4o | $0.0025 | $0.0100 |
| **OpenAI** | gpt-4o-mini | $0.00015 | $0.0006 |
| **Google** | gemini-2.5-flash | $0.00015 | $0.0006 |

## Current Status

**Database:** Clean (manual entries removed)
**Next:** Every API call gets logged with actual usage from response

## Integration with OpenClaw

OpenClaw responses include usage data like this:

```json
{
  "usage": {
    "input_tokens": 114,
    "output_tokens": 263,
    "total_tokens": 377
  },
  "cost": {
    "input": 0,
    "output": 0,
    "total": 0
  }
}
```

The `real-usage-tracker` extracts these tokens and calculates actual cost using provider pricing.

## Rules

1. ✅ **Capture from every API response** — input_tokens + output_tokens
2. ✅ **Calculate using actual pricing** — no guesses
3. ❌ **No estimates** — only real usage data
4. ❌ **No synthetic entries** — only actual API calls

---
*System ready to capture real usage*
