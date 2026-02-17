/**
 * TransitionEngine - Manages automated card transitions
 * 
 * Automatically moves cards based on:
 * - Time-based triggers (e.g., auto-archive after 30 days)
 * - Event-based triggers (e.g., when all subtasks complete)
 * - Condition-based triggers (e.g., when approved by 2 people)
 */
export class TransitionEngine {
  constructor(options = {}) {
    this.options = {
      autoTransition: true,
      maxAutoTransitions: 3, // Prevent infinite loops
      transitionDelay: 0, // Delay in ms before auto-transition
      ...options
    };

    this.transitionHandlers = new Map();
    this.registerDefaultHandlers();
  }

  /**
   * Register default transition handlers
   */
  registerDefaultHandlers() {
    this.registerHandler('time_based', this.handleTimeBasedTransition.bind(this));
    this.registerHandler('event_based', this.handleEventBasedTransition.bind(this));
    this.registerHandler('condition_based', this.handleConditionBasedTransition.bind(this));
    this.registerHandler('escalation', this.handleEscalationTransition.bind(this));
  }

  /**
   * Register a transition handler
   * @param {string} type - Handler type
   * @param {Function} handler - Handler function
   */
  registerHandler(type, handler) {
    this.transitionHandlers.set(type, handler);
  }

  /**
   * Process auto-transition rules for a workflow
   * @param {Object} workflow - Workflow definition
   * @param {Object} card - Card to evaluate
   */
  async processAutoTransitions(workflow, card) {
    if (!this.options.autoTransition) {
      return { processed: false, reason: 'Auto-transition disabled' };
    }

    const results = [];
    let transitionCount = 0;

    for (const rule of workflow.autoTransitionRules || []) {
      if (transitionCount >= this.options.maxAutoTransitions) {
        break;
      }

      const handler = this.transitionHandlers.get(rule.type);
      if (!handler) {
        console.warn(`Unknown auto-transition type: ${rule.type}`);
        continue;
      }

      try {
        const result = await handler(rule, workflow, card);
        
        if (result.shouldTransition) {
          results.push({
            rule: rule.name,
            targetStage: rule.targetStage,
            reason: result.reason
          });
          transitionCount++;
        }
      } catch (error) {
        console.error(`Auto-transition error for rule '${rule.name}':`, error);
      }
    }

    return {
      processed: true,
      transitions: results,
      count: transitionCount
    };
  }

  /**
   * Handle time-based auto-transitions
   * Trigger when card has been in stage for specified duration
   */
  async handleTimeBasedTransition(rule, workflow, card) {
    const { duration, stage: targetStage } = rule.config || {};
    
    if (!duration) {
      return { shouldTransition: false, reason: 'No duration specified' };
    }

    // Check if card is in the correct source stage
    if (rule.fromStage && card.stage !== rule.fromStage) {
      return { shouldTransition: false, reason: 'Card not in source stage' };
    }

    // Get time in current stage
    const currentStageHistory = card.stageHistory
      .filter(h => h.stage === card.stage);
    
    if (currentStageHistory.length === 0) {
      return { shouldTransition: false, reason: 'No stage history' };
    }

    const lastEntry = currentStageHistory[currentStageHistory.length - 1];
    const timeInStage = Date.now() - new Date(lastEntry.enteredAt).getTime();
    const durationMs = this.parseDuration(duration);

    const shouldTransition = timeInStage >= durationMs;

    return {
      shouldTransition,
      reason: shouldTransition 
        ? `Time in stage (${this.formatDuration(timeInStage)}) exceeded ${duration}`
        : `Time in stage: ${this.formatDuration(timeInStage)}, need: ${duration}`
    };
  }

  /**
   * Handle event-based auto-transitions
   * Trigger when specific events occur
   */
  async handleEventBasedTransition(rule, workflow, card) {
    const { event, conditions } = rule.config || {};

    if (!event) {
      return { shouldTransition: false, reason: 'No event specified' };
    }

    // Check if card is in the correct source stage
    if (rule.fromStage && card.stage !== rule.fromStage) {
      return { shouldTransition: false, reason: 'Card not in source stage' };
    }

    // Evaluate event conditions
    let shouldTransition = true;
    const unmetConditions = [];

    for (const condition of conditions || []) {
      const met = await this.evaluateEventCondition(card, condition);
      if (!met) {
        shouldTransition = false;
        unmetConditions.push(condition.description || condition.type);
      }
    }

    return {
      shouldTransition,
      reason: shouldTransition
        ? `Event conditions met: ${event}`
        : `Unmet conditions: ${unmetConditions.join(', ')}`,
      unmetConditions: shouldTransition ? [] : unmetConditions
    };
  }

  /**
   * Handle condition-based auto-transitions
   * Trigger when card metadata meets conditions
   */
  async handleConditionBasedTransition(rule, workflow, card) {
    const { conditions } = rule.config || {};

    if (!conditions || conditions.length === 0) {
      return { shouldTransition: false, reason: 'No conditions specified' };
    }

    // Check if card is in the correct source stage
    if (rule.fromStage && card.stage !== rule.fromStage) {
      return { shouldTransition: false, reason: 'Card not in source stage' };
    }

    // Evaluate all conditions
    let shouldTransition = true;
    const unmetConditions = [];

    for (const condition of conditions) {
      const met = await this.evaluateCondition(card, condition);
      if (!met) {
        shouldTransition = false;
        unmetConditions.push(condition.field || condition.type);
      }
    }

    return {
      shouldTransition,
      reason: shouldTransition
        ? 'All conditions met'
        : `Unmet conditions: ${unmetConditions.join(', ')}`,
      unmetConditions: shouldTransition ? [] : unmetConditions
    };
  }

  /**
   * Handle escalation transitions
   * Move card to escalation stage when thresholds are exceeded
   */
  async handleEscalationTransition(rule, workflow, card) {
    const { threshold, metric } = rule.config || {};

    if (!threshold || !metric) {
      return { shouldTransition: false, reason: 'Missing threshold or metric' };
    }

    // Calculate metric value
    const metricValue = await this.calculateMetric(card, metric);
    
    const shouldTransition = metricValue >= threshold;

    return {
      shouldTransition,
      reason: shouldTransition
        ? `${metric} (${metricValue}) exceeded threshold (${threshold})`
        : `${metric}: ${metricValue}, threshold: ${threshold}`,
      metric: {
        name: metric,
        value: metricValue,
        threshold
      }
    };
  }

  /**
   * Evaluate a condition against card data
   * @param {Object} card - Card object
   * @param {Object} condition - Condition definition
   */
  async evaluateCondition(card, condition) {
    const { field, operator, value } = condition;
    const cardValue = this.getFieldValue(card, field);

    switch (operator) {
      case 'eq':
        return cardValue === value;
      case 'neq':
        return cardValue !== value;
      case 'gt':
        return cardValue > value;
      case 'gte':
        return cardValue >= value;
      case 'lt':
        return cardValue < value;
      case 'lte':
        return cardValue <= value;
      case 'contains':
        return Array.isArray(cardValue) && cardValue.includes(value);
      case 'not_contains':
        return Array.isArray(cardValue) && !cardValue.includes(value);
      case 'exists':
        return cardValue !== undefined && cardValue !== null;
      case 'matches':
        return new RegExp(value).test(String(cardValue));
      default:
        return false;
    }
  }

  /**
   * Evaluate event-based conditions
   * @param {Object} card - Card object
   * @param {Object} condition - Event condition
   */
  async evaluateEventCondition(card, condition) {
    const { type, config } = condition;

    switch (type) {
      case 'subtasks_complete':
        const subtasks = card.metadata?.subtasks || [];
        const total = subtasks.length;
        const completed = subtasks.filter(s => s.status === 'done').length;
        return total > 0 && completed === total;

      case 'approvals_received':
        const approvals = card.metadata?.approvals || [];
        const required = config?.count || 1;
        return approvals.length >= required;

      case 'linked_items_resolved':
        const linked = card.metadata?.linkedItems || [];
        const resolved = linked.filter(l => l.status === 'resolved').length;
        return linked.length > 0 && resolved === linked.length;

      case 'field_updated':
        const field = config?.field;
        return card.metadata?.lastUpdatedField === field;

      case 'comment_added':
        const comments = card.metadata?.comments || [];
        const since = config?.since ? new Date(config.since) : null;
        const recentComments = since 
          ? comments.filter(c => new Date(c.createdAt) > since)
          : comments;
        return recentComments.length > 0;

      default:
        return false;
    }
  }

  /**
   * Calculate a metric for escalation
   * @param {Object} card - Card object
   * @param {string} metric - Metric name
   */
  async calculateMetric(card, metric) {
    switch (metric) {
      case 'time_in_stage_hours':
        const currentEntry = card.stageHistory
          .filter(h => h.stage === card.stage)
          .pop();
        if (!currentEntry) return 0;
        const timeMs = Date.now() - new Date(currentEntry.enteredAt).getTime();
        return Math.floor(timeMs / (1000 * 60 * 60));

      case 'total_time_hours':
        const createdAt = new Date(card.createdAt);
        return Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60));

      case 'rework_count':
        // Count how many times card moved backward
        let reworkCount = 0;
        const stages = card.stageHistory.map(h => h.stage);
        for (let i = 1; i < stages.length; i++) {
          // Simplified: count repeated stages as rework
          if (stages[i] === stages[i - 2]) {
            reworkCount++;
          }
        }
        return reworkCount;

      case 'blocker_count':
        return card.metadata?.blockers?.length || 0;

      default:
        // Try to get from metadata
        return card.metadata?.metrics?.[metric] || 0;
    }
  }

  /**
   * Get field value from card using dot notation
   * @param {Object} card - Card object
   * @param {string} path - Field path
   */
  getFieldValue(card, path) {
    if (!path) return undefined;
    return path.split('.').reduce((obj, key) => obj?.[key], card);
  }

  /**
   * Parse duration string to milliseconds
   * @param {string} duration - Duration string (e.g., '2h', '1d')
   */
  parseDuration(duration) {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 0;

    const value = parseInt(match[1]);
    const unit = match[2];

    const multipliers = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000
    };

    return value * (multipliers[unit] || 0);
  }

  /**
   * Format duration for display
   * @param {number} ms - Duration in milliseconds
   */
  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
}

export default TransitionEngine;