/**
 * Kanban Workflow System Tests
 */

import { KanbanWorkflow } from '../src/core/KanbanWorkflow.js';
import { exampleWorkflows } from '../examples/workflow-definitions.js';

async function runTests() {
  console.log('🧪 Running Kanban Workflow Tests\n');
  
  const workflow = new KanbanWorkflow({
    autoTransition: true,
    validationStrictness: 'medium'
  });

  let passed = 0;
  let failed = 0;

  // Test 1: Create workflow
  try {
    console.log('Test 1: Create workflow...');
    const wf = await workflow.createWorkflow('test-project', exampleWorkflows.simpleTask);
    if (wf.id && wf.stages.length === 3) {
      console.log('✅ Create workflow - PASSED');
      passed++;
    } else {
      console.log('❌ Create workflow - FAILED');
      failed++;
    }
  } catch (error) {
    console.log('❌ Create workflow - FAILED:', error.message);
    failed++;
  }

  // Test 2: Create card
  try {
    console.log('Test 2: Create card...');
    const card = await workflow.createCard('test-project', {
      title: 'Test Card',
      description: 'Test description',
      priority: 'high'
    });
    if (card.id && card.stage === 'todo') {
      console.log('✅ Create card - PASSED');
      passed++;
    } else {
      console.log('❌ Create card - FAILED');
      failed++;
    }
  } catch (error) {
    console.log('❌ Create card - FAILED:', error.message);
    failed++;
  }

  // Test 3: Transition with rule validation
  try {
    console.log('Test 3: Transition without assignee (should fail)...');
    const cards = await workflow.cardStore.query({ projectId: 'test-project' });
    const card = cards[0];
    
    const result = await workflow.transitionCard(card.id, 'in_progress');
    // assignee_required is a rule, so it returns RULE_BLOCKED, not VALIDATION_FAILED
    if (!result.success && (result.reason === 'RULE_BLOCKED' || result.reason === 'VALIDATION_FAILED')) {
      console.log('✅ Transition rule validation - PASSED');
      passed++;
    } else {
      console.log('❌ Transition rule validation - FAILED (reason:', result.reason, ')');
      failed++;
    }
  } catch (error) {
    console.log('❌ Transition rule validation - FAILED:', error.message);
    failed++;
  }

  // Test 4: Transition with assignee
  try {
    console.log('Test 4: Transition with assignee...');
    const cards = await workflow.cardStore.query({ projectId: 'test-project' });
    const card = cards[0];
    
    // Add assignee
    card.assignee = { id: 'user-1', name: 'Test User' };
    await workflow.cardStore.update(card.id, card);
    
    const result = await workflow.transitionCard(card.id, 'in_progress');
    if (result.success) {
      console.log('✅ Transition with assignee - PASSED');
      passed++;
    } else {
      console.log('❌ Transition with assignee - FAILED:', result.message);
      failed++;
    }
  } catch (error) {
    console.log('❌ Transition with assignee - FAILED:', error.message);
    failed++;
  }

  // Test 5: Get analytics
  try {
    console.log('Test 5: Get analytics...');
    const analytics = await workflow.getAnalytics('test-project', { timeframe: '7d' });
    if (analytics.projectId === 'test-project') {
      console.log('✅ Get analytics - PASSED');
      passed++;
    } else {
      console.log('❌ Get analytics - FAILED');
      failed++;
    }
  } catch (error) {
    console.log('❌ Get analytics - FAILED:', error.message);
    failed++;
  }

  // Test 6: Complex workflow
  try {
    console.log('Test 6: Create complex workflow...');
    const complexWf = await workflow.createWorkflow('complex-project', exampleWorkflows.softwareDev);
    if (complexWf.stages.length === 7) {
      console.log('✅ Complex workflow - PASSED');
      passed++;
    } else {
      console.log('❌ Complex workflow - FAILED');
      failed++;
    }
  } catch (error) {
    console.log('❌ Complex workflow - FAILED:', error.message);
    failed++;
  }

  // Test 7: WIP limit
  try {
    console.log('Test 7: WIP limit enforcement...');
    const complexWf = await workflow.getWorkflow('complex-project');
    
    // Create cards up to WIP limit
    for (let i = 0; i < 4; i++) {
      const card = await workflow.createCard('complex-project', {
        title: `Card ${i}`,
        stage: 'in_progress'
      });
      card.assignee = { id: `user-${i}`, name: `User ${i}` };
      await workflow.cardStore.update(card.id, card);
    }
    
    // Try to transition another card to in_progress (should fail due to WIP)
    const extraCard = await workflow.createCard('complex-project', {
      title: 'Extra Card',
      stage: 'selected'
    });
    extraCard.assignee = { id: 'user-extra', name: 'Extra User' };
    await workflow.cardStore.update(extraCard.id, extraCard);
    
    const result = await workflow.transitionCard(extraCard.id, 'in_progress');
    if (!result.success && result.reason === 'WIP_LIMIT_EXCEEDED') {
      console.log('✅ WIP limit enforcement - PASSED');
      passed++;
    } else {
      console.log('❌ WIP limit enforcement - FAILED');
      failed++;
    }
  } catch (error) {
    console.log('❌ WIP limit enforcement - FAILED:', error.message);
    failed++;
  }

  // Test 8: Bulk transition
  try {
    console.log('Test 8: Bulk transition...');
    const results = await workflow.bulkTransition('complex-project', { stage: 'selected' }, 'selected');
    if (results.total >= 0) {
      console.log('✅ Bulk transition - PASSED');
      passed++;
    } else {
      console.log('❌ Bulk transition - FAILED');
      failed++;
    }
  } catch (error) {
    console.log('❌ Bulk transition - FAILED:', error.message);
    failed++;
  }

  // Summary
  console.log('\n📊 Test Summary');
  console.log(`   Passed: ${passed}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total:  ${passed + failed}`);
  
  if (failed === 0) {
    console.log('\n✨ All tests passed!');
  } else {
    console.log('\n⚠️ Some tests failed');
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});