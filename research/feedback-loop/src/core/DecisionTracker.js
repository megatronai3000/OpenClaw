import { DecisionStore } from '../storage/DecisionStore.js';

/**
 * Tracks all agent decisions with full context
 */
export class DecisionTracker {
  constructor() {
    this.store = new DecisionStore();
  }

  /**
   * Track a new decision
   * @param {Object} params
   * @param {string} params.agent - Agent identifier
   * @param {string} params.task - Task type
   * @param {Object} params.context - Decision context
   * @param {Object} params.decision - The actual decision made
   * @param {number} params.confidence - Confidence score (0-1)
   * @param {string[]} params.alternatives - Alternative options considered
   * @param {Object} params.metadata - Additional metadata
   */
  async track({
    agent,
    task,
    context = {},
    decision,
    confidence = null,
    alternatives = [],
    metadata = {}
  }) {
    // Validate required fields
    if (!agent || !task) {
      throw new Error('Agent and task are required');
    }

    // Build decision record
    const record = {
      agent,
      task,
      context: this.sanitizeContext(context),
      decision: this.sanitizeDecision(decision),
      confidence: this.normalizeConfidence(confidence),
      alternatives: alternatives.slice(0, 5), // Keep top 5
      metadata: {
        ...metadata,
        trackedAt: new Date().toISOString()
      }
    };

    // Store decision
    const id = await this.store.saveDecision(record);
    
    return {
      id,
      ...record
    };
  }

  /**
   * Get a decision by ID
   */
  async get(id) {
    return this.store.getDecision(id);
  }

  /**
   * Query decisions with filters
   */
  async query(filters = {}) {
    return this.store.queryDecisions(filters);
  }

  /**
   * Get decisions for a specific agent
   */
  async getAgentDecisions(agent, options = {}) {
    const { timeframe, limit = 100 } = options;
    const decisions = await this.store.getAgentDecisions(agent, timeframe);
    return decisions.slice(0, limit);
  }

  /**
   * Get decision statistics
   */
  async getStats(agent = null) {
    const storeStats = await this.store.getStats();
    
    if (!agent) {
      return storeStats;
    }

    const decisions = await this.store.getAgentDecisions(agent);
    const withOutcomes = decisions.filter(d => d.outcome);
    const successful = withOutcomes.filter(d => d.outcome?.success);

    return {
      ...storeStats,
      agent,
      totalDecisions: decisions.length,
      withOutcomes: withOutcomes.length,
      successCount: successful.length,
      failureCount: withOutcomes.length - successful.length,
      accuracy: withOutcomes.length > 0 
        ? successful.length / withOutcomes.length 
        : null
    };
  }

  /**
   * Sanitize context for storage
   */
  sanitizeContext(context) {
    // Remove sensitive data
    const sanitized = { ...context };
    
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'apiKey', 'auth'];
    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        sanitized[key] = '[REDACTED]';
      }
    }
    
    // Limit size
    const str = JSON.stringify(sanitized);
    if (str.length > 10000) {
      return {
        ...sanitized,
        _truncated: true,
        _originalSize: str.length
      };
    }
    
    return sanitized;
  }

  /**
   * Sanitize decision for storage
   */
  sanitizeDecision(decision) {
    if (typeof decision !== 'object' || decision === null) {
      return { value: decision };
    }
    return decision;
  }

  /**
   * Normalize confidence score
   */
  normalizeConfidence(confidence) {
    if (confidence === null || confidence === undefined) return null;
    const num = parseFloat(confidence);
    if (isNaN(num)) return null;
    return Math.max(0, Math.min(1, num));
  }
}