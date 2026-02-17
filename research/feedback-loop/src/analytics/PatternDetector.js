import { AnalyticsStore } from '../storage/AnalyticsStore.js';

/**
 * Detects patterns in successful and failed decisions
 * Uses statistical analysis and heuristics
 */
export class PatternDetector {
  constructor() {
    this.store = new AnalyticsStore();
  }

  /**
   * Detect patterns in decision data
   * @param {Array} decisions - Array of decisions with outcomes
   */
  detect(decisions) {
    const withOutcomes = decisions.filter(d => d.outcome);
    
    if (withOutcomes.length < 10) {
      return {
        sufficientData: false,
        sampleSize: withOutcomes.length,
        message: 'Need at least 10 decisions with outcomes for pattern detection'
      };
    }

    const successful = withOutcomes.filter(d => d.outcome.success);
    const failed = withOutcomes.filter(d => !d.outcome.success);

    return {
      sufficientData: true,
      sampleSize: withOutcomes.length,
      successRate: successful.length / withOutcomes.length,
      contextPatterns: this.detectContextPatterns(successful, failed),
      decisionPatterns: this.detectDecisionPatterns(successful, failed),
      temporalPatterns: this.detectTemporalPatterns(withOutcomes),
      confidencePatterns: this.detectConfidencePatterns(withOutcomes),
      tagPatterns: this.detectTagPatterns(successful, failed),
      commonFactors: this.identifyCommonFactors(successful, failed)
    };
  }

  /**
   * Detect patterns in decision context
   */
  detectContextPatterns(successful, failed) {
    const patterns = {
      successIndicators: [],
      failureIndicators: [],
      commonContexts: {}
    };

    // Analyze task types
    const taskSuccess = this.groupByTask(successful);
    const taskFailure = this.groupByTask(failed);

    for (const [task, count] of Object.entries(taskSuccess)) {
      const failCount = taskFailure[task] || 0;
      const total = count + failCount;
      const rate = count / total;

      if (total >= 3) {
        if (rate > 0.8) {
          patterns.successIndicators.push({
            type: 'task',
            value: task,
            confidence: rate,
            sampleSize: total
          });
        } else if (rate < 0.3) {
          patterns.failureIndicators.push({
            type: 'task',
            value: task,
            failureRate: 1 - rate,
            sampleSize: total
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Detect patterns in decision characteristics
   */
  detectDecisionPatterns(successful, failed) {
    const patterns = {
      successfulCharacteristics: {},
      failedCharacteristics: {}
    };

    // Analyze confidence distribution
    const successConf = successful
      .map(d => d.confidence)
      .filter(c => c !== null);
    const failConf = failed
      .map(d => d.confidence)
      .filter(c => c !== null);

    if (successConf.length > 0) {
      patterns.successfulCharacteristics.avgConfidence = 
        successConf.reduce((a, b) => a + b, 0) / successConf.length;
    }

    if (failConf.length > 0) {
      patterns.failedCharacteristics.avgConfidence = 
        failConf.reduce((a, b) => a + b, 0) / failConf.length;
    }

    // Analyze alternatives
    const successWithAlts = successful.filter(d => d.alternatives?.length > 0).length;
    const failWithAlts = failed.filter(d => d.alternatives?.length > 0).length;

    patterns.successfulCharacteristics.consideredAlternatives = 
      successWithAlts / successful.length;
    patterns.failedCharacteristics.consideredAlternatives = 
      failWithAlts / failed.length;

    return patterns;
  }

  /**
   * Detect temporal patterns
   */
  detectTemporalPatterns(decisions) {
    const patterns = {
      timeClusters: [],
      seasonalPatterns: false
    };

    // Group by hour and analyze
    const hourlySuccess = {};
    for (const d of decisions) {
      const hour = new Date(d.timestamp).getHours();
      if (!hourlySuccess[hour]) hourlySuccess[hour] = { total: 0, success: 0 };
      hourlySuccess[hour].total++;
      if (d.outcome.success) hourlySuccess[hour].success++;
    }

    // Find hours with notably different success rates
    const overallRate = decisions.filter(d => d.outcome.success).length / decisions.length;
    
    for (const [hour, stats] of Object.entries(hourlySuccess)) {
      if (stats.total >= 3) {
        const rate = stats.success / stats.total;
        if (Math.abs(rate - overallRate) > 0.2) {
          patterns.timeClusters.push({
            hour: parseInt(hour),
            successRate: rate,
            deviation: rate - overallRate,
            sampleSize: stats.total
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Detect patterns related to confidence
   */
  detectConfidencePatterns(decisions) {
    const withConf = decisions.filter(d => d.confidence !== null);
    
    if (withConf.length < 10) {
      return { available: false, sampleSize: withConf.length };
    }

    // Analyze by confidence buckets
    const buckets = {
      low: { min: 0, max: 0.4, decisions: [] },
      medium: { min: 0.4, max: 0.7, decisions: [] },
      high: { min: 0.7, max: 1.0, decisions: [] }
    };

    for (const d of withConf) {
      const c = d.confidence;
      if (c < 0.4) buckets.low.decisions.push(d);
      else if (c < 0.7) buckets.medium.decisions.push(d);
      else buckets.high.decisions.push(d);
    }

    const patterns = { available: true };

    for (const [level, bucket] of Object.entries(buckets)) {
      if (bucket.decisions.length > 0) {
        const successCount = bucket.decisions.filter(d => d.outcome.success).length;
        patterns[level] = {
          sampleSize: bucket.decisions.length,
          successRate: successCount / bucket.decisions.length,
          confidenceRange: [bucket.min, bucket.max]
        };
      }
    }

    // Detect overconfidence/underconfidence
    if (patterns.high && patterns.low) {
      patterns.overconfidenceRisk = 
        patterns.high.successRate < patterns.medium?.successRate;
      patterns.underconfidenceIssue = 
        patterns.low.successRate > patterns.medium?.successRate;
    }

    return patterns;
  }

  /**
   * Detect patterns in outcome tags
   */
  detectTagPatterns(successful, failed) {
    const successTags = this.countTags(successful);
    const failTags = this.countTags(failed);

    const successIndicators = [];
    const failureIndicators = [];

    // Find tags that appear more in successful outcomes
    for (const [tag, count] of Object.entries(successTags)) {
      const failCount = failTags[tag] || 0;
      const total = count + failCount;
      
      if (total >= 3) {
        const rate = count / total;
        if (rate > 0.75) {
          successIndicators.push({ tag, rate, count });
        }
      }
    }

    // Find tags that appear more in failed outcomes
    for (const [tag, count] of Object.entries(failTags)) {
      const successCount = successTags[tag] || 0;
      const total = count + successCount;
      
      if (total >= 3) {
        const rate = count / total;
        if (rate > 0.75) {
          failureIndicators.push({ tag, rate, count });
        }
      }
    }

    return {
      successIndicators: successIndicators.slice(0, 5),
      failureIndicators: failureIndicators.slice(0, 5)
    };
  }

  /**
   * Identify common factors in success/failure
   */
  identifyCommonFactors(successful, failed) {
    const factors = [];

    // Check if confidence correlates with success
    const confPattern = this.detectConfidencePatterns([...successful, ...failed]);
    if (confPattern.available) {
      if (confPattern.high?.successRate > confPattern.low?.successRate) {
        factors.push({
          type: 'confidence',
          finding: 'Higher confidence correlates with success',
          strength: confPattern.high.successRate - confPattern.low.successRate
        });
      }
    }

    // Check if considering alternatives helps
    const successWithAlts = successful.filter(d => d.alternatives?.length > 0).length / successful.length;
    const failWithAlts = failed.filter(d => d.alternatives?.length > 0).length / failed.length;
    
    if (successWithAlts > failWithAlts + 0.1) {
      factors.push({
        type: 'deliberation',
        finding: 'Considering alternatives correlates with success',
        strength: successWithAlts - failWithAlts
      });
    }

    return factors;
  }

  /**
   * Helper: Group decisions by task
   */
  groupByTask(decisions) {
    const groups = {};
    for (const d of decisions) {
      const task = d.task || 'unknown';
      groups[task] = (groups[task] || 0) + 1;
    }
    return groups;
  }

  /**
   * Helper: Count tags
   */
  countTags(decisions) {
    const counts = {};
    for (const d of decisions) {
      for (const tag of (d.outcome.tags || [])) {
        counts[tag] = (counts[tag] || 0) + 1;
      }
    }
    return counts;
  }

  /**
   * Save pattern analysis for an agent
   */
  async savePatterns(agent, decisions) {
    const patterns = this.detect(decisions);
    await this.store.savePatterns(agent, patterns);
    return patterns;
  }
}