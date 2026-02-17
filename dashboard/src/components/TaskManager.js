import React, { useState } from 'react';
import { Plus, CheckCircle2, Circle, Clock, Calendar, X, Filter, Search, MoreHorizontal } from 'lucide-react';
import { useData } from '../hooks/useData';

const AddTaskModal = ({ onClose, onAdd, projects }) => {
  const [form, setForm] = useState({
    title: '',
    project: projects[0]?.name || '',
    due: new Date().toISOString().split('T')[0],
    priority: 'medium',
    status: 'pending'
  });

  const handleSubmit = () => {
    if (form.title.trim()) {
      onAdd(form);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">New Task</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-500">Task</label>
            <input 
              type="text"
              value={form.title}
              onChange={(e) => setForm({...form, title: e.target.value})}
              className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
              placeholder="What needs to be done?"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500">Project</label>
              <select 
                value={form.project}
                onChange={(e) => setForm({...form, project: e.target.value})}
                className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-500">Due Date</label>
              <input 
                type="date"
                value={form.due}
                onChange={(e) => setForm({...form, due: e.target.value})}
                className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500">Priority</label>
              <select 
                value={form.priority}
                onChange={(e) => setForm({...form, priority: e.target.value})}
                className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-500">Status</label>
              <select 
                value={form.status}
                onChange={(e) => setForm({...form, status: e.target.value})}
                className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
              >
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button 
              onClick={handleSubmit}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg transition-colors"
            >
              Add Task
            </button>
            <button 
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function TaskManager() {
  const { data, addTask, updateTask } = useData();
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filteredTasks = data.tasks.filter(t => {
    const matchesFilter = filter === 'all' || t.status === filter || t.priority === filter;
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const tasksDueToday = data.tasks.filter(t => t.due === new Date().toISOString().split('T')[0] && t.status !== 'completed');
  const tasksDueThisWeek = data.tasks.filter(t => {
    const due = new Date(t.due);
    const today = new Date();
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return due >= today && due <= weekFromNow && t.status !== 'completed';
  });

  const getPriorityColor = (p) => ({
    high: 'text-red-400 bg-red-500/10 border-red-500/30',
    medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    low: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  }[p]);

  const getStatusIcon = (s) => {
    switch(s) {
      case 'completed': return <CheckCircle2 size={18} className="text-green-400" />;
      case 'in-progress': return <Clock size={18} className="text-yellow-400" />;
      default: return <Circle size={18} className="text-gray-500" />;
    }
  };

  const toggleComplete = (task) => {
    updateTask(task.id, { status: task.status === 'completed' ? 'pending' : 'completed' });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Task Manager</h2>
          <p className="text-gray-500 mt-1">All tasks across projects</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={18} />
          Add Task
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <Clock size={20} className="text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{tasksDueToday.length}</p>
              <p className="text-gray-500 text-sm">Due Today</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Calendar size={20} className="text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{tasksDueThisWeek.length}</p>
              <p className="text-gray-500 text-sm">Due This Week</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <CheckCircle2 size={20} className="text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data.tasks.filter(t => t.status === 'completed').length}</p>
              <p className="text-gray-500 text-sm">Completed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input 
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'pending', 'in-progress', 'completed'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-sm capitalize transition-colors ${
                filter === f 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {f.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-800 text-sm text-gray-500">
          <div className="col-span-5">Task</div>
          <div className="col-span-2">Project</div>
          <div className="col-span-2">Due</div>
          <div className="col-span-2">Priority</div>
          <div className="col-span-1">Status</div>
        </div>
        <div className="divide-y divide-gray-800">
          {filteredTasks.map(task => (
            <div 
              key={task.id}
              className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-gray-800/50 transition-colors"
            >
              <div className="col-span-5 flex items-center gap-3">
                <button 
                  onClick={() => toggleComplete(task)}
                  className="hover:scale-110 transition-transform"
                >
                  {getStatusIcon(task.status)}
                </button>
                <span className={`${task.status === 'completed' ? 'line-through text-gray-500' : 'text-white'}`}>
                  {task.title}
                </span>
              </div>
              <div className="col-span-2 text-sm text-gray-400">{task.project}</div>
              <div className="col-span-2 text-sm text-gray-400">
                {task.due === new Date().toISOString().split('T')[0] ? (
                  <span className="text-red-400">Today</span>
                ) : (
                  task.due
                )}
              </div>
              <div className="col-span-2">
                <span className={`text-xs px-2 py-1 rounded border ${getPriorityColor(task.priority)}`}>
                  {task.priority}
                </span>
              </div>
              <div className="col-span-1">
                <span className={`text-xs ${
                  task.status === 'completed' ? 'text-green-400' :
                  task.status === 'in-progress' ? 'text-yellow-400' : 'text-gray-400'
                }`}>
                  {task.status.replace('-', ' ')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {filteredTasks.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No tasks found matching your criteria</p>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddTaskModal 
          onClose={() => setShowAddModal(false)} 
          onAdd={addTask}
          projects={data.projects}
        />
      )}
    </div>
  );
}

export default TaskManager;
