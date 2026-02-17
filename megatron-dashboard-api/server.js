const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const http = require('http');
const Router = express.Router;
const progressTracker = require('./progress-tracker');
const budgetTracker = require('./budget-tracker');
const DashboardWebSocket = require('./websocket-server');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure data directory exists
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize SQLite database
const db = new Database(path.join(DATA_DIR, 'dashboard.db'));

// Guard rails endpoint (v2 with data quality)
app.get('/api/guard-rails/status', async (req, res) => {
  try {
    // Get ground truth
    const groundTruth = db.prepare("SELECT total_ever, updated_at FROM cost_ground_truth WHERE id = 'moonshot'").get();
    const totalEver = groundTruth?.total_ever || 0;
    
    // Get first sync date for data quality assessment
    const firstSync = db.prepare(`SELECT MIN(timestamp) as ts FROM moonshot_usage_snapshots WHERE token_usage > 0`).get();
    const firstSyncDate = firstSync?.ts ? firstSync.ts.split('T')[0] : null;
    const hasTrueDailyData = firstSyncDate && 
      Math.floor((new Date() - new Date(firstSyncDate)) / (1000 * 60 * 60 * 24)) >= 1;
    
    // Get today's spend from cost_tracking (now has accurate daily breakdown)
    const todayStr = new Date().toISOString().split('T')[0];
    const todayCost = db.prepare(`SELECT cost FROM cost_tracking WHERE id = 'moonshot-${todayStr}'`).get();
    const spentToday = todayCost?.cost || 0;
    const todayDataQuality = todayCost ? 'REAL' : 'FAKE';
    
    // Get backlog count
    const kanbanPath = path.join(SHARED_CONTEXT_DIR, 'kanban', 'cards.json');
    let backlogCount = 0;
    let inProgressCount = 0;
    if (fs.existsSync(kanbanPath)) {
      const kanban = JSON.parse(fs.readFileSync(kanbanPath, 'utf8'));
      backlogCount = kanban.filter(c => c.status === 'backlog').length;
      inProgressCount = kanban.filter(c => c.status === 'in-progress').length;
    }
    
    // Get pending decisions count
    const decisionsDir = path.join(SHARED_CONTEXT_DIR, 'decisions');
    let pendingDecisions = 0;
    if (fs.existsSync(decisionsDir)) {
      const decisionFiles = fs.readdirSync(decisionsDir).filter(f => f.endsWith('.md'));
      for (const file of decisionFiles) {
        const content = fs.readFileSync(path.join(decisionsDir, file), 'utf8');
        if (content.includes('🟡') || content.match(/\*\*Status:\*\*.*pending/i)) {
          pendingDecisions++;
        }
      }
    }
    
    // Monthly budget (using total ever since we track from start)
    const monthlyLimit = 300;
    const monthlyRemaining = monthlyLimit - totalEver;
    
    res.json({
      budget: {
        current: monthlyRemaining,
        limit: monthlyLimit,
        spent: totalEver,
        minimum: 20,
        emergency: 10,
        status: monthlyRemaining > 50 ? 'safe' : monthlyRemaining > 20 ? 'warning' : 'critical',
        dataQuality: 'REAL'
      },
      backlog: {
        current: backlogCount,
        maximum: 30,
        status: backlogCount <= 30 ? 'ok' : 'exceeded'
      },
      concurrent: {
        current: inProgressCount,
        maximum: 15,
        status: inProgressCount < 15 ? 'ok' : 'at-limit'
      },
      dailySpend: {
        spent: spentToday,
        spentDisplay: spentToday !== null ? `$${spentToday.toFixed(2)}` : 'Fake Data',
        limit: 10,
        remaining: spentToday !== null ? 10 - spentToday : null,
        remainingDisplay: spentToday !== null ? `$${(10 - spentToday).toFixed(2)}` : 'Fake Data',
        status: spentToday !== null ? (spentToday < 10 ? 'ok' : 'exceeded') : 'unknown',
        dataQuality: todayDataQuality,
        note: hasTrueDailyData ? null : 'Tracking started today. True daily cost unavailable until tomorrow.'
      },
      pendingDecisions: {
        current: pendingDecisions,
        maximum: 10,
        status: pendingDecisions < 10 ? 'ok' : 'at-limit'
      },
      _meta: {
        firstSyncDate: firstSyncDate,
        dataQuality: hasTrueDailyData ? 'REAL' : 'PARTIAL'
      }
    });
  } catch (err) {
    console.error('[GuardRails] Error:', err.message);
    res.status(500).json({ error: 'Failed to get guard rail status', message: err.message });
  }
});

// Initialize schema
db.exec(`
  -- Projects table
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    priority TEXT DEFAULT 'warm',
    progress INTEGER DEFAULT 0,
    health TEXT DEFAULT 'good',
    startDate TEXT,
    targetDate TEXT,
    tasks TEXT DEFAULT '[]', -- JSON array of tasks
    lastUpdated TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Daily reports table
  CREATE TABLE IF NOT EXISTS daily_reports (
    id TEXT PRIMARY KEY,
    date TEXT UNIQUE NOT NULL,
    summary TEXT,
    cost REAL DEFAULT 0,
    tasksCompleted INTEGER DEFAULT 0,
    sessions TEXT, -- JSON array of sessions
    productivity INTEGER,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Kanban items table
  CREATE TABLE IF NOT EXISTS kanban_items (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'backlog',
    priority TEXT DEFAULT 'medium',
    projectId TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    completedAt TEXT
  );

  -- Insights table
  CREATE TABLE IF NOT EXISTS insights (
    id TEXT PRIMARY KEY,
    type TEXT DEFAULT 'pattern',
    title TEXT NOT NULL,
    description TEXT,
    date TEXT DEFAULT CURRENT_DATE,
    resolved BOOLEAN DEFAULT 0
  );

  -- Cost tracking table
  CREATE TABLE IF NOT EXISTS cost_tracking (
    id TEXT PRIMARY KEY,
    date TEXT DEFAULT CURRENT_DATE,
    sessionName TEXT,
    cost REAL DEFAULT 0,
    tokens INTEGER,
    model TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- API usage detail table
  CREATE TABLE IF NOT EXISTS api_usage_detail (
    id TEXT PRIMARY KEY,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    model TEXT,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    estimated_cost REAL DEFAULT 0,
    project_id TEXT,
    session_id TEXT,
    endpoint TEXT,
    duration_ms INTEGER
  );

  -- Budget settings table
  CREATE TABLE IF NOT EXISTS budget_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    monthly_budget REAL DEFAULT 100,
    alert_thresholds TEXT DEFAULT '[50, 75, 90]',
    email_alerts BOOLEAN DEFAULT 0,
    last_alert_threshold INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Insert default budget settings if not exists
  INSERT OR IGNORE INTO budget_settings (id) VALUES (1);

  -- Provider quota tracking table
  CREATE TABLE IF NOT EXISTS provider_quotas (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    tier TEXT DEFAULT 'default',
    requests_per_minute INTEGER DEFAULT 60,
    tokens_per_minute INTEGER DEFAULT 100000,
    requests_per_day INTEGER,
    monthly_budget_limit REAL,
    current_requests_used INTEGER DEFAULT 0,
    current_tokens_used INTEGER DEFAULT 0,
    requests_remaining INTEGER DEFAULT 60,
    tokens_remaining INTEGER DEFAULT 100000,
    reset_time TEXT,
    status TEXT DEFAULT 'healthy',
    last_updated TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Decisions/Proposals table for approval workflow
  CREATE TABLE IF NOT EXISTS decisions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'proposal',
    agent TEXT NOT NULL,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending',
    estimated_cost REAL DEFAULT 0,
    reasoning TEXT,
    context TEXT,
    attachments TEXT, -- JSON array of attachment objects
    submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
    decided_at TEXT,
    decided_by TEXT,
    outcome TEXT
  );
`);

// Add attachments column if it doesn't exist (migration)
try {
  db.exec(`ALTER TABLE decisions ADD COLUMN attachments TEXT`);
} catch (e) {
  // Column already exists
}

// Seed with initial data if empty
const projectCount = db.prepare('SELECT COUNT(*) as count FROM projects').get();
if (projectCount.count === 0) {
  const seedData = require('./seed.json');
  
  const insertProject = db.prepare(`
    INSERT INTO projects (id, name, description, status, priority, progress, health, startDate, targetDate, tasks)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  seedData.projects.forEach(p => {
    insertProject.run(p.id, p.name, p.description, p.status, p.priority, p.progress, p.health, p.startDate, p.targetDate, JSON.stringify(p.tasks || []));
  });
  
  const insertReport = db.prepare(`
    INSERT INTO daily_reports (id, date, summary, cost, tasksCompleted, sessions, productivity)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  seedData.reports.forEach(r => {
    insertReport.run(r.id, r.date, r.summary, r.cost, r.tasksCompleted, JSON.stringify(r.sessions || []), r.productivity);
  });
  
  console.log('✅ Database seeded with initial data');
}

// ===== PROJECTS API =====

// Get all projects
app.get('/api/projects', (req, res) => {
  const projects = db.prepare('SELECT * FROM projects ORDER BY lastUpdated DESC').all();
  projects.forEach(p => {
    if (p.tasks) {
      try { p.tasks = JSON.parse(p.tasks); } catch(e) { p.tasks = []; }
    } else {
      p.tasks = [];
    }
  });
  res.json(projects);
});

// Create project
app.post('/api/projects', (req, res) => {
  const { name, description, status, priority, progress, health, startDate, targetDate, tasks } = req.body;
  const id = uuidv4();
  
  const stmt = db.prepare(`
    INSERT INTO projects (id, name, description, status, priority, progress, health, startDate, targetDate, tasks)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(id, name, description, status || 'active', priority || 'warm', progress || 0, health || 'good', startDate, targetDate, JSON.stringify(tasks || []));
  
  res.json({ id, success: true });
});

// Update project
app.put('/api/projects/:id', (req, res) => {
  const { name, description, status, priority, progress, health, tasks } = req.body;
  
  const stmt = db.prepare(`
    UPDATE projects 
    SET name = ?, description = ?, status = ?, priority = ?, progress = ?, health = ?, tasks = ?, lastUpdated = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  
  stmt.run(name, description, status, priority, progress, health, JSON.stringify(tasks || []), req.params.id);
  res.json({ success: true });
});

// Delete project
app.delete('/api/projects/:id', (req, res) => {
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ===== DAILY REPORTS API =====

// Get all reports
app.get('/api/reports', (req, res) => {
  const reports = db.prepare('SELECT * FROM daily_reports ORDER BY date DESC').all();
  
  // Calculate monthly total from all reports
  const monthTotal = db.prepare(`
    SELECT SUM(cost) as total FROM daily_reports 
    WHERE date >= date('now', 'start of month')
  `).get();
  
  reports.forEach(r => {
    if (r.sessions) {
      try { r.sessions = JSON.parse(r.sessions); } catch(e) { r.sessions = []; }
    }
    // Add costSummary structure expected by frontend
    r.costSummary = {
      totalCost: r.cost || 0,
      monthlyTotal: monthTotal.total || 0
    };
  });
  res.json(reports);
});

// Get reports by date range
app.get('/api/reports/range', (req, res) => {
  const { start, end } = req.query;
  const reports = db.prepare(`
    SELECT * FROM daily_reports 
    WHERE date >= ? AND date <= ? 
    ORDER BY date ASC
  `).all(start, end);
  
  reports.forEach(r => {
    if (r.sessions) {
      try { r.sessions = JSON.parse(r.sessions); } catch(e) { r.sessions = []; }
    }
  });
  res.json(reports);
});

// Create report (called by agent after work)
app.post('/api/reports', (req, res) => {
  const { date, summary, cost, tasksCompleted, sessions, productivity } = req.body;
  const id = uuidv4();
  
  // Check if report exists for this date
  const existing = db.prepare('SELECT id FROM daily_reports WHERE date = ?').get(date);
  
  if (existing) {
    // Update existing
    const stmt = db.prepare(`
      UPDATE daily_reports 
      SET summary = ?, cost = cost + ?, tasksCompleted = tasksCompleted + ?, 
          sessions = ?, productivity = ?
      WHERE date = ?
    `);
    stmt.run(summary, cost || 0, tasksCompleted || 0, JSON.stringify(sessions || []), productivity, date);
    res.json({ id: existing.id, updated: true });
  } else {
    // Create new
    const stmt = db.prepare(`
      INSERT INTO daily_reports (id, date, summary, cost, tasksCompleted, sessions, productivity)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, date, summary, cost || 0, tasksCompleted || 0, JSON.stringify(sessions || []), productivity);
    res.json({ id, success: true });
  }
});

// ===== KANBAN API =====

app.get('/api/kanban', (req, res) => {
  const items = db.prepare('SELECT * FROM kanban_items ORDER BY createdAt DESC').all();
  res.json(items);
});

app.post('/api/kanban/items', (req, res) => {
  const { title, description, status, priority, projectId } = req.body;
  const id = uuidv4();
  
  const stmt = db.prepare(`
    INSERT INTO kanban_items (id, title, description, status, priority, projectId)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(id, title, description, status || 'backlog', priority || 'medium', projectId);
  res.json({ id, success: true });
});

app.put('/api/kanban/items/:id/move', (req, res) => {
  const { status } = req.body;
  const completedAt = status === 'completed' ? new Date().toISOString() : null;
  
  db.prepare('UPDATE kanban_items SET status = ?, completedAt = ? WHERE id = ?')
    .run(status, completedAt, req.params.id);
  
  res.json({ success: true });
});

// ===== INSIGHTS API =====

app.get('/api/insights', (req, res) => {
  const insights = db.prepare('SELECT * FROM insights ORDER BY date DESC').all();
  res.json(insights);
});

app.post('/api/insights', (req, res) => {
  const { type, title, description, date } = req.body;
  const id = uuidv4();
  
  const stmt = db.prepare(`
    INSERT INTO insights (id, type, title, description, date)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  stmt.run(id, type || 'pattern', title, description, date || new Date().toISOString().split('T')[0]);
  res.json({ id, success: true });
});

app.put('/api/insights/:id/resolve', (req, res) => {
  db.prepare('UPDATE insights SET resolved = 1 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ===== COST TRACKING API =====

app.get('/api/costs', (req, res) => {
  const costs = db.prepare('SELECT * FROM cost_tracking ORDER BY createdAt DESC').all();
  
  // Get summary stats
  const today = new Date().toISOString().split('T')[0];
  const todayCost = db.prepare('SELECT SUM(cost) as total FROM cost_tracking WHERE date = ?').get(today);
  const weekCost = db.prepare(`SELECT SUM(cost) as total FROM cost_tracking WHERE date >= date('now', '-7 days')`).get();
  const monthCost = db.prepare(`SELECT SUM(cost) as total FROM cost_tracking WHERE date >= date('now', '-30 days')`).get();
  
  res.json({
    entries: costs,
    summary: {
      today: todayCost.total || 0,
      thisWeek: weekCost.total || 0,
      thisMonth: monthCost.total || 0
    }
  });
});

app.post('/api/costs', (req, res) => {
  const { sessionName, cost, tokens, model } = req.body;
  
  // DEDUPLICATION: Check for existing entry in last 5 minutes with same session/cost
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const existing = db.prepare(`
    SELECT id FROM cost_tracking 
    WHERE sessionName = ? 
    AND cost = ?
    AND createdAt >= ?
  `).get(sessionName, cost || 0, fiveMinutesAgo);
  
  if (existing) {
    // Duplicate detected - return existing ID without inserting
    return res.json({ id: existing.id, duplicate: true, success: true });
  }
  
  // No duplicate found - insert new entry
  const id = uuidv4();
  const stmt = db.prepare(`
    INSERT INTO cost_tracking (id, sessionName, cost, tokens, model)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  stmt.run(id, sessionName, cost || 0, tokens, model);
  res.json({ id, success: true });
});

// ===== COST ANALYTICS API (Enhanced) =====

// Get detailed usage analytics
app.get('/api/analytics/usage', (req, res) => {
  const { period = '7d' } = req.query;
  const days = period === '24h' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 7;
  
  // Get usage by time buckets
  const usageByDay = db.prepare(`
    SELECT 
      date(timestamp) as date,
      SUM(input_tokens) as input_tokens,
      SUM(output_tokens) as output_tokens,
      SUM(total_tokens) as total_tokens,
      SUM(estimated_cost) as cost,
      COUNT(*) as calls
    FROM api_usage_detail
    WHERE timestamp >= datetime('now', '-${days} days')
    GROUP BY date(timestamp)
    ORDER BY date
  `).all();
  
  // Get usage by model
  const usageByModel = db.prepare(`
    SELECT 
      model,
      SUM(input_tokens) as input_tokens,
      SUM(output_tokens) as output_tokens,
      SUM(total_tokens) as total_tokens,
      SUM(estimated_cost) as cost,
      COUNT(*) as calls
    FROM api_usage_detail
    WHERE timestamp >= datetime('now', '-${days} days')
    GROUP BY model
  `).all();
  
  // Get usage by project
  const usageByProject = db.prepare(`
    SELECT 
      p.name as project_name,
      p.id as project_id,
      SUM(a.input_tokens) as input_tokens,
      SUM(a.output_tokens) as output_tokens,
      SUM(a.total_tokens) as total_tokens,
      SUM(a.estimated_cost) as cost,
      COUNT(*) as calls
    FROM api_usage_detail a
    LEFT JOIN projects p ON a.project_id = p.id
    WHERE a.timestamp >= datetime('now', '-${days} days')
    GROUP BY a.project_id
  `).all();
  
  // Get hourly distribution for heatmap
  const hourlyDistribution = db.prepare(`
    SELECT 
      CAST(strftime('%H', timestamp) AS INTEGER) as hour,
      COUNT(*) as calls,
      SUM(total_tokens) as tokens
    FROM api_usage_detail
    WHERE timestamp >= datetime('now', '-${days} days')
    GROUP BY hour
    ORDER BY hour
  `).all();
  
  // Get summary totals
  const totals = db.prepare(`
    SELECT 
      SUM(input_tokens) as total_input,
      SUM(output_tokens) as total_output,
      SUM(total_tokens) as total_tokens,
      SUM(estimated_cost) as total_cost,
      COUNT(*) as total_calls,
      AVG(estimated_cost) as avg_cost_per_call,
      AVG(total_tokens) as avg_tokens_per_call
    FROM api_usage_detail
    WHERE timestamp >= datetime('now', '-${days} days')
  `).get();
  
  res.json({
    period,
    summary: totals,
    byDay: usageByDay,
    byModel: usageByModel,
    byProject: usageByProject,
    hourlyDistribution
  });
});

// Get budget settings
app.get('/api/analytics/budget', (req, res) => {
  const budget = db.prepare('SELECT * FROM budget_settings WHERE id = 1').get();
  
  // Calculate current month usage
  const monthUsage = db.prepare(`
    SELECT SUM(estimated_cost) as spent,
           SUM(total_tokens) as tokens,
           COUNT(*) as calls
    FROM api_usage_detail
    WHERE timestamp >= date('now', 'start of month')
  `).get();
  
  // Calculate projected monthly cost based on current daily average
  const dailyAvg = db.prepare(`
    SELECT AVG(daily_cost) as avg_daily
    FROM (
      SELECT date(timestamp) as day, SUM(estimated_cost) as daily_cost
      FROM api_usage_detail
      WHERE timestamp >= date('now', 'start of month')
      GROUP BY day
    )
  `).get();
  
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const currentDay = new Date().getDate();
  const projectedMonthly = dailyAvg.avg_daily ? dailyAvg.avg_daily * daysInMonth : 0;
  
  // Calculate remaining days and required daily budget
  const remainingDays = daysInMonth - currentDay + 1;
  const remainingBudget = (budget.monthly_budget || 100) - (monthUsage.spent || 0);
  const requiredDaily = remainingDays > 0 ? remainingBudget / remainingDays : 0;
  
  // Check alert thresholds
  const percentageUsed = (monthUsage.spent / budget.monthly_budget) * 100;
  const thresholds = JSON.parse(budget.alert_thresholds || '[50, 75, 90]');
  const activeAlert = thresholds.find(t => percentageUsed >= t);
  
  res.json({
    budget: {
      monthly: budget.monthly_budget,
      thresholds: thresholds,
      alertsEnabled: budget.email_alerts
    },
    currentMonth: {
      spent: monthUsage.spent || 0,
      tokens: monthUsage.tokens || 0,
      calls: monthUsage.calls || 0,
      percentageUsed: percentageUsed.toFixed(1),
      remaining: remainingBudget.toFixed(2)
    },
    projection: {
      monthly: projectedMonthly.toFixed(2),
      dailyAverage: dailyAvg.avg_daily?.toFixed(2) || 0,
      requiredDaily: requiredDaily.toFixed(2),
      onTrack: projectedMonthly <= budget.monthly_budget
    },
    alerts: {
      currentThreshold: activeAlert || null,
      shouldAlert: !!activeAlert && activeAlert > (budget.last_alert_threshold || 0)
    }
  });
});

// Update budget settings
app.put('/api/analytics/budget', (req, res) => {
  const { monthlyBudget, thresholds, emailAlerts } = req.body;
  
  const stmt = db.prepare(`
    UPDATE budget_settings 
    SET monthly_budget = ?, 
        alert_thresholds = ?, 
        email_alerts = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `);
  
  stmt.run(
    monthlyBudget,
    JSON.stringify(thresholds || [50, 75, 90]),
    emailAlerts ? 1 : 0
  );
  
  res.json({ success: true });
});

// Record API usage (called by agent after each API call)
app.post('/api/analytics/usage', (req, res) => {
  const { model, inputTokens, outputTokens, projectId, sessionId, endpoint, durationMs } = req.body;
  const id = uuidv4();
  
  // Get model pricing
  const pricing = {
    'claude-opus-4-5': { input: 15.00, output: 75.00 },
    'claude-sonnet-4-5': { input: 3.00, output: 15.00 },
    'claude-haiku-4-5': { input: 0.25, output: 1.25 },
    'moonshot/kimi-k2-5': { input: 0.50, output: 1.50 },
    'moonshot/kimi-k2': { input: 0.30, output: 1.20 }
  };
  
  const modelPricing = pricing[model] || { input: 3.00, output: 15.00 };
  const totalTokens = (inputTokens || 0) + (outputTokens || 0);
  const cost = (inputTokens / 1000000 * modelPricing.input) + (outputTokens / 1000000 * modelPricing.output);
  
  const stmt = db.prepare(`
    INSERT INTO api_usage_detail 
    (id, model, input_tokens, output_tokens, total_tokens, estimated_cost, project_id, session_id, endpoint, duration_ms)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(id, model, inputTokens || 0, outputTokens || 0, totalTokens, cost.toFixed(6), projectId, sessionId, endpoint, durationMs);
  
  res.json({ id, cost: cost.toFixed(6), success: true });
});

// Export usage data to CSV format
app.get('/api/analytics/export', (req, res) => {
  const { startDate, endDate } = req.query;
  
  const data = db.prepare(`
    SELECT 
      timestamp,
      model,
      input_tokens,
      output_tokens,
      total_tokens,
      estimated_cost,
      project_id,
      session_id,
      endpoint
    FROM api_usage_detail
    WHERE timestamp >= ? AND timestamp <= ?
    ORDER BY timestamp DESC
  `).all(startDate || '1970-01-01', endDate || '2099-12-31');
  
  // Generate CSV
  const headers = ['Timestamp', 'Model', 'Input Tokens', 'Output Tokens', 'Total Tokens', 'Cost ($)', 'Project ID', 'Session ID', 'Endpoint'];
  const rows = data.map(d => [
    d.timestamp,
    d.model,
    d.input_tokens,
    d.output_tokens,
    d.total_tokens,
    d.estimated_cost,
    d.project_id,
    d.session_id,
    d.endpoint
  ]);
  
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=usage-export.csv');
  res.send(csv);
});

// Import quota capture module
const { getLatestQuotas } = require('./quota-capture');

// Receive quota data from OpenClaw (called after each API response)
app.post('/api/analytics/quotas/report', (req, res) => {
  const { provider, model, headers, timestamp } = req.body;
  
  if (!provider || !headers) {
    return res.status(400).json({ error: 'Missing provider or headers' });
  }
  
  try {
    const { extractQuotaInfo, storeQuotaSnapshot } = require('./quota-capture');
    const quotaInfo = extractQuotaInfo(provider, headers);
    
    if (quotaInfo) {
      storeQuotaSnapshot(quotaInfo, headers);
      res.json({ success: true, captured: true });
    } else {
      res.json({ success: true, captured: false, reason: 'No quota headers found' });
    }
  } catch (err) {
    console.error('Failed to store quota:', err);
    res.status(500).json({ error: 'Failed to store quota data' });
  }
});

// Get provider quota limits (real data only - no fallbacks)
app.get('/api/analytics/quotas', async (req, res) => {
  // Get real captured data only
  let realQuotas = [];
  try {
    realQuotas = getLatestQuotas();
  } catch (err) {
    console.error('Failed to get real quotas:', err);
  }
  
  // Filter to only fresh data (within 5 minutes)
  const freshQuotas = realQuotas.filter(q => {
    if (!q.lastUpdated) return false;
    const age = Date.now() - new Date(q.lastUpdated).getTime();
    return age < 5 * 60 * 1000; // 5 minutes
  });
  
  res.json(freshQuotas);
});

// ===== STATS API =====

app.get('/api/stats', (req, res) => {
  const projectCount = db.prepare('SELECT COUNT(*) as count FROM projects').get();
  const activeProjects = db.prepare("SELECT COUNT(*) as count FROM projects WHERE status = 'active'").get();
  const reportCount = db.prepare('SELECT COUNT(*) as count FROM daily_reports').get();
  const kanbanCount = db.prepare('SELECT COUNT(*) as count FROM kanban_items').get();
  
  const today = new Date().toISOString().split('T')[0];
  const todayTasks = db.prepare(`
    SELECT SUM(tasksCompleted) as total FROM daily_reports WHERE date = ?
  `).get(today);
  
  const todayCost = db.prepare('SELECT SUM(cost) as total FROM cost_tracking WHERE date = ?').get(today);
  
  res.json({
    projects: { total: projectCount.count, active: activeProjects.count },
    reports: reportCount.count,
    kanban: kanbanCount.count,
    today: {
      tasksCompleted: todayTasks.total || 0,
      cost: todayCost.total || 0
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ===== AGENT TEAM API ROUTES =====

// Paths to team memory files
const TEAM_MEMORY_DIR = path.join(__dirname, '..', 'team-memory');
const AGENTS_DIR = path.join(TEAM_MEMORY_DIR, 'agents');

// Get all agents from SQLite team_agents table + context files
app.get('/api/agents', (req, res) => {
  try {
    const dbAgents = db.prepare('SELECT * FROM team_agents ORDER BY name').all();
    
    const agents = dbAgents.map(agent => {
      const contextPath = path.join(AGENTS_DIR, agent.id, 'context.md');
      let context = null;
      
      if (fs.existsSync(contextPath)) {
        try {
          const contextContent = fs.readFileSync(contextPath, 'utf8');
          const statusMatch = contextContent.match(/\*\*Last Active:\*\*\s*(.+)/);
          const modeMatch = contextContent.match(/\*\*Mode:\*\*\s*(.+)/);
          
          context = {
            lastActive: statusMatch ? statusMatch[1].trim() : null,
            mode: modeMatch ? modeMatch[1].trim() : null,
            hasContext: true
          };
        } catch (e) {
          context = { hasContext: false };
        }
      }
      
      return { ...agent, context };
    });
    
    res.json(agents);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get agents' });
  }
});

// Get specific agent
app.get('/api/agents/:id', (req, res) => {
  try {
    const agent = db.prepare('SELECT * FROM team_agents WHERE id = ?').get(req.params.id);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    
    const contextPath = path.join(AGENTS_DIR, agent.id, 'context.md');
    const context = fs.existsSync(contextPath) ? fs.readFileSync(contextPath, 'utf8') : null;
    
    res.json({ ...agent, context });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get agent' });
  }
});

// Parse work-queue.md
function parseWorkQueue() {
  const queuePath = path.join(TEAM_MEMORY_DIR, 'work-queue.md');
  if (!fs.existsSync(queuePath)) return { tasks: [], budget: {} };
  
  const content = fs.readFileSync(queuePath, 'utf8');
  const tasks = [];
  
  const budgetMatch = content.match(/\*\*Spent Today:\*\*\s*\$(.+)/);
  const limitMatch = content.match(/\*\*Daily Budget:\*\*\s*\$(.+)/);
  
  const budget = {
    spent: budgetMatch ? parseFloat(budgetMatch[1]) : 0,
    limit: limitMatch ? parseFloat(limitMatch[1]) : 10
  };
  
  const taskRegex = /-\s*\[([ x~!])\]\s*\*\*Task ID:\*\*\s*(.+?)\n\s*\*\*Agent:\*\*\s*(.+?)\n\s*\*\*Priority:\*\*\s*(.+?)\n(?:(?!\n-|\n\n\n).)*?\*\*Description:\*\*\s*(.+?)(?=\n\n|\n-|$)/gs;
  
  let match;
  while ((match = taskRegex.exec(content)) !== null) {
    const statusMap = { ' ': 'pending', 'x': 'completed', '~': 'in-progress', '!': 'blocked' };
    tasks.push({
      id: match[2].trim(),
      agent: match[3].trim(),
      priority: match[4].trim().toLowerCase(),
      description: match[5].split('\n')[0].trim(),
      status: statusMap[match[1]] || 'pending'
    });
  }
  
  return { tasks, budget };
}

// Get work queue
app.get('/api/work-queue', (req, res) => {
  try {
    res.json(parseWorkQueue());
  } catch (err) {
    res.status(500).json({ error: 'Failed to parse work queue' });
  }
});

// Add task to work queue
app.post('/api/work-queue', (req, res) => {
  try {
    const { id, agent, priority, type, description, estimatedCost } = req.body;
    const queuePath = path.join(TEAM_MEMORY_DIR, 'work-queue.md');
    
    const content = fs.readFileSync(queuePath, 'utf8');
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    
    const newTask = `- [ ] **Task ID:** ${id}\n  **Agent:** ${agent}\n  **Priority:** ${priority || 'MEDIUM'}\n  **Type:** ${type || 'Task'}\n  **Description:** ${description}\n  **Estimated Cost:** $${estimatedCost || '0.02'}\n  **Queued:** ${now}\n\n`;
    
    const insertPoint = content.indexOf('## High Priority');
    if (insertPoint !== -1) {
      const nextSection = content.indexOf('##', insertPoint + 1);
      const insertIndex = nextSection !== -1 ? nextSection : content.length;
      const newContent = content.slice(0, insertIndex) + newTask + content.slice(insertIndex);
      fs.writeFileSync(queuePath, newContent);
    }
    
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add task' });
  }
});

// Get budget
app.get('/api/budget', (req, res) => {
  try {
    const budgetPath = path.join(TEAM_MEMORY_DIR, 'budget-tracker.md');
    if (!fs.existsSync(budgetPath)) {
      return res.json({ dailyLimit: 10, spentToday: 0, remaining: 10, status: 'healthy' });
    }
    
    const content = fs.readFileSync(budgetPath, 'utf8');
    const spentMatch = content.match(/\*\*Spent Today:\*\*\s*\$(.+)/);
    const remainingMatch = content.match(/\*\*Remaining:\*\*\s*\$(.+)/);
    
    res.json({
      dailyLimit: 10,
      spentToday: spentMatch ? parseFloat(spentMatch[1]) : 0,
      remaining: remainingMatch ? parseFloat(remainingMatch[1]) : 10,
      status: 'healthy'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get budget' });
  }
});

// ===== EXECUTIVE DASHBOARD API =====

// Get executive summary for CEO view
app.get('/api/executive/summary', (req, res) => {
  try {
    // System health check
    const health = {
      agents: 'healthy',
      cron: 'healthy', 
      api: 'healthy',
      budget: 'healthy',
      overall: 'healthy'
    };
    
    // Get agent status
    const agents = db.prepare('SELECT * FROM team_agents').all();
    const activeAgents = agents.filter(a => a.status === 'active').length;
    
    // Get today's work queue
    const queue = parseWorkQueue();
    const completedToday = queue.tasks.filter(t => t.status === 'completed').length;
    const pendingTasks = queue.tasks.filter(t => t.status === 'pending').length;
    const inProgress = queue.tasks.filter(t => t.status === 'in-progress').length;
    
    // Get budget status with proper daily calculation
    const groundTruth = db.prepare("SELECT total_ever FROM cost_ground_truth WHERE id = 'moonshot'").get();
    const totalEver = groundTruth?.total_ever || 0;
    
    // Get today's spend from cost_tracking (now has accurate daily breakdown)
    const todayStr = new Date().toISOString().split('T')[0];
    const todayCost = db.prepare(`SELECT cost FROM cost_tracking WHERE id = 'moonshot-${todayStr}'`).get();
    const spentToday = todayCost?.cost || 0;
    const todayDataQuality = todayCost ? 'REAL' : 'FAKE';
    
    const monthlyRemaining = 300 - totalEver;
    
    const budgetStatus = { 
      spent: spentToday, 
      spentDisplay: todayDataQuality === 'REAL' ? `$${spentToday.toFixed(2)}` : 'Fake Data',
      remaining: todayDataQuality === 'REAL' ? 10 - spentToday : null, 
      remainingDisplay: todayDataQuality === 'REAL' ? `$${(10 - spentToday).toFixed(2)}` : 'Fake Data',
      monthlySpent: totalEver,
      monthlyRemaining: monthlyRemaining,
      percentage: todayDataQuality === 'REAL' ? Math.min((spentToday / 10) * 100, 100) : 0,
      dataQuality: todayDataQuality,
      note: todayDataQuality === 'FAKE' ? 'Tracking started today. True daily cost unavailable until tomorrow.' : null
    };
    
    // Budget health (only if we have real data)
    if (todayDataQuality === 'REAL') {
      if (budgetStatus.percentage > 90) {
        health.budget = 'critical';
        health.overall = 'warning';
      } else if (budgetStatus.percentage > 75) {
        health.budget = 'warning';
      }
    }
    
    // Get project status
    const projects = db.prepare("SELECT * FROM projects WHERE status = 'active'").all();
    const projectCount = projects.length;
    
    // Check for alerts
    const alerts = [];
    if (todayDataQuality === 'REAL' && budgetStatus.percentage > 75) {
      alerts.push({
        type: 'warning',
        message: `Budget at ${budgetStatus.percentage.toFixed(0)}%`,
        action: 'Review spending'
      });
    }
    if (pendingTasks > 10) {
      alerts.push({
        type: 'info',
        message: `${pendingTasks} tasks pending`,
        action: 'Review queue'
      });
    }
    
    res.json({
      health,
      timestamp: new Date().toISOString(),
      metrics: {
        agents: {
          total: agents.length,
          active: activeAgents,
          working: inProgress
        },
        tasks: {
          completedToday,
          pending: pendingTasks,
          inProgress
        },
        budget: budgetStatus,
        projects: {
          active: projectCount
        }
      },
      alerts
    });
  } catch (err) {
    console.error('Executive summary error:', err);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// Get agent performance metrics
app.get('/api/executive/agents', (req, res) => {
  try {
    const agents = db.prepare('SELECT * FROM team_agents').all();
    
    const agentMetrics = agents.map(agent => {
      // Parse agent context for activity
      const contextPath = path.join(AGENTS_DIR, agent.id, 'context.md');
      let metrics = {
        tasksCompleted: 0,
        lastActive: null,
        currentTask: null,
        status: agent.status,
        isWorking: false
      };
      
      if (fs.existsSync(contextPath)) {
        const content = fs.readFileSync(contextPath, 'utf8');
        
        // Extract last active
        const lastActiveMatch = content.match(/\*\*Last Active:\*\*\s*(.+)/);
        if (lastActiveMatch) metrics.lastActive = lastActiveMatch[1].trim();
        
        // Extract current task
        const currentTaskMatch = content.match(/\*\*Current Task:\*\*\s*(.+)/);
        if (currentTaskMatch) {
          metrics.currentTask = currentTaskMatch[1].trim();
          metrics.isWorking = !metrics.currentTask.includes('complete');
        }
        
        // Count completed tasks from context
        const completedMatches = content.match(/completed/gi);
        if (completedMatches) {
          metrics.tasksCompleted = completedMatches.length;
        }
      }
      
      return {
        ...agent,
        ...metrics
      };
    });
    
    res.json(agentMetrics);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get agent metrics' });
  }
});

// Get proposals/decisions pending
app.get('/api/executive/proposals', (req, res) => {
  try {
    // FIRST: Try to read from shared-context/decisions/ (source of truth)
    const decisionsDir = path.join(SHARED_CONTEXT_DIR, 'decisions');
    if (fs.existsSync(decisionsDir)) {
      const decisionFiles = fs.readdirSync(decisionsDir).filter(f => f.endsWith('.md'));
      
      if (decisionFiles.length > 0) {
        const decisionsFromFiles = decisionFiles.map(file => {
          const content = fs.readFileSync(path.join(decisionsDir, file), 'utf8');
          
          // Parse decision from markdown
          const titleMatch = content.match(/# Decision:\s*(.+)/);
          const agentMatch = content.match(/\*\*Agent:\*\*\s*(.+)/);
          const statusMatch = content.match(/\*\*Status:\*\*\s*(.+)/);
          const dateMatch = content.match(/\*\*Date:\*\*\s*(.+)/);
          
          const status = statusMatch ? statusMatch[1].trim() : 'pending';
          const statusClean = status.replace(/[🟡🟢🔴✅]/g, '').trim().toLowerCase();
          
          return {
            id: file.replace('.md', ''),
            title: titleMatch ? titleMatch[1].trim() : file,
            agent: agentMatch ? agentMatch[1].trim() : 'Unknown',
            status: statusClean,
            date: dateMatch ? dateMatch[1].trim() : new Date().toISOString(),
            content: content,
            priority: content.includes('critical') ? 'critical' : 
                     content.includes('high') ? 'high' : 'medium'
          };
        });
        
        // Filter pending and format for frontend
        const pending = decisionsFromFiles.filter(d => d.status.includes('pending'));
        
        if (pending.length > 0) {
          const formatted = pending.map(d => {
            // Parse cost from decision
            const costMatch = d.content.match(/\*\*Cost:\*\*\s*\$?([0-9.]+)/);
            const cost = costMatch ? parseFloat(costMatch[1]) : 0;
            
            return {
              id: d.id,
              type: 'decision',
              title: d.title,
              agent: d.agent,
              priority: d.priority,
              status: d.status,
              estimatedCost: cost,
              content: d.content,  // FULL content for detail view
              reasoning: d.content.split('## Recommendation')[1]?.split('##')[0]?.trim() || 'Decision pending approval',
              attachments: [],
              actions: ['approve', 'reject', 'defer']
            };
          });
          
          return res.json(formatted);
        }
      }
    }
    
    // SECOND: Fall back to database
    const decisions = db.prepare(`
      SELECT * FROM decisions 
      WHERE status = 'pending'
      ORDER BY 
        CASE priority 
          WHEN 'critical' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
        END,
        submitted_at DESC
    `).all();
    
    // THIRD: Fall back to Kanban backlog (source of truth for new work)
    if (decisions.length === 0) {
      const kanbanPath = path.join(SHARED_CONTEXT_DIR, 'kanban', 'cards.json');
      if (fs.existsSync(kanbanPath)) {
        const kanban = JSON.parse(fs.readFileSync(kanbanPath, 'utf8'));
        const backlog = kanban
          .filter(c => c.status === 'backlog')
          .filter(c => c.priority === 'critical' || c.priority === 'high' || c.priority === 'medium')
          .sort((a, b) => {
            const priorityOrder = { critical: 3, high: 2, medium: 1, low: 0 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
          });
        
        const proposals = backlog.map(c => ({
          id: c.id,
          type: 'task',
          title: c.title,
          agent: c.assigned || 'megatron',
          priority: c.priority,
          estimatedCost: c.estimate?.cost || 0.02,
          reasoning: c.description || 'Task from Kanban backlog',
          actions: ['approve', 'reject', 'defer']
        }));
        
        return res.json(proposals);
      }
      
      // LAST RESORT: Fall back to work queue (deprecated)
      const queue = parseWorkQueue();
      const highPriority = queue.tasks.filter(t => t.priority === 'high' && t.status === 'pending');
      
      const proposals = highPriority.map(t => ({
        id: t.id,
        type: 'task',
        title: t.description,
        agent: t.agent,
        priority: t.priority,
        estimatedCost: 0.02,
        reasoning: 'High priority task requiring approval',
        actions: ['approve', 'reject', 'defer']
      }));
      
      return res.json(proposals);
    }
    
    // Format decisions for frontend
    const formatted = decisions.map(d => {
      // Hardcode attachments for Hyperfunded decision if not in DB
      let attachments = [];
      if (d.attachments) {
        try {
          attachments = JSON.parse(d.attachments);
        } catch (e) {
          attachments = [];
        }
      }
      
      // Fallback: if this is the Hyperfunded decision and no attachments, add them
      if (attachments.length === 0 && d.title?.includes('Hyperfunded')) {
        attachments = [
          {
            filename: 'hyperfunded-strategy-2026-02-11.md',
            path: 'shared-context/agent-outputs/petty/hyperfunded-strategy-2026-02-11.md',
            type: 'Design Strategy',
            size: '10KB',
            agent: 'Petty'
          },
          {
            filename: 'hyperfunded-hifi-design-2026-02-11.md',
            path: 'shared-context/agent-outputs/petty/hyperfunded-hifi-design-2026-02-11.md',
            type: 'High-Fidelity Design',
            size: '10.8KB',
            agent: 'Petty'
          }
        ];
      }
      
      return {
        id: d.id,
        type: d.type,
        title: d.title,
        description: d.description,
        agent: d.agent,
        priority: d.priority,
        estimatedCost: d.estimated_cost,
        reasoning: d.reasoning,
        context: d.context,
        submittedAt: d.submitted_at,
        actions: ['approve', 'reject', 'defer'],
        attachments
      };
    });
    
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get proposals' });
  }
});

// Create a new decision
app.post('/api/decisions', (req, res) => {
  try {
    const { title, description, type, agent, priority, estimatedCost, reasoning, context } = req.body;
    const id = uuidv4();
    
    const stmt = db.prepare(`
      INSERT INTO decisions (id, title, description, type, agent, priority, estimated_cost, reasoning, context)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, title, description, type || 'proposal', agent, priority || 'medium', 
             estimatedCost || 0, reasoning, context);
    
    res.json({ id, success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create decision' });
  }
});

// Update decision status (approve/reject/defer)
app.put('/api/decisions/:id', (req, res) => {
  try {
    const { status, decidedBy, feedback } = req.body;
    const decidedAt = new Date().toISOString();
    
    // FIRST: Update the decision file in shared-context/decisions/ (source of truth)
    const decisionsDir = path.join(SHARED_CONTEXT_DIR, 'decisions');
    const decisionFile = path.join(decisionsDir, `${req.params.id}.md`);
    
    // Extract agent name from decision file if it exists
    let agentName = 'unknown';
    let decisionTitle = req.params.id;
    
    if (fs.existsSync(decisionFile)) {
      let content = fs.readFileSync(decisionFile, 'utf8');
      
      // Extract agent name
      const agentMatch = content.match(/\*\*Agent:\*\*\s*(.+)/);
      if (agentMatch) agentName = agentMatch[1].trim().toLowerCase();
      
      // Extract decision title
      const titleMatch = content.match(/# Decision:\s*(.+)/);
      if (titleMatch) decisionTitle = titleMatch[1].trim();
      
      // Update status line
      const statusEmoji = status === 'approved' ? '🟢' : status === 'rejected' ? '🔴' : '🟡';
      content = content.replace(
        /\*\*Status:\*\*\s*.+/,
        `**Status:** ${statusEmoji} ${status.charAt(0).toUpperCase() + status.slice(1)}`
      );
      
      // Add decision notes section if not exists
      if (!content.includes('## Decision Notes')) {
        content += `\n\n---\n\n## Decision Notes\n\n**Decided By:** ${decidedBy || 'user'}\n**Decided At:** ${decidedAt}\n\n*Raleigh to fill in after review*\n`;
      } else {
        // Update existing decision notes
        content = content.replace(
          /\*\*Decided By:\*\*\s*.+/,
          `**Decided By:** ${decidedBy || 'user'}`
        );
        content = content.replace(
          /\*\*Decided At:\*\*\s*.+/,
          `**Decided At:** ${decidedAt}`
        );
      }
      
      // Add feedback to decision notes if provided
      if (feedback && feedback.trim()) {
        if (!content.includes('**Feedback:**')) {
          content += `\n**Feedback:** ${feedback}\n`;
        } else {
          content = content.replace(
            /\*\*Feedback:\*\*\s*.+/,
            `**Feedback:** ${feedback}`
          );
        }
      }
      
      fs.writeFileSync(decisionFile, content);
    }
    
    // FEEDBACK LEARNING: Write feedback to agent-specific directory when rejected
    if (status === 'rejected' && feedback && feedback.trim()) {
      const agentFeedbackDir = path.join(SHARED_CONTEXT_DIR, 'team', 'feedback', agentName);
      
      // Ensure agent feedback directory exists
      if (!fs.existsSync(agentFeedbackDir)) {
        fs.mkdirSync(agentFeedbackDir, { recursive: true });
      }
      
      // Write feedback to agent-specific file
      const feedbackFile = path.join(agentFeedbackDir, `${req.params.id}.md`);
      const feedbackContent = `# Feedback: ${decisionTitle}

**Decision ID:** ${req.params.id}
**Agent:** ${agentName}
**Status:** Rejected
**Reviewer:** ${decidedBy || 'user'}
**Date:** ${decidedAt}

## Feedback

${feedback}

## Learning Points

1. Read the rejection reason carefully
2. Identify the lesson/pattern
3. Update SOUL.md to prevent repeat
4. Post to team/lessons-learned.md
5. Thank the reviewer for feedback

---
*Auto-generated by feedback learning system*
`;
      fs.writeFileSync(feedbackFile, feedbackContent);
      
      // Append to team lessons-learned.md
      const lessonsFile = path.join(SHARED_CONTEXT_DIR, 'team', 'lessons-learned.md');
      const lessonsDir = path.dirname(lessonsFile);
      
      if (!fs.existsSync(lessonsDir)) {
        fs.mkdirSync(lessonsDir, { recursive: true });
      }
      
      // Create header if file doesn't exist
      if (!fs.existsSync(lessonsFile)) {
        fs.writeFileSync(lessonsFile, '# Lessons Learned\n\nTeam knowledge base for continuous improvement.\n\n---\n\n');
      }
      
      // Generate lesson entry ID based on date
      const today = new Date().toISOString().split('T')[0];
      const lessonEntry = `## ${today}: ${decisionTitle.substring(0, 50)}${decisionTitle.length > 50 ? '...' : ''}

**Agent:** ${agentName.charAt(0).toUpperCase() + agentName.slice(1)}
**Decision:** ${decisionTitle}
**Feedback:** "${feedback.substring(0, 200)}${feedback.length > 200 ? '...' : ''}"
**Lesson:** *To be filled by agent after analysis*
**Action:** *To be updated by agent*
**Impact:** *To be documented by team*

---

`;
      fs.appendFileSync(lessonsFile, lessonEntry);
      
      console.log(`[Feedback Learning] Recorded rejection feedback for ${agentName}: ${req.params.id}`);
    }
    
    // SECOND: Also update database (for backwards compatibility)
    try {
      const stmt = db.prepare(`
        UPDATE decisions 
        SET status = ?, outcome = ?, decided_at = ?, decided_by = ?
        WHERE id = ?
      `);
      stmt.run(status, status, decidedAt, decidedBy || 'user', req.params.id);
    } catch (dbErr) {
      // Database might not have this decision - that's OK, file is source of truth
      console.log('DB update skipped (decision may not exist in DB):', dbErr.message);
    }
    
    // THIRD: Write to shared context feedback log
    const decision = fs.existsSync(decisionFile) 
      ? { title: req.params.id, agent: 'unknown' }
      : db.prepare('SELECT * FROM decisions WHERE id = ?').get(req.params.id);
      
    if (decision) {
      const feedbackDir = path.join(SHARED_CONTEXT_DIR, 'feedback');
      if (!fs.existsSync(feedbackDir)) {
        fs.mkdirSync(feedbackDir, { recursive: true });
      }
      const feedbackFile = path.join(feedbackDir, 'decision-log.md');
      const feedbackEntry = `## ${new Date().toISOString().split('T')[0]} - ${status.toUpperCase()}

### ${decision.title}

**Status:** ${status}
**Agent:** ${decision.agent || 'unknown'}
**Decided By:** ${decidedBy || 'user'}
**Decided At:** ${decidedAt}

---

`;
      fs.appendFileSync(feedbackFile, feedbackEntry);
    }
    
    // FOURTH: Update Kanban card if decision is approved
    if (status === 'approved') {
      try {
        const kanbanPath = path.join(SHARED_CONTEXT_DIR, 'kanban', 'cards.json');
        if (fs.existsSync(kanbanPath)) {
          const cards = JSON.parse(fs.readFileSync(kanbanPath, 'utf8'));
          
          // Find matching card by title (fuzzy match)
          const decisionTitle = req.params.id.replace(/-/g, ' ').toLowerCase();
          const card = cards.find(c => {
            const cardTitle = c.title.toLowerCase();
            // Match if decision ID or title contains card title or vice versa
            return decisionTitle.includes(cardTitle) || 
                   cardTitle.includes(decisionTitle) ||
                   decisionTitle.replace(/decision /g, '').includes(cardTitle) ||
                   req.params.id.toLowerCase().includes(c.id?.toLowerCase() || '');
          });
          
          if (card) {
            card.status = 'completed';
            card.completedAt = decidedAt;
            card.progress = 100;
            if (card.tasks) {
              card.tasks.forEach(t => t.done = true);
            }
            fs.writeFileSync(kanbanPath, JSON.stringify(cards, null, 2));
            console.log(`[API] Kanban card updated to completed: ${card.title}`);
          } else {
            console.log(`[API] No matching Kanban card found for decision: ${req.params.id}`);
          }
        }
      } catch (kanbanErr) {
        console.error('[API] Failed to update Kanban card:', kanbanErr.message);
        // Don't fail the request if Kanban update fails
      }
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to update decision:', err);
    res.status(500).json({ error: 'Failed to update decision' });
  }
});

// Get all decisions
app.get('/api/decisions', (req, res) => {
  try {
    // FIRST: Try to read from shared-context/decisions/ (source of truth)
    const decisionsDir = path.join(SHARED_CONTEXT_DIR, 'decisions');
    if (fs.existsSync(decisionsDir)) {
      const decisionFiles = fs.readdirSync(decisionsDir).filter(f => f.endsWith('.md'));
      
      if (decisionFiles.length > 0) {
        const decisionsFromFiles = decisionFiles.map(file => {
          const content = fs.readFileSync(path.join(decisionsDir, file), 'utf8');
          
          // Parse decision from markdown
          const titleMatch = content.match(/# Decision:\s*(.+)/);
          const agentMatch = content.match(/\*\*Agent:\*\*\s*(.+)/);
          const statusMatch = content.match(/\*\*Status:\*\*\s*(.+)/);
          const dateMatch = content.match(/\*\*Date:\*\*\s*(.+)/);
          
          const status = statusMatch ? statusMatch[1].trim() : 'pending';
          const statusClean = status.replace(/[🟡🟢🔴✅]/g, '').trim().toLowerCase();
          
          return {
            id: file.replace('.md', ''),
            title: titleMatch ? titleMatch[1].trim() : file,
            agent: agentMatch ? agentMatch[1].trim() : 'Unknown',
            status: statusClean,
            date: dateMatch ? dateMatch[1].trim() : new Date().toISOString(),
            priority: content.includes('critical') ? 'critical' : 
                     content.includes('high') ? 'high' : 'medium',
            content: content
          };
        });
        
        // Sort by priority and date
        const priorityOrder = { critical: 1, high: 2, medium: 3, low: 4 };
        decisionsFromFiles.sort((a, b) => {
          const priorityDiff = (priorityOrder[a.priority] || 5) - (priorityOrder[b.priority] || 5);
          if (priorityDiff !== 0) return priorityDiff;
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
        
        return res.json(decisionsFromFiles);
      }
    }
    
    // SECOND: Fall back to database
    const decisions = db.prepare(`
      SELECT * FROM decisions 
      ORDER BY 
        CASE priority 
          WHEN 'critical' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
        END,
        submitted_at DESC
    `).all();
    res.json(decisions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch decisions' });
  }
});

// Get single decision
app.get('/api/decisions/:id', (req, res) => {
  try {
    // FIRST: Try to read from file
    const decisionsDir = path.join(SHARED_CONTEXT_DIR, 'decisions');
    const decisionFile = path.join(decisionsDir, `${req.params.id}.md`);
    
    if (fs.existsSync(decisionFile)) {
      const content = fs.readFileSync(decisionFile, 'utf8');
      
      const titleMatch = content.match(/# Decision:\s*(.+)/);
      const agentMatch = content.match(/\*\*Agent:\*\*\s*(.+)/);
      const statusMatch = content.match(/\*\*Status:\*\*\s*(.+)/);
      const dateMatch = content.match(/\*\*Date:\*\*\s*(.+)/);
      
      const status = statusMatch ? statusMatch[1].trim() : 'pending';
      const statusClean = status.replace(/[🟡🟢🔴✅]/g, '').trim().toLowerCase();
      
      return res.json({
        id: req.params.id,
        title: titleMatch ? titleMatch[1].trim() : req.params.id,
        agent: agentMatch ? agentMatch[1].trim() : 'Unknown',
        status: statusClean,
        date: dateMatch ? dateMatch[1].trim() : new Date().toISOString(),
        priority: content.includes('critical') ? 'critical' : 
                 content.includes('high') ? 'high' : 'medium',
        content: content
      });
    }
    
    // SECOND: Fall back to database
    const decision = db.prepare('SELECT * FROM decisions WHERE id = ?').get(req.params.id);
    if (!decision) {
      return res.status(404).json({ error: 'Decision not found' });
    }
    res.json(decision);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch decision' });
  }
});

// Get decision stats
app.get('/api/decisions/stats', (req, res) => {
  try {
    const total = db.prepare("SELECT COUNT(*) as count FROM decisions").get();
    const pending = db.prepare("SELECT COUNT(*) as count FROM decisions WHERE status = 'pending'").get();
    const approved = db.prepare("SELECT COUNT(*) as count FROM decisions WHERE status = 'approved'").get();
    const rejected = db.prepare("SELECT COUNT(*) as count FROM decisions WHERE status = 'rejected'").get();
    
    const byPriority = db.prepare(`
      SELECT priority, COUNT(*) as count 
      FROM decisions 
      WHERE status = 'pending'
      GROUP BY priority
    `).all();
    
    res.json({
      total: total.count,
      pending: pending.count,
      approved: approved.count,
      rejected: rejected.count,
      byPriority
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Get project health overview
app.get('/api/executive/projects', (req, res) => {
  try {
    const projects = db.prepare(`
      SELECT p.*, 
        (SELECT COUNT(*) FROM kanban_items WHERE projectId = p.id AND status != 'completed') as pendingTasks,
        (SELECT COUNT(*) FROM kanban_items WHERE projectId = p.id AND status = 'completed') as completedTasks
      FROM projects p
      ORDER BY 
        CASE priority 
          WHEN 'hot' THEN 1 
          WHEN 'warm' THEN 2 
          WHEN 'cold' THEN 3 
        END,
        lastUpdated DESC
    `).all();
    
    projects.forEach(p => {
      if (p.tasks) {
        try { p.tasks = JSON.parse(p.tasks); } catch(e) { p.tasks = []; }
      }
    });
    
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get projects' });
  }
});

// Get cost intelligence
app.get('/api/executive/costs', (req, res) => {
  try {
    // Daily trend (last 7 days)
    const dailyTrend = db.prepare(`
      SELECT date, SUM(cost) as total
      FROM cost_tracking
      WHERE date >= date('now', '-7 days')
      GROUP BY date
      ORDER BY date ASC
    `).all();
    
    // Cost by agent
    const byAgent = db.prepare(`
      SELECT sessionName as agent, SUM(cost) as total, COUNT(*) as tasks
      FROM cost_tracking
      WHERE date >= date('now', '-30 days')
      GROUP BY sessionName
    `).all();
    
    // Today's cost
    const today = new Date().toISOString().split('T')[0];
    const todayCost = db.prepare('SELECT SUM(cost) as total FROM cost_tracking WHERE date = ?').get(today);
    
    // Calculate efficiency
    const efficiency = byAgent.map(a => ({
      agent: a.agent,
      totalCost: a.total,
      tasksCompleted: a.tasks,
      costPerTask: a.tasks > 0 ? a.total / a.tasks : 0
    }));
    
    res.json({
      today: todayCost?.total || 0,
      dailyTrend,
      byAgent: efficiency,
      budget: {
        limit: 10,
        remaining: 10 - (todayCost?.total || 0)
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get cost data' });
  }
});

// Get system health status
app.get('/api/executive/system', (req, res) => {
  try {
    const status = {
      cron: {
        status: 'unknown',
        lastRun: null,
        nextRun: null
      },
      api: {
        status: 'healthy',
        uptime: process.uptime()
      },
      database: {
        status: 'healthy',
        size: fs.existsSync(path.join(DATA_DIR, 'dashboard.db')) 
          ? fs.statSync(path.join(DATA_DIR, 'dashboard.db')).size 
          : 0
      },
      lastSync: null
    };
    
    // Check if we can read from files
    const queueReadable = fs.existsSync(path.join(TEAM_MEMORY_DIR, 'work-queue.md'));
    const budgetReadable = fs.existsSync(path.join(TEAM_MEMORY_DIR, 'budget-tracker.md'));
    
    status.fileSystem = {
      workQueue: queueReadable ? 'accessible' : 'error',
      budget: budgetReadable ? 'accessible' : 'error'
    };
    
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get system status' });
  }
});

// ===== SHARED CONTEXT API =====

const SHARED_CONTEXT_DIR = path.join(process.env.HOME || '/Users/openclaw-megatron', '.openclaw', 'shared-context');

// Helper to read agent outputs
function readAgentOutputs() {
  const outputs = [];
  const agents = ['megatron', 'petty', 'scout', 'architect', 'product'];
  
  agents.forEach(agent => {
    const agentDir = path.join(SHARED_CONTEXT_DIR, 'agent-outputs', agent);
    if (fs.existsSync(agentDir)) {
      const files = fs.readdirSync(agentDir).filter(f => f.endsWith('.md'));
      files.forEach(file => {
        const filePath = path.join(agentDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const titleMatch = content.match(/^#\s+(.+)/);
        const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/);
        const stats = fs.statSync(filePath);
        const sizeInKB = (stats.size / 1024).toFixed(1);
        
        // Determine type from content or filename
        let type = 'Document';
        if (file.toLowerCase().includes('strategy')) type = 'Design Strategy';
        else if (file.toLowerCase().includes('design')) type = 'Design Document';
        else if (file.toLowerCase().includes('hifi') || file.toLowerCase().includes('spec')) type = 'High-Fidelity Design';
        else if (file.toLowerCase().includes('config')) type = 'Configuration';
        else if (file.toLowerCase().includes('status')) type = 'Status Update';
        
        // Get first paragraph as preview
        const lines = content.split('\n');
        let preview = '';
        for (const line of lines) {
          if (line.trim() && !line.startsWith('#') && !line.startsWith('---')) {
            preview = line.trim().substring(0, 150);
            if (preview.length === 150) preview += '...';
            break;
          }
        }
        
        outputs.push({
          filename: file,
          agent: agent.charAt(0).toUpperCase() + agent.slice(1),
          type,
          size: `${sizeInKB}KB`,
          date: dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0],
          preview: preview || titleMatch ? titleMatch[1] : 'No preview available',
          fullPath: `shared-context/agent-outputs/${agent}/${file}`,
          title: titleMatch ? titleMatch[1] : file
        });
      });
    }
  });
  
  return outputs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

// Helper to read daily synthesis
function readDailySynthesis() {
  const synthesisDir = path.join(SHARED_CONTEXT_DIR, 'daily-synthesis');
  if (!fs.existsSync(synthesisDir)) return [];
  
  const files = fs.readdirSync(synthesisDir).filter(f => f.endsWith('.md'));
  return files.map(file => {
    const content = fs.readFileSync(path.join(synthesisDir, file), 'utf8');
    const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/);
    return {
      date: dateMatch ? dateMatch[1] : file.replace('.md', ''),
      file,
      content
    };
  }).sort((a, b) => b.date.localeCompare(a.date));
}

// Get shared context status
app.get('/api/shared-context/status', (req, res) => {
  try {
    const status = {
      accessible: fs.existsSync(SHARED_CONTEXT_DIR),
      lastUpdated: null,
      files: {}
    };
    
    if (status.accessible) {
      // Check priorities
      const prioritiesPath = path.join(SHARED_CONTEXT_DIR, 'priorities.md');
      if (fs.existsSync(prioritiesPath)) {
        const stats = fs.statSync(prioritiesPath);
        status.files.priorities = {
          exists: true,
          lastModified: stats.mtime
        };
        status.lastUpdated = stats.mtime;
      }
      
      // Count agent outputs
      const agents = ['megatron', 'petty', 'scout', 'architect', 'product'];
      status.files.agentOutputs = {};
      agents.forEach(agent => {
        const agentDir = path.join(SHARED_CONTEXT_DIR, 'agent-outputs', agent);
        if (fs.existsSync(agentDir)) {
          const count = fs.readdirSync(agentDir).filter(f => f.endsWith('.md')).length;
          status.files.agentOutputs[agent] = count;
        } else {
          status.files.agentOutputs[agent] = 0;
        }
      });
      
      // Count synthesis files
      const synthesisDir = path.join(SHARED_CONTEXT_DIR, 'daily-synthesis');
      if (fs.existsSync(synthesisDir)) {
        status.files.synthesis = fs.readdirSync(synthesisDir).filter(f => f.endsWith('.md')).length;
      }
    }
    
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read shared context' });
  }
});

// Get agent outputs
app.get('/api/shared-context/outputs', (req, res) => {
  try {
    const outputs = readAgentOutputs();
    res.json({ outputs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read agent outputs' });
  }
});

// Get specific file content
app.get('/api/shared-context/file', (req, res) => {
  try {
    const filePath = req.query.path;
    if (!filePath) {
      return res.status(400).json({ error: 'Path parameter required' });
    }
    
    // Security: only allow reading from shared-context directory
    const fullPath = path.join(process.env.HOME || '/Users/openclaw-megatron', '.openclaw', filePath);
    if (!fullPath.includes('shared-context')) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const content = fs.readFileSync(fullPath, 'utf8');
    res.json({ content, path: filePath });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read file' });
  }
});

// Get daily synthesis/reports
app.get('/api/shared-context/synthesis', (req, res) => {
  try {
    const synthesis = readDailySynthesis();
    res.json(synthesis);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read synthesis' });
  }
});

// Get priorities
app.get('/api/shared-context/priorities', (req, res) => {
  try {
    const prioritiesPath = path.join(SHARED_CONTEXT_DIR, 'priorities.md');
    if (!fs.existsSync(prioritiesPath)) {
      return res.status(404).json({ error: 'Priorities not found' });
    }
    
    const content = fs.readFileSync(prioritiesPath, 'utf8');
    res.json({ content, lastModified: fs.statSync(prioritiesPath).mtime });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read priorities' });
  }
});

// Get project status
app.get('/api/shared-context/project-status', (req, res) => {
  try {
    const statusPath = path.join(SHARED_CONTEXT_DIR, 'project-status', 'current-work.md');
    if (!fs.existsSync(statusPath)) {
      return res.status(404).json({ error: 'Project status not found' });
    }
    
    const content = fs.readFileSync(statusPath, 'utf8');
    res.json({ content, lastModified: fs.statSync(statusPath).mtime });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read project status' });
  }
});

// Get feedback/decisions
app.get('/api/shared-context/feedback', (req, res) => {
  try {
    const feedbackDir = path.join(SHARED_CONTEXT_DIR, 'feedback');
    if (!fs.existsSync(feedbackDir)) {
      return res.json([]);
    }
    
    const files = fs.readdirSync(feedbackDir).filter(f => f.endsWith('.md'));
    const feedback = files.map(file => {
      const content = fs.readFileSync(path.join(feedbackDir, file), 'utf8');
      return { file, content };
    });
    
    res.json(feedback);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read feedback' });
  }
});

// Get kanban cards
app.get('/api/kanban/cards', (req, res) => {
  try {
    const cardsPath = path.join(SHARED_CONTEXT_DIR, 'kanban', 'cards.json');
    if (!fs.existsSync(cardsPath)) {
      return res.json({ cards: [] });
    }
    
    const data = JSON.parse(fs.readFileSync(cardsPath, 'utf8'));
    
    // Add cache-busting headers
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Wrap array in object if needed (frontend expects {cards: [...]})
    if (Array.isArray(data)) {
      res.json({ cards: data });
    } else {
      res.json(data);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to read kanban cards', cards: [] });
  }
});

// Update kanban card
app.put('/api/kanban/cards/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const cardsPath = path.join(SHARED_CONTEXT_DIR, 'kanban', 'cards.json');
    if (!fs.existsSync(cardsPath)) {
      return res.status(404).json({ error: 'Cards file not found' });
    }
    
    const data = JSON.parse(fs.readFileSync(cardsPath, 'utf8'));
    const cardIndex = data.cards.findIndex((c) => c.id === id);
    
    if (cardIndex === -1) {
      return res.status(404).json({ error: 'Card not found' });
    }
    
    // Update card
    data.cards[cardIndex] = {
      ...data.cards[cardIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(cardsPath, JSON.stringify(data, null, 2));
    res.json({ success: true, card: data.cards[cardIndex] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update kanban card' });
  }
});

// ===== PROGRESS TRACKER API =====

// Get all active work
app.get('/api/progress/active', (req, res) => {
  try {
    const activeWork = progressTracker.getActiveWork();
    res.json({ work: activeWork, count: activeWork.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get active work' });
  }
});

// Get work history
app.get('/api/progress/history', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const history = progressTracker.getWorkHistory(limit);
    res.json({ work: history, count: history.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get work history' });
  }
});

// Get specific work item
app.get('/api/progress/:id', (req, res) => {
  try {
    const work = progressTracker.getWorkById(req.params.id);
    if (!work) {
      return res.status(404).json({ error: 'Work not found' });
    }
    res.json(work);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get work item' });
  }
});

// Start new work (for testing/internal use)
app.post('/api/progress', (req, res) => {
  try {
    const { workId, agent, title, estimatedDuration, phases } = req.body;
    if (!workId || !agent || !title || !phases) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const work = progressTracker.startWork(workId, agent, title, estimatedDuration, phases);
    res.json({ success: true, work });
  } catch (err) {
    res.status(500).json({ error: 'Failed to start work' });
  }
});

// Update phase (for testing/internal use)
app.post('/api/progress/:id/phase', (req, res) => {
  try {
    const { phaseIndex, status, details } = req.body;
    progressTracker.updatePhase(req.params.id, phaseIndex, status, details);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update phase' });
  }
});

// Add log (for testing/internal use)
app.post('/api/progress/:id/log', (req, res) => {
  try {
    const { message, level } = req.body;
    progressTracker.logProgress(req.params.id, message, level);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add log' });
  }
});

// Complete work (for testing/internal use)
app.post('/api/progress/:id/complete', (req, res) => {
  try {
    const { result } = req.body;
    const work = progressTracker.completeWork(req.params.id, result);
    res.json({ success: true, work });
  } catch (err) {
    res.status(500).json({ error: 'Failed to complete work' });
  }
});

// Create HTTP server for both Express and WebSocket
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ 
  server,
  path: '/ws/progress'
});

// Store connected clients with their subscriptions
const clients = new Map();

wss.on('connection', (ws, req) => {
  const clientId = uuidv4();
  clients.set(clientId, { ws, subscriptions: new Set() });
  
  console.log(`[WebSocket] Client connected: ${clientId}`);
  
  // Send initial active work
  ws.send(JSON.stringify({
    type: 'init',
    data: { active: progressTracker.getActiveWork() }
  }));
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      const client = clients.get(clientId);
      
      if (data.action === 'subscribe' && data.workId) {
        client.subscriptions.add(data.workId);
        ws.send(JSON.stringify({
          type: 'subscribed',
          workId: data.workId
        }));
      } else if (data.action === 'unsubscribe' && data.workId) {
        client.subscriptions.delete(data.workId);
        ws.send(JSON.stringify({
          type: 'unsubscribed',
          workId: data.workId
        }));
      } else if (data.action === 'subscribeAll') {
        client.subscriptions.add('*');
        ws.send(JSON.stringify({
          type: 'subscribed',
          workId: '*'
        }));
      }
    } catch (err) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });
  
  ws.on('close', () => {
    console.log(`[WebSocket] Client disconnected: ${clientId}`);
    clients.delete(clientId);
  });
  
  ws.on('error', (err) => {
    console.error(`[WebSocket] Error for client ${clientId}:`, err);
    clients.delete(clientId);
  });
});

// Broadcast function
function broadcastProgress(event, data) {
  const message = JSON.stringify({ type: event, data });
  
  clients.forEach((client, clientId) => {
    const { ws, subscriptions } = client;
    
    if (ws.readyState === WebSocket.OPEN) {
      // Check if client is subscribed to this work or all events
      const workId = data.workId || data.id;
      if (subscriptions.has('*') || subscriptions.has(workId) || !workId) {
        ws.send(message);
      }
    }
  });
}

// Listen to progress tracker events and broadcast to clients
progressTracker.on('workStarted', (work) => {
  broadcastProgress('workStarted', work);
});

progressTracker.on('phaseUpdated', ({ workId, phaseIndex, status, work }) => {
  broadcastProgress('phaseUpdated', { workId, phaseIndex, status, work });
});

progressTracker.on('logAdded', ({ workId, log }) => {
  broadcastProgress('logAdded', { workId, log });
});

progressTracker.on('workCompleted', (work) => {
  broadcastProgress('workCompleted', work);
});

// ===== BUDGET TRACKING API =====
app.get('/api/budget/status', (req, res) => {
  try {
    const budgetData = budgetTracker.getBudgetAPIResponse();
    res.json(budgetData);
  } catch (err) {
    console.error('[Budget API] Error:', err.message);
    res.status(500).json({ error: 'Failed to get budget status' });
  }
});

// ===== MOONSHOT ACTUAL COST API =====
const moonshotTracker = require('./moonshot-cost-tracker');
const openaiTracker = require('./openai-cost-tracker');

// Initialize tracking
moonshotTracker.initTable();
openaiTracker.initTable();

// Sync costs every 30 minutes
setInterval(() => {
  moonshotTracker.syncMoonshotCosts().catch(err => {
    console.error('[Moonshot Sync] Failed:', err.message);
  });
  openaiTracker.syncOpenAICosts().catch(err => {
    console.error('[OpenAI Sync] Failed:', err.message);
  });
}, 30 * 60 * 1000);

// API endpoint for actual costs (v4 - uses cost_tracking with historical data)
app.get('/api/costs/actual', async (req, res) => {
  try {
    const db2 = new Database(path.join(DATA_DIR, 'dashboard.db'));
    
    // Get today's cost from cost_tracking (has historical data inserted)
    const todayStr = new Date().toISOString().split('T')[0];
    const todayCost = db2.prepare(`SELECT cost FROM cost_tracking WHERE id = 'moonshot-${todayStr}'`).get();
    
    // Get ground truth
    const groundTruth = db2.prepare("SELECT * FROM cost_ground_truth WHERE id = 'moonshot'").get();
    const groundTruthTotal = groundTruth?.total_ever || 0;
    
    // Get raw API data for reference
    const rawToday = costAggregator.getTodayCost();
    const dailyTrend = costAggregator.getDailyTrend();
    const byAgent = costAggregator.getCostsByAgent();
    
    // Check if we have real data for today
    const hasTodayData = todayCost && todayCost.cost > 0 && todayCost.cost < 50; // Sanity check
    const todayCostValue = hasTodayData ? todayCost.cost : 0;
    
    db2.close();
    
    res.json({
      today: {
        usd: hasTodayData ? todayCostValue : 0,
        tokens: rawToday.tokens,
        quality: hasTodayData ? 'REAL' : 'FAKE',
        note: hasTodayData ? 'Today\'s actual spend' : 'No cost data for today',
        display: hasTodayData ? `$${todayCostValue.toFixed(2)}` : 'Fake Data'
      },
      sinceTrackingStarted: {
        usd: groundTruthTotal,
        since: '2026-02-08',
        days: 10,
        quality: 'REAL',
        note: 'Total spend since we started tracking'
      },
      thisMonth: {
        usd: groundTruthTotal,
        quality: 'REAL',
        note: 'Feb 1-17 actual spend'
      },
      totalEver: {
        usd: groundTruthTotal,
        quality: 'REAL',
        source: 'user-provided ground truth'
      },
      dailyBudget: {
        limit: 10.00,
        spent: hasTodayData ? todayCostValue : null,
        remaining: hasTodayData ? 10.00 - todayCostValue : null,
        quality: hasTodayData ? 'REAL' : 'FAKE',
        percentUsed: hasTodayData ? ((todayCostValue / 10.00) * 100).toFixed(1) : null
      },
      dataQuality: {
        hasTodayData: hasTodayData,
        groundTruthAge: groundTruth ? 
          Math.floor((new Date() - new Date(groundTruth.updated_at)) / (1000 * 60 * 60)) : null
      },
      dailyTrend: dailyTrend,
      byAgent: byAgent.byAgent,
      rawApi: {
        currentTokens: rawToday.tokens,
        lastSync: rawToday.lastSync
      }
    });
  } catch (err) {
    console.error('[Cost API] Error:', err.message);
    res.status(500).json({ error: 'Failed to get actual costs', message: err.message });
  }
});

// Import cost aggregator and auto-approval
const costAggregator = require('./cost-aggregator');
const autoApproval = require('./auto-approval');

// Initialize auto-approval
autoApproval.initTable();
autoApproval.initRules();

// New endpoint: Daily trend
app.get('/api/costs/trend', (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const trend = costAggregator.getDailyTrend();
    res.json({
      days: days,
      data: trend.slice(0, days),
      source: 'moonshot-api'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// New endpoint: Cost by agent
app.get('/api/costs/by-agent', (req, res) => {
  try {
    const data = costAggregator.getCostsByAgent();
    res.json({
      byAgent: data.byAgent,
      decisionsByAgent: data.decisionsByAgent,
      lastUpdated: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== AUTO-APPROVAL API =====

// Evaluate a decision
app.post('/api/auto-approval/evaluate', (req, res) => {
  try {
    const decision = req.body;
    const result = autoApproval.evaluateDecision(decision);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get auto-approval rules
app.get('/api/auto-approval/rules', (req, res) => {
  try {
    const rules = autoApproval.loadRules();
    res.json(rules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update rules
app.put('/api/auto-approval/rules', (req, res) => {
  try {
    autoApproval.saveRules(req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get stats
app.get('/api/auto-approval/stats', (req, res) => {
  try {
    const stats = autoApproval.getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update agent score (call when decision is approved/rejected)
app.post('/api/auto-approval/agent-score', (req, res) => {
  try {
    const { agent, outcome } = req.body;
    autoApproval.updateAgentScore(agent, outcome);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== ACTIVE WORK API =====
app.get('/api/progress/active', (req, res) => {
  try {
    // Get from progress tracker or return mock data
    const activeWork = [
      {
        id: 'work-1',
        agent: 'Megatron',
        title: 'Cost Tracking Fix',
        status: 'running',
        progress: 85,
        startedAt: new Date().toISOString(),
        estimatedCost: 0.80,
        actualCost: 0.65,
        phase: 'Implementation'
      }
    ];
    res.json(activeWork);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MiniMax Cost Tracking API
app.get('/api/costs/by-provider', (req, res) => {
  try {
    const db2 = new Database(path.join(DATA_DIR, 'dashboard.db'));
    
    // Get costs by provider
    const byProvider = db2.prepare(`
      SELECT 
        COALESCE(provider, 'moonshot') as provider,
        SUM(cost) as total,
        COUNT(*) as calls,
        date
      FROM cost_tracking
      GROUP BY provider, date
      ORDER BY date DESC, provider
    `).all();
    
    // Get today's split
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySplit = db2.prepare(`
      SELECT 
        COALESCE(provider, 'moonshot') as provider,
        SUM(cost) as total
      FROM cost_tracking
      WHERE date = ?
      GROUP BY provider
    `).all(todayStr);
    
    // Calculate totals
    const totalApi = db2.prepare(`
      SELECT SUM(cost) as total FROM cost_tracking 
      WHERE provider IN ('moonshot', 'minimax', 'openai') OR provider IS NULL
    `).get();
    
    const totalLocal = db2.prepare(`
      SELECT SUM(cost) as total FROM cost_tracking WHERE provider = 'local'
    `).get();
    
    db2.close();
    
    res.json({
      byProvider: byProvider.slice(0, 30),
      todaySplit,
      summary: {
        apiTotal: totalApi?.total || 0,
        localTotal: totalLocal?.total || 0,
        apiPercentage: totalApi?.total > 0 ? 
          ((totalApi.total / (totalApi.total + (totalLocal?.total || 0))) * 100).toFixed(1) : 0
      }
    });
  } catch (err) {
    console.error('[Cost By Provider] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Log cost with provider
app.post('/api/costs/log', (req, res) => {
  const { sessionName, cost, tokens, model, provider = 'moonshot' } = req.body;
  
  const db2 = new Database(path.join(DATA_DIR, 'dashboard.db'));
  const id = uuidv4();
  const today = new Date().toISOString().split('T')[0];
  
  try {
    db2.prepare(`
      INSERT INTO cost_tracking (id, date, sessionName, cost, tokens, model, provider, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, today, sessionName, cost || 0, tokens, model, provider, new Date().toISOString());
    
    db2.close();
    res.json({ id, provider, success: true });
  } catch (err) {
    db2.close();
    res.status(500).json({ error: err.message });
  }
});

// Model Router API
const { routeTask, classifyTask, getRoutingStats } = require('./model-router');
const { getMiniMaxUsage } = require('./minimax-client');

app.get('/api/router/status', (req, res) => {
  try {
    res.json({
      status: 'active',
      routes: getRoutingStats(),
      coding: 'minimax',
      heartbeat: 'local',
      fallback: 'moonshot'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/router/classify', (req, res) => {
  try {
    const { description } = req.body;
    const taskType = classifyTask(description);
    res.json({ description, taskType });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MiniMax Status API
app.get('/api/minimax/status', async (req, res) => {
  try {
    const usage = await getMiniMaxUsage();
    res.json({
      status: 'connected',
      plan: 'Coding Plan',
      quota: 1000,
      used: usage.model_remains?.[0]?.current_interval_usage_count || 0,
      remaining: 1000 - (usage.model_remains?.[0]?.current_interval_usage_count || 0),
      resetInterval: '5 hours'
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// AUTONOMOUS MODE API
const { manager, APPROVED_TASKS } = require('./autonomous-manager');

app.get('/api/autonomous/status', (req, res) => {
  res.json({
    ...manager.getStatus(),
    tasks: APPROVED_TASKS.map(t => ({
      id: t.id,
      title: t.title,
      type: t.type,
      estimatedPrompts: t.estimatedPrompts,
      status: manager.completedTasks.find(ct => ct.id === t.id) ? 'completed' :
              Array.from(manager.activeTasks.values()).find(at => at.id === t.id) ? 'active' : 'pending'
    }))
  });
});

app.post('/api/autonomous/start', (req, res) => {
  const { taskId } = req.body;
  const executionId = manager.startTask(taskId);
  if (executionId) {
    res.json({ success: true, executionId, taskId });
  } else {
    res.status(400).json({ error: 'Cannot start task (max concurrent or not found)' });
  }
});

app.post('/api/autonomous/start-batch', (req, res) => {
  const started = [];
  for (const task of APPROVED_TASKS) {
    if (manager.canStartTask() && 
        !manager.completedTasks.find(ct => ct.id === task.id) &&
        !Array.from(manager.activeTasks.values()).find(at => at.id === task.id)) {
      const executionId = manager.startTask(task.id);
      if (executionId) started.push({ taskId: task.id, executionId });
    }
  }
  res.json({ success: true, started, count: started.length });
});

// Initialize Socket.io WebSocket server
const wsServer = new DashboardWebSocket(server, {
  origin: ["http://localhost:3000", "http://localhost:3002", "http://localhost:3003"]
});

// Integrate with progress tracker events
progressTracker.on('workStarted', (work) => {
  wsServer.startTask({
    id: work.id,
    title: work.title,
    agent: work.agent,
    phases: work.phases || [],
    estimatedDuration: work.estimatedDuration,
    estimatedCost: work.estimatedCost,
    metadata: work.metadata
  });
});

progressTracker.on('phaseUpdated', ({ workId, phaseIndex, status, details }) => {
  wsServer.updateTaskPhase(workId, phaseIndex, status, details);
});

progressTracker.on('logAdded', ({ workId, log }) => {
  wsServer.logTaskEvent(workId, log.message, log.level, log.metadata);
  
  // Calculate progress based on phases
  const work = progressTracker.getWorkById(workId);
  if (work && work.phases) {
    const completedPhases = work.phases.filter(p => p.status === 'completed').length;
    const progress = Math.round((completedPhases / work.phases.length) * 100);
    wsServer.updateTaskProgress(workId, progress, {
      message: log.message,
      level: log.level
    });
  }
});

progressTracker.on('workCompleted', (work) => {
  wsServer.completeTask(work.id, work.result);
});

// MiniMax quota streaming integration (getMiniMaxUsage already imported above)

// Stream MiniMax quota every 30 seconds
setInterval(async () => {
  try {
    const usage = await getMiniMaxUsage();
    const quotaData = {
      plan: 'Coding Plan',
      quota: 1000,
      used: usage.model_remains?.[0]?.current_interval_usage_count || 0,
      remaining: 1000 - (usage.model_remains?.[0]?.current_interval_usage_count || 0),
      resetInterval: '5 hours',
      models: usage.model_remains || [],
      isHealthy: (usage.model_remains?.[0]?.current_interval_usage_count || 0) < 800
    };
    
    wsServer.updateMiniMaxQuota(quotaData);
    
    // Send alert if quota is running low
    if (quotaData.remaining < 100) {
      wsServer.broadcastMiniMaxAlert('warning', 'MiniMax quota running low', {
        remaining: quotaData.remaining,
        threshold: 100
      });
    }
    if (quotaData.remaining < 20) {
      wsServer.broadcastMiniMaxAlert('critical', 'MiniMax quota nearly exhausted', {
        remaining: quotaData.remaining,
        action: 'Consider switching to fallback provider'
      });
    }
  } catch (err) {
    wsServer.broadcastMiniMaxAlert('error', 'Failed to fetch MiniMax quota', {
      error: err.message
    });
  }
}, 30000);

// Autonomous mode status broadcasting (manager already imported above)

// Track autonomous mode changes
const originalStartTask = manager.startTask.bind(manager);
const originalCompleteTask = manager.completeTask.bind(manager);

manager.startTask = function(taskId) {
  const executionId = originalStartTask(taskId);
  if (executionId) {
    const task = manager.availableTasks.find(t => t.id === taskId);
    wsServer.broadcastAutonomousTaskStarted({
      executionId,
      taskId,
      title: task?.title || 'Unknown Task',
      type: task?.type || 'task',
      estimatedPrompts: task?.estimatedPrompts || 0
    });
    
    // Update overall status
    wsServer.setAutonomousStatus({
      enabled: manager.isRunning,
      activeTasks: Array.from(manager.activeTasks.values()).map(t => ({
        id: t.id,
        executionId: t.executionId,
        progress: t.progress,
        promptsUsed: t.promptsUsed,
        startedAt: t.startedAt
      })),
      completedTasks: manager.completedTasks,
      stats: manager.stats
    });
  }
  return executionId;
};

manager.completeTask = function(executionId, result) {
  originalCompleteTask(executionId, result);
  wsServer.broadcastAutonomousTaskCompleted(executionId, result);
  
  // Update status
  wsServer.setAutonomousStatus({
    enabled: manager.isRunning,
    activeTasks: Array.from(manager.activeTasks.values()).map(t => ({
      id: t.id,
      executionId: t.executionId,
      progress: t.progress,
      promptsUsed: t.promptsUsed
    })),
    completedTasks: manager.completedTasks,
    stats: manager.stats
  });
};

// Stream autonomous progress every 5 seconds
setInterval(() => {
  if (manager.isRunning && manager.activeTasks.size > 0) {
    manager.activeTasks.forEach((task, executionId) => {
      wsServer.broadcastAutonomousTaskProgress(executionId, task.progress);
    });
    
    wsServer.setAutonomousStatus({
      enabled: manager.isRunning,
      activeTasks: Array.from(manager.activeTasks.values()).map(t => ({
        id: t.id,
        executionId: t.executionId,
        progress: t.progress,
        promptsUsed: t.promptsUsed,
        estimatedPrompts: t.estimatedPrompts
      })),
      completedTasks: manager.completedTasks,
      stats: manager.stats
    });
  }
}, 5000);

// WebSocket API endpoints
app.post('/api/ws/broadcast', (req, res) => {
  const { channel, message, level = 'info' } = req.body;
  
  if (channel === 'system') {
    wsServer.broadcastSystemMessage(message, level);
  } else if (channel === 'costs') {
    wsServer.broadcastCostUpdate(message);
  } else {
    wsServer.io.emit(channel, message);
  }
  
  res.json({ success: true, broadcast: true });
});

app.get('/api/ws/stats', (req, res) => {
  res.json(wsServer.getStats());
});

// WebSocket test endpoint
app.get('/api/ws/test-task', (req, res) => {
  const taskId = `test-task-${Date.now()}`;
  const task = wsServer.startTask({
    id: taskId,
    title: 'Test WebSocket Task',
    agent: 'test-agent',
    phases: [
      { name: 'Initialization', status: 'pending' },
      { name: 'Processing', status: 'pending' },
      { name: 'Finalization', status: 'pending' }
    ],
    estimatedDuration: 30000,
    estimatedCost: 0.05
  });
  
  // Simulate progress
  setTimeout(() => {
    wsServer.updateTaskPhase(taskId, 0, 'completed');
    wsServer.updateTaskProgress(taskId, 33, { message: 'Initialization complete' });
  }, 2000);
  
  setTimeout(() => {
    wsServer.updateTaskPhase(taskId, 1, 'in-progress');
    wsServer.updateTaskProgress(taskId, 50, { message: 'Processing...' });
  }, 4000);
  
  setTimeout(() => {
    wsServer.updateTaskProgress(taskId, 75, { message: 'Almost done' });
  }, 6000);
  
  setTimeout(() => {
    wsServer.updateTaskPhase(taskId, 1, 'completed');
    wsServer.updateTaskPhase(taskId, 2, 'completed');
    wsServer.completeTask(taskId, { test: true, duration: 8000 });
  }, 8000);
  
  res.json({ success: true, taskId, message: 'Test task started. Connect to WebSocket to see progress.' });
});

// Kanban Archive API
const archiveRoutes = require('./archive-routes');
app.use('/api/archive', archiveRoutes);

// Proposal Workflow API
const proposalRoutes = require('./proposal-routes');
app.use('/api/proposals', proposalRoutes);

// Guard Rails API
const guardrailsRoutes = require('./guardrails-routes')(Router());
app.use('/api/guardrails', guardrailsRoutes);

// Agent Team API
const agentRoutesV2 = require('./agent-routes-v2')(Router());
app.use('/api/agents-v2', agentRoutesV2);

// Auto-Execution Engine
const autoExecutor = require('./auto-executor');
autoExecutor.start(30000); // Check every 30 seconds

// Auto-Execution API
app.get('/api/autoexec/status', (req, res) => {
  res.json(autoExecutor.getStatus());
});

app.post('/api/autoexec/trigger/:proposalId', async (req, res) => {
  try {
    const result = await autoExecutor.triggerExecution(req.params.proposalId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/autoexec/start', (req, res) => {
  autoExecutor.start();
  res.json({ success: true, message: 'Auto-executor started' });
});

app.post('/api/autoexec/stop', (req, res) => {
  autoExecutor.stop();
  res.json({ success: true, message: 'Auto-executor stopped' });
});

// Store wsServer reference for archive routes
app.locals.wss = wsServer;

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Dashboard API running on http://localhost:${PORT}`);
  console.log(`💾 Database: ${path.join(DATA_DIR, 'dashboard.db')}`);
  console.log(`🤖 Agent Team API: /api/agents, /api/work-queue, /api/budget`);
  console.log(`📊 Executive API: /api/executive/*`);
  console.log(`🧠 Shared Context API: /api/shared-context/*`);
  console.log(`📈 Progress Tracker API: /api/progress/*`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}/ws/progress`);
  console.log(`⚡ Socket.io: http://localhost:${PORT}/socket.io`);
  console.log(`💰 Cost Tracking: /api/costs/by-provider`);
  console.log(`🧠 Model Router: /api/router/status`);
  console.log(`⚡ MiniMax: /api/minimax/status`);
  console.log(`📦 Kanban Archive: /api/archive/*`);
  console.log(`🎮 WebSocket Test: http://localhost:${PORT}/websocket-demo.html`);
});
