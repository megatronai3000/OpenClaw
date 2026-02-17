import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Kanban, FolderKanban, FileText, CheckSquare, Lightbulb, Menu, X, Plus, Clock, AlertCircle, CheckCircle2, Circle, TrendingUp, Calendar, Activity, Zap, Loader2, DollarSign } from 'lucide-react';
import DashboardHome from './components/DashboardHome';
import KanbanBoard from './components/KanbanBoard';
import ProjectsView from './components/ProjectsView';
import DailyReports from './components/DailyReports';
import TaskManager from './components/TaskManager';
import InsightsDashboard from './components/InsightsDashboard';
import WorkInProgress from './components/WorkInProgress';
import CostAnalytics from './components/CostAnalytics';
import { DataProvider } from './hooks/useData';

const SidebarItem = ({ icon: Icon, label, active, onClick, count }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
      active 
        ? 'bg-blue-600 text-white' 
        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
    {count > 0 && (
      <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
        active ? 'bg-white/20' : 'bg-gray-700 text-gray-300'
      }`}>
        {count}
      </span>
    )}
  </button>
);

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard': return <DashboardHome onNavigate={setActiveTab} />;
      case 'progress': return <WorkInProgress />;
      case 'kanban': return <KanbanBoard />;
      case 'projects': return <ProjectsView />;
      case 'reports': return <DailyReports />;
      case 'tasks': return <TaskManager />;
      case 'insights': return <InsightsDashboard />;
      case 'costs': return <CostAnalytics />;
      default: return <DashboardHome onNavigate={setActiveTab} />;
    }
  };

  return (
    <DataProvider>
      <div className="flex h-screen bg-gray-950 text-gray-100 font-sans overflow-hidden">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 bg-gray-900 border-r border-gray-800 flex flex-col overflow-hidden`}>
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Zap size={24} className="text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg">Megatron</h1>
                <p className="text-xs text-gray-500">Command Center</p>
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
              icon={Loader2} 
              label="Work in Progress" 
              active={activeTab === 'progress'}
              onClick={() => setActiveTab('progress')}
            />
            <SidebarItem 
              icon={Kanban} 
              label="Megatron's Work" 
              active={activeTab === 'kanban'}
              onClick={() => setActiveTab('kanban')}
              count={3}
            />
            <SidebarItem 
              icon={FolderKanban} 
              label="Projects" 
              active={activeTab === 'projects'}
              onClick={() => setActiveTab('projects')}
              count={5}
            />
            <SidebarItem 
              icon={FileText} 
              label="Daily Reports" 
              active={activeTab === 'reports'}
              onClick={() => setActiveTab('reports')}
            />
            <SidebarItem 
              icon={CheckSquare} 
              label="All Tasks" 
              active={activeTab === 'tasks'}
              onClick={() => setActiveTab('tasks')}
              count={8}
            />
            <SidebarItem 
              icon={Lightbulb} 
              label="Insights" 
              active={activeTab === 'insights'}
              onClick={() => setActiveTab('insights')}
            />
            <SidebarItem 
              icon={DollarSign} 
              label="Cost Analytics" 
              active={activeTab === 'costs'}
              onClick={() => setActiveTab('costs')}
            />
          </nav>

          <div className="p-4 border-t border-gray-800">
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <Activity size={16} className="text-green-500" />
              <span>System Online</span>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-gray-800 rounded-lg text-gray-400"
              >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <h2 className="text-xl font-semibold capitalize">
                {activeTab === 'kanban' ? "Megatron's Work Board" : activeTab.replace('-', ' ')}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </span>
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full" />
            </div>
          </header>

          {/* Content Area */}
          <div className="flex-1 overflow-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </DataProvider>
  );
}

export default App;
