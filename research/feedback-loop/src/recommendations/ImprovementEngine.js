import { AnalyticsStore } from '../storage/AnalyticsStore.js';

/**
 * Generates improvement recommendations based on analysis
 */
export class ImprovementEngine {
  constructor(minimaxClient = null) {
    this.store = new AnalyticsStore();
    this.minimax = minimaxClient;
  }

  /**
   * Generate recommendations for an agent
   * @param {string} agent - Agent identifier
   * @param {Object} analysis - Analysis results
   */
  async generate(agent, analysis) {
    const recommendations = [];

    // 1. Accuracy-based recommendations
    recommendations.push(...this.generateAccuracyRecommendations(analysis));

    // 2. Trend-based recommendations
    recommendations.push(...this.generateTrendRecommendations(analysis));

    // 3. Pattern-based recommendations
    recommendations.push(...this.generatePatternRecommendations(analysis));

    // 4. Confidence calibration recommendations
    recommendations.push(...this.generateCalibrationRecommendations(analysis));

    // 5. Task-specific recommendations
    recommendations.push(...this.generateTaskRecommendations(analysis));

    // 6. Get LLM-enhanced recommendations if available
    if (this.minimax && analysis.patterns?.sufficientData) {
      try {
        const llmRecs = await this.minimax.generateRecommendations(analysis, agent);
        if (llmRecs.recommendations) {
          recommendations.push(...llmRecs.recommendations.map(r => ({
            ...r,
            source: 'llm',
            priority: this.mapPriority(r.priority)
          })));
        }
      } catch (error) {
        console.log('LLM recommendations unavailable, using statistical only');
      }
    }

    // Deduplicate and prioritize
    const unique = this.deduplicate(recommendations);
    const prioritized = this.prioritize(unique);

    // Save recommendations
    await this.store.saveRecommendations(agent, prioritized);

    return {
      agent,
      generatedAt: new Date().toISOString(),
      totalRecommendations: prioritized.length,
      byPriority: this.groupByPriority(prioritized),
      recommendations: prioritized
    };
  }

  /**
   * Generate recommendations based on accuracy metrics
   */
  generateAccuracyRecommendations(analysis) {
    const recs = [];
    const overall = analysis.accuracy?.overall;

    if (!overall) return recs;

    // Low overall accuracy
    if (overall.accuracy < 0.6) {
      recs.push({
        id: 'acc_low_overall',
        title: 'Focus on Fundamentals',
        description: `Overall accuracy is ${(overall.accuracy * 100).toFixed(0)}%. Review recent failures to identify systematic issues.`,
        category: 'fundamental',
        priority: 'high',
        expectedImpact: 'Increase baseline accuracy by 15-20%',
        implementation: 'Analyze last 10 failures, identify common causes, create checklist',
        metrics: ['overall_accuracy', 'failure_rate'],
        source: 'statistical'
      });
    }

    // High accuracy - maintain excellence
    if (overall.accuracy > 0.9) {
      recs.push({
        id: 'acc_high_overall',
        title: 'Document Success Patterns',
        description: `Excellent ${(overall.accuracy * 100).toFixed(0)}% accuracy. Document what works for future agents.`,
        category: 'process',
        priority: 'medium',
        expectedImpact: 'Knowledge transfer to other agents',
        implementation: 'Write up successful patterns, create templates',
        metrics: ['knowledge_documented'],
        source: 'statistical'
      });
    }

    return recs;
  }

  /**
   * Generate recommendations based on trends
   */
  generateTrendRecommendations(analysis) {
    const recs = [];
    const trend = analysis.trends?.accuracyTrend;

    if (!trend) return recs;

    if (trend.direction === 'declining' || trend.direction === 'slightly_declining') {
      recs.push({
        id: 'trend_declining',
        title: 'Address Performance Decline',
        description: `Accuracy is declining (slope: ${trend.slope.toFixed(4)}). Identify what's changed recently.`,
        category: 'urgent',
        priority: 'high',
        expectedImpact: 'Stop decline and restore previous performance',
        implementation: 'Review recent changes, environmental factors, task complexity',
        metrics: ['trend_slope', 'rolling_accuracy'],
        source: 'statistical'
      });
    }

    if (trend.direction === 'improving') {
      recs.push({
        id: 'trend_improving',
        title: 'Accelerate Improvement',
        description: 'Performance is trending up. Identify what\'s working and double down.',
        category: 'optimization',
        priority: 'medium',
        expectedImpact: 'Maintain momentum, reach 95%+ accuracy',
        implementation: 'Analyze recent successes, formalize new approaches',
        metrics: ['improvement_rate', 'time_to_target'],
        source: 'statistical'
      });
    }

    // High volatility
    const volatility = analysis.trends?.volatility;
    if (volatility?.volatility === 'high') {
      recs.push({
        id: 'trend_volatile',
        title: 'Reduce Performance Variance',
        description: 'High volatility detected. Focus on consistency over peak performance.',
        category: 'stability',
        priority: 'medium',
        expectedImpact: 'More predictable, reliable performance',
        implementation: 'Standardize processes, create decision frameworks',
        metrics: ['variance_reduction', 'consistency_score'],
        source: 'statistical'
      });
    }

    return recs;
  }

  /**
   * Generate recommendations based on detected patterns
   */
  generatePatternRecommendations(analysis) {
    const recs = [];
    const patterns = analysis.patterns;

    if (!patterns?.sufficientData) return recs;

    // Task-specific weaknesses
    if (patterns.contextPatterns?.failureIndicators) {
      for (const indicator of patterns.contextPatterns.failureIndicators) {
        recs.push({
          id: `pattern_weak_${indicator.value}`,
          title: `Improve ${indicator.value} Performance`,
          description: `${indicator.value} tasks have ${(indicator.failureRate * 100).toFixed(0)}% failure rate.`,
          category: 'skill',
          priority: 'high',
          expectedImpact: `Reduce ${indicator.value} failures by 50%`,
          implementation: `Study ${indicator.value} best practices, get mentoring, practice more`,
          metrics: [`${indicator.value}_accuracy`],
          source: 'pattern',
          relatedTask: indicator.value
        });
      }
    }

    // Task-specific strengths
    if (patterns.contextPatterns?.successIndicators) {
      for (const indicator of patterns.contextPatterns.successIndicators) {
        recs.push({
          id: `pattern_strong_${indicator.value}`,
          title: `Leverage ${indicator.value} Strength`,
          description: `Excellent ${(indicator.confidence * 100).toFixed(0)}% success rate on ${indicator.value}.`,
          category: 'leverage',
          priority: 'low',
          expectedImpact: 'Maintain excellence, mentor others',
          implementation: 'Document approaches, take on more complex versions',
          metrics: [`${indicator.value}_accuracy`],
          source: 'pattern',
          relatedTask: indicator.value
        });
      }
    }

    // Temporal patterns
    if (patterns.temporalPatterns?.timeClusters?.length > 0) {
      const worst = patterns.temporalPatterns.timeClusters
        .filter(t => t.deviation < -0.2)
        .sort((a, b) => a.deviation - b.deviation)[0];

      if (worst) {
        recs.push({
          id: 'pattern_time',
          title: 'Optimize Low-Performance Windows',
          description: `Performance drops at hour ${worst.hour} (${((0.5 + worst.deviation) * 100).toFixed(0)}% accuracy vs ${(analysis.accuracy?.overall?.accuracy * 100).toFixed(0)}% overall).`,
          category: 'process',
          priority: 'medium',
          expectedImpact: 'More consistent performance across all hours',
          implementation: 'Identify causes (fatigue, distractions), adjust schedule',
          metrics: ['hourly_variance', 'overall_consistency'],
          source: 'pattern'
        });
      }
    }

    return recs;
  }

  /**
   * Generate confidence calibration recommendations
   */
  generateCalibrationRecommendations(analysis) {
    const recs = [];
    const confidence = analysis.accuracy?.confidence;

    if (!confidence?.available) return recs;

    if (confidence.calibration === 'poor') {
      recs.push({
        id: 'calibration_poor',
        title: 'Improve Confidence Calibration',
        description: `Confidence scores don't correlate well with outcomes (MAE: ${confidence.weightedMAE.toFixed(2)}).`,
        category: 'metacognition',
        priority: 'high',
        expectedImpact: 'Better self-assessment leads to better decisions',
        implementation: 'Review past predictions vs outcomes, calibrate confidence scoring',
        metrics: ['calibration_mae', 'confidence_accuracy_correlation'],
        source: 'statistical'
      });
    }

    if (confidence.overconfidenceRisk) {
      recs.push({
        id: 'calibration_overconfident',
        title: 'Address Overconfidence',
        description: 'High confidence decisions are failing more than expected.',
        category: 'metacognition',
        priority: 'high',
        expectedImpact: 'Fewer high-confidence failures',
        implementation: 'Add verification steps for high-confidence decisions',
        metrics: ['high_conf_success_rate'],
        source: 'statistical'
      });
    }

    return recs;
  }

  /**
   * Generate task-specific recommendations
   */
  generateTaskRecommendations(analysis) {
    const recs = [];
    const byTask = analysis.accuracy?.byTask;

    if (!byTask) return recs;

    // Find largest gap between best and worst task
    const tasks = Object.entries(byTask)
      .filter(([_, data]) => data.total >= 3)
      .sort((a, b) => b[1].accuracy - a[1].accuracy);

    if (tasks.length >= 2) {
      const best = tasks[0];
      const worst = tasks[tasks.length - 1];
      const gap = best[1].accuracy - worst[1].accuracy;

      if (gap > 0.3) {
        recs.push({
          id: 'task_gap',
          title: 'Close Task Performance Gap',
          description: `${gap > 0.5 ? 'Large' : 'Significant'} performance gap between ${best[0]} (${(best[1].accuracy * 100).toFixed(0)}%) and ${worst[0]} (${(worst[1].accuracy * 100).toFixed(0)}%).`,
          category: 'skill',
          priority: 'high',
          expectedImpact: 'More balanced capabilities across all tasks',
          implementation: `Study ${best[0]} approaches, apply to ${worst[0]}`,
          metrics: [`${worst[0]}_accuracy`, 'max_task_gap'],
          source: 'statistical'
        });
      }
    }

    return recs;
  }

  /**
   * Deduplicate recommendations
   */
  deduplicate(recommendations) {
    const seen = new Set();
    return recommendations.filter(r => {
      const key = `${r.category}_${r.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Prioritize recommendations
   */
  prioritize(recommendations) {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    
    return recommendations.sort((a, b) => {
      // First by priority
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by source (statistical before LLM for consistency)
      if (a.source === 'statistical' && b.source !== 'statistical') return -1;
      if (a.source !== 'statistical' && b.source === 'statistical') return 1;
      
      return 0;
    });
  }

  /**
   * Group recommendations by priority
   */
  groupByPriority(recommendations) {
    return {
      high: recommendations.filter(r => r.priority === 'high').length,
      medium: recommendations.filter(r => r.priority === 'medium').length,
      low: recommendations.filter(r => r.priority === 'low').length
    };
  }

  /**
   * Map LLM priority to internal priority
   */
  mapPriority(priority) {
    const map = {
      'high': 'high',
      'medium': 'medium',
      'low': 'low',
      'critical': 'high',
      'important': 'medium',
      'optional': 'low'
    };
    return map[priority?.toLowerCase()] || 'medium';
  }
}