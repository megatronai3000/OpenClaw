/**
 * Guard Rails API Routes
 * 
 * Endpoints:
 * - GET /api/guardrails/status - Get current status
 * - POST /api/guardrails/check - Check if task is allowed
 * - POST /api/guardrails/auto-approve - Check auto-approval
 * - POST /api/guardrails/emergency-stop - Emergency stop
 * - POST /api/guardrails/resume - Resume from stop
 * - GET /api/guardrails/stats - Get statistics
 */

const guardRails = require('./guard-rails');

module.exports = function(router) {
  
  // Get guard rails status
  router.get('/status', (req, res) => {
    try {
      res.json({
        config: guardRails.config,
        stats: guardRails.getStats(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Check if task is allowed
  router.post('/check', (req, res) => {
    try {
      const { estimatedCost, taskDescription } = req.body;
      const result = guardRails.check({
        estimatedCost: estimatedCost || 0,
        taskDescription: taskDescription || '',
      });
      
      res.json({
        ...result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Check auto-approval
  router.post('/auto-approve', (req, res) => {
    try {
      const { estimatedCost, taskDescription } = req.body;
      const result = guardRails.shouldAutoApprove({
        estimatedCost: estimatedCost || 0,
        taskDescription: taskDescription || '',
      });
      
      res.json({
        ...result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Emergency stop
  router.post('/emergency-stop', (req, res) => {
    try {
      const result = guardRails.emergencyStop();
      res.json({
        ...result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Resume from emergency stop
  router.post('/resume', (req, res) => {
    try {
      const result = guardRails.resume();
      res.json({
        ...result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get statistics
  router.get('/stats', (req, res) => {
    try {
      res.json({
        stats: guardRails.getStats(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Update configuration
  router.post('/config', (req, res) => {
    try {
      const updates = req.body;
      const newConfig = guardRails.updateConfig(updates);
      res.json({
        config: newConfig,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  return router;
};
