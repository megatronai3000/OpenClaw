import { DecisionStore } from '../storage/DecisionStore.js';

/**
 * Logs outcomes for tracked decisions
 */
export class FeedbackLogger {
  constructor() {
    this.store = new DecisionStore();
  }

  /**
   * Log an outcome for a decision
   * @param {string} decisionId - The decision ID
   * @param {Object} params
   * @param {boolean} params.success - Whether the decision was successful
   * @param {number} params.quality - Quality score (0-1)
   * @param {Object} params.metrics - Quantitative metrics
   * @param {string} params.feedback - Human or system feedback
   * @param {string[]} params.tags - Tags for categorization
   * @param {Object} params.metadata - Additional metadata
   */
  async log(decisionId, {
    success,
    quality = null,
    metrics = {},
    feedback = null,
    tags = [],
    metadata = {}
  }) {
    // Verify decision exists
    const decision = await this.store.getDecision(decisionId);
    if (!decision) {
      throw new Error(`Decision not found: ${decisionId}`);
    }

    // Build outcome record
    const outcome = {
      success: Boolean(success),
      quality: this.normalizeQuality(quality),
      metrics: this.sanitizeMetrics(metrics),
      feedback: feedback ? this.truncate(feedback, 2000) : null,
      tags: tags.slice(0, 10),
      metadata: {
        ...metadata,
        decisionAgent: decision.agent,
        decisionTask: decision.task,
        loggedAt: new Date().toISOString()
      }
    };

    // Store outcome
    await this.store.saveOutcome(decisionId, outcome);
    
    return {
      decisionId,
      ...outcome
    };
  }

  /**
   * Batch log multiple outcomes
   */
  async logBatch(outcomes) {
    const results = [];
    
    for (const { decisionId, outcome } of outcomes) {
      try {
        const result = await this.log(decisionId, outcome);
        results.push({ success: true, result });
      } catch (error) {
        results.push({ success: false, error: error.message, decisionId });
      }
    }
    
    return results;
  }

  /**
   * Get outcome for a decision
   */
  async get(decisionId) {
    return this.store.getOutcome(decisionId);
  }

  /**
   * Get outcomes with their decisions
   */
  async getWithDecisions(filters = {}) {
    return this.store.getDecisionsWithOutcomes(filters);
  }

  /**
   * Get outcome statistics
   */
  async getStats(agent = null, timeframe = null) {
    const decisions = await this.store.getDecisionsWithOutcomes({ agent });
    
    // Filter by timeframe
    let filtered = decisions;
    if (timeframe) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - parseInt(timeframe));
      filtered = decisions.filter(d => new Date(d.timestamp) >= cutoff);
    }

    const withOutcomes = filtered.filter(d => d.outcome);
    const successful = withOutcomes.filter(d => d.outcome.success);
    const failed = withOutcomes.filter(d => !d.outcome.success);

    // Calculate quality metrics
    const qualities = withOutcomes
      .map(d => d.outcome.quality)
      .filter(q => q !== null);
    
    const avgQuality = qualities.length > 0
      ? qualities.reduce((a, b) => a + b, 0) / qualities.length
      : null;

    // Tag analysis
    const tagCounts = {};
    withOutcomes.forEach(d => {
      (d.outcome.tags || []).forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    return {
      totalDecisions: filtered.length,
      withOutcomes: withOutcomes.length,
      successCount: successful.length,
      failureCount: failed.length,
      accuracy: withOutcomes.length > 0 
        ? successful.length / withOutcomes.length 
        : 0,
      averageQuality: avgQuality,
      tagDistribution: tagCounts,
      timeframe
    };
  }

  /**
   * Normalize quality score
   */
  normalizeQuality(quality) {
    if (quality === null || quality === undefined) return null;
    const num = parseFloat(quality);
    if (isNaN(num)) return null;
    return Math.max(0, Math.min(1, num));
  }

  /**
   * Sanitize metrics
   */
  sanitizeMetrics(metrics) {
    const sanitized = {};
    
    for (const [key, value] of Object.entries(metrics)) {
      // Only accept primitive values
      if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * Truncate string
   */
  truncate(str, maxLength) {
    if (!str || str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
  }
}