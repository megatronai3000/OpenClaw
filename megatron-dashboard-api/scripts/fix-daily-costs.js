#!/usr/bin/env node
/**
 * Fix Daily Costs - Calculate accurate daily spend from deltas
 * 
 * Problem: We're showing "today" as total ever because tracking started
 * mid-period. This calculates proper daily breakdowns.
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', '..', 'megatron-dashboard-api', 'data', 'dashboard.db');

// Moonshot pricing
const PRICING_CNY = { input: 0.012, output: 0.048 };
const CNY_TO_USD = 0.14;
const INPUT_RATIO = 0.7;

function calculateCost(tokens) {
  const inputTokens = tokens * INPUT_RATIO;
  const outputTokens = tokens * (1 - INPUT_RATIO);
  const inputCostCNY = (inputTokens / 1000) * PRICING_CNY.input;
  const outputCostCNY = (outputTokens / 1000) * PRICING_CNY.output;
  return (inputCostCNY + outputCostCNY) * CNY_TO_USD;
}

function fixDailyCosts(dryRun = false) {
  console.log('='.repeat(70));
  console.log('  FIX DAILY COSTS');
  console.log('='.repeat(70));
  console.log(`  Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log('');
  
  const db = new Database(DB_PATH);
  
  // Get ground truth
  const groundTruth = db.prepare("SELECT total_ever FROM cost_ground_truth WHERE id = 'moonshot'").get();
  if (!groundTruth) {
    console.log('❌ No ground truth found. Run moonshot-sync.js first.');
    process.exit(1);
  }
  
  console.log(`📊 Ground Truth: $${groundTruth.total_ever}`);
  
  // Get daily max token usage
  const dailyMax = db.prepare(`
    SELECT 
      date(timestamp) as date,
      MAX(token_usage) as max_tokens
    FROM moonshot_usage_snapshots
    WHERE token_usage > 0
    GROUP BY date(timestamp)
    ORDER BY date(timestamp)
  `).all();
  
  console.log(`\n📅 Found ${dailyMax.length} days of data`);
  
  // Calculate daily deltas and costs
  const dailyCosts = [];
  let runningTotal = 0;
  
  for (let i = 0; i < dailyMax.length; i++) {
    const current = dailyMax[i];
    const previous = dailyMax[i - 1];
    
    // Delta from previous day
    const delta = previous ? current.max_tokens - previous.max_tokens : current.max_tokens;
    const rawCost = calculateCost(Math.max(0, delta));
    
    dailyCosts.push({
      date: current.date,
      maxTokens: current.max_tokens,
      delta: Math.max(0, delta),
      rawCost: rawCost
    });
    
    runningTotal += rawCost;
  }
  
  // Calculate correction factor
  const correctionFactor = runningTotal > 0 ? groundTruth.total_ever / runningTotal : 1;
  console.log(`\n🔧 Correction Factor: ${correctionFactor.toFixed(4)}x`);
  console.log(`   Raw Total: $${runningTotal.toFixed(2)}`);
  console.log(`   Target: $${groundTruth.total_ever}`);
  
  // Apply correction
  console.log('\n📅 Daily Costs (Corrected):');
  console.log('  Date       | Delta Tokens | Raw Cost | Corrected');
  console.log('  ' + '-'.repeat(55));
  
  dailyCosts.forEach(d => {
    d.correctedCost = d.rawCost * correctionFactor;
    console.log(`  ${d.date} | ${d.delta.toString().padStart(12)} | $${d.rawCost.toFixed(2).padStart(8)} | $${d.correctedCost.toFixed(2)}`);
  });
  
  const totalCorrected = dailyCosts.reduce((s, d) => s + d.correctedCost, 0);
  console.log(`\n  Total Corrected: $${totalCorrected.toFixed(2)}`);
  
  if (dryRun) {
    console.log('\n⚠️  DRY RUN - No changes made');
    db.close();
    return;
  }
  
  // Update cost_tracking table
  console.log('\n📝 Updating cost_tracking...');
  
  // Clear existing moonshot entries
  const deleted = db.prepare("DELETE FROM cost_tracking WHERE id LIKE 'moonshot-%'").run().changes;
  console.log(`  Cleared ${deleted} old entries`);
  
  // Insert corrected daily costs
  const insert = db.prepare(`
    INSERT INTO cost_tracking (id, date, sessionName, cost, tokens, model, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  const insertMany = db.transaction((entries) => {
    for (const e of entries) {
      insert.run(
        `moonshot-${e.date}`,
        e.date,
        'moonshot-api',
        e.correctedCost,
        e.delta,
        'moonshot/kimi-k2.5',
        new Date().toISOString()
      );
    }
  });
  
  insertMany(dailyCosts);
  console.log(`  Inserted ${dailyCosts.length} corrected entries`);
  
  // Verify
  const verify = db.prepare(`
    SELECT SUM(cost) as total, COUNT(*) as count 
    FROM cost_tracking 
    WHERE id LIKE 'moonshot-%'
  `).get();
  
  console.log(`\n✅ Verification:`);
  console.log(`   Entries: ${verify.count}`);
  console.log(`   Total: $${verify.total?.toFixed(2)}`);
  console.log(`   Variance: $${(groundTruth.total_ever - (verify.total || 0)).toFixed(4)}`);
  
  db.close();
  console.log('\n' + '='.repeat(70));
  console.log('  COMPLETE');
  console.log('='.repeat(70));
}

// Parse args
const dryRun = process.argv.includes('--dry-run');
fixDailyCosts(dryRun);
