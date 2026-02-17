#!/usr/bin/env node
/**
 * Multi-Model Auto-Router
 * 
 * Analyzes task complexity and routes to optimal model:
 * - Simple tasks → Kimi K2.5 (cheap, fast)
 * - Coding tasks → Qwen3-Coder (free via OpenRouter)
 * - Complex tasks → GPT-4o (high capability)
 * 
 * Usage: node model-router.js "task description" [--dry-run]
 */

const MODELS = {
  kimi: {
    id: 'moonshot/kimi-k2.5',
    name: 'Kimi K2.5',
    costPer1M: { input: 0.015, output: 0.015 }, // $0.015 per 1M tokens (CHEAP)
    strengths: ['general reasoning', 'conversation', 'analysis', 'writing', 'search', 'summarization'],
    weaknesses: ['complex coding', 'CSS/layout', 'algorithm design']
  },
  qwen: {
    id: 'openrouter/qwen/qwen3-235b-a22b-thinking',
    name: 'Qwen3 235B',
    costPer1M: { input: 0, output: 0 }, // FREE via OpenRouter
    strengths: ['coding', 'algorithm implementation', 'debugging', 'technical tasks'],
    weaknesses: ['creative writing', 'nuanced reasoning']
  },
  codex: {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    costPer1M: { input: 2.50, output: 10.00 }, // $2.50 per 1M tokens (EXPENSIVE - rare use)
    strengths: ['complex coding', 'CSS/layout', 'architecture', 'edge cases'],
    weaknesses: ['costly for simple tasks']
  }
};

// Routing rules with weights
const ROUTING_RULES = [
  {
    name: 'code_volume',
    pattern: /(\d+)\s*(lines?|loc|functions?|methods?|classes?)/i,
    test: (match) => parseInt(match[1]) > 100,
    model: 'codex',
    confidence: 0.9,
    reason: 'Large code volume detected'
  },
  {
    name: 'css_layout',
    pattern: /(css|overflow|flexbox|grid|position|layout|responsive|modal|breakpoint)/i,
    test: () => true,
    model: 'codex',
    confidence: 0.85,
    reason: 'CSS/layout complexity'
  },
  {
    name: 'algorithm',
    pattern: /(algorithm|implement|optimize|complexity|o\(n\)|data structure|recursive)/i,
    test: () => true,
    model: 'qwen',
    confidence: 0.8,
    reason: 'Algorithm implementation'
  },
  {
    name: 'debugging',
    pattern: /(debug|fix|error|bug|crash|broken|not working|fails?)/i,
    test: () => true,
    model: 'qwen',
    confidence: 0.75,
    reason: 'Debugging task'
  },
  {
    name: 'architecture',
    pattern: /(architecture|design pattern|refactor|structure|component)/i,
    test: () => true,
    model: 'codex',
    confidence: 0.8,
    reason: 'Architectural decision'
  },
  {
    name: 'simple_edits',
    pattern: /(update|change|edit|modify|tweak|adjust)\s+\w+\s+(to|in|from)/i,
    test: () => true,
    model: 'kimi',
    confidence: 0.7,
    reason: 'Simple modification'
  },
  {
    name: 'business_logic',
    pattern: /(write|create|draft|summarize|analyze|explain|describe)/i,
    test: () => true,
    model: 'kimi',
    confidence: 0.6,
    reason: 'Business/writing task'
  }
];

/**
 * Analyze task complexity and recommend model
 */
function analyzeTask(taskDescription) {
  const scores = {
    kimi: 0,
    qwen: 0,
    codex: 0
  };
  
  const matches = [];
  
  ROUTING_RULES.forEach(rule => {
    const match = taskDescription.match(rule.pattern);
    if (match && rule.test(match)) {
      scores[rule.model] += rule.confidence;
      matches.push({
        rule: rule.name,
        model: rule.model,
        confidence: rule.confidence,
        reason: rule.reason,
        matched: match[0]
      });
    }
  });
  
  // Default to Kimi if no rules matched
  if (matches.length === 0) {
    scores.kimi = 0.5;
    matches.push({
      rule: 'default',
      model: 'kimi',
      confidence: 0.5,
      reason: 'No specific patterns detected - default to general model',
      matched: null
    });
  }
  
  // Determine winner
  const winner = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  const recommendedModel = MODELS[winner[0]];
  
  return {
    task: taskDescription,
    scores,
    matches,
    recommendation: {
      model: winner[0],
      modelId: recommendedModel.id,
      modelName: recommendedModel.name,
      confidence: winner[1],
      estimatedCost: calculateEstimatedCost(winner[0]),
      reasoning: matches.filter(m => m.model === winner[0]).map(m => m.reason)
    }
  };
}

/**
 * Calculate estimated cost for a task
 */
function calculateEstimatedCost(modelKey) {
  const model = MODELS[modelKey];
  // Assume average task: 2K input tokens, 1K output tokens
  // Convert from per-1M to actual cost
  const inputCost = (2000 / 1000000) * model.costPer1M.input;
  const outputCost = (1000 / 1000000) * model.costPer1M.output;
  return inputCost + outputCost;
}

/**
 * Format cost as string
 */
function formatCost(cost) {
  if (cost === 0) return 'FREE';
  if (cost < 0.001) return '$0.00 (negligible)';
  return `$${cost.toFixed(5)}`;
}

/**
 * Format cost per 1M tokens for display
 */
function formatCostPer1M(modelKey) {
  const model = MODELS[modelKey];
  const cost = model.costPer1M.input + model.costPer1M.output;
  if (cost === 0) return 'FREE';
  return `$${cost.toFixed(3)}/M tokens`;
}

/**
 * Print analysis results
 */
function printAnalysis(analysis) {
  console.log('\n' + '='.repeat(70));
  console.log('  MULTI-MODEL AUTO-ROUTER');
  console.log('='.repeat(70));
  
  console.log('\n📝 TASK:');
  console.log(`  ${analysis.task.substring(0, 100)}${analysis.task.length > 100 ? '...' : ''}`);
  
  console.log('\n📊 MODEL SCORES:');
  Object.entries(analysis.scores).forEach(([model, score]) => {
    const bar = '█'.repeat(Math.round(score * 20));
    const modelInfo = MODELS[model];
    console.log(`  ${model.padEnd(8)} ${bar.padEnd(20)} ${score.toFixed(2)} (${formatCost(calculateEstimatedCost(model))})`);
  });
  
  console.log('\n🔍 PATTERN MATCHES:');
  analysis.matches.forEach(m => {
    const icon = m.model === 'kimi' ? '🟢' : m.model === 'qwen' ? '🔵' : '🟣';
    console.log(`  ${icon} [${m.model}] ${m.reason}`);
    if (m.matched) {
      console.log(`     Matched: "${m.matched}"`);
    }
  });
  
  console.log('\n🎯 RECOMMENDATION:');
  console.log(`  Model: ${analysis.recommendation.modelName}`);
  console.log(`  ID: ${analysis.recommendation.modelId}`);
  console.log(`  Confidence: ${(analysis.recommendation.confidence * 100).toFixed(0)}%`);
  console.log(`  Cost/M tokens: ${formatCostPer1M(analysis.recommendation.model)}`);
  console.log(`  Est. Cost (3K tokens): ${formatCost(analysis.recommendation.estimatedCost)}`);
  console.log(`  Reasoning:`);
  analysis.recommendation.reasoning.forEach(r => {
    console.log(`    • ${r}`);
  });
  
  console.log('\n' + '='.repeat(70));
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  
  // Get task description
  let taskDescription = args.filter(a => !a.startsWith('--')).join(' ');
  
  if (!taskDescription) {
    // Run test cases
    console.log('\n🧪 RUNNING TEST CASES...\n');
    
    const testCases = [
      "Fix the CSS overflow issue in the modal component",
      "Write a blog post about AI agents",
      "Implement a binary search algorithm in Python",
      "Debug why the API is returning 500 errors",
      "Create a React component with 200 lines of code",
      "Update the README with new installation instructions",
      "Design the database schema for a user authentication system"
    ];
    
    testCases.forEach((test, i) => {
      console.log(`\n--- Test Case ${i + 1} ---`);
      const analysis = analyzeTask(test);
      printAnalysis(analysis);
    });
    
    return;
  }
  
  const analysis = analyzeTask(taskDescription);
  printAnalysis(analysis);
  
  if (!dryRun) {
    console.log('\n💡 TO USE:');
    console.log(`  Set model: /model ${analysis.recommendation.modelId}`);
    console.log('  Or use the router in your agent configuration');
  }
}

main();
