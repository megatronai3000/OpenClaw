import { WorkflowStore } from '../storage/WorkflowStore.js';
import { CardStore } from '../storage/CardStore.js';
import { AnalyticsStore } from '../storage/AnalyticsStore.js';
import { TransitionEngine } from '../transitions/TransitionEngine.js';
import { ValidationEngine } from '../validators/ValidationEngine.js';
import { RuleEngine } from '../rules/RuleEngine.js';
import { WorkflowAnalytics } from '../analytics/WorkflowAnalytics.js';
import { MinimaxOptimizer } from '../ml/MinimaxOptimizer.js';

/**
 * KanbanWorkflow - Enhanced Workflow System with Automated Transitions
 * 
 * Core Features:
 * 1. Define workflow rules (when to move cards)
 * 2. Automated transitions based on criteria
 * 3. Validation gates before transitions
 * 4. Custom workflow definitions per project
 * 5. Workflow analytics (time in each stage)
 * 
 * Uses MiniMax for optimization and intelligent recommendations
 */
export class KanbanWorkflow {
  constructor(options = {}) {
    this.options = {
      minimaxApiKey: null,
      enableOptimization: true,
      autoTransition: true,
      validationStrictness: 'medium', // low, medium, high
      ...options
    };

    // Storage
    this.workflowStore = new WorkflowStore();
    this.cardStore = new CardStore();
    this.analyticsStore = new AnalyticsStore();

    // Engines
    this.ruleEngine = new RuleEngine();
    this.transitionEngine = new TransitionEngine({
      autoTransition: this.options.autoTransition
    });
    this.validationEngine = new ValidationEngine({
      strictness: this.options.validationStrictness
    });
    this.analytics = new WorkflowAnalytics();
    
    // MiniMax optimization
    this.optimizer = this.options.enableOptimization
      ? new MinimaxOptimizer(this.options.minimaxApiKey)
      : null;
  }

  /**
   * Create a new workflow definition for a project
   * @param {string} projectId - Project identifier
   * @param {Object} definition - Workflow definition
   */
  async createWorkflow(projectId, definition) {
    const workflow = {
      id: `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      projectId,
      name: definition.name || `${projectId} Workflow`,
      stages: definition.stages || this.getDefaultStages(),
      rules: definition.rules || [],
      transitions: definition.transitions || [],
      validators: definition.validators || [],
      autoTransitionRules: definition.autoTransitionRules || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Validate workflow structure
    const validation = this.validateWorkflowStructure(workflow);
    if (!validation.valid) {
      throw new Error(`Invalid workflow: ${validation.errors.join(', ')}`);
    }

    await this.workflowStore.save(workflow);
    return workflow;
  }

  /**
   * Get default Kanban stages
   */
  getDefaultStages() {
    return [
      { id: 'backlog', name: 'Backlog', order: 0, wipLimit: null },
      { id: 'todo', name: 'To Do', order: 1, wipLimit: null },
      { id: 'in_progress', name: 'In Progress', order: 2, wipLimit: 3 },
      { id: 'review', name: 'Review', order: 3, wipLimit: 5 },
      { id: 'done', name: 'Done', order: 4, wipLimit: null }
    ];
  }

  /**
   * Create a new card in the workflow
   * @param {string} projectId - Project identifier
   * @param {Object} cardData - Card data
   */
  async createCard(projectId, cardData) {
    const workflow = await this.getWorkflow(projectId);
    if (!workflow) {
      throw new Error(`No workflow found for project: ${projectId}`);
    }

    const card = {
      id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      projectId,
      workflowId: workflow.id,
      title: cardData.title,
      description: cardData.description,
      stage: cardData.stage || workflow.stages[0].id,
      priority: cardData.priority || 'medium',
      assignee: cardData.assignee || null,
      tags: cardData.tags || [],
      metadata: cardData.metadata || {},
      stageHistory: [{
        stage: cardData.stage || workflow.stages[0].id,
        enteredAt: new Date().toISOString(),
        triggeredBy: 'manual'
      }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.cardStore.save(card);
    await this.analytics.recordCardCreated(card);

    // Check for auto-transition opportunities
    if (this.options.autoTransition) {
      await this.checkAutoTransitions(card);
    }

    return card;
  }

  /**
   * Attempt to transition a card to a new stage
   * @param {string} cardId - Card identifier
   * @param {string} targetStage - Target stage ID
   * @param {Object} context - Transition context
   */
  async transitionCard(cardId, targetStage, context = {}) {
    const card = await this.cardStore.get(cardId);
    if (!card) {
      throw new Error(`Card not found: ${cardId}`);
    }

    const workflow = await this.getWorkflow(card.projectId);
    if (!workflow) {
      throw new Error(`Workflow not found for card: ${cardId}`);
    }

    // Get current and target stage info
    const currentStage = workflow.stages.find(s => s.id === card.stage);
    const nextStage = workflow.stages.find(s => s.id === targetStage);

    if (!nextStage) {
      throw new Error(`Invalid target stage: ${targetStage}`);
    }

    // Build transition context
    const transitionContext = {
      card,
      workflow,
      fromStage: currentStage,
      toStage: nextStage,
      triggeredBy: context.triggeredBy || 'manual',
      triggeredByUser: context.userId || null,
      reason: context.reason || null,
      timestamp: new Date().toISOString(),
      ...context
    };

    // Check if transition is allowed by workflow rules
    const ruleCheck = await this.ruleEngine.checkTransitionRules(transitionContext);
    if (!ruleCheck.allowed) {
      return {
        success: false,
        reason: 'RULE_BLOCKED',
        message: ruleCheck.message,
        blockingRules: ruleCheck.blockingRules
      };
    }

    // Run validation gates
    const validation = await this.validationEngine.validate(transitionContext);
    if (!validation.passed) {
      return {
        success: false,
        reason: 'VALIDATION_FAILED',
        message: validation.message,
        failedValidations: validation.failures
      };
    }

    // Check WIP limits
    const wipCheck = await this.checkWipLimit(workflow, nextStage);
    if (!wipCheck.allowed) {
      return {
        success: false,
        reason: 'WIP_LIMIT_EXCEEDED',
        message: `WIP limit (${nextStage.wipLimit}) reached for ${nextStage.name}`,
        currentWip: wipCheck.currentWip
      };
    }

    // Execute the transition
    const previousStage = card.stage;
    card.stage = targetStage;
    card.stageHistory.push({
      stage: targetStage,
      enteredAt: new Date().toISOString(),
      triggeredBy: context.triggeredBy || 'manual',
      triggeredByUser: context.userId || null,
      duration: this.calculateStageDuration(card, previousStage)
    });
    card.updatedAt = new Date().toISOString();

    await this.cardStore.update(card);
    await this.analytics.recordTransition(transitionContext);

    // Check for subsequent auto-transitions
    if (this.options.autoTransition) {
      await this.checkAutoTransitions(card);
    }

    return {
      success: true,
      card,
      transition: {
        from: previousStage,
        to: targetStage,
        duration: transitionContext.duration
      }
    };
  }

  /**
   * Check and execute auto-transitions for a card
   * @param {Object} card - Card object
   */
  async checkAutoTransitions(card) {
    const workflow = await this.getWorkflow(card.projectId);
    if (!workflow || !workflow.autoTransitionRules?.length) {
      return [];
    }

    const executedTransitions = [];

    for (const rule of workflow.autoTransitionRules) {
      const shouldTrigger = await this.evaluateAutoTransitionRule(card, rule, workflow);
      
      if (shouldTrigger) {
        const result = await this.transitionCard(card.id, rule.targetStage, {
          triggeredBy: 'auto',
          reason: rule.name,
          ruleId: rule.id
        });

        if (result.success) {
          executedTransitions.push({
            rule: rule.name,
            from: result.transition.from,
            to: result.transition.to
          });
        }
      }
    }

    return executedTransitions;
  }

  /**
   * Evaluate if an auto-transition rule should trigger
   * @param {Object} card - Card object
   * @param {Object} rule - Auto-transition rule
   * @param {Object} workflow - Workflow object
   */
  async evaluateAutoTransitionRule(card, rule, workflow) {
    // Check if card is in the correct source stage
    if (rule.fromStage && card.stage !== rule.fromStage) {
      return false;
    }

    // Evaluate conditions
    for (const condition of rule.conditions || []) {
      const met = await this.evaluateCondition(card, condition, workflow);
      if (!met) return false;
    }

    return true;
  }

  /**
   * Evaluate a single condition
   * @param {Object} card - Card object
   * @param {Object} condition - Condition definition
   * @param {Object} workflow - Workflow object
   */
  async evaluateCondition(card, condition, workflow) {
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
        return new RegExp(value).test(cardValue);
      case 'time_in_stage':
        const duration = this.getTimeInStage(card, card.stage);
        return this.compareDuration(duration, value, operator);
      default:
        return false;
    }
  }

  /**
   * Get field value from card or its metadata
   * @param {Object} card - Card object
   * @param {string} field - Field path (e.g., 'metadata.approved')
   */
  getFieldValue(card, field) {
    const parts = field.split('.');
    let value = card;
    for (const part of parts) {
      value = value?.[part];
    }
    return value;
  }

  /**
   * Compare duration against a threshold
   * @param {number} duration - Duration in milliseconds
   * @param {string} threshold - Threshold string (e.g., '2h', '1d')
   * @param {string} operator - Comparison operator
   */
  compareDuration(duration, threshold, operator) {
    const thresholdMs = this.parseDuration(threshold);
    
    switch (operator) {
      case 'gt':
      case 'time_gt':
        return duration > thresholdMs;
      case 'gte':
      case 'time_gte':
        return duration >= thresholdMs;
      case 'lt':
      case 'time_lt':
        return duration < thresholdMs;
      case 'lte':
      case 'time_lte':
        return duration <= thresholdMs;
      default:
        return false;
    }
  }

  /**
   * Parse duration string to milliseconds
   * @param {string} duration - Duration string (e.g., '2h', '1d', '30m')
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
   * Get time card has been in current stage
   * @param {Object} card - Card object
   * @param {string} stage - Stage ID
   */
  getTimeInStage(card, stage) {
    const stageEntry = card.stageHistory.find(h => h.stage === stage);
    if (!stageEntry) return 0;

    const enteredAt = new Date(stageEntry.enteredAt);
    return Date.now() - enteredAt.getTime();
  }

  /**
   * Calculate duration spent in a stage before leaving
   * @param {Object} card - Card object
   * @param {string} stage - Stage ID
   */
  calculateStageDuration(card, stage) {
    const entries = card.stageHistory.filter(h => h.stage === stage);
    if (entries.length === 0) return null;

    const entry = entries[entries.length - 1];
    const enteredAt = new Date(entry.enteredAt);
    return Date.now() - enteredAt.getTime();
  }

  /**
   * Check WIP limit for a stage
   * @param {Object} workflow - Workflow object
   * @param {Object} stage - Stage object
   */
  async checkWipLimit(workflow, stage) {
    if (!stage.wipLimit) {
      return { allowed: true };
    }

    const cardsInStage = await this.cardStore.countByStage(workflow.projectId, stage.id);
    
    return {
      allowed: cardsInStage < stage.wipLimit,
      currentWip: cardsInStage,
      limit: stage.wipLimit
    };
  }

  /**
   * Validate workflow structure
   * @param {Object} workflow - Workflow object
   */
  validateWorkflowStructure(workflow) {
    const errors = [];

    if (!workflow.stages || workflow.stages.length === 0) {
      errors.push('Workflow must have at least one stage');
    }

    // Check for duplicate stage IDs
    const stageIds = workflow.stages.map(s => s.id);
    const duplicates = stageIds.filter((id, index) => stageIds.indexOf(id) !== index);
    if (duplicates.length > 0) {
      errors.push(`Duplicate stage IDs: ${duplicates.join(', ')}`);
    }

    // Check for valid transitions
    for (const transition of workflow.transitions || []) {
      if (!stageIds.includes(transition.from)) {
        errors.push(`Invalid transition from stage: ${transition.from}`);
      }
      if (!stageIds.includes(transition.to)) {
        errors.push(`Invalid transition to stage: ${transition.to}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get workflow for a project
   * @param {string} projectId - Project identifier
   */
  async getWorkflow(projectId) {
    return this.workflowStore.getByProject(projectId);
  }

  /**
   * Get workflow analytics
   * @param {string} projectId - Project identifier
   * @param {Object} options - Analytics options
   */
  async getAnalytics(projectId, options = {}) {
    return this.analytics.generateReport(projectId, options);
  }

  /**
   * Get optimization recommendations using MiniMax
   * @param {string} projectId - Project identifier
   */
  async getOptimizationRecommendations(projectId) {
    if (!this.optimizer) {
      return {
        available: false,
        message: 'Optimization not enabled'
      };
    }

    const analytics = await this.getAnalytics(projectId, { includeRaw: true });
    const workflow = await this.getWorkflow(projectId);
    
    return this.optimizer.generateRecommendations(workflow, analytics);
  }

  /**
   * Bulk transition cards based on rules
   * @param {string} projectId - Project identifier
   * @param {Object} criteria - Selection criteria
   * @param {string} targetStage - Target stage
   */
  async bulkTransition(projectId, criteria, targetStage) {
    const cards = await this.cardStore.query({
      projectId,
      ...criteria
    });

    const results = {
      total: cards.length,
      successful: 0,
      failed: 0,
      errors: []
    };

    for (const card of cards) {
      try {
        const result = await this.transitionCard(card.id, targetStage, {
          triggeredBy: 'bulk'
        });

        if (result.success) {
          results.successful++;
        } else {
          results.failed++;
          results.errors.push({
            cardId: card.id,
            reason: result.reason,
            message: result.message
          });
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          cardId: card.id,
          reason: 'EXCEPTION',
          message: error.message
        });
      }
    }

    return results;
  }
}

export default KanbanWorkflow;