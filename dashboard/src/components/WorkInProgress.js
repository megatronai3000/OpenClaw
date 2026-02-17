import React, { useState, useEffect, useRef } from 'react';
import { Play, CheckCircle, Clock, AlertCircle, Loader2, Terminal, ChevronDown, ChevronUp, Activity, Users, RefreshCw } from 'lucide-react';
import { useData } from '../hooks/useData';

const ProgressBar = ({ progress, status }) => {
  const getColor = () => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'active': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
      <div 
        className={`h-full transition-all duration-500 ${getColor()}`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

const PhaseIndicator = ({ phase, isActive, isCompleted }) => {
  const getIcon = () => {
    if (isCompleted) return <CheckCircle size={16} className="text-green-400" />;
    if (isActive) return <Loader2 size={16} className="text-blue-400 animate-spin" />;
    return <Clock size={16} className="text-gray-500" />;
  };

  const getClass = () => {
    if (isCompleted) return 'border-green-500/30 bg-green-500/10';
    if (isActive) return 'border-blue-500/30 bg-blue-500/10';
    return 'border-gray-700 bg-gray-800/50';
  };

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${getClass()}`}>
      {getIcon()}
      <div className="flex-1">
        <p className={`text-sm font-medium ${isActive ? 'text-blue-400' : isCompleted ? 'text-green-400' : 'text-gray-400'}`}>
          {phase.name}
        </p>
        {phase.details && (
          <p className="text-xs text-gray-500 mt-0.5">{phase.details}</p>
        )}
      </div>
      {phase.startedAt && (
        <span className="text-xs text-gray-500">
          {new Date(phase.startedAt).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
};

const WorkItem = ({ work, expanded, onToggle }) => {
  const getStatusIcon = () => {
    switch (work.status) {
      case 'completed': return <CheckCircle size={20} className="text-green-400" />;
      case 'failed': return <AlertCircle size={20} className="text-red-400" />;
      case 'active': return <Activity size={20} className="text-blue-400" />;
      default: return <Clock size={20} className="text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (work.status) {
      case 'completed': return 'text-green-400';
      case 'failed': return 'text-red-400';
      case 'active': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const duration = work.completedAt 
    ? new Date(work.completedAt) - new Date(work.startedAt)
    : Date.now() - new Date(work.startedAt);
  
  const durationMinutes = Math.floor(duration / 60000);
  const durationSeconds = Math.floor((duration % 60000) / 1000);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div 
        className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-800/50 transition-colors"
        onClick={onToggle}
      >
        {getStatusIcon()}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-white truncate">{work.title}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
              {work.agent}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1">
            <span className={`text-xs ${getStatusColor()}`}>
              {work.status === 'active' ? 'In Progress' : work.status}
            </span>
            <span className="text-xs text-gray-500">
              {durationMinutes}m {durationSeconds}s
            </span>
            <span className="text-xs text-gray-500">
              {work.progress}%
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ProgressBar progress={work.progress} status={work.status} />
          {expanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-gray-800 p-4 space-y-4">
          {/* Phases */}
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
              <Play size={14} />
              Phases
            </h4>
            <div className="space-y-2">
              {work.phases.map((phase, idx) => (
                <PhaseIndicator 
                  key={idx}
                  phase={phase}
                  isActive={phase.status === 'active'}
                  isCompleted={phase.status === 'completed'}
                />
              ))}
            </div>
          </div>

          {/* Logs */}
          {work.logs && work.logs.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                <Terminal size={14} />
                Recent Logs
              </h4>
              <div className="bg-black rounded-lg p-3 max-h-48 overflow-y-auto font-mono text-xs space-y-1">
                {work.logs.slice(-10).map((log, idx) => (
                  <div key={idx} className="flex gap-2">
                    <span className="text-gray-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={
                      log.level === 'error' ? 'text-red-400' :
                      log.level === 'warn' ? 'text-yellow-400' :
                      log.level === 'debug' ? 'text-gray-500' :
                      'text-gray-300'
                    }>
                      [{log.level.toUpperCase()}]
                    </span>
                    <span className="text-gray-300">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Result */}
          {work.result && (
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">Result</h4>
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <pre className="text-xs text-green-400 whitespace-pre-wrap">
                  {typeof work.result === 'string' ? work.result : JSON.stringify(work.result, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Error */}
          {work.error && (
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">Error</h4>
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-xs text-red-400">{work.error}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

function WorkInProgress() {
  const [activeWork, setActiveWork] = useState([]);
  const [recentWork, setRecentWork] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const connectWebSocket = () => {
    const ws = new WebSocket('ws://localhost:3001/ws/progress');

    ws.onopen = () => {
      console.log('[WorkInProgress] WebSocket connected');
      setIsConnected(true);
      // Subscribe to all events
      ws.send(JSON.stringify({ action: 'subscribeAll' }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        setLastUpdate(new Date());

        switch (message.type) {
          case 'init':
            setActiveWork(message.data?.active || []);
            break;

          case 'workStarted':
            const newWork = message.data;
            setActiveWork(prev => {
              const exists = prev.find(w => w.id === newWork.id);
              if (exists) return prev;
              return [newWork, ...prev];
            });
            break;

          case 'phaseUpdated':
            const { workId: phaseWorkId, phaseIndex, status: phaseStatus, work: updatedWork } = message.data || {};
            setActiveWork(prev => prev.map(work => {
              if (work.id === phaseWorkId) {
                return updatedWork || {
                  ...work,
                  phases: work.phases.map((p, idx) =>
                    idx === phaseIndex ? { ...p, status: phaseStatus } : p
                  ),
                  progress: Math.round(
                    (work.phases.filter(p => p.status === 'completed').length / work.phases.length) * 100
                  )
                };
              }
              return work;
            }));
            break;

          case 'logAdded':
            const { workId: logWorkId, log } = message.data || {};
            setActiveWork(prev => prev.map(work => {
              if (work.id === logWorkId) {
                return {
                  ...work,
                  logs: [...(work.logs || []), log]
                };
              }
              return work;
            }));
            break;

          case 'workCompleted':
            const completedWork = message.data;
            setActiveWork(prev => prev.filter(w => w.id !== completedWork?.id));
            break;

          case 'workFailed':
            const { workId: failedWorkId, error } = message.data || {};
            setActiveWork(prev => prev.map(work =>
              work.id === failedWorkId
                ? { ...work, status: 'failed', error }
                : work
            ));
            break;

          default:
            break;
        }
      } catch (err) {
        console.error('[WorkInProgress] Failed to parse message:', err);
      }
    };

    ws.onclose = () => {
      console.log('[WorkInProgress] WebSocket disconnected');
      setIsConnected(false);
      
      // Reconnect after 5 seconds
      reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
    };

    ws.onerror = (err) => {
      console.error('[WorkInProgress] WebSocket error:', err);
      setIsConnected(false);
    };

    wsRef.current = ws;
  };

  const fetchRecentWork = async () => {
    try {
      // For now, we'll rely on WebSocket updates
      // This could be extended to fetch from API endpoint
    } catch (err) {
      console.error('[WorkInProgress] Failed to fetch recent work:', err);
    }
  };

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // Reconnect when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isConnected) {
        connectWebSocket();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isConnected]);

  const activeCount = activeWork.filter(w => w.status === 'active').length;
  const completedToday = activeWork.filter(w => w.status === 'completed').length;

  return (
    <div className="p-6 h-full overflow-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Activity size={24} className="text-blue-400" />
              Work in Progress
            </h2>
            <p className="text-gray-500 mt-1">
              Real-time progress tracking for all active agent work
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isConnected ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              <span className={`text-sm ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                {isConnected ? 'Live' : 'Disconnected'}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
              <Users size={16} className="text-blue-400" />
              <span className="text-sm text-gray-400">Active:</span>
              <span className="text-white font-semibold">{activeCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Active Work</p>
              <p className="text-2xl font-bold text-white mt-1">{activeCount}</p>
            </div>
            <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <Activity size={24} className="text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Completed Today</p>
              <p className="text-2xl font-bold text-white mt-1">{completedToday}</p>
            </div>
            <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
              <CheckCircle size={24} className="text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Last Update</p>
              <p className="text-sm font-medium text-white mt-1">
                {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}
              </p>
            </div>
            <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
              <RefreshCw size={24} className={`text-gray-400 ${isConnected ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Active Work List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Loader2 size={18} className="text-blue-400" />
          Active Work
        </h3>
        
        {activeWork.length === 0 ? (
          <div className="text-center py-12 bg-gray-900/50 border border-gray-800 rounded-xl">
            <Activity size={48} className="text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500">No active work</p>
            <p className="text-sm text-gray-600 mt-1">Agents will appear here when they start working</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeWork.map(work => (
              <WorkItem 
                key={work.id}
                work={work}
                expanded={expandedId === work.id}
                onToggle={() => setExpandedId(expandedId === work.id ? null : work.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Connection Status Footer */}
      {!isConnected && (
        <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} className="text-yellow-400" />
          <div className="flex-1">
            <p className="text-yellow-400 font-medium">WebSocket Disconnected</p>
            <p className="text-sm text-yellow-400/70">Attempting to reconnect...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkInProgress;
