/**
 * Proposal API Routes - CommonJS version
 * 
 * REST API for proposal workflow:
 * - POST /api/proposals - Create new proposal request
 * - GET /api/proposals - List all proposals
 * - GET /api/proposals/:id - Get specific proposal
 * - POST /api/proposals/:id/approve - Approve proposal
 * - POST /api/proposals/:id/reject - Reject proposal
 * - GET /api/proposals/stats - Queue statistics
 */

const Router = require('express').Router;

// Inline proposal management (avoiding ESM import issues)
const fs = require('fs');
const path = require('path');

const QUEUE_FILE = path.join(__dirname, '../../shared-context/team/proposal-queue.json');
const PROPOSALS_DIR = path.join(__dirname, '../../shared-context/decisions');

// Ensure directories exist
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadQueue() {
  try {
    ensureDir(path.dirname(QUEUE_FILE));
    if (fs.existsSync(QUEUE_FILE)) {
      return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error loading queue:', e);
  }
  return [];
}

function saveQueue(queue) {
  ensureDir(path.dirname(QUEUE_FILE));
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
}

const router = Router();

// Create new proposal request
router.post('/', (req, res) => {
  try {
    const { taskDescription, requestedBy, estimatedCost, estimatedTime } = req.body;
    
    if (!taskDescription) {
      return res.status(400).json({ error: 'taskDescription is required' });
    }
    
    const id = `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const proposal = {
      id,
      status: 'pending',
      taskDescription,
      requestedBy: requestedBy || 'human',
      estimatedCost: estimatedCost || null,
      estimatedTime: estimatedTime || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      approvedBy: null,
      approvedAt: null,
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null,
      executedAt: null,
      completedAt: null,
      files: [],
      errors: [],
    };
    
    const queue = loadQueue();
    queue.push(proposal);
    saveQueue(queue);
    
    res.status(201).json({
      success: true,
      proposal,
      stats: getQueueStats()
    });
  } catch (error) {
    console.error('Error creating proposal:', error);
    res.status(500).json({ error: error.message });
  }
});

// List all proposals
router.get('/', (req, res) => {
  try {
    const { status, limit } = req.query;
    let proposals = loadQueue();
    
    if (status) {
      proposals = proposals.filter(p => p.status === status);
    }
    
    proposals.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    if (limit) {
      proposals = proposals.slice(0, parseInt(limit));
    }
    
    res.json({
      proposals,
      stats: getQueueStats()
    });
  } catch (error) {
    console.error('Error listing proposals:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get queue statistics
function getQueueStats() {
  const queue = loadQueue();
  return {
    total: queue.length,
    pending: queue.filter(p => p.status === 'pending').length,
    approved: queue.filter(p => p.status === 'approved').length,
    rejected: queue.filter(p => p.status === 'rejected').length,
    executing: queue.filter(p => p.status === 'executing').length,
    completed: queue.filter(p => p.status === 'completed').length,
    failed: queue.filter(p => p.status === 'failed').length,
  };
}

router.get('/stats', (req, res) => {
  try {
    res.json(getQueueStats());
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get pending proposals
router.get('/pending', (req, res) => {
  try {
    const pending = loadQueue()
      .filter(p => p.status === 'pending')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({ proposals: pending, count: pending.length });
  } catch (error) {
    console.error('Error getting pending:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get specific proposal
router.get('/:id', (req, res) => {
  try {
    const proposal = loadQueue().find(p => p.id === req.params.id);
    
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    
    res.json(proposal);
  } catch (error) {
    console.error('Error getting proposal:', error);
    res.status(500).json({ error: error.message });
  }
});

// Approve proposal
router.post('/:id/approve', (req, res) => {
  try {
    const { approvedBy } = req.body;
    const queue = loadQueue();
    const proposal = queue.find(p => p.id === req.params.id);
    
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    
    if (proposal.status !== 'pending') {
      return res.status(400).json({ error: `Proposal is not pending (status: ${proposal.status})` });
    }
    
    proposal.status = 'approved';
    proposal.approvedBy = approvedBy || 'human';
    proposal.approvedAt = new Date().toISOString();
    proposal.updatedAt = new Date().toISOString();
    
    saveQueue(queue);
    
    res.json({
      success: true,
      proposal,
      message: 'Proposal approved - ready for execution'
    });
  } catch (error) {
    console.error('Error approving proposal:', error);
    res.status(400).json({ error: error.message });
  }
});

// Reject proposal
router.post('/:id/reject', (req, res) => {
  try {
    const { rejectedBy, reason } = req.body;
    const queue = loadQueue();
    const proposal = queue.find(p => p.id === req.params.id);
    
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    
    proposal.status = 'rejected';
    proposal.rejectedBy = rejectedBy || 'human';
    proposal.rejectedAt = new Date().toISOString();
    proposal.rejectionReason = reason || '';
    proposal.updatedAt = new Date().toISOString();
    
    saveQueue(queue);
    
    res.json({
      success: true,
      proposal,
      message: 'Proposal rejected'
    });
  } catch (error) {
    console.error('Error rejecting proposal:', error);
    res.status(400).json({ error: error.message });
  }
});

// Start execution
router.post('/:id/execute', (req, res) => {
  try {
    const queue = loadQueue();
    const proposal = queue.find(p => p.id === req.params.id);
    
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    
    proposal.status = 'executing';
    proposal.executedAt = new Date().toISOString();
    proposal.updatedAt = new Date().toISOString();
    
    saveQueue(queue);
    
    res.json({
      success: true,
      proposal,
      message: 'Execution started'
    });
  } catch (error) {
    console.error('Error starting execution:', error);
    res.status(400).json({ error: error.message });
  }
});

// Complete execution
router.post('/:id/complete', (req, res) => {
  try {
    const { files } = req.body;
    const queue = loadQueue();
    const proposal = queue.find(p => p.id === req.params.id);
    
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    
    proposal.status = 'completed';
    proposal.completedAt = new Date().toISOString();
    proposal.files = files || [];
    proposal.updatedAt = new Date().toISOString();
    
    saveQueue(queue);
    
    res.json({
      success: true,
      proposal,
      message: 'Proposal completed'
    });
  } catch (error) {
    console.error('Error completing proposal:', error);
    res.status(400).json({ error: error.message });
  }
});

// Mark as failed
router.post('/:id/fail', (req, res) => {
  try {
    const { error } = req.body;
    const queue = loadQueue();
    const proposal = queue.find(p => p.id === req.params.id);
    
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    
    proposal.status = 'failed';
    proposal.errors.push({
      message: error || 'Unknown error',
      at: new Date().toISOString()
    });
    proposal.updatedAt = new Date().toISOString();
    
    saveQueue(queue);
    
    res.json({
      success: true,
      proposal,
      message: 'Proposal marked as failed'
    });
  } catch (error) {
    console.error('Error marking proposal as failed:', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
