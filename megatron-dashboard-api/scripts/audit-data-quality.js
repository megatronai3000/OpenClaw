#!/usr/bin/env node
/**
 * Audit Dashboard Data Quality
 * 
 * Scans all cost-related tables and flags fake/simulated/stale data.
 * Generates a report showing what's real vs estimated.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', '..', 'megatron-dashboard-api', 'data', 'dashboard.db');

function auditDataQuality() {
  console.log('='.repeat(70));
  console.log('  DATA QUALITY AUDIT');
  console.log('='.repeat(70));
  
  const db = new Database(DB_PATH);
  const report = {
    timestamp: new Date().toISOString(),
    tables: {},
    summary: {
      totalReal: 0,
      totalFake: 0,
      totalUnknown: 0
    }
  };
  
  // Get first real API sync date
  const firstSync = db.prepare(`
    SELECT MIN(timestamp) as first_sync 
    FROM moonshot_usage_snapshots 
    WHERE token_usage > 0
  `).get();
  
  const firstSyncDate = firstSync?.first_sync 
    ? firstSync.first_sync.split('T')[0] 
    : '9999-12-31';
  
  console.log(`\n📅 First API sync: ${firstSyncDate}`);
  
  // Audit cost_tracking table
  console.log('\n--- cost_tracking ---');
  const costEntries = db.prepare(`
    SELECT id, date, sessionName, cost, createdAt
    FROM cost_tracking
    ORDER BY date DESC
  `).all();
  
  const costQuality = costEntries.map(e => {
    let quality = 'UNKNOWN';
    let reason = '';
    
    if (e.id.includes('ESTIMATE') || e.sessionName?.includes('ESTIMATE')) {
      quality = 'FAKE';
      reason = 'Marked as estimate';
    } else if (e.id.startsWith('moonshot-')) {
      quality = 'REAL';
      reason = 'From API with ground truth correction';
    } else if (e.date < firstSyncDate) {
      quality = 'FAKE';
      reason = 'Before first API sync';
    } else if (e.cost === 0) {
      quality = 'FAKE';
      reason = 'Zero cost';
    } else {
      quality = 'PARTIAL';
      reason = 'Uncertain provenance';
    }
    
    return { ...e, quality, reason };
  });
  
  costQuality.forEach(e => {
    const icon = e.quality === 'REAL' ? '✅' : e.quality === 'FAKE' ? '❌' : '⚠️';
    console.log(`  ${icon} ${e.date} | $${e.cost?.toFixed(2)?.padStart(6)} | ${e.quality.padEnd(8)} | ${e.reason}`);
  });
  
  report.tables.cost_tracking = {
    total: costQuality.length,
    real: costQuality.filter(e => e.quality === 'REAL').length,
    fake: costQuality.filter(e => e.quality === 'FAKE').length,
    partial: costQuality.filter(e => e.quality === 'PARTIAL').length,
    entries: costQuality.slice(0, 20) // Top 20 for report
  };
  
  // Audit moonshot_usage_snapshots
  console.log('\n--- moonshot_usage_snapshots ---');
  const snapshotStats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN token_usage > 0 THEN 1 ELSE 0 END) as with_data,
      SUM(CASE WHEN delta_from_previous > 0 THEN 1 ELSE 0 END) as with_deltas,
      SUM(CASE WHEN estimated_cost_usd > 0 THEN 1 ELSE 0 END) as with_costs
    FROM moonshot_usage_snapshots
  `).get();
  
  console.log(`  Total snapshots: ${snapshotStats.total}`);
  console.log(`  With token data: ${snapshotStats.with_data} ✅`);
  console.log(`  With deltas: ${snapshotStats.with_deltas} ✅`);
  console.log(`  With costs: ${snapshotStats.with_costs} ✅`);
  
  const snapshotQuality = snapshotStats.total > 0 && snapshotStats.with_data > 0 
    ? 'REAL' 
    : 'FAKE';
  
  report.tables.moonshot_usage_snapshots = {
    quality: snapshotQuality,
    stats: snapshotStats
  };
  
  // Audit ground truth
  console.log('\n--- cost_ground_truth ---');
  const groundTruth = db.prepare(`SELECT * FROM cost_ground_truth`).all();
  
  if (groundTruth.length === 0) {
    console.log('  ❌ NO GROUND TRUTH SET');
    console.log('  Run: node moonshot-sync.js to set ground truth');
    report.tables.cost_ground_truth = { quality: 'FAKE', reason: 'No ground truth data' };
  } else {
    groundTruth.forEach(gt => {
      const age = (new Date() - new Date(gt.updated_at)) / (1000 * 60 * 60); // hours
      const quality = age < 24 ? 'REAL' : age < 72 ? 'PARTIAL' : 'STALE';
      const icon = quality === 'REAL' ? '✅' : quality === 'PARTIAL' ? '⚠️' : '❌';
      console.log(`  ${icon} ${gt.id}: $${gt.total_ever} (updated ${age.toFixed(1)}h ago)`);
      report.tables.cost_ground_truth = { quality, ...gt };
    });
  }
  
  // Audit kanban items for cost estimates
  console.log('\n--- kanban_items (cost estimates) ---');
  const kanbanPath = path.join(process.env.HOME, '.openclaw', 'workspace', 'shared-context', 'kanban', 'cards.json');
  
  if (fs.existsSync(kanbanPath)) {
    const kanban = JSON.parse(fs.readFileSync(kanbanPath, 'utf8'));
    const withCost = kanban.filter(k => k.estimatedCost || k.cost);
    
    console.log(`  Total cards: ${kanban.length}`);
    console.log(`  With cost estimates: ${withCost.length}`);
    
    // Check if estimates match reality
    const decisionsDir = path.join(process.env.HOME, '.openclaw', 'workspace', 'shared-context', 'decisions');
    let matched = 0;
    let unmatched = 0;
    
    withCost.forEach(card => {
      const decisionFile = path.join(decisionsDir, `decision-${card.id}.md`);
      if (fs.existsSync(decisionFile)) {
        matched++;
      } else {
        unmatched++;
      }
    });
    
    console.log(`  Matched to decisions: ${matched} ✅`);
    console.log(`  Unmatched: ${unmatched} ⚠️`);
    
    report.tables.kanban_items = {
      total: kanban.length,
      withCost: withCost.length,
      matched,
      unmatched,
      quality: unmatched === 0 ? 'REAL' : unmatched > withCost.length * 0.5 ? 'FAKE' : 'PARTIAL'
    };
  } else {
    console.log('  ❌ No kanban data found');
    report.tables.kanban_items = { quality: 'FAKE', reason: 'No kanban file' };
  }
  
  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('  SUMMARY');
  console.log('='.repeat(70));
  
  const allReal = Object.values(report.tables).every(t => 
    t.quality === 'REAL' || t.real > 0
  );
  
  if (allReal) {
    console.log('  ✅ All critical data sources are REAL');
  } else {
    console.log('  ❌ Some data sources need attention');
  }
  
  console.log('\n  Recommendations:');
  if (groundTruth.length === 0) {
    console.log('  1. Set ground truth: node moonshot-sync.js');
  }
  if (report.tables.kanban_items?.unmatched > 0) {
    console.log('  2. Update kanban estimates: node update-kanban-estimates.js');
  }
  if (report.tables.cost_tracking?.fake > 0) {
    console.log('  3. Clean fake entries from cost_tracking');
  }
  
  // Save report
  const reportPath = path.join(__dirname, '..', '..', '..', 'megatron-dashboard-api', 'logs', 'data-quality-audit.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n  Report saved: ${reportPath}`);
  
  db.close();
  return report;
}

// Run audit
auditDataQuality();
