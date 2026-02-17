# Model Router V2

Task-Based Model Routing with Enhanced NLP Classification, Cost/Quality Optimization, and Learning.

## Features

### 1. Advanced NLP-Based Task Classification
- Automatic task type detection (coding, analysis, creative, reasoning, etc.)
- Complexity assessment (simple, medium, complex, critical)
- Privacy sensitivity detection
- Urgency signal extraction
- Keyword extraction for enhanced routing

### 2. Intelligent Provider Selection
- Multi-provider support (OpenRouter, Moonshot, Local Ollama)
- Model capability scoring based on task characteristics
- Performance history tracking
- Automatic failover and success rate weighting

### 3. Cost/Quality Tradeoff Optimization
- Multiple routing strategies:
  - `balanced`: Equal weight to quality, cost, and speed
  - `quality`: Prioritize high-quality models
  - `cost`: Minimize expenses
  - `speed`: Fastest response time
- Budget-aware automatic strategy switching
- Per-request cost estimation

### 4. Routing History & Learning
- JSONL-based decision logging
- Feedback integration for continuous improvement
- Model performance tracking (success rates, latency)
- Daily spend monitoring

### 5. Override Capabilities
- Pattern-based rule matching
- Privacy-sensitive content → Local models
- Urgent requests → Speed-optimized routing
- Context-length based model selection
- Blocklist for safety filtering

## Quick Start

```bash
# Route a prompt
python router_cli.py route "Write a Python function to sort a list"

# Use quality strategy for complex tasks
python router_cli.py route "Analyze this architecture" --strategy quality

# Get detailed scoring
python router_cli.py route "Quick question" --verbose

# View recent history
python router_cli.py history --last 10

# Show statistics
python router_cli.py stats

# Run test suite
python router_cli.py test
```

## Configuration

Edit `config.yaml` to customize:

- **Providers**: Add/remove model providers
- **Task Types**: Define classification rules
- **Routing Strategies**: Adjust optimization weights
- **Overrides**: Add custom routing rules
- **Budget Limits**: Set daily spending thresholds

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Prompt                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   NLP Classifier                             │
│  • Task type detection    • Complexity assessment           │
│  • Privacy detection      • Urgency extraction              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Override Engine                            │
│  • Pattern matching  • Block rules  • Force routing         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Strategy Selector                          │
│  • Budget pressure  • Urgency  • Complexity  • User pref    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Model Scorer                               │
│  • Quality score  • Cost score  • Speed score               │
│  • Performance history  • Learned preferences               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Routing Decision                           │
│  • Selected model  • Confidence  • Cost estimate            │
│  • Audit trail  • History logging                           │
└─────────────────────────────────────────────────────────────┘
```

## API Usage

```python
from router import RoutingEngine, Strategy

# Initialize engine
engine = RoutingEngine('config.yaml')

# Route a prompt
decision = engine.route(
    prompt="Write a function to calculate prime numbers",
    strategy=Strategy.QUALITY
)

print(f"Selected: {decision.selected_provider}/{decision.selected_model}")
print(f"Confidence: {decision.confidence}")
print(f"Est. Cost: ${decision.estimated_cost}")

# Provide feedback
engine.provide_feedback(decision.request_id, quality_rating=0.9)
```

## Testing

```bash
# Run all tests
python tests/test_router.py

# Run CLI tests
python router_cli.py test --verbose
```

## Cost Optimization Tips

1. **Use `cost` strategy** for simple tasks (summarization, classification)
2. **Use `quality` strategy** for critical code generation or analysis
3. **Let auto-strategy handle budget pressure** - automatically switches to cost mode
4. **Provide feedback** - helps improve routing decisions over time
5. **Local models** - use Ollama for privacy-sensitive or high-volume tasks

## Directory Structure

```
model-router-v2/
├── config.yaml              # Main configuration
├── router_cli.py            # Command-line interface
├── src/
│   └── router.py            # Core routing engine
├── tests/
│   └── test_router.py       # Test suite
└── data/
    └── history/             # Routing history & feedback
```

## License

MIT
