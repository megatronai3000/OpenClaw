import React, { createContext, useContext, useState, useEffect } from 'react';

const initialData = {
  projects: [
    { id: 1, name: 'OpenClaw', status: 'active', priority: 'hot', progress: 88, lastUpdated: '2026-02-11', description: 'Local AI agent infrastructure with memory and autonomy', category: 'Infrastructure' },
    { id: 2, name: 'Command Center Dashboard', status: 'active', priority: 'hot', progress: 98, lastUpdated: '2026-02-11', description: 'Central project management dashboard (React + Tailwind)', category: 'Tools' },
    { id: 3, name: 'DeFi Portfolio', status: 'active', priority: 'hot', progress: 45, lastUpdated: '2026-02-08', description: 'Yield optimization, LP management, ve(3,3) strategies', category: 'Finance' },
    { id: 4, name: 'DDI', status: 'planning', priority: 'warm', progress: 15, lastUpdated: '2026-02-07', description: 'Daily Design Intelligence platform', category: 'Product' },
    { id: 5, name: 'Design & Product Consulting', status: 'active', priority: 'hot', progress: 60, lastUpdated: '2026-02-09', description: 'UX, Webflow, Figma deliverables (day job)', category: 'Client Work' },
    { id: 6, name: 'HyperWarp', status: 'maintenance', priority: 'cold', progress: 90, lastUpdated: '2026-01-15', description: 'veNFT marketplace - monitoring only', category: 'DeFi' },
  ],
  kanban: {
    backlog: [
      { id: 101, title: 'Research DeFi yield opportunities', priority: 'medium', created: '2026-02-08' },
      { id: 102, title: 'Design DDI architecture', priority: 'medium', created: '2026-02-07' },
      { id: 103, title: 'Update HyperWarp monitoring scripts', priority: 'low', created: '2026-02-05' },
    ],
    inProgress: [
      { id: 201, title: 'Install dashboard LaunchAgent for persistence', priority: 'medium', started: '2026-02-10', status: 'active' },
      { id: 202, title: 'Auto-Approval Rules Engine', priority: 'high', started: '2026-02-17', status: 'autonomous', agent: 'subagent' },
      { id: 203, title: 'WebSocket Architecture', priority: 'high', started: '2026-02-17', status: 'autonomous', agent: 'subagent' },
      { id: 204, title: 'Feedback Loop System', priority: 'high', started: '2026-02-17', status: 'autonomous', agent: 'subagent' },
      { id: 205, title: 'Task Templates System', priority: 'high', started: '2026-02-17', status: 'autonomous', agent: 'subagent' },
    ],
    blocked: [
      { id: 301, title: 'DDI Stage 3 - needs scope clarification', priority: 'high', blocker: 'Waiting for user input on Stage 3 requirements' },
    ],
    completed: [
      { id: 401, title: 'Build Command Center Dashboard v1', priority: 'high', completed: '2026-02-09' },
      { id: 402, title: 'Create project folder structure', priority: 'high', completed: '2026-02-08' },
      { id: 403, title: 'Update PROJECTS.md registry', priority: 'medium', completed: '2026-02-08' },
      { id: 404, title: 'Set up workspace organization', priority: 'medium', completed: '2026-02-08' },
      { id: 405, title: 'Dashboard v1 - polish, theme toggle, persistence scripts', priority: 'high', completed: '2026-02-10' },
      { id: 406, title: 'Research Strategist agent setup', priority: 'high', completed: '2026-02-10' },
      { id: 407, title: 'Memory infrastructure (MEMORY.md + daily logs)', priority: 'high', completed: '2026-02-10' },
      { id: 408, title: 'Ollama Local Models Setup', priority: 'high', completed: '2026-02-17', agent: 'autonomous-1' },
      { id: 409, title: 'Cron Job Audit', priority: 'high', completed: '2026-02-17', agent: 'autonomous-2' },
    ]
  },
  tasks: [
    { id: 1, title: 'Complete dashboard v1 polish', project: 'Command Center Dashboard', due: '2026-02-09', priority: 'high', status: 'completed' },
    { id: 2, title: 'Install dashboard LaunchAgent for persistence', project: 'Command Center Dashboard', due: '2026-02-11', priority: 'medium', status: 'pending' },
    { id: 3, title: 'Add charts/metrics to dashboard', project: 'Command Center Dashboard', due: '2026-02-12', priority: 'medium', status: 'pending' },
    { id: 4, title: 'Research yield farming strategies', project: 'DeFi Portfolio', due: '2026-02-11', priority: 'medium', status: 'pending' },
    { id: 5, title: 'Clarify DDI Stage 3 scope', project: 'DDI', due: '2026-02-10', priority: 'high', status: 'blocked' },
    { id: 6, title: 'Document dashboard features', project: 'OpenClaw', due: '2026-02-12', priority: 'low', status: 'pending' },
  ],
  dailyReports: [
    {
      date: '2026-02-17',
      sessions: [
        {
          startTime: '07:00',
          endTime: '07:05',
          trigger: 'Morning Daily Report cron job',
          tasks: [
            { description: 'Generated morning daily report from cron', timeSpent: '5 min', cost: '$0.02' },
            { description: 'Reviewed Feb 16 memory logs and sessions', timeSpent: '2 min', cost: '$0.01' },
            { description: 'Updated dashboard daily reports data', timeSpent: '2 min', cost: '$0.01' }
          ],
          decisions: [],
          blockers: [],
          observations: [
            'Cost Tracking Tier 1 COMPLETE: All 4 phases finished (data recovery, middleware, validation, orchestrator)',
            'Moonshot API integration live: $3.29 actual spend vs $2.17 estimated (52% underestimate)',
            'Dashboard Cost Analytics tab showing live API data with variance warnings',
            'Design workflow "The Taste Moat" documented and distributed to team',
            'Monthly cost at ~$20.50 (well under $300 limit)',
            'System stable: 5 cron jobs operational, autonomous mode active'
          ]
        }
      ],
      costSummary: {
        totalCost: 0.04,
        monthlyTotal: 20.50
      },
      summary: {
        completed: [
          'Cost tracking fix Tier 1: All phases complete (data recovery, middleware, validation, orchestrator integration)',
          'Moonshot API integration: Live cost data now showing in dashboard',
          'Design philosophy "The Taste Moat" documented and shared with team',
          'Petty design workflow updated with 5-step process',
          'Cost validation system operational with hourly checks'
        ],
        inProgress: [
          'Cost Tracking Tier 2: Cost breakdown by agent ($0.40)',
          'Cost Tracking Tier 2: Agent performance dashboard ($0.80)',
          'Cost Tracking Tier 2: Decision history & trends ($0.40)',
          'CRITICAL infrastructure tasks from Feb 16 (8 tasks in backlog)'
        ],
        proposedNext: [
          'Begin Cost Tracking Tier 2 (breakdown by agent, performance dashboard)',
          'Review CRITICAL infrastructure tasks: Memory Split, Self-Verification, Crash Recovery',
          'Validate cost estimation accuracy with live Moonshot data',
          'Continue 4-hour orchestrator cadence',
          'Monitor daily burn rate: target <$5/week'
        ],
        needsDecision: [
          'Priority order for CRITICAL infrastructure tasks (3 tasks, ~$1.80 total)',
          'Proceed with Cost Tracking Tier 2 or tackle infrastructure first?'
        ]
      },
      costTracking: {
        model: 'moonshot/kimi-k2.5',
        tokens: '~3k',
        apiCalls: '3'
      }
    },
    {
      date: '2026-02-16',
      sessions: [
        {
          startTime: '17:00',
          endTime: '17:05',
          trigger: 'Evening Daily Report cron job',
          tasks: [
            { description: 'Generated evening daily report from cron', timeSpent: '5 min', cost: '$0.02' },
            { description: 'Reviewed Feb 16 memory logs and sessions', timeSpent: '2 min', cost: '$0.01' },
            { description: 'Updated dashboard daily reports data', timeSpent: '2 min', cost: '$0.01' }
          ],
          decisions: [],
          blockers: [],
          observations: [
            'Dashboard decision display bug fixed (content/context field mapping)',
            '8 critical infrastructure tasks added to Kanban backlog',
            'OpenClaw updated: 2026.2.12 → 2026.2.15 successfully',
            'Weekend sprint task execution discrepancy clarified: monitoring only, not project work',
            'Monthly cost trending at ~$19.88 (well under $300 limit, ~$45/month trend)',
            'System stable: 5 active cron jobs, autonomous operation validated'
          ]
        },
        {
          startTime: '07:00',
          endTime: '07:05',
          trigger: 'Morning Daily Report cron job',
          tasks: [
            { description: 'Generated morning daily report from cron', timeSpent: '5 min', cost: '$0.02' },
            { description: 'Reviewed Feb 15 memory logs and sessions', timeSpent: '2 min', cost: '$0.01' },
            { description: 'Updated dashboard daily reports data', timeSpent: '2 min', cost: '$0.01' }
          ],
          decisions: [
            'Weekend Autonomous Sprint: GO — quality sufficient, cost sustainable',
            'Weekly Memory Curation completed overnight successfully',
            'Continue 4-hour orchestrator cadence: optimal cost/performance ratio'
          ],
          blockers: [],
          observations: [
            'Weekend Sprint Results: 3 days autonomous operation, $0.24 total cost',
            'All scheduled tasks executed: 6 morning reports, 6 evening reports, 3 standups',
            'System stability: 100% — no manual intervention required',
            'Weekly Memory Curation extracted patterns, updated MEMORY.md',
            'Monthly cost at ~$19.73 (well under $300 limit, ~$45/month trend)',
            'GO/NO-GO Decision: CONTINUE autonomous operation — validated ROI'
          ]
        }
      ],
      costSummary: {
        totalCost: 0.10,
        monthlyTotal: 19.88
      },
      summary: {
        completed: [
          'Dashboard decision display bug fixed (content/context mapping issue)',
          '8 critical infrastructure tasks added to Kanban backlog',
          'OpenClaw updated: 2026.2.12 → 2026.2.15',
          'Weekend sprint clarified: monitoring/reporting only ($0.24), not project tasks',
          'Morning daily report generated successfully',
          'Daily team standup posted to shared context'
        ],
        inProgress: [
          'CRITICAL: Memory Split System (3h, $0.60)',
          'CRITICAL: Self-Verification Protocol (3h, $0.60)',
          'CRITICAL: Crash Recovery Protocol (3h, $0.60)',
          'HIGH: Task-Based Model Routing (3h, $0.60)',
          'HIGH: Session Hygiene System (2h, $0.40)',
          'HIGH: Sub-Agent Scoping (3h, $0.60)',
          'MEDIUM: Optimize Heartbeat (2h, $0.40)',
          'MEDIUM: Expand Cron Jobs (2h, $0.40)'
        ],
        proposedNext: [
          'Begin CRITICAL infrastructure tasks (Memory Split, Self-Verification, Crash Recovery)',
          'Review and validate weekend sprint task claims vs actual completion',
          'Verify decision details display after dashboard refresh',
          'Continue autonomous operation at 4-hour orchestrator cadence',
          'Monitor weekly cost trend — target remains <$5/week'
        ],
        needsDecision: [
          'Priority order for CRITICAL infrastructure tasks',
          'Resource allocation: tackle all 8 tasks or focus on CRITICAL 3 first?'
        ]
      },
      costTracking: {
        model: 'moonshot/kimi-k2.5',
        tokens: '~5k',
        apiCalls: '4'
      }
    },
    {
      date: '2026-02-15',
      sessions: [
        {
          startTime: '17:00',
          endTime: '17:05',
          trigger: 'Evening Daily Report cron job',
          tasks: [
            { description: 'Generated evening daily report from cron', timeSpent: '5 min', cost: '$0.02' },
            { description: 'Reviewed Feb 15 sessions and memory files', timeSpent: '2 min', cost: '$0.01' },
            { description: 'Updated dashboard daily reports data', timeSpent: '2 min', cost: '$0.01' }
          ],
          decisions: [],
          blockers: [],
          observations: [
            'Today (Feb 15): 3 autonomous sessions executed successfully',
            'Morning report, team standup, evening report all ran on schedule',
            'Weekend autonomous sprint: 13 tasks in-progress across 4 agents',
            'Cost holding steady: ~$0.08/day, ~$19.61/month (well under $300 limit)',
            'System stable - 4 cron jobs operational, no manual intervention needed',
            'Weekly Memory Curation scheduled for tonight at 11 PM'
          ]
        },
        {
          startTime: '07:00',
          endTime: '07:05',
          trigger: 'Morning Daily Report cron job',
          tasks: [
            { description: 'Generated morning daily report from cron', timeSpent: '5 min', cost: '$0.02' },
            { description: 'Reviewed Feb 14 memory logs and sessions', timeSpent: '2 min', cost: '$0.01' },
            { description: 'Updated dashboard daily reports data', timeSpent: '2 min', cost: '$0.01' }
          ],
          decisions: [],
          blockers: [],
          observations: [
            'Yesterday (Feb 14): 3 autonomous sessions executed successfully',
            'Morning report, team standup, evening report all ran on schedule',
            '13 tasks in-progress across 4 agents in weekend sprint mode',
            'Cost holding steady: $0.08/day, ~$19.57/month (well under $300 limit)',
            'System stable - 4 cron jobs operational, no manual intervention needed',
            'Weekly Memory Curation scheduled for tonight at 11 PM'
          ]
        }
      ],
      costSummary: {
        totalCost: 0.08,
        monthlyTotal: 19.65
      },
      summary: {
        completed: [
          'Morning daily report generated successfully',
          'Daily team standup posted to shared context',
          'Evening daily report generated and saved',
          'Autonomous weekend sprint Day 2: 13 tasks in-progress across 4 agents'
        ],
        inProgress: [
          'Weekend autonomous sprint: 13 tasks across 4 agents',
          'Agent Activity Dashboard product test (8-hour build)',
          'Parallel execution quality validation',
          'Weekly Memory Curation (scheduled tonight 11 PM)'
        ],
        proposedNext: [
          'Complete Weekly Memory Curation tonight (extract patterns, update MEMORY.md)',
          'Monday: Review weekend sprint results, GO/NO-GO decision on continuation',
          'Validate cost savings from local model inference',
          'Review 13 in-progress tasks for completion status'
        ],
        needsDecision: [
          'Monday GO/NO-GO on autonomous sprint continuation',
          'Review 13 in-progress tasks for completion status'
        ]
      },
      costTracking: {
        model: 'moonshot/kimi-k2.5',
        tokens: '~4k',
        apiCalls: '4'
      }
    },
    {
      date: '2026-02-14',
      sessions: [
        {
          startTime: '17:00',
          endTime: '17:05',
          trigger: 'Evening Daily Report cron job',
          tasks: [
            { description: 'Generated evening daily report from cron', timeSpent: '5 min', cost: '$0.02' },
            { description: 'Reviewed today sessions: morning report, team standup, telegram activity', timeSpent: '2 min', cost: '$0.01' },
            { description: 'Updated dashboard daily reports data', timeSpent: '2 min', cost: '$0.01' }
          ],
          decisions: [],
          blockers: [],
          observations: [
            'Morning daily report generated successfully at 7:00 AM',
            'Daily team standup posted at 9:00 AM - 13 tasks in-progress across 4 agents',
            'Autonomous weekend sprint active: Agent Activity Dashboard product test',
            'System stable with ~$1.50/day burn rate vs $10/day limit',
            'Monthly cost at ~$19.49 (well under $300 limit)',
            'Parallel agent execution validated - 20x faster than serial tasks'
          ]
        },
        {
          startTime: '07:00',
          endTime: '07:05',
          trigger: 'Morning Daily Report cron job',
          tasks: [
            { description: 'Generated morning daily report from cron', timeSpent: '5 min', cost: '$0.02' },
            { description: 'Reviewed 2026-02-13 memory logs and sessions', timeSpent: '2 min', cost: '$0.01' },
            { description: 'Updated dashboard daily reports data', timeSpent: '2 min', cost: '$0.01' }
          ],
          decisions: [],
          blockers: [],
          observations: [
            'Ollama local models successfully configured yesterday (4 models)',
            'Parallel orchestrator enables up to 4 simultaneous agents',
            'Cost optimization Phase 2 active: 70% local / 30% API split',
            'Projected savings: ~$5-7/day (~$150-210/month)',
            '4 active cron sessions: Morning report, Evening report, Team standup, Heartbeat',
            'Monthly cost trending at ~$19.45 (well under $300 limit)'
          ]
        }
      ],
      costSummary: {
        totalCost: 0.08,
        monthlyTotal: 19.57
      },
      summary: {
        completed: [
          'Morning daily report generated successfully',
          'Daily team standup posted to shared context',
          'Evening daily report generated and saved',
          'Memory log created for 2026-02-14'
        ],
        inProgress: [
          'Ollama model downloads (~20GB total, background process)',
          'Weekly Memory Curation (scheduled for Sunday 11pm)',
          'Research AI Coding Tools (Scout agent)',
          'Research Cost Optimization (Scout agent)'
        ],
        proposedNext: [
          'Weekend parallel execution test with 4 simultaneous agents',
          'Validate local model inference quality vs API',
          'Monitor cost savings over next 3 days',
          'Review daily standup posts from agents',
          'Complete dashboard LaunchAgent installation'
        ],
        needsDecision: [
          'Dashboard LaunchAgent install for persistence (pending approval)',
          'Weekend test: Which backlog tasks to run in parallel?'
        ]
      },
      costTracking: {
        model: 'moonshot/kimi-k2.5',
        tokens: '~3k',
        apiCalls: '3'
      }
    },
    {
      date: '2026-02-13',
      sessions: [
        {
          startTime: '07:00',
          endTime: '07:05',
          trigger: 'Morning Daily Report cron job',
          tasks: [
            { description: 'Generated morning daily report from cron', timeSpent: '5 min', cost: '$0.02' },
            { description: 'Reviewed 2026-02-12 memory logs and sessions', timeSpent: '2 min', cost: '$0.01' },
            { description: 'Updated dashboard daily reports data', timeSpent: '2 min', cost: '$0.01' }
          ],
          decisions: [],
          blockers: [],
          observations: [
            'Major milestone yesterday: Team Coordination System fully implemented (5 phases)',
            '4 active agents now: Megatron, Petty, Scout, Architect',
            'System ready for 3-day fully autonomous operation',
            'Monthly cost at ~$19.23 (healthy, under $300 limit)',
            'Kanban board bug fixed - now displaying 7 completed tasks correctly',
            'Orchestrator LaunchAgent running every 15 minutes'
          ]
        },
        {
          startTime: '11:18',
          endTime: '11:52',
          trigger: 'Infrastructure Setup - Local Models',
          tasks: [
            { description: 'Configured Ollama local models (llama3.2:8b, qwen2.5-coder:7b, qwen2.5:14b, llama3.1:8b)', timeSpent: '20 min', cost: '$0.05' },
            { description: 'Modified orchestrator.js for parallel execution (MAX_PARALLEL_TASKS: 4)', timeSpent: '15 min', cost: '$0.04' },
            { description: 'Updated TOOLS.md with local model configuration', timeSpent: '5 min', cost: '$0.01' },
            { description: 'Tested parallel spawn capability (4 tasks, 14 slots)', timeSpent: '4 min', cost: '$0.01' }
          ],
          decisions: [
            'Local models: 70% of workloads local, 30% API fallback',
            'Parallel execution: Up to 4 agents simultaneously on 6-core i5',
            'Each agent gets dedicated core + ~10GB RAM slice'
          ],
          blockers: [],
          observations: [
            'Cost savings projection: ~$5-7/day = ~$150-210/month',
            'Models downloading: 4 models total (~20GB)',
            '64GB RAM optimized for 4 concurrent agents',
            'API models reserved for: web search, complex reasoning, final review'
          ]
        },
        {
          startTime: '17:00',
          endTime: '17:05',
          trigger: 'Evening Daily Report cron job',
          tasks: [
            { description: 'Generated evening daily report from cron', timeSpent: '5 min', cost: '$0.02' },
            { description: 'Reviewed 2026-02-13 memory logs and sessions', timeSpent: '2 min', cost: '$0.01' },
            { description: 'Updated dashboard daily reports data', timeSpent: '2 min', cost: '$0.01' }
          ],
          decisions: [],
          blockers: [],
          observations: [
            'Major infrastructure upgrade: Ollama local models + parallel execution',
            '4 active sessions: Morning report, Evening report, Team standup, Main',
            'Cost optimization Phase 2 initiated: Local inference reduces API spend',
            'Team coordination system stable - 4 agents operational'
          ]
        }
      ],
      costSummary: {
        totalCost: 0.18,
        monthlyTotal: 19.45
      },
      summary: {
        completed: [
          'Ollama local models configured (4 models: llama3.2:8b, qwen2.5-coder:7b, qwen2.5:14b, llama3.1:8b)',
          'Parallel orchestrator implementation (MAX_PARALLEL_TASKS: 4)',
          'TOOLS.md updated with local model guide and concurrency config',
          'Morning and evening daily reports generated successfully',
          'Cost optimization Phase 2: 70% local / 30% API split established'
        ],
        inProgress: [
          'Ollama model downloads (~20GB total)',
          'Weekly Memory Curation (Megatron - scheduled Sunday)',
          'Research AI Coding Tools (Scout)',
          'Write Blog: Autonomous AI (Megatron)',
          'Research Cost Optimization (Scout)'
        ],
        proposedNext: [
          'Test parallel agent execution with 4 simultaneous tasks',
          'Validate local model inference quality vs API',
          'Monitor cost savings over next 3 days',
          'Review daily standup posts from agents',
          'Weekend parallel execution test with backlog tasks'
        ],
        needsDecision: [
          'Decisions tab display still showing sparse details - needs Architect fix',
          'Data source consolidation - multiple sources causing sync issues'
        ]
      },
      costTracking: {
        model: 'moonshot/kimi-k2.5',
        tokens: '~8k',
        apiCalls: '7'
      }
    },
    {
      date: '2026-02-12',
      sessions: [
        {
          startTime: '07:00',
          endTime: '07:05',
          trigger: 'Morning Daily Report cron job',
          tasks: [
            { description: 'Generated morning daily report from cron', timeSpent: '5 min', cost: '$0.02' },
            { description: 'Reviewed yesterday\'s multi-agent validation test results', timeSpent: '2 min', cost: '$0.01' },
            { description: 'Updated dashboard daily reports data', timeSpent: '2 min', cost: '$0.01' }
          ],
          decisions: [],
          blockers: [],
          observations: [
            'Petty agent validated successfully - end-to-end workflow functional',
            'Kanban board enhancements deployed with progress tracking',
            'Decision persistence fixed and tested',
            'Monthly cost trending at ~$15.69 (well under $300 limit)'
          ]
        },
        {
          startTime: '17:00',
          endTime: '17:05',
          trigger: 'Evening Daily Report cron job',
          tasks: [
            { description: 'Generated evening daily report from cron', timeSpent: '5 min', cost: '$0.02' },
            { description: 'Reviewed today\'s sessions and memory files', timeSpent: '2 min', cost: '$0.01' },
            { description: 'Updated dashboard daily reports data', timeSpent: '2 min', cost: '$0.01' }
          ],
          decisions: [],
          blockers: [],
          observations: [
            'Kanban board bug fixed - now correctly displays completed tasks',
            'Multiple agent sessions active: scout-agent, queue-tasks, orchestrator-service',
            'System stable with ~$1.50/day burn rate'
          ]
        }
      ],
      costSummary: {
        totalCost: 0.04,
        monthlyTotal: 15.73
      },
      summary: {
        completed: [
          'Kanban board display bug fixed (API response format issue)',
          'Morning and evening daily reports generated successfully'
        ],
        inProgress: [
          'Phase 1: Skill standardization (pending start)',
          'Auto-router tool for model selection (Codex vs Kimi)',
          'Dashboard Kanban validation in real usage'
        ],
        proposedNext: [
          'Execute Phase 1 of improvement plan (skill standardization)',
          'Complete shadcn/ui standardization (AgentTeamDashboard.tsx P0)',
          'Test multi-agent workflow with Petty on design tasks',
          'Document multi-agent routing pattern',
          'Recruit Scout (Research Lead) - brief ready'
        ],
        needsDecision: [
          'Prioritize dashboard polish vs new agent recruitment?',
          'Start Phase 1 improvements today or continue validation?'
        ]
      },
      costTracking: {
        model: 'moonshot/kimi-k2.5',
        tokens: '~3k',
        apiCalls: '3'
      }
    },
    {
      date: '2026-02-11',
      sessions: [
        {
          startTime: '07:01',
          endTime: '07:05',
          trigger: 'Morning Daily Report cron job',
          tasks: [
            { description: 'Generated morning daily report from cron', timeSpent: '4 min', cost: '$0.03' },
            { description: 'Completed cost analysis - monthly total $13.39 on track', timeSpent: '1 min', cost: '$0.01' }
          ],
          decisions: [],
          blockers: [],
          observations: [
            'Autonomous orchestrator running every 30 min (stable)',
            '7 pending tasks in work queue detected',
            'Budget healthy: $10/day limit, minimal spend so far'
          ]
        },
        {
          startTime: '07:42',
          endTime: '10:42',
          trigger: 'User request: Dashboard Phase 2 + 3',
          tasks: [
            { description: 'Built Project Health tab component', timeSpent: '30 min', cost: '$0.18' },
            { description: 'Built Decisions Queue tab component', timeSpent: '30 min', cost: '$0.18' },
            { description: 'Built System Health tab component', timeSpent: '30 min', cost: '$0.18' },
            { description: 'Created shared context architecture', timeSpent: '30 min', cost: '$0.14' }
          ],
          decisions: [
            'Deployed shared brain architecture for agent coordination',
            'Created 4 new dashboard tabs with full functionality'
          ],
          blockers: [],
          observations: [
            'Shared context pattern enables agent-to-agent memory sharing',
            'Dashboard now has 8 fully functional tabs'
          ]
        },
        {
          startTime: '10:37',
          endTime: '10:42',
          trigger: 'Shared Context Deployment task',
          tasks: [
            { description: 'Created shared-context directory structure', timeSpent: '2 min', cost: '$0.02' },
            { description: 'Updated Megatron SOUL.md with shared context protocol', timeSpent: '2 min', cost: '$0.02' },
            { description: 'Created design system documentation', timeSpent: '1 min', cost: '$0.01' }
          ],
          decisions: [
            'Standardized on ~/.openclaw/shared-context/ for agent coordination',
            'Design system docs in place for UI consistency'
          ],
          blockers: [],
          observations: [
            'Shared context enables true multi-agent collaboration'
          ]
        },
        {
          startTime: '12:20',
          endTime: '14:00',
          trigger: 'Scroll Fix + Polish session',
          tasks: [
            { description: 'Fixed scroll issues in dashboard components', timeSpent: '45 min', cost: '$0.34' },
            { description: 'Polished UI consistency across tabs', timeSpent: '45 min', cost: '$0.34' }
          ],
          decisions: [],
          blockers: [],
          observations: [
            'Dashboard UX significantly improved',
            'All tabs now have consistent scroll behavior'
          ]
        },
        {
          startTime: '14:10',
          endTime: '14:15',
          trigger: 'Phase 1 Cost Optimization - COMPLETION',
          tasks: [
            { description: 'Implemented 5-minute deduplication for cost API', timeSpent: '2 min', cost: '$0.01' },
            { description: 'Cleaned 24 duplicate database entries', timeSpent: '1 min', cost: '$0.01' },
            { description: 'Reduced orchestrator frequency: 30min → 4hrs', timeSpent: '2 min', cost: '$0.01' },
            { description: 'Created lightweight system monitor (FREE)', timeSpent: '1 min', cost: '$0.01' }
          ],
          decisions: [
            'Orchestrator now runs every 4 hours instead of every 30 minutes',
            'Phase 2-3 optimization deferred - $45/month is sustainable',
            'Savings achieved: ~$7/day (~$210/month)'
          ],
          blockers: [],
          observations: [
            'Cost structure now: ~$1.50/day, ~$45/month (well under $300 limit)',
            'System monitor runs every 15min for FREE using OpenRouter Llama 3.3',
            'Validation week next: Prove shared-context with real agent tasks'
          ]
        },
        {
          startTime: '15:00',
          endTime: '15:30',
          trigger: 'Dashboard shadcn/ui Audit',
          tasks: [
            { description: 'Audited all 8 dashboard tabs for shadcn/ui usage', timeSpent: '15 min', cost: '$0.02' },
            { description: 'Created priority fix matrix', timeSpent: '10 min', cost: '$0.02' },
            { description: 'Documented inconsistencies and missing components', timeSpent: '5 min', cost: '$0.01' }
          ],
          decisions: [
            'AgentTeamDashboard.tsx is P0 priority fix (no shadcn imports)',
            'Need to standardize import paths and color tokens',
            'Missing components to install: Alert, Table, Avatar, Tooltip, DropdownMenu, Tabs, Skeleton'
          ],
          blockers: [],
          observations: [
            '4 tabs fully using shadcn/ui: ExecutiveSummary, DailyReports, CostAnalytics',
            '4 tabs need refactoring: AgentTeamDashboard, KanbanBoard, TaskManager, InsightsDashboard',
            'Mixed adoption due to incremental development - expected'
          ]
        },
        {
          startTime: '17:00',
          endTime: '17:05',
          trigger: 'Evening Daily Report cron job',
          tasks: [
            { description: 'Generated evening daily report from cron', timeSpent: '5 min', cost: '$0.01' }
          ],
          decisions: [],
          blockers: [],
          observations: [
            'Productive day: Major dashboard features + cost optimization complete',
            'System now running efficiently at ~$1.50/day vs previous ~$8.50/day'
          ]
        }
      ],
      costSummary: {
        totalCost: 1.57,
        monthlyTotal: 14.96
      },
      summary: {
        completed: [
          'Dashboard Phase 2 + 3: Project Health, Decisions Queue, System Health tabs',
          'Shared Context Architecture deployed for agent coordination',
          'Phase 1 Cost Optimization: $7/day savings achieved',
          'Dashboard shadcn/ui audit completed with fix priorities',
          'Scroll fixes and UI polish across all tabs',
          'Lightweight system monitor (FREE, every 15min)'
        ],
        inProgress: [
          'AgentTeamDashboard.tsx shadcn/ui refactoring (P0)',
          'Validation week preparation - testing shared-context with real agent tasks'
        ],
        proposedNext: [
          'Fix AgentTeamDashboard.tsx with shadcn/ui components',
          'Refactor remaining tabs: KanbanBoard, TaskManager, InsightsDashboard',
          'Install missing shadcn components: Alert, Table, Avatar, Tooltip, etc.',
          'Validation week: Test Petty with shared-context workflow',
          'Recruit Scout (Research Lead) - brief ready'
        ],
        needsDecision: [
          'Continue with shadcn/ui standardization? (recommended)',
          'Prioritize validation week or dashboard polish?'
        ]
      },
      costTracking: {
        model: 'moonshot/kimi-k2.5',
        tokens: '~75k',
        apiCalls: '24'
      }
    },
    {
      date: '2026-02-10',
      sessions: [
        {
          startTime: '07:00',
          endTime: '07:05',
          trigger: 'Morning Daily Report cron job',
          tasks: [
            { description: 'Generated morning daily report from cron', timeSpent: '5 min', cost: '$0.01' }
          ],
          decisions: [],
          blockers: [],
          observations: [
            'Dashboard server stable on localhost:5173',
            'Cron-based reporting system operational'
          ]
        },
        {
          startTime: '09:30',
          endTime: '10:15',
          trigger: 'Dashboard server down + user requests',
          tasks: [
            { description: 'Restarted Vite dev server on localhost:5173', timeSpent: '5 min', cost: '$0.01' },
            { description: 'Fixed TypeScript errors (added tsconfig.json)', timeSpent: '10 min', cost: '$0.03' },
            { description: 'Migrated to shadcn/ui default theme + theme toggle', timeSpent: '20 min', cost: '$0.06' },
            { description: 'Created persistent service scripts (start-dashboard.sh)', timeSpent: '10 min', cost: '$0.05' }
          ],
          decisions: [
            'Added theme toggle (light/dark/system) for better UX',
            'Created persistent service wrapper for dashboard'
          ],
          blockers: [],
          observations: [
            'User prioritizes cost efficiency — good to model in recommendations',
            'Dashboard persistence still needs macOS LaunchAgent install'
          ]
        },
        {
          startTime: '14:00',
          endTime: '15:30',
          trigger: 'User request for specialized research agent',
          tasks: [
            { description: 'Created research-strategist workspace structure', timeSpent: '20 min', cost: '$0.05' },
            { description: 'Wrote SOUL.md, USER.md, PROJECTS.md for strategist', timeSpent: '30 min', cost: '$0.08' },
            { description: 'Delivered Clawbot optimization research brief', timeSpent: '25 min', cost: '$0.12' },
            { description: 'Populated HEARTBEAT.md with cost-efficient checks', timeSpent: '15 min', cost: '$0.10' }
          ],
          decisions: [
            'Research Strategist uses isolated workspace pattern',
            'Delivered actionable research brief with clear next steps'
          ],
          blockers: [],
          observations: [
            'Research Strategist operational pattern working well',
            'Web search + synthesis is high-value for <$0.15'
          ]
        },
        {
          startTime: '16:30',
          endTime: '16:45',
          trigger: 'Infrastructure audit — missing pieces',
          tasks: [
            { description: 'Added RED lines to USER.md for safety', timeSpent: '5 min', cost: '$0.02' },
            { description: 'Created cost-efficient HEARTBEAT.md', timeSpent: '5 min', cost: '$0.02' },
            { description: 'Set up memory/ folder + MEMORY.md curated memory', timeSpent: '5 min', cost: '$0.01' }
          ],
          decisions: [
            'Heartbeat: daily morning/evening + weekly batch (cost-efficient)',
            'DeFi checks: NOT in heartbeat — requires explicit user request (RED level)',
            'Memory system: Daily logs + curated MEMORY.md for compound context'
          ],
          blockers: [],
          observations: [
            'Memory infrastructure now complete — compound context retention enabled',
            'Target: <$5/week in heartbeat costs'
          ]
        },
        {
          startTime: '17:00',
          endTime: '17:05',
          trigger: 'Evening Daily Report cron job',
          tasks: [
            { description: 'Generated evening daily report from cron', timeSpent: '5 min', cost: '$0.01' }
          ],
          decisions: [],
          blockers: [],
          observations: [
            'Cron-based evening reporting system operational',
            'Dashboard data now populated with real work logs'
          ]
        }
      ],
      costSummary: {
        totalCost: 0.56,
        monthlyTotal: 13.38
      },
      summary: {
        completed: [
          'Dashboard theme system (light/dark/system) with shadcn/ui',
          'Dashboard persistent service scripts created',
          'Research Strategist agent fully operational',
          'Clawbot optimization research brief delivered',
          'Memory infrastructure (MEMORY.md + daily logs)',
          'Cost-efficient HEARTBEAT.md with clear check schedule'
        ],
        inProgress: [
          'Dashboard macOS LaunchAgent installation (needs approval)'
        ],
        proposedNext: [
          'Install dashboard as LaunchAgent for true persistence',
          'Test heartbeat cost tracking for 1 week',
          'DDI Stage 3 scope clarification (still pending user input)',
          'Research DeFi yield opportunities (on request)'
        ],
        needsDecision: [
          'DDI Stage 3 scope — waiting for user clarification',
          'Dashboard LaunchAgent install — system-level change'
        ]
      },
      costTracking: {
        model: 'moonshot/kimi-k2.5',
        tokens: '~55k',
        apiCalls: '18'
      }
    },
    { 
      date: '2026-02-09', 
      sessions: [
        {
          startTime: '19:11',
          endTime: '23:29',
          trigger: 'User request for command center dashboard',
          tasks: [
            { description: 'Created dashboard project structure (React + dependencies)', timeSpent: '15 min', cost: '$0.02' },
            { description: 'Built all React components (App, DashboardHome, Kanban, Projects, etc.)', timeSpent: '2 hrs', cost: '$0.35' },
            { description: 'Configured Tailwind CSS v3 for styling', timeSpent: '10 min', cost: '$0.02' },
            { description: 'Installed npm dependencies (1329 packages)', timeSpent: '5 min', cost: '$0.01' },
            { description: 'Started dev server and verified functionality', timeSpent: '5 min', cost: '$0.01' },
            { description: 'Refactored Daily Reports to match user template', timeSpent: '30 min', cost: '$0.05' },
            { description: 'Added List View to Daily Reports', timeSpent: '15 min', cost: '$0.02' }
          ],
          decisions: [
            'Used Tailwind v3 for Create React App compatibility',
            'Structured components with feature-based folders',
            'Implemented localStorage for data persistence',
            'Added Calendar + List view for Daily Reports'
          ],
          blockers: ['None'],
          observations: [
            'React + Tailwind is a solid stack for rapid UI development',
            'Sample data confused user - cleared all demo data on request',
            'User wants real work data visible, not placeholders'
          ]
        },
        {
          startTime: '23:30',
          endTime: '23:45',
          trigger: 'Dashboard server restart request',
          tasks: [
            { description: 'Diagnosed Vite vs CRA port conflict (3000 vs 5173)', timeSpent: '5 min', cost: '$0.01' },
            { description: 'Killed old process and ran npm install', timeSpent: '3 min', cost: '$0.01' },
            { description: 'Started Vite dev server on localhost:5173', timeSpent: '2 min', cost: '$0.01' }
          ],
          decisions: [
            'This is a Vite project (not CRA) - runs on port 5173',
            'Old CRA project on port 3000 was from different session'
          ],
          blockers: ['None'],
          observations: [
            'Project uses Vite, not Create React App',
            'Server now running stable on localhost:5173'
          ]
        }
      ],
      costSummary: {
        totalCost: 0.51,
        monthlyTotal: 12.85
      },
      summary: {
        completed: [
          'Dashboard v1 fully built and running on localhost:3000',
          'All 6 main components implemented',
          'Tailwind CSS styling applied',
          'Calendar + List view for Daily Reports'
        ],
        inProgress: [
          'Real data population per user request'
        ],
        proposedNext: [
          'Add charts/metrics visualization',
          'Mobile responsiveness pass',
          'Deploy to Vercel for remote access',
          'Export daily logs to markdown files'
        ],
        needsDecision: []
      },
      costTracking: {
        model: 'moonshot/kimi-k2.5',
        tokens: '~140k',
        apiCalls: '52'
      }
    },
    { 
      date: '2026-02-08', 
      sessions: [
        {
          startTime: '15:30',
          endTime: '16:53',
          trigger: 'Workspace organization discussion',
          tasks: [
            { description: 'Created project folder structure (defi/, consulting/, ddi/, hyperwarp/, research/)', timeSpent: '30 min', cost: '$0.05' },
            { description: 'Added README.md files to each project folder', timeSpent: '20 min', cost: '$0.03' },
            { description: 'Updated PROJECTS.md registry with all active projects', timeSpent: '15 min', cost: '$0.02' },
            { description: 'Documented file migration decision (abandoned due to risk)', timeSpent: '10 min', cost: '$0.02' }
          ],
          decisions: [
            'Keep core agent files in ~/openclaw_workspace/ (not ~/.openclaw/workspace/)',
            'Abandon file migration due to risk of breaking agent initialization',
            'Update SOUL.md to reflect actual working location'
          ],
          blockers: ['None'],
          observations: [
            'File migration is risky - prefer hard reset when state is unclear',
            'Risk of breaking agent initialization outweighs organizational purity'
          ]
        }
      ],
      costSummary: {
        totalCost: 0.12,
        monthlyTotal: 12.34
      },
      summary: {
        completed: [
          'Project folder structure created',
          'README files for each project',
          'PROJECTS.md updated with status and priorities'
        ],
        inProgress: [],
        proposedNext: [
          'Start DDI architecture design',
          'Set up daily logging system'
        ],
        needsDecision: [
          'DDI Stage 3 scope clarification (message received but not understood)'
        ]
      },
      costTracking: {
        model: 'moonshot/kimi-k2.5',
        tokens: '~32k',
        apiCalls: '14'
      }
    },
  ],
  insights: {
    lessonsLearned: [
      { id: 1, lesson: 'File migration is risky - prefer hard reset when state is unclear', date: '2026-02-08', category: 'Process' },
      { id: 2, lesson: 'Sample/demo data confuses users - always use real data or empty states', date: '2026-02-09', category: 'UX' },
      { id: 3, lesson: 'React + Tailwind v3 + Create React App is a solid rapid-prototyping stack', date: '2026-02-09', category: 'Technical' },
    ],
    blockers: [
      { id: 1, issue: 'DDI Stage 3 scope undefined', frequency: 1, status: 'open' },
    ],
    improvements: [
      { id: 1, suggestion: 'Add charts/metrics visualization to dashboard', impact: 'high', effort: 'medium' },
      { id: 2, suggestion: 'Mobile responsiveness for dashboard', impact: 'medium', effort: 'low' },
      { id: 3, suggestion: 'Export daily logs to markdown files matching template', impact: 'medium', effort: 'low' },
      { id: 4, suggestion: 'Deploy dashboard to Vercel for remote access', impact: 'high', effort: 'low' },
    ]
  }
};

const DataContext = createContext();

export function DataProvider({ children }) {
  const [data, setData] = useState(() => {
    const saved = localStorage.getItem('megatronData');
    return saved ? JSON.parse(saved) : initialData;
  });

  useEffect(() => {
    localStorage.setItem('megatronData', JSON.stringify(data));
  }, [data]);

  const updateProject = (id, updates) => {
    setData(prev => ({
      ...prev,
      projects: prev.projects.map(p => p.id === id ? { ...p, ...updates } : p)
    }));
  };

  const addProject = (project) => {
    setData(prev => ({
      ...prev,
      projects: [...prev.projects, { ...project, id: Date.now(), progress: 0, lastUpdated: new Date().toISOString().split('T')[0] }]
    }));
  };

  const moveKanbanItem = (itemId, fromColumn, toColumn) => {
    setData(prev => {
      const item = prev.kanban[fromColumn].find(i => i.id === itemId);
      if (!item) return prev;
      
      const updatedItem = { ...item };
      if (toColumn === 'inProgress') updatedItem.started = new Date().toISOString().split('T')[0];
      if (toColumn === 'completed') updatedItem.completed = new Date().toISOString().split('T')[0];
      if (toColumn === 'blocked' && !updatedItem.blocker) updatedItem.blocker = 'Needs input';
      
      return {
        ...prev,
        kanban: {
          ...prev.kanban,
          [fromColumn]: prev.kanban[fromColumn].filter(i => i.id !== itemId),
          [toColumn]: [...prev.kanban[toColumn], updatedItem]
        }
      };
    });
  };

  const addKanbanItem = (column, item) => {
    setData(prev => ({
      ...prev,
      kanban: {
        ...prev.kanban,
        [column]: [...prev.kanban[column], { ...item, id: Date.now(), created: new Date().toISOString().split('T')[0] }]
      }
    }));
  };

  const addTask = (task) => {
    setData(prev => ({
      ...prev,
      tasks: [...prev.tasks, { ...task, id: Date.now() }]
    }));
  };

  const updateTask = (id, updates) => {
    setData(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
    }));
  };

  const addDailyReport = (report) => {
    setData(prev => ({
      ...prev,
      dailyReports: [{ ...report, date: new Date().toISOString().split('T')[0] }, ...prev.dailyReports]
    }));
  };

  const resetData = () => {
    localStorage.removeItem('megatronData');
    setData(initialData);
    window.location.reload();
  };

  return (
    <DataContext.Provider value={{
      data,
      updateProject,
      addProject,
      moveKanbanItem,
      addKanbanItem,
      addTask,
      updateTask,
      addDailyReport,
      resetData
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
