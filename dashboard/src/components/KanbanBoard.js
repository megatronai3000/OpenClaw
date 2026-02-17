import React, { useState } from 'react';
import { Plus, MoreHorizontal, Clock, AlertCircle, CheckCircle2, Circle, ArrowRightCircle, X, TrendingUp, Brain, PauseCircle } from 'lucide-react';
import { useData } from '../hooks/useData';
import AgentStatus from './AgentStatus';
import SessionTimeline from './SessionTimeline';

const KanbanColumn = ({ title, count, color, children, onAddItem }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');

  const handleAdd = () => {
    if (newItemTitle.trim()) {
      onAddItem(newItemTitle);
      setNewItemTitle('');
      setShowAdd(false);
    }
  };

  const colorClasses = {
    gray: 'border-gray-700 bg-gray-900/30',
    blue: 'border-blue-700 bg-blue-900/10',
    yellow: 'border-yellow-700 bg-yellow-900/10',
    green: 'border-green-700 bg-green-900/10',
  };

  return (
    <div className={`flex flex-col h-full min-h-[400px] rounded-xl border ${colorClasses[color]}`}>
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white">{title}</h3>
            <span className="bg-gray-800 text-gray-400 text-xs px-2 py-0.5 rounded-full">{count}</span>
          </div>
          <button 
            onClick={() => setShowAdd(!showAdd)}
            className="p-1 hover:bg-gray-800 rounded transition-colors"
          >
            <Plus size={18} className="text-gray-400" />
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="p-3 border-b border-gray-800">
          <input
            type="text"
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="What needs to be done?"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            autoFocus
          />
          <div className="flex gap-2 mt-2">
            <button 
              onClick={handleAdd}
              className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded transition-colors"
            >
              Add
            </button>
            <button 
              onClick={() => setShowAdd(false)}
              className="text-xs text-gray-400 hover:text-white px-2 py-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 p-3 space-y-3 overflow-y-auto">
        {children}
      </div>
    </div>
  );
};

const KanbanCard = ({ item, column, onMove }) => {
  const [showActions, setShowActions] = useState(false);

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return 'text-red-400 bg-red-500/10';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10';
      case 'low': return 'text-blue-400 bg-blue-500/10';
      default: return 'text-gray-400 bg-gray-500/10';
    }
  };

  const moveOptions = {
    backlog: ['inProgress', 'blocked'],
    inProgress: ['backlog', 'blocked', 'completed'],
    blocked: ['backlog', 'inProgress', 'completed'],
    completed: ['inProgress', 'backlog'],
  };

  const moveLabels = {
    backlog: 'Backlog',
    inProgress: 'In Progress',
    blocked: 'Blocked',
    completed: 'Completed',
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 hover:border-gray-600 transition-all group">
      <div className="flex items-start justify-between mb-2">
        {item.priority && (
          <span className={`text-xs px-2 py-0.5 rounded ${getPriorityColor(item.priority)}`}>
            {item.priority}
          </span>
        )}
        <div className="relative">
          <button 
            onClick={() => setShowActions(!showActions)}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-700 rounded transition-all"
          >
            <MoreHorizontal size={16} className="text-gray-400" />
          </button>
          {showActions && (
            <div className="absolute right-0 top-8 z-10 bg-gray-900 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[140px]">
              <div className="px-3 py-1 text-xs text-gray-500 border-b border-gray-800">Move to...</div>
              {moveOptions[column]?.map(dest => (
                <button
                  key={dest}
                  onClick={() => {
                    onMove(item.id, column, dest);
                    setShowActions(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
                >
                  {moveLabels[dest]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-sm text-white font-medium">{item.title}</p>

      {item.blocker && (
        <div className="mt-2 flex items-start gap-1.5 text-xs text-red-400">
          <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
          <span>{item.blocker}</span>
        </div>
      )}

      <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
        {item.created && (
          <span className="flex items-center gap-1">
            <Circle size={10} />
            {item.created}
          </span>
        )}
        {item.started && (
          <span className="flex items-center gap-1">
            <Clock size={10} />
            Started {item.started}
          </span>
        )}
        {item.completed && (
          <span className="flex items-center gap-1 text-green-400">
            <CheckCircle2 size={10} />
            Done {item.completed}
          </span>
        )}
      </div>
    </div>
  );
};

function KanbanBoard() {
  const { data, moveKanbanItem, addKanbanItem } = useData();
  const [activeCard, setActiveCard] = useState(null);
  const [showTimeline, setShowTimeline] = useState(true);

  const handleAddItem = (column) => (title) => {
    addKanbanItem(column, { title, priority: 'medium' });
  };

  const handleMove = (itemId, from, to) => {
    moveKanbanItem(itemId, from, to);
  };

  return (
    <div className="p-6 h-full overflow-auto">
      {/* Header with Stats */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Brain size={24} className="text-blue-400" />
              Megatron's Work Board
            </h2>
            <p className="text-gray-500 mt-1">Track what I'm working on, what's coming up, and what's blocked.</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
              <TrendingUp size={16} className="text-green-400" />
              <span className="text-gray-400">Completed:</span>
              <span className="text-white font-semibold">{data.kanban.completed.length}</span>
            </div>
            <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
              <PauseCircle size={16} className="text-yellow-400" />
              <span className="text-gray-400">Blocked:</span>
              <span className="text-white font-semibold">{data.kanban.blocked.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Row - Agent Status & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-1">
          <AgentStatus />
        </div>
        <div className="lg:col-span-2">
          <SessionTimeline />
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KanbanColumn 
          title="Backlog" 
          count={data.kanban.backlog.length}
          color="gray"
          onAddItem={handleAddItem('backlog')}
        >
          {data.kanban.backlog.map(item => (
            <KanbanCard 
              key={item.id} 
              item={item} 
              column="backlog"
              onMove={handleMove}
            />
          ))}
        </KanbanColumn>

        <KanbanColumn 
          title="In Progress" 
          count={data.kanban.inProgress.length}
          color="blue"
          onAddItem={handleAddItem('inProgress')}
        >
          {data.kanban.inProgress.map(item => (
            <KanbanCard 
              key={item.id} 
              item={item} 
              column="inProgress"
              onMove={handleMove}
            />
          ))}
        </KanbanColumn>

        <KanbanColumn 
          title="Blocked" 
          count={data.kanban.blocked.length}
          color="yellow"
          onAddItem={handleAddItem('blocked')}
        >
          {data.kanban.blocked.map(item => (
            <KanbanCard 
              key={item.id} 
              item={item} 
              column="blocked"
              onMove={handleMove}
            />
          ))}
        </KanbanColumn>

        <KanbanColumn 
          title="Completed" 
          count={data.kanban.completed.length}
          color="green"
          onAddItem={handleAddItem('completed')}
        >
          {data.kanban.completed.map(item => (
            <KanbanCard 
              key={item.id} 
              item={item} 
              column="completed"
              onMove={handleMove}
            />
          ))}
        </KanbanColumn>
      </div>
    </div>
  );
}

export default KanbanBoard;
