import React, { useState, useEffect } from 'react';
import { Activity, Clock, DollarSign, Zap, PauseCircle, PlayCircle, AlertCircle, TrendingUp, Brain } from 'lucide-react';
import { useData } from '../hooks/useData';

const AgentStatus = () => {
  const [sessionTime, setSessionTime] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [currentCost, setCurrentCost] = useState(0);
  const [actualCosts, setActualCosts] = useState(null);
  const { data } = useData();
  
  const currentTask = data.kanban.inProgress[0];
  const blockedCount = data.kanban.blocked.length;
  
  // Fetch actual costs from API
  useEffect(() => {
    const fetchCosts = async () => {
      try {
        const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';
        const response = await fetch(`${API_BASE}/api/costs/actual`);
        if (response.ok) {
          const costData = await response.json();
          setActualCosts(costData);
        }
      } catch (err) {
        console.error('Failed to fetch actual costs:', err);
      }
    };
    
    fetchCosts();
    const interval = setInterval(fetchCosts, 5 * 60 * 1000); // Refresh every 5 min
    return () => clearInterval(interval);
  }, []);
  
  // Use actual costs if available, fallback to estimates
  const todayCost = actualCosts?.actual?.todayUSD || data.dailyReports[0]?.costSummary?.totalCost || 0;
  const monthlyTotal = actualCosts?.actual?.totalUSD || data.dailyReports[0]?.costSummary?.monthlyTotal || 0;
  
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionTime(prev => prev + 1);
      // Estimate cost: ~$0.01 per minute of active work
      setCurrentCost(prev => prev + 0.0005);
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);
  
  const formatTime = (minutes) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <Brain size={20} className="text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900 animate-pulse" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Megatron Status</h3>
            <p className="text-sm text-green-400 flex items-center gap-1">
              <Activity size={12} />
              {isActive ? 'Currently Working' : 'Idle'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Session Time</p>
          <p className="text-xl font-bold text-white">{formatTime(sessionTime)}</p>
        </div>
      </div>
      
      {currentTask ? (
        <div className="bg-gray-900/50 rounded-lg p-3 mb-4">
          <p className="text-xs text-gray-500 uppercase mb-1">Current Task</p>
          <p className="text-white font-medium">{currentTask.title}</p>
          <div className="flex items-center gap-3 mt-2 text-xs">
            <span className="text-yellow-400 flex items-center gap-1">
              <Clock size={10} />
              Started {currentTask.started}
            </span>
            <span className="text-blue-400 flex items-center gap-1">
              <DollarSign size={10} />
              +${currentCost.toFixed(3)} this session
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-gray-900/50 rounded-lg p-3 mb-4 text-center">
          <p className="text-gray-500 text-sm">No active task</p>
          <p className="text-xs text-gray-600 mt-1">Check Megatron's Work board</p>
        </div>
      )}
      
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-900/50 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-white">{data.kanban.inProgress.length}</p>
          <p className="text-xs text-gray-500">In Progress</p>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-2 text-center">
          <div className="flex items-center justify-center gap-1">
            <p className="text-lg font-bold text-yellow-400">${todayCost.toFixed(2)}</p>
            {actualCosts && (
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Live API data" />
            )}
          </div>
          <p className="text-xs text-gray-500">Today {actualCosts ? '(Live)' : '(Est)'}</p>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-purple-400">${monthlyTotal.toFixed(2)}</p>
          <p className="text-xs text-gray-500">This Month</p>
        </div>
      </div>
      
      {blockedCount > 0 && (
        <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-3">
          <AlertCircle size={18} className="text-red-400" />
          <div className="flex-1">
            <p className="text-sm text-red-400 font-medium">{blockedCount} item{blockedCount > 1 ? 's' : ''} blocked</p>
            <p className="text-xs text-gray-500">Needs your input</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentStatus;
