// openai-cost-tracker.js - Track costs from OpenAI API
// Note: OpenAI dashboard APIs require session keys, not API keys
// This uses the available /v1/usage endpoint with date parameters
const https = require('https');
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'dashboard.db');
const OPENAI_KEY = process.env.OPENAI_API_KEY;

// OpenAI pricing (USD per 1K tokens) - GPT-4o
const PRICING = {
  'gpt-4o': { input: 0.0025, output: 0.01 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 }
};

/**
 * Fetch usage for a specific date from OpenAI
 */
function fetchOpenAIUsage(date) {
  return new Promise((resolve, reject) => {
    if (!OPENAI_KEY) {
      resolve(null); // No key configured
      return;
    }
    
    const options = {
      hostname: 'api.openai.com',
      path: `/v1/usage?date=${date}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          
          // Check if there's actual usage data
          const hasUsage = json.data && json.data.length > 0;
          
          resolve({
            date,
            hasUsage,
            data: json.data || [],
            raw: json
          });
        } catch (err) {
          resolve({ date, hasUsage: false, error: err.message });
        }
      });
    });
    
    req.on('error', (err) => {
      resolve({ date, hasUsage: false, error: err.message });
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      resolve({ date, hasUsage: false, error: 'timeout' });
    });
    
    req.end();
  });
}

/**
 * Sync OpenAI costs for recent days
 */
async function syncOpenAICosts() {
  if (!OPENAI_KEY) {
    console.log('[OpenAITracker] No API key configured');
    return null;
  }
  
  const db = new Database(DB_PATH);
  
  try {
    // Check last 7 days
    const results = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const usage = await fetchOpenAIUsage(dateStr);
      
      // Store in database
      db.prepare(`
        INSERT OR REPLACE INTO openai_usage_snapshots 
        (date, has_usage, data_json, checked_at)
        VALUES (?, ?, ?, datetime('now'))
      `).run(
        dateStr,
        usage.hasUsage ? 1 : 0,
        JSON.stringify(usage)
      );
      
      results.push(usage);
    }
    
    // Check if any usage found
    const totalUsage = results.filter(r => r.hasUsage).length;
    
    console.log(`[OpenAITracker] Checked 7 days, found usage on ${totalUsage} days`);
    
    return {
      daysChecked: results.length,
      daysWithUsage: totalUsage,
      results
    };
  } finally {
    db.close();
  }
}

/**
 * Get OpenAI cost summary
 */
function getOpenAICostSummary() {
  const db = new Database(DB_PATH);
  
  try {
    const snapshots = db.prepare(`
      SELECT * FROM openai_usage_snapshots 
      ORDER BY date DESC LIMIT 7
    `).all();
    
    const daysWithUsage = snapshots.filter(s => s.has_usage).length;
    
    return {
      hasData: daysWithUsage > 0,
      daysWithUsage,
      totalDaysChecked: snapshots.length,
      lastChecked: snapshots[0]?.checked_at || null,
      status: daysWithUsage > 0 ? 'active' : 'no_usage',
      message: daysWithUsage > 0 
        ? `Usage found on ${daysWithUsage} days`
        : 'No OpenAI usage detected in last 7 days'
    };
  } finally {
    db.close();
  }
}

// Ensure table exists
function initTable() {
  const db = new Database(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS openai_usage_snapshots (
      date TEXT PRIMARY KEY,
      has_usage INTEGER DEFAULT 0,
      data_json TEXT,
      checked_at TEXT
    );
  `);
  db.close();
  console.log('[OpenAITracker] Table initialized');
}

module.exports = {
  syncOpenAICosts,
  getOpenAICostSummary,
  fetchOpenAIUsage,
  initTable
};

// Run if called directly
if (require.main === module) {
  initTable();
  syncOpenAICosts().then(result => {
    if (result) {
      console.log('OpenAI sync:', result.daysWithUsage, 'days with usage');
    }
  });
}
