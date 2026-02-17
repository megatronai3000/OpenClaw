import React from 'react';
import { AlertTriangle, AlertCircle, Clock, ChevronRight, XCircle } from 'lucide-react';
import { useData } from '../hooks/useData';

const BlockerAlert = ({ onNavigate }) => {
  const { data, moveKanbanItem } = useData();
  
  const blockers = data.kanban.blocked;
  const criticalBlockers = blockers.filter(b => b.priority === 'high');
  const oldBlockers = blockers.filter(b => {
    const daysSince = Math.floor((new Date() - new Date(b.created || Date.now())) / (1000 * 60 * 60 * 24));
    return daysSince > 2;
  });

  if (blockers.length === 0) return null;

  return (
    <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={20} className="text-red-400" />
          <h3 className="font-semibold text-white">Blocked Items Needing Attention</h3>
        </div>
        <span className="bg-red-500/20 text-red-400 text-xs px-2 py-1 rounded-full">
          {blockers.length} total
        </span>
      </div>
      
      <div className="space-y-2">
        {blockers.slice(0, 3).map(item => (
          <div key={item.id} className="bg-gray-900/50 rounded-lg p-3 flex items-start gap-3">
            <div className="mt-0.5">
              {item.priority === 'high' ? (
                <XCircle size={16} className="text-red-400" />
              ) : (
                <AlertCircle size={16} className="text-yellow-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium truncate">{item.title}</p>
              <p className="text-xs text-red-400 mt-0.5">{item.blocker}</p>
            </div>
            <button 
              onClick={() => moveKanbanItem(item.id, 'blocked', 'inProgress')}
              className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded transition-colors"
            >
              Unblock
            </button>
          </div>
        ))}
      </div>
      
      {criticalBlockers.length > 0 && (
        <div className="mt-3 p-2 bg-red-500/10 rounded-lg">
          <p className="text-xs text-red-400 flex items-center gap-1">
            <AlertTriangle size={12} />
            {criticalBlockers.length} high-priority blocker{criticalBlockers.length > 1 ? 's' : ''}
          </p>
        </div>
      )}
      
      <button 
        onClick={() => onNavigate('kanban')}
        className="w-full mt-3 text-sm text-gray-400 hover:text-white flex items-center justify-center gap-1 py-2 hover:bg-gray-800 rounded-lg transition-colors"
      >
        View all in Kanban <ChevronRight size={14} />
      </button>
    </div>
  );
};

export default BlockerAlert;
