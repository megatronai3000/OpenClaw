const express = require('express');
const router = express.Router();
const path = require('path');
const KanbanArchiveManager = require('./kanban-archive-manager');

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'dashboard.db');

// Initialize archive manager
const archiveManager = new KanbanArchiveManager(DB_PATH);

// Archive a task
router.post('/archive', (req, res) => {
    try {
        const { taskData, archivedBy, reason } = req.body;
        
        if (!taskData || !taskData.id || !taskData.title) {
            return res.status(400).json({ error: 'Task data with id and title is required' });
        }

        const result = archiveManager.archiveTask(taskData, archivedBy || 'user', reason || 'completed');
        res.json({ success: true, ...result });
    } catch (err) {
        console.error('[Archive API] Error archiving task:', err.message);
        res.status(500).json({ error: 'Failed to archive task', message: err.message });
    }
});

// Batch archive tasks
router.post('/archive/batch', (req, res) => {
    try {
        const { tasks, archivedBy, reason } = req.body;
        
        if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
            return res.status(400).json({ error: 'Tasks array is required' });
        }

        const results = archiveManager.batchArchiveTasks(tasks, archivedBy || 'user', reason || 'completed');
        res.json({ success: true, archived: results.length, items: results });
    } catch (err) {
        console.error('[Archive API] Error batch archiving:', err.message);
        res.status(500).json({ error: 'Failed to archive tasks', message: err.message });
    }
});

// Search archived tasks
router.get('/search', (req, res) => {
    try {
        const { query, startDate, endDate, tags, projectId, priority, limit, offset } = req.query;
        
        const searchParams = {
            query,
            startDate,
            endDate,
            tags: tags ? tags.split(',') : undefined,
            projectId,
            priority,
            limit: parseInt(limit) || 50,
            offset: parseInt(offset) || 0
        };

        const results = archiveManager.searchArchive(searchParams);
        res.json({ success: true, ...results });
    } catch (err) {
        console.error('[Archive API] Error searching archive:', err.message);
        res.status(500).json({ error: 'Failed to search archive', message: err.message });
    }
});

// Get all archived items (paginated)
router.get('/', (req, res) => {
    try {
        const { limit, offset, projectId, priority } = req.query;
        
        const results = archiveManager.searchArchive({
            projectId,
            priority,
            limit: parseInt(limit) || 50,
            offset: parseInt(offset) || 0
        });
        
        res.json({ success: true, ...results });
    } catch (err) {
        console.error('[Archive API] Error getting archive:', err.message);
        res.status(500).json({ error: 'Failed to get archive', message: err.message });
    }
});

// Get single archived item
router.get('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const results = archiveManager.searchArchive({ query: id, limit: 1 });
        
        if (results.items.length === 0) {
            return res.status(404).json({ error: 'Archived item not found' });
        }
        
        res.json({ success: true, item: results.items[0] });
    } catch (err) {
        console.error('[Archive API] Error getting archive item:', err.message);
        res.status(500).json({ error: 'Failed to get archive item', message: err.message });
    }
});

// Restore archived task
router.post('/:id/restore', (req, res) => {
    try {
        const { id } = req.params;
        const { restoredBy } = req.body;
        
        const result = archiveManager.restoreTask(id, restoredBy || 'user');
        
        // Emit WebSocket event if available
        if (req.app.locals.wss) {
            req.app.locals.wss.broadcast('task:restored', result.restoredTask);
        }
        
        res.json({ success: true, ...result });
    } catch (err) {
        console.error('[Archive API] Error restoring task:', err.message);
        res.status(500).json({ error: 'Failed to restore task', message: err.message });
    }
});

// Delete from archive (permanent)
router.delete('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { deletedBy } = req.body;
        
        const result = archiveManager.deleteFromArchive(id, deletedBy || 'user');
        res.json({ success: true, ...result });
    } catch (err) {
        console.error('[Archive API] Error deleting from archive:', err.message);
        res.status(500).json({ error: 'Failed to delete from archive', message: err.message });
    }
});

// Get retention policy
router.get('/config/retention', (req, res) => {
    try {
        const policy = archiveManager.getRetentionPolicy();
        res.json({ success: true, policy });
    } catch (err) {
        console.error('[Archive API] Error getting retention policy:', err.message);
        res.status(500).json({ error: 'Failed to get retention policy', message: err.message });
    }
});

// Update retention policy
router.put('/config/retention', (req, res) => {
    try {
        const policy = req.body;
        const updated = archiveManager.updateRetentionPolicy(policy);
        res.json({ success: true, policy: updated });
    } catch (err) {
        console.error('[Archive API] Error updating retention policy:', err.message);
        res.status(500).json({ error: 'Failed to update retention policy', message: err.message });
    }
});

// Apply retention policy (cleanup)
router.post('/cleanup', (req, res) => {
    try {
        const result = archiveManager.applyRetentionPolicy();
        res.json({ success: true, ...result });
    } catch (err) {
        console.error('[Archive API] Error applying retention policy:', err.message);
        res.status(500).json({ error: 'Failed to apply retention policy', message: err.message });
    }
});

// Get auto-archive candidates
router.get('/candidates/auto-archive', (req, res) => {
    try {
        const candidates = archiveManager.getAutoArchiveCandidates();
        res.json({ success: true, count: candidates.length, candidates });
    } catch (err) {
        console.error('[Archive API] Error getting auto-archive candidates:', err.message);
        res.status(500).json({ error: 'Failed to get auto-archive candidates', message: err.message });
    }
});

// Get archive statistics
router.get('/stats/overview', (req, res) => {
    try {
        const stats = archiveManager.getStatistics();
        const policy = archiveManager.getRetentionPolicy();
        res.json({ success: true, stats, policy });
    } catch (err) {
        console.error('[Archive API] Error getting statistics:', err.message);
        res.status(500).json({ error: 'Failed to get statistics', message: err.message });
    }
});

// Get all tags
router.get('/tags/all', (req, res) => {
    try {
        const tags = archiveManager.getAllTags();
        res.json({ success: true, tags });
    } catch (err) {
        console.error('[Archive API] Error getting tags:', err.message);
        res.status(500).json({ error: 'Failed to get tags', message: err.message });
    }
});

// Get audit log
router.get('/audit/log', (req, res) => {
    try {
        const { action, startDate, endDate, limit, offset } = req.query;
        const results = archiveManager.getAuditLog({
            action,
            startDate,
            endDate,
            limit: parseInt(limit) || 100,
            offset: parseInt(offset) || 0
        });
        res.json({ success: true, ...results });
    } catch (err) {
        console.error('[Archive API] Error getting audit log:', err.message);
        res.status(500).json({ error: 'Failed to get audit log', message: err.message });
    }
});

module.exports = router;
