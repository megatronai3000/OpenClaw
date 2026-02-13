// api-cost-tracker.js - Real-time API cost tracking from provider APIs
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'dashboard.db');

// Provider API configurations
const PROVIDERS = {
  moonshot: {
    name: 'Moonshot (Kimi)',
    apiKeyEnv: 'MOONSHOT_API_KEY',
    baseUrl: 'https://api.moonshot.ai/v1',
    models: {
      'kimi-k2.5': { input: 0.0015, output: 0.006 }, // per 1K tokens
      'kimi-k2-0905-preview': { input: 0.0015, output: 0.006 }
    }
  },
  openai: {
    name: 'OpenAI',
    apiKeyEnv: 'OPENAI_API_KEY',
    baseUrl: 'https://api.openai.com/v1',
    models: {
      'gpt-4o': { input: 0.0025, output: 0.01 },
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 }
    }
  },
  google: {
    name: 'Google (Gemini)',
    apiKeyEnv: 'GEMINI_API_KEY',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: {
      'gemini-2.5-flash-preview': { input: 0.00015, output: 0.0006 }
    }
  }
};

// Log actual API call with real usage from response
function logActualAPICall(provider, model, usage, sessionName = 'api-call') {
  const Database = require('better-sqlite3');
  const db = new Database(DB_PATH);
  
  const pricing = PROVIDERS[provider]?.models[model];
  if (!pricing) {
    console.warn(`[CostTracker] Unknown model pricing: ${provider}/${model}`);
    db.close();
    return null;
  }
  
  // Calculate actual cost from token usage
  const inputCost = (usage.input_tokens / 1000) * pricing.input;
  const outputCost = (usage.output_tokens / 1000) * pricing.output;
  const totalCost = inputCost + outputCost;
  
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    date: new Date().toISOString().split('T')[0],
    sessionName: sessionName,
    cost: totalCost,
    tokens: usage.input_tokens + usage.output_tokens,
    model: `${provider}/${model}`,
    createdAt: new Date().toISOString()
  };
  
  db.prepare(`
    INSERT INTO cost_tracking (id, date, sessionName, cost, tokens, model, createdAt)
    VALUES (@id, @date, @sessionName, @cost, @tokens, @model, @createdAt)
  `).run(entry);
  
  db.close();
  
  console.log(`[CostTracker] Logged: ${provider}/${model} | $${totalCost.toFixed(4)} | ${entry.tokens} tokens`);
  
  return entry;
}

// Get actual spend from database (not estimates)
function getActualSpend(startDate = null, endDate = null) {
  const Database = require('better-sqlite3');
  const db = new Database(DB_PATH);
  
  let query = `
    SELECT 
      date,
      model,
      COUNT(*) as calls,
      SUM(tokens) as total_tokens,
      ROUND(SUM(cost), 4) as total_cost
    FROM cost_tracking
    WHERE sessionName != 'daily-sync'
    AND sessionName != 'estimate'
    AND sessionName != 'manual-correction'
  `;
  
  if (startDate) {
    query += ` AND date >= '${startDate}'`;
  }
  if (endDate) {
    query += ` AND date <= '${endDate}'`;
  }
  
  query += ` GROUP BY date, model ORDER BY date DESC`;
  
  const results = db.prepare(query).all();
  db.close();
  
  return results;
}

// Calculate accurate estimate based on actual historical data
function calculateAccurateEstimate(model, estimatedInputTokens, estimatedOutputTokens) {
  const Database = require('better-sqlite3');
  const db = new Database(DB_PATH);
  
  // Get average cost per token from actual historical data
  const historical = db.prepare(`
    SELECT 
      AVG(cost / NULLIF(tokens, 0)) as avg_cost_per_token,
      COUNT(*) as sample_size
    FROM cost_tracking
    WHERE model LIKE ?
    AND tokens > 0
    AND cost > 0
    AND sessionName NOT IN ('daily-sync', 'estimate', 'manual-correction')
  `).get(`%${model}%`);
  
  db.close();
  
  if (historical.sample_size < 5) {
    // Not enough data, use pricing table
    console.log(`[CostTracker] Not enough historical data (${historical.sample_size} samples), using pricing table`);
    return null;
  }
  
  const totalTokens = estimatedInputTokens + estimatedOutputTokens;
  const estimatedCost = totalTokens * historical.avg_cost_per_token;
  
  console.log(`[CostTracker] Estimate based on ${historical.sample_size} actual calls: $${estimatedCost.toFixed(4)}`);
  
  return {
    estimatedCost,
    confidence: historical.sample_size > 20 ? 'high' : historical.sample_size > 10 ? 'medium' : 'low',
    basedOn: `${historical.sample_size} actual API calls`
  };
}

// Generate daily cost report from actual API data
function generateActualCostReport() {
  const spend = getActualSpend();
  
  const today = new Date().toISOString().split('T')[0];
  const currentMonth = today.substring(0, 7);
  
  const todaySpend = spend
    .filter(s => s.date === today)
    .reduce((sum, s) => sum + s.total_cost, 0);
  
  const monthSpend = spend
    .filter(s => s.date.startsWith(currentMonth))
    .reduce((sum, s) => sum + s.total_cost, 0);
  
  const byProvider = {};
  spend.forEach(s => {
    const provider = s.model.split('/')[0];
    byProvider[provider] = (byProvider[provider] || 0) + s.total_cost;
  });
  
  return {
    today: todaySpend.toFixed(2),
    month: monthSpend.toFixed(2),
    remaining: (300 - monthSpend).toFixed(2),
    byProvider,
    details: spend.slice(0, 10) // Last 10 entries
  };
}

// Clean up fake/estimate entries
function cleanupFakeEntries() {
  const Database = require('better-sqlite3');
  const db = new Database(DB_PATH);
  
  const before = db.prepare('SELECT COUNT(*) as count FROM cost_tracking').get();
  
  // Delete known fake entry types
  db.prepare(`
    DELETE FROM cost_tracking 
    WHERE sessionName IN ('daily-sync', 'estimate', 'placeholder', 'synthetic')
    OR (cost = 1.57 AND model = 'sync')
  `).run();
  
  const after = db.prepare('SELECT COUNT(*) as count FROM cost_tracking').get();
  db.close();
  
  console.log(`[CostTracker] Cleaned up ${before.count - after.count} fake entries`);
  return before.count - after.count;
}

module.exports = {
  logActualAPICall,
  getActualSpend,
  calculateAccurateEstimate,
  generateActualCostReport,
  cleanupFakeEntries,
  PROVIDERS
};

// Run if called directly
if (require.main === module) {
  console.log('=== API Cost Tracker ===\n');
  
  // Clean up fake data
  const cleaned = cleanupFakeEntries();
  
  // Generate report
  const report = generateActualCostReport();
  
  console.log('\n=== Actual API Spend (Real Data Only) ===');
  console.log(`Today: $${report.today}`);
  console.log(`This Month: $${report.month}`);
  console.log(`Remaining Budget: $${report.remaining}`);
  console.log('\nBy Provider:');
  Object.entries(report.byProvider).forEach(([p, c]) => {
    console.log(`  ${p}: $${c.toFixed(2)}`);
  });
  console.log(`\nCleaned ${cleaned} fake entries`);
}
