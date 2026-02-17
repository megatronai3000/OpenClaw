// auto-approval.js - Rules engine for autonomous agent decisions
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'data', 'dashboard.db');
const RULES_FILE = path.join(__dirname, '..', 'shared-context', 'auto-approval-rules.json');

// Default rules
const DEFAULT_RULES = {
  version: '2026-02-16',
  enabled: true,
  rules: [
    {
      id: 'low-cost-tasks',
      name: 'Auto-approve Low Cost Tasks',
      enabled: true,
      condition: {
        type: 'cost',
        operator: 'less_than',
        value: 0.50
      },
      action: 'auto_approve',
      reason: 'Cost below $0.50 threshold - low risk'
    },
    {
      id: 'trusted-agents',
      name: 'Auto-approve Trusted Agents',
      enabled: true,
      condition: {
        type: 'agent',
        operator: 'in_list',
        value: ['megatron', 'petty', 'architect']
      },
      action: 'auto_approve_if_cost_low',
      maxCost: 1.00,
      reason: 'Trusted agent with good track record'
    },
    {
      id: 'design-tasks',
      name: 'Auto-approve Design Tasks',
      enabled: true,
      condition: {
        type: 'task_type',
        operator: 'equals',
        value: 'design'
      },
      action: 'auto_approve_if_cost_low',
      maxCost: 0.80,
      reason: 'Design tasks have predictable costs'
    },
    {
      id: 'research-tasks',
      name: 'Auto-approve Research Tasks',
      enabled: true,
      condition: {
        type: 'task_type',
        operator: 'equals',
        value: 'research'
      },
      action: 'auto_approve_if_cost_low',
      maxCost: 0.60,
      reason: 'Research tasks are low risk'
    },
    {
      id: 'high-cost-block',
      name: 'Block High Cost Tasks',
      enabled: true,
      condition: {
        type: 'cost',
        operator: 'greater_than',
        value: 2.00
      },
      action: 'require_approval',
      reason: 'High cost requires explicit approval'
    },
    {
      id: 'daily-budget-guard',
      name: 'Daily Budget Guard',
      enabled: true,
      condition: {
        type: 'daily_budget_remaining',
        operator: 'less_than',
        value: 5.00
      },
      action: 'require_approval',
      reason: 'Low daily budget remaining'
    }
  ],
  agentTrustScores: {
    megatron: { score: 85, approvals: 45, rejections: 2 },
    petty: { score: 92, approvals: 23, rejections: 0 },
    architect: { score: 78, approvals: 12, rejections: 3 },
    scout: { score: 70, approvals: 8, rejections: 1 }
  }
};

/**
 * Initialize rules file if not exists
 */
function initRules() {
  if (!fs.existsSync(RULES_FILE)) {
    fs.writeFileSync(RULES_FILE, JSON.stringify(DEFAULT_RULES, null, 2));
    console.log('[AutoApproval] Rules initialized');
  }
}

/**
 * Load current rules
 */
function loadRules() {
  initRules();
  return JSON.parse(fs.readFileSync(RULES_FILE, 'utf8'));
}

/**
 * Save rules
 */
function saveRules(rules) {
  fs.writeFileSync(RULES_FILE, JSON.stringify(rules, null, 2));
}

/**
 * Get current daily spend
 */
function getDailySpend() {
  const db = new Database(DB_PATH);
  try {
    const today = db.prepare("SELECT SUM(cost) as total FROM cost_tracking WHERE date = date('now')").get();
    return today.total || 0;
  } finally {
    db.close();
  }
}

/**
 * Evaluate a decision against rules
 */
function evaluateDecision(decision) {
  const rules = loadRules();
  
  if (!rules.enabled) {
    return { approved: false, reason: 'Auto-approval disabled' };
  }
  
  const dailySpend = getDailySpend();
  const dailyRemaining = 10 - dailySpend; // $10 daily limit
  
  // Check each rule
  for (const rule of rules.rules) {
    if (!rule.enabled) continue;
    
    let matches = false;
    
    switch (rule.condition.type) {
      case 'cost':
        const cost = decision.estimatedCost || 0;
        if (rule.condition.operator === 'less_than' && cost < rule.condition.value) {
          matches = true;
        } else if (rule.condition.operator === 'greater_than' && cost > rule.condition.value) {
          matches = true;
        }
        break;
        
      case 'agent':
        const agent = decision.agent?.toLowerCase() || '';
        if (rule.condition.operator === 'in_list') {
          matches = rule.condition.value.includes(agent);
        }
        break;
        
      case 'task_type':
        const type = decision.type?.toLowerCase() || '';
        if (rule.condition.operator === 'equals' && type === rule.condition.value) {
          matches = true;
        }
        break;
        
      case 'daily_budget_remaining':
        if (rule.condition.operator === 'less_than' && dailyRemaining < rule.condition.value) {
          matches = true;
        }
        break;
    }
    
    if (matches) {
      // Check additional constraints
      if (rule.action === 'auto_approve_if_cost_low') {
        const cost = decision.estimatedCost || 0;
        if (cost > (rule.maxCost || 0.50)) {
          continue; // Cost too high, check next rule
        }
      }
      
      // Log the auto-approval
      logAutoApproval(decision, rule);
      
      return {
        approved: rule.action.startsWith('auto_approve'),
        rule: rule.id,
        ruleName: rule.name,
        reason: rule.reason,
        dailySpend,
        dailyRemaining
      };
    }
  }
  
  // No rule matched - require approval
  return {
    approved: false,
    reason: 'No auto-approval rule matched',
    dailySpend,
    dailyRemaining
  };
}

/**
 * Log auto-approval action
 */
function logAutoApproval(decision, rule) {
  const db = new Database(DB_PATH);
  try {
    db.prepare(`
      INSERT INTO auto_approval_logs (timestamp, decision_id, agent, estimated_cost, rule_id, rule_name, action, reason)
      VALUES (datetime('now'), ?, ?, ?, ?, ?, ?, ?)
    `).run(
      decision.id || 'unknown',
      decision.agent || 'unknown',
      decision.estimatedCost || 0,
      rule.id,
      rule.name,
      rule.action,
      rule.reason
    );
  } finally {
    db.close();
  }
}

/**
 * Update agent trust score
 */
function updateAgentScore(agent, outcome) {
  const rules = loadRules();
  
  if (!rules.agentTrustScores[agent]) {
    rules.agentTrustScores[agent] = { score: 50, approvals: 0, rejections: 0 };
  }
  
  const score = rules.agentTrustScores[agent];
  
  if (outcome === 'approved') {
    score.approvals++;
    score.score = Math.min(100, score.score + 2);
  } else if (outcome === 'rejected') {
    score.rejections++;
    score.score = Math.max(0, score.score - 5);
  }
  
  saveRules(rules);
}

/**
 * Get auto-approval stats
 */
function getStats() {
  const db = new Database(DB_PATH);
  try {
    const today = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN action LIKE 'auto_approve%' THEN 1 ELSE 0 END) as auto_approved,
        SUM(CASE WHEN action = 'require_approval' THEN 1 ELSE 0 END) as blocked
      FROM auto_approval_logs
      WHERE date(timestamp) = date('now')
    `).get();
    
    const byRule = db.prepare(`
      SELECT rule_name, COUNT(*) as count
      FROM auto_approval_logs
      WHERE date(timestamp) = date('now')
      GROUP BY rule_name
    `).all();
    
    return {
      today: {
        total: today.total || 0,
        autoApproved: today.auto_approved || 0,
        blocked: today.blocked || 0
      },
      byRule,
      rules: loadRules()
    };
  } finally {
    db.close();
  }
}

// Ensure table exists
function initTable() {
  const db = new Database(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS auto_approval_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      decision_id TEXT,
      agent TEXT,
      estimated_cost REAL,
      rule_id TEXT,
      rule_name TEXT,
      action TEXT,
      reason TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_auto_approval_timestamp ON auto_approval_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_auto_approval_agent ON auto_approval_logs(agent);
  `);
  db.close();
}

module.exports = {
  initRules,
  loadRules,
  saveRules,
  evaluateDecision,
  updateAgentScore,
  getStats,
  getDailySpend,
  initTable
};

// Run if called directly
if (require.main === module) {
  initTable();
  initRules();
  
  console.log('=== Auto-Approval System ===');
  console.log('Rules loaded:', loadRules().rules.length);
  console.log('Daily spend:', getDailySpend().toFixed(2));
  console.log('Stats:', getStats().today);
}
