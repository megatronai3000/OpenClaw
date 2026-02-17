import React from 'react';
import { ArrowRight, Clock, CheckCircle2, AlertCircle, TrendingUp, Calendar, Activity, Zap, FolderOpen } from 'lucide-react';
import { useData } from '../hooks/useData';
import AgentStatus from './AgentStatus';
import WorkloadCharts from './WorkloadCharts';
import BlockerAlert from './BlockerAlert';
import PredictiveInsights from './PredictiveInsights';

const StatCard = ({ title, value, subtitle, icon: Icon, trend, color = 'blue' }) => {
  const colors = {
    blue: 'from-blue-500/20 to-blue-600/10 text-blue-400',
    green: 'from-green-500/20 to-green-600/10 text-green-400',
    yellow: 'from-yellow-500/20 to-yellow-600/10 text-yellow-400',
    purple: 'from-purple-500/20 to-purple-600/10 text-purple-400',
    red: 'from-red-500/20 to-red-600/10 text-red-400',
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-500 text-sm">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {subtitle && <p className="text-gray-400 text-sm mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg bg-gradient-to-br ${colors[color]}`}>
          <Icon size={20} />
        </div>
      </div>
      {trend && (
        <div className="flex items-center gap-1 mt-3 text-sm">
          <TrendingUp size={14} className="text-green-400" />
          <span className="text-green-400">{trend}</span>
        </div>
      )}
    </div>
  );
};

const ProjectCard = ({ project, onClick }) => {
  const priorityColors = {
    hot: 'bg-red-500/20 text-red-400 border-red-500/30',
    warm: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    cold: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  };

  const statusColors = {
    active: 'bg-green-500',
    planning: 'bg-yellow-500',
    maintenance: 'bg-blue-500',
    archived: 'bg-gray-500',
  };

  return (
    <div 
      onClick={onClick}
      className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-600 cursor-pointer transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${statusColors[project.status]}`} />
          <span className="text-xs text-gray-500 uppercase tracking-wider">{project.category}</span>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full border ${priorityColors[project.priority]}`}>
          {project.priority}
        </span>
      </div>
      <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">{project.name}</h3>
      <p className="text-gray-400 text-sm mt-1 line-clamp-2">{project.description}</p>
      <div className="mt-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Progress</span>
          <span>{project.progress}%</span>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

const QuickAction = ({ icon: Icon, label, onClick, color = 'blue' }) => {
  const colors = {
    blue: 'hover:bg-blue-500/10 hover:border-blue-500/30',
    green: 'hover:bg-green-500/10 hover:border-green-500/30',
    purple: 'hover:bg-purple-500/10 hover:border-purple-500/30',
    yellow: 'hover:bg-yellow-500/10 hover:border-yellow-500/30',
  };

  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-3 p-4 bg-gray-900 border border-gray-800 rounded-xl transition-all ${colors[color]}`}
    >
      <Icon size={20} className="text-gray-400" />
      <span className="text-sm font-medium">{label}</span>
      <ArrowRight size={16} className="ml-auto text-gray-600" />
    </button>
  );
};

function DashboardHome({ onNavigate }) {
  const { data, resetData } = useData();
  
  const today = new Date().toISOString().split('T')[0];
  const todayReport = data.dailyReports.find(r => r.date === today);
  
  const activeProjects = data.projects.filter(p => p.status === 'active').length;
  const blockedItems = data.kanban.blocked.length;
  const inProgressItems = data.kanban.inProgress.length;
  const completedToday = data.kanban.completed.filter(c => c.completed === today).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Command Center</h1>
          <p className="text-gray-500 mt-1">Real-time overview of all projects and workload</p>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Active Projects" 
          value={activeProjects} 
          subtitle={`${data.projects.filter(p => p.priority === 'hot').length} hot priority`}
          icon={FolderOpen}
          color="blue"
        />
        <StatCard 
          title="In Progress" 
          value={inProgressItems} 
          subtitle="Tasks being worked on"
          icon={Activity}
          color="yellow"
        />
        <StatCard 
          title="Blocked" 
          value={blockedItems} 
          subtitle="Need your input"
          icon={AlertCircle}
          color="red"
        />
        <StatCard 
          title="Completed Today" 
          value={completedToday} 
          subtitle="Tasks finished"
          icon={CheckCircle2}
          color="green"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Agent Status & Projects */}
        <div className="lg:col-span-4 space-y-4">
          <AgentStatus />
          <BlockerAlert onNavigate={onNavigate} />
          <PredictiveInsights />
        </div>

        {/* Middle Column - Projects & Quick Actions */}
        <div className="lg:col-span-5 space-y-4">
          {/* Hot Projects */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Zap size={18} className="text-yellow-400" />
                Hot Priority Projects
              </h2>
              <button 
                onClick={() => onNavigate('projects')}
                className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                View all <ArrowRight size={14} />
              </button>
            </div>
            <div className="space-y-3">
              {data.projects.filter(p => p.priority === 'hot').slice(0, 3).map(project => (
                <ProjectCard 
                  key={project.id} 
                  project={project} 
                  onClick={() => onNavigate('projects')}
                />
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
            <h2 className="font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <QuickAction 
                icon={Activity} 
                label="My Work Board" 
                onClick={() => onNavigate('kanban')}
                color="blue"
              />
              <QuickAction 
                icon={Calendar} 
                label="Add Daily Log" 
                onClick={() => onNavigate('reports')}
                color="green"
              />
              <QuickAction 
                icon={FolderOpen} 
                label="New Project" 
                onClick={() => onNavigate('projects')}
                color="purple"
              />
              <QuickAction 
                icon={CheckCircle2} 
                label="All Tasks" 
                onClick={() => onNavigate('tasks')}
                color="yellow"
              />
            </div>
            <div className="mt-3 pt-3 border-t border-gray-800">
              <button 
                onClick={resetData}
                className="text-xs text-gray-500 hover:text-red-400 transition-colors"
              >
                ↻ Reset to latest data
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Analytics */}
        <div className="lg:col-span-3">
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 sticky top-4">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-purple-400" />
              Workload Analytics
            </h2>
            <WorkloadCharts />
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardHome;
