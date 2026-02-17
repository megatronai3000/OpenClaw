/**
 * WebSocket Server Module - Socket.io Integration
 * Provides real-time updates for dashboard
 * 
 * Features:
 * - Task progress streaming
 * - MiniMax quota status
 * - Autonomous mode broadcasting
 * - Room-based subscriptions
 */

const { Server } = require('socket.io');
const EventEmitter = require('events');

class DashboardWebSocket extends EventEmitter {
  constructor(httpServer, corsOptions = {}) {
    super();
    this.io = new Server(httpServer, {
      cors: {
        origin: corsOptions.origin || ["http://localhost:3000", "http://localhost:3002"],
        methods: ["GET", "POST"],
        credentials: true
      },
      path: '/socket.io',
      transports: ['websocket', 'polling']
    });
    
    this.clients = new Map();
    this.activeTasks = new Map();
    this.miniMaxQuota = null;
    this.autonomousStatus = {
      enabled: false,
      activeTasks: [],
      completedTasks: [],
      stats: {
        totalTasks: 0,
        successRate: 0,
        avgDuration: 0
      }
    };
    
    this.setupSocketHandlers();
    this.startPeriodicUpdates();
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`[Socket.io] Client connected: ${socket.id}`);
      
      // Store client info
      this.clients.set(socket.id, {
        socket,
        rooms: new Set(),
        subscribedTasks: new Set(),
        connectedAt: new Date()
      });
      
      // Send initial state
      this.sendInitialState(socket);
      
      // Handle room subscriptions
      socket.on('subscribe', (room) => {
        socket.join(room);
        this.clients.get(socket.id).rooms.add(room);
        console.log(`[Socket.io] Client ${socket.id} joined room: ${room}`);
        
        // Send room-specific data immediately
        if (room === 'minimax-quota') {
          socket.emit('minimax:quota', this.miniMaxQuota);
        } else if (room === 'autonomous') {
          socket.emit('autonomous:status', this.autonomousStatus);
        } else if (room.startsWith('task:')) {
          const taskId = room.replace('task:', '');
          const task = this.activeTasks.get(taskId);
          if (task) {
            socket.emit('task:init', task);
          }
        }
      });
      
      socket.on('unsubscribe', (room) => {
        socket.leave(room);
        this.clients.get(socket.id).rooms.delete(room);
        console.log(`[Socket.io] Client ${socket.id} left room: ${room}`);
      });
      
      // Handle task subscriptions
      socket.on('task:subscribe', (taskId) => {
        socket.join(`task:${taskId}`);
        this.clients.get(socket.id).subscribedTasks.add(taskId);
        console.log(`[Socket.io] Client ${socket.id} subscribed to task: ${taskId}`);
        
        // Send current task state
        const task = this.activeTasks.get(taskId);
        if (task) {
          socket.emit('task:init', task);
        }
      });
      
      socket.on('task:unsubscribe', (taskId) => {
        socket.leave(`task:${taskId}`);
        this.clients.get(socket.id).subscribedTasks.delete(taskId);
      });
      
      // Handle ping
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
      });
      
      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`[Socket.io] Client disconnected: ${socket.id} (${reason})`);
        this.clients.delete(socket.id);
      });
    });
  }

  sendInitialState(socket) {
    socket.emit('connection:success', {
      socketId: socket.id,
      serverTime: new Date().toISOString(),
      activeTasks: Array.from(this.activeTasks.values()).map(t => ({
        id: t.id,
        title: t.title,
        agent: t.agent,
        status: t.status,
        progress: t.progress
      })),
      autonomous: this.autonomousStatus,
      miniMaxQuota: this.miniMaxQuota
    });
  }

  // Task Progress Methods
  startTask(taskData) {
    const task = {
      id: taskData.id || `task-${Date.now()}`,
      title: taskData.title || 'Untitled Task',
      agent: taskData.agent || 'system',
      status: 'started',
      progress: 0,
      phases: taskData.phases || [],
      currentPhase: 0,
      logs: [],
      startedAt: new Date(),
      estimatedDuration: taskData.estimatedDuration || 0,
      actualCost: 0,
      estimatedCost: taskData.estimatedCost || 0,
      metadata: taskData.metadata || {}
    };
    
    this.activeTasks.set(task.id, task);
    
    // Broadcast to all clients
    this.io.emit('task:started', {
      id: task.id,
      title: task.title,
      agent: task.agent,
      status: task.status,
      progress: task.progress,
      startedAt: task.startedAt
    });
    
    this.emit('taskStarted', task);
    return task;
  }

  updateTaskProgress(taskId, progress, details = {}) {
    const task = this.activeTasks.get(taskId);
    if (!task) return;
    
    task.progress = Math.min(100, Math.max(0, progress));
    if (details.phase !== undefined) task.currentPhase = details.phase;
    if (details.status) task.status = details.status;
    if (details.message) {
      task.logs.push({
        timestamp: new Date(),
        message: details.message,
        level: details.level || 'info'
      });
    }
    
    // Broadcast to task-specific room
    this.io.to(`task:${taskId}`).emit('task:progress', {
      taskId,
      progress: task.progress,
      status: task.status,
      currentPhase: task.currentPhase,
      phaseName: task.phases[task.currentPhase]?.name || 'Unknown',
      message: details.message,
      timestamp: new Date().toISOString()
    });
    
    this.emit('taskProgress', { taskId, progress, task });
  }

  updateTaskPhase(taskId, phaseIndex, status, details = {}) {
    const task = this.activeTasks.get(taskId);
    if (!task || !task.phases[phaseIndex]) return;
    
    task.phases[phaseIndex].status = status;
    task.currentPhase = phaseIndex;
    
    if (status === 'completed') {
      task.phases[phaseIndex].completedAt = new Date();
    }
    
    this.io.to(`task:${taskId}`).emit('task:phase', {
      taskId,
      phaseIndex,
      phaseName: task.phases[phaseIndex].name,
      status,
      details,
      timestamp: new Date().toISOString()
    });
    
    this.emit('taskPhaseUpdated', { taskId, phaseIndex, status });
  }

  logTaskEvent(taskId, message, level = 'info', metadata = {}) {
    const task = this.activeTasks.get(taskId);
    if (!task) return;
    
    const logEntry = {
      timestamp: new Date(),
      message,
      level,
      metadata
    };
    
    task.logs.push(logEntry);
    
    this.io.to(`task:${taskId}`).emit('task:log', {
      taskId,
      ...logEntry,
      timestamp: logEntry.timestamp.toISOString()
    });
    
    this.emit('taskLog', { taskId, log: logEntry });
  }

  completeTask(taskId, result = {}) {
    const task = this.activeTasks.get(taskId);
    if (!task) return;
    
    task.status = 'completed';
    task.progress = 100;
    task.completedAt = new Date();
    task.result = result;
    
    this.io.to(`task:${taskId}`).emit('task:completed', {
      taskId,
      result,
      duration: task.completedAt - task.startedAt,
      actualCost: task.actualCost,
      timestamp: task.completedAt.toISOString()
    });
    
    // Also broadcast to general progress room
    this.io.to('progress').emit('task:completed', {
      id: taskId,
      title: task.title,
      agent: task.agent,
      duration: task.completedAt - task.startedAt,
      timestamp: task.completedAt.toISOString()
    });
    
    this.emit('taskCompleted', task);
    
    // Keep for a bit then remove
    setTimeout(() => {
      this.activeTasks.delete(taskId);
    }, 300000); // 5 minutes
    
    return task;
  }

  failTask(taskId, error) {
    const task = this.activeTasks.get(taskId);
    if (!task) return;
    
    task.status = 'failed';
    task.error = error;
    task.failedAt = new Date();
    
    this.io.to(`task:${taskId}`).emit('task:failed', {
      taskId,
      error: error.message || error,
      timestamp: task.failedAt.toISOString()
    });
    
    this.emit('taskFailed', { taskId, error });
    
    // Keep failed tasks for debugging
    setTimeout(() => {
      this.activeTasks.delete(taskId);
    }, 600000); // 10 minutes
    
    return task;
  }

  // MiniMax Quota Methods
  updateMiniMaxQuota(quotaData) {
    this.miniMaxQuota = {
      ...quotaData,
      lastUpdated: new Date().toISOString()
    };
    
    this.io.to('minimax-quota').emit('minimax:quota', this.miniMaxQuota);
    this.emit('miniMaxQuotaUpdated', this.miniMaxQuota);
  }

  broadcastMiniMaxAlert(alertType, message, details = {}) {
    this.io.to('minimax-quota').emit('minimax:alert', {
      type: alertType,
      message,
      details,
      timestamp: new Date().toISOString()
    });
  }

  // Autonomous Mode Methods
  setAutonomousStatus(status) {
    this.autonomousStatus = {
      ...this.autonomousStatus,
      ...status,
      lastUpdated: new Date().toISOString()
    };
    
    this.io.to('autonomous').emit('autonomous:status', this.autonomousStatus);
    this.emit('autonomousStatusChanged', this.autonomousStatus);
  }

  broadcastAutonomousTaskStarted(task) {
    this.io.to('autonomous').emit('autonomous:task:started', {
      ...task,
      timestamp: new Date().toISOString()
    });
  }

  broadcastAutonomousTaskProgress(taskId, progress) {
    this.io.to('autonomous').emit('autonomous:task:progress', {
      taskId,
      progress,
      timestamp: new Date().toISOString()
    });
  }

  broadcastAutonomousTaskCompleted(taskId, result) {
    this.io.to('autonomous').emit('autonomous:task:completed', {
      taskId,
      result,
      timestamp: new Date().toISOString()
    });
  }

  broadcastAutonomousAlert(alertType, message, details = {}) {
    this.io.to('autonomous').emit('autonomous:alert', {
      type: alertType,
      message,
      details,
      timestamp: new Date().toISOString()
    });
  }

  // System-wide broadcasts
  broadcastSystemMessage(message, level = 'info') {
    this.io.emit('system:message', {
      message,
      level,
      timestamp: new Date().toISOString()
    });
  }

  broadcastCostUpdate(costData) {
    this.io.to('costs').emit('cost:update', {
      ...costData,
      timestamp: new Date().toISOString()
    });
  }

  // Stats and monitoring
  getStats() {
    return {
      connectedClients: this.clients.size,
      activeTasks: this.activeTasks.size,
      autonomousTasks: this.autonomousStatus.activeTasks.length,
      rooms: Array.from(this.io.sockets.adapter.rooms.keys()),
      uptime: process.uptime()
    };
  }

  startPeriodicUpdates() {
    // Send stats every 30 seconds
    setInterval(() => {
      const stats = this.getStats();
      this.io.to('monitoring').emit('server:stats', stats);
    }, 30000);
    
    // Heartbeat every 10 seconds
    setInterval(() => {
      this.io.emit('server:heartbeat', {
        timestamp: Date.now()
      });
    }, 10000);
  }

  // Graceful shutdown
  async close() {
    // Notify all clients
    this.io.emit('server:shutdown', {
      message: 'Server is shutting down',
      timestamp: new Date().toISOString()
    });
    
    // Close all connections
    const closePromises = [];
    this.clients.forEach((client, id) => {
      closePromises.push(
        new Promise((resolve) => {
          client.socket.disconnect(true);
          resolve();
        })
      );
    });
    
    await Promise.all(closePromises);
    this.io.close();
  }
}

module.exports = DashboardWebSocket;