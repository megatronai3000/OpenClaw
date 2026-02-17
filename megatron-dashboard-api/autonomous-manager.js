// autonomous-manager.js — Task orchestration for autonomous mode
const { v4: uuidv4 } = require('uuid');
const { routeTask } = require('./model-router');

// AUTONOMOUS MODE CONFIG
const CONFIG = {
  maxConcurrent: 5,
  autoApproveThreshold: 1.00,
  miniMaxQuotaPerWindow: 1000,
  windowHours: 5,
  reportIntervalMinutes: 60
};

// APPROVED INFRASTRUCTURE TASKS (from proposals)
const APPROVED_TASKS = [
  {
    id: 'auto-approval-001',
    title: 'Auto-Approval Rules Engine',
    description: 'Build rule-based system for auto-approving proposals under $1.00 with confidence scoring',
    type: 'coding',
    estimatedCost: 0.80,
    estimatedPrompts: 150,
    dependencies: [],
    status: 'ready'
  },
  {
    id: 'websocket-001',
    title: 'WebSocket Architecture',
    description: 'Real-time updates for dashboard with Socket.io server and client integration',
    type: 'coding',
    estimatedCost: 0.80,
    estimatedPrompts: 120,
    dependencies: [],
    status: 'ready'
  },
  {
    id: 'feedback-001',
    title: 'Feedback Loop System',
    description: 'Self-improvement tracking for agent decisions with outcome logging',
    type: 'coding',
    estimatedCost: 0.60,
    estimatedPrompts: 100,
    dependencies: [],
    status: 'ready'
  },
  {
    id: 'activity-001',
    title: 'Agent Activity Dashboard',
    description: 'Real-time visibility into agent actions, decisions, and performance metrics',
    type: 'coding',
    estimatedCost: 1.50,
    estimatedPrompts: 200,
    dependencies: ['websocket-001'],
    status: 'ready'
  },
  {
    id: 'templates-001',
    title: 'Task Templates',
    description: 'Reusable templates for common agent tasks with pre-filled context',
    type: 'coding',
    estimatedCost: 0.60,
    estimatedPrompts: 80,
    dependencies: [],
    status: 'ready'
  },
  {
    id: 'hardware-001',
    title: 'Hardware-Aware Router',
    description: 'Router that considers local hardware capabilities when selecting models',
    type: 'architecture',
    estimatedCost: 0.40,
    estimatedPrompts: 60,
    dependencies: [],
    status: 'ready'
  },
  {
    id: 'kanban-archive-001',
    title: 'Kanban Archive System',
    description: 'Archive completed tasks with search and restore functionality',
    type: 'coding',
    estimatedCost: 0.70,
    estimatedPrompts: 90,
    dependencies: [],
    status: 'ready'
  },
  {
    id: 'kanban-workflow-001',
    title: 'Kanban Workflow Redesign',
    description: 'Enhanced workflow with automated transitions and validation',
    type: 'coding',
    estimatedCost: 0.50,
    estimatedPrompts: 70,
    dependencies: [],
    status: 'ready'
  },
  {
    id: 'model-routing-001',
    title: 'Task-Based Model Routing v2',
    description: 'Enhanced router with task classification and provider selection',
    type: 'architecture',
    estimatedCost: 0.50,
    estimatedPrompts: 80,
    dependencies: [],
    status: 'ready'
  }
];

class AutonomousManager {
  constructor() {
    this.activeTasks = new Map();
    this.completedTasks = [];
    this.quotaUsed = 0;
    this.windowStart = Date.now();
    this.lastReport = Date.now();
  }

  getStatus() {
    return {
      autonomous: true,
      maxConcurrent: CONFIG.maxConcurrent,
      active: this.activeTasks.size,
      completed: this.completedTasks.length,
      remaining: APPROVED_TASKS.length - this.completedTasks.length - this.activeTasks.size,
      quotaUsed: this.quotaUsed,
      quotaRemaining: CONFIG.miniMaxQuotaPerWindow - this.quotaUsed,
      windowProgress: ((Date.now() - this.windowStart) / (CONFIG.windowHours * 60 * 60 * 1000) * 100).toFixed(1) + '%'
    };
  }

  canStartTask() {
    return this.activeTasks.size < CONFIG.maxConcurrent;
  }

  startTask(taskId) {
    const task = APPROVED_TASKS.find(t => t.id === taskId);
    if (!task) return null;

    const executionId = uuidv4();
    this.activeTasks.set(executionId, {
      ...task,
      executionId,
      startedAt: Date.now(),
      promptsUsed: 0
    });

    console.log(`[AUTONOMOUS] Started: ${task.title}`);
    return executionId;
  }

  completeTask(executionId, result) {
    const task = this.activeTasks.get(executionId);
    if (task) {
      this.completedTasks.push({
        ...task,
        completedAt: Date.now(),
        result
      });
      this.quotaUsed += task.estimatedPrompts;
      this.activeTasks.delete(executionId);
      console.log(`[AUTONOMOUS] Completed: ${task.title}`);
    }
  }

  generateReport() {
    const status = this.getStatus();
    return `
🤖 AUTONOMOUS MODE REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━
Active Tasks: ${status.active}/5
Completed: ${status.completed}/9
Remaining: ${status.remaining}

MiniMax Quota: ${status.quotaUsed}/${CONFIG.miniMaxQuotaPerWindow} used
Window Progress: ${status.windowProgress}

Currently Building:
${Array.from(this.activeTasks.values()).map(t => `• ${t.title} (${t.type})`).join('\n') || 'None active'}

Next Up:
${APPROVED_TASKS
  .filter(t => !this.completedTasks.find(ct => ct.id === t.id) && !Array.from(this.activeTasks.values()).find(at => at.id === t.id))
  .slice(0, 3)
  .map(t => `• ${t.title}`).join('\n') || 'All tasks queued'}
`;
  }

  shouldReport() {
    return Date.now() - this.lastReport > CONFIG.reportIntervalMinutes * 60 * 1000;
  }

  markReported() {
    this.lastReport = Date.now();
  }
}

// Singleton instance
const manager = new AutonomousManager();

// Model for autonomous tasks - USE MINIMAX
const AUTONOMOUS_MODEL = 'minimax/MiniMax-M2.5';

module.exports = {
  manager,
  APPROVED_TASKS,
  CONFIG,
  AUTONOMOUS_MODEL
};
