import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line } from 'recharts';
import { DollarSign, TrendingUp, Clock, Target } from 'lucide-react';
import { useData } from '../hooks/useData';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const WorkloadCharts = () => {
  const { data } = useData();
  
  // Cost by project (mock distribution based on priority/progress)
  const projectCostData = data.projects.map((p, i) => ({
    name: p.name,
    value: p.progress * (p.priority === 'hot' ? 2 : p.priority === 'warm' ? 1.5 : 1),
    color: COLORS[i % COLORS.length]
  })).filter(p => p.value > 0);
  
  // Daily cost trend (last 7 days)
  const dailyTrend = data.dailyReports.slice(0, 7).reverse().map(r => ({
    date: r.date.slice(5),
    cost: r.costSummary?.totalCost || 0,
    tasks: r.sessions?.reduce((sum, s) => sum + (s.tasks?.length || 0), 0) || 0
  }));
  
  // Task status distribution
  const taskStatus = [
    { name: 'Completed', count: data.tasks.filter(t => t.status === 'completed').length },
    { name: 'In Progress', count: data.tasks.filter(t => t.status === 'in-progress').length },
    { name: 'Pending', count: data.tasks.filter(t => t.status === 'pending').length },
    { name: 'Blocked', count: data.tasks.filter(t => t.status === 'blocked').length },
  ].filter(t => t.count > 0);

  const totalCost = data.dailyReports.reduce((sum, r) => sum + (r.costSummary?.totalCost || 0), 0);
  const avgDaily = data.dailyReports.length ? totalCost / data.dailyReports.length : 0;
  const projectedMonthly = avgDaily * 30;

  return (
    <div className="space-y-4">
      {/* Cost Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={16} className="text-green-400" />
            <span className="text-sm text-gray-500">Avg Daily</span>
          </div>
          <p className="text-2xl font-bold text-white">${avgDaily.toFixed(2)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-purple-400" />
            <span className="text-sm text-gray-500">Projected/Month</span>
          </div>
          <p className="text-2xl font-bold text-white">${projectedMonthly.toFixed(2)}</p>
        </div>
      </div>
      
      {/* Cost Trend Chart */}
      {dailyTrend.length > 1 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
            <Clock size={14} />
            Daily Cost Trend
          </h4>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyTrend}>
                <XAxis dataKey="date" tick={{fill: '#6B7280', fontSize: 10}} axisLine={false} tickLine={false} />
                <YAxis tick={{fill: '#6B7280', fontSize: 10}} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip 
                  contentStyle={{backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px'}}
                  itemStyle={{color: '#fff'}}
                />
                <Line type="monotone" dataKey="cost" stroke="#3B82F6" strokeWidth={2} dot={{fill: '#3B82F6'}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      
      {/* Task Distribution */}
      {taskStatus.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
            <Target size={14} />
            Task Status
          </h4>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={taskStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={50}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {taskStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 mt-2 justify-center">
            {taskStatus.map((s, i) => (
              <div key={s.name} className="flex items-center gap-1 text-xs">
                <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}} />
                <span className="text-gray-400">{s.name}: {s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkloadCharts;
