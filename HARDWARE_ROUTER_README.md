# Hardware-Aware Model Router

Intelligently routes LLM requests between local Ollama models and cloud APIs based on your hardware capabilities.

## Features

- 🔍 **Automatic Hardware Detection** - Detects RAM, CPU, GPU on macOS/Linux
- 🧠 **Smart Routing** - Routes simple tasks locally, complex tasks to API
- ⚙️ **Configurable Thresholds** - Customize when to use local vs API
- 💰 **Cost Optimization** - Use local models when possible to save on API costs
- 🔄 **Fallback Support** - Automatically falls back to API if local fails

## Quick Start

```javascript
import ModelRouter from './model-router.js';

const router = new ModelRouter();

// Simple completion - automatically routed
const response = await router.complete({
  messages: [{ role: 'user', content: 'Explain quantum computing' }],
  maxTokens: 500
});

console.log(response.content);
console.log('Routed to:', response.routing.target); // 'local' or 'api'
```

## Hardware Requirements

| Model Size | Minimum RAM | Recommended RAM |
|------------|-------------|-----------------|
| 3B         | 4GB         | 6GB             |
| 7B         | 8GB         | 10GB            |
| 8B         | 8GB         | 12GB            |
| 14B        | 16GB        | 20GB            |

## Usage Examples

### Basic Usage

```javascript
import { getRouter } from './model-router.js';

const router = getRouter();

// Quick one-liner
const result = await router.quick('Write a haiku about coding');
```

### Force Local or API

```javascript
// Force local execution (if hardware supports)
const local = await router.complete({
  messages: [{ role: 'user', content: 'Hello!' }],
  forceLocal: true
});

// Force API
const api = await router.complete({
  messages: [{ role: 'user', content: 'Complex analysis...' }],
  forceAPI: true
});
```

### Task-Based Routing

```javascript
// Router infers complexity or you specify it
const result = await router.complete({
  messages: [{ role: 'user', content: 'Debug this code' }],
  task: 'complex', // 'simple', 'standard', 'complex', 'intensive'
  maxTokens: 2000
});
```

## Configuration

Edit `hardware-config.json` to customize thresholds:

```json
{
  "fallback": {
    "alwaysPreferLocal": false,
    "localFirstThreshold": 70,
    "apiFallbackOnError": true
  },
  "taskThresholds": {
    "simple": { "maxTokens": 500, "allowsLocal": true },
    "complex": { "maxTokens": 4000, "allowsLocal": true }
  }
}
```

## CLI Commands

```bash
# Check status and hardware info
node model-router.js status

# List available models
node model-router.js models

# Quick completion
node model-router.js complete "Explain Node.js"

# Run demo
node hardware-router-demo.js

# Run tests
node hardware-router-demo.js test
```

## API Reference

### ModelRouter

| Method | Description |
|--------|-------------|
| `init()` | Initialize and detect hardware |
| `complete(params)` | Route and execute a completion |
| `quick(prompt, options)` | Simple one-shot completion |
| `listModels()` | List compatible models |
| `getStats()` | Get routing statistics |
| `refreshHardware()` | Re-detect hardware |

### Routing Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `messages` | Array | Chat messages |
| `maxTokens` | Number | Max tokens to generate |
| `task` | String | Task complexity hint |
| `forceLocal` | Boolean | Force local execution |
| `forceAPI` | Boolean | Force API execution |
| `temperature` | Number | Sampling temperature |

## How It Works

1. **Detection** - On init, detects your hardware specs
2. **Scoring** - Calculates a capability score (0-100)
3. **Routing** - For each request:
   - Checks task complexity and token count
   - Compares against hardware capabilities
   - Selects local model if sufficient, else API
   - Tracks routing decisions for analytics

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌───────────────┐
│  Model Router   │────▶│ Hardware Router  │────▶│  Hardware     │
│  (Entry Point)  │     │ (Decision Logic) │     │  Detector     │
└─────────────────┘     └──────────────────┘     └───────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌──────────────────┐
│  Ollama (Local) │     │  MiniMax (API)   │
└─────────────────┘     └──────────────────┘
```

## Cost Savings

Based on your 64GB RAM machine:
- ~70% of tasks can run locally
- Estimated savings: $5-7/day vs pure API usage
- Local inference: $0 (after model download)
- API fallback: ~$0.20/call vs ~$0.01 local

## Troubleshooting

**Ollama not detected?**
- Ensure Ollama is installed: `brew install ollama`
- Start the server: `ollama serve`

**Out of memory errors?**
- Lower `localFirstThreshold` in config
- Close other applications
- Use smaller models (3B instead of 8B)

**Slow local responses?**
- Check CPU usage
- Consider using API for time-sensitive tasks
- Use `forceAPI: true` for urgent requests

## Files

- `hardware-detector.js` - Hardware detection module
- `hardware-router.js` - Routing decision logic
- `model-router.js` - Main entry point
- `hardware-config.json` - Configuration
- `hardware-router-demo.js` - Demo and tests
