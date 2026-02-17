import React from 'react';
import { Target, Zap, TrendingUp, Award } from 'lucide-react';
import { useData } from '../hooks/useData';

const EfficiencyScore = () => {
  const { data } = useData();
  
  // Calculate various metrics
  const totalTasks = data.tasks.length;
  const completedTasks = data.tasks.filter(t => t.status === 'completed').length;
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  
  const totalReports = data.dailyReports.length;
  const avgTasksPerDay = totalReports > 0 
    ? data.dailyReports.reduce((sum, r) => sum + (r.sessions?.reduce((s, sess) => s + (sess.tasks?.length || 0), 0) || 0), 0) / totalReports 
    : 0;
  
  const blockedCount = data.kanban.blocked.length;
  const inProgressCount = data.kanban.inProgress.length;
  
  // Calculate efficiency score (0-100)
  let score = 50; // Base score
  
  // +20 for good completion rate
  if (completionRate > 70) score += 20;
  else if (completionRate > 50) score += 10;
  
  // +15 for productivity
  if (avgTasksPerDay >= 5) score += 15;
  else if (avgTasksPerDay >= 3) score += 10;
  else if (avgTasksPerDay >= 1) score += 5;
  
  // -10 for blockers
  if (blockedCount > 2) score -= 10;
  else if (blockedCount > 0) score -= 5;
  
  // -5 for too much WIP
  if (inProgressCount > 3) score -= 5;
  
  // Cap at 0-100
  score = Math.max(0, Math.min(100, score));
  
  // Determine grade
  let grade = 'C';
  let color = 'text-yellow-400';
  let bgColor = 'bg-yellow-500/20';
  
  if (score >= 90) {
    grade = 'A+';
    color = 'text-green-400';
    bgColor = 'bg-green-500/20';
  } else if (score >= 80) {
    grade = 'A';
    color = 'text-green-400';
    bgColor = 'bg-green-500/20';
  } else if (score >= 70) {
    grade = 'B';
    color = 'text-blue-400';
    bgColor = 'bg-blue-500/20';
  } else if (score < 50) {
    grade = 'D';
    color = 'text-red-400';
    bgColor = 'bg-red-500/20';
  }

  const suggestions = [];
  if (blockedCount > 0) suggestions.push('Resolve blocked items to improve flow');
  if (inProgressCount > 3) suggestions.push('Focus on fewer tasks at once');
  if (completionRate < 50) suggestions.push('Complete more tasks before starting new ones');
  if (avgTasksPerDay < 3) suggestions.push('Increase daily task completion');
  if (suggestions.length === 0) suggestions.push('Great work! Keep the momentum going');

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Award size={18} className="text-purple-400" />
          Efficiency Score
        </h3>
        <div className={`${bgColor} ${color} px-3 py-1 rounded-full text-lg font-bold`}>
          {grade}
        </div>
      </div>
      
      {/* Score Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-500">Performance</span>
          <span className="text-white font-semibold">{score}/100</span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-blue-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
      
      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-800/50 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-white">{completionRate.toFixed(0)}%</p>
          <p className="text-xs text-gray-500">Completion Rate</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-white">{avgTasksPerDay.toFixed(1)}</p>
          <p className="text-xs text-gray-500">Tasks/Day</p>
        </div>
      </div>
      
      {/* Suggestions */}
      <div className="space-y-2">
        <p className="text-xs text-gray-500 uppercase font-medium">Improvement Tips</p>
        {suggestions.slice(0, 2).map((suggestion, i) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            <Zap size={14} className="text-yellow-400 mt-0.5 flex-shrink-0" />
            <span className="text-gray-300">{suggestion}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EfficiencyScore;
