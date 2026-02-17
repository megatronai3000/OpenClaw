# Kanban Workflow System v2.0

Enhanced workflow system with automated transitions, validation gates, and AI-powered optimization using MiniMax.

## Features

### 1. Workflow Rules (When to Move Cards)
- Field requirements (title, description, assignee)
- Stage sequence enforcement
- Time-based rules (min/max time in stage)
- Business hours restrictions
- Approval requirements
- Tag/label requirements
- Custom JavaScript rules

### 2. Automated Transitions
- Time-based auto-transitions (e.g., archive after 30 days)
- Event-based triggers (subtasks complete, approvals received)
- Condition-based rules (field values, tags)
- Escalation rules (auto-escalate stuck cards)

### 3. Validation Gates
- Content validation (title/description length)
- Assignment validation
- Checklist completion
- Approval authority verification
- Dependency resolution
- Custom validation scripts

### 4. Custom Workflow Definitions per Project
Each project can have its own workflow with:
- Custom stages
- Custom rules
- Custom validators
- Custom auto-transition rules
- WIP limits per stage

### 5. Workflow Analytics (Time in Each Stage)
- Average/median/percentile time per stage
- Bottleneck identification
- Cycle time analysis
- Throughput metrics
- WIP trends
- Flow efficiency

## Installation

```bash
cd /Users/openclaw-megatron/.openclaw/workspace/research/kanban-workflow
npm install
```

## Usage

### Basic Setup

```javascript
import { KanbanWorkflow } from './src/index.js';

const workflow = new KanbanWorkflow({
  autoTransition: true,
  validationStrictness: 'medium',
  enableOptimization: true,
  minimaxApiKey: process.env.MINIMAX_API_KEY
});
```

### Creating a Workflow

```javascript
const definition = {
  name: 'Software Development Workflow',
  stages: [
    { id: 'backlog', name: 'Backlog', order: 0 },
    { id: 'todo', name: 'To Do', order: 1 },
    { id: 'in_progress', name: 'In Progress', order: 2, wipLimit: 3 },
    { id: 'review', name: 'Code Review', order: 3, wipLimit: 5 },
    { id: 'testing', name: 'Testing', order: 4, wipLimit: 3 },
    { id: 'done', name: 'Done', order: 5 }
  ],
  rules: [
    {
      type: 'assignee_required',
      fromStage: 'todo',
      toStage: 'in_progress',
      name: 'Require assignee'
    },
    {
      type: 'min_approvals',
      fromStage: 'review',
      toStage: 'testing',
      config: { count: 1, fromRoles: ['senior-dev'] },
      name: 'Require senior dev approval'
    }
  ],
  validators: [
    {
      type: 'checklist_complete',
      stage: 'done',
      level: 'error'
    }
  ],
  autoTransitionRules: [
    {
      id: 'auto_archive',
      name: 'Archive after 30 days',
      type: 'time_based',
      fromStage: 'done',
      targetStage: 'archived',
      config: { duration: '30d' }
    }
  ]
};

const workflow = await kanban.createWorkflow('project-1', definition);
```

### Creating Cards

```javascript
const card = await kanban.createCard('project-1', {
  title: 'Fix login bug',
  description: 'Users cannot login with 2FA',
  priority: 'high',
  stage: 'todo',
  tags: ['bug', 'auth'],
  metadata: {
    estimate: '4h',
    dueDate: '2026-02-20'
  }
});
```

### Transitioning Cards

```javascript
const result = await kanban.transitionCard(card.id, 'in_progress', {
  triggeredBy: 'user',
  userId: 'user-123'
});

if (!result.success) {
  console.log('Blocked:', result.message);
  console.log('Failed validations:', result.failedValidations);
}
```

### Analytics

```javascript
const analytics = await kanban.getAnalytics('project-1', {
  timeframe: '30d',
  includeRecommendations: true
});

console.log('Bottlenecks:', analytics.bottlenecks);
console.log('Throughput:', analytics.flow.throughput);
console.log('Stage times:', analytics.stages);
```

### AI Optimization

```javascript
const recommendations = await kanban.getOptimizationRecommendations('project-1');

console.log('AI Recommendations:', recommendations.optimizations);
console.log('Quick wins:', recommendations.quickWins);
```

## CLI Usage

```bash
# Create workflow
node src/cli.js create-workflow my-project "My Workflow"

# Create card
node src/cli.js create-card my-project "Fix bug"

# Transition card
node src/cli.js transition card_xxx review

# View analytics
node src/cli.js analytics my-project 7d

# Get optimization recommendations
node src/cli.js optimize my-project

# View status
node src/cli.js status my-project
```

## Rule Types

### Field Rules
- `field_required` - Field must be populated
- `field_value` - Field must match value/condition

### Stage Rules
- `stage_sequence` - Enforce stage order
- `stage_prerequisite` - Require visiting certain stages

### Time Rules
- `min_time_in_stage` - Minimum time before moving
- `max_time_in_stage` - Maximum time before escalation
- `business_hours_only` - Transitions only during work hours

### Assignment Rules
- `assignee_required` - Must have assignee
- `assignee_role` - Assignee must have role

### Approval Rules
- `approval_required` - Must have N approvals
- `min_approvals` - Must have approvals from specific roles

### Tag Rules
- `tag_required` - Must have tag(s)
- `tag_excluded` - Must not have tag(s)

### Priority Rules
- `priority_check` - Priority must meet criteria

### Custom
- `custom_script` - JavaScript validation

## Validator Types

- `title_required` - Card must have title
- `description_required` - Card must have description
- `title_length` - Title length requirements
- `description_length` - Description length requirements
- `assignee_required` - Must have assignee
- `assignee_active` - Assignee must be active
- `checklist_complete` - Checklist must be complete
- `checklist_minimum` - Minimum checklist items
- `approvals_sufficient` - Must have enough approvals
- `approval_authority` - Approvals must be from authorized users
- `dependencies_resolved` - Dependencies must be resolved
- `linked_items_status` - Linked items must be in required state
- `labels_applied` - Labels/tags required
- `estimate_provided` - Time estimate required
- `due_date_set` - Due date required
- `custom` - Custom JavaScript validation

## Auto-Transition Types

- `time_based` - Trigger after time in stage
- `event_based` - Trigger on events (subtasks, approvals)
- `condition_based` - Trigger on field conditions
- `escalation` - Trigger when thresholds exceeded

## Analytics Metrics

### Per Stage
- Average time
- Median time
- 75th, 90th, 95th percentile times
- Min/max times
- Sample size

### Flow Metrics
- Throughput (cards/day, cards/week)
- Completion rate
- Created count

### WIP Metrics
- Total WIP
- WIP by stage
- WIP trends

### Identified Issues
- Bottlenecks (ranked by severity)
- Recommendations
- Health score

## Project Structure

```
kanban-workflow/
├── src/
│   ├── core/
│   │   └── KanbanWorkflow.js    # Main workflow engine
│   ├── rules/
│   │   └── RuleEngine.js        # Workflow rules
│   ├── transitions/
│   │   └── TransitionEngine.js  # Auto-transitions
│   ├── validators/
│   │   └── ValidationEngine.js  # Validation gates
│   ├── analytics/
│   │   └── WorkflowAnalytics.js # Analytics engine
│   ├── ml/
│   │   └── MinimaxOptimizer.js  # AI optimization
│   ├── storage/
│   │   ├── WorkflowStore.js     # Workflow storage
│   │   ├── CardStore.js         # Card storage
│   │   └── AnalyticsStore.js    # Analytics storage
│   ├── cli.js                   # CLI interface
│   └── index.js                 # Main exports
├── package.json
└── README.md
```

## Cost

MiniMax API usage for optimization:
- Per analysis: ~$0.001-0.003
- Estimated monthly: <$0.50 for typical usage

## License

MIT