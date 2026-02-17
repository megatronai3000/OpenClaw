/**
 * Auto-Execution Engine
 * 
 * Watches for approved proposals and automatically spawns agents to execute them
 */

const fs = require('fs');
const path = require('path');
const guardRails = require('./guard-rails');
const agentSpawner = require('./agent-spawner');

const QUEUE_FILE = path.join(__dirname, '../../shared-context/team/proposal-queue.json');

class AutoExecutionEngine {
  constructor() {
    this.running = false;
    this.pollInterval = null;
    this.lastCheck = null;
  }
  
  /**
   * Start the auto-execution engine
   */
  start(pollIntervalMs = 30000) {
    if (this.running) {
      console.log('[AutoExec] Already running');
      return;
    }
    
    this.running = true;
    this.pollInterval = setInterval(() => this.checkApprovedProposals(), pollIntervalMs);
    console.log(`[AutoExec] Started - checking every ${pollIntervalMs / 1000}s`);
    
    // Also check immediately
    this.checkApprovedProposals();
  }
  
  /**
   * Stop the engine
   */
  stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.running = false;
    console.log('[AutoExec] Stopped');
  }
  
  /**
   * Check for approved proposals that need execution
   */
  async checkApprovedProposals() {
    try {
      const queue = this.loadQueue();
      const approved = queue.filter(p => p.status === 'approved' && !p.executedAt);
      
      for (const proposal of approved) {
        await this.executeProposal(proposal);
      }
      
      this.lastCheck = new Date().toISOString();
    } catch (error) {
      console.error('[AutoExec] Error checking proposals:', error);
    }
  }
  
  /**
   * Execute an approved proposal
   */
  async executeProposal(proposal) {
    console.log(`[AutoExec] Executing proposal: ${proposal.id}`);
    
    // Check guard rails
    const guardCheck = guardRails.check({ estimatedCost: proposal.estimatedCost });
    if (!guardCheck.allowed) {
      console.log(`[AutoExec] Blocked by guard rails:`, guardCheck.errors);
      return { success: false, reason: 'guard_rails', errors: guardCheck.errors };
    }
    
    // Route to appropriate agent
    const agentType = agentSpawner.routeTask(proposal.taskDescription);
    const agentConfig = agentSpawner.getAgentConfig(agentType);
    
    console.log(`[AutoExec] Routing to ${agentConfig.name} (${agentType})`);
    
    // Mark as executing
    this.updateProposalStatus(proposal.id, { 
      status: 'executing', 
      executedAt: new Date().toISOString(),
      agentType,
    });
    
    try {
      // Spawn the agent
      const result = await agentSpawner.spawnAgent(agentType, proposal.taskDescription, {
        proposalId: proposal.id,
        estimatedCost: proposal.estimatedCost,
        context: `Executing approved proposal: ${proposal.id}\n\nTask: ${proposal.taskDescription}`,
      });
      
      if (result.success) {
        console.log(`[AutoExec] Agent spawned: ${result.agent.id}`);
        
        // Track execution
        this.updateProposalStatus(proposal.id, {
          agentSessionKey: result.sessionKey,
          agentId: result.agent.id,
        });
        
        return { success: true, agent: result.agent };
      } else {
        console.error(`[AutoExec] Agent spawn failed:`, result.error);
        
        this.updateProposalStatus(proposal.id, {
          status: 'failed',
          errors: [result.error],
        });
        
        return { success: false, reason: 'spawn_failed', error: result.error };
      }
    } catch (error) {
      console.error(`[AutoExec] Execution error:`, error);
      
      this.updateProposalStatus(proposal.id, {
        status: 'failed',
        errors: [error.message],
      });
      
      return { success: false, reason: 'error', error: error.message };
    }
  }
  
  /**
   * Load proposal queue
   */
  loadQueue() {
    try {
      if (fs.existsSync(QUEUE_FILE)) {
        return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8'));
      }
    } catch (e) {
      console.error('[AutoExec] Error loading queue:', e);
    }
    return [];
  }
  
  /**
   * Save proposal queue
   */
  saveQueue(queue) {
    const dir = path.dirname(QUEUE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
  }
  
  /**
   * Update proposal status
   */
  updateProposalStatus(proposalId, updates) {
    const queue = this.loadQueue();
    const proposal = queue.find(p => p.id === proposalId);
    
    if (proposal) {
      Object.assign(proposal, updates);
      proposal.updatedAt = new Date().toISOString();
      this.saveQueue(queue);
    }
    
    return proposal;
  }
  
  /**
   * Manually trigger execution for a proposal
   */
  async triggerExecution(proposalId) {
    const queue = this.loadQueue();
    const proposal = queue.find(p => p.id === proposalId);
    
    if (!proposal) {
      return { success: false, reason: 'not_found' };
    }
    
    if (proposal.status !== 'approved') {
      return { success: false, reason: 'not_approved', status: proposal.status };
    }
    
    return this.executeProposal(proposal);
  }
  
  /**
   * Get execution status
   */
  getStatus() {
    const queue = this.loadQueue();
    const executing = queue.filter(p => p.status === 'executing');
    
    return {
      running: this.running,
      lastCheck: this.lastCheck,
      executing: executing.length,
      queueStats: {
        pending: queue.filter(p => p.status === 'pending').length,
        approved: queue.filter(p => p.status === 'approved').length,
        executing: executing.length,
        completed: queue.filter(p => p.status === 'completed').length,
        failed: queue.filter(p => p.status === 'failed').length,
      },
      guardRails: guardRails.getStats(),
      teamStatus: agentSpawner.getTeamStatus(),
    };
  }
}

// Export singleton
module.exports = new AutoExecutionEngine();
