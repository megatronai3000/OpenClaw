// orchestrator.js - Kanban-driven autonomous routing
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Cost tracking middleware
let costMiddleware = null;
try {
  costMiddleware = require('./megatron-dashboard-api/cost-middleware');
  console.log('[Orchestrator] Cost tracking enabled');
} catch (err) {
  console.warn('[Orchestrator] Cost tracking not available:', err.message);
}

const KANBAN_PATH = path.join(process.env.HOME, '.openclaw', 'shared-context', 'kanban', 'cards.json');
const ARTIFACTS_DIR = path.join(process.env.HOME, '.openclaw', 'artifacts', 'outputs');
const DECISIONS_DIR = path.join(process.env.HOME, '.openclaw', 'shared-context', 'decisions');
const DB_PATH = path.join(__dirname, 'megatron-dashboard-api', 'data', 'dashboard.db');

// Progress tracking
let progressTracker = null;
try {
  progressTracker = require('./megatron-dashboard-api/progress-tracker');
} catch (err) {
  console.warn('[Orchestrator] Progress tracker not available:', err.message);
}

// === GUARD RAIL CONFIGURATION ===
const GUARD_RAILS = {
  MAX_BACKLOG_SIZE: 30,
  MIN_BALANCE: 20,
  EMERGENCY_STOP: 10,
  MAX_DAILY_SPEND: 10,
  MAX_CONCURRENT: 15,
  MAX_PENDING_DECISIONS: 10
};

// === TEAM COORDINATION FUNCTIONS ===

const TEAM_DIR = path.join(process.env.HOME, '.openclaw', 'shared-context', 'team');

// Ensure team directories exist
function ensureTeamDirs() {
  const dirs = ['chat', 'feedback', 'daily-standup', 'lessons-learned'];
  dirs.forEach(dir => {
    const dirPath = path.join(TEAM_DIR, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
}

// Post message to team chat
function postToTeamChat(agent, message, type = 'general') {
  ensureTeamDirs();
  const chatPath = path.join(TEAM_DIR, 'chat.md');
  const timestamp = new Date().toISOString();
  
  const entry = `
## ${timestamp} - ${agent} (${type})

${message}

---
`;
  
  fs.appendFileSync(chatPath, entry);
  console.log(`[TEAM CHAT] ${agent}: ${message.substring(0, 80)}...`);
}

// Post daily standup
function postDailyStandup(agent, yesterday, learned, today, blockers) {
  ensureTeamDirs();
  const date = new Date().toISOString().split('T')[0];
  const standupPath = path.join(TEAM_DIR, 'daily-standup.md');
  
  const entry = `
## ${date} - ${agent}

**Yesterday:** ${yesterday}
**Learned:** ${learned}
**Today:** ${today}
**Blockers:** ${blockers || 'None'}

---
`;
  
  fs.appendFileSync(standupPath, entry);
  console.log(`[DAILY STANDUP] ${agent} posted update`);
}

// Share lesson learned
function shareLessonLearned(agent, decision, feedback, lesson, action) {
  ensureTeamDirs();
  const lessonsPath = path.join(TEAM_DIR, 'lessons-learned.md');
  const date = new Date().toISOString().split('T')[0];
  
  const entry = `
## ${date}: ${lesson.substring(0, 50)}...

**Agent:** ${agent}
**Decision:** ${decision}
**Feedback:** ${feedback}
**Lesson:** ${lesson}
**Action:** ${action}

---
`;
  
  fs.appendFileSync(lessonsPath, entry);
  console.log(`[LESSONS LEARNED] ${agent} shared: ${lesson.substring(0, 60)}...`);
}

// Log feedback for agent
function logFeedback(agent, decisionId, feedback, approved) {
  ensureTeamDirs();
  const feedbackDir = path.join(TEAM_DIR, 'feedback', agent.toLowerCase());
  if (!fs.existsSync(feedbackDir)) {
    fs.mkdirSync(feedbackDir, { recursive: true });
  }

  const feedbackPath = path.join(feedbackDir, `${decisionId}.md`);
  const status = approved ? '✅ APPROVED' : '❌ REJECTED';

  const content = `# Feedback: ${decisionId}

**Status:** ${status}
**Date:** ${new Date().toISOString()}

## Feedback

${feedback}

## Learning Notes

[Agent should fill in what they learned and how they'll apply it]

---
`;

  fs.writeFileSync(feedbackPath, content);
}

// === PROGRESS TRACKING FUNCTIONS ===

// When starting work
function reportWorkStart(workId, agent, title, phases) {
  if (!progressTracker) {
    console.warn('[Orchestrator] Progress tracker not available');
    return null;
  }
  const estimatedDuration = phases.length * 15 * 60 * 1000; // 15 min per phase
  
  // Log estimated cost for this work
  logEstimatedCost(workId, agent, title, phases);
  
  return progressTracker.startWork(workId, agent, title, estimatedDuration, phases);
}

// Log estimated cost when work starts
function logEstimatedCost(workId, agent, title, phases) {
  if (!costMiddleware) return;
  
  try {
    // Estimate based on complexity (phases)
    const estimatedCost = phases.length * 0.15; // $0.15 per phase
    
    // Log as pending/estimate
    const Database = require('better-sqlite3');
    const db = new Database(DB_PATH);
    
    db.prepare(`
      INSERT INTO cost_tracking (id, date, sessionName, cost, tokens, model, createdAt)
      VALUES (?, date('now'), ?, ?, ?, ?, datetime('now'))
    `).run(
      `estimate-${workId}`,
      `estimate:${agent}:${title.substring(0, 30)}`,
      estimatedCost,
      0,
      'estimate'
    );
    
    db.close();
    console.log(`[COST] Estimated: ${workId} | $${estimatedCost.toFixed(2)} (${phases.length} phases)`);
  } catch (err) {
    console.warn('[COST] Failed to log estimate:', err.message);
  }
}

// When updating phase
function reportPhaseComplete(workId, phaseIndex, details) {
  if (!progressTracker) return null;
  progressTracker.updatePhase(workId, phaseIndex, 'completed', details);
  // The progress tracker automatically activates the next phase
  return progressTracker.getWorkById(workId);
}

// When logging progress
function reportProgress(workId, message, level = 'info') {
  if (!progressTracker) return null;
  return progressTracker.logProgress(workId, message, level);
}

// When completing work
function reportWorkComplete(workId, result) {
  if (!progressTracker) return null;
  
  // Capture cost from completed work
  captureWorkCost(workId, result);
  
  return progressTracker.completeWork(workId, result);
}

// Capture cost from agent work session
function captureWorkCost(workId, result) {
  if (!costMiddleware) return;
  
  try {
    // Estimate tokens from result/output size
    const outputSize = result?.output?.length || result?.deliverables?.length || 1000;
    const estimatedTokens = Math.max(outputSize * 2, 1000); // Rough estimate: 2 tokens per char
    
    // Use actual cost from result if available, otherwise estimate
    const actualCost = result?.cost || result?.metadata?.cost;
    const estimatedCost = actualCost || (estimatedTokens / 1000000 * 1.0); // $1 per 1M tokens avg
    
    const usage = {
      input_tokens: Math.floor(estimatedTokens * 0.7), // 70% input
      output_tokens: Math.floor(estimatedTokens * 0.3)  // 30% output
    };
    
    costMiddleware.logAPICall('openclaw', 'agent-session', usage, {
      sessionName: workId,
      project_id: result?.project || 'orchestrated-task',
      endpoint: '/agent/complete'
    });
    
    console.log(`[COST] Captured: ${workId} | $${estimatedCost.toFixed(4)}`);
  } catch (err) {
    console.warn('[COST] Failed to capture work cost:', err.message);
  }
}

// When work fails
function reportWorkFailed(workId, error) {
  if (!progressTracker) return null;
  return progressTracker.failWork(workId, error);
}

// Identify skill gaps from backlog
function identifySkillGaps() {
  ensureTeamDirs();
  const cards = JSON.parse(fs.readFileSync(KANBAN_PATH, 'utf8'));
  const backlog = cards.filter(c => c.status === 'backlog');
  
  const gaps = [];
  backlog.forEach(task => {
    const title = task.title.toLowerCase();
    // Check for unmet skill needs
    if (title.includes('marketing') || title.includes('copy')) {
      gaps.push({ skill: 'Marketing/Copywriting', task: task.title, priority: task.priority });
    }
    if (title.includes('video') || title.includes('animation')) {
      gaps.push({ skill: 'Video/Animation', task: task.title, priority: task.priority });
    }
    if (title.includes('data science') || title.includes('ml') || title.includes('ai model')) {
      gaps.push({ skill: 'Data Science/ML', task: task.title, priority: task.priority });
    }
  });
  
  if (gaps.length > 0) {
    const gapsPath = path.join(TEAM_DIR, 'skill-gaps.md');
    let content = fs.existsSync(gapsPath) ? fs.readFileSync(gapsPath, 'utf8') : '# Skill Gaps Identified\n\n';
    
    content += `\n## ${new Date().toISOString()}\n\n`;
    gaps.forEach(gap => {
      content += `- **${gap.skill}** needed for: "${gap.task}" (${gap.priority} priority)\n`;
    });
    
    fs.writeFileSync(gapsPath, content);
    console.log(`[SKILL GAPS] Identified ${gaps.length} gaps`);
  }
  
  return gaps;
}

// Megatron reviews proposals (pre-approval)
async function megatronReviewProposal(decisionPath) {
  const content = fs.readFileSync(decisionPath, 'utf8');
  
  // Parse decision
  const costMatch = content.match(/\*\*Cost:\*\*\s*\$([0-9.]+)/);
  const cost = costMatch ? parseFloat(costMatch[1]) : 2.0;
  
  const typeMatch = content.match(/\*\*Type:\*\*\s*(.+)/);
  const type = typeMatch ? typeMatch[1].trim() : 'unknown';
  
  // Megatron's review logic
  let recommendation = 'escalate';
  let reason = '';
  
  if (cost < 0.50) {
    recommendation = 'pre-approve';
    reason = 'Low cost, low risk';
  } else if (cost < 2.0 && type.includes('Design')) {
    recommendation = 'review';
    reason = 'Medium cost, get team input';
  } else {
    recommendation = 'escalate';
    reason = 'High cost or strategic decision';
  }
  
  // Log review
  postToTeamChat('Megatron', `Reviewed proposal: ${path.basename(decisionPath)} - Recommendation: ${recommendation} (${reason})`, 'review');
  
  return { recommendation, cost, reason };
}

// === GUARD RAIL FUNCTIONS ===

// 1. Enforce maximum backlog size
async function enforceBacklogLimit() {
  try {
    const cards = JSON.parse(fs.readFileSync(KANBAN_PATH, 'utf8'));
    const backlog = cards.filter(c => c.status === 'backlog');
    
    if (backlog.length > GUARD_RAILS.MAX_BACKLOG_SIZE) {
      console.warn(`[GUARD RAIL] Backlog exceeds limit: ${backlog.length}/${GUARD_RAILS.MAX_BACKLOG_SIZE}`);
      
      // Sort by priority (critical > high > medium > low)
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const sorted = backlog.sort((a, b) => {
        return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      });
      
      // Keep only top priority tasks
      const toKeep = sorted.slice(0, GUARD_RAILS.MAX_BACKLOG_SIZE);
      const toDefer = sorted.slice(GUARD_RAILS.MAX_BACKLOG_SIZE);
      
      // Move excess to deferred
      toDefer.forEach(card => {
        card.status = 'deferred';
        card.deferredReason = 'Backlog limit exceeded - deferred automatically';
        card.deferredAt = new Date().toISOString();
      });
      
      // Update cards
      const updatedCards = cards.filter(c => c.status !== 'backlog' || toKeep.includes(c));
      fs.writeFileSync(KANBAN_PATH, JSON.stringify(updatedCards, null, 2));
      
      console.log(`[GUARD RAIL] Deferred ${toDefer.length} low-priority tasks`);
      return { enforced: true, deferred: toDefer.length };
    }
    return { enforced: false };
  } catch (err) {
    console.error('[GUARD RAIL ERROR] Failed to enforce backlog limit:', err.message);
    return { enforced: false, error: err.message };
  }
}

// 2. Check budget guard rails
async function checkBudgetGuardRails() {
  let balance = 250; // Default fallback
  
  try {
    const Database = require('better-sqlite3');
    const db = new Database(DB_PATH);
    
    // Get current balance (monthly limit - spent)
    const currentMonth = new Date().toISOString().slice(0, 7);
    const costMonth = db.prepare("SELECT SUM(cost) as total FROM cost_tracking WHERE date LIKE ?").get(currentMonth + '%');
    const monthlySpent = costMonth?.total || 0;
    balance = 300 - monthlySpent;
    
    db.close();
  } catch (dbErr) {
    console.warn('[GUARD RAIL] Database not available, using estimated balance:', balance);
  }
  
  // EMERGENCY STOP
  if (balance < GUARD_RAILS.EMERGENCY_STOP) {
    console.error(`[EMERGENCY STOP] Balance $${balance.toFixed(2)} below $${GUARD_RAILS.EMERGENCY_STOP}`);
    console.error('[EMERGENCY STOP] System halted to prevent overdraft');
    
    // Create emergency notification
    const alertPath = path.join(process.env.HOME, '.openclaw', 'RECHARGE_NEEDED.txt');
    const message = `RECHARGE NEEDED!
Current Balance: $${balance.toFixed(2)}
Minimum Safe: $${GUARD_RAILS.MIN_BALANCE}
System stopped at: $${GUARD_RAILS.EMERGENCY_STOP}
Time: ${new Date().toISOString()}
`;
    fs.writeFileSync(alertPath, message);
    
    return 'emergency-stop';
  }
  
  // WARNING - Only critical tasks
  if (balance < GUARD_RAILS.MIN_BALANCE) {
    console.warn(`[WARNING] Balance $${balance.toFixed(2)} below safe threshold $${GUARD_RAILS.MIN_BALANCE}`);
    console.warn('[WARNING] Only processing critical priority tasks');
    
    // Create low balance alert
    const alertPath = path.join(process.env.HOME, '.openclaw', 'RECHARGE_NEEDED.txt');
    const message = `RECHARGE NEEDED!
Current Balance: $${balance.toFixed(2)}
Minimum Safe: $${GUARD_RAILS.MIN_BALANCE}
Recommended Recharge: $50
System will stop at $${GUARD_RAILS.EMERGENCY_STOP}
Time: ${new Date().toISOString()}
`;
    fs.writeFileSync(alertPath, message);
    
    return 'critical-only';
  }
  
  return 'normal';
}

// 3. Check daily spend limit
async function checkDailySpendLimit() {
  let spentToday = 0;
  
  try {
    const Database = require('better-sqlite3');
    const db = new Database(DB_PATH);
    
    const today = new Date().toISOString().split('T')[0];
    const costToday = db.prepare('SELECT SUM(cost) as total FROM cost_tracking WHERE date = ?').get(today);
    spentToday = costToday?.total || 0;
    
    db.close();
  } catch (dbErr) {
    console.warn('[GUARD RAIL] Database not available for daily spend check');
  }
  
  if (spentToday >= GUARD_RAILS.MAX_DAILY_SPEND) {
    console.warn(`[DAILY LIMIT] Already spent $${spentToday.toFixed(2)}/${GUARD_RAILS.MAX_DAILY_SPEND} today`);
    console.warn('[DAILY LIMIT] No new tasks until tomorrow');
    return false;
  }
  
  return true;
}

// 4. Check concurrency limit
async function checkConcurrencyLimit() {
  try {
    const cards = JSON.parse(fs.readFileSync(KANBAN_PATH, 'utf8'));
    const inProgress = cards.filter(c => c.status === 'in-progress');
    
    if (inProgress.length >= GUARD_RAILS.MAX_CONCURRENT) {
      console.warn(`[CONCURRENCY LIMIT] ${inProgress.length}/${GUARD_RAILS.MAX_CONCURRENT} tasks in progress`);
      console.warn('[CONCURRENCY LIMIT] Wait for completion before picking new tasks');
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('[GUARD RAIL ERROR] Failed to check concurrency:', err.message);
    return true; // Fail open
  }
}

// 5. Check pending decisions limit
async function checkPendingDecisionsLimit() {
  try {
    const decisionsDir = path.join(process.env.HOME, '.openclaw', 'shared-context', 'decisions');
    if (!fs.existsSync(decisionsDir)) {
      return true; // No decisions dir yet, so no pending decisions
    }
    
    const files = fs.readdirSync(decisionsDir).filter(f => f.endsWith('.md'));
    let pendingCount = 0;
    
    for (const file of files) {
      const content = fs.readFileSync(path.join(decisionsDir, file), 'utf8');
      // Check if decision is pending (contains 🟡 or "pending" in status)
      if (content.includes('🟡') || content.match(/\*\*Status:\*\*.*pending/i)) {
        pendingCount++;
      }
    }
    
    if (pendingCount >= GUARD_RAILS.MAX_PENDING_DECISIONS) {
      console.warn(`[DECISION LIMIT] ${pendingCount}/${GUARD_RAILS.MAX_PENDING_DECISIONS} pending decisions`);
      console.warn('[DECISION LIMIT] Pausing new work until decisions are reviewed');
      console.log('[ORCHESTRATOR] Waiting for decision approval before starting new work');
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('[GUARD RAIL ERROR] Failed to check pending decisions:', err.message);
    return true; // Fail open
  }
}

// 6. Check if we can afford a task
async function canAffordTask(task) {
  let balance = 250; // Default fallback
  
  try {
    const Database = require('better-sqlite3');
    const db = new Database(DB_PATH);
    
    const currentMonth = new Date().toISOString().slice(0, 7);
    const costMonth = db.prepare("SELECT SUM(cost) as total FROM cost_tracking WHERE date LIKE ?").get(currentMonth + '%');
    const monthlySpent = costMonth?.total || 0;
    balance = 300 - monthlySpent;
    
    db.close();
  } catch (dbErr) {
    console.warn('[GUARD RAIL] Database not available for affordability check, using estimated balance:', balance);
  }
  
  try {
    // Parse estimated cost
    const costStr = task.estimate?.cost || '$2.00';
    const estimatedCost = parseFloat(costStr.replace('$', '').replace(/,/g, '')) || 2.00;
    
    if (balance - estimatedCost < GUARD_RAILS.MIN_BALANCE) {
      console.warn(`[BUDGET CHECK] Task costs $${estimatedCost}, would leave balance at $${(balance - estimatedCost).toFixed(2)}`);
      console.warn(`[BUDGET CHECK] Skipping to preserve $${GUARD_RAILS.MIN_BALANCE} minimum`);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('[GUARD RAIL ERROR] Failed to check affordability:', err.message);
    return true; // Fail open
  }
}

// === PARALLEL EXECUTION CONFIG ===
const PARALLEL_CONFIG = {
  MAX_PARALLEL_TASKS: 4,  // Match 6 cores (4 for agents, 2 for system)
  AGENT_POOL: ['architect', 'petty', 'scout', 'megatron'] // Available agents
};

async function orchestrate() {
  console.log('🔍 Checking Kanban backlog (Parallel Mode)...');
  console.log(`[Orchestrator] Reading from: ${KANBAN_PATH}`);
  
  // === GUARD RAILS - Run all checks before proceeding ===
  console.log('[GUARD RAILS] Running safety checks...');
  
  // 1. Enforce backlog limit
  const backlogCheck = await enforceBacklogLimit();
  if (backlogCheck.enforced) {
    console.log(`[GUARD RAILS] Enforced backlog limit, deferred ${backlogCheck.deferred} tasks`);
  }
  
  // 2. Check budget guard rails
  const budgetMode = await checkBudgetGuardRails();
  if (budgetMode === 'emergency-stop') {
    console.error('[GUARD RAILS] EMERGENCY STOP triggered');
    process.exit(1);
  }
  if (budgetMode === 'critical-only') {
    console.warn('[GUARD RAILS] Critical-only mode - only processing critical priority tasks');
  }
  
  // 3. Check daily spend limit
  const canSpend = await checkDailySpendLimit();
  if (!canSpend) {
    console.warn('[GUARD RAILS] Daily spend limit reached - stopping for today');
    return;
  }
  
  // 4. Check concurrency limit
  const canStart = await checkConcurrencyLimit();
  if (!canStart) {
    console.warn('[GUARD RAILS] Concurrency limit reached - waiting for tasks to complete');
    return;
  }
  
  // 5. Check pending decisions limit
  const canCreateDecision = await checkPendingDecisionsLimit();
  if (!canCreateDecision) {
    console.warn('[GUARD RAILS] Decision queue full - waiting for approvals');
    return;
  }
  
  console.log('[GUARD RAILS] All checks passed ✅');
  
  // Check for emergency stop file (manual override)
  const stopFile = path.join(process.env.HOME, '.openclaw', 'shared-context', 'emergency-stop.md');
  if (fs.existsSync(stopFile)) {
    console.error('🛑 Emergency stop file detected. Halting orchestrator.');
    console.error('Remove emergency-stop.md to resume operations.');
    return;
  }
  
  // Ensure required directories exist
  if (!fs.existsSync(ARTIFACTS_DIR)) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  }
  if (!fs.existsSync(DECISIONS_DIR)) {
    fs.mkdirSync(DECISIONS_DIR, { recursive: true });
  }
  
  // Read Kanban cards
  const cards = JSON.parse(fs.readFileSync(KANBAN_PATH, 'utf8'));
  console.log(`[Orchestrator] Total cards: ${cards.length}`);
  
  // Calculate parallel slots after loading cards
  const inProgressCount = cards.filter(c => c.status === 'in-progress').length;
  const availableSlots = GUARD_RAILS.MAX_CONCURRENT - inProgressCount;
  const maxTasksToSpawn = Math.min(availableSlots, PARALLEL_CONFIG.MAX_PARALLEL_TASKS);
  
  if (maxTasksToSpawn <= 0) {
    console.warn(`[PARALLEL] No slots available (${inProgressCount} in-progress, max ${GUARD_RAILS.MAX_CONCURRENT})`);
    return;
  }
  console.log(`[PARALLEL] Can spawn up to ${maxTasksToSpawn} tasks (${availableSlots} slots, ${PARALLEL_CONFIG.MAX_PARALLEL_TASKS} max parallel)`);
  
  // Filter backlog by priority and budget mode
  let backlog = cards
    .filter(c => c.status === 'backlog')
    .filter(c => c.priority === 'critical' || c.priority === 'high' || c.priority === 'medium')
    .sort((a, b) => {
      const priorityOrder = { critical: 3, high: 2, medium: 1, low: 0 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  
  // If in critical-only mode, only process critical tasks
  if (budgetMode === 'critical-only') {
    backlog = backlog.filter(c => c.priority === 'critical');
    console.log(`[GUARD RAILS] Critical-only mode: ${backlog.length} critical tasks available`);
  }
  
  console.log(`[Orchestrator] Backlog (high/medium): ${backlog.length}`);
  
  if (backlog.length === 0) {
    console.log('✅ No priority work in backlog');
    return;
  }
  
  // Check daily budget (from cost_tracking)
  let dailyCost = 0;
  try {
    const Database = require('better-sqlite3');
    const db = new Database(DB_PATH);
    const today = new Date().toISOString().split('T')[0];
    const costToday = db.prepare('SELECT SUM(cost) as total FROM cost_tracking WHERE date = ?').get(today);
    dailyCost = costToday?.total || 0;
    db.close();
  } catch (err) {
    console.log('⚠️ Could not read cost database, using estimate');
    dailyCost = 2.5;
  }
  
  if (dailyCost > 7) {
    console.log(`⚠️ Daily budget exceeded ($${dailyCost.toFixed(2)}), skipping all tasks`);
    return;
  }
  
  console.log(`💰 Daily cost: $${dailyCost.toFixed(2)} / $10`);
  
  // === PARALLEL TASK SELECTION ===
  // Get existing decisions to avoid duplicates
  const existingDecisions = fs.readdirSync(DECISIONS_DIR);
  const usedAgents = new Set();
  const tasksToSpawn = [];
  
  for (const task of backlog) {
    if (tasksToSpawn.length >= maxTasksToSpawn) break;
    
    // Check if decision already exists
    const taskSlug = task.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const decisionExists = existingDecisions.some(d => 
      d.includes(task.id) || d.includes(taskSlug)
    );
    
    if (decisionExists) {
      console.log(`⚠️ Decision exists for ${task.id}, skipping`);
      continue;
    }
    
    // Route to agent
    const agent = routeTaskToAgent(task);
    
    // Don't assign same agent twice in one batch
    if (usedAgents.has(agent)) {
      console.log(`⚠️ Agent ${agent} already assigned in this batch, skipping ${task.id}`);
      continue;
    }
    
    tasksToSpawn.push({ task, agent });
    usedAgents.add(agent);
  }
  
  if (tasksToSpawn.length === 0) {
    console.log('✅ No eligible tasks to spawn (all have decisions or agent conflicts)');
    return;
  }
  
  console.log(`[PARALLEL] Spawning ${tasksToSpawn.length} tasks concurrently...`);
  
  // === PARALLEL EXECUTION ===
  const spawnPromises = tasksToSpawn.map(({ task, agent }) => {
    console.log(`🤖 Routing ${task.id} to ${agent}`);
    return spawnAgent(agent, task).then(() => ({ task, agent, success: true }))
      .catch(err => ({ task, agent, success: false, error: err }));
  });
  
  const results = await Promise.all(spawnPromises);
  
  // Update all cards at once
  let updatedCount = 0;
  results.forEach(result => {
    if (result.success) {
      const card = cards.find(c => c.id === result.task.id);
      if (card) {
        card.status = 'in-progress';
        card.assignedTo = result.agent;
        card.startedAt = new Date().toISOString();
        updatedCount++;
        console.log(`✅ Task ${result.task.id} assigned to ${result.agent}`);
      }
    } else {
      console.error(`❌ Failed to spawn ${result.task.id}: ${result.error.message}`);
    }
  });
  
  // Write back to file
  try {
    fs.writeFileSync(KANBAN_PATH, JSON.stringify(cards, null, 2));
    console.log(`✅ Updated ${updatedCount} cards to in-progress`);
  } catch (err) {
    console.error(`❌ Failed to update Kanban: ${err.message}`);
  }
}

function routeTaskToAgent(task) {
  // Simple routing based on task title/content
  const title = task.title.toLowerCase();
  const desc = task.description?.toLowerCase() || '';
  const words = title.split(/\s+/);
  
  // Technical work → Architect (CTO)
  if (title.includes('fix') || title.includes('bug') || title.includes('debug') ||
      title.includes('api') || title.includes('implement') || title.includes('code') ||
      title.includes('refactor') || title.includes('database') || title.includes('schema') ||
      title.includes('backend') || title.includes('frontend') || title.includes('sync') ||
      desc.includes('backend') || desc.includes('frontend') || desc.includes('database') ||
      desc.includes('api') || desc.includes('sync')) {
    return 'architect';
  }
  
  // Check for design-related keywords (as whole words or clear substrings)
  if (title.includes('design') || title.includes('figma') || 
      words.some(w => w === 'ui' || w === 'ux' || w.startsWith('ui/') || w.startsWith('ux/'))) {
    return 'petty';
  }
  
  // Route research tasks to Scout
  if (title.includes('research') || title.includes('analyze') || title.includes('compare') || 
      title.includes('survey') || title.includes('case study')) {
    return 'scout';
  }
  
  // Default to Megatron for coordination, general
  return 'megatron';
}

async function spawnAgent(agent, task) {
  // Report work start to progress tracker
  const phases = task.tasks.map(t => t.title);
  if (phases.length === 0) {
    phases.push('Execute task');
  }
  reportWorkStart(task.id, agent, task.title, phases);
  reportProgress(task.id, `Task assigned to ${agent}`, 'info');

  // Create task file for agent
  const taskFile = path.join(process.env.HOME, '.openclaw', 'shared-context', 'current-work.md');
  const taskContent = `# Current Work Assignment

**Agent:** ${agent}
**Task:** ${task.title}
**ID:** ${task.id}
**Assigned:** ${new Date().toISOString()}

## Description
${task.description}

## Deliverables
${task.tasks.map(t => `- [ ] ${t.title}`).join('\n')}

## ⚠️ CRITICAL: Proposal-First Workflow

**DO NOT start working immediately.**

### Step 1: Create Detailed Proposal (REQUIRED)

Before doing ANY work, create a comprehensive decision proposal at:
\`~/.openclaw/shared-context/decisions/decision-${task.id}.md\`

**Proposal must include (minimum 200 lines):**
- **Problem** (why this matters) - 2-3 paragraphs
- **Proposed solution** (detailed approach)
- **Deliverables** (specific file list)
- **Value/impact** (why approve this)
- **Alternatives considered** (3 options)
- **Cost breakdown** (table format)
- **Risk assessment** (what could go wrong)
- **Recommendation** (clear approve/defer/reject)

### Step 2: Wait for Approval

After saving proposal with status "🟡 Pending Approval":
- **Exit immediately**
- **Do NOT start work**
- Wait for Raleigh's approval

### Step 3: Execute After Approval

Only when decision status changes to "🟢 Approved":
- Read the approved decision
- Execute the work as planned
- Create deliverables
- Update decision status to "Completed"

## Output Location
Write all outputs to: ~/.openclaw/artifacts/outputs/${task.id}/
`;
  fs.writeFileSync(taskFile, taskContent);

  // Note: Actual spawn would use openclaw sessions_spawn
  // For now, agent checks this file on startup
  console.log(`📝 Task written to ${taskFile}`);
}

// Handle specific task types (for cron jobs)
async function handleSpecificTask(taskType) {
  if (taskType === 'weekly-memory-curation') {
    console.log('🧠 Running weekly memory curation...');
    
    // Create task for memory curation
    const task = {
      id: 'weekly-memory-curation',
      title: 'Weekly Memory Curation',
      description: 'Review daily_logs, extract patterns, update USER.md/PROJECTS.md, archive old logs',
      priority: 'medium',
      status: 'backlog',
      tasks: [
        { id: 'w1', title: 'Review daily_logs/ from past week', done: false },
        { id: 'w2', title: 'Extract patterns and learnings', done: false },
        { id: 'w3', title: 'Update USER.md with new preferences', done: false },
        { id: 'w4', title: 'Update PROJECTS.md with context', done: false },
        { id: 'w5', title: 'Create/update autonomous-work-patterns.md', done: false },
        { id: 'w6', title: 'Archive logs >30 days', done: false },
        { id: 'w7', title: 'Generate weekly summary', done: false }
      ]
    };
    
    await spawnAgent('megatron', task);
    console.log('✅ Weekly memory curation task assigned to Megatron');
    return;
  }
  
  // Default: run standard orchestration
  await orchestrate();
}

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const taskFlag = args.find(arg => arg.startsWith('--task='));
  
  if (taskFlag) {
    const taskType = taskFlag.split('=')[1];
    handleSpecificTask(taskType).catch(console.error);
  } else {
    orchestrate().catch(console.error);
  }
}

module.exports = {
  orchestrate,
  routeTaskToAgent,
  handleSpecificTask,
  reportWorkStart,
  reportPhaseComplete,
  reportProgress,
  reportWorkComplete,
  reportWorkFailed
};
