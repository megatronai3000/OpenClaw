// moonshot-cost-tracker.js - Track costs via token delta from Moonshot API
const https = require('https');
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'dashboard.db');
const MOONSHOT_KEY = process.env.MOONSHOT_API_KEY || 'sk-IsL0vjlpqf06dnbzKQO5walUxpyl4qfCPufYa3z4D4xQKZCD';
const BASE_URL = 'https://api.moonshot.ai/v1';

// Moonshot pricing (CNY per 1K tokens)
const PRICING_CNY = {
  input: 0.012,
  output: 0.048
};

// Exchange rate (approximate)
const CNY_TO_USD = 0.14; // 1 CNY ≈ $0.14 USD

/**
 * Fetch current token usage from Moonshot
 */
function fetchMoonshotUsage() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.moonshot.ai',
      path: '/v1/users/me',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MOONSHOT_KEY}`,
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
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            return;
          }
          
          const json = JSON.parse(data);
          
          if (!json.status) {
            reject(new Error(`API error: ${json.error}`));
            return;
          }
          
          resolve({
            timestamp: new Date().toISOString(),
            tokenUsage: json.data?.organization_usage?.cur_token_usage || 0,
            tokenQuota: json.data?.organization?.max_token_quota || 0,
            rpm: json.data?.organization_usage?.cur_request_per_minute || 0,
            tpm: json.data?.organization_usage?.cur_token_per_minute || 0,
            orgId: json.data?.organization?.id,
            tier: json.data?.user?.user_group_id
          });
        } catch (err) {
          reject(new Error(`Parse error: ${err.message}`));
        }
      });
    });
    
    req.on('error', (err) => {
      reject(new Error(`Request failed: ${err.message}`));
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  }).catch(err => {
    console.error('[MoonshotTracker] Failed to fetch:', err.message);
    return null;
  });
}

/**
 * Calculate cost from token delta
 */
function calculateCost(tokenDelta, inputRatio = 0.7) {
  const inputTokens = tokenDelta * inputRatio;
  const outputTokens = tokenDelta * (1 - inputRatio);
  
  const inputCostCNY = (inputTokens / 1000) * PRICING_CNY.input;
  const outputCostCNY = (outputTokens / 1000) * PRICING_CNY.output;
  const totalCostCNY = inputCostCNY + outputCostCNY;
  
  const totalCostUSD = totalCostCNY * CNY_TO_USD;
  
  return {
    cny: totalCostCNY,
    usd: totalCostUSD,
    inputTokens,
    outputTokens
  };
}

/**
 * Store usage snapshot and calculate delta
 */
async function syncMoonshotCosts() {
  const current = await fetchMoonshotUsage();
  if (!current) return null;
  
  const db = new Database(DB_PATH);
  
  try {
    // Get previous snapshot
    const previous = db.prepare(`
      SELECT * FROM moonshot_usage_snapshots 
      ORDER BY timestamp DESC LIMIT 1
    `).get();
    
    // Calculate delta
    let delta = 0;
    let periodCost = null;
    
    if (previous) {
      delta = current.tokenUsage - previous.token_usage;
      if (delta > 0) {
        periodCost = calculateCost(delta);
      }
    }
    
    // Store snapshot
    db.prepare(`
      INSERT INTO moonshot_usage_snapshots 
      (timestamp, token_usage, token_quota, rpm, tpm, org_id, tier, delta_from_previous, estimated_cost_usd, estimated_cost_cny)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      current.timestamp,
      current.tokenUsage,
      current.tokenQuota,
      current.rpm,
      current.tpm,
      current.orgId,
      current.tier,
      delta,
      periodCost?.usd || 0,
      periodCost?.cny || 0
    );
    
    // Clean up old snapshots (keep 90 days)
    db.prepare(`
      DELETE FROM moonshot_usage_snapshots 
      WHERE timestamp < datetime('now', '-90 days')
    `).run();
    
    console.log(`[MoonshotTracker] Synced: ${current.tokenUsage.toLocaleString()} tokens (${delta > 0 ? '+' + delta.toLocaleString() : 'no change'})`);
    if (periodCost) {
      console.log(`[MoonshotTracker] Period cost: ¥${periodCost.cny.toFixed(4)} (~$${periodCost.usd.toFixed(4)})`);
    }
    
    return {
      current,
      previous: previous ? { tokenUsage: previous.token_usage, timestamp: previous.timestamp } : null,
      delta,
      periodCost,
      totalEstimatedCost: getTotalEstimatedCost(db)
    };
  } finally {
    db.close();
  }
}

/**
 * Get total estimated cost from all deltas
 */
function getTotalEstimatedCost(db) {
  const result = db.prepare(`
    SELECT SUM(estimated_cost_usd) as total_usd, SUM(estimated_cost_cny) as total_cny
    FROM moonshot_usage_snapshots
  `).get();
  
  return {
    usd: result.total_usd || 0,
    cny: result.total_cny || 0
  };
}

/**
 * Get cost summary for dashboard
 */
function getCostSummary() {
  const db = new Database(DB_PATH);
  
  try {
    const total = getTotalEstimatedCost(db);
    const today = db.prepare(`
      SELECT SUM(estimated_cost_usd) as total
      FROM moonshot_usage_snapshots
      WHERE date(timestamp) = date('now')
    `).get();
    
    const thisWeek = db.prepare(`
      SELECT SUM(estimated_cost_usd) as total
      FROM moonshot_usage_snapshots
      WHERE timestamp >= datetime('now', '-7 days')
    `).get();
    
    const latest = db.prepare(`
      SELECT * FROM moonshot_usage_snapshots
      ORDER BY timestamp DESC LIMIT 1
    `).get();
    
    return {
      totalUSD: total.usd,
      totalCNY: total.cny,
      todayUSD: today.total || 0,
      thisWeekUSD: thisWeek.total || 0,
      currentTokenUsage: latest?.token_usage || 0,
      tokenQuota: latest?.token_quota || 0,
      lastSync: latest?.timestamp || null,
      source: 'moonshot-api'
    };
  } finally {
    db.close();
  }
}

// Ensure table exists
function initTable() {
  const db = new Database(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS moonshot_usage_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      token_usage INTEGER DEFAULT 0,
      token_quota INTEGER DEFAULT 0,
      rpm INTEGER DEFAULT 0,
      tpm INTEGER DEFAULT 0,
      org_id TEXT,
      tier TEXT,
      delta_from_previous INTEGER DEFAULT 0,
      estimated_cost_usd REAL DEFAULT 0,
      estimated_cost_cny REAL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_moonshot_timestamp ON moonshot_usage_snapshots(timestamp);
  `);
  db.close();
  console.log('[MoonshotTracker] Table initialized');
}

module.exports = {
  syncMoonshotCosts,
  getCostSummary,
  fetchMoonshotUsage,
  initTable
};

// Run if called directly
if (require.main === module) {
  initTable();
  syncMoonshotCosts().then(result => {
    if (result) {
      console.log('\n=== Summary ===');
      console.log(`Total estimated: $${result.totalEstimatedCost.usd.toFixed(4)} USD (¥${result.totalEstimatedCost.cny.toFixed(4)} CNY)`);
    }
  });
}
