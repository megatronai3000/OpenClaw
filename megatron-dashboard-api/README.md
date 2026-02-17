# Dashboard Backend API

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Dashboard     │────▶│  Express API    │────▶│   SQLite DB     │
│   (React UI)    │◀────│  (Port 3001)    │◀────│  (persisted)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         ▲                                              ▲
         │                                              │
         └──────────────────────────────────────────────┘
              I POST updates here (autonomous work)
```

## API Endpoints

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Daily Reports
- `GET /api/reports` - List all reports
- `GET /api/reports/range?start=2026-02-01&end=2026-02-10` - Date range
- `POST /api/reports` - Create report (I call this)
- `PUT /api/reports/:id` - Update report

### Tasks/Kanban
- `GET /api/kanban` - Get kanban board state
- `POST /api/kanban/items` - Add kanban item
- `PUT /api/kanban/items/:id/move` - Move item (backlog → in-progress, etc.)

### Insights
- `GET /api/insights` - List insights
- `POST /api/insights` - Add insight

### Cost Tracking
- `GET /api/costs` - Get cost history
- `POST /api/costs` - Log cost (I call this after each session)

## Auto-Update from My Work

When I complete work:
```javascript
// After writing daily log
fetch('http://localhost:3001/api/reports', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    date: '2026-02-10',
    summary: 'Completed X, Y, Z',
    cost: 0.15,
    tasksCompleted: 3
  })
});
```

## Database Schema

```sql
-- projects
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT,
  description TEXT,
  status TEXT,
  priority TEXT,
  progress INTEGER,
  health TEXT,
  lastUpdated TEXT
);

-- daily_reports
CREATE TABLE daily_reports (
  id TEXT PRIMARY KEY,
  date TEXT UNIQUE,
  summary TEXT,
  cost REAL,
  tasksCompleted INTEGER,
  sessions TEXT, -- JSON array
  createdAt TEXT
);

-- kanban_items
CREATE TABLE kanban_items (
  id TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  status TEXT,
  priority TEXT,
  projectId TEXT,
  createdAt TEXT
);

-- insights
CREATE TABLE insights (
  id TEXT PRIMARY KEY,
  type TEXT,
  title TEXT,
  description TEXT,
  date TEXT,
  resolved BOOLEAN
);

-- cost_tracking
CREATE TABLE cost_tracking (
  id TEXT PRIMARY KEY,
  date TEXT,
  sessionName TEXT,
  cost REAL,
  tokens INTEGER,
  model TEXT
);
```

## Running the Backend

```bash
# Start backend
cd ~/.openclaw/workspace/megatron-dashboard-api
npm start

# Or with auto-restart on crash
npm run start:forever
```

## Auto-start on Boot

Already configured via LaunchAgent:
`~/Library/LaunchAgents/com.openclaw.dashboard-api.plist`

```bash
# Enable auto-start
launchctl load ~/Library/LaunchAgents/com.openclaw.dashboard-api.plist
```

## Cost Estimate

| Component | Cost |
|-----------|------|
| Backend build | ~$0.15 |
| Dashboard refactor | ~$0.15 |
| Auto-start setup | ~$0.05 |
| **Total** | **~$0.35** |

Monthly: $0 (runs on your Mac)
