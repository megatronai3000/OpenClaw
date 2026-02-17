import { AnalyticsStore } from '../storage/AnalyticsStore.js';

/**
 * Calculates accuracy metrics over time
 */
export class AccuracyCalculator {
  constructor() {
    this.store = new AnalyticsStore();
  }

  /**
   * Calculate accuracy metrics for an agent
   * @param {Array} decisions - Array of decisions with outcomes
   * @param {Object} options
   */
  calculate(decisions, options = {}) {
    const { 
      windowSize = 10, // Rolling window size
      buckets = ['1d', '7d', '30d', 'all'] // Time buckets
    } = options;

    const withOutcomes = decisions.filter(d => d.outcome);
    
    if (withOutcomes.length === 0) {
      return {
        overall: null,
        rolling: [],
        byBucket: {},
        byTask: {},
        confidence: null
      };
    }

    // Sort by timestamp
    const sorted = withOutcomes.sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    return {
      overall: this.calculateOverall(sorted),
      rolling: this.calculateRolling(sorted, windowSize),
      byBucket: this.calculateByBucket(sorted, buckets),
      byTask: this.calculateByTask(sorted),
      confidence: this.calculateConfidenceCorrelation(sorted),
      trend: this.calculateTrend(sorted)
    };
  }

  /**
   * Calculate overall accuracy
   */
  calculateOverall(decisions) {
    const total = decisions.length;
    const successful = decisions.filter(d => d.outcome.success).length;
    
    return {
      accuracy: successful / total,
      total,
      successful,
      failed: total - successful
    };
  }

  /**
   * Calculate rolling accuracy
   */
  calculateRolling(decisions, windowSize) {
    const rolling = [];
    
    for (let i = 0; i < decisions.length; i++) {
      const start = Math.max(0, i - windowSize + 1);
      const window = decisions.slice(start, i + 1);
      
      const successful = window.filter(d => d.outcome.success).length;
      
      rolling.push({
        index: i,
        timestamp: decisions[i].timestamp,
        windowSize: window.length,
        accuracy: successful / window.length,
        successful,
        total: window.length
      });
    }
    
    return rolling;
  }

  /**
   * Calculate accuracy by time bucket
   */
  calculateByBucket(decisions, buckets) {
    const now = new Date();
    const results = {};

    for (const bucket of buckets) {
      if (bucket === 'all') {
        results[bucket] = this.calculateOverall(decisions);
        continue;
      }

      const days = parseInt(bucket);
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - days);

      const bucketDecisions = decisions.filter(d => 
        new Date(d.timestamp) >= cutoff
      );

      results[bucket] = this.calculateOverall(bucketDecisions);
    }

    return results;
  }

  /**
   * Calculate accuracy by task type
   */
  calculateByTask(decisions) {
    const byTask = {};

    for (const d of decisions) {
      const task = d.task || 'unknown';
      
      if (!byTask[task]) {
        byTask[task] = { total: 0, successful: 0 };
      }
      
      byTask[task].total++;
      if (d.outcome.success) {
        byTask[task].successful++;
      }
    }

    // Calculate accuracy for each task
    for (const task of Object.keys(byTask)) {
      const stats = byTask[task];
      stats.accuracy = stats.successful / stats.total;
    }

    return byTask;
  }

  /**
   * Calculate correlation between confidence and accuracy
   */
  calculateConfidenceCorrelation(decisions) {
    const withConfidence = decisions.filter(d => 
      d.confidence !== null && d.confidence !== undefined
    );

    if (withConfidence.length < 5) {
      return { available: false, sampleSize: withConfidence.length };
    }

    // Group by confidence buckets
    const buckets = {
      '0.0-0.2': { total: 0, successful: 0 },
      '0.2-0.4': { total: 0, successful: 0 },
      '0.4-0.6': { total: 0, successful: 0 },
      '0.6-0.8': { total: 0, successful: 0 },
      '0.8-1.0': { total: 0, successful: 0 }
    };

    for (const d of withConfidence) {
      const c = d.confidence;
      let bucket;
      
      if (c < 0.2) bucket = '0.0-0.2';
      else if (c < 0.4) bucket = '0.2-0.4';
      else if (c < 0.6) bucket = '0.4-0.6';
      else if (c < 0.8) bucket = '0.6-0.8';
      else bucket = '0.8-1.0';

      buckets[bucket].total++;
      if (d.outcome.success) {
        buckets[bucket].successful++;
      }
    }

    // Calculate accuracy per bucket
    for (const bucket of Object.keys(buckets)) {
      const stats = buckets[bucket];
      stats.accuracy = stats.total > 0 ? stats.successful / stats.total : 0;
    }

    // Check calibration (does confidence match accuracy?)
    let totalError = 0;
    let weightedError = 0;
    
    for (const [range, stats] of Object.entries(buckets)) {
      if (stats.total === 0) continue;
      
      const expectedConf = parseFloat(range.split('-')[1]) - 0.1;
      const error = Math.abs(expectedConf - stats.accuracy);
      totalError += error;
      weightedError += error * stats.total;
    }

    const totalSamples = withConfidence.length;
    
    return {
      available: true,
      sampleSize: totalSamples,
      buckets,
      meanAbsoluteError: totalError / Object.keys(buckets).length,
      weightedMAE: weightedError / totalSamples,
      calibration: weightedError / totalSamples < 0.15 ? 'good' : 
                   weightedError / totalSamples < 0.3 ? 'fair' : 'poor'
    };
  }

  /**
   * Calculate trend direction and strength
   */
  calculateTrend(decisions) {
    if (decisions.length < 10) {
      return { direction: 'insufficient_data', strength: 0 };
    }

    // Split into two halves
    const mid = Math.floor(decisions.length / 2);
    const firstHalf = decisions.slice(0, mid);
    const secondHalf = decisions.slice(mid);

    const firstAcc = firstHalf.filter(d => d.outcome.success).length / firstHalf.length;
    const secondAcc = secondHalf.filter(d => d.outcome.success).length / secondHalf.length;

    const diff = secondAcc - firstAcc;
    
    let direction;
    if (diff > 0.1) direction = 'improving';
    else if (diff > 0.02) direction = 'slightly_improving';
    else if (diff < -0.1) direction = 'declining';
    else if (diff < -0.02) direction = 'slightly_declining';
    else direction = 'stable';

    return {
      direction,
      strength: Math.abs(diff),
      firstHalfAccuracy: firstAcc,
      secondHalfAccuracy: secondAcc,
      change: diff
    };
  }

  /**
   * Save metrics for an agent
   */
  async saveMetrics(agent, decisions, options = {}) {
    const metrics = this.calculate(decisions, options);
    await this.store.saveAccuracyMetrics(agent, metrics);
    return metrics;
  }
}