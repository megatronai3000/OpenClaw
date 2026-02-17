// cost-middleware.js - Intercept AI API calls and log usage in real-time
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'dashboard.db');

// Model pricing (per 1M tokens)
const PRICING = {
  'moonshot/kimi-k2.5': { input: 0.50, output: 1.50 },
  'moonshot/kimi-k2-0905-preview': { input: 0.50, output: 1.50 },
  'openai/gpt-4o': { input: 2.50, output: 10.00 },
  'openai/gpt-4o-mini': { input: 0.15, output: 0.60 },
  'google/gemini-2.5-flash-preview': { input: 0.15, output: 0.60 }
};

/**
 * Log an API call with usage data
 * Called automatically after every AI API response
 */
function logAPICall(provider, model, usage, metadata = {}) {
  try {
    const db = new Database(DB_PATH);
    
    const modelKey = `${provider}/${model}`;
    const pricing = PRICING[modelKey] || PRICING['moonshot/kimi-k2.5'];
    
    const inputTokens = usage.input_tokens || usage.prompt_tokens || 0;
    const outputTokens = usage.output_tokens || usage.completion_tokens || 0;
    const totalTokens = inputTokens + outputTokens;
    
    // Calculate cost (per 1M tokens)
    const inputCost = (inputTokens / 1000000) * pricing.input;
    const outputCost = (outputTokens / 1000000) * pricing.output;
    const totalCost = inputCost + outputCost;
    
    const now = new Date();
    const id = uuidv4();
    
    // Insert into api_usage_detail
    db.prepare(`
      INSERT INTO api_usage_detail 
      (id, timestamp, model, input_tokens, output_tokens, total_tokens, estimated_cost, project_id, session_id, endpoint, duration_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      now.toISOString(),
      modelKey,
      inputTokens,
      outputTokens,
      totalTokens,
      totalCost,
      metadata.project_id || 'openclaw',
      metadata.session_id || 'unknown',
      metadata.endpoint || '/v1/chat/completions',
      metadata.duration_ms || 0
    );
    
    // Insert into cost_tracking for dashboard
    db.prepare(`
      INSERT INTO cost_tracking (id, date, sessionName, cost, tokens, model, createdAt)
      VALUES (?, date('now'), ?, ?, ?, ?, ?)
    `).run(
      'api-' + id,
      metadata.sessionName || modelKey,
      totalCost,
      totalTokens,
      modelKey,
      now.toISOString()
    );
    
    db.close();
    
    console.log(`[CostMiddleware] ✅ ${modelKey} | ${inputTokens}+${outputTokens} tokens | $${totalCost.toFixed(4)}`);
    
    return { id, cost: totalCost, tokens: totalTokens };
  } catch (err) {
    console.error('[CostMiddleware] Failed to log:', err.message);
    return null;
  }
}

/**
 * Extract usage from different provider response formats
 */
function extractUsage(provider, response) {
  if (!response) return null;
  
  // Moonshot format
  if (provider === 'moonshot' || provider === 'kimi') {
    return {
      input_tokens: response.usage?.input_tokens || 0,
      output_tokens: response.usage?.output_tokens || 0
    };
  }
  
  // OpenAI format
  if (provider === 'openai') {
    return {
      input_tokens: response.usage?.prompt_tokens || 0,
      output_tokens: response.usage?.completion_tokens || 0
    };
  }
  
  // Google/Gemini format
  if (provider === 'google' || provider === 'gemini') {
    return {
      input_tokens: response.usageMetadata?.promptTokenCount || 0,
      output_tokens: response.usageMetadata?.candidatesTokenCount || 0
    };
  }
  
  return null;
}

/**
 * Middleware wrapper for OpenAI SDK
 */
function wrapOpenAI(openaiInstance, metadata = {}) {
  const originalCreate = openaiInstance.chat.completions.create.bind(openaiInstance.chat.completions);
  
  openaiInstance.chat.completions.create = async function(...args) {
    const startTime = Date.now();
    const response = await originalCreate(...args);
    const duration = Date.now() - startTime;
    
    const usage = extractUsage('openai', response);
    if (usage) {
      logAPICall('openai', args[0].model, usage, {
        ...metadata,
        duration_ms: duration,
        endpoint: '/v1/chat/completions'
      });
    }
    
    return response;
  };
  
  return openaiInstance;
}

/**
 * Get today's cost summary
 */
function getTodayCost() {
  try {
    const db = new Database(DB_PATH);
    const result = db.prepare(`
      SELECT 
        ROUND(SUM(estimated_cost), 4) as total_cost,
        SUM(total_tokens) as total_tokens,
        COUNT(*) as calls,
        GROUP_CONCAT(DISTINCT model) as models_used
      FROM api_usage_detail
      WHERE date(timestamp) = date('now')
    `).get();
    db.close();
    
    return {
      cost: result.total_cost || 0,
      tokens: result.total_tokens || 0,
      calls: result.calls || 0,
      models: result.models_used?.split(',') || []
    };
  } catch (err) {
    console.error('[CostMiddleware] Failed to get today cost:', err.message);
    return { cost: 0, tokens: 0, calls: 0, models: [] };
  }
}

/**
 * Validation check - has data been logged recently?
 */
function validateRecentLogging(hours = 2) {
  try {
    const db = new Database(DB_PATH);
    const result = db.prepare(`
      SELECT COUNT(*) as count
      FROM api_usage_detail
      WHERE timestamp >= datetime('now', '-${hours} hours')
    `).get();
    db.close();
    
    return {
      healthy: result.count > 0,
      entriesLast2Hours: result.count,
      message: result.count > 0 ? 'Logging active' : 'No entries in last 2 hours - logging may be broken'
    };
  } catch (err) {
    return { healthy: false, error: err.message };
  }
}

module.exports = {
  logAPICall,
  extractUsage,
  wrapOpenAI,
  getTodayCost,
  validateRecentLogging
};

// Run validation if called directly
if (require.main === module) {
  const status = validateRecentLogging();
  console.log('Cost Logging Status:', status);
  
  const today = getTodayCost();
  console.log('Today:', today);
}
