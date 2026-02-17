import React from 'react';
import { AlertTriangle, TrendingUp, Lightbulb, Clock, Target, Zap } from 'lucide-react';
import { useData } from '../hooks/useData';

const PredictiveInsights = () => {
  const { data } = useData();
  
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  
  // At-risk tasks: due today/tomorrow, not completed
  const atRiskTasks = data.tasks.filter(t => {
    if (t.status === 'completed') return false;
    return t.due === today || t.due === tomorrow;
  });
  
  // Overdue tasks
  const overdueTasks = data.tasks.filter(t => {
    if (t.status === 'completed') return false;
    return new Date(t.due) < new Date(today);
  });
  
  // Workload balance check
  const inProgressCount = data.kanban.inProgress.length;
  const workloadWarning = inProgressCount > 3;
  
  // Cost trend (increasing?)
  const recentCosts = data.dailyReports.slice(0, 3).map(r => r.costSummary?.totalCost || 0);
  const costIncreasing = recentCosts.length >= 2 && recentCosts[0] > recentCosts[recentCosts.length - 1] * 1.5;
  
  // Productivity pattern (tasks per day)
  const avgTasksPerDay = data.dailyReports.length > 0
    ? data.dailyReports.reduce((sum, r) => sum + (r.sessions?.reduce((s, sess) => s + (sess.tasks?.length || 0), 0) || 0), 0) / data.dailyReports.length
    : 0;

  const insights = [];
  
  if (atRiskTasks.length > 0) {
    insights.push({
      type: 'warning',
      icon: Clock,
      title: `${atRiskTasks.length} task${atRiskTasks.length > 1 ? 's' : ''} due soon`,
      description: atRiskTasks.map(t => t.title).join(', ').slice(0, 60) + '...',
      action: 'Review tasks'
    });
  }
  
  if (overdueTasks.length > 0) {
    insights.push({
      type: 'danger',
      icon: AlertTriangle,
      title: `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}`,
      description: 'Needs immediate attention',
      action: 'View overdue'
    });
  }
  
  if (workloadWarning) {
    insights.push({
      type: 'info',
      icon: Target,
      title: 'High workload detected',
      description: `${inProgressCount} tasks in progress - consider focusing`,
      action: 'Prioritize'
    });
  }
  
  if (costIncreasing) {
    insights.push({
      type: 'warning',
      icon: TrendingUp,
      title: 'Cost trend increasing',
      description: 'Recent days higher than average',
      action: 'Review efficiency'
    });
  }
  
  // Positive insights
  if (data.kanban.completed.length > 5) {
    insights.push({
      type: 'success',
      icon: Zap,
      title: 'Strong completion rate',
      description: `${data.kanban.completed.length} items done recently`,
      action: 'Keep it up'
    });
  }

  if (insights.length === 0) {
    insights.push({
      type: 'info',
      icon: Lightbulb,
      title: 'All caught up',
      description: 'No immediate risks detected',
      action: 'Plan ahead'
    });
  }

  const typeStyles = {
    warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
    danger: 'bg-red-500/10 border-red-500/30 text-red-400',
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    success: 'bg-green-500/10 border-green-500/30 text-green-400',
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Insights & Alerts</h3>
      {insights.map((insight, i) => (
        <div key={i} className={`border rounded-lg p-3 ${typeStyles[insight.type]}`}>
          <div className="flex items-start gap-3">
            <insight.icon size={18} className="mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{insight.title}</p>
              <p className="text-xs opacity-80 mt-0.5">{insight.description}</p>
            </div>
          </div>
        </div>
      ))}
      
      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        <div className="bg-gray-900/50 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-white">{avgTasksPerDay.toFixed(1)}</p>
          <p className="text-xs text-gray-500">Avg tasks/day</p>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-white">{data.insights.blockers.filter(b => b.status === 'open').length}</p>
          <p className="text-xs text-gray-500">Open blockers</p>
        </div>
      </div>
    </div>
  );
};

export default PredictiveInsights;
