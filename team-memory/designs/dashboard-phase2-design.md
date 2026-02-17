# Dashboard Phase 2 - Design Specifications

## Design System Foundation

### Color Tokens (Semantic)
```
Status Colors:
- Good/Healthy:    green-500  (#22c55e) → text-green-600 / bg-green-500/10 / border-green-500/30
- Warning/At-Risk: yellow-500 (#eab308) → text-yellow-600 / bg-yellow-500/10 / border-yellow-500/30
- Critical:        red-500    (#ef4444) → text-red-600 / bg-red-500/10 / border-red-500/30
- Info:            blue-500   (#3b82f6) → text-blue-600 / bg-blue-500/10 / border-blue-500/30

Priority Colors:
- Hot:    red-500    (critical attention)
- Warm:   yellow-500 (medium attention)
- Cold:   muted-foreground (low priority)

UI Hierarchy:
- Primary:      Primary actions, active states
- Secondary:    Backgrounds, inactive states
- Muted:        Helper text, timestamps
- Border:       Card boundaries
- Card:         Surface backgrounds
```

### Typography Scale
```
Page Title:        text-2xl font-bold tracking-tight
Section Title:     text-lg font-semibold
Card Title:        text-base font-medium (via CardTitle)
Card Description:  text-sm text-muted-foreground
Metric Value:      text-3xl font-bold
Metric Label:      text-sm text-muted-foreground
Body:              text-sm
Caption:           text-xs text-muted-foreground
```

### Spacing System
```
Page padding:      p-6
Card gap:          gap-4 (grid), gap-6 (major sections)
Card internal:     p-4 (compact), p-6 (default)
Element spacing:   space-y-3 (lists), gap-2 (inline)
```

---

## 1. Project Health Dashboard

### Purpose
CEO-level project portfolio overview with health indicators, progress tracking, and quick action capabilities.

### Component Hierarchy
```
ProjectHealthDashboard
├── Header (title + refresh)
├── HealthSummaryCard (overall portfolio status)
├── ProjectGrid
│   └── ProjectCard (repeated)
│       ├── CardHeader
│       │   ├── ProjectIdentity (icon + name + status badge)
│       │   └── PriorityIndicator
│       ├── CardContent
│       │   ├── HealthIndicatorRow (health + progress)
│       │   ├── TaskSummary (counts)
│       │   └── NextMilestone
│       └── CardFooter (quick actions)
└── EmptyState (when no projects)
```

### shadcn Component Mapping

| Element | Component | Props/Variants |
|---------|-----------|----------------|
| Project Card | `Card` | `className="hover:border-primary/50 transition-colors"` |
| Status Badge | `Badge` | `variant={status === 'active' ? 'default' : status === 'blocked' ? 'destructive' : 'secondary'}` |
| Priority Badge | `Badge` | Custom: `variant="outline"` with priority colors |
| Health Indicator | Custom + `Badge` | Color-coded dot + text |
| Progress Bar | `Progress` | `value={project.progress}` |
| Quick Actions | `Button` | `variant="ghost" size="sm"` |
| Empty State | `Card` | Centered content with icon |

### Color/Token Usage

```typescript
const getStatusConfig = (status: string) => {
  switch (status) {
    case 'active':
      return { variant: 'default', icon: Activity, color: 'text-primary' };
    case 'blocked':
      return { variant: 'destructive', icon: AlertCircle, color: 'text-red-500' };
    case 'completed':
      return { variant: 'secondary', icon: CheckCircle2, color: 'text-green-500' };
    case 'planning':
      return { variant: 'outline', icon: Clock, color: 'text-muted-foreground' };
  }
};

const getHealthConfig = (health: string) => {
  switch (health) {
    case 'good':
      return { 
        dot: 'bg-green-500',
        border: 'border-green-500/30',
        bg: 'bg-green-500/5',
        text: 'text-green-600'
      };
    case 'at-risk':
      return {
        dot: 'bg-yellow-500',
        border: 'border-yellow-500/30',
        bg: 'bg-yellow-500/5',
        text: 'text-yellow-600'
      };
    case 'critical':
      return {
        dot: 'bg-red-500',
        border: 'border-red-500/30',
        bg: 'bg-red-500/5',
        text: 'text-red-600'
      };
  }
};

const getPriorityConfig = (priority: string) => {
  switch (priority) {
    case 'hot':
      return 'border-red-500/50 bg-red-500/10 text-red-600';
    case 'warm':
      return 'border-yellow-500/50 bg-yellow-500/10 text-yellow-600';
    case 'cold':
      return 'border-muted bg-secondary text-muted-foreground';
  }
};
```

### Layout Wireframe (ASCII)

```
+-------------------------------------------------------------+
|  Project Health Dashboard                          [Refresh]|
+-------------------------------------------------------------+
|                                                             |
|  +-----------------------------------------------------+  |
|  | [●] Portfolio Healthy    5 Active | 1 At-Risk | 0 Critical|
|  +-----------------------------------------------------+  |
|                                                             |
|  +-------------------+  +-------------------+  +----------+ |
|  | [icon] Project A  |  | [icon] Project B  |  | Project C| |
|  | [ACTIVE]  [HOT]   |  | [BLOCKED] [WARM]  |  | ...      | |
|  |                   |  |                   |  |          | |
|  | Health: [●] Good  |  | Health: [●] At-Risk| |          | |
|  | [=========] 75%   |  | [=====] 45%       |  |          | |
|  |                   |  |                   |  |          | |
|  | 12 tasks • 3 due  |  | 8 tasks • BLOCKED |  |          | |
|  | Next: Launch v1.0 |  | Next: Unblock API |  |          | |
|  |                   |  |                   |  |          | |
|  | [View] [Actions▼] |  | [View] [Actions▼] |  |          | |
|  +-------------------+  +-------------------+  +----------+ |
|                                                             |
|  +-------------------+  +-------------------+               |
|  | [icon] Project D  |  | [icon] Project E  |               |
|  | ...               |  | ...               |               |
|  +-------------------+  +-------------------+               |
|                                                             |
+-------------------------------------------------------------+
```

### Interaction Patterns

1. **Card Hover**: `hover:border-primary/50 transition-colors` - subtle highlight
2. **Status Pulse**: Critical/at-risk items have `animate-pulse` on health dot
3. **Progress Animation**: Progress bars animate on load with `transition-all`
4. **Quick Actions Dropdown**: 
   - Click "Actions" reveals: View Details, Edit, Archive, Delete
   - Uses `DropdownMenu` component
5. **Card Click**: Primary click navigates to project detail view
6. **Refresh**: Updates all health indicators with loading state

### Data Structure
```typescript
interface ProjectHealth {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'blocked' | 'completed' | 'planning';
  priority: 'hot' | 'warm' | 'cold';
  health: 'good' | 'at-risk' | 'critical';
  progress: number;
  taskCount: {
    total: number;
    completed: number;
    inProgress: number;
    blocked: number;
  };
  nextMilestone?: {
    title: string;
    dueDate: string;
  };
  lastUpdated: string;
}
```

---

## 2. Cost Intelligence Tab

### Purpose
Financial oversight with burn rate visualization, project cost allocation, and budget forecasting.

### Component Hierarchy
```
CostIntelligenceTab
├── Header (title + period selector + export)
├── BudgetAlertBanner (conditional)
├── SummaryCards
│   ├── DailyBurnCard
│   ├── WeeklyBurnCard
│   ├── ProjectedMonthlyCard
│   └── BudgetRemainingCard
├── TabNavigation
│   ├── Overview
│   ├── By Project
│   ├── By Agent
│   └── Forecast
└── TabContent
    ├── OverviewTab
    │   ├── BurnRateChart
    │   └── CostBreakdownList
    ├── ByProjectTab
    │   └── ProjectCostCards
    ├── ByAgentTab
    │   └── AgentCostTable
    └── ForecastTab
        ├── BudgetTrajectoryChart
        └── AlertThresholdsConfig
```

### shadcn Component Mapping

| Element | Component | Props/Variants |
|---------|-----------|----------------|
| Summary Cards | `Card` | Gradient backgrounds, gradient-to-br pattern |
| Alert Banner | `Card` | Full-width, conditional color based on threshold |
| Tab Navigation | Custom | Border-bottom active indicator |
| Charts | Recharts | ResponsiveContainer, custom tooltips |
| Cost List | `Card` + `Table` | Alternating rows, right-aligned currency |
| Alert Config | `Card` + `Slider` | Interactive threshold setting |
| Progress | `Progress` | Budget consumption visualization |

### Color/Token Usage

```typescript
// Summary card gradients
const cardGradients = {
  burn: 'from-orange-500/10 to-orange-600/5 border-orange-500/20',
  budget: 'from-purple-500/10 to-purple-600/5 border-purple-500/20',
  forecast: 'from-amber-500/10 to-amber-600/5 border-amber-500/20',
  remaining: 'from-green-500/10 to-green-600/5 border-green-500/20'
};

// Alert thresholds
const getAlertStyle = (percentage: number) => {
  if (percentage >= 90) return 'bg-red-500/10 border-red-500/30 text-red-600';
  if (percentage >= 75) return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600';
  return 'bg-green-500/10 border-green-500/30 text-green-600';
};

// Chart colors
const chartColors = {
  primary: '#3b82f6',   // blue-500
  secondary: '#10b981', // green-500
  warning: '#f59e0b',   // amber-500
  danger: '#ef4444',    // red-500
  purple: '#8b5cf6'     // violet-500
};
```

### Layout Wireframe (ASCII)

```
+-------------------------------------------------------------+
|  Cost Intelligence                    [24H] [7D] [30D] [Exp]|
+-------------------------------------------------------------+
|                                                             |
|  ⚠ Budget Alert: You've used 85% of monthly budget         |
|                                                             |
|  +---------------+ +---------------+ +---------------+ +---+
|  | Daily Burn    | | Weekly Burn   | | Projected     | |...|
|  |               | |               | | Monthly       | |   |
|  | $12.45        | | $87.15        | | $375.00       | |   |
|  | ↑ 15% vs avg  | | On track      | | ⚠ Over budget | |   |
|  +---------------+ +---------------+ +---------------+ +---+
|                                                             |
|  [Overview] [By Project] [By Agent] [Forecast]             |
|  ─────────────────────────────────────────────────────────  |
|                                                             |
|  +-----------------------------------------------------+  |
|  | Burn Rate Trend                                    |  |
|  |                                                    |  |
|  |    $ ████                                          |  |
|  |  20  ███████                                       |  |
|  |  15  █████████                                     |  |
|  |  10  ████████████                                  |  |
|  |   5  ███████████████                               |  |
|  |   0  ────────────────────────────                  |  |
|  |      M  T  W  T  F  S  S                           |  |
|  |                                                    |  |
|  +-----------------------------------------------------+  |
|                                                             |
|  +------------------------+  +-------------------------+  |
|  | Cost by Project        |  | Top Spenders            |  |
|  |                        |  |                         |  |
|  | ■ Project A    $45.23  |  | 1. Code Review Agent    |  |
|  | ■ Project B    $32.10  |  |    $23.45               |  |
|  | ■ Project C    $18.50  |  | 2. Research Agent       |  |
|  | ■ Other         $8.12  |  |    $18.20               |  |
|  |                        |  | 3. Writing Agent        |  |
|  | [View Full Breakdown]  |  |    $12.80               |  |
|  +------------------------+  +-------------------------+  |
|                                                             |
+-------------------------------------------------------------+
```

### Interaction Patterns

1. **Period Selector**: Tab-style buttons `[24H] [7D] [30D]` with active state
2. **Export Button**: Downloads CSV of cost data
3. **Chart Hover**: Tooltip shows exact values with date
4. **Project Breakdown**: Click expands to show agent-level costs
5. **Alert Threshold**: Slider to set % threshold for warnings
6. **Forecast Toggle**: Show/hide projection lines on chart

### Data Structure
```typescript
interface CostIntelligence {
  period: '24h' | '7d' | '30d';
  summary: {
    dailyBurn: number;
    weeklyBurn: number;
    monthlyProjected: number;
    budgetRemaining: number;
    budgetPercentage: number;
  };
  burnRate: Array<{
    date: string;
    cost: number;
    tokens: number;
    calls: number;
  }>;
  byProject: Array<{
    projectId: string;
    projectName: string;
    cost: number;
    percentage: number;
    trend: 'up' | 'down' | 'flat';
  }>;
  byAgent: Array<{
    agentId: string;
    agentName: string;
    cost: number;
    taskCount: number;
  }>;
  forecast: {
    projectedMonthly: number;
    projectedYearly: number;
    onTrack: boolean;
    requiredDailyAverage: number;
  };
  alerts: {
    threshold: number;
    currentLevel: 'healthy' | 'warning' | 'critical';
  };
}
```

---

## 3. Decisions Pending Queue

### Purpose
Centralized decision management for CEO approval - proposals, escalations, and agent requests requiring human input.

### Component Hierarchy
```
DecisionsPendingQueue
├── Header (title + count badge + filter)
├── DecisionStats (summary metrics)
├── DecisionList
│   └── DecisionCard (repeated)
│       ├── CardHeader
│       │   ├── PriorityIndicator
│       │   ├── DecisionTypeBadge
│       │   └── Timestamp
│       ├── CardContent
│       │   ├── Title
│       │   ├── ContextPreview
│       │   ├── ReasoningSummary
│       │   └── CostImpact (if applicable)
│       └── CardFooter
│           ├── ApproveButton
│           ├── RejectButton
│           └── DeferButton
├── EmptyState (all caught up)
└── DecisionHistoryLink
```

### shadcn Component Mapping

| Element | Component | Props/Variants |
|---------|-----------|----------------|
| Decision Card | `Card` | `border-l-4` with priority color |
| Priority Badge | `Badge` | `variant={priority === 'high' ? 'destructive' : 'secondary'}` |
| Type Badge | `Badge` | `variant="outline"` with icon |
| Action Buttons | `Button` | Approve: `className="bg-green-500 hover:bg-green-600"`, Reject: `variant="destructive"`, Defer: `variant="outline"` |
| Context Dialog | `Dialog` | Full reasoning display on "View Details" |
| Filter Dropdown | `Select` | By type, priority, date range |
| Empty State | `Card` | Success state with checkmark |

### Color/Token Usage

```typescript
const decisionTypeStyles = {
  proposal: { icon: Lightbulb, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  escalation: { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  budget_request: { icon: DollarSign, color: 'text-green-500', bg: 'bg-green-500/10' },
  agent_request: { icon: Bot, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  system_change: { icon: Settings, color: 'text-gray-500', bg: 'bg-gray-500/10' }
};

const priorityBorderColors = {
  critical: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-yellow-500',
  low: 'border-l-blue-500'
};

const actionButtonStyles = {
  approve: 'bg-green-500 hover:bg-green-600 text-white',
  reject: 'bg-red-500 hover:bg-red-600 text-white',
  defer: 'border-border hover:bg-secondary'
};
```

### Layout Wireframe (ASCII)

```
+-------------------------------------------------------------+
|  Decisions Pending (5)                    [All ▼] [Filter]  |
+-------------------------------------------------------------+
|                                                             |
|  +------------+ +-----------+ +-----------+ +------------+ |
|  | Critical 2 | | High 1    | | Medium 1  | | Low 1      | |
|  +------------+ +-----------+ +-----------+ +------------+ |
|                                                             |
|  +-----------------------------------------------------+  |
|  │ [CRITICAL] [Proposal]                    2 hours ago│  |
|  │                                                     │  |
|  │ Expand Agent Team with Specialized DevOps Agent    │  |
|  │                                                     │  |
|  │ Agent Orion has identified infrastructure scaling  │  |
|  │ needs. Proposing recruitment of DevOps specialist  │  |
|  │ to handle growing deployment complexity...         │  |
|  │                                                     │  |
|  │ 💰 Est. Cost: $50/month                            │  |
|  │ 🎯 Impact: High - Unblocks 3 projects              │  |
|  │                                                     │  |
|  │ [✓ Approve]  [✗ Reject]  [⏸ Defer]  [View Details]│  |
|  +-----------------------------------------------------+  |
|                                                             |
|  +-----------------------------------------------------+  |
|  │ [HIGH] [Budget Request]                 5 hours ago │  |
|  │                                                     │  |
|  │ Increase daily budget for Project Alpha            │  |
|  │                                                     │  |
|  │ Current $10/day insufficient for API costs...      │  |
|  │                                                     │  |
|  │ 💰 Requested: $15/day (+$150/month)                │  |
|  │ 📊 Current utilization: 98%                        │  |
|  │                                                     │  |
|  │ [✓ Approve]  [✗ Reject]  [⏸ Defer]               │  |
|  +-----------------------------------------------------+  |
|                                                             |
|  +-----------------------------------------------------+  |
|  │ [MEDIUM] [Escalation]                  1 day ago    │  |
|  │ ...                                                 │  |
|  +-----------------------------------------------------+  |
|                                                             |
+-------------------------------------------------------------+
```

### Interaction Patterns

1. **Quick Actions**: 
   - Approve/Reject/Defer buttons directly on card
   - Immediate visual feedback (card fades out on action)
2. **Defer Options**: Opens dropdown with 1h, 4h, 24h, 1w
3. **View Details**: Opens Dialog with full context, reasoning, alternatives
4. **Bulk Actions**: Checkbox select + bulk approve/reject (toolbar appears)
5. **Auto-sort**: Critical first, then by timestamp
6. **Undo**: Toast notification with 5s undo window

### Data Structure
```typescript
interface PendingDecision {
  id: string;
  type: 'proposal' | 'escalation' | 'budget_request' | 'agent_request' | 'system_change';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'approved' | 'rejected' | 'deferred';
  title: string;
  description: string;
  context: string;
  reasoning: string;
  proposedBy: {
    agentId: string;
    agentName: string;
  };
  submittedAt: string;
  expiresAt?: string;
  costImpact?: {
    amount: number;
    period: 'one-time' | 'daily' | 'monthly';
    currency: string;
  };
  alternatives?: string[];
  risks?: string[];
  metadata: Record<string, any>;
}
```

---

## 4. System Health Tab

### Purpose
Technical operations monitoring - cron jobs, API health, error tracking, and performance metrics.

### Component Hierarchy
```
SystemHealthTab
├── Header (title + last check timestamp)
├── OverallStatusCard
│   └── StatusIndicator + Uptime
├── HealthGrid
│   ├── CronJobsCard
│   │   └── JobList
│   │       └── JobRow (status + last run + next run)
│   ├── APIHealthCard
│   │   └── EndpointList
│   │       └── EndpointRow (latency + status)
│   ├── ErrorLogCard
│   │   └── ErrorList
│   │       └── ErrorRow (severity + message + time)
│   └── PerformanceCard
│       └── MetricGrid
│           └── MetricTile (name + value + sparkline)
└── IncidentHistoryLink
```

### shadcn Component Mapping

| Element | Component | Props/Variants |
|---------|-----------|----------------|
| Status Cards | `Card` | Border color indicates health state |
| Status Badge | `Badge` | `variant={status === 'healthy' ? 'default' : 'destructive'}` |
| Job Row | Custom | Flex row with status dot |
| Error Row | Custom | Expandable, color-coded by severity |
| Sparkline | Custom SVG | Mini chart for trends |
| Collapsible | `Collapsible` | Expand error details |
| Scroll Area | `ScrollArea` | For long log lists |
| Table | `Table` | Structured data display |

### Color/Token Usage

```typescript
const healthStatusConfig = {
  healthy: {
    dot: 'bg-green-500',
    border: 'border-green-500/30',
    bg: 'bg-green-500/5',
    badge: 'default'
  },
  degraded: {
    dot: 'bg-yellow-500',
    border: 'border-yellow-500/30',
    bg: 'bg-yellow-500/5',
    badge: 'secondary'
  },
  unhealthy: {
    dot: 'bg-red-500',
    border: 'border-red-500/30',
    bg: 'bg-red-500/5',
    badge: 'destructive'
  },
  unknown: {
    dot: 'bg-gray-400',
    border: 'border-gray-400/30',
    bg: 'bg-gray-400/5',
    badge: 'outline'
  }
};

const errorSeverityConfig = {
  critical: { color: 'text-red-600', bg: 'bg-red-500/10', icon: AlertOctagon },
  error: { color: 'text-red-500', bg: 'bg-red-500/5', icon: XCircle },
  warning: { color: 'text-yellow-600', bg: 'bg-yellow-500/10', icon: AlertTriangle },
  info: { color: 'text-blue-500', bg: 'bg-blue-500/5', icon: Info }
};

const apiLatencyColor = (ms: number) => {
  if (ms < 200) return 'text-green-500';
  if (ms < 500) return 'text-yellow-500';
  return 'text-red-500';
};
```

### Layout Wireframe (ASCII)

```
+-------------------------------------------------------------+
|  System Health                              Last check: 2m ago|
|  [●] All Systems Operational     Uptime: 99.9% (30d)        |
+-------------------------------------------------------------+
|                                                             |
|  +------------------------+  +-------------------------+  |
|  | Cron Jobs              |  | API Health              |  |
|  |                        |  |                         |  |
|  | ● daily_report    ✓   |  | ● /api/v1/tasks    45ms |  |
|  |   Last: 2h ago         |  |   Healthy               |  |
|  |   Next: 22h            |  |                         |  |
|  |                        |  | ● /api/v1/agents  120ms |  |
|  | ● hourly_sync     ✓   |  |   Healthy               |  |
|  |   Last: 58m ago        |  |                         |  |
|  |   Next: 2m             |  | ● /api/v1/costs   380ms |  |
|  |                        |  |   ⚠ Slow                |  |
|  | ● weekly_backup   ✓   |  |                         |  |
|  |   Last: 3d ago         |  | ● /ws/realtime     25ms |  |
|  |   Next: 4d             |  |   Healthy               |  |
|  |                        |  |                         |  |
|  | [View All Jobs]        |  | [View Details]          |  |
|  +------------------------+  +-------------------------+  |
|                                                             |
|  +------------------------+  +-------------------------+  |
|  | Recent Errors          |  | Performance Metrics     |  |
|  |                        |  |                         |  |
|  | ⚠ 2h ago  Rate limit   |  | Avg Response Time       |  |
|  |   exceeded on OpenAI   |  | 145ms [~chart~]        |  |
|  |                        |  |                         |  |
|  | ✓ 4h ago  Task retry   |  | Request Rate            |  |
|  |   succeeded            |  | 12/min [~chart~]        |  |
|  |                        |  |                         |  |
|  | ✗ 6h ago  DB connect   |  | Error Rate              |  |
|  |   timeout (resolved)   |  | 0.2% [~chart~]          |  |
|  |                        |  |                         |  |
|  | [View Full Log]        |  | Memory Usage            |  |
|  |                        |  | 67% [===========>]      |  |
|  +------------------------+  +-------------------------+  |
|                                                             |
+-------------------------------------------------------------+
```

### Interaction Patterns

1. **Auto-refresh**: Poll every 30 seconds with `animate-pulse` on refresh icon
2. **Cron Job Click**: Opens detail with run history and logs
3. **Error Expand**: Click error row to see stack trace and context
4. **API Endpoint Click**: Shows latency history chart
5. **Metric Hover**: Shows exact value and timestamp
6. **Incident Ack**: Click to acknowledge error (mutes notification)

### Data Structure
```typescript
interface SystemHealth {
  timestamp: string;
  overall: 'healthy' | 'degraded' | 'unhealthy';
  uptime: {
    '24h': number;
    '7d': number;
    '30d': number;
  };
  cronJobs: Array<{
    id: string;
    name: string;
    schedule: string;
    status: 'running' | 'success' | 'failed' | 'idle';
    lastRun: string | null;
    nextRun: string | null;
    lastDuration: number;
    history: Array<{
      timestamp: string;
      status: 'success' | 'failed';
      duration: number;
    }>;
  }>;
  apiHealth: Array<{
    endpoint: string;
    method: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    avgLatency: number;
    p95Latency: number;
    errorRate: number;
    lastChecked: string;
  }>;
  errors: Array<{
    id: string;
    severity: 'critical' | 'error' | 'warning' | 'info';
    message: string;
    source: string;
    timestamp: string;
    resolved: boolean;
    stackTrace?: string;
    context?: Record<string, any>;
  }>;
  performance: {
    avgResponseTime: number;
    requestRate: number;
    errorRate: number;
    memoryUsage: number;
    cpuUsage: number;
    activeConnections: number;
  };
}
```

---

## Common Patterns Summary

### Card States
```
Default:     border-border bg-card
Hover:       hover:border-primary/50 transition-colors
Selected:    border-primary bg-primary/5
Critical:    border-red-500/50 bg-red-500/10
Warning:     border-yellow-500/50 bg-yellow-500/10
Success:     border-green-500/50 bg-green-500/10
```

### Badge Patterns
```
Status:      variant={status === 'active' ? 'default' : 'secondary'}
Priority:    variant={priority === 'high' ? 'destructive' : 'outline'}
Type:        variant="outline" + custom colors
Health:      variant="default" + custom styling
```

### Action Button Hierarchy
```
Primary:     <Button> (default variant)
Secondary:   <Button variant="outline">
Tertiary:    <Button variant="ghost" size="sm">
Danger:      <Button variant="destructive">
Success:     <Button className="bg-green-500 hover:bg-green-600">
```

### Loading States
```
Skeleton:    Use animated placeholder divs
Spinner:     <RefreshCw className="animate-spin" />
Pulse:       <div className="animate-pulse bg-muted rounded" />
Progress:    <Progress value={loadingProgress} />
```

### Responsive Breakpoints
```
Mobile:      < 768px  (1 column)
Tablet:      >= 768px (2 columns)
Desktop:     >= 1024px (3-4 columns)
Large:       >= 1280px (4+ columns)
```

---

## Implementation Notes

1. **All components should use the existing shadcn/ui components** from `/src/components/ui/`
2. **Icons**: Use `lucide-react` consistently
3. **Charts**: Use `recharts` for data visualization (already in CostAnalyticsDashboard)
4. **Date formatting**: Use `date-fns` for consistent date display
5. **API integration**: Follow pattern in `api/client.ts`
6. **Error handling**: Use error boundary pattern from existing components
7. **Loading states**: Consistent skeleton/shimmer pattern
8. **Empty states**: Always provide helpful empty state with action CTA

## Files to Create

1. `src/components/ProjectHealthDashboard.tsx`
2. `src/components/DecisionsPendingQueue.tsx`
3. `src/components/SystemHealthTab.tsx`
4. Update `src/App.tsx` to include new routes
5. Update `src/api/client.ts` with new endpoints
