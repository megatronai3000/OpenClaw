/**
 * ValidationEngine - Enforces validation gates before transitions
 * 
 * Validation gates ensure quality and completeness before cards move forward.
 * Unlike rules (which are checked), validators actively verify card state.
 * 
 * Validation Levels:
 * - LOW: Warnings only, transitions allowed
 * - MEDIUM: Some validations must pass
 * - HIGH: All validations must pass
 */
export class ValidationEngine {
  constructor(options = {}) {
    this.options = {
      strictness: 'medium', // low, medium, high
      allowBypass: false,   // Allow admins to bypass validation
      ...options
    };

    this.validators = new Map();
    this.registerDefaultValidators();
  }

  /**
   * Register default validators
   */
  registerDefaultValidators() {
    // Content validators
    this.registerValidator('title_required', this.validateTitle.bind(this));
    this.registerValidator('description_required', this.validateDescription.bind(this));
    this.registerValidator('title_length', this.validateTitleLength.bind(this));
    this.registerValidator('description_length', this.validateDescriptionLength.bind(this));
    
    // Assignment validators
    this.registerValidator('assignee_required', this.validateAssignee.bind(this));
    this.registerValidator('assignee_active', this.validateAssigneeActive.bind(this));
    
    // Checklist validators
    this.registerValidator('checklist_complete', this.validateChecklistComplete.bind(this));
    this.registerValidator('checklist_minimum', this.validateChecklistMinimum.bind(this));
    
    // Approval validators
    this.registerValidator('approvals_sufficient', this.validateApprovals.bind(this));
    this.registerValidator('approval_authority', this.validateApprovalAuthority.bind(this));
    
    // Relationship validators
    this.registerValidator('dependencies_resolved', this.validateDependencies.bind(this));
    this.registerValidator('linked_items_status', this.validateLinkedItems.bind(this));
    
    // Quality validators
    this.registerValidator('labels_applied', this.validateLabels.bind(this));
    this.registerValidator('estimate_provided', this.validateEstimate.bind(this));
    this.registerValidator('due_date_set', this.validateDueDate.bind(this));
    
    // Custom validators
    this.registerValidator('custom', this.validateCustom.bind(this));
  }

  /**
   * Register a validator function
   * @param {string} type - Validator type
   * @param {Function} validator - Validator function
   */
  registerValidator(type, validator) {
    this.validators.set(type, validator);
  }

  /**
   * Validate a transition context
   * @param {Object} context - Transition context
   */
  async validate(context) {
    const { card, workflow, toStage } = context;
    
    // Get validators for this transition
    const applicableValidators = this.getApplicableValidators(workflow, toStage.id);
    
    if (applicableValidators.length === 0) {
      return { passed: true, validations: [] };
    }

    const results = [];
    const failures = [];

    for (const validatorConfig of applicableValidators) {
      const validator = this.validators.get(validatorConfig.type);
      
      if (!validator) {
        results.push({
          type: validatorConfig.type,
          passed: false,
          level: 'error',
          message: `Unknown validator type: ${validatorConfig.type}`
        });
        failures.push(validatorConfig);
        continue;
      }

      try {
        const result = await validator(validatorConfig, context);
        results.push({
          type: validatorConfig.type,
          name: validatorConfig.name,
          passed: result.passed,
          level: result.level || validatorConfig.level || 'error',
          message: result.message
        });

        if (!result.passed && (result.level === 'error' || validatorConfig.level === 'error')) {
          failures.push(validatorConfig);
        }
      } catch (error) {
        results.push({
          type: validatorConfig.type,
          name: validatorConfig.name,
          passed: false,
          level: 'error',
          message: `Validation error: ${error.message}`
        });
        failures.push(validatorConfig);
      }
    }

    // Determine if transition is allowed based on strictness
    const passed = this.determinePassStatus(results, failures);

    return {
      passed,
      message: passed ? 'All validations passed' : `${failures.length} validation(s) failed`,
      validations: results,
      failures: failures.map(f => ({
        type: f.type,
        name: f.name,
        message: results.find(r => r.type === f.type)?.message
      }))
    };
  }

  /**
   * Get validators applicable to a transition
   * @param {Object} workflow - Workflow definition
   * @param {string} stageId - Target stage ID
   */
  getApplicableValidators(workflow, stageId) {
    if (!workflow.validators) return [];

    return workflow.validators.filter(v => {
      // Check if validator applies to this stage
      if (v.stage && v.stage !== stageId) return false;
      if (v.stages && !v.stages.includes(stageId)) return false;
      
      // Check if validator is enabled
      if (v.enabled === false) return false;

      return true;
    });
  }

  /**
   * Determine if validation passes based on strictness level
   * @param {Array} results - All validation results
   * @param {Array} failures - Failed validations
   */
  determinePassStatus(results, failures) {
    if (failures.length === 0) return true;

    const errorCount = results.filter(r => !r.passed && r.level === 'error').length;
    const warningCount = results.filter(r => !r.passed && r.level === 'warning').length;

    switch (this.options.strictness) {
      case 'low':
        // Only block on critical errors
        return errorCount === 0;
      
      case 'medium':
        // Block on errors, warn on warnings
        return errorCount === 0;
      
      case 'high':
        // Block on any failure
        return failures.length === 0;
      
      default:
        return errorCount === 0;
    }
  }

  // ============== VALIDATOR IMPLEMENTATIONS ==============

  /**
   * Validate title exists
   */
  validateTitle(config, context) {
    const { card } = context;
    const hasTitle = card.title && card.title.trim().length > 0;

    return {
      passed: hasTitle,
      level: config.level || 'error',
      message: hasTitle ? null : 'Card title is required'
    };
  }

  /**
   * Validate description exists
   */
  validateDescription(config, context) {
    const { card } = context;
    const hasDescription = card.description && card.description.trim().length > 0;

    return {
      passed: hasDescription,
      level: config.level || 'warning',
      message: hasDescription ? null : 'Card description is recommended'
    };
  }

  /**
   * Validate title length
   */
  validateTitleLength(config, context) {
    const { card } = context;
    const minLength = config.min || 5;
    const maxLength = config.max || 200;
    
    const titleLength = card.title?.length || 0;
    const passed = titleLength >= minLength && titleLength <= maxLength;

    let message = null;
    if (!passed) {
      if (titleLength < minLength) {
        message = `Title must be at least ${minLength} characters`;
      } else if (titleLength > maxLength) {
        message = `Title must be no more than ${maxLength} characters`;
      }
    }

    return { passed, level: config.level || 'error', message };
  }

  /**
   * Validate description length
   */
  validateDescriptionLength(config, context) {
    const { card } = context;
    const minLength = config.min || 20;
    const maxLength = config.max || 5000;
    
    const descLength = card.description?.length || 0;
    
    // Skip if no description
    if (descLength === 0) {
      return { passed: true, message: null };
    }

    const passed = descLength >= minLength && descLength <= maxLength;

    let message = null;
    if (!passed) {
      if (descLength < minLength) {
        message = `Description should be at least ${minLength} characters for clarity`;
      } else if (descLength > maxLength) {
        message = `Description should be no more than ${maxLength} characters`;
      }
    }

    return { passed, level: config.level || 'warning', message };
  }

  /**
   * Validate assignee exists
   */
  validateAssignee(config, context) {
    const { card } = context;
    const hasAssignee = !!card.assignee;

    return {
      passed: hasAssignee,
      level: config.level || 'error',
      message: hasAssignee ? null : 'Card must have an assignee'
    };
  }

  /**
   * Validate assignee is active
   */
  validateAssigneeActive(config, context) {
    const { card } = context;
    
    if (!card.assignee) {
      return { passed: true, message: null };
    }

    // Check assignee status (would integrate with user system)
    const isActive = card.assignee.status !== 'inactive' && 
                     card.assignee.status !== 'suspended';

    return {
      passed: isActive,
      level: config.level || 'error',
      message: isActive ? null : 'Assignee is not active'
    };
  }

  /**
   * Validate checklist is complete
   */
  validateChecklistComplete(config, context) {
    const { card } = context;
    const checklist = card.metadata?.checklist || [];
    
    if (checklist.length === 0) {
      return { 
        passed: true, 
        message: null 
      };
    }

    const incomplete = checklist.filter(item => !item.completed);
    const passed = incomplete.length === 0;

    return {
      passed,
      level: config.level || 'error',
      message: passed 
        ? null 
        : `${incomplete.length} checklist item(s) incomplete`
    };
  }

  /**
   * Validate minimum checklist items exist
   */
  validateChecklistMinimum(config, context) {
    const { card } = context;
    const checklist = card.metadata?.checklist || [];
    const minItems = config.min || 1;

    const passed = checklist.length >= minItems;

    return {
      passed,
      level: config.level || 'warning',
      message: passed 
        ? null 
        : `At least ${minItems} checklist item(s) recommended`
    };
  }

  /**
   * Validate sufficient approvals
   */
  validateApprovals(config, context) {
    const { card } = context;
    const approvals = card.metadata?.approvals || [];
    const requiredCount = config.count || 1;

    const passed = approvals.length >= requiredCount;

    return {
      passed,
      level: config.level || 'error',
      message: passed 
        ? null 
        : `Requires ${requiredCount} approval(s), has ${approvals.length}`
    };
  }

  /**
   * Validate approval authority
   */
  validateApprovalAuthority(config, context) {
    const { card } = context;
    const approvals = card.metadata?.approvals || [];
    const requiredRoles = config.requiredRoles || [];

    if (requiredRoles.length === 0 || approvals.length === 0) {
      return { passed: true, message: null };
    }

    // Check if at least one approval is from required role
    const hasValidApproval = approvals.some(a => 
      a.approverRoles?.some(role => requiredRoles.includes(role))
    );

    return {
      passed: hasValidApproval,
      level: config.level || 'error',
      message: hasValidApproval 
        ? null 
        : `Requires approval from: ${requiredRoles.join(', ')}`
    };
  }

  /**
   * Validate dependencies are resolved
   */
  validateDependencies(config, context) {
    const { card } = context;
    const dependencies = card.metadata?.dependencies || [];

    if (dependencies.length === 0) {
      return { passed: true, message: null };
    }

    const unresolved = dependencies.filter(d => d.status !== 'resolved' && d.status !== 'done');
    const passed = unresolved.length === 0;

    return {
      passed,
      level: config.level || 'error',
      message: passed 
        ? null 
        : `${unresolved.length} unresolved dependency(ies)`
    };
  }

  /**
   * Validate linked items status
   */
  validateLinkedItems(config, context) {
    const { card } = context;
    const linked = card.metadata?.linkedItems || [];
    const requiredStatus = config.requiredStatus || ['done', 'resolved'];

    if (linked.length === 0) {
      return { passed: true, message: null };
    }

    const incomplete = linked.filter(l => !requiredStatus.includes(l.status));
    const passed = incomplete.length === 0;

    return {
      passed,
      level: config.level || 'error',
      message: passed 
        ? null 
        : `${incomplete.length} linked item(s) not in required status`
    };
  }

  /**
   * Validate labels are applied
   */
  validateLabels(config, context) {
    const { card } = context;
    const requiredLabels = config.required || [];
    const minLabels = config.min || 0;

    const hasRequired = requiredLabels.every(label => card.tags?.includes(label));
    const hasMinimum = (card.tags?.length || 0) >= minLabels;

    const passed = hasRequired && hasMinimum;

    let message = null;
    if (!passed) {
      if (!hasRequired) {
        const missing = requiredLabels.filter(l => !card.tags?.includes(l));
        message = `Required labels: ${missing.join(', ')}`;
      } else {
        message = `At least ${minLabels} label(s) required`;
      }
    }

    return { passed, level: config.level || 'warning', message };
  }

  /**
   * Validate estimate is provided
   */
  validateEstimate(config, context) {
    const { card } = context;
    const hasEstimate = card.metadata?.estimate !== undefined && 
                        card.metadata?.estimate !== null;

    return {
      passed: hasEstimate,
      level: config.level || 'warning',
      message: hasEstimate ? null : 'Time estimate is recommended'
    };
  }

  /**
   * Validate due date is set
   */
  validateDueDate(config, context) {
    const { card } = context;
    const hasDueDate = !!card.metadata?.dueDate;

    return {
      passed: hasDueDate,
      level: config.level || 'warning',
      message: hasDueDate ? null : 'Due date is recommended'
    };
  }

  /**
   * Run custom validation script
   */
  async validateCustom(config, context) {
    const script = config.script;

    if (!script) {
      return {
        passed: false,
        level: config.level || 'error',
        message: 'No validation script provided'
      };
    }

    try {
      const fn = new Function('context', `
        "use strict";
        const { card, workflow, fromStage, toStage } = context;
        ${script}
      `);

      const result = await Promise.resolve(fn(context));

      if (typeof result === 'boolean') {
        return {
          passed: result,
          level: config.level || 'error',
          message: result ? null : 'Custom validation failed'
        };
      }

      return {
        passed: result.passed !== false,
        level: result.level || config.level || 'error',
        message: result.message || (result.passed !== false ? null : 'Custom validation failed')
      };
    } catch (error) {
      return {
        passed: false,
        level: 'error',
        message: `Custom validation error: ${error.message}`
      };
    }
  }
}

export default ValidationEngine;