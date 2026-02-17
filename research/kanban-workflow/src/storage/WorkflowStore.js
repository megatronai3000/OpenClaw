/**
 * WorkflowStore - Storage for workflow definitions
 */
export class WorkflowStore {
  constructor() {
    this.workflows = new Map();
  }

  /**
   * Save a workflow
   * @param {Object} workflow - Workflow object
   */
  async save(workflow) {
    this.workflows.set(workflow.id, workflow);
    
    // Also index by project
    if (workflow.projectId) {
      const projectKey = `project:${workflow.projectId}`;
      const existing = this.workflows.get(projectKey) || [];
      if (!existing.includes(workflow.id)) {
        existing.push(workflow.id);
        this.workflows.set(projectKey, existing);
      }
    }
    
    return workflow;
  }

  /**
   * Get workflow by ID
   * @param {string} id - Workflow ID
   */
  async get(id) {
    return this.workflows.get(id) || null;
  }

  /**
   * Get workflow by project ID
   * @param {string} projectId - Project ID
   */
  async getByProject(projectId) {
    const projectKey = `project:${projectId}`;
    const workflowIds = this.workflows.get(projectKey) || [];
    
    // Return the most recent workflow for the project
    if (workflowIds.length > 0) {
      const workflows = workflowIds
        .map(id => this.workflows.get(id))
        .filter(Boolean)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      return workflows[0] || null;
    }
    
    return null;
  }

  /**
   * Update a workflow
   * @param {string} id - Workflow ID
   * @param {Object} updates - Update data
   */
  async update(id, updates) {
    const existing = this.workflows.get(id);
    if (!existing) return null;
    
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    this.workflows.set(id, updated);
    return updated;
  }

  /**
   * Delete a workflow
   * @param {string} id - Workflow ID
   */
  async delete(id) {
    const workflow = this.workflows.get(id);
    if (!workflow) return false;
    
    this.workflows.delete(id);
    
    // Remove from project index
    if (workflow.projectId) {
      const projectKey = `project:${workflow.projectId}`;
      const existing = this.workflows.get(projectKey) || [];
      const filtered = existing.filter(wid => wid !== id);
      this.workflows.set(projectKey, filtered);
    }
    
    return true;
  }

  /**
   * Query workflows
   * @param {Object} criteria - Query criteria
   */
  async query(criteria = {}) {
    let results = Array.from(this.workflows.values())
      .filter(w => w.id && !w.id.startsWith('project:')); // Exclude index entries
    
    if (criteria.projectId) {
      results = results.filter(w => w.projectId === criteria.projectId);
    }
    
    if (criteria.name) {
      results = results.filter(w => 
        w.name?.toLowerCase().includes(criteria.name.toLowerCase())
      );
    }
    
    return results;
  }

  /**
   * Get all workflows
   */
  async getAll() {
    return Array.from(this.workflows.values())
      .filter(w => w.id && !w.id.startsWith('project:'));
  }

  /**
   * Get workflow count
   */
  async getCount() {
    return Array.from(this.workflows.keys())
      .filter(id => !id.startsWith('project:')).length;
  }
}

export default WorkflowStore;