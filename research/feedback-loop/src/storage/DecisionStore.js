import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../data');

/**
 * Persistent storage for decisions and outcomes
 */
export class DecisionStore {
  constructor() {
    this.decisionsDir = path.join(DATA_DIR, 'decisions');
    this.outcomesDir = path.join(DATA_DIR, 'outcomes');
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    
    await fs.mkdir(this.decisionsDir, { recursive: true });
    await fs.mkdir(this.outcomesDir, { recursive: true });
    this.initialized = true;
  }

  /**
   * Store a new decision
   */
  async saveDecision(decision) {
    await this.init();
    
    const id = this.generateId();
    const timestamp = new Date().toISOString();
    const record = {
      id,
      timestamp,
      ...decision,
      version: '1.0'
    };

    const filePath = path.join(this.decisionsDir, `${id}.json`);
    await fs.writeFile(filePath, JSON.stringify(record, null, 2));
    
    return id;
  }

  /**
   * Retrieve a decision by ID
   */
  async getDecision(id) {
    await this.init();
    
    try {
      const filePath = path.join(this.decisionsDir, `${id}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  /**
   * Save an outcome for a decision
   */
  async saveOutcome(decisionId, outcome) {
    await this.init();
    
    const timestamp = new Date().toISOString();
    const record = {
      decisionId,
      timestamp,
      ...outcome
    };

    const filePath = path.join(this.outcomesDir, `${decisionId}.json`);
    await fs.writeFile(filePath, JSON.stringify(record, null, 2));
    
    return record;
  }

  /**
   * Get outcome for a decision
   */
  async getOutcome(decisionId) {
    await this.init();
    
    try {
      const filePath = path.join(this.outcomesDir, `${decisionId}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  /**
   * Query decisions with filters
   */
  async queryDecisions(filters = {}) {
    await this.init();
    
    const files = await fs.readdir(this.decisionsDir);
    const decisions = [];
    
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      const data = await fs.readFile(path.join(this.decisionsDir, file), 'utf-8');
      const decision = JSON.parse(data);
      
      if (this.matchesFilters(decision, filters)) {
        decisions.push(decision);
      }
    }
    
    return decisions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * Get decisions with their outcomes
   */
  async getDecisionsWithOutcomes(filters = {}) {
    const decisions = await this.queryDecisions(filters);
    
    return Promise.all(
      decisions.map(async (d) => ({
        ...d,
        outcome: await this.getOutcome(d.id)
      }))
    );
  }

  /**
   * Get all decisions for an agent
   */
  async getAgentDecisions(agent, timeframe = null) {
    const filters = { agent };
    
    if (timeframe) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - parseInt(timeframe));
      filters.after = cutoff.toISOString();
    }
    
    return this.getDecisionsWithOutcomes(filters);
  }

  matchesFilters(decision, filters) {
    if (filters.agent && decision.agent !== filters.agent) return false;
    if (filters.task && decision.task !== filters.task) return false;
    if (filters.after && new Date(decision.timestamp) < new Date(filters.after)) return false;
    if (filters.before && new Date(decision.timestamp) > new Date(filters.before)) return false;
    if (filters.success !== undefined && decision.outcome) {
      if (decision.outcome.success !== filters.success) return false;
    }
    return true;
  }

  generateId() {
    return `dec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get storage stats
   */
  async getStats() {
    await this.init();
    
    const decisionFiles = await fs.readdir(this.decisionsDir);
    const outcomeFiles = await fs.readdir(this.outcomesDir);
    
    return {
      totalDecisions: decisionFiles.filter(f => f.endsWith('.json')).length,
      totalOutcomes: outcomeFiles.filter(f => f.endsWith('.json')).length,
      dataDirectory: DATA_DIR
    };
  }
}