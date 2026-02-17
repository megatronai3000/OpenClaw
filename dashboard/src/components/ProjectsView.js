import React, { useState } from 'react';
import { Plus, Search, Filter, MoreHorizontal, TrendingUp, Clock, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { useData } from '../hooks/useData';

const ProjectDetailModal = ({ project, onClose, onUpdate }) => {
  if (!project) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">{project.name}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded">
            <X size={20} />
          </button>
        </div>
        <p className="text-gray-400 mb-4">{project.description}</p>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-500">Status</label>
            <select 
              value={project.status}
              onChange={(e) => onUpdate(project.id, { status: e.target.value })}
              className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
            >
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="maintenance">Maintenance</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-500">Priority</label>
            <select 
              value={project.priority}
              onChange={(e) => onUpdate(project.id, { priority: e.target.value })}
              className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
            >
              <option value="hot">Hot</option>
              <option value="warm">Warm</option>
              <option value="cold">Cold</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-500">Progress</label>
            <input 
              type="range"
              min="0"
              max="100"
              value={project.progress}
              onChange={(e) => onUpdate(project.id, { progress: parseInt(e.target.value) })}
              className="w-full mt-1"
            />
            <span className="text-sm text-gray-400">{project.progress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const AddProjectModal = ({ onClose, onAdd }) => {
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'Product',
    priority: 'warm',
    status: 'planning'
  });

  const handleSubmit = () => {
    if (form.name.trim()) {
      onAdd(form);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">New Project</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-500">Project Name</label>
            <input 
              type="text"
              value={form.name}
              onChange={(e) => setForm({...form, name: e.target.value})}
              className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
              placeholder="Enter project name"
            />
          </div>
          <div>
            <label className="text-sm text-gray-500">Description</label>
            <textarea 
              value={form.description}
              onChange={(e) => setForm({...form, description: e.target.value})}
              className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
              rows={3}
              placeholder="Brief description"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500">Category</label>
              <select 
                value={form.category}
                onChange={(e) => setForm({...form, category: e.target.value})}
                className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
              >
                <option>Product</option>
                <option>Infrastructure</option>
                <option>DeFi</option>
                <option>Finance</option>
                <option>Tools</option>
                <option>Research</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-500">Priority</label>
              <select 
                value={form.priority}
                onChange={(e) => setForm({...form, priority: e.target.value})}
                className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
              >
                <option value="hot">Hot</option>
                <option value="warm">Warm</option>
                <option value="cold">Cold</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button 
              onClick={handleSubmit}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg transition-colors"
            >
              Create Project
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

function ProjectsView() {
  const { data, updateProject, addProject } = useData();
  const [selectedProject, setSelectedProject] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filteredProjects = data.projects.filter(p => {
    const matchesFilter = filter === 'all' || p.status === filter || p.priority === filter;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                         p.description.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getPriorityColor = (p) => ({
    hot: 'text-red-400 bg-red-500/10 border-red-500/30',
    warm: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    cold: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  }[p]);

  const getStatusColor = (s) => ({
    active: 'bg-green-500',
    planning: 'bg-yellow-500',
    maintenance: 'bg-blue-500',
    archived: 'bg-gray-500',
  }[s]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Projects</h2>
          <p className="text-gray-500 mt-1">Manage and track all your projects</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={18} />
          New Project
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input 
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'hot', 'warm'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-sm capitalize transition-colors ${
                filter === f 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProjects.map(project => (
          <div 
            key={project.id}
            onClick={() => setSelectedProject(project)}
            className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-600 cursor-pointer transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getStatusColor(project.status)}`} />
                <span className="text-xs text-gray-500 uppercase">{project.category}</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(project.priority)}`}>
                {project.priority}
              </span>
            </div>
            
            <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
              {project.name}
            </h3>
            <p className="text-gray-400 text-sm mt-1 line-clamp-2">{project.description}</p>
            
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progress</span>
                <span>{project.progress}%</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock size={12} />
                Updated {project.lastUpdated}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No projects found matching your criteria</p>
        </div>
      )}

      {/* Modals */}
      {selectedProject && (
        <ProjectDetailModal 
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onUpdate={updateProject}
        />
      )}
      {showAddModal && (
        <AddProjectModal 
          onClose={() => setShowAddModal(false)}
          onAdd={addProject}
        />
      )}
    </div>
  );
}

export default ProjectsView;
