# WebSocket Architecture for Real-time Dashboard

Socket.io-based WebSocket server providing real-time updates for the Megatron Dashboard.

## Features

### 1. Socket.io Server Integration
- **Server**: `websocket-server.js` - Full-featured Socket.io server
- **Path**: `/socket.io` (default Socket.io path)
- **Transports**: WebSocket (primary) with polling fallback
- **CORS**: Configured for localhost development

### 2. Client-side WebSocket Connection
- **Library**: `public/websocket-client.js` - Browser client library
- **Auto-reconnect**: Configurable with exponential backoff
- **Room subscriptions**: Subscribe to specific update channels
- **Latency monitoring**: Built-in ping/pong for connection health

### 3. Real-time Task Progress Updates
- Task start/completion notifications
- Phase-based progress tracking
- Live log streaming per task
- Progress bar updates (0-100%)

### 4. MiniMax Quota Status Streaming
- Real-time quota usage updates (every 30 seconds)
- Alerts for low quota (< 100 remaining)
- Critical alerts for quota exhaustion (< 20)
- Usage percentage tracking

### 5. Autonomous Mode Status Broadcasting
- Active task monitoring
- Task completion notifications
- Success rate statistics
- Live progress for autonomous tasks

## Quick Start

### Start the Server
```bash
cd megatron-dashboard-api
npm install
npm start
```

### Access Demo
Open `http://localhost:3001/websocket-demo.html` in your browser.

### Client Usage
```javascript
// Include the client library
const client = new DashboardSocketClient('http://localhost:3001');

// Connect
client.connect();

// Subscribe to channels
client.onConnect(() => {
  client.subscribeToMiniMaxQuota();
  client.subscribeToAutonomous();
  client.subscribeToAllProgress();
});

// Handle events
client.onTaskProgress((data) => {
  console.log(`Task ${data.taskId}: ${data.progress}%`);
});

client.onMiniMaxQuota((data) => {
  console.log(`MiniMax remaining: ${data.remaining}`);
});
```

## API Endpoints

### WebSocket Control
- `GET /api/ws/stats` - Server statistics
- `POST /api/ws/broadcast` - Broadcast message to clients
- `GET /api/ws/test-task` - Start a test task for demo

### MiniMax
- `GET /api/minimax/status` - Current quota status

### Autonomous
- `GET /api/autonomous/status` - Autonomous mode status

## Socket.io Events

### Client → Server
| Event | Description |
|-------|-------------|
| `subscribe` | Join a room (e.g., 'minimax-quota', 'autonomous') |
| `unsubscribe` | Leave a room |
| `task:subscribe` | Subscribe to specific task updates |
| `ping` | Request latency measurement |

### Server → Client
| Event | Description |
|-------|-------------|
| `connection:success` | Initial state on connection |
| `task:started` | New task started |
| `task:progress` | Progress update (0-100%) |
| `task:phase` | Phase status change |
| `task:completed` | Task finished successfully |
| `task:failed` | Task failed |
| `minimax:quota` | Quota status update |
| `minimax:alert` | Quota warning/critical alert |
| `autonomous:status` | Autonomous mode status |
| `autonomous:task:*` | Autonomous task events |
| `server:heartbeat` | Periodic heartbeat |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Dashboard WebSocket                       │
│                     (Socket.io Server)                       │
├─────────────────────────────────────────────────────────────┤
│  Task Progress  │  MiniMax Quota  │  Autonomous Mode        │
│  ─────────────  │  ─────────────  │  ───────────────        │
│  • startTask    │  • 30s interval │  • Status broadcast     │
│  • updateTask   │  • Alerts       │  • Task progress        │
│  • completeTask │  • Quota %      │  • Completion notify    │
└─────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
       WebSocket        Polling        Monitoring
       (primary)       (fallback)       Dashboard
```

## Files

- `websocket-server.js` - Server-side Socket.io implementation
- `public/websocket-client.js` - Client-side library
- `public/websocket-demo.html` - Interactive demo page
- `server.js` - Integration with existing Express server

## Integration

The WebSocket server is integrated into the existing Express server:

```javascript
const DashboardWebSocket = require('./websocket-server');
const wsServer = new DashboardWebSocket(server, { corsOptions });

// Start a task
wsServer.startTask({
  id: 'task-123',
  title: 'Build Feature',
  agent: 'megatron',
  phases: [
    { name: 'Planning', status: 'pending' },
    { name: 'Coding', status: 'pending' },
    { name: 'Testing', status: 'pending' }
  ]
});

// Update progress
wsServer.updateTaskProgress('task-123', 50, { message: 'Coding...' });

// Complete task
wsServer.completeTask('task-123', { result: 'success' });
```

## Monitoring

View real-time server stats:
```bash
curl http://localhost:3001/api/ws/stats
```

Response:
```json
{
  "connectedClients": 5,
  "activeTasks": 3,
  "autonomousTasks": 2,
  "rooms": ["minimax-quota", "autonomous"],
  "uptime": 3600.5
}
```