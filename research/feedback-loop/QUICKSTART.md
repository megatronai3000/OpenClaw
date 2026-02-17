# Feedback Loop System

## Quick Start

### 1. Install
```bash
cd /Users/openclaw-megatron/.openclaw/workspace/research/feedback-loop
npm install
```

### 2. Configure (Optional)
For LLM-powered insights, set your MiniMax API key:
```bash
export MINIMAX_API_KEY=your_key_here
```

### 3. Run Demo
```bash
npm run demo
```

### 4. Track Decisions
```javascript
import { FeedbackLoop } from './src/index.js';

const feedback = new FeedbackLoop();

// Track a decision
const decision = await feedback.trackDecision({
  agent: 'research-agent',
  task: 'web-search',
  context: { query: 'AI trends 2024' },
  decision: { provider: 'brave', results: 10 },
  confidence: 0.85,
  alternatives: ['google', 'bing']
});

// Later, log the outcome
await feedback.logOutcome(decision.id, {
  success: true,
  quality: 0.9,
  feedback: 'Great results, relevant sources',
  tags: ['high-quality', 'relevant'],
  metrics: { time: 1.2, results: 10 }
});
```

### 5. Analyze Performance
```javascript
// Full analysis
const analysis = await feedback.analyze('research-agent', { 
  timeframe: '30d' 
});

console.log('Accuracy:', analysis.accuracy.overall);
console.log('Trends:', analysis.trends.accuracyTrend);
console.log('Patterns:', analysis.patterns.contextPatterns);
```

### 6. Get Recommendations
```javascript
const recs = await feedback.getRecommendations('research-agent');

for (const rec of recs.recommendations) {
  console.log(`[${rec.priority}] ${rec.title}`);
  console.log(`  ${rec.description}`);
}
```

### 7. Generate Report
```javascript
const report = await feedback.generateReport('research-agent');
console.log(report.summary);
```

## CLI Usage

```bash
# Track a decision
node src/cli.js track agent:my-agent task:search decision:'{"provider":"brave"}' confidence:0.8

# Log outcome
node src/cli.js log decisionId:dec_xxx success:true feedback:"Good result"

# Analyze agent
node src/cli.js analyze agent:my-agent timeframe:7d

# Get recommendations
node src/cli.js recommend agent:my-agent

# Generate report
node src/cli.js report agent:my-agent

# View stats
node src/cli.js stats agent:my-agent
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      FEEDBACK LOOP                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Decision   │───▶│   Outcome    │───▶│  Analytics   │  │
│  │   Tracker    │    │   Logger     │    │   Engine     │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                   │                   │          │
│         ▼                   ▼                   ▼          │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                  Decision Store                      │  │
│  │     (JSON files in data/decisions, data/outcomes)   │  │
│  └─────────────────────────────────────────────────────┘  │
│                             │                              │
│                             ▼                              │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              Analytics & Patterns                    │  │
│  │  • Accuracy calculation    • Trend analysis         │  │
│  │  • Pattern detection       • ML insights (MiniMax)  │  │
│  └─────────────────────────────────────────────────────┘  │
│                             │                              │
│                             ▼                              │
│  ┌─────────────────────────────────────────────────────┐  │
│  │            Recommendations Engine                    │  │
│  │  • Priority-based actions   • Implementation steps  │  │
│  │  • Success metrics          • Progress tracking     │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Key Features

1. **Decision Tracking**: Every decision logged with full context
2. **Outcome Logging**: Success/failure with qualitative feedback
3. **Accuracy Metrics**: Overall, by task, rolling averages
4. **Trend Analysis**: Detect improving/declining performance
5. **Pattern Detection**: Identify success/failure factors
6. **LLM Insights**: MiniMax-powered advanced analysis
7. **Recommendations**: Actionable improvement steps
8. **Cost Effective**: ~$0.001 per analysis call

## Data Storage

All data stored in JSON files:
- `data/decisions/` - Decision records
- `data/outcomes/` - Outcome records  
- `data/analytics/` - Calculated metrics

## Cost

- Local storage: $0
- MiniMax API: ~$0.001 per analysis
- Target: <$0.01 per 100 decisions

## Testing

```bash
npm test
```

## License

MIT