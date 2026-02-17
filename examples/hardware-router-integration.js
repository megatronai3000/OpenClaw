/**
 * Integration Example: Using Hardware-Aware Router with existing systems
 * Shows integration patterns for orchestrator.js and feedback-loop
 */

import ModelRouter, { getRouter } from '../model-router.js';

/**
 * Pattern 1: Simple drop-in replacement for direct API calls
 */
export async function example1_DropInReplacement() {
  const router = getRouter();

  // Before: Direct API call
  // const response = await callMiniMax(prompt);

  // After: Hardware-aware routing
  const response = await router.quick('Summarize this text', {
    maxTokens: 500
  });

  console.log('Response:', response.content);
  console.log('Routed to:', response.routing.target);
  console.log('Model used:', response.routing.model);
}

/**
 * Pattern 2: Integration with orchestrator.js
 */
export async function example2_OrchestratorIntegration(tasks) {
  const router = getRouter();

  // Process multiple tasks with intelligent routing
  const results = await Promise.all(tasks.map(async (task) => {
    const routing = await router.router.route({
      task: task.complexity,
      maxTokens: task.expectedTokens
    });

    // Log routing decision for feedback loop
    console.log(`Task "${task.name}" → ${routing.target}:${routing.model.name}`);

    return router.complete({
      messages: task.messages,
      task: task.complexity,
      maxTokens: task.expectedTokens
    });
  }));

  return results;
}

/**
 * Pattern 3: Cost-sensitive batch processing
 */
export async function example3_CostSensitiveBatch(prompts) {
  const router = getRouter();
  const stats = { local: 0, api: 0, saved: 0 };

  const results = [];

  for (const prompt of prompts) {
    // Force local for cost savings on non-urgent tasks
    const response = await router.complete({
      messages: [{ role: 'user', content: prompt }],
      forceLocal: true // Save costs
    });

    if (response.routing.target === 'local') {
      stats.local++;
      stats.saved += 0.0001; // Approximate API cost
    } else {
      stats.api++;
    }

    results.push(response);
  }

  console.log(`Processed ${prompts.length} prompts`);
  console.log(`Local: ${stats.local}, API: ${stats.api}`);
  console.log(`Estimated savings: $${stats.saved.toFixed(4)}`);

  return results;
}

/**
 * Pattern 4: Quality-first with API fallback
 */
export async function example4_QualityFirst(prompt, minQuality = 'very-good') {
  const router = getRouter();

  // Try to find a local model meeting quality threshold
  const compatible = router.router.getCompatibleLocalModels();
  const qualityRank = { good: 1, 'very-good': 2, excellent: 3 };

  const goodEnough = compatible.find(m => 
    qualityRank[m.quality] >= qualityRank[minQuality]
  );

  if (goodEnough) {
    console.log(`Using local model: ${goodEnough.name}`);
    return router.complete({
      messages: [{ role: 'user', content: prompt }],
      forceLocal: true
    });
  }

  // Fall back to API for quality
  console.log('No local model meets quality threshold, using API');
  return router.complete({
    messages: [{ role: 'user', content: prompt }],
    forceAPI: true
  });
}

/**
 * Pattern 5: Feedback loop integration
 */
export async function example5_FeedbackLoopTracking(prompt, expectedOutcome) {
  const router = getRouter();
  const startTime = Date.now();

  const response = await router.quick(prompt);
  const latency = Date.now() - startTime;

  // Log decision for feedback analysis
  const decision = {
    timestamp: new Date().toISOString(),
    routing: response.routing,
    latency,
    success: null, // To be filled after evaluation
    expectedOutcome
  };

  // Store in feedback loop format
  // await saveDecision(decision);

  return {
    response,
    decision
  };
}

/**
 * Pattern 6: Dynamic threshold adjustment based on load
 */
export class AdaptiveRouter {
  constructor() {
    this.router = getRouter();
    this.latencyHistory = [];
  }

  async routeWithAdaptiveThreshold(prompt, options = {}) {
    // Calculate average latency
    const avgLatency = this.latencyHistory.length > 0
      ? this.latencyHistory.reduce((a, b) => a + b, 0) / this.latencyHistory.length
      : 0;

    // Adjust threshold based on performance
    if (avgLatency > 5000) {
      // Local is slow, prefer API for faster response
      this.router.updateConfig({ fallback: { localFirstThreshold: 90 } });
    } else if (avgLatency < 1000) {
      // Local is fast, use it more
      this.router.updateConfig({ fallback: { localFirstThreshold: 50 } });
    }

    const startTime = Date.now();
    const response = await this.router.quick(prompt, options);
    this.latencyHistory.push(Date.now() - startTime);

    // Keep history manageable
    if (this.latencyHistory.length > 20) {
      this.latencyHistory = this.latencyHistory.slice(-10);
    }

    return response;
  }
}

/**
 * Pattern 7: Model warmup for consistent performance
 */
export async function example7_ModelWarmup() {
  const router = getRouter();

  // Warm up common models to reduce cold-start latency
  const warmupPrompts = [
    { model: 'llama3.2:8b', prompt: 'Hello' },
    { model: 'qwen2.5-coder:7b', prompt: '// Test' }
  ];

  for (const { model, prompt } of warmupPrompts) {
    console.log(`Warming up ${model}...`);
    try {
      await router.complete({
        messages: [{ role: 'user', content: prompt }],
        forceLocal: true,
        maxTokens: 10
      });
    } catch (error) {
      console.warn(`Failed to warm up ${model}:`, error.message);
    }
  }

  console.log('Warmup complete');
}

// Export examples
export default {
  example1_DropInReplacement,
  example2_OrchestratorIntegration,
  example3_CostSensitiveBatch,
  example4_QualityFirst,
  example5_FeedbackLoopTracking,
  AdaptiveRouter,
  example7_ModelWarmup
};
