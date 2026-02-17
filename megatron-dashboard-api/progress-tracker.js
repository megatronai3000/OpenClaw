const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');

// Shared context directory
const SHARED_CONTEXT_DIR = path.join(process.env.HOME || '/Users/openclaw-megatron', '.openclaw', 'shared-context');
const PROGRESS_DIR = path.join(SHARED_CONTEXT_DIR, 'progress');

// Ensure progress directory exists
if (!fs.existsSync(PROGRESS_DIR)) {
  fs.mkdirSync(PROGRESS_DIR, { recursive: true });
}

class ProgressTracker extends EventEmitter {
  constructor() {
    super();
    this.activeWork = new Map(); // workId -> workData
    this.history = []; // completed work
    this.maxHistory = 100;
    
    // Load persisted work on startup
    this.loadPersistedWork();
  }

  loadPersistedWork() {
    try {
      if (!fs.existsSync(PROGRESS_DIR)) return;
      
      const files = fs.readdirSync(PROGRESS_DIR).filter(f => f.endsWith('.json'));
      for (const file of files) {
        const filePath = path.join(PROGRESS_DIR, file);
        try {
          const work = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          if (work.status === 'active') {
            this.activeWork.set(work.id, work);
          } else {
            this.history.push(work);
          }
        } catch (e) {
          console.error(`[ProgressTracker] Failed to load ${file}:`, e.message);
        }
      }
      
      // Sort history by completion date
      this.history.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
      if (this.history.length > this.maxHistory) {
        this.history = this.history.slice(0, this.maxHistory);
      }
      
      console.log(`[ProgressTracker] Loaded ${this.activeWork.size} active, ${this.history.length} historical`);
    } catch (err) {
      console.error('[ProgressTracker] Failed to load persisted work:', err);
    }
  }

  persistWork(work) {
    try {
      const filePath = path.join(PROGRESS_DIR, `${work.id}.json`);
      fs.writeFileSync(filePath, JSON.stringify(work, null, 2));
    } catch (err) {
      console.error('[ProgressTracker] Failed to persist work:', err);
    }
  }

  startWork(workId, agent, title, estimatedDuration, phases) {
    const work = {
      id: workId,
      agent,
      title,
      startedAt: Date.now(),
      estimatedDuration,
      phases: phases.map((p, i) => {
        const phaseName = typeof p === 'string' ? p : (p.name || 'Unknown');
        return {
          name: phaseName,
          index: i,
          status: i === 0 ? 'active' : 'pending',
          startedAt: i === 0 ? new Date().toISOString() : null,
          completedAt: null,
          details: null
        };
      }),
      currentPhase: 0,
      progress: 0,
      status: 'active',
      logs: [],
      updatedAt: Date.now()
    };
    
    this.activeWork.set(workId, work);
    this.persistWork(work);
    this.emit('workStarted', work);
    console.log(`[ProgressTracker] Started work: ${title} (${workId}) by ${agent}`);
    return work;
  }

  updatePhase(workId, phaseIndex, status, details = {}) {
    const work = this.activeWork.get(workId);
    if (!work) {
      console.warn(`[ProgressTracker] Work not found: ${workId}`);
      return;
    }
    
    const phase = work.phases[phaseIndex];
    if (!phase) {
      console.warn(`[ProgressTracker] Phase not found: ${phaseIndex}`);
      return;
    }
    
    phase.status = status;
    
    if (status === 'active' && !phase.startedAt) {
      phase.startedAt = new Date().toISOString();
      work.currentPhase = phaseIndex;
    }
    
    if (status === 'completed') {
      phase.completedAt = new Date().toISOString();
      // Auto-activate next phase
      if (phaseIndex + 1 < work.phases.length) {
        work.phases[phaseIndex + 1].status = 'active';
        work.phases[phaseIndex + 1].startedAt = new Date().toISOString();
        work.currentPhase = phaseIndex + 1;
      }
    }
    
    if (Object.keys(details).length > 0) {
      phase.details = { ...phase.details, ...details };
    }
    
    work.progress = Math.round(
      (work.phases.filter(p => p.status === 'completed').length / work.phases.length) * 100
    );
    work.updatedAt = Date.now();
    
    this.persistWork(work);
    this.emit('phaseUpdated', { workId, phaseIndex, status, work });
    return work;
  }

  logProgress(workId, message, level = 'info') {
    const work = this.activeWork.get(workId);
    if (!work) {
      console.warn(`[ProgressTracker] Work not found for logging: ${workId}`);
      return;
    }
    
    const log = { 
      timestamp: new Date().toISOString(),
      message, 
      level 
    };
    work.logs.push(log);
    
    // Keep only last 100 logs
    if (work.logs.length > 100) {
      work.logs = work.logs.slice(-100);
    }
    
    work.updatedAt = Date.now();
    this.persistWork(work);
    this.emit('logAdded', { workId, log });
    return log;
  }

  completeWork(workId, result) {
    const work = this.activeWork.get(workId);
    if (!work) {
      console.warn(`[ProgressTracker] Work not found for completion: ${workId}`);
      return;
    }
    
    work.status = 'completed';
    work.completedAt = Date.now();
    work.result = result;
    work.progress = 100;
    
    // Mark all phases as completed
    work.phases.forEach(phase => {
      if (phase.status !== 'completed') {
        phase.status = 'completed';
        phase.completedAt = new Date().toISOString();
      }
    });
    
    this.persistWork(work);
    this.history.unshift({ ...work });
    if (this.history.length > this.maxHistory) this.history.pop();
    
    this.emit('workCompleted', work);
    this.activeWork.delete(workId);
    console.log(`[ProgressTracker] Completed work: ${workId}`);
    return work;
  }

  failWork(workId, error) {
    const work = this.activeWork.get(workId);
    if (!work) {
      console.warn(`[ProgressTracker] Work not found for failure: ${workId}`);
      return;
    }
    
    work.status = 'failed';
    work.failedAt = Date.now();
    work.error = error;
    
    this.persistWork(work);
    this.history.unshift({ ...work });
    if (this.history.length > this.maxHistory) this.history.pop();
    
    this.emit('workFailed', { workId, error, work });
    this.activeWork.delete(workId);
    console.error(`[ProgressTracker] Failed work: ${workId} - ${error}`);
    return work;
  }

  getActiveWork() {
    return Array.from(this.activeWork.values());
  }

  getWorkHistory(limit = 20) {
    return this.history.slice(0, limit);
  }

  getWorkById(workId) {
    return this.activeWork.get(workId) || this.history.find(w => w.id === workId) || null;
  }
}

// Export singleton instance
module.exports = new ProgressTracker();
