// real-usage-tracker.js - Capture actual API usage from live responses
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'dashboard.db');

// Provider pricing (verified from official docs)
const PRICING = {
  'moonshot/kimi-k2.5': { input: 0.0015, output: 0.006 }, // per 1K tokens
  'moonshot/kimi-k2-0905-preview': { input: 0.0015, output: 0.006 },
  'openai/gpt-4o': { input: 0.0025, output: 0.01 },
  'openai/gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'google/gemini-2.5-flash-preview': { input: 0.00015, output: 0.0006 }
};

/**
 * Call this immediately after receiving any API response
 * Extracts usage from the response and logs actual cost
 * 
 * @param {string} provider - 'moonshot', 'openai', 'google'
 * @param {string} model - full model ID
 * @param {object} apiResponse - the raw API response object
 * @param {string} taskName - what task this call was for
 */
function captureLiveUsage(provider, model, apiResponse, taskName = 'api-call') {
  try {
    const Database = require('better-sqlite3');
    const db = new Database(DB_PATH);
    
    // Extract usage from response (varies by provider)
    const usage = extractUsage(provider, apiResponse);
    
    if (!usage || !usage.input_tokens || !usage.output_tokens) {
      console.warn(`[UsageTracker] No usage data in response for ${provider}/${model}`);
      db.close();
      return null;
    }
    
    // Calculate actual cost
    const modelKey = `${provider}/${model}`;
    const pricing = PRICING[modelKey];
    
    if (!pricing) {
      console.warn(`[UsageTracker] Unknown pricing for ${modelKey}`);
      db.close();
      return null;
    }
    
    const inputCost = (usage.input_tokens / 1000) * pricing.input;
    const outputCost = (usage.output_tokens / 1000) * pricing.output;
    const totalCost = inputCost + outputCost;
    
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date: new Date().toISOString().split('T')[0],
      sessionName: taskName,
      cost: totalCost,
      tokens: usage.input_tokens + usage.output_tokens,
      model: modelKey,
      createdAt: new Date().toISOString()
    };
    
    db.prepare(`
      INSERT INTO cost_tracking (id, date, sessionName, cost, tokens, model, createdAt)
      VALUES (@id, @date, @sessionName, @cost, @tokens, @model, @createdAt)
    `).run(entry);
    
    db.close();
    
    console.log(`[UsageTracker] ✅ ${provider} | ${usage.input_tokens}+${usage.output_tokens} tokens | $${totalCost.toFixed(4)}`);
    
    return entry;
    
  } catch (err) {
    console.error('[UsageTracker] Failed to capture usage:', err.message);
    return null;
  }
}

/**
 * Extract usage data based on provider response format
 */
function extractUsage(provider, response) {
  if (!response) return null;
  
  // OpenAI format: response.usage = { prompt_tokens, completion_tokens, total_tokens }
  if (provider === 'openai') {
    return {
      input_tokens: response.usage?.prompt_tokens || 0,
      output_tokens: response.usage?.completion_tokens || 0,
      total_tokens: response.usage?.total_tokens || 0
    };
  }
  
  // Moonshot format: response.usage = { input_tokens, output_tokens, total_tokens }
  if (provider === 'moonshot') {
    return {
      input_tokens: response.usage?.input_tokens || 0,
      output_tokens: response.usage?.output_tokens || 0,
      total_tokens: response.usage?.total_tokens || 0
    };
  }
  
  // Google/Gemini format
  if (provider === 'google') {
    return {
      input_tokens: response.usageMetadata?.promptTokenCount || 0,
      output_tokens: response.usageMetadata?.candidatesTokenCount || 0,
      total_tokens: response.usageMetadata?.totalTokenCount || 0
    };
  }
  
  return null;
}

/**
 * Middleware for OpenAI SDK
 * Wraps the completion call to capture usage
 */
function trackOpenAICall(openaiInstance, taskName = 'openai-call') {
  const originalCreate = openaiInstance.chat.completions.create.bind(openaiInstance.chat.completions);
  
  openaiInstance.chat.completions.create = async function(...args) {
    const response = await originalCreate(...args);
    captureLiveUsage('openai', args[0].model, response, taskName);
    return response;
  };
  
  return openaiInstance;
}

/**
 * Manual entry for when you have the usage data
 * Use this when the automatic capture didn't work
 */
function logManualUsage(provider, model, inputTokens, outputTokens, taskName) {
  const Database = require('better-sqlite3');
  const db = new Database(DB_PATH);
  
  const modelKey = `${provider}/${model}`;
  const pricing = PRICING[modelKey];
  
  if (!pricing) {
    console.warn(`[UsageTracker] Unknown pricing for ${modelKey}`);
    db.close();
    return null;
  }
  
  const inputCost = (inputTokens / 1000) * pricing.input;
  const outputCost = (outputTokens / 1000) * pricing.output;
  const totalCost = inputCost + outputCost;
  
  const entry = {
    id: `manual-${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    sessionName: `manual-${taskName}`,
    cost: totalCost,
    tokens: inputTokens + outputTokens,
    model: modelKey,
    createdAt: new Date().toISOString()
  };
  
  db.prepare(`
    INSERT INTO cost_tracking (id, date, sessionName, cost, tokens, model, createdAt)
    VALUES (@id, @date, @sessionName, @cost, @tokens, @model, @createdAt)
  `).run(entry);
  
  db.close();
  
  console.log(`[UsageTracker] 📝 Manual entry: ${provider} | ${inputTokens}+${outputTokens} tokens | $${totalCost.toFixed(4)}`);
  
  return entry;
}

/**
 * Get today's actual spend from live data
 */
function getTodaySpend() {
  const Database = require('better-sqlite3');
  const db = new Database(DB_PATH);
  
  const today = new Date().toISOString().split('T')[0];
  
  const result = db.prepare(`
    SELECT 
      ROUND(SUM(cost), 4) as total,
      COUNT(*) as calls,
      SUM(tokens) as tokens
    FROM cost_tracking
    WHERE date = ?
    AND sessionName NOT LIKE 'manual-%'
  `).get(today);
  
  db.close();
  
  return {
    date: today,
    cost: result.total || 0,
    calls: result.calls || 0,
    tokens: result.tokens || 0
  };
}

/**
 * Report for dashboard
 */
function generateLiveReport() {
  const Database = require('better-sqlite3');
  const db = new Database(DB_PATH);
  
  const today = getTodaySpend();
  
  const month = db.prepare(`
    SELECT ROUND(SUM(cost), 2) as total
    FROM cost_tracking
    WHERE date LIKE ?
  `).get(`${new Date().toISOString().slice(0, 7)}%`);
  
  const byModel = db.prepare(`
    SELECT model, COUNT(*) as calls, ROUND(SUM(cost), 2) as cost
    FROM cost_tracking
    WHERE date = ?
    GROUP BY model
  `).all(today.date);
  
  db.close();
  
  return {
    today: today,
    month: month.total || 0,
    remaining: (300 - (month.total || 0)).toFixed(2),
    byModel: byModel
  };
}

module.exports = {
  captureLiveUsage,
  trackOpenAICall,
  logManualUsage,
  getTodaySpend,
  generateLiveReport,
  PRICING
};

// Run report if called directly
if (require.main === module) {
  const report = generateLiveReport();
  
  console.log('=== Live API Usage Report ===\n');
  console.log(`Today (${report.today.date}):`);
  console.log(`  Cost: $${report.today.cost.toFixed(4)}`);
  console.log(`  Calls: ${report.today.calls}`);
  console.log(`  Tokens: ${report.today.tokens.toLocaleString()}`);
  console.log(`\nThis Month: $${report.month}`);
  console.log(`Remaining Budget: $${report.remaining}`);
  
  if (report.byModel.length > 0) {
    console.log('\nBy Model:');
    report.byModel.forEach(m => {
      console.log(`  ${m.model}: ${m.calls} calls, $${m.cost}`);
    });
  }
}
