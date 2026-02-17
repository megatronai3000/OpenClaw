const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'data/dashboard.db'));

// Add detailed token tracking table
db.exec(`
  CREATE TABLE IF NOT EXISTS api_usage_detail (
    id TEXT PRIMARY KEY,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    model TEXT NOT NULL,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    estimated_cost REAL DEFAULT 0,
    project_id TEXT,
    session_id TEXT,
    endpoint TEXT,
    duration_ms INTEGER
  );

  CREATE INDEX IF NOT EXISTS idx_api_usage_timestamp ON api_usage_detail(timestamp);
  CREATE INDEX IF NOT EXISTS idx_api_usage_model ON api_usage_detail(model);
  CREATE INDEX IF NOT EXISTS idx_api_usage_project ON api_usage_detail(project_id);
`);

// Add budget settings table
db.exec(`
  CREATE TABLE IF NOT EXISTS budget_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    monthly_budget REAL DEFAULT 100.00,
    alert_thresholds TEXT DEFAULT '[50, 75, 90]',
    email_alerts BOOLEAN DEFAULT 0,
    slack_webhook TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Insert default budget settings if not exists
  INSERT OR IGNORE INTO budget_settings (id, monthly_budget, alert_thresholds) 
  VALUES (1, 100.00, '[50, 75, 90]');
`);

console.log('✅ Cost analytics tables created');

// Seed with sample data for today
const { v4: uuidv4 } = require('uuid');

const models = [
  { name: 'claude-opus-4-5', input: 15.00, output: 75.00 },
  { name: 'claude-sonnet-4-5', input: 3.00, output: 15.00 },
  { name: 'claude-haiku-4-5', input: 0.25, output: 1.25 }
];

const insertUsage = db.prepare(`
  INSERT INTO api_usage_detail 
  (id, timestamp, model, input_tokens, output_tokens, total_tokens, estimated_cost, project_id, session_id, endpoint)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// Generate sample data for today
const now = new Date();
for (let i = 0; i < 12; i++) {
  const model = models[Math.floor(Math.random() * models.length)];
  const inputTokens = Math.floor(Math.random() * 5000) + 500;
  const outputTokens = Math.floor(Math.random() * 3000) + 200;
  const totalTokens = inputTokens + outputTokens;
  const cost = (inputTokens / 1000000 * model.input) + (outputTokens / 1000000 * model.output);
  
  const timestamp = new Date(now.getTime() - i * 2 * 60 * 60 * 1000).toISOString();
  
  insertUsage.run(
    uuidv4(),
    timestamp,
    model.name,
    inputTokens,
    outputTokens,
    totalTokens,
    cost.toFixed(4),
    ['p1', 'p2', 'p3', 'p5'][Math.floor(Math.random() * 4)],
    `sess_${Math.floor(Math.random() * 1000)}`,
    'chat.completions'
  );
}

console.log('✅ Sample usage data seeded');
db.close();
