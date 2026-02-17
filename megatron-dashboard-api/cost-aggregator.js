// cost-aggregator.js - Properly aggregate costs by day and agent
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'dashboard.db');

/**
 * Get daily costs from Moonshot snapshots (filtering out bad data)
 */
function getDailyMoonshotCosts() {
  const db = new Database(DB_PATH);
  
  try {
    // Get max token usage per day (filter out the 0s and inconsistencies)
    const dailyMax = db.prepare(`
      SELECT 
        date(timestamp) as date,
        MAX(token_usage) as max_tokens,
        MAX(estimated_cost_usd) as max_cost
      FROM moonshot_usage_snapshots
      WHERE token_usage > 100000  -- Filter out 0/bad readings
      GROUP BY date(timestamp)
      ORDER BY date(timestamp) DESC
      LIMIT 30
    `).all();
    
    // Calculate deltas between days
    const results = [];
    for (let i = 0; i < dailyMax.length; i++) {
      const current = dailyMax[i];
      const prev = dailyMax[i + 1];
      
      const tokenDelta = prev ? current.max_tokens - prev.max_tokens : current.max_tokens;
      const cost = tokenDelta > 0 ? (tokenDelta / 1000000 * 6.4) : 0; // Rough cost estimate
      
      results.push({
        date: current.date,
        tokens: current.max_tokens,
        tokenDelta: Math.max(0, tokenDelta),
        costUSD: cost,
        source: 'moonshot'
      });
    }
    
    return results;
  } finally {
    db.close();
  }
}

/**
 * Get costs by agent from decisions and work completed
 */
function getCostsByAgent() {
  const db = new Database(DB_PATH);
  
  try {
    // Get from cost_tracking with agent-like session names
    const bySession = db.prepare(`
      SELECT 
        sessionName,
        SUM(cost) as total,
        COUNT(*) as calls
      FROM cost_tracking
      WHERE sessionName NOT LIKE 'ESTIMATE%'
        AND sessionName != 'ESTIMATED-recovery'
        AND sessionName NOT LIKE 'sess-%'
      GROUP BY sessionName
      ORDER BY total DESC
    `).all();
    
    // Map session names to agents
    const agentMap = {
      'megatron': 'Megatron',
      'petty': 'Petty',
      'scout': 'Scout',
      'architect': 'Architect',
      'openai': 'OpenAI',
      'moonshot': 'Moonshot',
      'kimi': 'Kimi'
    };
    
    // Aggregate by agent
    const byAgent = {};
    bySession.forEach(row => {
      const session = row.sessionName.toLowerCase();
      let agent = 'Other';
      
      for (const [key, name] of Object.entries(agentMap)) {
        if (session.includes(key)) {
          agent = name;
          break;
        }
      }
      
      if (!byAgent[agent]) {
        byAgent[agent] = { total: 0, calls: 0, sessions: [] };
      }
      byAgent[agent].total += row.total;
      byAgent[agent].calls += row.calls;
      byAgent[agent].sessions.push(row.sessionName);
    });
    
    // Get decisions for agent attribution
    const decisionsDir = path.join(process.env.HOME, '.openclaw', 'shared-context', 'decisions');
    let decisionAgents = {};
    
    try {
      const fs = require('fs');
      if (fs.existsSync(decisionsDir)) {
        const files = fs.readdirSync(decisionsDir).filter(f => f.endsWith('.md'));
        files.forEach(file => {
          const content = fs.readFileSync(path.join(decisionsDir, file), 'utf8');
          const agentMatch = content.match(/\*\*Agent:\*\*\s*(.+)/i);
          if (agentMatch) {
            const agent = agentMatch[1].trim();
            decisionAgents[agent] = (decisionAgents[agent] || 0) + 1;
          }
        });
      }
    } catch (e) {
      // Ignore file system errors
    }
    
    return {
      byAgent: Object.entries(byAgent).map(([name, data]) => ({
        name,
        totalUSD: data.total,
        calls: data.calls,
        avgPerCall: data.calls > 0 ? data.total / data.calls : 0
      })),
      decisionsByAgent: decisionAgents
    };
  } finally {
    db.close();
  }
}

/**
 * Get proper daily trend (last 7 days)
 */
function getDailyTrend() {
  const db = new Database(DB_PATH);
  
  try {
    // Combine actual moonshot costs with our tracking
    const moonshotDaily = getDailyMoonshotCosts();
    
    // Get our tracked costs as backup
    const tracked = db.prepare(`
      SELECT 
        date,
        SUM(cost) as total,
        COUNT(*) as calls
      FROM cost_tracking
      WHERE sessionName NOT LIKE 'ESTIMATE%'
      GROUP BY date
      ORDER BY date DESC
      LIMIT 7
    `).all();
    
    // Merge sources (prefer moonshot if available)
    const merged = {};
    
    moonshotDaily.forEach(day => {
      merged[day.date] = {
        date: day.date,
        actual: day.costUSD,
        tokens: day.tokens,
        source: 'moonshot-api'
      };
    });
    
    tracked.forEach(day => {
      if (!merged[day.date]) {
        merged[day.date] = {
          date: day.date,
          actual: day.total,
          tokens: null,
          source: 'local-tracking'
        };
      }
    });
    
    return Object.values(merged).sort((a, b) => new Date(a.date) - new Date(b.date));
  } finally {
    db.close();
  }
}

/**
 * Get today's accurate cost
 */
function getTodayCost() {
  const db = new Database(DB_PATH);
  
  try {
    // Get max tokens today
    const todayMax = db.prepare(`
      SELECT MAX(token_usage) as max_tokens, MAX(estimated_cost_usd) as max_cost
      FROM moonshot_usage_snapshots
      WHERE date(timestamp) = date('now')
      AND token_usage > 100000
    `).get();
    
    // Get yesterday's max for delta
    const yesterdayMax = db.prepare(`
      SELECT MAX(token_usage) as max_tokens
      FROM moonshot_usage_snapshots
      WHERE date(timestamp) = date('now', '-1 day')
      AND token_usage > 100000
    `).get();
    
    const todayTokens = todayMax?.max_tokens || 0;
    const yesterdayTokens = yesterdayMax?.max_tokens || 0;
    const tokenDelta = Math.max(0, todayTokens - yesterdayTokens);
    
    // Cost calculation: ¥0.012/1K input + ¥0.048/1K output, assume 70/30 split
    const inputCost = (tokenDelta * 0.7 / 1000) * 0.012;
    const outputCost = (tokenDelta * 0.3 / 1000) * 0.048;
    const totalCNY = inputCost + outputCost;
    const totalUSD = totalCNY * 0.14; // Approximate exchange rate
    
    return {
      tokens: todayTokens,
      tokenDelta,
      costUSD: totalUSD,
      costCNY: totalCNY,
      source: 'moonshot-api',
      reliability: tokenDelta > 0 ? 'high' : 'low'
    };
  } finally {
    db.close();
  }
}

module.exports = {
  getDailyMoonshotCosts,
  getCostsByAgent,
  getDailyTrend,
  getTodayCost
};

// Run if called directly
if (require.main === module) {
  console.log('=== Today Cost ===');
  console.log(getTodayCost());
  
  console.log('\n=== Daily Trend ===');
  console.log(getDailyTrend());
  
  console.log('\n=== By Agent ===');
  console.log(getCostsByAgent());
}
