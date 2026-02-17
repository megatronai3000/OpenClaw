/**
 * Agent Spawner - Coordinates team agents
 * 
 * Agents:
 * - Scout: Research, market analysis
 * - Petty: Design, UI/UX
 * - Architect: Full-stack development
 */

const AGENT_CONFIGS = {
  scout: {
    name: 'Scout',
    description: 'Research, market analysis, competitive intelligence',
    color: '#8b5cf6', // purple
    defaultModel: 'minimax/MiniMax-M2.5',
    capabilities: ['research', 'analysis', 'competitive', 'market'],
  },
  petty: {
    name: 'Petty',
    description: 'Design, UI/UX, visual assets',
    color: '#ec4899', // pink
    defaultModel: 'minimax/MiniMax-M2.5',
    capabilities: ['design', 'ui', 'ux', 'visual', 'figma'],
  },
  architect: {
    name: 'Architect',
    description: 'Full-stack development, code implementation',
    color: '#3b82f6', // blue
    defaultModel: 'minimax/MiniMax-M2.5',
    capabilities: ['frontend', 'backend', 'fullstack', 'code', 'api'],
  },
  megatron: {
    name: 'Megatron',
    description: 'Chief of Staff, coordinator, product manager',
    color: '#22c55e', // green
    defaultModel: 'minimax/MiniMax-M2.5',
    capabilities: ['coordination', 'management', 'planning', 'proposals'],
  }
};

class AgentSpawner {
  constructor() {
    this.activeAgents = new Map();
    this.taskHistory = [];
  }
  
  /**
   * Determine which agent should handle a task
   */
  routeTask(taskDescription) {
    const desc = taskDescription.toLowerCase();
    
    // Research tasks → Scout
    if (desc.includes('research') || desc.includes('analyze') || desc.includes('market') || 
        desc.includes('competitive') || desc.includes('study') || desc.includes('investigate')) {
      return 'scout';
    }
    
    // Design tasks → Petty
    if (desc.includes('design') || desc.includes('ui') || desc.includes('ux') || 
        desc.includes('visual') || desc.includes('figma') || desc.includes('prototype') ||
        desc.includes('mockup') || desc.includes('component')) {
      return 'petty';
    }
    
    // Development tasks → Architect
    if (desc.includes('build') || desc.includes('code') || desc.includes('implement') || 
        desc.includes('api') || desc.includes('backend') || desc.includes('frontend') ||
        desc.includes('database') || desc.includes('function') || desc.includes('feature')) {
      return 'architect';
    }
    
    // Default → Megatron
    return 'megatron';
  }
  
  /**
   * Spawn an agent for a task (returns info - actual spawning handled by main process)
   */
  spawnAgent(agentType, task, options = {}) {
    const config = AGENT_CONFIGS[agentType] || AGENT_CONFIGS.megatron;
    
    const agentSession = {
      id: `agent_${Date.now()}`,
      type: agentType,
      name: config.name,
      task: task,
      startedAt: new Date().toISOString(),
      status: 'pending_spawn',
      model: options.model || config.defaultModel,
      prompt: this.buildPrompt(agentType, task, options),
      ...options,
    };
    
    this.activeAgents.set(agentSession.id, agentSession);
    
    return {
      success: true,
      agent: agentSession,
      message: `Agent ${config.name} ready to spawn. Use sessions_spawn in main process.`,
    };
  }
  
  /**
   * Build agent-specific prompt
   */
  buildPrompt(agentType, task, options) {
    const baseContext = options.context || '';
    const proposalId = options.proposalId || '';
    
    const prompts = {
      scout: `You are Scout - Research & Analysis Agent.
        
${baseContext}

TASK: ${task}

Focus on:
- Research methodology
- Market analysis
- Competitive intelligence
- Data gathering and synthesis
- Findings and recommendations

Output a detailed research report with sources.`,
      
      petty: `You are Petty - Design Agent.

${baseContext}

TASK: ${task}

Focus on:
- UI/UX design principles
- Visual design
- Component design
- Design system consistency
- User experience

Output design specifications, mockup descriptions, or code for UI components.`,
      
      architect: `You are Architect - Development Agent.

${baseContext}

TASK: ${task}

Focus on:
- Code implementation
- Best practices
- Architecture decisions
- Technical specifications
- Error handling

Output working code with comments.`,
      
      megatron: `You are Megatron - Chief of Staff.

${baseContext}

TASK: ${task}

Coordinate the team, create proposals, manage tasks.
Ensure all work is documented and aligned with goals.`,
    };
    
    return prompts[agentType] || prompts.megatron;
  }
  
  /**
   * Get active agents
   */
  getActiveAgents() {
    return Array.from(this.activeAgents.values());
  }
  
  /**
   * Get agent by session key
   */
  getAgentBySession(sessionKey) {
    for (const agent of this.activeAgents.values()) {
      if (agent.sessionKey === sessionKey) {
        return agent;
      }
    }
    return null;
  }
  
  /**
   * Mark agent as completed
   */
  completeAgent(agentId, result) {
    const agent = this.activeAgents.get(agentId);
    if (agent) {
      agent.status = 'completed';
      agent.completedAt = new Date().toISOString();
      agent.result = result;
      this.taskHistory.push(agent);
    }
    return agent;
  }
  
  /**
   * Mark agent as failed
   */
  failAgent(agentId, error) {
    const agent = this.activeAgents.get(agentId);
    if (agent) {
      agent.status = 'failed';
      agent.failedAt = new Date().toISOString();
      agent.error = error;
    }
    return agent;
  }
  
  /**
   * Get agent configuration
   */
  getAgentConfig(agentType) {
    return AGENT_CONFIGS[agentType] || null;
  }
  
  /**
   * Get all agent configs
   */
  getAllAgentConfigs() {
    return AGENT_CONFIGS;
  }
  
  /**
   * Get team status
   */
  getTeamStatus() {
    const agents = this.getActiveAgents();
    return {
      active: agents.length,
      byType: {
        scout: agents.filter(a => a.type === 'scout').length,
        petty: agents.filter(a => a.type === 'petty').length,
        architect: agents.filter(a => a.type === 'architect').length,
        megatron: agents.filter(a => a.type === 'megatron').length,
      },
      history: this.taskHistory.length,
    };
  }
}

module.exports = new AgentSpawner();
