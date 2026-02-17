/**
 * Agent Communication Bus
 * 
 * Enables inter-agent messaging, relationship tracking, and team coordination.
 * Used by all agents in the self-organizing team.
 */

const Database = require('better-sqlite3');
const crypto = require('crypto');

// Simple UUID generator
function uuidv4() {
  return crypto.randomUUID();
}
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'team.db');

// Initialize database connection
function getDb() {
  return new Database(DB_PATH);
}

/**
 * Send a message to another agent or broadcast
 */
function sendMessage({
  from,
  to = null, // null = broadcast
  type = 'direct',
  subject = '',
  content,
  context = {},
  priority = 5,
  threadId = null,
  ttlMinutes = 60
}) {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60000).toISOString();
  
  const stmt = db.prepare(`
    INSERT INTO messages (id, from_agent, to_agent, message_type, subject, content, context_json, priority, created_at, expires_at, thread_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(id, from, to, type, subject, content, JSON.stringify(context), priority, now, expiresAt, threadId || id);
  
  // Log interaction if direct message
  if (to && type !== 'broadcast') {
    logInteraction(from, to, type, 0, `Message: ${subject || content.substring(0, 50)}`);
  }
  
  db.close();
  return { id, status: 'sent' };
}

/**
 * Get pending messages for an agent
 */
function getMessages(agentId, options = {}) {
  const db = getDb();
  const { limit = 50, markRead = true, type = null } = options;
  
  let sql = `
    SELECT * FROM messages 
    WHERE (to_agent = ? OR to_agent IS NULL)
    AND status = 'pending'
    AND datetime(expires_at) > datetime('now')
  `;
  
  if (type) {
    sql += ` AND message_type = '${type}'`;
  }
  
  sql += ` ORDER BY priority DESC, created_at ASC LIMIT ${limit}`;
  
  const messages = db.prepare(sql).all(agentId);
  
  // Mark as read
  if (markRead && messages.length > 0) {
    const ids = messages.map(m => m.id).join("','");
    db.prepare(`UPDATE messages SET status = 'read', read_at = ? WHERE id IN ('${ids}')`)
      .run(new Date().toISOString());
  }
  
  db.close();
  return messages.map(m => ({
    ...m,
    context: JSON.parse(m.context_json || '{}')
  }));
}

/**
 * Mark a message as acted upon
 */
function markActed(messageId) {
  const db = getDb();
  db.prepare(`UPDATE messages SET status = 'acted', acted_at = ? WHERE id = ?`)
    .run(new Date().toISOString(), messageId);
  db.close();
}

/**
 * Log an interaction between agents (for relationship tracking)
 */
function logInteraction(agentA, agentB, type, sentiment, description) {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();
  
  // Insert interaction
  db.prepare(`
    INSERT INTO interactions (id, agent_a, agent_b, interaction_type, sentiment, description, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, agentA, agentB, type, sentiment, description, now);
  
  // Update relationship scores
  updateRelationship(agentA, agentB, sentiment, type);
  
  db.close();
}

/**
 * Update relationship scores based on interaction
 */
function updateRelationship(agentA, agentB, sentiment, type) {
  const db = getDb();
  
  // Get current relationship
  let rel = db.prepare(`
    SELECT * FROM relationships WHERE agent_a = ? AND agent_b = ?
  `).get(agentA, agentB);
  
  if (!rel) {
    // Create new relationship
    db.prepare(`
      INSERT INTO relationships (agent_a, agent_b, last_interaction)
      VALUES (?, ?, ?)
    `).run(agentA, agentB, new Date().toISOString());
    rel = { trust_score: 50, collaboration_score: 50, communication_score: 50, conflict_score: 0, interaction_count: 0 };
  }
  
  // Calculate score changes
  const trustDelta = sentiment * 2;
  const collabDelta = type === 'collaboration' ? sentiment * 3 : sentiment;
  const commDelta = sentiment;
  const conflictDelta = sentiment < 0 ? Math.abs(sentiment) : -1;
  
  // Apply changes with bounds
  const newTrust = Math.max(0, Math.min(100, rel.trust_score + trustDelta));
  const newCollab = Math.max(0, Math.min(100, rel.collaboration_score + collabDelta));
  const newComm = Math.max(0, Math.min(100, rel.communication_score + commDelta));
  const newConflict = Math.max(0, Math.min(100, rel.conflict_score + conflictDelta));
  
  // Determine relationship status
  const overall = (newTrust + newCollab + newComm - newConflict) / 3;
  let status = 'professional';
  if (overall < 30) status = 'strained';
  else if (overall > 80) status = 'synergistic';
  else if (overall > 60) status = 'collaborative';
  
  // Update
  db.prepare(`
    UPDATE relationships 
    SET trust_score = ?, collaboration_score = ?, communication_score = ?, 
        conflict_score = ?, interaction_count = interaction_count + 1,
        last_interaction = ?, relationship_status = ?
    WHERE agent_a = ? AND agent_b = ?
  `).run(newTrust, newCollab, newComm, newConflict, new Date().toISOString(), status, agentA, agentB);
  
  db.close();
}

/**
 * Get relationship status between two agents
 */
function getRelationship(agentA, agentB) {
  const db = getDb();
  const rel = db.prepare(`
    SELECT * FROM relationships WHERE agent_a = ? AND agent_b = ?
  `).get(agentA, agentB);
  db.close();
  return rel;
}

/**
 * Get all relationships for an agent
 */
function getAllRelationships(agentId) {
  const db = getDb();
  const rels = db.prepare(`
    SELECT * FROM relationships 
    WHERE agent_a = ? OR agent_b = ?
    ORDER BY overall_score DESC
  `).all(agentId, agentId);
  db.close();
  return rels;
}

/**
 * Get agent info from registry
 */
function getAgentInfo(agentId) {
  const db = getDb();
  const agent = db.prepare(`SELECT * FROM agent_registry WHERE id = ?`).get(agentId);
  db.close();
  return agent;
}

/**
 * Update agent last active timestamp
 */
function updateAgentActivity(agentId) {
  const db = getDb();
  db.prepare(`UPDATE agent_registry SET last_active = ? WHERE id = ?`)
    .run(new Date().toISOString(), agentId);
  db.close();
}

/**
 * Register a new agent
 */
function registerAgent({ id, name, role, emoji, autonomy, workspace }) {
  const db = getDb();
  const exists = db.prepare(`SELECT id FROM agent_registry WHERE id = ?`).get(id);
  
  if (!exists) {
    db.prepare(`
      INSERT INTO agent_registry (id, name, role, emoji, autonomy_level, workspace_path, status)
      VALUES (?, ?, ?, ?, ?, ?, 'active')
    `).run(id, name, role, emoji, autonomy, workspace);
  }
  
  db.close();
}

/**
 * Track agent cost
 */
function trackCost(agentId, cost) {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];
  
  const exists = db.prepare(`SELECT * FROM agent_costs WHERE agent_id = ? AND date = ?`).get(agentId, today);
  
  if (exists) {
    db.prepare(`
      UPDATE agent_costs SET session_count = session_count + 1, estimated_cost = estimated_cost + ?
      WHERE agent_id = ? AND date = ?
    `).run(cost, agentId, today);
  } else {
    db.prepare(`
      INSERT INTO agent_costs (agent_id, date, session_count, estimated_cost)
      VALUES (?, ?, 1, ?)
    `).run(agentId, today, cost);
  }
  
  db.close();
}

/**
 * Get daily cost summary
 */
function getDailyCost(agentId = null) {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];
  
  let sql = `SELECT * FROM agent_costs WHERE date = ?`;
  let params = [today];
  
  if (agentId) {
    sql += ` AND agent_id = ?`;
    params.push(agentId);
  }
  
  const costs = db.prepare(sql).all(...params);
  db.close();
  return costs;
}

/**
 * Get team context
 */
function getTeamContext(key) {
  const db = getDb();
  const ctx = db.prepare(`SELECT value FROM team_context WHERE key = ?`).get(key);
  db.close();
  return ctx ? ctx.value : null;
}

/**
 * Set team context
 */
function setTeamContext(key, value, updatedBy) {
  const db = getDb();
  db.prepare(`
    INSERT INTO team_context (key, value, updated_by, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = ?, updated_by = ?, updated_at = ?
  `).run(key, value, updatedBy, new Date().toISOString(), value, updatedBy, new Date().toISOString());
  db.close();
}

module.exports = {
  // Messaging
  sendMessage,
  getMessages,
  markActed,
  
  // Relationships
  logInteraction,
  getRelationship,
  getAllRelationships,
  
  // Agent registry
  getAgentInfo,
  updateAgentActivity,
  registerAgent,
  
  // Cost tracking
  trackCost,
  getDailyCost,
  
  // Team context
  getTeamContext,
  setTeamContext
};