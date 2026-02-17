#!/usr/bin/env node
/**
 * Cost Reconciliation Script
 * 
 * Compares dashboard DB cost data with Moonshot API usage data
 * Identifies discrepancies and generates reconciliation reports
 * 
 * Usage: node cost-reconcile.js [--fix] [--report] [--verbose]
 */

const path = require('path');
const fs = require('fs');

// Try to load better-sqlite3 from multiple locations
let Database;
try {
  Database = require('better-sqlite3');
} catch (e) {
  try {
    Database = require(path.join(__dirname, '..', '..', 'megatron-dashboard-api', 'node_modules', 'better-sqlite3'));
  } catch (e2) {
    console.error('❌ Failed to load better-sqlite3. Please run: npm install better-sqlite3');
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const shouldFix = args.includes('--fix');
const generateReport = args.includes('--report');
const verbose = args.includes('--verbose');
const outputJson = args.includes('--json');

// Database path - try multiple locations
const POSSIBLE_DB_PATHS = [
  path.join(__dirname, '..', '..', 'megatron-dashboard-api', 'data', 'dashboard.db'),
  path.join(__dirname, '..', 'megatron-dashboard-api', 'data', 'dashboard.db'),
  path.join(process.cwd(), 'data', 'dashboard.db'),
  '/Users/openclaw-megatron/.openclaw/workspace/megatron-dashboard-api/data/dashboard.db'
];

const POSSIBLE_REPORT_DIRS = [
  path.join(__dirname, '..', '..', 'megatron-dashboard-api', 'data', 'reports'),
  path.join(__dirname, '..', 'megatron-dashboard-api', 'data', 'reports'),
  path.join(process.cwd(), 'data', 'reports')
];

// Find existing database
let DB_PATH = POSSIBLE_DB_PATHS.find(p => fs.existsSync(p));
if (!DB_PATH) {
  DB_PATH = POSSIBLE_DB_PATHS[0]; // Default to first option
}

// Find or create report directory
let REPORT_DIR = POSSIBLE_REPORT_DIRS.find(p => {
  try {
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
    return true;
  } catch (e) {
    return false;
  }
});
if (!REPORT_DIR) {
  REPORT_DIR = path.join(process.cwd(), 'reports');
}

// Ensure report directory exists
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

// Initialize database connection
let db;
try {
  db = new Database(DB_PATH, { readonly: !shouldFix });
  console.log('✅ Connected to database:', DB_PATH);
} catch (err) {
  console.error('❌ Failed to connect to database:', err.message);
  process.exit(1);
}

// Model pricing for reference (per 1M tokens)
const MODEL_PRICING = {
  'moonshot/kimi-k2-5': { input: 0.50, output: 1.50, name: 'Kimi K2.5' },
  'moonshot/kimi-k2': { input: 0.30, output: 1.20, name: 'Kimi K2' },
  'openai/gpt-4o': { input: 2.50, output: 10.00, name: 'GPT-4o' },
  'openai/gpt-4o-mini': { input: 0.15, output: 0.60, name: 'GPT-4o Mini' },
  'anthropic/claude-opus-4': { input: 15.00, output: 75.00, name: 'Claude Opus 4' },
  'anthropic/claude-sonnet-4': { input: 3.00, output: 15.00, name: 'Claude Sonnet 4' },
  'google/gemini-2.5-flash': { input: 0.15, output: 0.60, name: 'Gemini 2.5 Flash' },
  'google/gemini-2.5-pro': { input: 1.25, output: 10.00, name: 'Gemini 2.5 Pro' },
  'qwen/qwen3-235b': { input: 0.50, output: 1.50, name: 'Qwen3 235B' },
  'sync': { input: 0, output: 0, name: 'Sync Entry (No Tokens)' }
};

/**
 * Get cost tracking data from dashboard DB
 */
function getCostTrackingData() {
  const data = db.prepare(`
    SELECT 
      id,
      date,
      sessionName,
      cost,
      tokens,
      model,
      createdAt
    FROM cost_tracking
    ORDER BY createdAt DESC
  `).all();

  const summary = db.prepare(`
    SELECT 
      COUNT(*) as count,
      SUM(cost) as total,
      AVG(cost) as average,
      MIN(cost) as min,
      MAX(cost) as max,
      COUNT(DISTINCT sessionName) as unique_sessions,
      COUNT(DISTINCT date) as unique_days
    FROM cost_tracking
  `).get();

  const bySession = db.prepare(`
    SELECT 
      sessionName,
      COUNT(*) as entries,
      SUM(cost) as total,
      AVG(cost) as avg_cost,
      SUM(tokens) as total_tokens,
      MIN(date) as first_seen,
      MAX(date) as last_seen
    FROM cost_tracking
    GROUP BY sessionName
    ORDER BY total DESC
  `).all();

  const byDate = db.prepare(`
    SELECT 
      date,
      COUNT(*) as entries,
      SUM(cost) as total,
      SUM(tokens) as tokens
    FROM cost_tracking
    GROUP BY date
    ORDER BY date DESC
    LIMIT 30
  `).all();

  const suspicious = data.filter(row => {
    // Flag entries with no tokens but high cost
    const noTokens = !row.tokens || row.tokens === 0;
    const highCost = row.cost > 1.0;
    const isSync = row.sessionName === 'daily-sync';
    return (noTokens && highCost) || isSync;
  });

  return { data, summary, bySession, byDate, suspicious };
}

/**
 * Get API usage detail data (ground truth)
 */
function getApiUsageData() {
  const data = db.prepare(`
    SELECT 
      id,
      timestamp,
      model,
      input_tokens,
      output_tokens,
      total_tokens,
      estimated_cost,
      project_id,
      session_id,
      endpoint,
      duration_ms
    FROM api_usage_detail
    ORDER BY timestamp DESC
  `).all();

  const summary = db.prepare(`
    SELECT 
      COUNT(*) as count,
      SUM(estimated_cost) as total,
      AVG(estimated_cost) as average,
      SUM(input_tokens) as total_input,
      SUM(output_tokens) as total_output,
      SUM(total_tokens) as total_tokens,
      AVG(duration_ms) as avg_duration
    FROM api_usage_detail
  `).get();

  const byModel = db.prepare(`
    SELECT 
      model,
      COUNT(*) as calls,
      SUM(estimated_cost) as total_cost,
      SUM(input_tokens) as input_tokens,
      SUM(output_tokens) as output_tokens,
      AVG(estimated_cost) as avg_cost_per_call
    FROM api_usage_detail
    GROUP BY model
    ORDER BY total_cost DESC
  `).all();

  const byDate = db.prepare(`
    SELECT 
      date(timestamp) as date,
      COUNT(*) as calls,
      SUM(estimated_cost) as total,
      SUM(total_tokens) as tokens
    FROM api_usage_detail
    GROUP BY date(timestamp)
    ORDER BY date DESC
    LIMIT 30
  `).all();

  return { data, summary, byModel, byDate };
}

/**
 * Calculate expected cost from token counts
 */
function calculateExpectedCost(model, inputTokens, outputTokens) {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['moonshot/kimi-k2-5'];
  const inputCost = (inputTokens || 0) / 1000000 * pricing.input;
  const outputCost = (outputTokens || 0) / 1000000 * pricing.output;
  return inputCost + outputCost;
}

/**
 * Perform reconciliation analysis
 */
function reconcileData(costData, apiData) {
  const discrepancies = [];
  const warnings = [];
  const insights = [];

  // 1. Compare totals
  const costTotal = costData.summary.total || 0;
  const apiTotal = apiData.summary.total || 0;
  const difference = costTotal - apiTotal;
  const inflationRatio = apiTotal > 0 ? (costTotal / apiTotal).toFixed(2) : 'N/A';

  if (Math.abs(difference) > 0.01) {
    discrepancies.push({
      type: 'TOTAL_MISMATCH',
      severity: difference > 1 ? 'CRITICAL' : 'WARNING',
      message: `Cost tracking total ($${costTotal.toFixed(4)}) differs from API usage total ($${apiTotal.toFixed(4)})`,
      difference: difference.toFixed(4),
      inflationRatio: inflationRatio,
      explanation: difference > 0 
        ? 'Cost tracking is OVER-REPORTING. Possible duplicate entries or incorrect cost calculations.'
        : 'Cost tracking is UNDER-REPORTING. Some API calls may not be captured.'
    });
  }

  // 2. Check for entries with no token data
  const noTokenEntries = costData.data.filter(row => !row.tokens && row.cost > 0);
  if (noTokenEntries.length > 0) {
    const noTokenTotal = noTokenEntries.reduce((sum, row) => sum + row.cost, 0);
    discrepancies.push({
      type: 'MISSING_TOKEN_DATA',
      severity: noTokenTotal > 1 ? 'CRITICAL' : 'WARNING',
      message: `${noTokenEntries.length} cost entries have no token data`,
      affectedCost: noTokenTotal.toFixed(4),
      entries: noTokenEntries.slice(0, 5).map(e => ({
        id: e.id,
        session: e.sessionName,
        cost: e.cost,
        date: e.date
      }))
    });
  }

  // 3. Check for duplicate entries
  const duplicates = findDuplicates(costData.data);
  if (duplicates.length > 0) {
    const duplicateTotal = duplicates.reduce((sum, d) => sum + d.cost, 0);
    discrepancies.push({
      type: 'DUPLICATE_ENTRIES',
      severity: duplicateTotal > 1 ? 'HIGH' : 'MEDIUM',
      message: `Found ${duplicates.length} potential duplicate entries`,
      duplicateCost: duplicateTotal.toFixed(4),
      examples: duplicates.slice(0, 3)
    });
  }

  // 4. Analyze suspicious patterns
  const syncEntries = costData.data.filter(row => row.sessionName === 'daily-sync');
  if (syncEntries.length > 0) {
    const syncTotal = syncEntries.reduce((sum, row) => sum + row.cost, 0);
    discrepancies.push({
      type: 'SUSPICIOUS_PATTERN',
      severity: syncTotal > 10 ? 'CRITICAL' : 'HIGH',
      message: `Found ${syncEntries.length} 'daily-sync' entries totaling $${syncTotal.toFixed(2)}`,
      pattern: 'daily-sync',
      count: syncEntries.length,
      totalCost: syncTotal.toFixed(4),
      averageCost: (syncTotal / syncEntries.length).toFixed(4),
      recommendation: 'These entries lack token validation and may be inflated. Review the sync job cost calculation.'
    });
  }

  // 5. Check for high-cost outliers
  const avgCost = costData.summary.average || 0;
  const outliers = costData.data.filter(row => row.cost > avgCost * 5 && row.cost > 1);
  if (outliers.length > 0) {
    warnings.push({
      type: 'HIGH_COST_OUTLIERS',
      message: `${outliers.length} entries have unusually high costs (>5x average)`,
      threshold: (avgCost * 5).toFixed(4),
      outliers: outliers.slice(0, 5).map(o => ({
        session: o.sessionName,
        cost: o.cost,
        date: o.date,
        model: o.model
      }))
    });
  }

  // 6. Verify model pricing consistency
  apiData.byModel.forEach(modelData => {
    const expectedPricing = MODEL_PRICING[modelData.model];
    if (!expectedPricing) {
      warnings.push({
        type: 'UNKNOWN_MODEL',
        message: `Model "${modelData.model}" not found in pricing table`,
        model: modelData.model,
        totalCost: modelData.total_cost
      });
    }
  });

  // 7. Calculate daily burn rate and projection
  const today = new Date().toISOString().split('T')[0];
  const currentMonth = today.substring(0, 7); // YYYY-MM
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const currentDay = new Date().getDate();

  const monthlyCost = costData.byDate
    .filter(d => d.date.startsWith(currentMonth))
    .reduce((sum, d) => sum + d.total, 0);

  const dailyBurnRate = currentDay > 1 ? monthlyCost / currentDay : monthlyCost;
  const projectedMonthEnd = dailyBurnRate * daysInMonth;

  insights.push({
    type: 'BURN_RATE',
    dailyBurnRate: dailyBurnRate.toFixed(4),
    projectedMonthEnd: projectedMonthEnd.toFixed(2),
    daysElapsed: currentDay,
    daysRemaining: daysInMonth - currentDay
  });

  // 8. Cost per token analysis
  const totalTokens = apiData.summary.total_tokens || 1;
  const costPer1kTokens = (apiData.summary.total || 0) / (totalTokens / 1000);
  
  insights.push({
    type: 'EFFICIENCY',
    costPer1kTokens: costPer1kTokens.toFixed(6),
    avgTokensPerCall: (apiData.summary.total_tokens / (apiData.summary.count || 1)).toFixed(0),
    avgCostPerCall: (apiData.summary.average || 0).toFixed(6)
  });

  return {
    summary: {
      costTrackingTotal: costTotal.toFixed(4),
      apiUsageTotal: apiTotal.toFixed(4),
      difference: difference.toFixed(4),
      inflationRatio: inflationRatio,
      status: Math.abs(difference) < 0.01 ? 'RECONCILED' : difference > 1 ? 'CRITICAL' : 'WARNING'
    },
    discrepancies,
    warnings,
    insights,
    recommendations: generateRecommendations(discrepancies, warnings, insights)
  };
}

/**
 * Find potential duplicate entries
 */
function findDuplicates(data) {
  const seen = new Map();
  const duplicates = [];

  data.forEach(row => {
    // Create a signature based on session, cost, and date (ignoring time)
    const signature = `${row.sessionName}|${row.cost}|${row.date}`;
    
    if (seen.has(signature)) {
      duplicates.push({
        original: seen.get(signature),
        duplicate: row,
        signature,
        cost: row.cost
      });
    } else {
      seen.set(signature, row);
    }
  });

  return duplicates;
}

/**
 * Generate actionable recommendations
 */
function generateRecommendations(discrepancies, warnings, insights) {
  const recommendations = [];

  // Check for critical issues
  const hasInflation = discrepancies.some(d => d.type === 'SUSPICIOUS_PATTERN' || d.type === 'TOTAL_MISMATCH');
  const hasMissingTokens = discrepancies.some(d => d.type === 'MISSING_TOKEN_DATA');
  const hasDuplicates = discrepancies.some(d => d.type === 'DUPLICATE_ENTRIES');

  if (hasInflation) {
    recommendations.push({
      priority: 'CRITICAL',
      action: 'Review and fix cost calculation in sync jobs',
      details: 'The "daily-sync" entries are inflating costs without token validation. Consider removing or correcting these entries.',
      potentialSavings: 'High - could reduce reported costs by ~90%'
    });
  }

  if (hasMissingTokens) {
    recommendations.push({
      priority: 'HIGH',
      action: 'Add token tracking to all cost entries',
      details: 'Entries without token data cannot be validated. Ensure all cost tracking includes input/output token counts.',
      potentialSavings: 'Medium - improves accuracy and auditability'
    });
  }

  if (hasDuplicates) {
    recommendations.push({
      priority: 'HIGH',
      action: 'Implement deduplication in cost tracking API',
      details: 'Add unique constraints or check for existing entries before insertion.',
      potentialSavings: 'Medium - eliminates double-counting'
    });
  }

  // Efficiency recommendations
  const efficiencyInsight = insights.find(i => i.type === 'EFFICIENCY');
  if (efficiencyInsight) {
    const costPer1k = parseFloat(efficiencyInsight.costPer1kTokens);
    if (costPer1k > 0.01) {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'Consider using more cost-effective models for routine tasks',
        details: `Current cost is $${costPer1k.toFixed(4)} per 1K tokens. Switching to GPT-4o-mini or Gemini Flash could reduce costs by 50-80%.`,
        potentialSavings: '50-80% on routine tasks'
      });
    }
  }

  // Budget recommendations
  const burnRateInsight = insights.find(i => i.type === 'BURN_RATE');
  if (burnRateInsight) {
    const projected = parseFloat(burnRateInsight.projectedMonthEnd);
    if (projected > 50) {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'Set up budget alerts and daily spending limits',
        details: `Projected monthly spend is $${projected.toFixed(2)}. Consider implementing daily budget caps and automated alerts at 75%, 90%, and 100% thresholds.`,
        potentialSavings: 'Prevents budget overruns through early warning'
      });
    }
  }

  recommendations.push({
    priority: 'LOW',
    action: 'Regular reconciliation audits',
    details: 'Run this reconciliation script weekly to catch discrepancies early.',
    potentialSavings: 'Early detection of cost anomalies'
  });

  return recommendations;
}

/**
 * Fix identified issues (if --fix flag is set)
 */
function fixIssues(reconciliation) {
  if (!shouldFix) return { fixed: false, message: 'Use --fix to apply corrections' };

  const fixes = [];

  // Fix 1: Remove duplicate entries
  const dupDiscrepancy = reconciliation.discrepancies.find(d => d.type === 'DUPLICATE_ENTRIES');
  if (dupDiscrepancy) {
    const deleteStmt = db.prepare('DELETE FROM cost_tracking WHERE id = ?');
    let removedCount = 0;
    
    dupDiscrepancy.examples.forEach(dup => {
      if (dup.duplicate) {
        deleteStmt.run(dup.duplicate.id);
        removedCount++;
      }
    });

    fixes.push({
      type: 'DUPLICATES_REMOVED',
      count: removedCount,
      message: `Removed ${removedCount} duplicate entries`
    });
  }

  // Fix 2: Flag suspicious entries for review
  const suspicious = reconciliation.discrepancies.find(d => d.type === 'SUSPICIOUS_PATTERN');
  if (suspicious) {
    // Instead of deleting, we flag them
    const updateStmt = db.prepare(`
      UPDATE cost_tracking 
      SET model = 'FLAGGED_FOR_REVIEW' 
      WHERE sessionName = 'daily-sync' AND model IS NULL
    `);
    const result = updateStmt.run();
    
    fixes.push({
      type: 'ENTRIES_FLAGGED',
      count: result.changes,
      message: `Flagged ${result.changes} suspicious entries for manual review`
    });
  }

  return { fixed: true, fixes };
}

/**
 * Generate reconciliation report
 */
function generateReportFile(reconciliation) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(REPORT_DIR, `reconciliation-${timestamp}.json`);
  
  const report = {
    generatedAt: new Date().toISOString(),
    database: DB_PATH,
    reconciliation,
    metadata: {
      scriptVersion: '1.0.0',
      options: { shouldFix, generateReport, verbose }
    }
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Report saved to: ${reportPath}`);
  
  return reportPath;
}

/**
 * Print formatted console output
 */
function printResults(reconciliation) {
  console.log('\n' + '='.repeat(70));
  console.log('  COST RECONCILIATION REPORT');
  console.log('='.repeat(70));

  // Summary
  console.log('\n📊 SUMMARY');
  console.log('-'.repeat(70));
  console.log(`  Cost Tracking Total:  $${reconciliation.summary.costTrackingTotal}`);
  console.log(`  API Usage Total:      $${reconciliation.summary.apiUsageTotal}`);
  console.log(`  Difference:           $${reconciliation.summary.difference}`);
  console.log(`  Inflation Ratio:      ${reconciliation.summary.inflationRatio}x`);
  console.log(`  Status:               ${reconciliation.summary.status}`);

  // Discrepancies
  if (reconciliation.discrepancies.length > 0) {
    console.log('\n⚠️  DISCREPANCIES FOUND');
    console.log('-'.repeat(70));
    reconciliation.discrepancies.forEach((d, i) => {
      const icon = d.severity === 'CRITICAL' ? '🔴' : d.severity === 'HIGH' ? '🟠' : '🟡';
      console.log(`\n  ${icon} [${d.severity}] ${d.type}`);
      console.log(`     ${d.message}`);
      if (d.recommendation) {
        console.log(`     💡 ${d.recommendation}`);
      }
      if (verbose && d.entries) {
        console.log(`     Entries: ${JSON.stringify(d.entries, null, 2)}`);
      }
    });
  }

  // Warnings
  if (reconciliation.warnings.length > 0) {
    console.log('\n⚡ WARNINGS');
    console.log('-'.repeat(70));
    reconciliation.warnings.forEach(w => {
      console.log(`  🟡 ${w.type}: ${w.message}`);
    });
  }

  // Insights
  if (reconciliation.insights.length > 0) {
    console.log('\n💡 INSIGHTS');
    console.log('-'.repeat(70));
    reconciliation.insights.forEach(i => {
      if (i.type === 'BURN_RATE') {
        console.log(`  📈 Daily Burn Rate: $${i.dailyBurnRate}`);
        console.log(`     Projected Month-End: $${i.projectedMonthEnd}`);
        console.log(`     Days Remaining: ${i.daysRemaining}`);
      } else if (i.type === 'EFFICIENCY') {
        console.log(`  💰 Cost per 1K Tokens: $${i.costPer1kTokens}`);
        console.log(`     Avg Tokens per Call: ${i.avgTokensPerCall}`);
        console.log(`     Avg Cost per Call: $${i.avgCostPerCall}`);
      }
    });
  }

  // Recommendations
  console.log('\n🎯 RECOMMENDATIONS');
  console.log('-'.repeat(70));
  reconciliation.recommendations.forEach((r, i) => {
    const icon = r.priority === 'CRITICAL' ? '🔴' : r.priority === 'HIGH' ? '🟠' : r.priority === 'MEDIUM' ? '🟡' : '🔵';
    console.log(`\n  ${icon} [${r.priority}] ${r.action}`);
    console.log(`     ${r.details}`);
    console.log(`     Potential Savings: ${r.potentialSavings}`);
  });

  console.log('\n' + '='.repeat(70));
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Starting Cost Reconciliation...\n');

  // Fetch data
  const costData = getCostTrackingData();
  const apiData = getApiUsageData();

  if (verbose) {
    console.log(`📊 Found ${costData.summary.count} cost tracking entries`);
    console.log(`📊 Found ${apiData.summary.count} API usage entries`);
  }

  // Perform reconciliation
  const reconciliation = reconcileData(costData, apiData);

  // Print results
  printResults(reconciliation);

  // Fix issues if requested
  const fixResults = fixIssues(reconciliation);
  if (fixResults.fixed) {
    console.log('\n🔧 FIXES APPLIED:');
    fixResults.fixes.forEach(f => {
      console.log(`  ✓ ${f.message}`);
    });
  }

  // Generate report file
  let reportPath;
  if (generateReport) {
    reportPath = generateReportFile(reconciliation);
  }

  // JSON output for piping
  if (outputJson) {
    console.log(JSON.stringify({
      reconciliation,
      fixes: fixResults,
      reportPath
    }, null, 2));
  }

  // Exit with appropriate code
  const exitCode = reconciliation.summary.status === 'RECONCILED' ? 0 : 1;
  process.exit(exitCode);
}

// Run main
main();
