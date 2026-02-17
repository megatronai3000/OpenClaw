// model-router.js - Intelligent model selection with MiniMax integration
const { routeToMiniMax } = require('./minimax-client');

// Model priorities by task type — AUTONOMOUS MODE ACTIVE
const MODEL_ROUTES = {
  // ALL work → MiniMax first (burn quota efficiently)
  'coding': { provider: 'minimax', model: 'MiniMax-M2.5', cost: 0.0004 },
  'architecture': { provider: 'minimax', model: 'MiniMax-M2.5', cost: 0.0004 },
  'complex-analysis': { provider: 'minimax', model: 'MiniMax-M2.5', cost: 0.0004 },
  'implementation': { provider: 'minimax', model: 'MiniMax-M2.5', cost: 0.0004 },
  'testing': { provider: 'minimax', model: 'MiniMax-M2.5', cost: 0.0004 },
  'documentation': { provider: 'minimax', model: 'MiniMax-M2.5', cost: 0.0004 },
  
  // Routine work → Local (free) — heartbeats only
  'heartbeat': { provider: 'local', model: 'ollama/llama3.1:8b', cost: 0 },
  'monitoring': { provider: 'local', model: 'ollama/llama3.1:8b', cost: 0 },
  
  // Fallback only when MiniMax exhausted
  'fallback': { provider: 'moonshot', model: 'kimi-k2', cost: 0.02 }
};

// AUTONOMOUS CONFIG
const AUTONOMOUS = {
  active: true,
  maxConcurrent: 5,
  autoApproveThreshold: 1.00,
  quotaTarget: 1000, // per 5 hours
  reportInterval: '1h'
};

/**
 * Classify task type from description
 */
function classifyTask(taskDescription) {
  const desc = taskDescription.toLowerCase();
  
  // Coding indicators
  if (desc.includes('code') || desc.includes('build') || desc.includes('implement') ||
      desc.includes('debug') || desc.includes('refactor') || desc.includes('api')) {
    return 'coding';
  }
  
  // Architecture indicators
  if (desc.includes('architecture') || desc.includes('design') || desc.includes('system') ||
      desc.includes('schema') || desc.includes('infrastructure')) {
    return 'architecture';
  }
  
  // Heartbeat indicators
  if (desc.includes('heartbeat') || desc.includes('monitor') || desc.includes('check-in')) {
    return 'heartbeat';
  }
  
  // Complex analysis
  if (desc.includes('analyze') || desc.includes('research') || desc.includes('investigate')) {
    return 'complex-analysis';
  }
  
  // Default to coding for most tasks
  return 'coding';
}

/**
 * Route task to optimal model
 */
async function routeTask(task) {
  const taskType = classifyTask(task.description || task.prompt || '');
  const route = MODEL_ROUTES[taskType] || MODEL_ROUTES['coding'];
  
  // Log routing decision
  console.log(`[Router] Task: ${taskType} → ${route.provider} (${route.model})`);
  
  return {
    ...route,
    taskType,
    execute: async () => {
      switch (route.provider) {
        case 'minimax':
          return await routeToMiniMax(task);
        case 'local':
          // Return local model config (executed by Ollama)
          return {
            provider: 'local',
            model: route.model,
            cost: 0,
            execute: () => {
              // Local execution handled by Ollama
              return { provider: 'local', model: route.model };
            }
          };
        case 'moonshot':
        default:
          return {
            provider: 'moonshot',
            model: route.model,
            cost: route.cost
          };
      }
    }
  };
}

/**
 * Get routing summary for dashboard
 */
function getRoutingStats() {
  return {
    routes: MODEL_ROUTES,
    totalRoutes: Object.keys(MODEL_ROUTES).length,
    primary: 'minimax',
    fallback: 'moonshot',
    free: 'local'
  };
}

module.exports = {
  routeTask,
  classifyTask,
  getRoutingStats,
  MODEL_ROUTES
};
