#!/usr/bin/env node

import { KanbanWorkflow } from './core/KanbanWorkflow.js';

const args = process.argv.slice(2);
const command = args[0];

const workflow = new KanbanWorkflow({
  autoTransition: true,
  validationStrictness: 'medium'
});

// CLI Commands
const commands = {
  // Create a workflow
  'create-workflow': async () => {
    const projectId = args[1] || 'default';
    const name = args[2] || 'Default Workflow';
    
    const definition = {
      name,
      stages: [
        { id: 'backlog', name: 'Backlog', order: 0 },
        { id: 'todo', name: 'To Do', order: 1 },
        { id: 'in_progress', name: 'In Progress', order: 2, wipLimit: 3 },
        { id: 'review', name: 'Review', order: 3, wipLimit: 5 },
        { id: 'done', name: 'Done', order: 4 }
      ],
      rules: [
        {
          type: 'assignee_required',
          fromStage: 'todo',
          toStage: 'in_progress',
          name: 'Require assignee for In Progress'
        },
        {
          type: 'min_time_in_stage',
          fromStage: 'review',
          toStage: 'done',
          config: { duration: 3600000 }, // 1 hour
          name: 'Minimum 1 hour in review'
        }
      ],
      validators: [
        {
          type: 'title_required',
          stage: 'in_progress',
          level: 'error'
        },
        {
          type: 'description_required',
          stage: 'done',
          level: 'warning'
        }
      ],
      autoTransitionRules: [
        {
          id: 'auto_archive',
          name: 'Auto-archive old done cards',
          type: 'time_based',
          fromStage: 'done',
          targetStage: 'archived',
          config: { duration: '30d' }
        }
      ]
    };
    
    const wf = await workflow.createWorkflow(projectId, definition);
    console.log('Created workflow:', JSON.stringify(wf, null, 2));
  },

  // Create a card
  'create-card': async () => {
    const projectId = args[1] || 'default';
    const title = args[2] || 'New Card';
    
    const card = await workflow.createCard(projectId, {
      title,
      description: args[3] || '',
      priority: args[4] || 'medium'
    });
    
    console.log('Created card:', JSON.stringify(card, null, 2));
  },

  // Transition a card
  'transition': async () => {
    const cardId = args[1];
    const targetStage = args[2];
    
    if (!cardId || !targetStage) {
      console.error('Usage: transition <cardId> <targetStage>');
      process.exit(1);
    }
    
    const result = await workflow.transitionCard(cardId, targetStage, {
      triggeredBy: 'cli'
    });
    
    console.log('Transition result:', JSON.stringify(result, null, 2));
  },

  // Get analytics
  'analytics': async () => {
    const projectId = args[1] || 'default';
    const timeframe = args[2] || '30d';
    
    const analytics = await workflow.getAnalytics(projectId, { timeframe });
    console.log('Analytics:', JSON.stringify(analytics, null, 2));
  },

  // Get optimization recommendations
  'optimize': async () => {
    const projectId = args[1] || 'default';
    
    const recommendations = await workflow.getOptimizationRecommendations(projectId);
    console.log('Recommendations:', JSON.stringify(recommendations, null, 2));
  },

  // Bulk transition
  'bulk-transition': async () => {
    const projectId = args[1] || 'default';
    const fromStage = args[2];
    const toStage = args[3];
    
    if (!fromStage || !toStage) {
      console.error('Usage: bulk-transition <projectId> <fromStage> <toStage>');
      process.exit(1);
    }
    
    const results = await workflow.bulkTransition(projectId, { stage: fromStage }, toStage);
    console.log('Bulk transition results:', JSON.stringify(results, null, 2));
  },

  // Check workflow status
  'status': async () => {
    const projectId = args[1] || 'default';
    
    const wf = await workflow.getWorkflow(projectId);
    if (!wf) {
      console.log('No workflow found for project:', projectId);
      return;
    }
    
    const cards = await workflow.cardStore.getByProject(projectId);
    
    console.log('Workflow:', wf.name);
    console.log('Stages:', wf.stages.map(s => s.name).join(' → '));
    console.log('Total cards:', cards.length);
    
    const byStage = {};
    for (const card of cards) {
      byStage[card.stage] = (byStage[card.stage] || 0) + 1;
    }
    
    console.log('Cards by stage:');
    for (const [stage, count] of Object.entries(byStage)) {
      const stageInfo = wf.stages.find(s => s.id === stage);
      const limit = stageInfo?.wipLimit ? ` (limit: ${stageInfo.wipLimit})` : '';
      console.log(`  ${stage}: ${count}${limit}`);
    }
  },

  // List cards
  'list': async () => {
    const projectId = args[1] || 'default';
    const stage = args[2];
    
    const criteria = { projectId };
    if (stage) criteria.stage = stage;
    
    const cards = await workflow.cardStore.query(criteria);
    
    console.log(`Cards (${cards.length}):`);
    for (const card of cards.slice(0, 20)) {
      console.log(`  [${card.stage}] ${card.id}: ${card.title}`);
    }
    
    if (cards.length > 20) {
      console.log(`  ... and ${cards.length - 20} more`);
    }
  },

  // Help
  'help': () => {
    console.log(`
Kanban Workflow System CLI

Commands:
  create-workflow [projectId] [name]    Create a new workflow
  create-card [projectId] [title]       Create a new card
  transition <cardId> <stage>           Move card to stage
  analytics [projectId] [timeframe]     Show analytics (default: 30d)
  optimize [projectId]                  Get optimization recommendations
  bulk-transition <project> <from> <to> Move all cards from one stage to another
  status [projectId]                    Show workflow status
  list [projectId] [stage]              List cards
  help                                  Show this help

Examples:
  node cli.js create-workflow my-project "My Workflow"
  node cli.js create-card my-project "Fix bug #123"
  node cli.js transition card_xxx review
  node cli.js analytics my-project 7d
    `);
  }
};

// Execute command
async function main() {
  const cmd = commands[command] || commands['help'];
  
  try {
    await cmd();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();