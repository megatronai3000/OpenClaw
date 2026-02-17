/**
 * Hardware-Aware Router
 * Routes LLM requests based on local hardware capabilities
 * Integrates with model-router.js
 */

import HardwareDetector from './hardware-detector.js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Default hardware thresholds
const DEFAULT_THRESHOLDS = {
  // Memory requirements per model size
  memoryRequirements: {
    '3b': { minGB: 4, recommendedGB: 6 },
    '7b': { minGB: 8, recommendedGB: 10 },
    '8b': { minGB: 8, recommendedGB: 12 },
    '14b': { minGB: 16, recommendedGB: 20 },
    '32b': { minGB: 32, recommendedGB: 40 },
    '70b': { minGB: 64, recommendedGB: 80 }
  },
  
  // CPU requirements
  cpuRequirements: {
    minCores: 4,
    recommendedCores: 6
  },
  
  // Task complexity thresholds
  taskThresholds: {
    simple: { maxTokens: 500, allowsLocal: true },
    standard: { maxTokens: 2000, allowsLocal: true },
    complex: { maxTokens: 4000, allowsLocal: true },
    intensive: { maxTokens: 8000, allowsLocal: false }
  },
  
  // Fallback strategy
  fallback: {
    alwaysPreferLocal: false,
    localFirstThreshold: 70, // Capability score above which try local first
    apiFallbackOnError: true,
    maxLocalLatency: 30000 // ms
  }
};

// Model definitions with hardware requirements
const LOCAL_MODELS = {
  'llama3.2:3b': {
    name: 'Llama 3.2 3B',
    size: '3b',
    ramGB: 4,
    useCase: ['chat', 'simple', 'fast'],
    quality: 'good',
    speed: 'fast'
  },
  'llama3.2:8b': {
    name: 'Llama 3.2 8B',
    size: '8b',
    ramGB: 10,
    useCase: ['chat', 'analysis', 'drafting'],
    quality: 'very-good',
    speed: 'fast'
  },
  'qwen2.5-coder:7b': {
    name: 'Qwen 2.5 Coder 7B',
    size: '7b',
    ramGB: 10,
    useCase: ['coding', 'architecture', 'technical'],
    quality: 'excellent',
    speed: 'fast'
  },
  'qwen2.5:14b': {
    name: 'Qwen 2.5 14B',
    size: '14b',
    ramGB: 18,
    useCase: ['complex', 'reasoning', 'debugging'],
    quality: 'excellent',
    speed: 'medium'
  },
  'llama3.1:8b': {
    name: 'Llama 3.1 8B',
    size: '8b',
    ramGB: 10,
    useCase: ['general', 'summaries', 'chat'],
    quality: 'very-good',
    speed: 'fast'
  }
};

// API models (fallback)
const API_MODELS = {
  'minimax': {
    name: 'MiniMax',
    costPer1K: 0.0001,
    useCase: ['all'],
    quality: 'good',
    speed: 'fast'
  },
  'openrouter/pony-alpha': {
    name: 'Pony Alpha',
    costPer1K: 0.0002,
    useCase: ['complex', 'reasoning'],
    quality: 'excellent',
    speed: 'fast'
  },
  'moonshot/kimi-k2.5': {
    name: 'Kimi K2.5',
    costPer1K: 0.0003,
    useCase: ['all'],
    quality: 'excellent',
    speed: 'medium'
  }
};

export class HardwareAwareRouter {
  constructor(configPath = null) {
    this.detector = new HardwareDetector();
    this.thresholds = this.loadConfig(configPath);
    this.hardware = null;
    this.routingHistory = [];
  }

  /**
   * Load configuration from file or use defaults
   */
  loadConfig(configPath) {
    if (!configPath) {
      const defaultPath = join(__dirname, 'hardware-config.json');
      if (existsSync(defaultPath)) {
        configPath = defaultPath;
      }
    }

    if (configPath && existsSync(configPath)) {
      try {
        const config = JSON.parse(readFileSync(configPath, 'utf8'));
        return { ...DEFAULT_THRESHOLDS, ...config };
      } catch (error) {
        console.warn('Failed to load config, using defaults:', error.message);
      }
    }

    return DEFAULT_THRESHOLDS;
  }

  /**
   * Initialize hardware detection
   */
  async initialize() {
    this.hardware = await this.detector.detect();
    return this.hardware;
  }

  /**
   * Route a request to the appropriate model
   * @param {Object} request - The request to route
   * @param {string} request.task - Task type: 'chat', 'coding', 'analysis', 'complex'
   * @param {number} request.maxTokens - Expected output length
   * @param {string} request.preferredModel - Optional preferred model
   * @param {boolean} request.forceLocal - Force local execution
   * @param {boolean} request.forceAPI - Force API execution
   * @returns {Object} Routing decision
   */
  async route(request) {
    if (!this.hardware) {
      await this.initialize();
    }

    const { task = 'standard', maxTokens = 1000, preferredModel = null, forceLocal = false, forceAPI = false } = request;
    
    // Force flags override everything
    if (forceAPI) {
      return this.createRoutingDecision('api', this.selectAPIModel(task), request, 'forced');
    }
    
    if (forceLocal) {
      const localModel = this.selectLocalModel(task, maxTokens, preferredModel);
      if (localModel) {
        return this.createRoutingDecision('local', localModel, request, 'forced');
      }
      return this.createRoutingDecision('api', this.selectAPIModel(task), request, 'fallback-forced-local-unavailable');
    }

    // Check hardware capability
    const capabilityScore = await this.detector.getCapabilityScore();
    const threshold = this.thresholds.fallback.localFirstThreshold;
    
    // Determine if local can handle this
    const canRunLocal = this.canRunLocal(task, maxTokens);
    
    // Routing logic
    let target = 'api';
    let model = null;
    let reason = '';

    if (canRunLocal && capabilityScore >= threshold) {
      // Try local first
      model = this.selectLocalModel(task, maxTokens, preferredModel);
      if (model) {
        target = 'local';
        reason = 'hardware-sufficient';
      } else {
        target = 'api';
        model = this.selectAPIModel(task);
        reason = 'no-compatible-local-model';
      }
    } else if (canRunLocal && this.thresholds.fallback.alwaysPreferLocal) {
      // User prefers local even with lower specs
      model = this.selectLocalModel(task, maxTokens, preferredModel);
      if (model) {
        target = 'local';
        reason = 'user-preference';
      } else {
        target = 'api';
        model = this.selectAPIModel(task);
        reason = 'no-compatible-local-model';
      }
    } else {
      // Use API
      target = 'api';
      model = this.selectAPIModel(task);
      reason = canRunLocal ? 'low-capability-score' : 'task-too-intensive';
    }

    return this.createRoutingDecision(target, model, request, reason);
  }

  /**
   * Check if local can handle the task
   */
  canRunLocal(task, maxTokens) {
    const taskThreshold = this.thresholds.taskThresholds[task] || this.thresholds.taskThresholds.standard;
    
    // Check token limit
    if (maxTokens > taskThreshold.maxTokens) {
      return false;
    }

    // Check if task allows local
    if (!taskThreshold.allowsLocal) {
      return false;
    }

    // Check memory
    const availableRAM = this.hardware.memory.availableGB;
    const minRequired = Math.min(...Object.values(this.thresholds.memoryRequirements).map(m => m.minGB));
    
    return availableRAM >= minRequired;
  }

  /**
   * Select best local model for task
   */
  selectLocalModel(task, maxTokens, preferredModel = null) {
    const availableRAM = this.hardware.memory.availableGB;
    
    // If preferred model specified and compatible, use it
    if (preferredModel && LOCAL_MODELS[preferredModel]) {
      const model = LOCAL_MODELS[preferredModel];
      if (model.ramGB <= availableRAM * 0.8) { // 80% threshold for safety
        return { ...model, id: preferredModel };
      }
    }

    // Filter compatible models
    const compatible = Object.entries(LOCAL_MODELS)
      .filter(([id, model]) => {
        // Check RAM
        if (model.ramGB > availableRAM * 0.8) return false;
        
        // Check if model supports task
        if (task === 'coding' && !model.useCase.includes('coding')) return false;
        if (task === 'complex' && !model.useCase.includes('complex') && !model.useCase.includes('reasoning')) return false;
        
        return true;
      })
      .map(([id, model]) => ({ ...model, id }));

    if (compatible.length === 0) return null;

    // Sort by: task match, quality, speed
    compatible.sort((a, b) => {
      // Prioritize task-specific models
      const aTaskMatch = a.useCase.includes(task) ? 2 : a.useCase.includes('all') ? 1 : 0;
      const bTaskMatch = b.useCase.includes(task) ? 2 : b.useCase.includes('all') ? 1 : 0;
      if (bTaskMatch !== aTaskMatch) return bTaskMatch - aTaskMatch;
      
      // Then quality
      const qualityRank = { excellent: 3, 'very-good': 2, good: 1 };
      if (qualityRank[b.quality] !== qualityRank[a.quality]) {
        return qualityRank[b.quality] - qualityRank[a.quality];
      }
      
      // Then speed
      const speedRank = { fast: 3, medium: 2, slow: 1 };
      return speedRank[b.speed] - speedRank[a.speed];
    });

    return compatible[0];
  }

  /**
   * Select best API model for task
   */
  selectAPIModel(task) {
    // Cost-sensitive default
    let selected = API_MODELS['minimax'];
    
    if (task === 'complex' || task === 'reasoning') {
      selected = API_MODELS['openrouter/pony-alpha'];
    }
    
    return { ...selected, id: selected === API_MODELS['minimax'] ? 'minimax' : 'openrouter/pony-alpha' };
  }

  /**
   * Create a routing decision record
   */
  createRoutingDecision(target, model, request, reason) {
    const decision = {
      id: `route_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      target, // 'local' or 'api'
      model,
      request,
      reason,
      hardware: {
        availableRAM: this.hardware.memory.availableGB,
        totalRAM: this.hardware.memory.totalGB,
        cores: this.hardware.cpu.cores,
        capabilityScore: this.detector.getCapabilityScore()
      },
      estimated: {
        latency: target === 'local' ? 'variable' : 'fast',
        cost: target === 'local' ? 0 : this.estimateAPICost(request.maxTokens)
      }
    };

    this.routingHistory.push(decision);
    
    // Keep history manageable
    if (this.routingHistory.length > 100) {
      this.routingHistory = this.routingHistory.slice(-50);
    }

    return decision;
  }

  /**
   * Estimate API cost
   */
  estimateAPICost(maxTokens) {
    // Rough estimate: $0.10 per 1K tokens for MiniMax
    return (maxTokens / 1000) * 0.0001;
  }

  /**
   * Get compatible local models for current hardware
   */
  getCompatibleLocalModels() {
    if (!this.hardware) return [];
    
    const availableRAM = this.hardware.memory.availableGB;
    
    return Object.entries(LOCAL_MODELS)
      .filter(([id, model]) => model.ramGB <= availableRAM * 0.8)
      .map(([id, model]) => ({ ...model, id }));
  }

  /**
   * Get routing statistics
   */
  getStats() {
    const total = this.routingHistory.length;
    const local = this.routingHistory.filter(r => r.target === 'local').length;
    const api = this.routingHistory.filter(r => r.target === 'api').length;
    
    const estimatedSavings = this.routingHistory
      .filter(r => r.target === 'local')
      .reduce((sum, r) => sum + (r.estimated.cost || 0), 0);

    return {
      totalRoutings: total,
      localRoutings: local,
      apiRoutings: api,
      localPercentage: total > 0 ? Math.round((local / total) * 100) : 0,
      estimatedCostSavings: estimatedSavings.toFixed(4),
      hardware: this.hardware
    };
  }

  /**
   * Update thresholds dynamically
   */
  updateThresholds(newThresholds) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  /**
   * Refresh hardware detection
   */
  async refreshHardware() {
    this.detector.clearCache();
    this.hardware = await this.detector.detect();
    return this.hardware;
  }
}

export default HardwareAwareRouter;
