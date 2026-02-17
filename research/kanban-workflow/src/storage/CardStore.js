/**
 * CardStore - Storage for Kanban cards
 */
export class CardStore {
  constructor() {
    this.cards = new Map();
    this.indexes = {
      byProject: new Map(),
      byStage: new Map(),
      byAssignee: new Map()
    };
  }

  /**
   * Save a card
   * @param {Object} card - Card object
   */
  async save(card) {
    this.cards.set(card.id, card);
    this.updateIndexes(card);
    return card;
  }

  /**
   * Get card by ID
   * @param {string} id - Card ID
   */
  async get(id) {
    return this.cards.get(id) || null;
  }

  /**
   * Update a card
   * @param {string} id - Card ID
   * @param {Object} updates - Update data
   */
  async update(id, updates) {
    const existing = this.cards.get(id);
    if (!existing) return null;
    
    // Remove from old indexes if stage/project/assignee changed
    this.removeFromIndexes(existing);
    
    const updated = {
      ...existing,
      ...updates,
      id: existing.id, // Preserve ID
      updatedAt: new Date().toISOString()
    };
    
    this.cards.set(id, updated);
    this.updateIndexes(updated);
    
    return updated;
  }

  /**
   * Delete a card
   * @param {string} id - Card ID
   */
  async delete(id) {
    const card = this.cards.get(id);
    if (!card) return false;
    
    this.removeFromIndexes(card);
    this.cards.delete(id);
    
    return true;
  }

  /**
   * Query cards
   * @param {Object} criteria - Query criteria
   */
  async query(criteria = {}) {
    let results = Array.from(this.cards.values());
    
    if (criteria.projectId) {
      results = results.filter(c => c.projectId === criteria.projectId);
    }
    
    if (criteria.stage) {
      const stages = Array.isArray(criteria.stage) ? criteria.stage : [criteria.stage];
      results = results.filter(c => stages.includes(c.stage));
    }
    
    if (criteria.assignee) {
      results = results.filter(c => c.assignee === criteria.assignee);
    }
    
    if (criteria.priority) {
      const priorities = Array.isArray(criteria.priority) ? criteria.priority : [criteria.priority];
      results = results.filter(c => priorities.includes(c.priority));
    }
    
    if (criteria.tags && criteria.tags.length > 0) {
      results = results.filter(c => 
        criteria.tags.some(tag => c.tags?.includes(tag))
      );
    }
    
    if (criteria.workflowId) {
      results = results.filter(c => c.workflowId === criteria.workflowId);
    }
    
    // Sort by updatedAt desc
    results.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    // Apply limit
    if (criteria.limit) {
      results = results.slice(0, criteria.limit);
    }
    
    return results;
  }

  /**
   * Count cards by stage
   * @param {string} projectId - Project ID
   * @param {string} stageId - Stage ID
   */
  async countByStage(projectId, stageId) {
    const cards = await this.query({ projectId, stage: stageId });
    return cards.length;
  }

  /**
   * Get cards by project
   * @param {string} projectId - Project ID
   */
  async getByProject(projectId) {
    return this.query({ projectId });
  }

  /**
   * Get cards by stage
   * @param {string} stageId - Stage ID
   */
  async getByStage(stageId) {
    return this.query({ stage: stageId });
  }

  /**
   * Get all cards
   */
  async getAll() {
    return Array.from(this.cards.values());
  }

  /**
   * Get card count
   */
  async getCount() {
    return this.cards.size;
  }

  /**
   * Update indexes for a card
   * @param {Object} card - Card object
   */
  updateIndexes(card) {
    // Project index
    if (card.projectId) {
      const projectCards = this.indexes.byProject.get(card.projectId) || new Set();
      projectCards.add(card.id);
      this.indexes.byProject.set(card.projectId, projectCards);
    }
    
    // Stage index
    if (card.stage) {
      const stageKey = `${card.projectId}:${card.stage}`;
      const stageCards = this.indexes.byStage.get(stageKey) || new Set();
      stageCards.add(card.id);
      this.indexes.byStage.set(stageKey, stageCards);
    }
    
    // Assignee index
    if (card.assignee) {
      const assigneeCards = this.indexes.byAssignee.get(card.assignee) || new Set();
      assigneeCards.add(card.id);
      this.indexes.byAssignee.set(card.assignee, assigneeCards);
    }
  }

  /**
   * Remove card from indexes
   * @param {Object} card - Card object
   */
  removeFromIndexes(card) {
    // Remove from project index
    if (card.projectId) {
      const projectCards = this.indexes.byProject.get(card.projectId);
      if (projectCards) {
        projectCards.delete(card.id);
      }
    }
    
    // Remove from stage index
    if (card.stage) {
      const stageKey = `${card.projectId}:${card.stage}`;
      const stageCards = this.indexes.byStage.get(stageKey);
      if (stageCards) {
        stageCards.delete(card.id);
      }
    }
    
    // Remove from assignee index
    if (card.assignee) {
      const assigneeCards = this.indexes.byAssignee.get(card.assignee);
      if (assigneeCards) {
        assigneeCards.delete(card.id);
      }
    }
  }
}

export default CardStore;