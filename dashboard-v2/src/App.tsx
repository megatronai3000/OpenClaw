import { useState } from 'react'
import { 
  LayoutDashboard, 
  Kanban, 
  FolderKanban, 
  FileText, 
  CheckSquare, 
  Lightbulb, 
  Menu, 
  X, 
  Zap, 
  Activity,
  DollarSign,
  Brain,
  Settings,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronRight,
  MoreHorizontal,
  BarChart3,
  ClipboardList,
  Server,
  Play,
  Pause,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'

// Mock data
const costData = [
  { date: 'Mon', cost: 12, tokens: 2500 },
  { date: 'Tue', cost: 15, tokens: 3200 },
  { date: 'Wed', cost: 8, tokens: 1800 },
  { date: 'Thu', cost: 18, tokens: 4100 },
  { date: 'Fri', cost: 14, tokens: 3000 },
  { date: 'Sat', cost: 6, tokens: 1200 },
  { date: 'Sun', cost: 9, tokens: 2000 },
]

const projectData = [
  { id: 1, name: 'OpenClaw', status: 'active', priority: 'hot', health: 'good', progress: 88, tasks: 12, due: 3 },
  { id: 2, name: 'DeFi Portfolio', status: 'active', priority: 'hot', health: 'at-risk', progress: 45, tasks: 8, due: 2 },
  { id: 3, name: 'DDI', status: 'planning', priority: 'warm', health: 'good', progress: 15, tasks: 5, due: 0 },
  { id: 4, name: 'Consulting', status: 'active', priority: 'hot', health: 'good', progress: 60, tasks: 4, due: 1 },
]

const decisionsData = [
  { id: 1, type: 'proposal', priority: 'critical', title: 'Expand Agent Team with DevOps Agent', cost: '$50/mo', time: '2h ago', agent: 'Megatron' },
  { id: 2, type: 'budget', priority: 'high', title: 'Increase daily budget to $15', cost: '+$150/mo', time: '5h ago', agent: 'System' },
  { id: 3, type: 'escalation', priority: 'medium', title: 'Approve parallel execution for weekend', cost: '$0', time: '1d ago', agent: 'Orchestrator' },
]

const cronJobs = [
  { name: 'Morning Report', status: 'success', lastRun: '7:00 AM', nextRun: '5:00 PM' },
  { name: 'Evening Report', status: 'success', lastRun: '5:00 PM', nextRun: '7:00 AM' },
  { name: 'Team Standup', status: 'success', lastRun: '9:00 AM', nextRun: 'Tomorrow' },
  { name: 'Memory Curation', status: 'failed', lastRun: '11:00 PM Sun', nextRun: 'Sunday', error: 'PATH issue' },
]

const kanbanTasks = {
  backlog: [
    { id: 1, title: 'Research DeFi yield opportunities', priority: 'medium' },
    { id: 2, title: 'Design DDI architecture', priority: 'medium' },
    { id: 3, title: 'Update HyperWarp monitoring', priority: 'low' },
  ],
  inProgress: [
    { id: 4, title: 'Auto-Approval Rules Engine', priority: 'high', agent: 'autonomous-1' },
    { id: 5, title: 'WebSocket Architecture', priority: 'high', agent: 'autonomous-2' },
    { id: 6, title: 'Proposal Workflow', priority: 'high', agent: 'Megatron' },
    { id: 7, title: 'Cost Tracking Tier 2', priority: 'medium', agent: 'System' },
    { id: 8, title: 'Guard Rails Implementation', priority: 'high', agent: 'System' },
  ],
  blocked: [
    { id: 9, title: 'DDI Stage 3 - needs scope', priority: 'high', blocker: 'Waiting for user input' },
  ],
  completed: [
    { id: 10, title: 'Ollama Local Models Setup', priority: 'high' },
    { id: 11, title: 'Cron Job Audit', priority: 'high' },
    { id: 12, title: 'Dashboard v2 Rebuild', priority: 'high' },
    { id: 13, title: 'Proposal API', priority: 'high' },
  ],
}

// Color palette
const COLORS = {
  primary: '#3b82f6',
  success: '#22c55e',
  warning: '#eab308',
  error: '#ef4444',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
}

const SidebarItem = ({ icon: Icon, label, active, onClick, count }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
      active 
        ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-lg shadow-blue-500/20' 
        : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-secondary)] hover:text-[var(--color-foreground)]'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
    {count > 0 && (
      <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
        active ? 'bg-white/20' : 'bg-[var(--color-secondary)] text-[var(--color-muted-foreground)]'
      }`}>
        {count}
      </span>
    )}
  </button>
)

const Card = ({ children, className = '' }) => (
  <div className={`bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl ${className}`}>
    {children}
  </div>
)

const Badge = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]',
    success: 'bg-green-500/20 text-green-500',
    warning: 'bg-yellow-500/20 text-yellow-500',
    error: 'bg-red-500/20 text-red-500',
    secondary: 'bg-[var(--color-secondary)] text-[var(--color-muted-foreground)]',
    outline: 'border border-[var(--color-border)] text-[var(--color-muted-foreground)]',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}

const Button = ({ children, variant = 'primary', size = 'md', className = '', ...props }) => {
  const variants = {
    primary: 'bg-[var(--color-primary)] hover:bg-blue-600 text-white',
    secondary: 'bg-[var(--color-secondary)] hover:bg-[var(--color-muted)] text-[var(--color-foreground)]',
    outline: 'border border-[var(--color-border)] hover:bg-[var(--color-secondary)] text-[var(--color-foreground)]',
    ghost: 'hover:bg-[var(--color-secondary)] text-[var(--color-muted-foreground)]',
    destructive: 'bg-red-600 hover:bg-red-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  }
  return (
    <button className={`rounded-lg font-medium transition-all duration-200 ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  )
}

function DashboardHome() {
  const [refreshing, setRefreshing] = useState(false)
  
  const handleRefresh = () => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 1000)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Welcome back</h2>
          <p className="text-[var(--color-muted-foreground)] mt-1">Here's what's happening with your autonomous agency</p>
        </div>
        <Button variant="outline" onClick={handleRefresh} className="gap-2">
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-muted-foreground)]">Active Tasks</p>
              <p className="text-3xl font-bold mt-1">5</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <BarChart3 className="text-blue-500" size={24} />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-sm text-green-500">
            <ArrowUpRight size={14} />
            <span>+2 from yesterday</span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-muted-foreground)]">Completed Today</p>
              <p className="text-3xl font-bold mt-1">4</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="text-green-500" size={24} />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-sm text-green-500">
            <ArrowUpRight size={14} />
            <span>On track</span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-muted-foreground)]">Daily Cost</p>
              <p className="text-3xl font-bold mt-1">$5.45</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <DollarSign className="text-purple-500" size={24} />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-sm text-red-500">
            <ArrowUpRight size={14} />
            <span>+15% vs avg</span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-muted-foreground)]">Monthly Total</p>
              <p className="text-3xl font-bold mt-1">$52.22</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <TrendingUp className="text-cyan-500" size={24} />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-sm text-[var(--color-muted-foreground)]">
            <Minus size={14} />
            <span>35% of $150 budget</span>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="font-semibold mb-4">Cost Trend (7 days)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={costData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--color-card)', 
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px'
                }} 
              />
              <Line type="monotone" dataKey="cost" stroke={COLORS.primary} strokeWidth={2} dot={{fill: COLORS.primary}} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold mb-4">Tasks by Status</h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={150} height={150}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Backlog', value: 3 },
                    { name: 'In Progress', value: 5 },
                    { name: 'Blocked', value: 1 },
                    { name: 'Completed', value: 12 },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill={COLORS.warning} />
                  <Cell fill={COLORS.primary} />
                  <Cell fill={COLORS.error} />
                  <Cell fill={COLORS.success} />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-sm">Backlog: 3</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-sm">In Progress: 5</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm">Blocked: 1</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm">Completed: 12</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="p-5">
        <h3 className="font-semibold mb-4">Recent Activity</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-secondary)]/50">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 size={16} className="text-green-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Completed: Proposal API</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">2 minutes ago</p>
            </div>
            <Badge variant="success">Done</Badge>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-secondary)]/50">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 size={16} className="text-green-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Completed: Dashboard v2 Rebuild</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">15 minutes ago</p>
            </div>
            <Badge variant="success">Done</Badge>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-secondary)]/50">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Play size={16} className="text-blue-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Started: Auto-Approval Rules</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">In progress</p>
            </div>
            <Badge variant="default">Running</Badge>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-secondary)]/50">
            <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <AlertCircle size={16} className="text-yellow-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Blocked: DDI Stage 3</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">Needs scope from user</p>
            </div>
            <Badge variant="warning">Blocked</Badge>
          </div>
        </div>
      </Card>
    </div>
  )
}

function ProjectHealth() {
  const getHealthColor = (health) => {
    switch(health) {
      case 'good': return 'bg-green-500'
      case 'at-risk': return 'bg-yellow-500'
      case 'critical': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }
  
  const getPriorityBorder = (priority) => {
    switch(priority) {
      case 'hot': return 'border-l-red-500'
      case 'warm': return 'border-l-yellow-500'
      case 'cold': return 'border-l-gray-500'
      default: return 'border-l-gray-500'
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Project Health</h2>
        <p className="text-[var(--color-muted-foreground)]">Portfolio overview with health indicators</p>
      </div>
      
      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-green-500">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-sm text-[var(--color-muted-foreground)]">Healthy</span>
          </div>
          <div className="text-2xl font-bold">4</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-yellow-500">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
            <span className="text-sm text-[var(--color-muted-foreground)]">At Risk</span>
          </div>
          <div className="text-2xl font-bold">1</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-red-500">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span className="text-sm text-[var(--color-muted-foreground)]">Critical</span>
          </div>
          <div className="text-2xl font-bold">0</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-blue-500">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span className="text-sm text-[var(--color-muted-foreground)]">Planning</span>
          </div>
          <div className="text-2xl font-bold">1</div>
        </Card>
      </div>

      {/* Project Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projectData.map(project => (
          <Card key={project.id} className={`p-4 border-l-4 ${getPriorityBorder(project.priority)}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FolderKanban size={18} className="text-blue-500" />
                <span className="font-semibold">{project.name}</span>
              </div>
              <div className="flex gap-2">
                <Badge variant={project.status === 'active' ? 'success' : 'secondary'}>
                  {project.status}
                </Badge>
                <Badge variant={project.priority === 'hot' ? 'error' : project.priority === 'warm' ? 'warning' : 'outline'}>
                  {project.priority}
                </Badge>
              </div>
            </div>
            <div className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[var(--color-muted-foreground)]">Progress</span>
                <span className="font-medium">{project.progress}%</span>
              </div>
              <div className="h-2 bg-[var(--color-secondary)] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all" 
                  style={{ width: `${project.progress}%` }}
                ></div>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-muted-foreground)]">
                {project.tasks} tasks • {project.due} due
              </span>
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${getHealthColor(project.health)}`}></div>
                <span className="text-xs text-[var(--color-muted-foreground)]">{project.health}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function CostIntelligence() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Cost Intelligence</h2>
          <p className="text-[var(--color-muted-foreground)]">Financial oversight and budget tracking</p>
        </div>
        <div className="flex gap-2">
          {['24H', '7D', '30D'].map((period, i) => (
            <Button key={period} variant={i === 1 ? 'primary' : 'outline'} size="sm">
              {period}
            </Button>
          ))}
        </div>
      </div>

      {/* Alert */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-center gap-3">
        <AlertCircle className="text-yellow-500 flex-shrink-0" size={20} />
        <div>
          <p className="font-medium text-yellow-500">Budget Alert</p>
          <p className="text-sm text-[var(--color-muted-foreground)]">You've used 65% of monthly budget</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <p className="text-sm text-[var(--color-muted-foreground)] mb-1">Daily Burn</p>
          <p className="text-3xl font-bold">$12.45</p>
          <p className="text-sm text-orange-500 mt-1 flex items-center gap-1">
            <ArrowUpRight size={14} /> 15% vs avg
          </p>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <p className="text-sm text-[var(--color-muted-foreground)] mb-1">Weekly Burn</p>
          <p className="text-3xl font-bold">$87.15</p>
          <p className="text-sm text-green-500 mt-1 flex items-center gap-1">
            <TrendingUp size={14} /> On track
          </p>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <p className="text-sm text-[var(--color-muted-foreground)] mb-1">Projected Monthly</p>
          <p className="text-3xl font-bold">$375.00</p>
          <p className="text-sm text-yellow-500 mt-1 flex items-center gap-1">
            <AlertCircle size={14} /> Over budget
          </p>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <p className="text-sm text-[var(--color-muted-foreground)] mb-1">Budget Remaining</p>
          <p className="text-3xl font-bold">$125.00</p>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-1">35% left</p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="font-semibold mb-4">Cost by Project</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={projectData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={12} />
              <YAxis dataKey="name" type="category" stroke="var(--color-muted-foreground)" fontSize={12} width={100} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--color-card)', 
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px'
                }} 
              />
              <Bar dataKey="progress" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold mb-4">Token Usage</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={costData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--color-card)', 
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px'
                }} 
              />
              <Line type="monotone" dataKey="tokens" stroke={COLORS.cyan} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  )
}

function DecisionsQueue() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            Decisions
            <Badge variant="default">{decisionsData.length}</Badge>
          </h2>
          <p className="text-[var(--color-muted-foreground)]">Review and approve agent requests</p>
        </div>
        <Button variant="outline" size="sm">
          Filter
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-3 text-center border-red-500/30">
          <div className="text-2xl font-bold text-red-500">2</div>
          <div className="text-xs text-[var(--color-muted-foreground)]">Critical</div>
        </Card>
        <Card className="p-3 text-center border-orange-500/30">
          <div className="text-2xl font-bold text-orange-500">1</div>
          <div className="text-xs text-[var(--color-muted-foreground)]">High</div>
        </Card>
        <Card className="p-3 text-center border-yellow-500/30">
          <div className="text-2xl font-bold text-yellow-500">1</div>
          <div className="text-xs text-[var(--color-muted-foreground)]">Medium</div>
        </Card>
        <Card className="p-3 text-center border-blue-500/30">
          <div className="text-2xl font-bold text-blue-500">0</div>
          <div className="text-xs text-[var(--color-muted-foreground)]">Low</div>
        </Card>
      </div>

      {/* Decision Cards */}
      <div className="space-y-4">
        {decisionsData.map(decision => (
          <Card key={decision.id} className={`p-5 border-l-4 ${
            decision.priority === 'critical' ? 'border-l-red-500' :
            decision.priority === 'high' ? 'border-l-orange-500' :
            'border-l-yellow-500'
          }`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Badge variant={decision.priority === 'critical' ? 'error' : decision.priority === 'high' ? 'warning' : 'default'}>
                  {decision.priority}
                </Badge>
                <Badge variant="outline">{decision.type}</Badge>
                <span className="text-xs text-[var(--color-muted-foreground)]">{decision.agent}</span>
              </div>
              <span className="text-xs text-[var(--color-muted-foreground)]">{decision.time}</span>
            </div>
            
            <h3 className="font-semibold mb-2">{decision.title}</h3>
            
            <div className="flex items-center gap-4 text-sm text-[var(--color-muted-foreground)] mb-4">
              <span className="flex items-center gap-1">
                <DollarSign size={14} /> {decision.cost}
              </span>
            </div>
            
            <div className="flex gap-2">
              <Button variant="success" size="sm" className="gap-1">
                <CheckCircle2 size={14} /> Approve
              </Button>
              <Button variant="destructive" size="sm">
                Reject
              </Button>
              <Button variant="outline" size="sm" className="gap-1">
                <Clock size={14} /> Defer
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function SystemHealth() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <Activity className="text-green-500" />
          System Health
        </h2>
        <p className="text-[var(--color-muted-foreground)]">Technical operations monitoring</p>
      </div>

      {/* Overall Status */}
      <Card className="p-5 border-green-500/30 bg-green-500/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
            <span className="font-semibold text-lg">All Systems Operational</span>
          </div>
          <div className="text-[var(--color-muted-foreground)]">
            Uptime: <span className="text-green-500 font-medium">99.9% (30d)</span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cron Jobs */}
        <Card className="p-5">
          <h3 className="font-semibold mb-4">Cron Jobs</h3>
          <div className="space-y-3">
            {cronJobs.map((job, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-secondary)]/50">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${job.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="font-medium">{job.name}</span>
                </div>
                <div className="text-xs text-[var(--color-muted-foreground)] text-right">
                  <div>Last: {job.lastRun}</div>
                  <div>Next: {job.nextRun}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* API Health */}
        <Card className="p-5">
          <h3 className="font-semibold mb-4">API Endpoints</h3>
          <div className="space-y-3">
            {[
              { name: '/api/tasks', status: 'healthy', latency: 45 },
              { name: '/api/agents', status: 'healthy', latency: 120 },
              { name: '/api/costs', status: 'degraded', latency: 380 },
              { name: '/api/proposals', status: 'healthy', latency: 25 },
            ].map((endpoint, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-secondary)]/50">
                <div className="flex items-center gap-3">
                  <Server size={16} className="text-[var(--color-muted-foreground)]" />
                  <span className="font-mono text-sm">{endpoint.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs ${
                    endpoint.latency < 100 ? 'text-green-500' : 
                    endpoint.latency < 300 ? 'text-yellow-500' : 'text-red-500'
                  }`}>
                    {endpoint.latency}ms
                  </span>
                  <div className={`w-2 h-2 rounded-full ${
                    endpoint.status === 'healthy' ? 'bg-green-500' : 'bg-yellow-500'
                  }`}></div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Guard Rails Status */}
      <Card className="p-5">
        <h3 className="font-semibold mb-4">Guard Rails</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-green-500/10 text-center">
            <div className="text-lg font-bold text-green-500">$5.45</div>
            <div className="text-xs text-[var(--color-muted-foreground)]">Today's Spend</div>
            <div className="text-xs text-green-500">55% of $10 limit</div>
          </div>
          <div className="p-3 rounded-lg bg-green-500/10 text-center">
            <div className="text-lg font-bold text-green-500">5</div>
            <div className="text-xs text-[var(--color-muted-foreground)]">Concurrent</div>
            <div className="text-xs text-green-500">At limit</div>
          </div>
          <div className="p-3 rounded-lg bg-yellow-500/10 text-center">
            <div className="text-lg font-bold text-yellow-500">3</div>
            <div className="text-xs text-[var(--color-muted-foreground)]">Pending</div>
            <div className="text-xs text-yellow-500">15 max</div>
          </div>
          <div className="p-3 rounded-lg bg-green-500/10 text-center">
            <div className="text-lg font-bold text-green-500">OFF</div>
            <div className="text-xs text-[var(--color-muted-foreground)]">Emergency Stop</div>
            <div className="text-xs text-green-500">System active</div>
          </div>
        </div>
      </Card>
    </div>
  )
}

function KanbanView() {
  const columns = [
    { key: 'backlog', title: 'Backlog', color: 'gray', count: kanbanTasks.backlog.length },
    { key: 'inProgress', title: 'In Progress', color: 'blue', count: kanbanTasks.inProgress.length },
    { key: 'blocked', title: 'Blocked', color: 'yellow', count: kanbanTasks.blocked.length },
    { key: 'completed', title: 'Completed', color: 'green', count: kanbanTasks.completed.length },
  ]

  const colorClasses = {
    gray: 'bg-gray-900/30 border-gray-700',
    blue: 'bg-blue-900/20 border-blue-700',
    yellow: 'bg-yellow-900/20 border-yellow-700',
    green: 'bg-green-900/20 border-green-700',
  }

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="text-blue-500" />
          My Work Board
        </h2>
        <p className="text-[var(--color-muted-foreground)]">Track tasks across all projects</p>
      </div>

      <div className="grid grid-cols-4 gap-4 h-[calc(100vh-200px)]">
        {columns.map(col => (
          <div key={col.key} className={`border rounded-xl p-3 ${colorClasses[col.color]} flex flex-col`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">{col.title}</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-secondary)]">
                {col.count}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {kanbanTasks[col.key].map(task => (
                <div key={task.id} className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg p-3 hover:border-[var(--color-primary)]/50 transition-colors">
                  <p className="text-sm font-medium">{task.title}</p>
                  <div className="flex items-center justify-between mt-2">
                    <Badge variant={task.priority === 'high' ? 'error' : task.priority === 'medium' ? 'warning' : 'outline'}>
                      {task.priority}
                    </Badge>
                    {task.agent && (
                      <span className="text-xs text-[var(--color-muted-foreground)]">{task.agent}</span>
                    )}
                  </div>
                  {task.blocker && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-red-400">
                      <AlertCircle size={12} />
                      {task.blocker}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard': return <DashboardHome />;
      case 'projects': return <ProjectHealth />;
      case 'costs': return <CostIntelligence />;
      case 'decisions': return <DecisionsQueue />;
      case 'system': return <SystemHealth />;
      case 'kanban': return <KanbanView />;
      default: return <DashboardHome />;
    }
  }

  return (
    <div className="flex h-screen bg-[var(--color-background)] text-[var(--color-foreground)] overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 bg-[var(--color-card)] border-r border-[var(--color-border)] flex flex-col overflow-hidden`}>
        <div className="p-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Zap size={24} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Megatron</h1>
              <p className="text-xs text-[var(--color-muted-foreground)]">Command Center</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <SidebarItem 
            icon={LayoutDashboard} 
            label="Dashboard" 
            active={activeTab === 'dashboard'}
            onClick={() => setActiveTab('dashboard')}
          />
          <SidebarItem 
            icon={Brain} 
            label="My Work" 
            active={activeTab === 'kanban'}
            onClick={() => setActiveTab('kanban')}
            count={5}
          />
          <SidebarItem 
            icon={FolderKanban} 
            label="Projects" 
            active={activeTab === 'projects'}
            onClick={() => setActiveTab('projects')}
            count={4}
          />
          <SidebarItem 
            icon={DollarSign} 
            label="Costs" 
            active={activeTab === 'costs'}
            onClick={() => setActiveTab('costs')}
          />
          <SidebarItem 
            icon={ClipboardList} 
            label="Decisions" 
            active={activeTab === 'decisions'}
            onClick={() => setActiveTab('decisions')}
            count={3}
          />
          <SidebarItem 
            icon={Activity} 
            label="System" 
            active={activeTab === 'system'}
            onClick={() => setActiveTab('system')}
          />
        </nav>

        <div className="p-4 border-t border-[var(--color-border)]">
          <div className="flex items-center gap-3 text-sm text-[var(--color-muted-foreground)]">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span>System Online</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-[var(--color-card)] border-b border-[var(--color-border)] flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-[var(--color-secondary)] rounded-lg text-[var(--color-muted-foreground)] transition-colors"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h2 className="text-xl font-semibold capitalize">
              {activeTab === 'kanban' ? "My Work" : activeTab}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[var(--color-muted-foreground)]">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
              M
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-[var(--color-background)]">
          {renderContent()}
        </div>
      </main>
    </div>
  )
}

export default App
