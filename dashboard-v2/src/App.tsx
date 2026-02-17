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
  MoreHorizontal
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

// Mock data
const costData = [
  { date: 'Mon', cost: 12 },
  { date: 'Tue', cost: 15 },
  { date: 'Wed', cost: 8 },
  { date: 'Thu', cost: 18 },
  { date: 'Fri', cost: 14 },
  { date: 'Sat', cost: 6 },
  { date: 'Sun', cost: 9 },
]

const projectData = [
  { id: 1, name: 'OpenClaw', status: 'active', priority: 'hot', health: 'good', progress: 88 },
  { id: 2, name: 'DeFi Portfolio', status: 'active', priority: 'hot', health: 'at-risk', progress: 45 },
  { id: 3, name: 'DDI', status: 'planning', priority: 'warm', health: 'good', progress: 15 },
  { id: 4, name: 'Consulting', status: 'active', priority: 'hot', health: 'good', progress: 60 },
]

const decisionsData = [
  { id: 1, type: 'proposal', priority: 'critical', title: 'Expand Agent Team with DevOps Agent', cost: '$50/mo', time: '2h ago' },
  { id: 2, type: 'budget', priority: 'high', title: 'Increase daily budget to $15', cost: '+$150/mo', time: '5h ago' },
  { id: 3, type: 'escalation', priority: 'medium', title: 'Approve parallel execution for weekend', cost: '$0', time: '1d ago' },
]

const cronJobs = [
  { name: 'Morning Report', status: 'success', lastRun: '7:00 AM', nextRun: '5:00 PM' },
  { name: 'Evening Report', status: 'success', lastRun: '5:00 PM', nextRun: '7:00 AM' },
  { name: 'Team Standup', status: 'success', lastRun: '9:00 AM', nextRun: 'Tomorrow' },
  { name: 'Memory Curation', status: 'failed', lastRun: '11:00 PM Sun', nextRun: 'Sunday' },
]

const SidebarItem = ({ icon: Icon, label, active, onClick, count }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
      active 
        ? 'bg-primary text-primary-foreground' 
        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
    {count > 0 && (
      <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
        active ? 'bg-white/20' : 'bg-secondary text-secondary-foreground'
      }`}>
        {count}
      </span>
    )}
  </button>
)

function ProjectHealth() {
  const getHealthColor = (health) => {
    switch(health) {
      case 'good': return 'bg-green-500'
      case 'at-risk': return 'bg-yellow-500'
      case 'critical': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }
  
  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'hot': return 'border-l-red-500'
      case 'warm': return 'border-l-yellow-500'
      case 'cold': return 'border-l-gray-500'
      default: return 'border-l-gray-500'
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Project Health Dashboard</h2>
        <p className="text-muted-foreground">Portfolio overview with health indicators</p>
      </div>
      
      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-sm text-muted-foreground">Portfolio Healthy</span>
          </div>
          <div className="text-2xl font-bold">5 Active</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
            <span className="text-sm text-muted-foreground">At Risk</span>
          </div>
          <div className="text-2xl font-bold">1</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span className="text-sm text-muted-foreground">Critical</span>
          </div>
          <div className="text-2xl font-bold">0</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span className="text-sm text-muted-foreground">Planning</span>
          </div>
          <div className="text-2xl font-bold">1</div>
        </div>
      </div>

      {/* Project Grid */}
      <div className="grid grid-cols-2 gap-4">
        {projectData.map(project => (
          <div key={project.id} className={`bg-card border border-border rounded-lg p-4 border-l-4 ${getPriorityColor(project.priority)}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FolderKanban size={18} className="text-primary" />
                <span className="font-semibold">{project.name}</span>
              </div>
              <div className="flex gap-2">
                <span className={`text-xs px-2 py-0.5 rounded ${
                  project.status === 'active' ? 'bg-green-500/20 text-green-500' : 'bg-secondary text-muted-foreground'
                }`}>
                  {project.status}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  project.priority === 'hot' ? 'bg-red-500/20 text-red-500' : 'bg-yellow-500/20 text-yellow-500'
                }`}>
                  {project.priority}
                </span>
              </div>
            </div>
            <div className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Health</span>
                <span className={getHealthColor(project.health)}>{project.health}</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all" 
                  style={{ width: `${project.progress}%` }}
                ></div>
              </div>
              <div className="text-right text-sm text-muted-foreground mt-1">{project.progress}%</div>
            </div>
            <div className="flex gap-2">
              <button className="text-xs px-3 py-1 bg-secondary rounded hover:bg-accent">View</button>
              <button className="text-xs px-3 py-1 bg-secondary rounded hover:bg-accent">Actions</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CostIntelligence() {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Cost Intelligence</h2>
          <p className="text-muted-foreground">Financial oversight with burn rate visualization</p>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1 text-sm bg-secondary rounded">24H</button>
          <button className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded">7D</button>
          <button className="px-3 py-1 text-sm bg-secondary rounded">30D</button>
        </div>
      </div>

      {/* Alert */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-6 flex items-center gap-2">
        <AlertCircle size={18} className="text-yellow-500" />
        <span className="text-yellow-600">Budget Alert: You've used 65% of monthly budget</span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-orange-500/20 rounded-lg p-4 bg-gradient-to-br from-orange-500/10 to-orange-600/5">
          <div className="text-sm text-muted-foreground mb-1">Daily Burn</div>
          <div className="text-3xl font-bold">$12.45</div>
          <div className="text-sm text-orange-500">↑ 15% vs avg</div>
        </div>
        <div className="bg-card border border-purple-500/20 rounded-lg p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/5">
          <div className="text-sm text-muted-foreground mb-1">Weekly Burn</div>
          <div className="text-3xl font-bold">$87.15</div>
          <div className="text-sm text-green-500">On track</div>
        </div>
        <div className="bg-card border border-amber-500/20 rounded-lg p-4 bg-gradient-to-br from-amber-500/10 to-amber-600/5">
          <div className="text-sm text-muted-foreground mb-1">Projected Monthly</div>
          <div className="text-3xl font-bold">$375.00</div>
          <div className="text-sm text-yellow-500">⚠ Over budget</div>
        </div>
        <div className="bg-card border border-green-500/20 rounded-lg p-4 bg-gradient-to-br from-green-500/10 to-green-600/5">
          <div className="text-sm text-muted-foreground mb-1">Budget Remaining</div>
          <div className="text-3xl font-bold">$125.00</div>
          <div className="text-sm text-muted-foreground">35% left</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-semibold mb-4">Burn Rate Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={costData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none' }} />
              <Line type="monotone" dataKey="cost" stroke="#3B82F6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-semibold mb-4">Cost by Project</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={projectData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none' }} />
              <Bar dataKey="progress" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function DecisionsQueue() {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            Decisions Pending
            <span className="text-sm px-2 py-0.5 bg-primary text-primary-foreground rounded-full">{decisionsData.length}</span>
          </h2>
          <p className="text-muted-foreground">Approve, reject, or defer agent requests</p>
        </div>
        <div className="flex gap-2">
          <select className="bg-secondary border border-border rounded px-3 py-1 text-sm">
            <option>All</option>
            <option>Critical</option>
            <option>High</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-red-500/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-500">2</div>
          <div className="text-xs text-muted-foreground">Critical</div>
        </div>
        <div className="bg-card border border-orange-500/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-orange-500">1</div>
          <div className="text-xs text-muted-foreground">High</div>
        </div>
        <div className="bg-card border border-yellow-500/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-yellow-500">1</div>
          <div className="text-xs text-muted-foreground">Medium</div>
        </div>
        <div className="bg-card border border-blue-500/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-500">0</div>
          <div className="text-xs text-muted-foreground">Low</div>
        </div>
      </div>

      {/* Decision Cards */}
      <div className="space-y-4">
        {decisionsData.map(decision => (
          <div 
            key={decision.id} 
            className={`bg-card border border-border rounded-lg p-4 border-l-4 ${
              decision.priority === 'critical' ? 'border-l-red-500' :
              decision.priority === 'high' ? 'border-l-orange-500' :
              'border-l-yellow-500'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded ${
                  decision.priority === 'critical' ? 'bg-red-500/20 text-red-500' :
                  decision.priority === 'high' ? 'bg-orange-500/20 text-orange-500' :
                  'bg-yellow-500/20 text-yellow-500'
                }`}>
                  {decision.priority.toUpperCase()}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                  {decision.type}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">{decision.time}</span>
            </div>
            <h3 className="font-semibold mb-2">{decision.title}</h3>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
              <span>💰 {decision.cost}</span>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded flex items-center gap-1">
                <CheckCircle2 size={14} /> Approve
              </button>
              <button className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded flex items-center gap-1">
                Reject
              </button>
              <button className="px-3 py-1.5 text-sm border border-border hover:bg-secondary rounded flex items-center gap-1">
                <Clock size={14} /> Defer
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SystemHealth() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Activity size={24} className="text-green-500" />
          System Health
        </h2>
        <p className="text-muted-foreground">Technical operations monitoring</p>
      </div>

      {/* Overall Status */}
      <div className="bg-card border border-green-500/30 rounded-lg p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
          <span className="font-semibold">All Systems Operational</span>
        </div>
        <div className="text-muted-foreground">Uptime: 99.9% (30d)</div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Cron Jobs */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-semibold mb-4">Cron Jobs</h3>
          <div className="space-y-3">
            {cronJobs.map((job, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded hover:bg-secondary">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${job.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm">{job.name}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  <div>Last: {job.lastRun}</div>
                  <div>Next: {job.nextRun}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* API Health */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-semibold mb-4">API Health</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-sm">/api/tasks</span>
              </div>
              <span className="text-xs text-green-500">45ms</span>
            </div>
            <div className="flex items-center justify-between p-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-sm">/api/agents</span>
              </div>
              <span className="text-xs text-green-500">120ms</span>
            </div>
            <div className="flex items-center justify-between p-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                <span className="text-sm">/api/costs</span>
              </div>
              <span className="text-xs text-yellow-500">380ms</span>
            </div>
            <div className="flex items-center justify-between p-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-sm">/ws/realtime</span>
              </div>
              <span className="text-xs text-green-500">25ms</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function KanbanView() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Brain size={24} className="text-blue-400" />
          Megatron's Work Board
        </h2>
        <p className="text-muted-foreground">Track what I'm working on</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {/* Backlog */}
        <div className="bg-gray-900/30 border border-gray-700 rounded-xl p-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Backlog</h3>
            <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">3</span>
          </div>
          <div className="space-y-2">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
              <p className="text-sm">Research DeFi yield opportunities</p>
              <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded mt-2 inline-block">medium</span>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
              <p className="text-sm">Design DDI architecture</p>
              <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded mt-2 inline-block">medium</span>
            </div>
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-blue-900/10 border border-blue-700 rounded-xl p-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">In Progress</h3>
            <span className="text-xs bg-blue-900 text-blue-400 px-2 py-0.5 rounded-full">5</span>
          </div>
          <div className="space-y-2">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
              <p className="text-sm">Auto-Approval Rules Engine</p>
              <span className="text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded mt-2 inline-block">high</span>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
              <p className="text-sm">WebSocket Architecture</p>
              <span className="text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded mt-2 inline-block">high</span>
            </div>
          </div>
        </div>

        {/* Blocked */}
        <div className="bg-yellow-900/10 border border-yellow-700 rounded-xl p-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Blocked</h3>
            <span className="text-xs bg-yellow-900 text-yellow-400 px-2 py-0.5 rounded-full">1</span>
          </div>
          <div className="space-y-2">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
              <p className="text-sm">DDI Stage 3 - needs scope</p>
              <div className="flex items-start gap-1 text-xs text-red-400 mt-2">
                <AlertCircle size={12} className="mt-0.5" />
                <span>Waiting for user input</span>
              </div>
            </div>
          </div>
        </div>

        {/* Completed */}
        <div className="bg-green-900/10 border border-green-700 rounded-xl p-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Completed</h3>
            <span className="text-xs bg-green-900 text-green-400 px-2 py-0.5 rounded-full">9</span>
          </div>
          <div className="space-y-2">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
              <p className="text-sm text-green-400">Ollama Setup</p>
              <span className="text-xs text-muted-foreground">2026-02-17</span>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
              <p className="text-sm text-green-400">Cron Job Audit</p>
              <span className="text-xs text-muted-foreground">2026-02-17</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DashboardHome() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Welcome to Megatron Command Center</h2>
        <p className="text-muted-foreground">Your AI agent workspace overview</p>
      </div>
      
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">Active Tasks</div>
          <div className="text-3xl font-bold">5</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">Completed Today</div>
          <div className="text-3xl font-bold">2</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">Daily Cost</div>
          <div className="text-3xl font-bold">$5.45</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">Monthly Total</div>
          <div className="text-3xl font-bold">$52.22</div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-semibold mb-4">Recent Activity</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 size={14} className="text-green-500" />
            <span>Completed: Ollama Local Models Setup</span>
            <span className="text-muted-foreground ml-auto">2m ago</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 size={14} className="text-green-500" />
            <span>Completed: Cron Job Audit</span>
            <span className="text-muted-foreground ml-auto">5m ago</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Activity size={14} className="text-blue-500" />
            <span>Running: Auto-Approval Rules Engine</span>
            <span className="text-muted-foreground ml-auto">in progress</span>
          </div>
        </div>
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
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 bg-card border-r border-border flex flex-col overflow-hidden`}>
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Zap size={24} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Megatron</h1>
              <p className="text-xs text-muted-foreground">Command Center</p>
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
            label="Project Health" 
            active={activeTab === 'projects'}
            onClick={() => setActiveTab('projects')}
            count={4}
          />
          <SidebarItem 
            icon={DollarSign} 
            label="Cost Intelligence" 
            active={activeTab === 'costs'}
            onClick={() => setActiveTab('costs')}
          />
          <SidebarItem 
            icon={Lightbulb} 
            label="Decisions" 
            active={activeTab === 'decisions'}
            onClick={() => setActiveTab('decisions')}
            count={3}
          />
          <SidebarItem 
            icon={Activity} 
            label="System Health" 
            active={activeTab === 'system'}
            onClick={() => setActiveTab('system')}
          />
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Activity size={16} className="text-green-500" />
            <span>System Online</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-secondary rounded-lg text-muted-foreground"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h2 className="text-xl font-semibold capitalize">
              {activeTab === 'kanban' ? "Megatron's Work Board" : activeTab.replace('-', ' ')}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full" />
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-background">
          {renderContent()}
        </div>
      </main>
    </div>
  )
}

export default App
