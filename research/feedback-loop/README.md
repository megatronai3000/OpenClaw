# Feedback Loop System

Agent self-improvement through decision tracking, outcome logging, and pattern analysis.

## Architecture

```
feedback-loop/
├── src/
│   ├── core/
│   │   ├── DecisionTracker.js      # Tracks all agent decisions
│   │   ├── FeedbackLogger.js       # Logs outcomes with context
│   │   └── OutcomeEvaluator.js     # Evaluates success/failure
│   ├── analytics/
│   │   ├── AccuracyCalculator.js   # Calculates accuracy metrics
│   │   ├── TrendAnalyzer.js        # Identifies trends over time
│   │   └── PatternDetector.js      # Finds patterns in decisions
│   ├── ml/
│   │   ├── FeatureExtractor.js     # Extracts features from decisions
│   │   └── MinimaxClient.js        # MiniMax API integration
│   ├── recommendations/
│   │   ├── ImprovementEngine.js    # Generates recommendations
│   │   └── ActionPrioritizer.js    # Prioritizes actions
│   └── storage/
│       ├── DecisionStore.js        # Persistent storage layer
│       └── AnalyticsStore.js       # Analytics data storage
├── data/
│   ├── decisions/                  # Decision records
│   ├── outcomes/                   # Outcome records
│   └── analytics/                  # Calculated metrics
└── tests/                          # Test suite
```

## Usage

```javascript
import { FeedbackLoop } from './src/index.js';

// Initialize
const feedback = new FeedbackLoop({
  minimaxApiKey: process.env.MINIMAX_API_KEY
});

// Track a decision
const decisionId = await feedback.trackDecision({
  agent: 'research-agent',
  task: 'web-search',
  context: { query: 'latest AI trends' },
  decision: { action: 'search', provider: 'brave' },
  confidence: 0.85
});

// Log outcome
await feedback.logOutcome(decisionId, {
  success: true,
  metrics: { results: 10, relevance: 0.9 },
  feedback: 'Good results, relevant sources'
});

// Get analytics
const report = await feedback.generateReport({
  agent: 'research-agent',
  timeframe: '7d'
});

// Get recommendations
const recommendations = await feedback.getRecommendations('research-agent');
```

## Key Features

1. **Decision Tracking**: Every decision is tracked with full context
2. **Outcome Logging**: Success/failure with detailed metrics
3. **Accuracy Calculation**: Time-series accuracy tracking
4. **Pattern Detection**: ML-powered pattern identification
5. **Recommendations**: Actionable improvement suggestions

## Cost Model

- MiniMax API: ~$0.001 per analysis call
- Local storage: $0
- Target: <$0.01 per 100 decisions