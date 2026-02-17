import { DecisionStore } from './storage/DecisionStore.js';
import { AnalyticsStore } from './storage/AnalyticsStore.js';
import { DecisionTracker } from './core/DecisionTracker.js';
import { FeedbackLogger } from './core/FeedbackLogger.js';
import { AccuracyCalculator } from './analytics/AccuracyCalculator.js';
import { TrendAnalyzer } from './analytics/TrendAnalyzer.js';
import { PatternDetector } from './analytics/PatternDetector.js';
import { ImprovementEngine } from './recommendations/ImprovementEngine.js';
import { MinimaxClient } from './ml/MinimaxClient.js';

/**
 * Main Feedback Loop System
 * Orchestrates decision tracking, outcome logging, and improvement recommendations
 */
export class FeedbackLoop {
  constructor(options = {}) {
    this.options = {
      minimaxApiKey: null,
      enableLLM: true,
      ...options
    };

    // Initialize components
    this.tracker = new DecisionTracker();
    this.logger = new FeedbackLogger();
    this.accuracyCalc = new AccuracyCalculator();
    this.trendAnalyzer = new TrendAnalyzer();
    this.patternDetector = new PatternDetector();
    this.analyticsStore = new AnalyticsStore();
    
    // Initialize MiniMax if enabled
    this.minimax = this.options.enableLLM 
      ? new MinimaxClient(this.options.minimaxApiKey)
      : null;
      
    this.improvementEngine = new ImprovementEngine(this.minimax);
  }

  /**
   * Track a new decision
   * @param {Object} decision - Decision to track
   * @returns {Promise<Object>} Tracked decision with ID
   */
  async trackDecision(decision) {
    return this.tracker.track(decision);
  }

  /**
   * Log an outcome for a tracked decision
   * @param {string} decisionId - Decision ID
   * @param {Object} outcome - Outcome data
   * @returns {Promise<Object>} Logged outcome
   */
  async logOutcome(decisionId, outcome) {
    return this.logger.log(decisionId, outcome);
  }

  /**
   * Track and log in one call
   * @param {Object} decision - Decision data
   * @param {Object} outcome - Outcome data
   * @returns {Promise<Object>} Both decision and outcome
   */
  async trackAndLog(decision, outcome) {
    const tracked = await this.trackDecision(decision);
    const logged = await this.logOutcome(tracked.id, outcome);
    
    return {
      decision: tracked,
      outcome: logged
    };
  }

  /**
   * Analyze an agent's performance
   * @param {string} agent - Agent identifier
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Full analysis results
   */
  async analyze(agent, options = {}) {
    const { timeframe = '30d', useLLM = true } = options;

    // Get all decisions for agent
    const decisions = await this.tracker.getAgentDecisions(agent, { timeframe });

    if (decisions.length === 0) {
      return {
        agent,
        timeframe,
        sufficientData: false,
        message: 'No decisions found for this agent in the specified timeframe'
      };
    }

    // Run all analyses
    const accuracy = this.accuracyCalc.calculate(decisions);
    const trends = this.trendAnalyzer.analyze(decisions);
    const patterns = this.patternDetector.detect(decisions);

    // Get LLM insights if enabled
    let llmInsights = null;
    if (useLLM && this.minimax && patterns.sufficientData) {
      try {
        const cost = this.minimax.estimateCost(decisions.length);
        if (cost.estimatedCost < 0.01) { // Cost threshold
          llmInsights = await this.minimax.analyzePatterns(decisions, { accuracy, trends });
        }
      } catch (error) {
        console.log('LLM analysis skipped:', error.message);
      }
    }

    const analysis = {
      agent,
      timeframe,
      generatedAt: new Date().toISOString(),
      sufficientData: true,
      sampleSize: decisions.length,
      accuracy,
      trends,
      patterns,
      llmInsights,
      costEstimate: llmInsights ? this.minimax.estimateCost(decisions.length) : null
    };

    // Save analysis results
    await this.accuracyCalc.saveMetrics(agent, decisions);
    await this.trendAnalyzer.saveTrends(agent, decisions);
    await this.patternDetector.savePatterns(agent, decisions);

    return analysis;
  }

  /**
   * Generate improvement recommendations for an agent
   * @param {string} agent - Agent identifier
   * @param {Object} options - Options
   * @returns {Promise<Object>} Recommendations
   */
  async getRecommendations(agent, options = {}) {
    const { timeframe = '30d', useLLM = true } = options;

    // Get or run analysis
    const analysis = await this.analyze(agent, { timeframe, useLLM });

    if (!analysis.sufficientData) {
      return {
        agent,
        recommendations: [],
        message: analysis.message
      };
    }

    // Generate recommendations
    return this.improvementEngine.generate(agent, analysis);
  }

  /**
   * Generate a comprehensive report
   * @param {string} agent - Agent identifier (null for all)
   * @param {Object} options - Report options
   * @returns {Promise<Object>} Full report
   */
  async generateReport(agent = null, options = {}) {
    const { timeframe = '30d' } = options;

    if (agent) {
      const analysis = await this.analyze(agent, { timeframe });
      const recommendations = await this.getRecommendations(agent, { timeframe });
      
      return {
        type: 'agent',
        agent,
        timeframe,
        generatedAt: new Date().toISOString(),
        analysis,
        recommendations,
        summary: this.summarizeReport(analysis, recommendations)
      };
    }

    // Multi-agent report
    const allDecisions = await this.tracker.query({});
    const agents = [...new Set(allDecisions.map(d => d.agent))];
    
    const agentReports = [];
    for (const a of agents) {
      try {
        const report = await this.generateReport(a, { timeframe });
        agentReports.push(report);
      } catch (error) {
        console.error(`Failed to generate report for ${a}:`, error);
      }
    }

    return {
      type: 'multi-agent',
      timeframe,
      generatedAt: new Date().toISOString(),
      agents: agentReports,
      summary: this.summarizeMultiAgentReport(agentReports)
    };
  }

  /**
   * Get quick stats for an agent
   * @param {string} agent - Agent identifier
   * @returns {Promise<Object>} Quick stats
   */
  async getQuickStats(agent) {
    const stats = await this.tracker.getStats(agent);
    const recent = await this.tracker.getAgentDecisions(agent, { timeframe: '7d', limit: 50 });
    
    const recentWithOutcomes = recent.filter(d => d.outcome);
    const recentSuccess = recentWithOutcomes.filter(d => d.outcome.success).length;

    return {
      agent,
      overall: stats,
      recent7d: {
        total: recent.length,
        withOutcomes: recentWithOutcomes.length,
        accuracy: recentWithOutcomes.length > 0 
          ? recentSuccess / recentWithOutcomes.length 
          : null
      },
      lastDecision: recent[0] || null
    };
  }

  /**
   * Get system-wide statistics
   * @returns {Promise<Object>} System stats
   */
  async getSystemStats() {
    const storeStats = await this.tracker.store.getStats();
    const allDecisions = await this.tracker.query({});
    const agents = [...new Set(allDecisions.map(d => d.agent))];

    const agentStats = [];
    for (const agent of agents) {
      const stats = await this.tracker.getStats(agent);
      agentStats.push({
        name: agent,
        totalDecisions: stats.totalDecisions,
        accuracy: stats.accuracy
      });
    }

    return {
      ...storeStats,
      agents: agentStats,
      totalAgents: agents.length
    };
  }

  /**
   * Summarize a single agent report
   */
  summarizeReport(analysis, recommendations) {
    const overallAcc = analysis.accuracy?.overall?.accuracy;
    const trend = analysis.trends?.accuracyTrend?.direction;
    const highPriorityRecs = recommendations.recommendations?.filter(r => r.priority === 'high').length || 0;

    return {
      health: overallAcc > 0.8 ? 'excellent' : overallAcc > 0.6 ? 'good' : 'needs_attention',
      accuracy: overallAcc ? `${(overallAcc * 100).toFixed(1)}%` : 'N/A',
      trend,
      actionItems: highPriorityRecs,
      keyInsight: this.generateKeyInsight(analysis)
    };
  }

  /**
   * Summarize multi-agent report
   */
  summarizeMultiAgentReport(agentReports) {
    const accuracies = agentReports
      .map(r => r.analysis?.accuracy?.overall?.accuracy)
      .filter(a => a !== null);

    const avgAccuracy = accuracies.length > 0
      ? accuracies.reduce((a, b) => a + b, 0) / accuracies.length
      : null;

    const totalActionItems = agentReports.reduce(
      (sum, r) => sum + (r.summary?.actionItems || 0), 0
    );

    return {
      totalAgents: agentReports.length,
      averageAccuracy: avgAccuracy ? `${(avgAccuracy * 100).toFixed(1)}%` : 'N/A',
      totalActionItems,
      agentsNeedingAttention: agentReports.filter(r => r.summary?.health === 'needs_attention').length
    };
  }

  /**
   * Generate a key insight from analysis
   */
  generateKeyInsight(analysis) {
    const patterns = analysis.patterns;
    const trends = analysis.trends;

    if (!patterns?.sufficientData) {
      return 'Collect more data for insights';
    }

    if (trends?.accuracyTrend?.direction === 'declining') {
      return 'Performance is declining - immediate attention needed';
    }

    if (patterns.contextPatterns?.failureIndicators?.length > 0) {
      const worst = patterns.contextPatterns.failureIndicators[0];
      return `${worst.value} tasks need improvement (${(worst.failureRate * 100).toFixed(0)}% failure rate)`;
    }

    if (analysis.accuracy?.confidence?.calibration === 'poor') {
      return 'Confidence calibration needs improvement';
    }

    return 'Performance is stable - focus on optimization';
  }
}

export default FeedbackLoop;