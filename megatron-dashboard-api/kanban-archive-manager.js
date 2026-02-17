const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class KanbanArchiveManager {
    constructor(dbPath) {
        this.db = new Database(dbPath);
        this.initSchema();
    }

    initSchema() {
        // Archived kanban items table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS kanban_archive (
                id TEXT PRIMARY KEY,
                original_id TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                status TEXT DEFAULT 'completed',
                priority TEXT DEFAULT 'medium',
                projectId TEXT,
                tags TEXT DEFAULT '[]',
                createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
                completedAt TEXT,
                archivedAt TEXT DEFAULT CURRENT_TIMESTAMP,
                archivedBy TEXT,
                archiveReason TEXT DEFAULT 'completed',
                restoreCount INTEGER DEFAULT 0,
                metadata TEXT DEFAULT '{}'
            );

            CREATE TABLE IF NOT EXISTS archive_retention_policies (
                id TEXT PRIMARY KEY DEFAULT 'default',
                retentionDays INTEGER DEFAULT 365,
                autoDeleteExpired BOOLEAN DEFAULT 0,
                autoArchiveAfterDays INTEGER DEFAULT 30,
                maxArchiveSize INTEGER DEFAULT 10000,
                compressionEnabled BOOLEAN DEFAULT 1,
                lastCleanupAt TEXT,
                createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
                updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS archive_audit_log (
                id TEXT PRIMARY KEY,
                action TEXT NOT NULL,
                itemId TEXT,
                itemTitle TEXT,
                performedBy TEXT,
                performedAt TEXT DEFAULT CURRENT_TIMESTAMP,
                details TEXT,
                ipAddress TEXT
            );

            CREATE VIRTUAL TABLE IF NOT EXISTS kanban_archive_fts USING fts5(
                title, 
                description, 
                tags,
                content='kanban_archive',
                content_rowid='rowid'
            );

            -- Triggers for FTS sync
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

            INSERT OR IGNORE INTO archive_retention_policies (id, retentionDays, autoDeleteExpired, autoArchiveAfterDays, maxArchiveSize)
            VALUES ('default', 365, 0, 30, 10000);

            CREATE INDEX IF NOT EXISTS idx_archive_archivedAt ON kanban_archive(archivedAt);
            CREATE INDEX IF NOT EXISTS idx_archive_completedAt ON kanban_archive(completedAt);
            CREATE INDEX IF NOT EXISTS idx_archive_projectId ON kanban_archive(projectId);
            CREATE INDEX IF NOT EXISTS idx_archive_status ON kanban_archive(status);
            CREATE INDEX IF NOT EXISTS idx_audit_performedAt ON archive_audit_log(performedAt);
        `);
    }

    // Archive a completed task
    archiveTask(taskData, archivedBy = 'system', reason = 'completed') {
        const id = uuidv4();
        const archivedAt = new Date().toISOString();
        const tags = JSON.stringify(taskData.tags || []);
        const metadata = JSON.stringify(taskData.metadata || {});

        const stmt = this.db.prepare(`
            INSERT INTO kanban_archive (
                id, original_id, title, description, status, priority, projectId,
                tags, createdAt, completedAt, archivedAt, archivedBy, archiveReason, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            id,
            taskData.id,
            taskData.title,
            taskData.description || '',
            taskData.status || 'completed',
            taskData.priority || 'medium',
            taskData.projectId || null,
            tags,
            taskData.createdAt || archivedAt,
            taskData.completedAt || archivedAt,
            archivedAt,
            archivedBy,
            reason,
            metadata
        );

        this.logAudit('archive', id, taskData.title, archivedBy, { reason });

        return { id, originalId: taskData.id, archivedAt };
    }

    // Batch archive multiple tasks
    batchArchiveTasks(tasks, archivedBy = 'system', reason = 'completed') {
        const results = [];
        const insert = this.db.prepare(`
            INSERT INTO kanban_archive (
                id, original_id, title, description, status, priority, projectId,
                tags, createdAt, completedAt, archivedAt, archivedBy, archiveReason, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const archiveMany = this.db.transaction((tasks) => {
            for (const task of tasks) {
                const id = uuidv4();
                const archivedAt = new Date().toISOString();
                insert.run(
                    id,
                    task.id,
                    task.title,
                    task.description || '',
                    task.status || 'completed',
                    task.priority || 'medium',
                    task.projectId || null,
                    JSON.stringify(task.tags || []),
                    task.createdAt || archivedAt,
                    task.completedAt || archivedAt,
                    archivedAt,
                    archivedBy,
                    reason,
                    JSON.stringify(task.metadata || {})
                );
                results.push({ id, originalId: task.id });
            }
        });

        archiveMany(tasks);
        this.logAudit('batch_archive', null, `${tasks.length} tasks`, archivedBy, { count: tasks.length });
        return results;
    }

    // Search archived tasks with multiple filters
    searchArchive({ query, startDate, endDate, tags, projectId, priority, limit = 50, offset = 0 }) {
        let sql = 'SELECT * FROM kanban_archive WHERE 1=1';
        const params = [];

        if (query) {
            // Use FTS for text search
            const ftsQuery = query.split(' ').map(w => w + '*').join(' ');
            sql = `
                SELECT a.* FROM kanban_archive a
                JOIN kanban_archive_fts f ON a.rowid = f.rowid
                WHERE kanban_archive_fts MATCH ?
            `;
            params.push(ftsQuery);
        }

        if (startDate) {
            sql += ' AND archivedAt >= ?';
            params.push(startDate);
        }

        if (endDate) {
            sql += ' AND archivedAt <= ?';
            params.push(endDate);
        }

        if (projectId) {
            sql += ' AND projectId = ?';
            params.push(projectId);
        }

        if (priority) {
            sql += ' AND priority = ?';
            params.push(priority);
        }

        if (tags && tags.length > 0) {
            sql += ` AND (
                ${tags.map(() => 'tags LIKE ?').join(' OR ')}
            )`;
            tags.forEach(tag => params.push(`%"${tag}"%`));
        }

        sql += ' ORDER BY archivedAt DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const stmt = this.db.prepare(sql);
        const items = stmt.all(...params).map(row => ({
            ...row,
            tags: JSON.parse(row.tags || '[]'),
            metadata: JSON.parse(row.metadata || '{}')
        }));

        // Get total count
        let countSql = 'SELECT COUNT(*) as count FROM kanban_archive WHERE 1=1';
        const countParams = [];
        
        if (query) {
            countSql = `
                SELECT COUNT(*) as count FROM kanban_archive a
                JOIN kanban_archive_fts f ON a.rowid = f.rowid
                WHERE kanban_archive_fts MATCH ?
            `;
            countParams.push(query.split(' ').map(w => w + '*').join(' '));
        }
        
        if (startDate) {
            countSql += ' AND archivedAt >= ?';
            countParams.push(startDate);
        }
        if (endDate) {
            countSql += ' AND archivedAt <= ?';
            countParams.push(endDate);
        }
        if (projectId) {
            countSql += ' AND projectId = ?';
            countParams.push(projectId);
        }
        if (priority) {
            countSql += ' AND priority = ?';
            countParams.push(priority);
        }
        if (tags && tags.length > 0) {
            countSql += ` AND (${tags.map(() => 'tags LIKE ?').join(' OR ')})`;
            tags.forEach(tag => countParams.push(`%"${tag}"%`));
        }

        const countStmt = this.db.prepare(countSql);
        const { count } = countStmt.get(...countParams);

        return { items, total: count, limit, offset };
    }

    // Restore archived task to active board
    restoreTask(archiveId, restoredBy = 'system') {
        const item = this.db.prepare('SELECT * FROM kanban_archive WHERE id = ?').get(archiveId);
        if (!item) {
            throw new Error('Archived item not found');
        }

        // Update restore count
        this.db.prepare(`
            UPDATE kanban_archive 
            SET restoreCount = restoreCount + 1, metadata = json_set(metadata, '$.lastRestoredAt', ?)
            WHERE id = ?
        `).run(new Date().toISOString(), archiveId);

        this.logAudit('restore', archiveId, item.title, restoredBy, { 
            originalId: item.original_id,
            restoreCount: item.restoreCount + 1
        });

        return {
            archivedItem: {
                ...item,
                tags: JSON.parse(item.tags || '[]'),
                metadata: JSON.parse(item.metadata || '{}')
            },
            restoredTask: {
                id: item.original_id,
                title: item.title,
                description: item.description,
                status: 'backlog', // Reset to backlog when restored
                priority: item.priority,
                projectId: item.projectId,
                tags: JSON.parse(item.tags || '[]'),
                createdAt: item.createdAt,
                restoredAt: new Date().toISOString(),
                restoredFrom: archiveId
            }
        };
    }

    // Delete from archive (permanent)
    deleteFromArchive(archiveId, deletedBy = 'system') {
        const item = this.db.prepare('SELECT * FROM kanban_archive WHERE id = ?').get(archiveId);
        if (!item) {
            throw new Error('Archived item not found');
        }

        this.db.prepare('DELETE FROM kanban_archive WHERE id = ?').run(archiveId);
        this.logAudit('delete', archiveId, item.title, deletedBy, { originalId: item.original_id });

        return { success: true, deletedId: archiveId };
    }

    // Get retention policy
    getRetentionPolicy() {
        return this.db.prepare('SELECT * FROM archive_retention_policies WHERE id = ?').get('default');
    }

    // Update retention policy
    updateRetentionPolicy(policy) {
        const fields = [];
        const values = [];
        
        if (policy.retentionDays !== undefined) {
            fields.push('retentionDays = ?');
            values.push(policy.retentionDays);
        }
        if (policy.autoDeleteExpired !== undefined) {
            fields.push('autoDeleteExpired = ?');
            values.push(policy.autoDeleteExpired ? 1 : 0);
        }
        if (policy.autoArchiveAfterDays !== undefined) {
            fields.push('autoArchiveAfterDays = ?');
            values.push(policy.autoArchiveAfterDays);
        }
        if (policy.maxArchiveSize !== undefined) {
            fields.push('maxArchiveSize = ?');
            values.push(policy.maxArchiveSize);
        }
        if (policy.compressionEnabled !== undefined) {
            fields.push('compressionEnabled = ?');
            values.push(policy.compressionEnabled ? 1 : 0);
        }
        
        fields.push('updatedAt = ?');
        values.push(new Date().toISOString());
        values.push('default');

        const sql = `UPDATE archive_retention_policies SET ${fields.join(', ')} WHERE id = ?`;
        this.db.prepare(sql).run(...values);

        this.logAudit('update_policy', 'default', 'Retention policy updated', 'admin', policy);
        return this.getRetentionPolicy();
    }

    // Apply retention policy - delete expired items
    applyRetentionPolicy() {
        const policy = this.getRetentionPolicy();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);
        const cutoffIso = cutoffDate.toISOString();

        let deletedCount = 0;

        if (policy.autoDeleteExpired) {
            const result = this.db.prepare(`
                DELETE FROM kanban_archive 
                WHERE archivedAt < ?
            `).run(cutoffIso);
            deletedCount = result.changes;
        }

        // Update last cleanup timestamp
        this.db.prepare(`
            UPDATE archive_retention_policies 
            SET lastCleanupAt = ? 
            WHERE id = ?
        `).run(new Date().toISOString(), 'default');

        this.logAudit('cleanup', null, 'Retention policy cleanup', 'system', { 
            deletedCount, 
            cutoffDate: cutoffIso,
            autoDelete: policy.autoDeleteExpired
        });

        return {
            deletedCount,
            cutoffDate: cutoffIso,
            policy
        };
    }

    // Get auto-archive candidates (completed tasks older than threshold)
    getAutoArchiveCandidates() {
        const policy = this.getRetentionPolicy();
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - policy.autoArchiveAfterDays);
        
        // This queries the main kanban_items table for candidates
        return this.db.prepare(`
            SELECT * FROM kanban_items 
            WHERE status = 'completed' 
            AND (completedAt IS NULL OR completedAt < ?)
        `).all(thresholdDate.toISOString());
    }

    // Get archive statistics
    getStatistics() {
        const totalArchived = this.db.prepare('SELECT COUNT(*) as count FROM kanban_archive').get();
        const byMonth = this.db.prepare(`
            SELECT 
                strftime('%Y-%m', archivedAt) as month,
                COUNT(*) as count
            FROM kanban_archive
            GROUP BY month
            ORDER BY month DESC
            LIMIT 12
        `).all();
        
        const byPriority = this.db.prepare(`
            SELECT priority, COUNT(*) as count 
            FROM kanban_archive 
            GROUP BY priority
        `).all();

        const byProject = this.db.prepare(`
            SELECT projectId, COUNT(*) as count 
            FROM kanban_archive 
            WHERE projectId IS NOT NULL
            GROUP BY projectId
        `).all();

        const recentRestores = this.db.prepare(`
            SELECT COUNT(*) as count FROM kanban_archive WHERE restoreCount > 0
        `).get();

        const oldestArchive = this.db.prepare(`
            SELECT MIN(archivedAt) as date FROM kanban_archive
        `).get();

        const newestArchive = this.db.prepare(`
            SELECT MAX(archivedAt) as date FROM kanban_archive
        `).get();

        return {
            totalArchived: totalArchived.count,
            byMonth,
            byPriority,
            byProject,
            restoredCount: recentRestores.count,
            dateRange: {
                oldest: oldestArchive.date,
                newest: newestArchive.date
            }
        };
    }

    // Get all unique tags from archived items
    getAllTags() {
        const rows = this.db.prepare('SELECT tags FROM kanban_archive').all();
        const tagSet = new Set();
        rows.forEach(row => {
            try {
                const tags = JSON.parse(row.tags || '[]');
                tags.forEach(tag => tagSet.add(tag));
            } catch (e) {}
        });
        return Array.from(tagSet).sort();
    }

    // Audit log
    logAudit(action, itemId, itemTitle, performedBy, details = {}) {
        const id = uuidv4();
        this.db.prepare(`
            INSERT INTO archive_audit_log (id, action, itemId, itemTitle, performedBy, details)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(id, action, itemId, itemTitle, performedBy, JSON.stringify(details));
    }

    // Get audit log
    getAuditLog({ action, startDate, endDate, limit = 100, offset = 0 }) {
        let sql = 'SELECT * FROM archive_audit_log WHERE 1=1';
        const params = [];

        if (action) {
            sql += ' AND action = ?';
            params.push(action);
        }
        if (startDate) {
            sql += ' AND performedAt >= ?';
            params.push(startDate);
        }
        if (endDate) {
            sql += ' AND performedAt <= ?';
            params.push(endDate);
        }

        sql += ' ORDER BY performedAt DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const items = this.db.prepare(sql).all(...params).map(row => ({
            ...row,
            details: JSON.parse(row.details || '{}')
        }));

        return { items, limit, offset };
    }

    close() {
        this.db.close();
    }
}

module.exports = KanbanArchiveManager;
