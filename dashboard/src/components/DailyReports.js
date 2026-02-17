import React, { useState } from 'react';
import { Plus, Calendar as CalendarIcon, List, TrendingUp, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, X, Lightbulb, Clock, DollarSign, ArrowRight, Zap, FileText } from 'lucide-react';
import { useData } from '../hooks/useData';

const SessionCard = ({ session, index }) => (
  <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
    <div className="flex items-center gap-2 mb-3">
      <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded font-medium">
        Session {index + 1}
      </span>
      <span className="text-gray-500 text-sm">
        {session.startTime} - {session.endTime}
      </span>
    </div>
    
    <div className="space-y-3 text-sm">
      <div>
        <span className="text-xs text-gray-500 uppercase font-medium">Trigger</span>
        <p className="text-gray-300 mt-0.5">{session.trigger}</p>
      </div>
      
      {session.tasks && session.tasks.length > 0 && (
        <div>
          <span className="text-xs text-gray-500 uppercase font-medium">Tasks Completed</span>
          <ul className="mt-1.5 space-y-2">
            {session.tasks.map((task, i) => (
              <li key={i} className="text-gray-300">
                <span className="text-green-400">•</span> {task.description}
                {task.timeSpent && <span className="text-gray-500 ml-2">({task.timeSpent})</span>}
                {task.cost && <span className="text-gray-500 ml-1">[{task.cost}]</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {session.decisions && session.decisions.length > 0 && session.decisions[0] !== '' && (
        <div>
          <span className="text-xs text-gray-500 uppercase font-medium">Decisions Made</span>
          <ul className="mt-1.5 space-y-1">
            {session.decisions.filter(d => d).map((dec, i) => (
              <li key={i} className="text-gray-300 flex items-start gap-2">
                <Lightbulb size={12} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                <span>{dec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {session.blockers && session.blockers.length > 0 && session.blockers[0] !== 'None' && (
        <div>
          <span className="text-xs text-gray-500 uppercase font-medium">Blockers Surfaced</span>
          <ul className="mt-1.5 space-y-1">
            {session.blockers.filter(b => b && b !== 'None').map((blocker, i) => (
              <li key={i} className="text-red-300 flex items-start gap-2">
                <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                <span>{blocker}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {session.observations && session.observations.length > 0 && (
        <div>
          <span className="text-xs text-gray-500 uppercase font-medium">Observations</span>
          <ul className="mt-1.5 space-y-1">
            {session.observations.map((obs, i) => (
              <li key={i} className="text-gray-300 flex items-start gap-2">
                <Zap size={12} className="text-purple-400 mt-0.5 flex-shrink-0" />
                <span>{obs}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  </div>
);

const ReportDetailModal = ({ report, onClose }) => {
  if (!report) return null;

  const totalTasks = report.sessions?.reduce((sum, s) => sum + (s.tasks?.length || 0), 0) || 0;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">Daily Log - {report.date}</h3>
            <p className="text-sm text-gray-500">{report.sessions?.length || 0} session{(report.sessions?.length || 0) > 1 ? 's' : ''} • {totalTasks} tasks</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-5 space-y-6">
          {/* Sessions */}
          <section>
            <h4 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wide border-b border-gray-800 pb-2">
              Sessions
            </h4>
            <div className="space-y-3">
              {report.sessions?.map((session, i) => (
                <SessionCard key={i} session={session} index={i} />
              ))}
            </div>
          </section>
          
          {/* Daily Summary */}
          <section>
            <h4 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wide border-b border-gray-800 pb-2">
              Daily Summary
            </h4>
            <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-4 space-y-3 text-sm">
              <div className="flex items-center justify-between pb-2 border-b border-gray-700">
                <span className="text-gray-400">Total estimated cost</span>
                <span className="text-green-400 font-semibold">${report.costSummary?.totalCost?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Running monthly total</span>
                <span className="text-blue-400 font-semibold">${report.costSummary?.monthlyTotal?.toFixed(2) || '0.00'}</span>
              </div>
              
              {report.summary?.completed && report.summary.completed.length > 0 && (
                <div className="pt-2">
                  <span className="text-xs text-green-500 uppercase font-medium">Completed</span>
                  <ul className="mt-1 space-y-1">
                    {report.summary.completed.map((item, i) => (
                      <li key={i} className="text-gray-300 flex items-start gap-2">
                        <CheckCircle2 size={12} className="text-green-400 mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {report.summary?.inProgress && report.summary.inProgress.length > 0 && (
                <div className="pt-2">
                  <span className="text-xs text-yellow-500 uppercase font-medium">In Progress</span>
                  <ul className="mt-1 space-y-1">
                    {report.summary.inProgress.map((item, i) => (
                      <li key={i} className="text-gray-300 flex items-start gap-2">
                        <Clock size={12} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {report.summary?.proposedNext && report.summary.proposedNext.length > 0 && (
                <div className="pt-2">
                  <span className="text-xs text-blue-500 uppercase font-medium">Proposed Next</span>
                  <ul className="mt-1 space-y-1">
                    {report.summary.proposedNext.map((item, i) => (
                      <li key={i} className="text-gray-300 flex items-start gap-2">
                        <ArrowRight size={12} className="text-blue-400 mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {report.summary?.needsDecision && report.summary.needsDecision.length > 0 && (
                <div className="pt-2">
                  <span className="text-xs text-red-500 uppercase font-medium">Needs User Decision</span>
                  <ul className="mt-1 space-y-1">
                    {report.summary.needsDecision.map((item, i) => (
                      <li key={i} className="text-red-300 flex items-start gap-2">
                        <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
          
          {/* Cost Tracking Notes */}
          {report.costTracking && (
            <section>
              <h4 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wide border-b border-gray-800 pb-2">
                Cost Tracking Notes
              </h4>
              <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-4 text-sm text-gray-400 space-y-1">
                {report.costTracking.model && <p>Model: {report.costTracking.model}</p>}
                {report.costTracking.tokens && <p>Approximate tokens: {report.costTracking.tokens}</p>}
                {report.costTracking.apiCalls && <p>API calls: {report.costTracking.apiCalls}</p>}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

const AddReportModal = ({ onClose, onAdd }) => {
  const [form, setForm] = useState({
    sessions: [{
      startTime: '',
      endTime: '',
      trigger: '',
      tasks: [{ description: '', timeSpent: '', cost: '' }],
      decisions: [''],
      blockers: ['None'],
      observations: ['']
    }],
    costSummary: {
      totalCost: 0,
      monthlyTotal: 0
    },
    summary: {
      completed: [''],
      inProgress: [''],
      proposedNext: [''],
      needsDecision: ['']
    },
    costTracking: {
      model: 'moonshot/kimi-k2.5',
      tokens: '',
      apiCalls: ''
    }
  });

  const handleSubmit = () => {
    onAdd(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-4 flex items-center justify-between">
          <h3 className="text-xl font-bold">New Daily Log</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm text-gray-500 font-medium">Trigger / Context</label>
            <input 
              type="text"
              value={form.sessions[0].trigger}
              onChange={(e) => setForm({
                ...form, 
                sessions: [{...form.sessions[0], trigger: e.target.value}]
              })}
              className="w-full mt-1.5 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="How did work start?"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500 font-medium">Start Time</label>
              <input 
                type="time"
                value={form.sessions[0].startTime}
                onChange={(e) => setForm({
                  ...form, 
                  sessions: [{...form.sessions[0], startTime: e.target.value}]
                })}
                className="w-full mt-1.5 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-gray-500 font-medium">End Time</label>
              <input 
                type="time"
                value={form.sessions[0].endTime}
                onChange={(e) => setForm({
                  ...form, 
                  sessions: [{...form.sessions[0], endTime: e.target.value}]
                })}
                className="w-full mt-1.5 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          
          <div>
            <label className="text-sm text-gray-500 font-medium">Main Task</label>
            <input 
              type="text"
              value={form.sessions[0].tasks[0].description}
              onChange={(e) => setForm({
                ...form, 
                sessions: [{
                  ...form.sessions[0], 
                  tasks: [{...form.sessions[0].tasks[0], description: e.target.value}]
                }]
              })}
              className="w-full mt-1.5 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
              placeholder="Primary task completed"
            />
          </div>
          
          <div>
            <label className="text-sm text-gray-500 font-medium">Estimated Cost ($)</label>
            <input 
              type="number"
              step="0.01"
              value={form.costSummary.totalCost}
              onChange={(e) => setForm({
                ...form, 
                costSummary: {...form.costSummary, totalCost: parseFloat(e.target.value) || 0}
              })}
              className="w-full mt-1.5 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          
          <div className="flex gap-3 pt-4 border-t border-gray-800">
            <button 
              onClick={handleSubmit}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg transition-colors font-medium"
            >
              Save Log
            </button>
            <button 
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function DailyReports() {
  const { data, addDailyReport } = useData();
  const [selectedReport, setSelectedReport] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' or 'list'

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const getReportForDate = (day) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return data.dailyReports.find(r => r.date === dateStr);
  };

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const totalCompleted = data.dailyReports.reduce((sum, r) => 
    sum + (r.sessions?.reduce((sSum, s) => sSum + (s.tasks?.length || 0), 0) || 0), 0
  );
  const totalCost = data.dailyReports.reduce((sum, r) => sum + (r.costSummary?.totalCost || 0), 0);
  const avgTasks = data.dailyReports.length ? Math.round(totalCompleted / data.dailyReports.length * 10) / 10 : 0;
  const currentMonthTotal = data.dailyReports.length > 0 
    ? data.dailyReports[data.dailyReports.length - 1].costSummary?.monthlyTotal || 0
    : 0;

  // Sort reports by date descending
  const sortedReports = [...data.dailyReports].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Daily Reports</h2>
          <p className="text-gray-500 mt-1">Session logs with cost tracking</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex bg-gray-900 border border-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${
                viewMode === 'calendar' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <CalendarIcon size={16} />
              Calendar
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${
                viewMode === 'list' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <List size={16} />
              List
            </button>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={18} />
            Add Log
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <CheckCircle2 size={20} className="text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCompleted}</p>
              <p className="text-gray-500 text-sm">Tasks Done</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <TrendingUp size={20} className="text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{avgTasks}</p>
              <p className="text-gray-500 text-sm">Avg/Day</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <DollarSign size={20} className="text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">${totalCost.toFixed(2)}</p>
              <p className="text-gray-500 text-sm">Total Cost</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <CalendarIcon size={20} className="text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">${currentMonthTotal.toFixed(2)}</p>
              <p className="text-gray-500 text-sm">Monthly</p>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-lg">{monthName}</h3>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs text-gray-500 py-2 font-medium">{day}</div>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const report = getReportForDate(day);
              const isToday = new Date().toDateString() === new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toDateString();
              const taskCount = report ? report.sessions?.reduce((sum, s) => sum + (s.tasks?.length || 0), 0) : 0;
              const hasBlockers = report ? report.sessions?.some(s => s.blockers?.some(b => b && b !== 'None')) : false;
              const totalCost = report?.costSummary?.totalCost || 0;
              
              return (
                <div 
                  key={day}
                  onClick={() => report && setSelectedReport(report)}
                  className={`aspect-square p-2 rounded-lg border cursor-pointer transition-all ${
                    report 
                      ? 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20' 
                      : 'border-gray-800 hover:border-gray-600'
                  } ${isToday ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <span className={`text-sm ${isToday ? 'text-blue-400 font-semibold' : 'text-gray-400'}`}>{day}</span>
                  {report && (
                    <div className="mt-1 space-y-0.5">
                      {taskCount > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          <span className="text-[10px] text-gray-500">{taskCount}</span>
                        </div>
                      )}
                      {totalCost > 0 && (
                        <div className="text-[10px] text-purple-400">${totalCost.toFixed(0)}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-4 mt-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Tasks completed
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              Has blockers
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              Today
            </div>
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-700 bg-gray-900/50">
            <h3 className="font-semibold">All Reports</h3>
          </div>
          <div className="divide-y divide-gray-800">
            {sortedReports.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <FileText size={48} className="mx-auto mb-3 opacity-30" />
                <p>No daily logs yet</p>
              </div>
            ) : (
              sortedReports.map(report => {
                const taskCount = report.sessions?.reduce((sum, s) => sum + (s.tasks?.length || 0), 0) || 0;
                const hasBlockers = report.sessions?.some(s => s.blockers?.some(b => b && b !== 'None')) || false;
                const totalCost = report.costSummary?.totalCost || 0;
                
                return (
                  <div 
                    key={report.date}
                    onClick={() => setSelectedReport(report)}
                    className="p-4 hover:bg-gray-800/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-center min-w-[60px]">
                          <div className="text-lg font-bold text-white">
                            {new Date(report.date).getDate()}
                          </div>
                          <div className="text-xs text-gray-500 uppercase">
                            {new Date(report.date).toLocaleDateString('en-US', { month: 'short' })}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium text-white">{report.date}</h4>
                          <p className="text-sm text-gray-400">
                            {report.sessions?.length || 0} session{(report.sessions?.length || 0) > 1 ? 's' : ''} • {taskCount} tasks
                            {report.sessions?.[0]?.trigger && (
                              <span className="ml-2 text-gray-500">— {report.sessions[0].trigger}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-purple-400">
                          ${totalCost.toFixed(2)}
                        </span>
                        <div className="flex items-center gap-2">
                          {taskCount > 0 && (
                            <span className="flex items-center gap-1 text-sm text-green-400">
                              <CheckCircle2 size={14} />
                              {taskCount}
                            </span>
                          )}
                          {hasBlockers && (
                            <span className="text-red-400">
                              <AlertCircle size={16} />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedReport && (
        <ReportDetailModal report={selectedReport} onClose={() => setSelectedReport(null)} />
      )}
      {showAddModal && (
        <AddReportModal onClose={() => setShowAddModal(false)} onAdd={addDailyReport} />
      )}
    </div>
  );
}

export default DailyReports;
