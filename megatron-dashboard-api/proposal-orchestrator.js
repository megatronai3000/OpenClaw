/**
 * Proposal Workflow Orchestrator
 * 
 * Flow:
 * 1. Create proposal request
 * 2. Spawn agent to create detailed proposal
 * 3. Agent creates 200+ line proposal (without executing)
 * 4. Agent exits - proposal saved to decision queue
 * 5. Human reviews and approves/rejects
 * 6. On approval, spawn execution agent
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Paths
const PROPOSALS_DIR = path.join(__dirname, '../../shared-context/decisions');
const QUEUE_FILE = path.join(__dirname, '../../shared-context/team/proposal-queue.json');
const PROPOSAL_TEMPLATE = path.join(__dirname, '../../shared-context/team/proposal-template.md');

// Ensure directories exist
if (!fs.existsSync(PROPOSALS_DIR)) {
  fs.mkdirSync(PROPOSALS_DIR, { recursive: true });
}

// Guard Rails
const GUARD_RAILS = {
  MAX_PENDING_DECISIONS: 15,
  MAX_CONCURRENT_TASKS: 5,
  TASK_COST_LIMIT: 5.00,
  AUTO_APPROVE_UNDER: 0.50,
};

/**
 * Create a new proposal request
 */
export function createProposalRequest(taskDescription, requestedBy = 'human') {
  const id = `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const proposal = {
    id,
    status: 'pending', // pending, approved, rejected, executing, completed, failed
    taskDescription,
    requestedBy,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    cost: null,
    estimatedTime: null,
    approvedBy: null,
    approvedAt: null,
    executedAt: null,
    completedAt: null,
    files: [],
    errors: [],
  };
  
  // Load existing queue
  const queue = loadQueue();
  queue.push(proposal);
  saveQueue(queue);
  
  return proposal;
}

/**
 * Load proposal queue
 */
function loadQueue() {
  try {
    if (fs.existsSync(QUEUE_FILE)) {
      return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error loading queue:', e);
  }
  return [];
}

/**
 * Save proposal queue
 */
function saveQueue(queue) {
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
}

/**
 * Get pending proposals
 */
export function getPendingProposals() {
  return loadQueue().filter(p => p.status === 'pending');
}

/**
 * Approve a proposal
 */
export function approveProposal(proposalId, approvedBy = 'human') {
  const queue = loadQueue();
  const proposal = queue.find(p => p.id === proposalId);
  
  if (!proposal) {
    throw new Error(`Proposal ${proposalId} not found`);
  }
  
  if (proposal.status !== 'pending') {
    throw new Error(`Proposal ${proposalId} is not pending (status: ${proposal.status})`);
  }
  
  proposal.status = 'approved';
  proposal.approvedBy = approvedBy;
  proposal.approvedAt = new Date().toISOString();
  proposal.updatedAt = new Date().toISOString();
  
  saveQueue(queue);
  
  return proposal;
}

/**
 * Reject a proposal
 */
export function rejectProposal(proposalId, rejectedBy = 'human', reason = '') {
  const queue = loadQueue();
  const proposal = queue.find(p => p.id === proposalId);
  
  if (!proposal) {
    throw new Error(`Proposal ${proposalId} not found`);
  }
  
  proposal.status = 'rejected';
  proposal.rejectedBy = rejectedBy;
  proposal.rejectedAt = new Date().toISOString();
  proposal.rejectionReason = reason;
  proposal.updatedAt = new Date().toISOString();
  
  saveQueue(queue);
  
  return proposal;
}

/**
 * Mark proposal as executing
 */
export function startExecution(proposalId) {
  const queue = loadQueue();
  const proposal = queue.find(p => p.id === proposalId);
  
  if (!proposal) {
    throw new Error(`Proposal ${proposalId} not found`);
  }
  
  proposal.status = 'executing';
  proposal.executedAt = new Date().toISOString();
  proposal.updatedAt = new Date().toISOString();
  
  saveQueue(queue);
  
  return proposal;
}

/**
 * Mark proposal as completed
 */
export function completeProposal(proposalId, files = []) {
  const queue = loadQueue();
  const proposal = queue.find(p => p.id === proposalId);
  
  if (!proposal) {
    throw new Error(`Proposal ${proposalId} not found`);
  }
  
  proposal.status = 'completed';
  proposal.completedAt = new Date().toISOString();
  proposal.files = files;
  proposal.updatedAt = new Date().toISOString();
  
  saveQueue(queue);
  
  return proposal;
}

/**
 * Mark proposal as failed
 */
export function failProposal(proposalId, error) {
  const queue = loadQueue();
  const proposal = queue.find(p => p.id === proposalId);
  
  if (!proposal) {
    throw new Error(`Proposal ${proposalId} not found`);
  }
  
  proposal.status = 'failed';
  proposal.errors.push({
    message: error.message || error,
    at: new Date().toISOString()
  });
  proposal.updatedAt = new Date().toISOString();
  
  saveQueue(queue);
  
  return proposal;
}

/**
 * Get proposal by ID
 */
export function getProposal(proposalId) {
  const queue = loadQueue();
  return queue.find(p => p.id === proposalId);
}

/**
 * Get all proposals
 */
export function getAllProposals() {
  return loadQueue();
}

/**
 * Get queue stats
 */
export function getQueueStats() {
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

/**
 * Check guard rails before creating proposal
 */
export function checkGuardRails() {
  const stats = getQueueStats();
  const errors = [];
  
  if (stats.pending >= GUARD_RAILS.MAX_PENDING_DECISIONS) {
    errors.push(`Pending decision limit reached: ${stats.pending}/${GUARD_RAILS.MAX_PENDING_DECISIONS}`);
  }
  
  if (stats.executing >= GUARD_RAILS.MAX_CONCURRENT_TASKS) {
    errors.push(`Concurrent task limit reached: ${stats.executing}/${GUARD_RAILS.MAX_CONCURRENT_TASKS}`);
  }
  
  return {
    allowed: errors.length === 0,
    errors,
    stats
  };
}

// CLI interface
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const command = process.argv[2];
  
  switch (command) {
    case 'create':
      const task = process.argv[3];
      if (!task) {
        console.error('Usage: node proposal-orchestrator.js create "<task description>"');
        process.exit(1);
      }
      const proposal = createProposalRequest(task);
      console.log(`Created proposal: ${proposal.id}`);
      break;
      
    case 'list':
      const proposals = getAllProposals();
      console.log('\n=== Proposal Queue ===\n');
      proposals.forEach(p => {
        console.log(`[${p.status.toUpperCase()}] ${p.id}`);
        console.log(`  Task: ${p.taskDescription.substring(0, 60)}...`);
        console.log(`  Created: ${p.createdAt}`);
        console.log('');
      });
      console.log('\nStats:', getQueueStats());
      break;
      
    case 'approve':
      const approveId = process.argv[3];
      if (!approveId) {
        console.error('Usage: node proposal-orchestrator.js approve <proposal-id>');
        process.exit(1);
      }
      const approved = approveProposal(approveId);
      console.log(`Approved proposal: ${approved.id}`);
      break;
      
    case 'reject':
      const rejectId = process.argv[3];
      const reason = process.argv[4] || '';
      if (!rejectId) {
        console.error('Usage: node proposal-orchestrator.js reject <proposal-id> [reason]');
        process.exit(1);
      }
      const rejected = rejectProposal(rejectId, 'human', reason);
      console.log(`Rejected proposal: ${rejected.id}`);
      break;
      
    case 'stats':
      console.log(getQueueStats());
      break;
      
    default:
      console.log('Commands:');
      console.log('  create "<task>"     - Create new proposal request');
      console.log('  list               - List all proposals');
      console.log('  approve <id>       - Approve a proposal');
      console.log('  reject <id> [reason] - Reject a proposal');
      console.log('  stats              - Show queue statistics');
  }
}
