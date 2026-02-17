import React, { useState } from 'react';
import { Lightbulb, AlertTriangle, TrendingUp, Plus, X, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { useData } from '../hooks/useData';
import EfficiencyScore from './EfficiencyScore';

const InsightsDashboard = () => {
  const { data } = useData();
  const [activeTab, setActiveTab] = useState('lessons');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEntry, setNewEntry] = useState({ type: 'lesson', content: '', category: 'Process' });

  const tabs = [
    { id: 'lessons', label: 'Lessons Learned', icon: Lightbulb, count: data.insights.lessonsLearned.length },
    { id: 'blockers', label: 'Recurring Blockers', icon: AlertTriangle, count: data.insights.blockers.length },
    { id: 'improvements', label: 'Process Improvements', icon: TrendingUp, count: data.insights.improvements.length },
  ];

  const renderContent = () => {
    switch(activeTab) {
      case 'lessons':
        return (
          <div className="space-y-4">
            {data.insights.lessonsLearned.map(lesson => (
              <div key={lesson.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-yellow-500/20 rounded-lg">
                    <Lightbulb size={18} className="text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white">{lesson.lesson}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span>{lesson.date}</span>
                      <span className="bg-gray-800 px-2 py-0.5 rounded">{lesson.category}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {data.insights.lessonsLearned.length === 0 && (
              <p className="text-center text-gray-500 py-8">No lessons recorded yet</p>
            )}
          </div>
        );
      
      case 'blockers':
        return (
          <div className="space-y-4">
            {data.insights.blockers.map(blocker => (
              <div key={blocker.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-red-500/20 rounded-lg">
                    <AlertTriangle size={18} className="text-red-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white">{blocker.issue}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <span className="text-gray-500">Occurred {blocker.frequency} time{blocker.frequency > 1 ? 's' : ''}</span>
                      <span className={`px-2 py-0.5 rounded ${
                        blocker.status === 'open' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                      }`}>
                        {blocker.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {data.insights.blockers.length === 0 && (
              <p className="text-center text-gray-500 py-8">No blockers recorded</p>
            )}
          </div>
        );
      
      case 'improvements':
        return (
          <div className="space-y-4">
            {data.insights.improvements.map(improvement => (
              <div key={improvement.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <TrendingUp size={18} className="text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white">{improvement.suggestion}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <span className="bg-gray-800 px-2 py-0.5 rounded">Impact: {improvement.impact}</span>
                      <span className="bg-gray-800 px-2 py-0.5 rounded">Effort: {improvement.effort}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {data.insights.improvements.length === 0 && (
              <p className="text-center text-gray-500 py-8">No improvement suggestions yet</p>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Insights & Learning</h2>
          <p className="text-gray-500 mt-1">Track lessons, blockers, and process improvements</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={18} />
          Add Entry
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{data.insights.lessonsLearned.length}</p>
              <p className="text-gray-500 text-sm">Lessons Learned</p>
            </div>
            <div className="p-3 bg-yellow-500/20 rounded-lg">
              <Lightbulb size={20} className="text-yellow-400" />
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{data.insights.blockers.filter(b => b.status === 'open').length}</p>
              <p className="text-gray-500 text-sm">Open Blockers</p>
            </div>
            <div className="p-3 bg-red-500/20 rounded-lg">
              <AlertTriangle size={20} className="text-red-400" />
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{data.insights.improvements.length}</p>
              <p className="text-gray-500 text-sm">Improvement Ideas</p>
            </div>
            <div className="p-3 bg-green-500/20 rounded-lg">
              <TrendingUp size={20} className="text-green-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Efficiency Score */}
      <div className="mb-6">
        <EfficiencyScore />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === tab.id 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            <tab.icon size={16} />
            <span>{tab.label}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              activeTab === tab.id ? 'bg-white/20' : 'bg-gray-800'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        {renderContent()}
      </div>

      {/* Productivity Metrics */}
      <div className="mt-6 bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <RefreshCw size={18} className="text-blue-400" />
          Productivity Patterns
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-800 rounded-lg">
            <p className="text-3xl font-bold text-blue-400">
              {data.dailyReports.reduce((sum, r) => sum + r.tasksCompleted, 0)}
            </p>
            <p className="text-sm text-gray-500 mt-1">Total Tasks Done</p>
          </div>
          <div className="text-center p-4 bg-gray-800 rounded-lg">
            <p className="text-3xl font-bold text-green-400">
              {data.projects.filter(p => p.progress === 100).length}
            </p>
            <p className="text-sm text-gray-500 mt-1">Projects Completed</p>
          </div>
          <div className="text-center p-4 bg-gray-800 rounded-lg">
            <p className="text-3xl font-bold text-purple-400">
              {Math.round(data.projects.reduce((sum, p) => sum + p.progress, 0) / data.projects.length)}%
            </p>
            <p className="text-sm text-gray-500 mt-1">Avg Project Progress</p>
          </div>
          <div className="text-center p-4 bg-gray-800 rounded-lg">
            <p className="text-3xl font-bold text-yellow-400">
              {data.kanban.completed.length}
            </p>
            <p className="text-sm text-gray-500 mt-1">Items Completed</p>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Add Insight</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-gray-800 rounded">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">Type</label>
                <select 
                  value={newEntry.type}
                  onChange={(e) => setNewEntry({...newEntry, type: e.target.value})}
                  className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
                >
                  <option value="lesson">Lesson Learned</option>
                  <option value="blocker">Blocker</option>
                  <option value="improvement">Improvement Idea</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-500">Content</label>
                <textarea 
                  value={newEntry.content}
                  onChange={(e) => setNewEntry({...newEntry, content: e.target.value})}
                  className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="What did you learn or observe?"
                />
              </div>
              <div>
                <label className="text-sm text-gray-500">Category</label>
                <select 
                  value={newEntry.category}
                  onChange={(e) => setNewEntry({...newEntry, category: e.target.value})}
                  className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
                >
                  <option>Process</option>
                  <option>Technical</option>
                  <option>Productivity</option>
                  <option>Communication</option>
                </select>
              </div>
              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg transition-colors"
                >
                  Save
                </button>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InsightsDashboard;
