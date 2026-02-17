/**
 * Hardware Router Demo & Tests
 * Demonstrates hardware-aware routing capabilities
 */

import ModelRouter, { getRouter } from './model-router.js';

async function runDemo() {
  console.log('═══════════════════════════════════════════');
  console.log('  Hardware-Aware Router Demo');
  console.log('═══════════════════════════════════════════\n');

  const router = new ModelRouter();

  // 1. Initialize and show hardware
  console.log('1️⃣  Initializing hardware detection...\n');
  await router.init();

  // 2. List available models
  console.log('\n2️⃣  Compatible Models for Your Hardware:\n');
  const models = await router.listModels();
  
  console.log('Local Models (can run on your machine):');
  models.local.forEach(m => {
    console.log(`   ✅ ${m.name}`);
    console.log(`      RAM: ${m.ramGB}GB | Quality: ${m.quality} | Speed: ${m.speed}`);
    console.log(`      Best for: ${m.useCase.join(', ')}\n`);
  });

  console.log('API Models (fallback options):');
  models.api.forEach(m => {
    console.log(`   ☁️  ${m.name} (${m.cost})`);
  });

  // 3. Test routing decisions
  console.log('\n\n3️⃣  Testing Routing Decisions:\n');
  
  const testCases = [
    { task: 'simple', prompt: 'Say hello', maxTokens: 100 },
    { task: 'standard', prompt: 'Explain quantum computing', maxTokens: 500 },
    { task: 'complex', prompt: 'Debug this algorithm and optimize it', maxTokens: 2000 },
    { task: 'coding', prompt: 'Write a React component', maxTokens: 1500 },
    { task: 'intensive', prompt: 'Generate a full API specification', maxTokens: 5000 }
  ];

  for (const test of testCases) {
    console.log(`\n📝 Task: ${test.task} (${test.maxTokens} tokens)`);
    console.log(`   Prompt: "${test.prompt}"`);
    
    const routing = await router.router.route({
      task: test.task,
      maxTokens: test.maxTokens
    });
    
    console.log(`   ➜ Route: ${routing.target.toUpperCase()}`);
    console.log(`   ➜ Model: ${routing.model.name}`);
    console.log(`   ➜ Reason: ${routing.reason}`);
    console.log(`   ➜ Est. Cost: $${routing.estimated.cost.toFixed(4)}`);
  }

  // 4. Show statistics
  console.log('\n\n4️⃣  Routing Statistics:\n');
  const stats = router.getStats();
  console.log(`   Total Routings: ${stats.totalRoutings}`);
  console.log(`   Local: ${stats.localRoutings} (${stats.localPercentage}%)`);
  console.log(`   API: ${stats.apiRoutings}`);
  console.log(`   Est. Savings: $${stats.estimatedCostSavings}`);

  console.log('\n═══════════════════════════════════════════');
  console.log('  Demo Complete!');
  console.log('═══════════════════════════════════════════\n');
}

async function runTests() {
  console.log('Running Hardware Router Tests...\n');
  
  const router = new ModelRouter();
  await router.init();

  let passed = 0;
  let failed = 0;

  const tests = [
    {
      name: 'Hardware Detection',
      test: () => {
        const hw = router.router.hardware;
        return hw && hw.memory && hw.cpu && hw.gpu;
      }
    },
    {
      name: 'Model Compatibility Check',
      test: () => {
        const compatible = router.router.getCompatibleLocalModels();
        return Array.isArray(compatible);
      }
    },
    {
      name: 'Simple Task Routes Local (if capable)',
      test: async () => {
        const routing = await router.router.route({ task: 'simple', maxTokens: 100 });
        return routing.target === 'local' || routing.reason.includes('fallback');
      }
    },
    {
      name: 'Intensive Task Routes to API',
      test: async () => {
        const routing = await router.router.route({ task: 'intensive', maxTokens: 8000 });
        return routing.target === 'api';
      }
    },
    {
      name: 'Force Local Flag Works',
      test: async () => {
        const routing = await router.router.route({ 
          task: 'simple', 
          maxTokens: 100,
          forceLocal: true 
        });
        return routing.reason === 'forced';
      }
    },
    {
      name: 'Force API Flag Works',
      test: async () => {
        const routing = await router.router.route({ 
          task: 'simple', 
          maxTokens: 100,
          forceAPI: true 
        });
        return routing.target === 'api' && routing.reason === 'forced';
      }
    }
  ];

  for (const t of tests) {
    try {
      const result = await t.test();
      if (result) {
        console.log(`  ✅ ${t.name}`);
        passed++;
      } else {
        console.log(`  ❌ ${t.name}`);
        failed++;
      }
    } catch (error) {
      console.log(`  ❌ ${t.name} - Error: ${error.message}`);
      failed++;
    }
  }

  console.log(`\n${passed}/${tests.length} tests passed`);
  return failed === 0;
}

// Run based on CLI args
const command = process.argv[2];

if (command === 'test') {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  });
} else {
  runDemo().catch(console.error);
}
