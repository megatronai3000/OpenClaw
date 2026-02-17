/**
 * Model Router - Main entry point for LLM routing
 * Integrates Hardware-Aware Router with existing routing logic
 * Provides unified interface for local and API models
 */

import HardwareAwareRouter from './hardware-router.js';
import { execSync } from 'child_process';

class ModelRouter {
  constructor(options = {}) {
    this.router = new HardwareAwareRouter(options.configPath);
    this.initialized = false;
    this.defaultOptions = {
      temperature: 0.7,
      maxTokens: 1000,
      stream: false,
      ...options.defaults
    };
  }

  /**
   * Initialize the router and detect hardware
   */
  async init() {
    if (this.initialized) return;
    
    await this.router.initialize();
    this.initialized = true;
    
    console.log('🖥️  Hardware-Aware Model Router Initialized');
    console.log(`   RAM: ${this.router.hardware.memory.totalGB}GB (Available: ${this.router.hardware.memory.availableGB}GB)`);
    console.log(`   CPU: ${this.router.hardware.cpu.cores} cores`);
    console.log(`   GPU: ${this.router.hardware.gpu.model}`);
    console.log(`   Ollama: ${this.router.hardware.ollama.available ? 'Available' : 'Not Available'}`);
  }

  /**
   * Complete a chat request - routes to local or API based on hardware
   * @param {Object} params - Request parameters
   * @param {string} params.model - Model identifier or 'auto'
   * @param {Array} params.messages - Chat messages
   * @param {number} params.maxTokens - Max tokens to generate
   * @param {number} params.temperature - Sampling temperature
   * @param {string} params.task - Task type: 'simple', 'standard', 'complex', 'intensive'
   * @param {boolean} params.forceLocal - Force local execution
   * @param {boolean} params.forceAPI - Force API execution
   * @returns {Object} Response with content and routing metadata
   */
  async complete(params) {
    await this.init();

    const {
      messages,
      maxTokens = this.defaultOptions.maxTokens,
      temperature = this.defaultOptions.temperature,
      task = this.inferTask(messages),
      model = 'auto',
      forceLocal = false,
      forceAPI = false
    } = params;

    // Get routing decision
    const routing = await this.router.route({
      task,
      maxTokens,
      preferredModel: model !== 'auto' ? model : null,
      forceLocal,
      forceAPI
    });

    console.log(`🔄 Routing to ${routing.target}: ${routing.model.name} (${routing.reason})`);

    // Execute the request
    let response;
    if (routing.target === 'local') {
      response = await this.executeLocal(routing.model.id, messages, { maxTokens, temperature });
    } else {
      response = await this.executeAPI(routing.model.id, messages, { maxTokens, temperature });
    }

    return {
      ...response,
      routing: {
        target: routing.target,
        model: routing.model.name,
        reason: routing.reason,
        hardwareScore: routing.hardware.capabilityScore
      }
    };
  }

  /**
   * Execute on local Ollama
   */
  async executeLocal(modelId, messages, options) {
    const startTime = Date.now();
    
    try {
      // Format messages for Ollama
      const prompt = this.formatMessagesForOllama(messages);
      
      // Build command
      const command = [
        'ollama', 'run', modelId,
        JSON.stringify(prompt),
        '--nowordwrap'
      ].join(' ');

      const result = execSync(command, {
        encoding: 'utf8',
        timeout: 60000,
        maxBuffer: 10 * 1024 * 1024 // 10MB
      });

      const latency = Date.now() - startTime;

      return {
        content: result.trim(),
        model: modelId,
        latency,
        tokensUsed: this.estimateTokens(result),
        local: true
      };
    } catch (error) {
      if (this.router.thresholds.fallback.apiFallbackOnError) {
        console.warn(`⚠️ Local execution failed: ${error.message}. Falling back to API.`);
        return this.executeAPI('minimax', messages, options);
      }
      throw error;
    }
  }

  /**
   * Execute on API
   */
  async executeAPI(modelId, messages, options) {
    const startTime = Date.now();

    // Use OpenClaw's native message/completion capability
    // This integrates with the existing system
    try {
      // For MiniMax, use simple HTTP request
      const response = await this.callMiniMax(messages, options);
      
      const latency = Date.now() - startTime;

      return {
        content: response,
        model: modelId,
        latency,
        tokensUsed: this.estimateTokens(response),
        local: false
      };
    } catch (error) {
      throw new Error(`API execution failed: ${error.message}`);
    }
  }

  /**
   * Call MiniMax API
   */
  async callMiniMax(messages, options) {
    // Placeholder for actual MiniMax API call
    // In production, this would use the actual MiniMax SDK
    const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n');
    
    // Simulated response for now
    return `[MiniMax Response for ${options.maxTokens} tokens]`;
  }

  /**
   * Format messages for Ollama
   */
  formatMessagesForOllama(messages) {
    if (typeof messages === 'string') return messages;
    
    return messages.map(m => {
      if (m.role === 'system') return `System: ${m.content}`;
      if (m.role === 'user') return `User: ${m.content}`;
      if (m.role === 'assistant') return `Assistant: ${m.content}`;
      return m.content;
    }).join('\n\n');
  }

  /**
   * Infer task complexity from messages
   */
  inferTask(messages) {
    const text = JSON.stringify(messages).toLowerCase();
    
    // Check for complex indicators
    const complexIndicators = [
      'analyze', 'evaluate', 'compare', 'synthesize',
      'debug', 'architecture', 'design pattern',
      'optimize', 'refactor', 'algorithm'
    ];
    
    const simpleIndicators = [
      'hello', 'hi', 'hey', 'thanks', 'okay', 'yes', 'no'
    ];
    
    const complexity = complexIndicators.filter(i => text.includes(i)).length;
    const simplicity = simpleIndicators.filter(i => text.includes(i)).length;
    
    if (complexity >= 2) return 'complex';
    if (simplicity >= 2 && complexity === 0) return 'simple';
    return 'standard';
  }

  /**
   * Estimate token count (rough approximation)
   */
  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }

  /**
   * Quick completion - convenience method
   */
  async quick(prompt, options = {}) {
    return this.complete({
      messages: [{ role: 'user', content: prompt }],
      ...options
    });
  }

  /**
   * Check hardware compatibility for a model
   */
  async checkCompatibility(modelId) {
    await this.init();
    return this.router.getCompatibleLocalModels().some(m => m.id === modelId);
  }

  /**
   * List available models
   */
  async listModels() {
    await this.init();
    
    return {
      local: this.router.getCompatibleLocalModels(),
      api: [
        { id: 'minimax', name: 'MiniMax', cost: '$0.10/1K' },
        { id: 'openrouter/pony-alpha', name: 'Pony Alpha', cost: '$0.20/1K' },
        { id: 'moonshot/kimi-k2.5', name: 'Kimi K2.5', cost: '$0.30/1K' }
      ]
    };
  }

  /**
   * Get routing statistics
   */
  getStats() {
    return this.router.getStats();
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.router.updateThresholds(newConfig);
  }

  /**
   * Refresh hardware detection
   */
  async refreshHardware() {
    await this.router.refreshHardware();
    console.log('🔄 Hardware detection refreshed');
    return this.router.hardware;
  }
}

// Create singleton instance
let defaultRouter = null;

export function getRouter(options = {}) {
  if (!defaultRouter) {
    defaultRouter = new ModelRouter(options);
  }
  return defaultRouter;
}

export { ModelRouter };
export default ModelRouter;

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const router = new ModelRouter();
  
  const command = process.argv[2];
  
  if (command === 'status') {
    router.init().then(() => {
      console.log('\n📊 Routing Statistics:');
      console.log(JSON.stringify(router.getStats(), null, 2));
    });
  } else if (command === 'models') {
    router.listModels().then(models => {
      console.log('\n🤖 Available Models:');
      console.log('\nLocal (compatible with your hardware):');
      models.local.forEach(m => console.log(`  • ${m.name} (${m.ramGB}GB RAM)`));
      console.log('\nAPI (fallback):');
      models.api.forEach(m => console.log(`  • ${m.name} (${m.cost})`));
    });
  } else if (command === 'complete') {
    const prompt = process.argv.slice(3).join(' ');
    router.quick(prompt).then(response => {
      console.log('\n📝 Response:');
      console.log(response.content);
      console.log('\n⚡ Routing:', response.routing.target, '-', response.routing.model);
    });
  } else {
    console.log('Usage:');
    console.log('  node model-router.js status    - Show hardware and routing stats');
    console.log('  node model-router.js models    - List available models');
    console.log('  node model-router.js complete <prompt> - Quick completion');
  }
}
