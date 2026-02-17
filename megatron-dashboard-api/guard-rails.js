/**
 * Guard Rails Engine
 * Enforces all safety limits before task execution
 */

const fs = require('fs');
const path = require('path');

const GUARD_RAILS_CONFIG = {
  // Budget limits
  TOTAL_MONTHLY_CAP: 100.00,
  DAILY_SPEND_LIMIT: 10.00,
  TASK_COST_LIMIT: 5.00,
  
  // Queue limits
  MAX_PENDING_DECISIONS: 15,
  MAX_CONCURRENT_TASKS: 5,
  MAX_BACKLOG_SIZE: 30,
  
  // Auto-approval thresholds
  AUTO_APPROVE_UNDER: 0.50,
  WARN_ABOVE: 2.00,
  
  // Emergency controls
  EMERGENCY_STOP: false,
  WEEKEND_AUTONOMY: true,
};

class GuardRailsEngine {
  constructor() {
    this.config = { ...GUARD_RAILS_CONFIG };
    this.costHistory = this.loadCostHistory();
  }
  
  loadCostHistory() {
    const costFile = path.join(__dirname, '../../shared-context/team/cost-history.json');
    try {
      if (fs.existsSync(costFile)) {
        return JSON.parse(fs.readFileSync(costFile, 'utf-8'));
      }
    } catch (e) {
      console.error('Error loading cost history:', e);
    }
    return { daily: {}, monthly: {}, lastReset: new Date().toISOString() };
  }
  
  saveCostHistory() {
    const costFile = path.join(__dirname, '../../shared-context/team/cost-history.json');
    const dir = path.dirname(costFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(costFile, JSON.stringify(this.costHistory, null, 2));
  }
  
  getTodayDate() {
    return new Date().toISOString().split('T')[0];
  }
  
  getMonthDate() {
    return new Date().toISOString().slice(0, 7); // YYYY-MM
  }
  
  getTodaySpend() {
    const today = this.getTodayDate();
    return this.costHistory.daily[today] || 0;
  }
  
  getMonthSpend() {
    const month = this.getMonthDate();
    return this.costHistory.monthly[month] || 0;
  }
  
  addCost(amount) {
    const today = this.getTodayDate();
    const month = this.getMonthDate();
    
    if (!this.costHistory.daily[today]) {
      this.costHistory.daily[today] = 0;
    }
    this.costHistory.daily[today] += amount;
    
    if (!this.costHistory.monthly[month]) {
      this.costHistory.monthly[month] = 0;
    }
    this.costHistory.monthly[month] += amount;
    
    this.saveCostHistory();
  }
  
  /**
   * Check all guard rails for a task
   */
  check(task) {
    const errors = [];
    const warnings = [];
    
    // 1. Emergency stop check
    if (this.config.EMERGENCY_STOP) {
      errors.push('EMERGENCY STOP is active');
    }
    
    // 2. Daily spend limit
    const todaySpend = this.getTodaySpend();
    if (todaySpend >= this.config.DAILY_SPEND_LIMIT) {
      errors.push(`Daily spend limit reached: $${todaySpend.toFixed(2)} / $${this.config.DAILY_SPEND_LIMIT}`);
    }
    
    // 3. Monthly spend limit
    const monthSpend = this.getMonthSpend();
    if (monthSpend >= this.config.TOTAL_MONTHLY_CAP) {
      errors.push(`Monthly cap reached: $${monthSpend.toFixed(2)} / $${this.config.TOTAL_MONTHLY_CAP}`);
    }
    
    // 4. Task cost limit
    const estimatedCost = task.estimatedCost || 0;
    if (estimatedCost > this.config.TASK_COST_LIMIT) {
      errors.push(`Task cost exceeds limit: $${estimatedCost} > $${this.config.TASK_COST_LIMIT}`);
    }
    
    // 5. Concurrent tasks limit
    const concurrent = this.getConcurrentTasks();
    if (concurrent >= this.config.MAX_CONCURRENT_TASKS) {
      errors.push(`Concurrent task limit reached: ${concurrent} / ${this.config.MAX_CONCURRENT_TASKS}`);
    }
    
    // 6. Pending decisions limit
    const pending = this.getPendingDecisions();
    if (pending >= this.config.MAX_PENDING_DECISIONS) {
      warnings.push(`Pending decision limit approaching: ${pending} / ${this.config.MAX_PENDING_DECISIONS}`);
    }
    
    // Warnings
    if (todaySpend >= this.config.DAILY_SPEND_LIMIT * 0.9) {
      warnings.push(`Daily spend at 90%: $${todaySpend.toFixed(2)} / $${this.config.DAILY_SPEND_LIMIT}`);
    }
    
    return {
      allowed: errors.length === 0,
      errors,
      warnings,
      stats: this.getStats()
    };
  }
  
  /**
   * Check if task should auto-approve
   */
  shouldAutoApprove(task) {
    const cost = task.estimatedCost || 0;
    
    if (cost < this.config.AUTO_APPROVE_UNDER) {
      return { autoApprove: true, reason: `Cost $${cost} < $${this.config.AUTO_APPROVE_UNDER}` };
    }
    
    if (cost < this.config.WARN_ABOVE && this.getPendingDecisions() < 5) {
      return { autoApprove: true, reason: `Cost $${cost} < $${this.config.WARN_ABOVE}, low queue` };
    }
    
    return { autoApprove: false, reason: 'Requires manual approval' };
  }
  
  getConcurrentTasks() {
    const queueFile = path.join(__dirname, '../../shared-context/team/proposal-queue.json');
    try {
      if (fs.existsSync(queueFile)) {
        const queue = JSON.parse(fs.readFileSync(queueFile, 'utf-8'));
        return queue.filter(p => p.status === 'executing').length;
      }
    } catch (e) {}
    return 0;
  }
  
  getPendingDecisions() {
    const queueFile = path.join(__dirname, '../../shared-context/team/proposal-queue.json');
    try {
      if (fs.existsSync(queueFile)) {
        const queue = JSON.parse(fs.readFileSync(queueFile, 'utf-8'));
        return queue.filter(p => p.status === 'pending').length;
      }
    } catch (e) {}
    return 0;
  }
  
  getStats() {
    return {
      todaySpend: this.getTodaySpend(),
      monthSpend: this.getMonthSpend(),
      dailyLimit: this.config.DAILY_SPEND_LIMIT,
      monthlyCap: this.config.TOTAL_MONTHLY_CAP,
      concurrentTasks: this.getConcurrentTasks(),
      maxConcurrent: this.config.MAX_CONCURRENT_TASKS,
      pendingDecisions: this.getPendingDecisions(),
      maxPending: this.config.MAX_PENDING_DECISIONS,
      emergencyStop: this.config.EMERGENCY_STOP,
    };
  }
  
  /**
   * Update config
   */
  updateConfig(updates) {
    this.config = { ...this.config, ...updates };
    return this.config;
  }
  
  /**
   * Emergency stop
   */
  emergencyStop() {
    this.config.EMERGENCY_STOP = true;
    return { stopped: true, reason: 'Emergency stop activated' };
  }
  
  /**
   * Resume from emergency stop
   */
  resume() {
    this.config.EMERGENCY_STOP = false;
    return { resumed: true };
  }
}

module.exports = new GuardRailsEngine();
