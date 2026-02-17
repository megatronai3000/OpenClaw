/**
 * Agent Team API Routes
 * 
 * Endpoints:
 * - GET /api/agents - List all agents
 * - GET /api/agents/:type - Get agent config
 * - POST /api/agents/spawn - Spawn an agent
 * - GET /api/agents/active - Get active agents
 * - GET /api/agents/team-status - Get team status
 * - POST /api/agents/route - Route task to appropriate agent
 */

const agentSpawner = require('./agent-spawner');

module.exports = function(router) {
  
  // List all agent configurations
  router.get('/', (req, res) => {
    try {
      res.json({
        agents: agentSpawner.getAllAgentConfigs(),
        teamStatus: agentSpawner.getTeamStatus(),
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get specific agent config
  router.get('/:type', (req, res) => {
    try {
      const config = agentSpawner.getAgentConfig(req.params.type);
      if (!config) {
        return res.status(404).json({ error: 'Agent type not found' });
      }
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Spawn an agent
  router.post('/spawn', async (req, res) => {
    try {
      const { agentType, task, options } = req.body;
      
      if (!agentType || !task) {
        return res.status(400).json({ error: 'agentType and task are required' });
      }
      
      const result = await agentSpawner.spawnAgent(agentType, task, options);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get active agents
  router.get('/active', (req, res) => {
    try {
      res.json({
        agents: agentSpawner.getActiveAgents(),
        count: agentSpawner.getActiveAgents().length,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get team status
  router.get('/team-status', (req, res) => {
    try {
      res.json(agentSpawner.getTeamStatus());
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Route task to appropriate agent
  router.post('/route', (req, res) => {
    try {
      const { taskDescription } = req.body;
      
      if (!taskDescription) {
        return res.status(400).json({ error: 'taskDescription is required' });
      }
      
      const agentType = agentSpawner.routeTask(taskDescription);
      const config = agentSpawner.getAgentConfig(agentType);
      
      res.json({
        recommendedAgent: agentType,
        config,
        reasoning: `Task "${taskDescription}" routed to ${config.name} based on keywords`,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  return router;
};
