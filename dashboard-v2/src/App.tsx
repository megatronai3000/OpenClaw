import { useState, useEffect } from 'react'
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
  Minus,
  Bot,
  Users
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'

// API Base URL
const API_BASE = 'http://localhost:3001/api';

// Color palette
const COLORS = {
  primary: '#3b82f6',
  success: '#22c55e',
  warning: '#eab308',
  error: '#ef4444',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
  pink: '#ec4899',
}

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

// Fetch helpers
async function fetchJSON(url) {
  const res = await fetch(url);
  return res.json();
}

function DashboardHome() {
  const [refreshing, setRefreshing] = useState(false)
  const [costData, setCostData] = useState([])
  const [guardrails, setGuardrails] = useState(null)
  const [autoexec, setAutoexec] = useState(null)
  const [agents, setAgents] = useState(null)
  
  const loadData = async () => {
    try {
      const [gr, ae, ag] = await Promise.all([
        fetchJSON(`${API_BASE}/guardrails/stats`),
        fetchJSON(`${API_BASE}/autoexec/status`),
        fetchJSON(`${API_BASE}/agents-v2`),
      ])
      setGuardrails(gr.stats)
      setAutoexec(ae)
      setAgents(ag.teamStatus)
      
      // Mock cost data (would come from /api/costs)
      setCostData([
        { date: 'Mon', cost: 12, tokens: 2500 },
        { date: 'Tue', cost: 15, tokens: 3200 },
        { date: 'Wed', cost: 8, tokens: 1800 },
        { date: 'Thu', cost: 18, tokens: 4100 },
        { date: 'Fri', cost: 14, tokens: 3000 },
        { date: 'Sat', cost: 6, tokens: 1200 },
        { date: 'Sun', cost: 9, tokens: 2000 },
      ])
    } catch (e) {
      console.error('Error loading data:', e)
    }
  }
  
  useEffect(() => {
    loadData()
  }, [])
  
  const handleRefresh = () => {
    setRefreshing(true)
    loadData()
    setTimeout(() => setRefreshing(false), 1000)
  }

  const todaySpend = guardrails?.todaySpend || 5.45
  const dailyLimit = guardrails?.dailyLimit || 10

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
              <p className="text-3xl font-bold mt-1">{autoexec?.queueStats?.executing || 0}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <BarChart3 className="text-blue-500" size={24} />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-sm text-green-500">
            <ArrowUpRight size={14} />
            <span>{autoexec?.queueStats?.completed || 0} completed</span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-muted-foreground)]">Team Agents</p>
              <p className="text-3xl font-bold mt-1">4</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Users className="text-purple-500" size={24} />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <Bot size={14} className="text-purple-500" />
            <span className="text-[var(--color-muted-foreground)]">Scout, Petty, Architect</span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-muted-foreground)]">Daily Cost</p>
              <p className="text-3xl font-bold mt-1">${todaySpend.toFixed(2)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <DollarSign className="text-green-500" size={24} />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-sm text-green-500">
            <Minus size={14} />
            <span>{((todaySpend/dailyLimit)*100).toFixed(0)}% of ${dailyLimit} limit</span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-muted-foreground)]">Monthly Total</p>
              <p className="text-3xl font-bold mt-1">${(guardrails?.monthSpend || 52).toFixed(2)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <TrendingUp className="text-cyan-500" size={24} />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-sm text-[var(--color-muted-foreground)]">
            <Minus size={14} />
            <span>{((guardrails?.monthSpend || 52)/(guardrails?.monthlyCap || 100)*100).toFixed(0)}% of budget</span>
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
              <Line type="monotone" dataKey="cost" stroke={COLORS.primary} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold mb-4">Task Queue</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-secondary)]/50">
              <span className="text-sm">Pending Approval</span>
              <Badge variant="warning">{autoexec?.queueStats?.pending || 0}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-secondary)]/50">
              <span className="text-sm">Approved</span>
              <Badge variant="default">{autoexec?.queueStats?.approved || 0}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-secondary)]/50">
              <span className="text-sm">Executing</span>
              <Badge variant="success">{autoexec?.queueStats?.executing || 0}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-secondary)]/50">
              <span className="text-sm">Completed</span>
              <Badge variant="secondary">{autoexec?.queueStats?.completed || 0}</Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Guard Rails Status */}
      <Card className="p-5">
        <h3 className="font-semibold mb-4">Guard Rails Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`p-3 rounded-lg text-center ${guardrails?.emergencyStop ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
            <div className="text-lg font-bold">{guardrails?.emergencyStop ? 'STOPPED' : 'ACTIVE'}</div>
            <div className="text-xs text-[var(--color-muted-foreground)]">System</div>
          </div>
          <div className="p-3 rounded-lg bg-green-500/20 text-center">
            <div className="text-lg font-bold">{guardrails?.concurrentTasks || 0}/{guardrails?.maxConcurrent || 5}</div>
            <div className="text-xs text-[var(--color-muted-foreground)]">Concurrent</div>
          </div>
          <div className="p-3 rounded-lg bg-green-500/20 text-center">
            <div className="text-lg font-bold">{guardrails?.pendingDecisions || 0}/{guardrails?.maxPending || 15}</div>
            <div className="text-xs text-[var(--color-muted-foreground)]">Pending</div>
          </div>
          <div className="p-3 rounded-lg bg-green-500/20 text-center">
            <div className="text-lg font-bold">${guardrails?.todaySpend?.toFixed(2) || 0}</div>
            <div className="text-xs text-[var(--color-muted-foreground)]">Today's Spend</div>
          </div>
        </div>
      </Card>
    </div>
  )
}

function DecisionsQueue() {
  const [decisions, setDecisions] = useState([])
  const [loading, setLoading] = useState(true)
  
  const loadDecisions = async () => {
    try {
      const data = await fetchJSON(`${API_BASE}/proposals?status=pending`)
      setDecisions(data.proposals || [])
    } catch (e) {
      console.error('Error:', e)
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    loadDecisions()
  }, [])
  
  const handleApprove = async (id) => {
    await fetch(`${API_BASE}/proposals/${id}/approve`, { method: 'POST' })
    loadDecisions()
  }
  
  const handleReject = async (id) => {
    await fetch(`${API_BASE}/proposals/${id}/reject`, { method: 'POST' })
    loadDecisions()
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            Decisions
            <Badge variant="default">{decisions.length}</Badge>
          </h2>
          <p className="text-[var(--color-muted-foreground)]">Review and approve agent requests</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadDecisions}>
          <RefreshCw size={14} className="mr-2" />
          Refresh
        </Button>
      </div>

      {/* Decision Cards */}
      <div className="space-y-4">
        {loading ? (
          <Card className="p-5 text-center text-[var(--color-muted-foreground)]">
            Loading decisions...
          </Card>
        ) : decisions.length === 0 ? (
          <Card className="p-8 text-center">
            <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
            <p className="text-lg font-medium">All caught up!</p>
            <p className="text-[var(--color-muted-foreground)]">No pending decisions</p>
          </Card>
        ) : (
          decisions.map(decision => (
            <Card key={decision.id} className="p-5 border-l-4 border-l-blue-500">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="default">{decision.type || 'proposal'}</Badge>
                  <span className="text-xs text-[var(--color-muted-foreground)]">
                    {new Date(decision.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
              
              <h3 className="font-semibold mb-2">{decision.taskDescription?.substring(0, 100)}...</h3>
              
              <div className="flex items-center gap-4 text-sm text-[var(--color-muted-foreground)] mb-4">
                {decision.estimatedCost && (
                  <span className="flex items-center gap-1">
                    <DollarSign size={14} /> ${decision.estimatedCost}
                  </span>
                )}
                {decision.estimatedTime && (
                  <span className="flex items-center gap-1">
                    <Clock size={14} /> {decision.estimatedTime}
                  </span>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button variant="success" size="sm" className="gap-1" onClick={() => handleApprove(decision.id)}>
                  <CheckCircle2 size={14} /> Approve
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleReject(decision.id)}>
                  Reject
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

function AgentsView() {
  const [agents, setAgents] = useState(null)
  const [loading, setLoading] = useState(true)
  
  const loadAgents = async () => {
    try {
      const data = await fetchJSON(`${API_BASE}/agents-v2`)
      setAgents(data)
    } catch (e) {
      console.error('Error:', e)
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    loadAgents()
  }, [])
  
  const agentConfigs = agents?.agents || {}
  const teamStatus = agents?.teamStatus || { byType: {} }

  const agentCards = [
    { key: 'megatron', name: 'Megatron', role: 'Chief of Staff', desc: 'Coordination, proposals, management', color: COLORS.success },
    { key: 'scout', name: 'Scout', role: 'Research', desc: 'Market analysis, competitive intel', color: COLORS.purple },
    { key: 'petty', name: 'Petty', role: 'Design', desc: 'UI/UX, visual assets, prototypes', color: COLORS.pink },
    { key: 'architect', name: 'Architect', role: 'Development', desc: 'Full-stack code implementation', color: COLORS.primary },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <Users className="text-blue-500" />
          Agent Team
        </h2>
        <p className="text-[var(--color-muted-foreground)]">Meet your autonomous agents</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agentCards.map(agent => (
          <Card key={agent.key} className="p-5">
            <div className="flex items-start gap-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${agent.color}20` }}
              >
                <Bot size={24} style={{ color: agent.color }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{agent.name}</h3>
                  <Badge variant={teamStatus.byType[agent.key] > 0 ? 'success' : 'secondary'}>
                    {teamStatus.byType[agent.key] || 0} active
                  </Badge>
                </div>
                <p className="text-sm text-[var(--color-muted-foreground)]">{agent.role}</p>
                <p className="text-sm text-[var(--color-muted-foreground)] mt-2">{agent.desc}</p>
                {agentConfigs[agent.key] && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {agentConfigs[agent.key].capabilities?.slice(0, 4).map(cap => (
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

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard': return <DashboardHome />;
      case 'decisions': return <DecisionsQueue />;
      case 'agents': return <AgentsView />;
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

        <div className="p-4 border-t border-[var(--color-border)]">
          <div className="flex items-center gap-3 text-sm text-[var(--color-muted-foreground)]">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span>Auto-Exec Active</span>
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
              {activeTab}
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
