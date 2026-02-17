#!/usr/bin/env node
/**
 * Update Kanban Cost Estimates
 * 
 * Syncs kanban card estimates with actual decision data.
 * Flags cards with missing or outdated estimates.
 */

const fs = require('fs');
const path = require('path');

const SHARED_DIR = path.join(process.env.HOME, '.openclaw', 'workspace', 'shared-context');
const KANBAN_PATH = path.join(SHARED_DIR, 'kanban', 'cards.json');
const DECISIONS_DIR = path.join(SHARED_DIR, 'decisions');

function updateKanbanEstimates(dryRun = false) {
  console.log('='.repeat(70));
  console.log('  UPDATE KANBAN COST ESTIMATES');
  console.log('='.repeat(70));
  console.log(`  Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log('');
  
  // Load kanban
  if (!fs.existsSync(KANBAN_PATH)) {
    console.log('❌ Kanban file not found:', KANBAN_PATH);
    return;
  }
  
  const kanban = JSON.parse(fs.readFileSync(KANBAN_PATH, 'utf8'));
  console.log(`📋 Loaded ${kanban.length} kanban cards`);
  
  // Get all decisions
  const decisions = fs.readdirSync(DECISIONS_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const content = fs.readFileSync(path.join(DECISIONS_DIR, f), 'utf8');
      const costMatch = content.match(/\*\*Cost:\*\*\s*\$?([\d.]+)/i) ||
                       content.match(/Cost:\s*\$?([\d.]+)/i);
      const statusMatch = content.match(/Status:\s*(🟢|🟡|🔴)?\s*(\w+)/i);
      const taskIdMatch = content.match(/\*\*Task ID:\*\*\s*(.+)/i) ||
                         content.match(/Task ID:\s*\*\*(.+?)\*\*/i);
      
      return {
        file: f,
        id: f.replace('decision-', '').replace('.md', ''),
        cost: costMatch ? parseFloat(costMatch[1]) : null,
        status: statusMatch ? (statusMatch[2] || 'unknown').toLowerCase() : 'unknown',
        taskId: taskIdMatch ? taskIdMatch[1].trim() : null
      };
    });
  
  console.log(`📄 Found ${decisions.length} decisions`);
  
  // Match and update
  let updated = 0;
  let missing = 0;
  let alreadyAccurate = 0;
  
  const updatedKanban = kanban.map(card => {
    // Find matching decision
    const decision = decisions.find(d => 
      d.taskId === card.id || 
      d.id === card.id ||
      card.title?.toLowerCase().includes(d.id.toLowerCase())
    );
    
    if (!decision) {
      missing++;
      return {
        ...card,
        estimatedCost: card.estimatedCost || 'Fake Data',
        costQuality: 'FAKE',
        costNote: 'No matching decision found'
      };
    }
    
    if (!decision.cost) {
      missing++;
      return {
        ...card,
        estimatedCost: card.estimatedCost || 'Fake Data',
        costQuality: 'FAKE',
        costNote: 'Decision has no cost estimate'
      };
    }
    
    // Check if update needed
    const currentCost = parseFloat(card.estimatedCost);
    if (currentCost === decision.cost) {
      alreadyAccurate++;
      return {
        ...card,
        estimatedCost: decision.cost,
        costQuality: 'REAL',
        costNote: 'Matches decision',
        decisionStatus: decision.status
      };
    }
    
    updated++;
    return {
      ...card,
      estimatedCost: decision.cost,
      costQuality: 'REAL',
      costNote: `Updated from ${card.estimatedCost || 'none'} to match decision`,
      decisionStatus: decision.status
    };
  });
  
  console.log(`\n📊 Results:`);
  console.log(`  ✅ Already accurate: ${alreadyAccurate}`);
  console.log(`  📝 Updated: ${updated}`);
  console.log(`  ❌ Missing data: ${missing}`);
  
  // Show breakdown by status
  console.log(`\n📋 By Decision Status:`);
  const byStatus = {};
  updatedKanban.forEach(c => {
    const status = c.decisionStatus || 'no-decision';
    byStatus[status] = (byStatus[status] || 0) + 1;
  });
  Object.entries(byStatus).forEach(([s, c]) => {
    console.log(`  ${s}: ${c}`);
  });
  
  // Show cards needing attention
  const needsAttention = updatedKanban.filter(c => c.costQuality === 'FAKE');
  if (needsAttention.length > 0) {
    console.log(`\n⚠️  Cards with Fake Data (${needsAttention.length}):`);
    needsAttention.slice(0, 10).forEach(c => {
      console.log(`  - ${c.title?.substring(0, 40)}... (${c.costNote})`);
    });
  }
  
  if (dryRun) {
    console.log('\n⚠️  DRY RUN - No changes saved');
    return;
  }
  
  // Save updated kanban
  fs.writeFileSync(KANBAN_PATH, JSON.stringify(updatedKanban, null, 2));
  console.log(`\n✅ Saved to ${KANBAN_PATH}`);
  
  // Also generate a cost summary
  const totalEstimated = updatedKanban
    .filter(c => c.estimatedCost && c.estimatedCost !== 'Fake Data')
    .reduce((s, c) => s + parseFloat(c.estimatedCost), 0);
  
  console.log(`\n💰 Total Estimated Cost (all cards): $${totalEstimated.toFixed(2)}`);
  
  console.log('\n' + '='.repeat(70));
  console.log('  COMPLETE');
  console.log('='.repeat(70));
}

// Parse args
const dryRun = process.argv.includes('--dry-run');
updateKanbanEstimates(dryRun);
