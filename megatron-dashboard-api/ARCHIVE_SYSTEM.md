# Kanban Archive System

## Overview
Complete archive system for Kanban tasks with full-text search, restore functionality, and retention policies.

## Features

### 1. Archive Storage
- Separate storage for completed/archived tasks
- Full-text search indexing via SQLite FTS5
- Metadata preservation (tags, timestamps, restore history)

### 2. Search & Filter
- Full-text search on title, description, and tags
- Date range filtering (archived date, completed date)
- Tag-based filtering
- Priority and project filtering
- Paginated results

### 3. Restore Functionality
- One-click restore to active kanban board
- Restore count tracking
- Original task ID preservation
- WebSocket notifications on restore

### 4. Retention Policies
- Configurable retention period (default: 365 days)
- Auto-archive after inactivity (default: 30 days)
- Maximum archive size limit
- Optional auto-deletion of expired items
- Manual cleanup functionality

### 5. Dashboard UI
- Three-tab interface: Items, Statistics, Settings
- Real-time search with filters
- Archive statistics visualization
- Policy configuration panel
- Audit logging

## API Endpoints

### Archive Management
- `POST /api/archive/archive` - Archive a single task
- `POST /api/archive/batch` - Batch archive tasks
- `GET /api/archive` - List archived items (paginated)
- `GET /api/archive/:id` - Get single archived item
- `GET /api/archive/search` - Search with filters

### Restore & Delete
- `POST /api/archive/:id/restore` - Restore to active board
- `DELETE /api/archive/:id` - Permanent delete

### Configuration
- `GET /api/archive/config/retention` - Get retention policy
- `PUT /api/archive/config/retention` - Update policy
- `POST /api/archive/cleanup` - Run retention cleanup

### Analytics
- `GET /api/archive/stats/overview` - Archive statistics
- `GET /api/archive/tags/all` - All unique tags
- `GET /api/archive/audit/log` - Audit log
- `GET /api/archive/candidates/auto-archive` - Auto-archive candidates

## Database Schema

### kanban_archive
```sql
id TEXT PRIMARY KEY
original_id TEXT NOT NULL
title TEXT NOT NULL
description TEXT
status TEXT DEFAULT 'completed'
priority TEXT DEFAULT 'medium'
projectId TEXT
tags TEXT DEFAULT '[]'
createdAt TEXT
completedAt TEXT
archivedAt TEXT DEFAULT CURRENT_TIMESTAMP
archivedBy TEXT
archiveReason TEXT DEFAULT 'completed'
restoreCount INTEGER DEFAULT 0
metadata TEXT DEFAULT '{}'
```

### archive_retention_policies
```sql
id TEXT PRIMARY KEY
retentionDays INTEGER DEFAULT 365
autoDeleteExpired BOOLEAN DEFAULT 0
autoArchiveAfterDays INTEGER DEFAULT 30
maxArchiveSize INTEGER DEFAULT 10000
compressionEnabled BOOLEAN DEFAULT 1
```

### archive_audit_log
```sql
id TEXT PRIMARY KEY
action TEXT NOT NULL
itemId TEXT
itemTitle TEXT
performedBy TEXT
performedAt TEXT
details TEXT
```

## Frontend Component

### KanbanArchiveDashboard
Located at: `src/components/KanbanArchiveDashboard.tsx`

Features:
- Tabbed interface (Items | Statistics | Settings)
- Advanced filtering with collapsible filters
- Full-text search with debouncing
- Pagination support
- Restore/delete confirmation modals
- Real-time statistics display
- Policy configuration UI

## Integration

### With Kanban Board
The archive system integrates with the existing kanban system:
- Completed tasks can be archived from the kanban board
- Restored tasks return to the backlog column
- WebSocket events notify of restore operations

### With WebSocket Server
Archive operations emit events:
- `task:restored` - Emitted when task is restored to active board

## Usage Example

```typescript
// Archive a completed task
await api.archiveTask({
  id: 'task-123',
  title: 'Implement Feature X',
  status: 'completed',
  priority: 'high',
  tags: ['feature', 'v2']
}, 'user', 'completed');

// Search archived tasks
const results = await api.searchArchive({
  query: 'feature',
  startDate: '2026-01-01',
  priority: 'high',
  limit: 20
});

// Restore a task
await api.restoreArchivedTask('archive-id-123');
```

## Testing

Run the test script:
```bash
cd megatron-dashboard-api
node -e "require('./kanban-archive-manager').test()"
```

Or use the API directly:
```bash
# Archive a task
curl -X POST http://localhost:3001/api/archive/archive \
  -H "Content-Type: application/json" \
  -d '{"taskData":{"id":"test-1","title":"Test Task","status":"completed"}}'

# Search
curl "http://localhost:3001/api/archive/search?query=test&limit=10"

# Get stats
curl http://localhost:3001/api/archive/stats/overview
```

## Cost
Implementation cost: $0.70 (as specified, using MiniMax for cost efficiency)

## Files Created
1. `kanban-archive-manager.js` - Core archive logic
2. `archive-routes.js` - Express API routes
3. `KanbanArchiveDashboard.tsx` - React UI component
4. `types/archive.ts` - TypeScript type definitions
5. `data/archive-schema.sql` - Database schema
