/**
 * Example Workflow Definitions
 * 
 * These demonstrate various workflow patterns for different project types.
 */

// 1. Software Development Workflow
export const softwareDevWorkflow = {
  name: 'Software Development',
  stages: [
    { id: 'backlog', name: 'Backlog', order: 0 },
    { id: 'selected', name: 'Selected for Development', order: 1 },
    { id: 'in_progress', name: 'In Progress', order: 2, wipLimit: 3 },
    { id: 'code_review', name: 'Code Review', order: 3, wipLimit: 5 },
    { id: 'testing', name: 'Testing', order: 4, wipLimit: 3 },
    { id: 'ready_deploy', name: 'Ready to Deploy', order: 5 },
    { id: 'done', name: 'Done', order: 6 }
  ],
  rules: [
    {
      type: 'assignee_required',
      fromStage: 'selected',
      toStage: 'in_progress',
      name: 'Require assignee for development'
    },
    {
      type: 'field_required',
      fromStage: 'in_progress',
      toStage: 'code_review',
      config: { field: 'metadata.branch' },
      name: 'Branch must be created'
    },
    {
      type: 'min_approvals',
      fromStage: 'code_review',
      toStage: 'testing',
      config: { count: 2, fromRoles: ['developer'] },
      name: 'Require 2 code reviews'
    },
    {
      type: 'min_time_in_stage',
      fromStage: 'testing',
      toStage: 'ready_deploy',
      config: { duration: 4 * 60 * 60 * 1000 }, // 4 hours
      name: 'Minimum 4 hours in testing'
    }
  ],
  validators: [
    {
      type: 'title_required',
      stage: 'in_progress',
      level: 'error'
    },
    {
      type: 'checklist_complete',
      stage: 'ready_deploy',
      level: 'error'
    },
    {
      type: 'approvals_sufficient',
      stage: 'ready_deploy',
      config: { count: 1 },
      level: 'error'
    }
  ],
  autoTransitionRules: [
    {
      id: 'escalate_review',
      name: 'Escalate stuck code reviews',
      type: 'escalation',
      fromStage: 'code_review',
      targetStage: 'code_review', // Stay in stage but notify
      config: {
        threshold: 24, // hours
        metric: 'time_in_stage_hours'
      }
    },
    {
      id: 'auto_archive',
      name: 'Archive completed after 30 days',
      type: 'time_based',
      fromStage: 'done',
      targetStage: 'archived',
      config: { duration: '30d' }
    }
  ]
};

// 2. Content Publishing Workflow
export const contentPublishingWorkflow = {
  name: 'Content Publishing',
  stages: [
    { id: 'ideas', name: 'Ideas', order: 0 },
    { id: 'drafting', name: 'Drafting', order: 1, wipLimit: 5 },
    { id: 'review', name: 'Editorial Review', order: 2, wipLimit: 3 },
    { id: 'revisions', name: 'Revisions', order: 3 },
    { id: 'scheduled', name: 'Scheduled', order: 4 },
    { id: 'published', name: 'Published', order: 5 }
  ],
  rules: [
    {
      type: 'assignee_required',
      fromStage: 'ideas',
      toStage: 'drafting',
      name: 'Writer must be assigned'
    },
    {
      type: 'tag_required',
      fromStage: 'drafting',
      toStage: 'review',
      config: { tags: ['content-type', 'audience'] },
      name: 'Content metadata required'
    },
    {
      type: 'approval_required',
      fromStage: 'review',
      toStage: 'scheduled',
      config: { count: 1 },
      name: 'Editor approval required'
    },
    {
      type: 'field_required',
      fromStage: 'revisions',
      toStage: 'scheduled',
      config: { field: 'metadata.publishDate' },
      name: 'Publish date required'
    }
  ],
  validators: [
    {
      type: 'title_length',
      stage: 'review',
      config: { min: 10, max: 100 },
      level: 'error'
    },
    {
      type: 'description_length',
      stage: 'review',
      config: { min: 500 },
      level: 'warning'
    },
    {
      type: 'labels_applied',
      stage: 'scheduled',
      config: { required: ['category', 'seo-ready'] },
      level: 'error'
    }
  ],
  autoTransitionRules: [
    {
      id: 'publish_scheduled',
      name: 'Auto-publish on schedule date',
      type: 'condition_based',
      fromStage: 'scheduled',
      targetStage: 'published',
      conditions: [
        {
          field: 'metadata.publishDate',
          operator: 'lte',
          value: 'now'
        }
      ]
    }
  ]
};

// 3. Support Ticket Workflow
export const supportTicketWorkflow = {
  name: 'Support Tickets',
  stages: [
    { id: 'new', name: 'New', order: 0 },
    { id: 'triage', name: 'Triage', order: 1 },
    { id: 'in_progress', name: 'In Progress', order: 2, wipLimit: 5 },
    { id: 'waiting', name: 'Waiting for Customer', order: 3 },
    { id: 'waiting_internal', name: 'Waiting (Internal)', order: 4 },
    { id: 'resolved', name: 'Resolved', order: 5 },
    { id: 'closed', name: 'Closed', order: 6 }
  ],
  rules: [
    {
      type: 'assignee_required',
      fromStage: 'triage',
      toStage: 'in_progress',
      name: 'Ticket must be assigned'
    },
    {
      type: 'priority_check',
      fromStage: 'new',
      toStage: 'triage',
      config: { allowed: ['low', 'medium', 'high', 'urgent'] },
      name: 'Priority must be set'
    }
  ],
  validators: [
    {
      type: 'title_required',
      stage: 'triage',
      level: 'error'
    },
    {
      type: 'description_length',
      stage: 'in_progress',
      config: { min: 50 },
      level: 'warning'
    }
  ],
  autoTransitionRules: [
    {
      id: 'escalate_urgent',
      name: 'Escalate urgent tickets not picked up',
      type: 'escalation',
      fromStage: 'new',
      targetStage: 'triage',
      config: {
        threshold: 15, // minutes
        metric: 'time_in_stage_hours'
      }
    },
    {
      id: 'auto_close_resolved',
      name: 'Close resolved tickets after 3 days',
      type: 'time_based',
      fromStage: 'resolved',
      targetStage: 'closed',
      config: { duration: '3d' }
    },
    {
      id: 'reopen_waiting',
      name: 'Reopen tickets waiting too long',
      type: 'escalation',
      fromStage: 'waiting',
      targetStage: 'in_progress',
      config: {
        threshold: 72, // hours
        metric: 'time_in_stage_hours'
      }
    }
  ]
};

// 4. Approval Process Workflow
export const approvalProcessWorkflow = {
  name: 'Approval Process',
  stages: [
    { id: 'draft', name: 'Draft', order: 0 },
    { id: 'submitted', name: 'Submitted', order: 1 },
    { id: 'manager_review', name: 'Manager Review', order: 2, wipLimit: 10 },
    { id: 'finance_review', name: 'Finance Review', order: 3, wipLimit: 5 },
    { id: 'executive_review', name: 'Executive Review', order: 4, wipLimit: 3 },
    { id: 'approved', name: 'Approved', order: 5 },
    { id: 'rejected', name: 'Rejected', order: 6 }
  ],
  rules: [
    {
      type: 'field_required',
      fromStage: 'draft',
      toStage: 'submitted',
      config: { field: 'metadata.amount' },
      name: 'Amount must be specified'
    },
    {
      type: 'min_approvals',
      fromStage: 'manager_review',
      toStage: 'finance_review',
      config: { count: 1, fromRoles: ['manager'] },
      name: 'Manager approval required'
    },
    {
      type: 'min_approvals',
      fromStage: 'finance_review',
      toStage: 'executive_review',
      config: { count: 1, fromRoles: ['finance'] },
      name: 'Finance approval required'
    },
    {
      type: 'approval_authority',
      fromStage: 'executive_review',
      toStage: 'approved',
      config: { requiredRoles: ['executive', 'cfo'] },
      name: 'Executive approval required'
    }
  ],
  validators: [
    {
      type: 'title_required',
      stage: 'submitted',
      level: 'error'
    },
    {
      type: 'description_required',
      stage: 'submitted',
      level: 'error'
    },
    {
      type: 'estimate_provided',
      stage: 'submitted',
      config: { field: 'metadata.amount' },
      level: 'error'
    },
    {
      type: 'custom',
      stage: 'finance_review',
      config: {
        script: `
          // Require amount > 0
          return context.card.metadata?.amount > 0;
        `
      },
      level: 'error'
    }
  ],
  autoTransitionRules: [
    {
      id: 'escalate_manager',
      name: 'Escalate stuck manager reviews',
      type: 'escalation',
      fromStage: 'manager_review',
      targetStage: 'manager_review',
      config: {
        threshold: 24, // hours
        metric: 'time_in_stage_hours'
      }
    },
    {
      id: 'auto_reject_old',
      name: 'Auto-reject stale submissions',
      type: 'time_based',
      fromStage: 'submitted',
      targetStage: 'rejected',
      config: { duration: '30d' }
    }
  ]
};

// 5. Simple Task Workflow
export const simpleTaskWorkflow = {
  name: 'Simple Tasks',
  stages: [
    { id: 'todo', name: 'To Do', order: 0 },
    { id: 'in_progress', name: 'In Progress', order: 1 },
    { id: 'done', name: 'Done', order: 2 }
  ],
  rules: [
    {
      type: 'assignee_required',
      fromStage: 'todo',
      toStage: 'in_progress',
      name: 'Must be assigned'
    }
  ],
  validators: [
    {
      type: 'title_required',
      stage: 'in_progress',
      level: 'error'
    }
  ],
  autoTransitionRules: []
};

// Export all workflows
export const exampleWorkflows = {
  softwareDev: softwareDevWorkflow,
  contentPublishing: contentPublishingWorkflow,
  supportTicket: supportTicketWorkflow,
  approvalProcess: approvalProcessWorkflow,
  simpleTask: simpleTaskWorkflow
};

export default exampleWorkflows;