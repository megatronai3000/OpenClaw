/**
 * RuleEngine - Defines and evaluates workflow transition rules
 * 
 * Rules determine WHEN cards can move between stages.
 * Examples:
 * - "Card must have assignee before moving to In Progress"
 * - "Card must have approval before moving to Done"
 * - "High priority cards can skip Review stage"
 */
export class RuleEngine {
  constructor() {
    this.ruleRegistry = new Map();
    this.registerDefaultRules();
  }

  /**
   * Register default rule types
   */
  registerDefaultRules() {
    // Field requirement rules
    this.registerRule('field_required', this.evaluateFieldRequired.bind(this));
    this.registerRule('field_value', this.evaluateFieldValue.bind(this));
    
    // Stage progression rules
    this.registerRule('stage_sequence', this.evaluateStageSequence.bind(this));
    this.registerRule('stage_prerequisite', this.evaluateStagePrerequisite.bind(this));
    
    // Time-based rules
    this.registerRule('min_time_in_stage', this.evaluateMinTimeInStage.bind(this));
    this.registerRule('max_time_in_stage', this.evaluateMaxTimeInStage.bind(this));
    this.registerRule('business_hours_only', this.evaluateBusinessHours.bind(this));
    
    // Assignment rules
    this.registerRule('assignee_required', this.evaluateAssigneeRequired.bind(this));
    this.registerRule('assignee_role', this.evaluateAssigneeRole.bind(this));
    
    // Approval rules
    this.registerRule('approval_required', this.evaluateApprovalRequired.bind(this));
    this.registerRule('min_approvals', this.evaluateMinApprovals.bind(this));
    
    // Tag/label rules
    this.registerRule('tag_required', this.evaluateTagRequired.bind(this));
    this.registerRule('tag_excluded', this.evaluateTagExcluded.bind(this));
    
    // Priority rules
    this.registerRule('priority_check', this.evaluatePriorityCheck.bind(this));
    
    // Custom rules
    this.registerRule('custom_script', this.evaluateCustomScript.bind(this));
  }

  /**
   * Register a rule evaluator
   * @param {string} type - Rule type
   * @param {Function} evaluator - Evaluator function
   */
  registerRule(type, evaluator) {
    this.ruleRegistry.set(type, evaluator);
  }

  /**
   * Check all transition rules for a context
   * @param {Object} context - Transition context
   */
  async checkTransitionRules(context) {
    const { card, workflow, fromStage, toStage } = context;
    const blockingRules = [];

    // Get applicable rules for this transition
    const applicableRules = this.getApplicableRules(workflow, fromStage.id, toStage.id);

    for (const rule of applicableRules) {
      const evaluator = this.ruleRegistry.get(rule.type);
      
      if (!evaluator) {
        console.warn(`Unknown rule type: ${rule.type}`);
        continue;
      }

      try {
        const result = await evaluator(rule, context);
        
        if (!result.passed) {
          blockingRules.push({
            rule: rule.name || rule.type,
            type: rule.type,
            message: result.message || `Rule '${rule.name}' blocked transition`
          });
        }
      } catch (error) {
        blockingRules.push({
          rule: rule.name || rule.type,
          type: rule.type,
          message: `Rule evaluation error: ${error.message}`
        });
      }
    }

    return {
      allowed: blockingRules.length === 0,
      message: blockingRules.length > 0 
        ? `Blocked by ${blockingRules.length} rule(s)` 
        : 'All rules passed',
      blockingRules
    };
  }

  /**
   * Get rules applicable to a specific transition
   * @param {Object} workflow - Workflow definition
   * @param {string} fromStage - Source stage ID
   * @param {string} toStage - Target stage ID
   */
  getApplicableRules(workflow, fromStage, toStage) {
    if (!workflow.rules) return [];

    return workflow.rules.filter(rule => {
      // Check if rule applies to this transition
      if (rule.fromStage && rule.fromStage !== fromStage) return false;
      if (rule.toStage && rule.toStage !== toStage) return false;
      if (rule.stages && !rule.stages.includes(toStage)) return false;
      
      // Check if rule is enabled
      if (rule.enabled === false) return false;

      return true;
    });
  }

  /**
   * Evaluate field_required rule
   * Card must have specified field populated
   */
  evaluateFieldRequired(rule, context) {
    const { card } = context;
    const field = rule.config?.field;
    
    if (!field) {
      return { passed: false, message: 'Rule configuration error: field not specified' };
    }

    const value = this.getNestedValue(card, field);
    const hasValue = value !== undefined && value !== null && value !== '';

    return {
      passed: hasValue,
      message: hasValue ? null : `Field '${field}' is required`
    };
  }

  /**
   * Evaluate field_value rule
   * Card field must match specified value
   */
  evaluateFieldValue(rule, context) {
    const { card } = context;
    const { field, operator = 'eq', value } = rule.config || {};

    if (!field) {
      return { passed: false, message: 'Rule configuration error: field not specified' };
    }

    const cardValue = this.getNestedValue(card, field);
    let passed = false;

    switch (operator) {
      case 'eq':
        passed = cardValue === value;
        break;
      case 'neq':
        passed = cardValue !== value;
        break;
      case 'gt':
        passed = cardValue > value;
        break;
      case 'gte':
        passed = cardValue >= value;
        break;
      case 'lt':
        passed = cardValue < value;
        break;
      case 'lte':
        passed = cardValue <= value;
        break;
      case 'in':
        passed = Array.isArray(value) && value.includes(cardValue);
        break;
      case 'contains':
        passed = Array.isArray(cardValue) && cardValue.includes(value);
        break;
      case 'matches':
        passed = new RegExp(value).test(String(cardValue));
        break;
      default:
        passed = cardValue === value;
    }

    return {
      passed,
      message: passed ? null : `Field '${field}' does not meet required condition`
    };
  }

  /**
   * Evaluate stage_sequence rule
   * Card must progress through stages in order
   */
  evaluateStageSequence(rule, context) {
    const { workflow, fromStage, toStage } = context;
    const stages = workflow.stages;
    
    const fromIndex = stages.findIndex(s => s.id === fromStage.id);
    const toIndex = stages.findIndex(s => s.id === toStage.id);

    // Allow backward movement unless explicitly disabled
    if (rule.config?.enforceForwardOnly && toIndex < fromIndex) {
      return {
        passed: false,
        message: `Cannot move backward from ${fromStage.name} to ${toStage.name}`
      };
    }

    // Check for skip restrictions
    if (rule.config?.preventSkip) {
      const expectedNextIndex = fromIndex + 1;
      if (toIndex > expectedNextIndex) {
        const skippedStages = stages
          .slice(fromIndex + 1, toIndex)
          .map(s => s.name)
          .join(', ');
        
        return {
          passed: false,
          message: `Cannot skip stages: ${skippedStages}`
        };
      }
    }

    return { passed: true };
  }

  /**
   * Evaluate stage_prerequisite rule
   * Card must have visited prerequisite stages
   */
  evaluateStagePrerequisite(rule, context) {
    const { card } = context;
    const requiredStages = rule.config?.stages || [];
    const mode = rule.config?.mode || 'all'; // 'all' or 'any'

    if (requiredStages.length === 0) {
      return { passed: true };
    }

    const visitedStages = new Set(card.stageHistory.map(h => h.stage));
    
    let passed;
    if (mode === 'any') {
      passed = requiredStages.some(stage => visitedStages.has(stage));
    } else {
      passed = requiredStages.every(stage => visitedStages.has(stage));
    }

    return {
      passed,
      message: passed 
        ? null 
        : `Must visit ${mode === 'any' ? 'one of' : 'all'} prerequisite stages: ${requiredStages.join(', ')}`
    };
  }

  /**
   * Evaluate min_time_in_stage rule
   * Card must be in current stage for minimum time
   */
  evaluateMinTimeInStage(rule, context) {
    const { card } = context;
    const minDuration = rule.config?.duration; // in milliseconds

    if (!minDuration) {
      return { passed: true };
    }

    const currentStageEntry = card.stageHistory
      .filter(h => h.stage === card.stage)
      .pop();

    if (!currentStageEntry) {
      return { passed: false, message: 'Cannot determine time in stage' };
    }

    const timeInStage = Date.now() - new Date(currentStageEntry.enteredAt).getTime();
    const passed = timeInStage >= minDuration;

    return {
      passed,
      message: passed 
        ? null 
        : `Must remain in stage for at least ${this.formatDuration(minDuration)}`
    };
  }

  /**
   * Evaluate max_time_in_stage rule
   * Card cannot exceed maximum time in stage (for auto-escalation)
   */
  evaluateMaxTimeInStage(rule, context) {
    const { card } = context;
    const maxDuration = rule.config?.duration;

    if (!maxDuration) {
      return { passed: true };
    }

    const currentStageEntry = card.stageHistory
      .filter(h => h.stage === card.stage)
      .pop();

    if (!currentStageEntry) {
      return { passed: true };
    }

    const timeInStage = Date.now() - new Date(currentStageEntry.enteredAt).getTime();
    const passed = timeInStage <= maxDuration;

    return {
      passed,
      message: passed 
        ? null 
        : `Maximum time in stage (${this.formatDuration(maxDuration)}) exceeded`
    };
  }

  /**
   * Evaluate business_hours_only rule
   * Transitions only allowed during business hours
   */
  evaluateBusinessHours(rule, context) {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();

    const config = rule.config || {};
    const workDays = config.workDays || [1, 2, 3, 4, 5]; // Mon-Fri
    const startHour = config.startHour || 9;
    const endHour = config.endHour || 17;

    const isWorkDay = workDays.includes(day);
    const isWorkHour = hour >= startHour && hour < endHour;
    const passed = isWorkDay && isWorkHour;

    return {
      passed,
      message: passed 
        ? null 
        : `Transitions only allowed during business hours (${startHour}:00-${endHour}:00, ${this.formatWorkDays(workDays)})`
    };
  }

  /**
   * Evaluate assignee_required rule
   * Card must have an assignee
   */
  evaluateAssigneeRequired(rule, context) {
    const { card } = context;
    const passed = !!card.assignee;

    return {
      passed,
      message: passed ? null : 'Card must have an assignee'
    };
  }

  /**
   * Evaluate assignee_role rule
   * Assignee must have specific role
   */
  evaluateAssigneeRole(rule, context) {
    const { card } = context;
    const requiredRoles = rule.config?.roles || [];

    if (!card.assignee) {
      return { passed: false, message: 'Card has no assignee' };
    }

    // This would integrate with user/role system
    const assigneeRoles = card.assignee.roles || [];
    const passed = requiredRoles.some(role => assigneeRoles.includes(role));

    return {
      passed,
      message: passed 
        ? null 
        : `Assignee must have one of these roles: ${requiredRoles.join(', ')}`
    };
  }

  /**
   * Evaluate approval_required rule
   * Card must have required approvals
   */
  evaluateApprovalRequired(rule, context) {
    const { card } = context;
    const approvals = card.metadata?.approvals || [];
    const requiredCount = rule.config?.count || 1;

    const passed = approvals.length >= requiredCount;

    return {
      passed,
      message: passed 
        ? null 
        : `Requires ${requiredCount} approval(s), has ${approvals.length}`
    };
  }

  /**
   * Evaluate min_approvals rule
   * Card must have minimum number of approvals from specific users/roles
   */
  evaluateMinApprovals(rule, context) {
    const { card } = context;
    const approvals = card.metadata?.approvals || [];
    const minCount = rule.config?.count || 1;
    const fromRoles = rule.config?.fromRoles || [];
    const fromUsers = rule.config?.fromUsers || [];

    let validApprovals = approvals;

    // Filter by role if specified
    if (fromRoles.length > 0) {
      validApprovals = validApprovals.filter(a => 
        fromRoles.some(role => a.approverRoles?.includes(role))
      );
    }

    // Filter by user if specified
    if (fromUsers.length > 0) {
      validApprovals = validApprovals.filter(a => 
        fromUsers.includes(a.approverId)
      );
    }

    const passed = validApprovals.length >= minCount;

    return {
      passed,
      message: passed 
        ? null 
        : `Requires ${minCount} approval(s) from valid approvers`
    };
  }

  /**
   * Evaluate tag_required rule
   * Card must have specific tag
   */
  evaluateTagRequired(rule, context) {
    const { card } = context;
    const requiredTags = rule.config?.tags || [];

    const passed = requiredTags.every(tag => card.tags?.includes(tag));

    return {
      passed,
      message: passed 
        ? null 
        : `Card must have tags: ${requiredTags.filter(t => !card.tags?.includes(t)).join(', ')}`
    };
  }

  /**
   * Evaluate tag_excluded rule
   * Card must not have specific tag
   */
  evaluateTagExcluded(rule, context) {
    const { card } = context;
    const excludedTags = rule.config?.tags || [];

    const hasExcluded = excludedTags.some(tag => card.tags?.includes(tag));

    return {
      passed: !hasExcluded,
      message: hasExcluded 
        ? `Card cannot have tags: ${excludedTags.filter(t => card.tags?.includes(t)).join(', ')}`
        : null
    };
  }

  /**
   * Evaluate priority_check rule
   * Card priority must meet criteria
   */
  evaluatePriorityCheck(rule, context) {
    const { card } = context;
    const allowedPriorities = rule.config?.allowed || [];
    const blockedPriorities = rule.config?.blocked || [];

    if (allowedPriorities.length > 0 && !allowedPriorities.includes(card.priority)) {
      return {
        passed: false,
        message: `Priority '${card.priority}' not allowed for this transition`
      };
    }

    if (blockedPriorities.includes(card.priority)) {
      return {
        passed: false,
        message: `Priority '${card.priority}' blocked for this transition`
      };
    }

    return { passed: true };
  }

  /**
   * Evaluate custom_script rule
   * Execute custom JavaScript for validation
   */
  async evaluateCustomScript(rule, context) {
    const script = rule.config?.script;

    if (!script) {
      return { passed: false, message: 'No script provided' };
    }

    try {
      // Create safe evaluation context
      const fn = new Function('context', `
        "use strict";
        const { card, workflow, fromStage, toStage } = context;
        ${script}
      `);

      const result = fn(context);
      
      // Handle async results
      const resolved = await Promise.resolve(result);

      if (typeof resolved === 'boolean') {
        return {
          passed: resolved,
          message: resolved ? null : 'Custom validation failed'
        };
      }

      return {
        passed: resolved.passed !== false,
        message: resolved.message || (resolved.passed !== false ? null : 'Custom validation failed')
      };
    } catch (error) {
      return {
        passed: false,
        message: `Custom script error: ${error.message}`
      };
    }
  }

  /**
   * Get nested value from object
   * @param {Object} obj - Source object
   * @param {string} path - Dot-notation path
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => 
      current?.[key], obj
    );
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

  /**
   * Format work days for display
   * @param {Array} days - Array of day numbers
   */
  formatWorkDays(days) {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.map(d => dayNames[d]).join(', ');
  }
}

export default RuleEngine;