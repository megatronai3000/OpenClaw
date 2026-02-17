// Agent Team API Routes
// Add these to server.js after the existing routes

const fs = require('fs');
const path = require('path');

// Paths to team memory files
const TEAM_MEMORY_DIR = path.join(__dirname, '..', 'team-memory');
const AGENTS_DIR = path.join(TEAM_MEMORY_DIR, 'agents');

// ===== AGENT TEAM API =====

// Get all agents from SQLite team_agents table + context files
app.get('/api/agents', (req, res) => {
  try {
    // Get agents from database
    const dbAgents = db.prepare('SELECT * FROM team_agents ORDER BY name').all();
    
    // Enhance with context file data
    const agents = dbAgents.map(agent => {
      const contextPath = path.join(AGENTS_DIR, agent.id, 'context.md');
      let context = null;
      
      if (fs.existsSync(contextPath)) {
        try {
          const contextContent = fs.readFileSync(contextPath, 'utf8');
          // Parse basic context info
          const statusMatch = contextContent.match(/\*\*Last Active:\*\*\s*(.+)/);
          const modeMatch = contextContent.match(/\*\*Mode:\*\*\s*(.+)/);
          const moodMatch = contextContent.match(/\*\*Mood:\*\*\s*(.+)/);
          
          context = {
            lastActive: statusMatch ? statusMatch[1].trim() : null,
            mode: modeMatch ? modeMatch[1].trim() : null,
            mood: moodMatch ? moodMatch[1].trim() : null,
            hasContext: true
          };
        } catch (e) {
          context = { hasContext: false, error: e.message };
        }
      }
      
      return {
        ...agent,
        context
      };
    });
    
    res.json(agents);
  } catch (err) {
    console.error('Failed to get agents:', err);
    res.status(500).json({ error: 'Failed to get agents' });
  }
});

// Get specific agent with full context
app.get('/api/agents/:id', (req, res) => {
  try {
    const agent = db.prepare('SELECT * FROM team_agents WHERE id = ?').get(req.params.id);
    
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Read full context file
    const contextPath = path.join(AGENTS_DIR, agent.id, 'context.md');
    let context = null;
    
    if (fs.existsSync(contextPath)) {
      context = fs.readFileSync(contextPath, 'utf8');
    }
    
    // Read SOUL.md if exists
    const soulPath = path.join(AGENTS_DIR, agent.id, 'SOUL.md');
    let soul = null;
    if (fs.existsSync(soulPath)) {
      soul = fs.readFileSync(soulPath, 'utf8');
    }
    
    res.json({
      ...agent,
      context,
      soul
    });
  } catch (err) {
    console.error('Failed to get agent:', err);
    res.status(500).json({ error: 'Failed to get agent' });
  }
});

// ===== WORK QUEUE API =====

// Parse work-queue.md file
function parseWorkQueue() {
  const queuePath = path.join(TEAM_MEMORY_DIR, 'work-queue.md');
  
  if (!fs.existsSync(queuePath)) {
    return { tasks: [], budget: {} };
  }
  
  const content = fs.readFileSync(queuePath, 'utf8');
  const tasks = [];
  
  // Parse budget status
  const budgetMatch = content.match(/\*\*Spent Today:\*\*\s*\$(.+)/);
  const limitMatch = content.match(/\*\*Daily Budget:\*\*\s*\$(.+)/);
  
  const budget = {
    spent: budgetMatch ? parseFloat(budgetMatch[1]) : 0,
    limit: limitMatch ? parseFloat(limitMatch[1]) : 10
  };
  
  // Parse tasks using regex
  const taskRegex = /-\s*\[([ x~!])\]\s*\*\*Task ID:\*\*\s*(.+?)\n\s*\*\*Agent:\*\*\s*(.+?)\n\s*\*\*Priority:\*\*\s*(.+?)\n\s*\*\*Type:\*\*\s*(.+?)\n\s*\*\*Description:\*\*\s*(.+?)(?=\n\s*\*\*|$)/gs;
  
  let match;
  while ((match = taskRegex.exec(content)) !== null) {
    const statusMap = {
      ' ': 'pending',
      'x': 'completed',
      '~': 'in-progress',
      '!': 'blocked'
    };
    
    // Extract additional fields
    const taskBlock = match[0];
    const estimatedMatch = taskBlock.match(/\*\*Estimated Cost:\*\*\s*\$(.+)/);
    const actualMatch = taskBlock.match(/\*\*Actual Cost:\*\*\s*\$(.+)/);
    const completedMatch = taskBlock.match(/\*\*Completed:\*\*\s*(.+)/);
    
    tasks.push({
      id: match[2].trim(),
      agent: match[3].trim(),
      priority: match[4].trim().toLowerCase(),
      type: match[5].trim(),
      description: match[6].trim(),
      status: statusMap[match[1]] || 'pending',
      estimatedCost: estimatedMatch ? parseFloat(estimatedMatch[1]) : null,
      actualCost: actualMatch ? parseFloat(actualMatch[1]) : null,
      completedAt: completedMatch ? completedMatch[1].trim() : null
    });
  }
  
  return { tasks, budget };
}

// Get work queue
app.get('/api/work-queue', (req, res) => {
  try {
    const data = parseWorkQueue();
    res.json(data);
  } catch (err) {
    console.error('Failed to parse work queue:', err);
    res.status(500).json({ error: 'Failed to parse work queue' });
  }
});

// Add task to work queue
app.post('/api/work-queue', (req, res) => {
  try {
    const { id, agent, priority, type, description, estimatedCost } = req.body;
    
    if (!id || !agent || !description) {
      return res.status(400).json({ error: 'Missing required fields: id, agent, description' });
    }
    
    const queuePath = path.join(TEAM_MEMORY_DIR, 'work-queue.md');
    
    if (!fs.existsSync(queuePath)) {
      return res.status(500).json({ error: 'Work queue file not found' });
    }
    
    const content = fs.readFileSync(queuePath, 'utf8');
    
    // Create new task entry
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const newTask = `
- [ ] **Task ID:** ${id}
  **Agent:** ${agent}
  **Priority:** ${priority || 'MEDIUM'}
  **Type:** ${type || 'Task'}
  **Description:** ${description}
  **Estimated Cost:** $${estimatedCost || '0.02'}
  **Queued:** ${now}
`;
    
    // Insert after "## High Priority" or at the end of file
    const insertPoint = content.indexOf('## High Priority');
    if (insertPoint !== -1) {
      const nextSection = content.indexOf('##', insertPoint + 1);
      const insertIndex = nextSection !== -1 ? nextSection : content.length;
      const newContent = content.slice(0, insertIndex) + newTask + content.slice(insertIndex);
      fs.writeFileSync(queuePath, newContent);
    } else {
      fs.appendFileSync(queuePath, newTask);
    }
    
    res.json({ success: true, id });
  } catch (err) {
    console.error('Failed to add task:', err);
    res.status(500).json({ error: 'Failed to add task' });
  }
});

// Update task status
app.put('/api/work-queue/:id', (req, res) => {
  try {
    const { status, actualCost } = req.body;
    const queuePath = path.join(TEAM_MEMORY_DIR, 'work-queue.md');
    
    if (!fs.existsSync(queuePath)) {
      return res.status(500).json({ error: 'Work queue file not found' });
    }
    
    let content = fs.readFileSync(queuePath, 'utf8');
    
    // Find and update the task
    const taskRegex = new RegExp(`(- \\[.\\] \\*\\*Task ID:\\*\\* ${req.params.id}.*?)\\n(?=\\n|$)`, 's');
    
    const statusChar = {
      'pending': ' ',
      'completed': 'x',
      'in-progress': '~',
      'blocked': '!'
    }[status] || ' ';
    
    content = content.replace(
      new RegExp(`(- \\[.)\\] \\*\\*Task ID:\\*\\* ${req.params.id})`),
      `- [${statusChar}] **Task ID:** ${req.params.id}`
    );
    
    // Add actual cost if provided
    if (actualCost && status === 'completed') {
      const completedTime = new Date().toISOString().replace('T', ' ').substring(0, 16);
      content = content.replace(
        new RegExp(`(- \\[${statusChar}\\] \\*\\*Task ID:\\*\\* ${req.params.id}.*?)(?=\\n\\n|$)`, 's'),
        (match) => {
          if (!match.includes('**Actual Cost:**')) {
            return match.replace(
              /\n$/,
              `  **Actual Cost:** $${actualCost}\n  **Completed:** ${completedTime}\n`
            );
          }
          return match;
        }
      );
    }
    
    fs.writeFileSync(queuePath, content);
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to update task:', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// ===== BUDGET API =====

// Get budget tracker data
app.get('/api/budget', (req, res) => {
  try {
    const budgetPath = path.join(TEAM_MEMORY_DIR, 'budget-tracker.md');
    
    if (!fs.existsSync(budgetPath)) {
      return res.json({
        dailyLimit: 10,
        spentToday: 0,
        remaining: 10,
        status: 'healthy',
        activities: []
      });
    }
    
    const content = fs.readFileSync(budgetPath, 'utf8');
    
    // Parse budget summary
    const limitMatch = content.match(/\*\*Limit:\*\*\s*\$(.+)/);
    const spentMatch = content.match(/\*\*Spent Today:\*\*\s*\$(.+)/);
    const remainingMatch = content.match(/\*\*Remaining:\*\*\s*\$(.+)/);
    const statusMatch = content.match(/\*\*Status:\*\*\s*(.+)/);
    
    // Parse activity log
    const activities = [];
    const activityMatch = content.match(/## Today's Activity Log\n\n([\s\S]*?)(?=\n##|$)/);
    
    if (activityMatch) {
      const lines = activityMatch[1].split('\n');
      lines.forEach(line => {
        const match = line.match(/\|\s*(\d{2}:\d{2})\s*\|\s*(\w+)\s*\|\s*(.+?)\s*\|\s*\$(.+)\s*\|\s*\$(.+)\s*\|/);
        if (match) {
          activities.push({
            time: match[1],
            agent: match[2],
            task: match[3].trim(),
            cost: parseFloat(match[4]),
            runningTotal: parseFloat(match[5])
          });
        }
      });
    }
    
    res.json({
      dailyLimit: limitMatch ? parseFloat(limitMatch[1]) : 10,
      spentToday: spentMatch ? parseFloat(spentMatch[1]) : 0,
      remaining: remainingMatch ? parseFloat(remainingMatch[1]) : 10,
      status: statusMatch ? statusMatch[1].trim() : 'unknown',
      activities
    });
  } catch (err) {
    console.error('Failed to get budget:', err);
    res.status(500).json({ error: 'Failed to get budget' });
  }
});

// Record budget activity
app.post('/api/budget/activity', (req, res) => {
  try {
    const { agent, task, cost } = req.body;
    const budgetPath = path.join(TEAM_MEMORY_DIR, 'budget-tracker.md');
    
    if (!fs.existsSync(budgetPath)) {
      return res.status(500).json({ error: 'Budget tracker file not found' });
    }
    
    let content = fs.readFileSync(budgetPath, 'utf8');
    
    // Get current spent amount
    const spentMatch = content.match(/\*\*Spent Today:\*\*\s*\$(.+)/);
    const currentSpent = spentMatch ? parseFloat(spentMatch[1]) : 0;
    const newSpent = currentSpent + cost;
    const newRemaining = 10 - newSpent;
    
    // Update summary
    content = content.replace(
      /\*\*Spent Today:\*\*\s*\$[\d.]+/,
      `**Spent Today:** $${newSpent.toFixed(2)}`
    );
    content = content.replace(
      /\*\*Remaining:\*\*\s*\$[\d.]+/,
      `**Remaining:** $${newRemaining.toFixed(2)}`
    );
    
    // Add activity entry
    const time = new Date().toISOString().replace('T', ' ').substring(11, 16);
    const newEntry = `| ${time} | ${agent} | ${task} | $${cost.toFixed(2)} | $${newSpent.toFixed(2)} |`;
    
    content = content.replace(
      /(## Today's Activity Log\n\n\| Time \| Agent \| Task \| Cost \| Running Total \|\n\|------\|-------\|------\|------\|---------------\|)/,
      `$1\n${newEntry}`
    );
    
    fs.writeFileSync(budgetPath, content);
    res.json({ success: true, newTotal: newSpent });
  } catch (err) {
    console.error('Failed to record activity:', err);
    res.status(500).json({ error: 'Failed to record activity' });
  }
});

// ===== AGENT MESSAGES API =====

// Get messages for an agent
app.get('/api/agents/:id/messages', (req, res) => {
  try {
    const messages = db.prepare(`
      SELECT * FROM team_messages 
      WHERE from_agent = ? OR to_agent = ?
      ORDER BY timestamp DESC
      LIMIT 50
    `).all(req.params.id, req.params.id);
    
    res.json(messages);
  } catch (err) {
    console.error('Failed to get messages:', err);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// Send message to agent
app.post('/api/agents/:id/messages', (req, res) => {
  try {
    const { from, content, priority } = req.body;
    const id = uuidv4();
    
    const stmt = db.prepare(`
      INSERT INTO team_messages (id, from_agent, to_agent, content, priority, timestamp)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    
    stmt.run(id, from, req.params.id, content, priority || 'normal');
    res.json({ id, success: true });
  } catch (err) {
    console.error('Failed to send message:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

module.exports = { parseWorkQueue };
