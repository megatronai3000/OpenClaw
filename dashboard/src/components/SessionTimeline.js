import React from 'react';
import { Clock, CheckCircle2, AlertCircle, PlayCircle, PauseCircle } from 'lucide-react';
import { useData } from '../hooks/useData';

const SessionTimeline = () => {
  const { data } = useData();
  
  // Get today's sessions from the most recent daily report
  const todayReport = data.dailyReports[0];
  const sessions = todayReport?.sessions || [];
  
  // Also include kanban activity
  const recentCompleted = data.kanban.completed
    .filter(c => c.completed === new Date().toISOString().split('T')[0])
    .slice(0, 3);
  
  const recentBlocked = data.kanban.blocked
    .slice(0, 2);

  if (sessions.length === 0 && recentCompleted.length === 0 && recentBlocked.length === 0) {
    return (
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 text-center">
        <Clock size={32} className="mx-auto mb-2 text-gray-600" />
        <p className="text-gray-500 text-sm">No activity recorded today</p>
        <p className="text-xs text-gray-600 mt-1">Sessions will appear here automatically</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Clock size={16} className="text-blue-400" />
        Today's Activity Timeline
      </h3>
      
      <div className="space-y-4 relative">
        {/* Vertical line */}
        <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-gray-800" />
        
        {/* Sessions */}
        {sessions.map((session, i) => (
          <div key={i} className="relative flex items-start gap-3">
            <div className="relative z-10 w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center flex-shrink-0">
              <PlayCircle size={14} className="text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white">{session.startTime} - {session.endTime}</span>
                <span className="text-xs text-gray-500">Session {i + 1}</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5 truncate">{session.trigger}</p>
              {session.tasks && (
                <p className="text-xs text-green-400 mt-1">{session.tasks.length} tasks completed</p>
              )}
            </div>
          </div>
        ))}
        
        {/* Completed items */}
        {recentCompleted.map((item, i) => (
          <div key={`completed-${i}`} className="relative flex items-start gap-3">
            <div className="relative z-10 w-7 h-7 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 size={14} className="text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white">Completed: {item.title}</p>
              <p className="text-xs text-gray-500">{item.completed}</p>
            </div>
          </div>
        ))}
        
        {/* Blocked items */}
        {recentBlocked.map((item, i) => (
          <div key={`blocked-${i}`} className="relative flex items-start gap-3">
            <div className="relative z-10 w-7 h-7 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center flex-shrink-0">
              <AlertCircle size={14} className="text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white">Blocked: {item.title}</p>
              <p className="text-xs text-red-400 truncate">{item.blocker}</p>
            </div>
          </div>
        ))}
      </div>
      
      {/* Current status */}
      {data.kanban.inProgress.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-800">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-green-400">Currently working on:</span>
            <span className="text-white truncate">{data.kanban.inProgress[0].title}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionTimeline;
