/**
 * Dashboard WebSocket Client
 * Handles Socket.io connection for real-time dashboard updates
 * 
 * Usage:
 *   const client = new DashboardSocketClient('http://localhost:3001');
 *   client.connect();
 *   client.onTaskProgress((data) => console.log(data.progress));
 */

class DashboardSocketClient {
  constructor(serverUrl = 'http://localhost:3001', options = {}) {
    this.serverUrl = serverUrl;
    this.socket = null;
    this.options = {
      autoReconnect: true,
      reconnectDelay: 3000,
      maxReconnectAttempts: 10,
      ...options
    };
    
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.isConnected = false;
    this.subscribedTasks = new Set();
    this.subscribedRooms = new Set();
    
    // Event handlers
    this.handlers = {
      connect: [],
      disconnect: [],
      error: [],
      taskProgress: [],
      taskStarted: [],
      taskCompleted: [],
      taskFailed: [],
      taskPhase: [],
      taskLog: [],
      miniMaxQuota: [],
      miniMaxAlert: [],
      autonomousStatus: [],
      autonomousTask: [],
      autonomousAlert: [],
      costUpdate: [],
      systemMessage: [],
      heartbeat: []
    };
  }

  connect() {
    if (this.socket) {
      console.log('[SocketClient] Already connected or connecting');
      return;
    }

    try {
      // Use global io from socket.io-client script
      if (typeof io === 'undefined') {
        throw new Error('Socket.io client library not loaded. Include <script src="/socket.io/socket.io.js"></script>');
      }

      this.socket = io(this.serverUrl, {
        transports: ['websocket', 'polling'],
        reconnection: false, // Handle manually
        query: {
          clientId: this.generateClientId(),
          version: '1.0.0'
        }
      });

      this.setupEventHandlers();
    } catch (err) {
      console.error('[SocketClient] Connection error:', err);
      this.trigger('error', err);
      this.scheduleReconnect();
    }
  }

  setupEventHandlers() {
    // Connection events
    this.socket.on('connect', () => {
      console.log('[SocketClient] Connected:', this.socket.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.trigger('connect', { socketId: this.socket.id });
      
      // Resubscribe to previous rooms/tasks
      this.restoreSubscriptions();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[SocketClient] Disconnected:', reason);
      this.isConnected = false;
      this.trigger('disconnect', { reason });
      
      if (this.options.autoReconnect && reason !== 'io client disconnect') {
        this.scheduleReconnect();
      }
    });

    this.socket.on('connect_error', (err) => {
      console.error('[SocketClient] Connection error:', err.message);
      this.trigger('error', err);
      this.scheduleReconnect();
    });

    // Initial state
    this.socket.on('connection:success', (data) => {
      console.log('[SocketClient] Server ready:', data);
    });

    // Task events
    this.socket.on('task:started', (data) => {
      console.log('[SocketClient] Task started:', data.title);
      this.trigger('taskStarted', data);
    });

    this.socket.on('task:progress', (data) => {
      this.trigger('taskProgress', data);
    });

    this.socket.on('task:phase', (data) => {
      this.trigger('taskPhase', data);
    });

    this.socket.on('task:log', (data) => {
      this.trigger('taskLog', data);
    });

    this.socket.on('task:completed', (data) => {
      console.log('[SocketClient] Task completed:', data.taskId);
      this.subscribedTasks.delete(data.taskId);
      this.trigger('taskCompleted', data);
    });

    this.socket.on('task:failed', (data) => {
      console.error('[SocketClient] Task failed:', data);
      this.trigger('taskFailed', data);
    });

    this.socket.on('task:init', (data) => {
      this.trigger('taskProgress', { ...data, isInitial: true });
    });

    // MiniMax events
    this.socket.on('minimax:quota', (data) => {
      this.trigger('miniMaxQuota', data);
    });

    this.socket.on('minimax:alert', (data) => {
      console.warn('[SocketClient] MiniMax alert:', data);
      this.trigger('miniMaxAlert', data);
    });

    // Autonomous mode events
    this.socket.on('autonomous:status', (data) => {
      this.trigger('autonomousStatus', data);
    });

    this.socket.on('autonomous:task:started', (data) => {
      this.trigger('autonomousTask', { type: 'started', ...data });
    });

    this.socket.on('autonomous:task:progress', (data) => {
      this.trigger('autonomousTask', { type: 'progress', ...data });
    });

    this.socket.on('autonomous:task:completed', (data) => {
      this.trigger('autonomousTask', { type: 'completed', ...data });
    });

    this.socket.on('autonomous:alert', (data) => {
      this.trigger('autonomousAlert', data);
    });

    // Cost updates
    this.socket.on('cost:update', (data) => {
      this.trigger('costUpdate', data);
    });

    // System messages
    this.socket.on('system:message', (data) => {
      console.log('[SocketClient] System:', data.message);
      this.trigger('systemMessage', data);
    });

    this.socket.on('server:heartbeat', (data) => {
      this.trigger('heartbeat', data);
    });

    this.socket.on('server:shutdown', (data) => {
      console.warn('[SocketClient] Server shutting down:', data.message);
      this.options.autoReconnect = false;
    });

    // Ping/pong for latency
    this.socket.on('pong', (data) => {
      const latency = Date.now() - data.timestamp;
      this.latency = latency;
    });
  }

  scheduleReconnect() {
    if (!this.options.autoReconnect) return;
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      console.error('[SocketClient] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.options.reconnectDelay * Math.min(this.reconnectAttempts, 5);
    
    console.log(`[SocketClient] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.socket = null;
      this.connect();
    }, delay);
  }

  restoreSubscriptions() {
    // Restore room subscriptions
    this.subscribedRooms.forEach(room => {
      this.socket.emit('subscribe', room);
    });

    // Restore task subscriptions
    this.subscribedTasks.forEach(taskId => {
      this.socket.emit('task:subscribe', taskId);
    });
  }

  // Subscription methods
  subscribeToTask(taskId) {
    if (!this.isConnected) {
      this.subscribedTasks.add(taskId);
      return false;
    }
    
    this.subscribedTasks.add(taskId);
    this.socket.emit('task:subscribe', taskId);
    return true;
  }

  unsubscribeFromTask(taskId) {
    this.subscribedTasks.delete(taskId);
    if (this.isConnected) {
      this.socket.emit('task:unsubscribe', taskId);
    }
  }

  subscribeToRoom(room) {
    if (!this.isConnected) {
      this.subscribedRooms.add(room);
      return false;
    }
    
    this.subscribedRooms.add(room);
    this.socket.emit('subscribe', room);
    return true;
  }

  unsubscribeFromRoom(room) {
    this.subscribedRooms.delete(room);
    if (this.isConnected) {
      this.socket.emit('unsubscribe', room);
    }
  }

  subscribeToMiniMaxQuota() {
    return this.subscribeToRoom('minimax-quota');
  }

  subscribeToAutonomous() {
    return this.subscribeToRoom('autonomous');
  }

  subscribeToCosts() {
    return this.subscribeToRoom('costs');
  }

  subscribeToAllProgress() {
    return this.subscribeToRoom('progress');
  }

  // Event registration
  on(event, handler) {
    if (!this.handlers[event]) {
      console.warn('[SocketClient] Unknown event:', event);
      return;
    }
    this.handlers[event].push(handler);
  }

  off(event, handler) {
    if (!this.handlers[event]) return;
    const index = this.handlers[event].indexOf(handler);
    if (index > -1) {
      this.handlers[event].splice(index, 1);
    }
  }

  trigger(event, data) {
    if (!this.handlers[event]) return;
    this.handlers[event].forEach(handler => {
      try {
        handler(data);
      } catch (err) {
        console.error('[SocketClient] Handler error:', err);
      }
    });
  }

  // Convenience methods
  onTaskProgress(handler) {
    this.on('taskProgress', handler);
  }

  onTaskStarted(handler) {
    this.on('taskStarted', handler);
  }

  onTaskCompleted(handler) {
    this.on('taskCompleted', handler);
  }

  onTaskFailed(handler) {
    this.on('taskFailed', handler);
  }

  onMiniMaxQuota(handler) {
    this.on('miniMaxQuota', handler);
  }

  onMiniMaxAlert(handler) {
    this.on('miniMaxAlert', handler);
  }

  onAutonomousStatus(handler) {
    this.on('autonomousStatus', handler);
  }

  onAutonomousTask(handler) {
    this.on('autonomousTask', handler);
  }

  onCostUpdate(handler) {
    this.on('costUpdate', handler);
  }

  onSystemMessage(handler) {
    this.on('systemMessage', handler);
  }

  onConnect(handler) {
    this.on('connect', handler);
  }

  onDisconnect(handler) {
    this.on('disconnect', handler);
  }

  // Utility methods
  ping() {
    if (this.isConnected) {
      this.socket.emit('ping', { timestamp: Date.now() });
    }
  }

  getLatency() {
    return this.latency;
  }

  isSocketConnected() {
    return this.isConnected && this.socket && this.socket.connected;
  }

  getSocketId() {
    return this.socket ? this.socket.id : null;
  }

  // Disconnect
  disconnect() {
    this.options.autoReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
  }

  generateClientId() {
    return 'client-' + Math.random().toString(36).substr(2, 9);
  }
}

// React Hook (for React-based dashboards)
function useDashboardSocket(serverUrl, options = {}) {
  const [connected, setConnected] = React.useState(false);
  const [latency, setLatency] = React.useState(null);
  const clientRef = React.useRef(null);

  React.useEffect(() => {
    const client = new DashboardSocketClient(serverUrl, options);
    clientRef.current = client;

    client.onConnect(() => setConnected(true));
    client.onDisconnect(() => setConnected(false));

    // Periodically check latency
    const latencyInterval = setInterval(() => {
      if (client.isSocketConnected()) {
        client.ping();
        setLatency(client.getLatency());
      }
    }, 5000);

    client.connect();

    return () => {
      clearInterval(latencyInterval);
      client.disconnect();
    };
  }, [serverUrl]);

  return {
    client: clientRef.current,
    connected,
    latency
  };
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DashboardSocketClient, useDashboardSocket };
}

if (typeof window !== 'undefined') {
  window.DashboardSocketClient = DashboardSocketClient;
  window.useDashboardSocket = useDashboardSocket;
}