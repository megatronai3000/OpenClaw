import { FeedbackLoop } from '../src/index.js';
import assert from 'assert';

/**
 * Test suite for Feedback Loop System
 */
class TestSuite {
  constructor() {
    this.feedback = new FeedbackLoop({ enableLLM: false });
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('Running tests...\n');

    for (const { name, fn } of this.tests) {
      try {
        await fn();
        console.log(`✓ ${name}`);
        this.passed++;
      } catch (error) {
        console.log(`✗ ${name}`);
        console.log(`  Error: ${error.message}`);
        this.failed++;
      }
    }

    console.log(`\n${this.passed} passed, ${this.failed} failed`);
    return this.failed === 0;
  }

  // Assertion helpers
  assertEqual(actual, expected, message) {
    assert.strictEqual(actual, expected, message);
  }

  assertTrue(value, message) {
    assert.strictEqual(value, true, message);
  }

  assertExists(value, message) {
    assert.notStrictEqual(value, null, message);
    assert.notStrictEqual(value, undefined, message);
  }
}

// Create test suite
const suite = new TestSuite();

// Test: Decision tracking
suite.test('should track a decision', async () => {
  const result = await suite.feedback.trackDecision({
    agent: 'test-agent',
    task: 'test-task',
    context: { key: 'value' },
    decision: { action: 'test' },
    confidence: 0.8
  });

  suite.assertExists(result.id, 'Should have an ID');
  suite.assertEqual(result.agent, 'test-agent');
  suite.assertEqual(result.task, 'test-task');
});

// Test: Outcome logging
suite.test('should log an outcome', async () => {
  const decision = await suite.feedback.trackDecision({
    agent: 'test-agent',
    task: 'test-task',
    decision: { action: 'test' }
  });

  const outcome = await suite.feedback.logOutcome(decision.id, {
    success: true,
    feedback: 'Good result',
    quality: 0.9
  });

  suite.assertTrue(outcome.success, 'Outcome should be success');
  suite.assertEqual(outcome.decisionId, decision.id);
});

// Test: Track and log combined
suite.test('should track and log in one call', async () => {
  const result = await suite.feedback.trackAndLog(
    {
      agent: 'test-agent',
      task: 'combined-test',
      decision: { action: 'combined' }
    },
    {
      success: true,
      feedback: 'Combined test'
    }
  );

  suite.assertExists(result.decision.id);
  suite.assertExists(result.outcome);
  suite.assertTrue(result.outcome.success);
});

// Test: Accuracy calculation
suite.test('should calculate accuracy correctly', async () => {
  // Create test data
  const agent = 'accuracy-test-agent';
  
  for (let i = 0; i < 10; i++) {
    const d = await suite.feedback.trackDecision({
      agent,
      task: 'test',
      decision: { index: i }
    });
    await suite.feedback.logOutcome(d.id, {
      success: i < 7 // 70% success rate
    });
  }

  const stats = await suite.feedback.tracker.getStats(agent);
  suite.assertEqual(stats.accuracy, 0.7, 'Accuracy should be 70%');
  suite.assertEqual(stats.successCount, 7);
  suite.assertEqual(stats.failureCount, 3);
});

// Test: Pattern detection
suite.test('should detect patterns in data', async () => {
  const agent = 'pattern-test-agent';
  
  // Create pattern: search tasks succeed, code tasks fail
  for (let i = 0; i < 5; i++) {
    const d1 = await suite.feedback.trackDecision({
      agent,
      task: 'search',
      decision: { type: 'search' }
    });
    await suite.feedback.logOutcome(d1.id, { success: true });

    const d2 = await suite.feedback.trackDecision({
      agent,
      task: 'code',
      decision: { type: 'code' }
    });
    await suite.feedback.logOutcome(d2.id, { success: false });
  }

  const analysis = await suite.feedback.analyze(agent);
  suite.assertTrue(analysis.patterns.sufficientData, 'Should have sufficient data');
  suite.assertExists(analysis.patterns.contextPatterns);
});

// Test: Trend analysis
suite.test('should analyze trends', async () => {
  const agent = 'trend-test-agent';
  
  // Create improving trend
  for (let i = 0; i < 12; i++) {
    const d = await suite.feedback.trackDecision({
      agent,
      task: 'test',
      decision: { index: i }
    });
    // First 5 fail, last 7 succeed
    await suite.feedback.logOutcome(d.id, { success: i >= 5 });
  }

  const analysis = await suite.feedback.analyze(agent);
  suite.assertTrue(analysis.trends.sufficientData);
  suite.assertExists(analysis.trends.accuracyTrend);
});

// Test: Recommendations
suite.test('should generate recommendations', async () => {
  const agent = 'rec-test-agent';
  
  // Create data with issues
  for (let i = 0; i < 10; i++) {
    const d = await suite.feedback.trackDecision({
      agent,
      task: 'problematic-task',
      decision: { action: 'problematic' },
      confidence: 0.9 // Overconfident
    });
    await suite.feedback.logOutcome(d.id, { 
      success: false,
      tags: ['error', 'timeout']
    });
  }

  const recs = await suite.feedback.getRecommendations(agent);
  suite.assertTrue(recs.totalRecommendations > 0, 'Should have recommendations');
  suite.assertExists(recs.byPriority);
});

// Test: Report generation
suite.test('should generate report', async () => {
  const agent = 'report-test-agent';
  
  // Create some data
  for (let i = 0; i < 5; i++) {
    const d = await suite.feedback.trackDecision({
      agent,
      task: 'report-test',
      decision: { index: i }
    });
    await suite.feedback.logOutcome(d.id, { success: i % 2 === 0 });
  }

  const report = await suite.feedback.generateReport(agent);
  suite.assertEqual(report.type, 'agent');
  suite.assertEqual(report.agent, agent);
  suite.assertExists(report.summary);
  suite.assertExists(report.analysis);
});

// Test: Context sanitization
suite.test('should sanitize sensitive context', async () => {
  const decision = await suite.feedback.trackDecision({
    agent: 'sanitize-test',
    task: 'test',
    context: {
      query: 'normal data',
      apiKey: 'secret123',
      password: 'hidden'
    },
    decision: { action: 'test' }
  });

  const stored = await suite.feedback.tracker.get(decision.id);
  suite.assertEqual(stored.context.apiKey, '[REDACTED]');
  suite.assertEqual(stored.context.password, '[REDACTED]');
  suite.assertEqual(stored.context.query, 'normal data');
});

// Test: System stats
suite.test('should get system stats', async () => {
  const stats = await suite.feedback.getSystemStats();
  suite.assertExists(stats.totalDecisions);
  suite.assertExists(stats.totalOutcomes);
  suite.assertExists(stats.totalAgents);
  suite.assertTrue(Array.isArray(stats.agents));
});

// Run tests
suite.run().then(success => {
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});