#!/usr/bin/env node

import { FeedbackLoop } from './index.js';

/**
 * CLI for the Feedback Loop System
 */
class FeedbackCLI {
  constructor() {
    this.feedback = new FeedbackLoop();
  }

  async run(args) {
    const [command, ...rest] = args;

    switch (command) {
      case 'track':
        return this.cmdTrack(rest);
      case 'log':
        return this.cmdLog(rest);
      case 'analyze':
        return this.cmdAnalyze(rest);
      case 'report':
        return this.cmdReport(rest);
      case 'recommend':
        return this.cmdRecommend(rest);
      case 'stats':
        return this.cmdStats(rest);
      case 'demo':
        return this.cmdDemo();
      default:
        this.showHelp();
        return 0;
    }
  }

  async cmdTrack(args) {
    // Example: node cli.js track agent:research task:search context:'{"query":"AI"}' decision:'{"provider":"brave"}' confidence:0.8
    const params = this.parseArgs(args);
    
    const decision = {
      agent: params.agent || 'default',
      task: params.task || 'unknown',
      context: params.context ? JSON.parse(params.context) : {},
      decision: params.decision ? JSON.parse(params.decision) : {},
      confidence: params.confidence ? parseFloat(params.confidence) : null
    };

    const result = await this.feedback.trackDecision(decision);
    console.log('Tracked decision:', result.id);
    console.log(JSON.stringify(result, null, 2));
    return 0;
  }

  async cmdLog(args) {
    // Example: node cli.js log decisionId:xxx success:true feedback:"Good result"
    const params = this.parseArgs(args);
    
    if (!params.decisionId) {
      console.error('Error: decisionId required');
      return 1;
    }

    const outcome = {
      success: params.success === 'true',
      feedback: params.feedback || null,
      quality: params.quality ? parseFloat(params.quality) : null,
      tags: params.tags ? params.tags.split(',') : []
    };

    const result = await this.feedback.logOutcome(params.decisionId, outcome);
    console.log('Logged outcome for:', params.decisionId);
    console.log(JSON.stringify(result, null, 2));
    return 0;
  }

  async cmdAnalyze(args) {
    const params = this.parseArgs(args);
    const agent = params.agent || 'default';
    const timeframe = params.timeframe || '30d';

    console.log(`Analyzing ${agent} (${timeframe})...`);
    const analysis = await this.feedback.analyze(agent, { timeframe });
    
    console.log('\n=== ACCURACY ===');
    if (analysis.accuracy?.overall) {
      const acc = analysis.accuracy.overall;
      console.log(`Overall: ${(acc.accuracy * 100).toFixed(1)}% (${acc.successful}/${acc.total})`);
    }

    if (analysis.accuracy?.byTask) {
      console.log('\nBy Task:');
      for (const [task, data] of Object.entries(analysis.accuracy.byTask)) {
        console.log(`  ${task}: ${(data.accuracy * 100).toFixed(1)}%`);
      }
    }

    console.log('\n=== TRENDS ===');
    if (analysis.trends?.accuracyTrend) {
      const trend = analysis.trends.accuracyTrend;
      console.log(`Direction: ${trend.direction}`);
      console.log(`Significance: ${trend.significance}`);
    }

    console.log('\n=== PATTERNS ===');
    if (analysis.patterns?.commonFactors) {
      for (const factor of analysis.patterns.commonFactors) {
        console.log(`- ${factor.finding}`);
      }
    }

    return 0;
  }

  async cmdReport(args) {
    const params = this.parseArgs(args);
    const agent = params.agent || null;
    const timeframe = params.timeframe || '30d';

    console.log(`Generating report${agent ? ` for ${agent}` : ' (all agents)'}...`);
    const report = await this.feedback.generateReport(agent, { timeframe });
    
    console.log('\n=== SUMMARY ===');
    console.log(JSON.stringify(report.summary, null, 2));

    if (report.recommendations) {
      console.log('\n=== TOP RECOMMENDATIONS ===');
      const top = report.recommendations.recommendations?.slice(0, 5) || [];
      for (const rec of top) {
        console.log(`\n[${rec.priority.toUpperCase()}] ${rec.title}`);
        console.log(`  ${rec.description}`);
      }
    }

    return 0;
  }

  async cmdRecommend(args) {
    const params = this.parseArgs(args);
    const agent = params.agent || 'default';
    const timeframe = params.timeframe || '30d';

    console.log(`Generating recommendations for ${agent}...`);
    const result = await this.feedback.getRecommendations(agent, { timeframe });

    console.log(`\nTotal recommendations: ${result.totalRecommendations}`);
    console.log(`By priority:`, result.byPriority);

    console.log('\n=== RECOMMENDATIONS ===');
    for (const rec of result.recommendations || []) {
      console.log(`\n[${rec.priority.toUpperCase()}] ${rec.title} (${rec.category})`);
      console.log(`  ${rec.description}`);
      console.log(`  Expected impact: ${rec.expectedImpact}`);
      console.log(`  Implementation: ${rec.implementation}`);
    }

    return 0;
  }
  
  async cmdStats(args) {
    const params = this.parseArgs(args);
    
    if (params.agent) {
      const stats = await this.feedback.getQuickStats(params.agent);
      console.log(JSON.stringify(stats, null, 2));
    } else {
      const stats = await this.feedback.getSystemStats();
      console.log('=== SYSTEM STATS ===');
      console.log(`Total decisions: ${stats.totalDecisions}`);
      console.log(`Total outcomes: ${stats.totalOutcomes}`);
      console.log(`Total agents: ${stats.totalAgents}`);
      
      if (stats.agents?.length > 0) {
        console.log('\n=== AGENTS ===');
        for (const agent of stats.agents) {
          const acc = agent.accuracy ? `${(agent.accuracy * 100).toFixed(1)}%` : 'N/A';
          console.log(`  ${agent.name}: ${agent.totalDecisions} decisions, ${acc} accuracy`);
        }
      }
    }
    
    return 0;
  }

  async cmdDemo() {
    console.log('Running demo...');
    
    const agent = 'demo-agent';
    const decisions = [
      { task: 'search', decision: { provider: 'brave' }, success: true, feedback: 'Good results' },
      { task: 'search', decision: { provider: 'google' }, success: false, feedback: 'Irrelevant results' },
      { task: 'summarize', decision: { model: 'gpt4' }, success: true, feedback: 'Accurate summary' },
      { task: 'search', decision: { provider: 'brave' }, success: true, feedback: 'Relevant sources' },
      { task: 'code', decision: { language: 'js' }, success: false, feedback: 'Syntax errors' },
      { task: 'search', decision: { provider: 'brave' }, success: true, feedback: 'Perfect' },
      { task: 'summarize', decision: { model: 'gpt4' }, success: true, feedback: 'Great summary' },
      { task: 'code', decision: { language: 'python' }, success: true, feedback: 'Clean code' },
    ];

    for (const d of decisions) {
      const tracked = await this.feedback.trackDecision({
        agent,
        task: d.task,
        decision: d.decision,
        confidence: Math.random() * 0.4 + 0.6
      });
      
      await this.feedback.logOutcome(tracked.id, {
        success: d.success,
        feedback: d.feedback,
        quality: d.success ? 0.8 : 0.3
      });
      
      console.log(`Tracked: ${d.task} -> ${d.success ? '✓' : '✗'}`);
    }

    console.log('\nAnalyzing...');
    const analysis = await this.feedback.analyze(agent);
    console.log(`Accuracy: ${(analysis.accuracy?.overall?.accuracy * 100)?.toFixed(1)}%`);

    console.log('\nGenerating recommendations...');
    const recs = await this.feedback.getRecommendations(agent);
    console.log(`Found ${recs.totalRecommendations} recommendations`);
    
    for (const rec of recs.recommendations.slice(0, 3)) {
      console.log(`- [${rec.priority}] ${rec.title}`);
    }

    return 0;
  }

  parseArgs(args) {
    const params = {};
    for (const arg of args) {
      const [key, ...valueParts] = arg.split(':');
      params[key] = valueParts.join(':'); // Rejoin in case value had colons
    }
    return params;
  }

  showHelp() {
    console.log(`
Feedback Loop System CLI

Commands:
  track agent:<name> task:<type> [context:<json>] [decision:<json>] [confidence:<n>]
    Track a new decision

  log decisionId:<id> success:<true|false> [feedback:<text>] [quality:<n>] [tags:<a,b>]
    Log an outcome for a decision

  analyze [agent:<name>] [timeframe:<30d|7d|1d>]
    Analyze agent performance

  report [agent:<name>] [timeframe:<30d|7d|1d>]
    Generate comprehensive report

  recommend [agent:<name>] [timeframe:<30d|7d|1d>]
    Get improvement recommendations

  stats [agent:<name>]
    Get quick statistics

  demo
    Run demo with sample data

Examples:
  node cli.js track agent:research task:search decision:'{"provider":"brave"}' confidence:0.8
  node cli.js analyze agent:research timeframe:7d
  node cli.js report
  node cli.js demo
`);
  }
}

// Run CLI
const cli = new FeedbackCLI();
cli.run(process.argv.slice(2)).then(code => process.exit(code)).catch(err => {
  console.error(err);
  process.exit(1);
});