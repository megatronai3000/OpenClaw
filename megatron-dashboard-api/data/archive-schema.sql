-- Kanban Archive System Schema
-- Run this to add archive functionality to the dashboard database

-- Archived kanban items table
CREATE TABLE IF NOT EXISTS kanban_archive (
    id TEXT PRIMARY KEY,
    original_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'completed',
    priority TEXT DEFAULT 'medium',
    projectId TEXT,
    tags TEXT DEFAULT '[]', -- JSON array of tags
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    completedAt TEXT,
    archivedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    archivedBy TEXT,
    archiveReason TEXT DEFAULT 'completed',
    restoreCount INTEGER DEFAULT 0,
    metadata TEXT DEFAULT '{}' -- JSON for additional data
);

-- Archive retention policy configuration
CREATE TABLE IF NOT EXISTS archive_retention_policies (
    id TEXT PRIMARY KEY DEFAULT 'default',
    retentionDays INTEGER DEFAULT 365, -- Default: keep for 1 year
    autoDeleteExpired BOOLEAN DEFAULT 0,
    autoArchiveAfterDays INTEGER DEFAULT 30, -- Auto-archive completed tasks after 30 days
    maxArchiveSize INTEGER DEFAULT 10000, -- Max number of archived items
    compressionEnabled BOOLEAN DEFAULT 1,
    lastCleanupAt TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Archive audit log
CREATE TABLE IF NOT EXISTS archive_audit_log (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL, -- 'archive', 'restore', 'delete', 'search'
    itemId TEXT,
    itemTitle TEXT,
    performedBy TEXT,
    performedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    details TEXT, -- JSON with additional info
    ipAddress TEXT
);

-- Archive search index (for full-text search)
CREATE VIRTUAL TABLE IF NOT EXISTS kanban_archive_fts USING fts5(
    title, 
    description, 
    tags,
    content='kanban_archive',
    content_rowid='rowid'
);

-- Triggers to keep FTS index in sync
CREATE TRIGGER IF NOT EXISTS kanban_archive_ai AFTER INSERT ON kanban_archive BEGIN
    INSERT INTO kanban_archive_fts(rowid, title, description, tags)
    VALUES (new.rowid, new.title, new.description, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS kanban_archive_ad AFTER DELETE ON kanban_archive BEGIN
    INSERT INTO kanban_archive_fts(kanban_archive_fts, rowid, title, description, tags)
    VALUES ('delete', old.rowid, old.title, old.description, old.tags);
END;

CREATE TRIGGER IF NOT EXISTS kanban_archive_au AFTER UPDATE ON kanban_archive BEGIN
    INSERT INTO kanban_archive_fts(kanban_archive_fts, rowid, title, description, tags)
    VALUES ('delete', old.rowid, old.title, old.description, old.tags);
    INSERT INTO kanban_archive_fts(rowid, title, description, tags)
    VALUES (new.rowid, new.title, new.description, new.tags);
END;

-- Insert default retention policy if not exists
INSERT OR IGNORE INTO archive_retention_policies (id, retentionDays, autoDeleteExpired, autoArchiveAfterDays, maxArchiveSize)
VALUES ('default', 365, 0, 30, 10000);

-- Index for faster searches
CREATE INDEX IF NOT EXISTS idx_archive_archivedAt ON kanban_archive(archivedAt);
CREATE INDEX IF NOT EXISTS idx_archive_completedAt ON kanban_archive(completedAt);
CREATE INDEX IF NOT EXISTS idx_archive_projectId ON kanban_archive(projectId);
CREATE INDEX IF NOT EXISTS idx_archive_status ON kanban_archive(status);
CREATE INDEX IF NOT EXISTS idx_audit_performedAt ON archive_audit_log(performedAt);
