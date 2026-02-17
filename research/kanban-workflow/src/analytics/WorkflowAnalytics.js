/**
 * WorkflowAnalytics - Tracks and analyzes workflow performance
 * 
 * Analytics provided:
 * - Time in each stage (average, median, percentiles)
 * - Stage transition frequency
 * - Bottleneck identification
 * - Cycle time analysis
 * - Throughput metrics
 * - WIP (work in progress) trends
 */
export class WorkflowAnalytics {
  constructor() {
    this.metrics = new Map();
  }

  /**
   * Record card creation
   * @param {Object} card - Card object
   */
  async recordCardCreated(card) {
    const key = `created:${card.projectId}`;
    const existing = this.metrics.get(key) || { count: 0, cards: [] };
    
    existing.count++;
    existing.cards.push({
      cardId: card.id,
      createdAt: card.createdAt,
      stage: card.stage
    });
    
    // Keep only last 1000 entries
    if (existing.cards.length > 1000) {
      existing.cards = existing.cards.slice(-1000);
    }
    
    this.metrics.set(key, existing);
  }

  /**
   * Record stage transition
   * @param {Object} transition - Transition context
   */
  async recordTransition(transition) {
    const { card, fromStage, toStage, timestamp } = transition;
    
    // Record the transition
    const transitionKey = `transition:${card.projectId}:${fromStage.id}:${toStage.id}`;
    const existingTransitions = this.metrics.get(transitionKey) || { count: 0, transitions: [] };
    
    existingTransitions.count++;
    existingTransitions.transitions.push({
      cardId: card.id,
      from: fromStage.id,
      to: toStage.id,
      timestamp,
      duration: this.calculateStageDuration(card, fromStage.id)
    });
    
    // Keep only last 500 transitions per path
    if (existingTransitions.transitions.length > 500) {
      existingTransitions.transitions = existingTransitions.transitions.slice(-500);
    }
    
    this.metrics.set(transitionKey, existingTransitions);
    
    // Update stage metrics
    await this.updateStageMetrics(card.projectId, fromStage.id, card);
  }

  /**
   * Update stage-level metrics
   * @param {string} projectId - Project ID
   * @param {string} stageId - Stage ID
   * @param {Object} card - Card object
   */
  async updateStageMetrics(projectId, stageId, card) {
    const stageKey = `stage:${projectId}:${stageId}`;
    const existing = this.metrics.get(stageKey) || {
      entries: [],
      exits: [],
      durations: []
    };
    
    // Track entry/exit
    const stageHistory = card.stageHistory.filter(h => h.stage === stageId);
    
    for (const entry of stageHistory) {
      if (entry.duration) {
        existing.durations.push(entry.duration);
      }
    }
    
    // Keep only last 1000 durations
    if (existing.durations.length > 1000) {
      existing.durations = existing.durations.slice(-1000);
    }
    
    this.metrics.set(stageKey, existing);
  }

  /**
   * Calculate duration spent in a stage
   * @param {Object} card - Card object
   * @param {string} stageId - Stage ID
   */
  calculateStageDuration(card, stageId) {
    const entries = card.stageHistory.filter(h => h.stage === stageId);
    if (entries.length === 0) return null;
    
    const entry = entries[entries.length - 1];
    return entry.duration || null;
  }

  /**
   * Generate full analytics report
   * @param {string} projectId - Project ID
   * @param {Object} options - Report options
   */
  async generateReport(projectId, options = {}) {
    const { 
      timeframe = '30d',
      includeRaw = false,
      includeRecommendations = true 
    } = options;

    const timeframeMs = this.parseTimeframe(timeframe);
    const cutoffDate = new Date(Date.now() - timeframeMs);

    // Gather all metrics
    const stageMetrics = await this.getStageMetrics(projectId, cutoffDate);
    const transitionMetrics = await this.getTransitionMetrics(projectId, cutoffDate);
    const flowMetrics = await this.getFlowMetrics(projectId, cutoffDate);
    const wipMetrics = await this.getWipMetrics(projectId);

    const report = {
      projectId,
      timeframe,
      generatedAt: new Date().toISOString(),
      summary: this.generateSummary(stageMetrics, flowMetrics),
      stages: stageMetrics,
      transitions: transitionMetrics,
      flow: flowMetrics,
      wip: wipMetrics,
      bottlenecks: this.identifyBottlenecks(stageMetrics),
      trends: await this.calculateTrends(projectId, timeframe)
    };

    if (includeRecommendations) {
      report.recommendations = this.generateRecommendations(report);
    }

    if (includeRaw) {
      report.raw = {
        metrics: Object.fromEntries(this.metrics),
        cutoffDate: cutoffDate.toISOString()
      };
    }

    return report;
  }

  /**
   * Get stage-specific metrics
   * @param {string} projectId - Project ID
   * @param {Date} cutoffDate - Cutoff date for metrics
   */
  async getStageMetrics(projectId, cutoffDate) {
    const stageMetrics = {};
    
    // Find all stage keys for this project
    for (const [key, data] of this.metrics) {
      if (!key.startsWith(`stage:${projectId}:`)) continue;
      
      const stageId = key.split(':')[2];
      const durations = data.durations.filter((_, i) => {
        // Filter by recency if we had timestamps (simplified here)
        return true;
      });
      
      if (durations.length === 0) continue;
      
      stageMetrics[stageId] = {
        avgTime: this.calculateAverage(durations),
        medianTime: this.calculateMedian(durations),
        p75Time: this.calculatePercentile(durations, 75),
        p90Time: this.calculatePercentile(durations, 90),
        p95Time: this.calculatePercentile(durations, 95),
        minTime: Math.min(...durations),
        maxTime: Math.max(...durations),
        sampleSize: durations.length,
        formatted: {
          avg: this.formatDuration(this.calculateAverage(durations)),
          median: this.formatDuration(this.calculateMedian(durations)),
          p75: this.formatDuration(this.calculatePercentile(durations, 75)),
          p90: this.formatDuration(this.calculatePercentile(durations, 90)),
          p95: this.formatDuration(this.calculatePercentile(durations, 95))
        }
      };
    }
    
    return stageMetrics;
  }

  /**
   * Get transition metrics
   * @param {string} projectId - Project ID
   * @param {Date} cutoffDate - Cutoff date
   */
  async getTransitionMetrics(projectId, cutoffDate) {
    const transitions = {};
    
    for (const [key, data] of this.metrics) {
      if (!key.startsWith(`transition:${projectId}:`)) continue;
      
      const parts = key.split(':');
      const fromStage = parts[2];
      const toStage = parts[3];
      
      const path = `${fromStage} → ${toStage}`;
      const recentTransitions = data.transitions.filter(t => 
        new Date(t.timestamp) >= cutoffDate
      );
      
      if (recentTransitions.length === 0) continue;
      
      transitions[path] = {
        count: recentTransitions.length,
        avgDuration: this.calculateAverage(
          recentTransitions.map(t => t.duration).filter(d => d !== null)
        ),
        frequencies: this.calculateFrequencyDistribution(
          recentTransitions.map(t => t.duration).filter(d => d !== null)
        )
      };
    }
    
    return transitions;
  }

  /**
   * Get flow metrics (cycle time, lead time)
   * @param {string} projectId - Project ID
   * @param {Date} cutoffDate - Cutoff date
   */
  async getFlowMetrics(projectId, cutoffDate) {
    const created = this.metrics.get(`created:${projectId}`);
    if (!created) {
      return { cycleTime: null, leadTime: null, throughput: 0 };
    }

    const recentCards = created.cards.filter(c => 
      new Date(c.createdAt) >= cutoffDate
    );

    // Calculate throughput (cards completed per day)
    const completedCards = recentCards.filter(c => 
      c.stage === 'done' || c.stage === 'completed'
    );
    
    const days = (Date.now() - cutoffDate.getTime()) / (1000 * 60 * 60 * 24);
    const throughput = days > 0 ? completedCards.length / days : 0;

    return {
      throughput: {
        perDay: parseFloat(throughput.toFixed(2)),
        perWeek: parseFloat((throughput * 7).toFixed(2)),
        totalCompleted: completedCards.length
      },
      created: recentCards.length,
      completionRate: recentCards.length > 0 
        ? completedCards.length / recentCards.length 
        : 0
    };
  }

  /**
   * Get WIP (Work In Progress) metrics
   * @param {string} projectId - Project ID
   */
  async getWipMetrics(projectId) {
    // This would typically query the card store
    // For now, return a placeholder structure
    return {
      total: 0, // Would be actual count from card store
      byStage: {},
      trends: []
    };
  }

  /**
   * Identify bottlenecks in the workflow
   * @param {Object} stageMetrics - Stage metrics object
   */
  identifyBottlenecks(stageMetrics) {
    const stages = Object.entries(stageMetrics);
    if (stages.length === 0) return [];

    // Find average stage times
    const avgTimes = stages.map(([id, metrics]) => ({
      stageId: id,
      avgTime: metrics.avgTime,
      formatted: metrics.formatted.avg
    }));

    // Sort by time (descending)
    avgTimes.sort((a, b) => b.avgTime - a.avgTime);

    // Top 3 longest stages are potential bottlenecks
    const bottlenecks = avgTimes.slice(0, 3).map((b, index) => ({
      rank: index + 1,
      stageId: b.stageId,
      avgTime: b.avgTime,
      formatted: b.formatted,
      severity: index === 0 ? 'high' : index === 1 ? 'medium' : 'low'
    }));

    return bottlenecks;
  }

  /**
   * Calculate trends over time
   * @param {string} projectId - Project ID
   * @param {string} timeframe - Timeframe string
   */
  async calculateTrends(projectId, timeframe) {
    // Simplified trend calculation
    // In production, this would compare current period vs previous period
    return {
      stageTimeTrend: 'stable',
      throughputTrend: 'stable',
      wipTrend: 'stable'
    };
  }

  /**
   * Generate summary statistics
   * @param {Object} stageMetrics - Stage metrics
   * @param {Object} flowMetrics - Flow metrics
   */
  generateSummary(stageMetrics, flowMetrics) {
    const stageCount = Object.keys(stageMetrics).length;
    const totalAvgTime = Object.values(stageMetrics)
      .reduce((sum, m) => sum + m.avgTime, 0);

    return {
      totalStages: stageCount,
      avgCycleTime: this.formatDuration(totalAvgTime),
      throughput: flowMetrics.throughput,
      healthScore: this.calculateHealthScore(stageMetrics, flowMetrics)
    };
  }

  /**
   * Calculate overall workflow health score
   * @param {Object} stageMetrics - Stage metrics
   * @param {Object} flowMetrics - Flow metrics
   */
  calculateHealthScore(stageMetrics, flowMetrics) {
    // Simple health score calculation
    let score = 100;

    // Deduct for bottlenecks
    const bottlenecks = this.identifyBottlenecks(stageMetrics);
    score -= bottlenecks.length * 10;

    // Deduct for low throughput
    if (flowMetrics.throughput.perDay < 1) {
      score -= 20;
    }

    // Clamp to 0-100
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate recommendations based on analytics
   * @param {Object} report - Full analytics report
   */
  generateRecommendations(report) {
    const recommendations = [];

    // Bottleneck recommendations
    for (const bottleneck of report.bottlenecks) {
      if (bottleneck.severity === 'high') {
        recommendations.push({
          type: 'bottleneck',
          priority: 'high',
          stage: bottleneck.stageId,
          message: `${bottleneck.stageId} is a bottleneck (${bottleneck.formatted} avg). Consider adding resources or breaking down work.`,
          action: 'Review stage capacity and WIP limits'
        });
      }
    }

    // Throughput recommendations
    if (report.flow.throughput.perDay < 1) {
      recommendations.push({
        type: 'throughput',
        priority: 'medium',
        message: 'Low throughput detected. Review work in progress limits.',
        action: 'Implement or lower WIP limits'
      });
    }

    // WIP recommendations
    if (report.wip.total > 10) {
      recommendations.push({
        type: 'wip',
        priority: 'medium',
        message: `High WIP (${report.wip.total} cards) may be causing delays.`,
        action: 'Focus on completing existing work before starting new items'
      });
    }

    return recommendations;
  }

  // ============== UTILITY METHODS ==============

  /**
   * Parse timeframe string to milliseconds
   * @param {string} timeframe - Timeframe (e.g., '7d', '30d')
   */
  parseTimeframe(timeframe) {
    const match = timeframe.match(/^(\d+)([dwm])$/);
    if (!match) return 30 * 24 * 60 * 60 * 1000; // Default 30 days

    const value = parseInt(match[1]);
    const unit = match[2];

    const multipliers = {
      d: 24 * 60 * 60 * 1000,
      w: 7 * 24 * 60 * 60 * 1000,
      m: 30 * 24 * 60 * 60 * 1000
    };

    return value * (multipliers[unit] || multipliers.d);
  }

  /**
   * Calculate average of array
   * @param {Array} values - Number array
   */
  calculateAverage(values) {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  /**
   * Calculate median of array
   * @param {Array} values - Number array
   */
  calculateMedian(values) {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 
      ? sorted[mid] 
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Calculate percentile
   * @param {Array} values - Number array
   * @param {number} percentile - Percentile (0-100)
   */
  calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Calculate frequency distribution
   * @param {Array} values - Number array
   */
  calculateFrequencyDistribution(values) {
    if (values.length === 0) return {};

    // Create buckets
    const min = Math.min(...values);
    const max = Math.max(...values);
    const bucketSize = (max - min) / 5 || 1;

    const buckets = {};
    for (let i = 0; i < 5; i++) {
      const bucketMin = min + (i * bucketSize);
      const bucketMax = bucketMin + bucketSize;
      const count = values.filter(v => v >= bucketMin && v < bucketMax).length;
      buckets[`${this.formatDuration(bucketMin)}-${this.formatDuration(bucketMax)}`] = count;
    }

    return buckets;
  }

  /**
   * Format duration for display
   * @param {number} ms - Duration in milliseconds
   */
  formatDuration(ms) {
    if (!ms || ms === 0) return '0s';
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
}

export default WorkflowAnalytics;