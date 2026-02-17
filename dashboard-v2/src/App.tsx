import { useState, useEffect } from 'react'
import { 
  LayoutDashboard, 
  Kanban, 
  FolderKanban, 
  ClipboardList,
  Users, 
  Menu, 
  X, 
  Zap, 
  Activity,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  ArrowUpRight,
  Minus,
  Bot,
  BarChart3,
  TrendingUp,
  Server,
  Play,
  Pause
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'

const API_BASE = 'http://localhost:3001/api'

// shadCN Components
const Card = ({ children, className = '' }) => (
  <div className={`rounded-xl border bg-card text-card-foreground shadow ${className}`}>
    {children}
  </div>
)

const Badge = ({ children, variant = 'default' }) => {
  const variants = {
    default: 'bg-primary text-primary-foreground',
    success: 'bg-green-500/20 text-green-500 border-green-500/30',
    warning: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30', 
    destructive: 'bg-red-500/20 text-red-500 border-red-500/30',
    secondary: 'bg-secondary text-secondary-foreground',
    outline: 'border border-border text-muted-foreground',
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${variants[variant]}`}>
      {children}
    </span>
  )
}

const Button = ({ children, variant = 'default', size = 'default', className = '', ...props }) => {
  const variants = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    success: 'bg-green-600 text-white hover:bg-green-700',
  }
  const sizes = {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 rounded-md px-3',
    lg: 'h-11 rounded-md px-8',
  }
  return (
    <button className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  )
}

const SidebarItem = ({ icon: Icon, label, active, onClick, count }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      active 
        ? 'bg-primary text-primary-foreground' 
        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
    }`}
  >
    <Icon size={18} />
    <span className="flex-1">{label}</span>
    {count > 0 && (
      <span className={`text-xs px-2 py-0.5 rounded-full ${
        active ? 'bg-white/20' : 'bg-secondary'
      }`}>
        {count}
      </span>
    )}
  </button>
)

// Fetch helper
async function fetchAPI(endpoint) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`)
    return await res.json()
  } catch (e) {
    console.error('API Error:', e)
    return null
  }
}

// Dashboard View
function Dashboard() {
  const [executive, setExecutive] = useState(null)
  const [costs, setCosts] = useState(null)
  const [guardrails, setGuardrails] = useState(null)
  const [proposals, setProposals] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    const [exec, cost, guard, props] = await Promise.all([
      fetchAPI('/executive/summary'),
      fetchAPI('/costs/by-provider'),
      fetchAPI('/guardrails/stats'),
      fetchAPI('/proposals?limit=10')
    ])
    setExecutive(exec)
    setCosts(cost)
    setGuardrails(guard?.stats)
    setProposals(props?.proposals || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [])

  if (loading && !executive) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    )
  }

  const metrics = executive?.metrics || {}
  const budget = metrics.budget || {}
  const tasks = metrics.tasks || {}
  const agents = metrics.agents || {}

  // Transform cost data for chart
  const costChartData = costs?.byProvider?.slice(0, 7).reverse().map(p => ({
    date: p.date?.slice(5) || '',
    cost: Number(p.total.toFixed(2))
  })) || []

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Your autonomous agency at a glance</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw size={16} className="mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between space-x-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Today's Spend</p>
              <p className="text-2xl font-bold">{budget.spentDisplay || '$0.00'}</p>
            </div>
            <div className="p-3 rounded-full bg-primary/10">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-muted-foreground">
            <span className="mr-2">{budget.percentage?.toFixed(0) || 0}% of daily limit</span>
            <ProgressBar value={budget.percentage || 0} />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between space-x-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Monthly Total</p>
              <p className="text-2xl font-bold">${budget.monthlySpent?.toFixed(2) || '0.00'}</p>
            </div>
            <div className="p-3 rounded-full bg-green-500/10">
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-muted-foreground">
            <span className="mr-2">${budget.monthlyRemaining?.toFixed(2) || 0} remaining</span>
            <ProgressBar value={budget.percentage || 0} />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between space-x-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Tasks</p>
              <p className="text-2xl font-bold">{tasks.completedToday || 0} today</p>
            </div>
            <div className="p-3 rounded-full bg-blue-500/10">
              <CheckCircle2 className="h-5 w-5 text-blue-500" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-muted-foreground">
            <span>{tasks.pending || 0} pending</span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between space-x-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Agents</p>
              <p className="text-2xl font-bold">{agents.total || 0}</p>
            </div>
            <div className="p-3 rounded-full bg-purple-500/10">
              <Bot className="h-5 w-5 text-purple-500" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs text-muted-foreground">
            <Badge variant={agents.working > 0 ? 'success' : 'secondary'}>
              {agents.working || 0} working
            </Badge>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Cost Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={costChartData}>
              <defs>
                <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--color-card)', 
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px'
                }} 
              />
              <Area type="monotone" dataKey="cost" stroke="#3b82f6" fillOpacity={1} fill="url(#costGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">System Health</span>
              <Badge variant={executive?.health?.overall === 'healthy' ? 'success' : 'warning'}>
                {executive?.health?.overall || 'unknown'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Data Quality</span>
              <Badge variant={budget.dataQuality === 'REAL' ? 'success' : 'secondary'}>
                {budget.dataQuality || 'N/A'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Projects Active</span>
              <span className="font-medium">{metrics.projects?.active || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Auto-Exec Running</span>
              <Badge variant="success">Active</Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Guard Rails & Recent */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Guard Rails</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Daily Budget</span>
              <div className="flex items-center gap-2">
                <ProgressBar value={(guardrails?.todaySpend / guardrails?.dailyLimit) * 100 || 0} />
                <span className="text-sm font-medium">${guardrails?.todaySpend?.toFixed(2) || 0}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Concurrent Tasks</span>
              <span className="text-sm font-medium">{guardrails?.concurrentTasks || 0} / {guardrails?.maxConcurrent || 5}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Pending Decisions</span>
              <span className="text-sm font-medium">{guardrails?.pendingDecisions || 0} / {guardrails?.maxPending || 15}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Emergency Stop</span>
              <Badge variant={guardrails?.emergencyStop ? 'destructive' : 'success'}>
                {guardrails?.emergencyStop ? 'ACTIVE' : 'OFF'}
              </Badge>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Proposals</h3>
          <div className="space-y-2">
            {proposals.slice(0, 4).map(p => (
              <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.taskDescription?.slice(0, 40) || 'No description'}</p>
                  <p className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString()}</p>
                </div>
                <Badge variant={
                  p.status === 'completed' ? 'success' : 
                  p.status === 'approved' ? 'default' :
                  p.status === 'pending' ? 'warning' :
                  p.status === 'rejected' ? 'destructive' : 'secondary'
                }>
                  {p.status}
                </Badge>
              </div>
            ))}
            {proposals.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No proposals yet</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

function ProgressBar({ value }) {
  return (
    <div className="h-2 w-24 rounded-full bg-secondary overflow-hidden">
      <div 
        className="h-full bg-primary transition-all" 
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  )
}

// Decisions View
function Decisions() {
  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(true)

  const loadProposals = async () => {
    const data = await fetchAPI('/proposals')
    setProposals(data.proposals || [])
    setLoading(false)
  }

  useEffect(() => { loadProposals() }, [])

  const handleApprove = async (id) => {
    await fetch(`${API_BASE}/proposals/${id}/approve`, { method: 'POST' })
    loadProposals()
  }

  const handleReject = async (id) => {
    await fetch(`${API_BASE}/proposals/${id}/reject`, { method: 'POST' })
    loadProposals()
  }

  const pending = proposals.filter(p => p.status === 'pending')

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Decisions</h2>
          <p className="text-muted-foreground">Review and approve proposals</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadProposals}>
          <RefreshCw size={16} className="mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        <Card className="p-4 flex-1">
          <div className="text-2xl font-bold text-yellow-500">{pending.length}</div>
          <div className="text-sm text-muted-foreground">Pending</div>
        </Card>
        <Card className="p-4 flex-1">
          <div className="text-2xl font-bold text-green-500">{proposals.filter(p => p.status === 'completed').length}</div>
          <div className="text-sm text-muted-foreground">Completed</div>
        </Card>
        <Card className="p-4 flex-1">
          <div className="text-2xl font-bold text-red-500">{proposals.filter(p => p.status === 'rejected').length}</div>
          <div className="text-sm text-muted-foreground">Rejected</div>
        </Card>
      </div>

      {/* Proposal List */}
      <div className="space-y-4">
        {loading ? (
          <Card className="p-8 text-center">
            <RefreshCw className="animate-spin h-6 w-6 mx-auto text-muted-foreground" />
          </Card>
        ) : pending.length === 0 ? (
          <Card className="p-8 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <p className="text-lg font-medium">All caught up!</p>
            <p className="text-muted-foreground">No pending decisions</p>
          </Card>
        ) : (
          pending.map(proposal => (
            <Card key={proposal.id} className="p-6 border-l-4 border-l-primary">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="warning">{proposal.status}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(proposal.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="font-medium">{proposal.taskDescription}</p>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    {proposal.estimatedCost && <span>Est. ${proposal.estimatedCost}</span>}
                    {proposal.estimatedTime && <span>{proposal.estimatedTime}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="success" onClick={() => handleApprove(proposal.id)}>
                    Approve
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleReject(proposal.id)}>
                    Reject
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

// Agents View
function Agents() {
  const [agents, setAgents] = useState(null)

  useEffect(() => {
    fetchAPI('/agents-v2').then(setAgents)
  }, [])

  const agentList = [
    { key: 'megatron', name: 'Megatron', role: 'Chief of Staff', color: 'text-green-500', bg: 'bg-green-500/10', desc: 'Coordination, proposals, management' },
    { key: 'scout', name: 'Scout', role: 'Research', color: 'text-purple-500', bg: 'bg-purple-500/10', desc: 'Market analysis, competitive intel' },
    { key: 'petty', name: 'Petty', role: 'Design', color: 'text-pink-500', bg: 'bg-pink-500/10', desc: 'UI/UX, visual assets' },
    { key: 'architect', name: 'Architect', role: 'Development', color: 'text-blue-500', bg: 'bg-blue-500/10', desc: 'Full-stack code implementation' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Agent Team</h2>
        <p className="text-muted-foreground">Your autonomous workforce</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {agentList.map(agent => (
          <Card key={agent.key} className="p-6">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${agent.bg}`}>
                <Bot className={`h-6 w-6 ${agent.color}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{agent.name}</h3>
                  <Badge variant={agents?.teamStatus?.byType?.[agent.key] > 0 ? 'success' : 'secondary'}>
                    {agents?.teamStatus?.byType?.[agent.key] || 0} active
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{agent.role}</p>
                <p className="text-sm text-muted-foreground mt-2">{agent.desc}</p>
                {agents?.agents?.[agent.key] && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {agents.agents[agent.key].capabilities?.slice(0, 4).map(cap => (
                      <Badge key={cap} variant="outline" className="text-xs">{cap}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// Main App
function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 border-r bg-card flex flex-col overflow-hidden`}>
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold">Megatron</h1>
              <p className="text-xs text-muted-foreground">Command Center</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <SidebarItem 
            icon={LayoutDashboard} 
            label="Dashboard" 
            active={activeTab === 'dashboard'}
            onClick={() => setActiveTab('dashboard')}
          />
          <SidebarItem 
            icon={ClipboardList} 
            label="Decisions" 
            active={activeTab === 'decisions'}
            onClick={() => setActiveTab('decisions')}
          />
          <SidebarItem 
            icon={Users} 
            label="Agents" 
            active={activeTab === 'agents'}
            onClick={() => setActiveTab('agents')}
          />
        </nav>

        <div className="p-4 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span>System Online</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b bg-card flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-accent"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h2 className="font-semibold capitalize">{activeTab}</h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
              M
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-background">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'decisions' && <Decisions />}
          {activeTab === 'agents' && <Agents />}
        </div>
      </main>
    </div>
  )
}

export default App
