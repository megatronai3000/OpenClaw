#!/usr/bin/env node
// cost-validate.js - Hourly validation that cost logging is working
const { validateRecentLogging, getTodayCost } = require('../cost-middleware');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'dashboard.db');
const LOG_PATH = path.join(__dirname, '..', 'logs', 'cost-validation.log');

// Ensure log directory exists
const logDir = path.dirname(LOG_PATH);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

function log(message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(LOG_PATH, line);
  console.log(line.trim());
}

function validate() {
  log('=== Cost Tracking Validation ===');
  
  // Check 1: Recent logging activity
  const recentStatus = validateRecentLogging(2);
  log(`Recent logging (2h): ${recentStatus.healthy ? '✅ HEALTHY' : '❌ NO DATA'} (${recentStatus.entriesLast2Hours} entries)`);
  
  // Check 2: Today's costs
  const today = getTodayCost();
  log(`Today: $${today.cost.toFixed(4)} | ${today.tokens} tokens | ${today.calls} calls`);
  
  // Check 3: Compare api_usage_detail vs cost_tracking
  try {
    const db = new Database(DB_PATH);
    
    const apiTotal = db.prepare(`
      SELECT ROUND(SUM(estimated_cost), 4) as total, COUNT(*) as count
      FROM api_usage_detail
      WHERE date(timestamp) = date('now')
    `).get();
    
    const costTotal = db.prepare(`
      SELECT ROUND(SUM(cost), 4) as total, COUNT(*) as count
      FROM cost_tracking
      WHERE date = date('now')
      AND sessionName != 'ESTIMATED-recovery'
    `).get();
    
    db.close();
    
    const apiCost = apiTotal.total || 0;
    const trackCost = costTotal.total || 0;
    const variance = Math.abs(apiCost - trackCost);
    
    log(`Table sync check:`);
    log(`  api_usage_detail: $${apiCost} (${apiTotal.count} entries)`);
    log(`  cost_tracking: $${trackCost} (${costTotal.count} entries)`);
    
    if (variance > 0.01) {
      log(`  ⚠️ WARNING: Tables diverged by $${variance.toFixed(4)}`);
    } else {
      log(`  ✅ Tables synchronized`);
    }
  } catch (err) {
    log(`  ❌ ERROR: ${err.message}`);
  }
  
  // Check 4: Estimated data flagging
  try {
    const db = new Database(DB_PATH);
    const estimatedCount = db.prepare(`
      SELECT COUNT(*) as count FROM cost_tracking WHERE sessionName = 'ESTIMATED-recovery'
    `).get();
    db.close();
    
    log(`Recovery data: ${estimatedCount.count} estimated entries flagged`);
  } catch (err) {
    log(`  ❌ ERROR checking recovery data: ${err.message}`);
  }
  
  log('=== Validation Complete ===\n');
  
  // Return exit code for cron jobs
  return recentStatus.healthy ? 0 : 1;
}

// Run validation
const exitCode = validate();
process.exit(exitCode);
