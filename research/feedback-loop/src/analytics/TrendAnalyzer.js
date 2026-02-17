import { AnalyticsStore } from '../storage/AnalyticsStore.js';

/**
 * Analyzes trends in decision outcomes over time
 */
export class TrendAnalyzer {
  constructor() {
    this.store = new AnalyticsStore();
  }

  /**
   * Analyze trends in decision data
   * @param {Array} decisions - Array of decisions with outcomes
   */
  analyze(decisions) {
    const withOutcomes = decisions.filter(d => d.outcome);
    
    if (withOutcomes.length < 5) {
      return {
        sufficientData: false,
        sampleSize: withOutcomes.length,
        message: 'Need at least 5 decisions with outcomes'
      };
    }

    // Sort chronologically
    const sorted = withOutcomes.sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    return {
      sufficientData: true,
      sampleSize: withOutcomes.length,
      timeRange: {
        start: sorted[0].timestamp,
        end: sorted[sorted.length - 1].timestamp
      },
      accuracyTrend: this.analyzeAccuracyTrend(sorted),
      qualityTrend: this.analyzeQualityTrend(sorted),
      taskTrends: this.analyzeTaskTrends(sorted),
      timeOfDay: this.analyzeTimeOfDay(sorted),
      dayOfWeek: this.analyzeDayOfWeek(sorted),
      streaks: this.analyzeStreaks(sorted),
      volatility: this.analyzeVolatility(sorted)
    };
  }

  /**
   * Analyze accuracy trend over time
   */
  analyzeAccuracyTrend(decisions) {
    // Simple linear regression on success/failure
    const n = decisions.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    for (let i = 0; i < n; i++) {
      const x = i;
      const y = decisions[i].outcome.success ? 1 : 0;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const yMean = sumY / n;
    let ssTotal = 0, ssResidual = 0;

    for (let i = 0; i < n; i++) {
      const y = decisions[i].outcome.success ? 1 : 0;
      const predicted = slope * i + intercept;
      ssTotal += Math.pow(y - yMean, 2);
      ssResidual += Math.pow(y - predicted, 2);
    }

    const rSquared = 1 - (ssResidual / ssTotal);

    return {
      slope,
      intercept,
      rSquared,
      direction: slope > 0.01 ? 'improving' : 
                 slope < -0.01 ? 'declining' : 'stable',
      significance: rSquared > 0.3 ? 'strong' : 
                    rSquared > 0.1 ? 'moderate' : 'weak'
    };
  }

  /**
   * Analyze quality scores trend
   */
  analyzeQualityTrend(decisions) {
    const withQuality = decisions.filter(d => 
      d.outcome.quality !== null && d.outcome.quality !== undefined
    );

    if (withQuality.length < 5) {
      return { available: false, sampleSize: withQuality.length };
    }

    const n = withQuality.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    for (let i = 0; i < n; i++) {
      const x = i;
      const y = withQuality[i].outcome.quality;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    return {
      available: true,
      sampleSize: n,
      slope,
      direction: slope > 0.01 ? 'improving' : 
                 slope < -0.01 ? 'declining' : 'stable',
      averageQuality: sumY / n
    };
  }

  /**
   * Analyze trends by task type
   */
  analyzeTaskTrends(decisions) {
    const byTask = {};

    // Group by task
    for (const d of decisions) {
      const task = d.task || 'unknown';
      if (!byTask[task]) byTask[task] = [];
      byTask[task].push(d);
    }

    const trends = {};

    for (const [task, taskDecisions] of Object.entries(byTask)) {
      if (taskDecisions.length < 5) {
        trends[task] = { 
          sampleSize: taskDecisions.length, 
          sufficientData: false 
        };
        continue;
      }

      const accTrend = this.analyzeAccuracyTrend(taskDecisions);
      trends[task] = {
        sampleSize: taskDecisions.length,
        sufficientData: true,
        accuracyTrend: accTrend,
        currentAccuracy: taskDecisions.slice(-5).filter(d => d.outcome.success).length / 5
      };
    }

    return trends;
  }

  /**
   * Analyze performance by time of day
   */
  analyzeTimeOfDay(decisions) {
    const hours = {};

    for (const d of decisions) {
      const hour = new Date(d.timestamp).getHours();
      if (!hours[hour]) {
        hours[hour] = { total: 0, successful: 0 };
      }
      hours[hour].total++;
      if (d.outcome.success) hours[hour].successful++;
    }

    // Calculate accuracy per hour
    for (const hour of Object.keys(hours)) {
      const stats = hours[hour];
      stats.accuracy = stats.total > 0 ? stats.successful / stats.total : 0;
    }

    // Find best and worst hours
    const hourStats = Object.entries(hours)
      .filter(([_, stats]) => stats.total >= 3)
      .map(([hour, stats]) => ({ hour: parseInt(hour), ...stats }));

    hourStats.sort((a, b) => b.accuracy - a.accuracy);

    return {
      byHour: hours,
      bestHours: hourStats.slice(0, 3).map(h => h.hour),
      worstHours: hourStats.slice(-3).map(h => h.hour),
      hasPattern: hourStats.length > 3 && 
        (hourStats[0].accuracy - hourStats[hourStats.length - 1].accuracy > 0.3)
    };
  }

  /**
   * Analyze performance by day of week
   */
  analyzeDayOfWeek(decisions) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const byDay = {};

    for (const d of decisions) {
      const dayIndex = new Date(d.timestamp).getDay();
      const day = days[dayIndex];
      
      if (!byDay[day]) {
        byDay[day] = { total: 0, successful: 0 };
      }
      byDay[day].total++;
      if (d.outcome.success) byDay[day].successful++;
    }

    // Calculate accuracy per day
    for (const day of Object.keys(byDay)) {
      const stats = byDay[day];
      stats.accuracy = stats.total > 0 ? stats.successful / stats.total : 0;
    }

    return {
      byDay,
      hasPattern: Object.keys(byDay).length > 3
    };
  }

  /**
   * Analyze winning and losing streaks
   */
  analyzeStreaks(decisions) {
    let currentStreak = 0;
    let currentType = null;
    let longestSuccessStreak = 0;
    let longestFailureStreak = 0;
    const streaks = [];

    for (const d of decisions) {
      const success = d.outcome.success;
      
      if (currentType === success) {
        currentStreak++;
      } else {
        if (currentStreak > 0) {
          streaks.push({ type: currentType, length: currentStreak });
        }
        currentType = success;
        currentStreak = 1;
      }

      if (success) {
        longestSuccessStreak = Math.max(longestSuccessStreak, currentStreak);
      } else {
        longestFailureStreak = Math.max(longestFailureStreak, currentStreak);
      }
    }

    // Add final streak
    if (currentStreak > 0) {
      streaks.push({ type: currentType, length: currentStreak });
    }

    const recentStreak = streaks[streaks.length - 1];

    return {
      longestSuccessStreak,
      longestFailureStreak,
      totalStreaks: streaks.length,
      averageStreakLength: streaks.reduce((a, s) => a + s.length, 0) / streaks.length,
      currentStreak: recentStreak ? { 
        type: recentStreak.type ? 'success' : 'failure',
        length: recentStreak.length 
      } : null
    };
  }

  /**
   * Analyze volatility (variance in outcomes)
   */
  analyzeVolatility(decisions) {
    // Calculate moving window variance
    const windowSize = Math.min(10, Math.floor(decisions.length / 2));
    const variances = [];

    for (let i = windowSize; i <= decisions.length; i++) {
      const window = decisions.slice(i - windowSize, i);
      const outcomes = window.map(d => d.outcome.success ? 1 : 0);
      const mean = outcomes.reduce((a, b) => a + b, 0) / windowSize;
      const variance = outcomes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / windowSize;
      variances.push(variance);
    }

    const avgVariance = variances.reduce((a, b) => a + b, 0) / variances.length;

    return {
      averageVariance: avgVariance,
      volatility: avgVariance > 0.25 ? 'high' : 
                  avgVariance > 0.15 ? 'medium' : 'low',
      varianceTrend: variances[variances.length - 1] - variances[0]
    };
  }

  /**
   * Save trend analysis for an agent
   */
  async saveTrends(agent, decisions) {
    const trends = this.analyze(decisions);
    await this.store.saveTrends(agent, trends);
    return trends;
  }
}