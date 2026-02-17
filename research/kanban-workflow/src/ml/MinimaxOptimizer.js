/**
 * MinimaxOptimizer - AI-powered workflow optimization using MiniMax
 * 
 * Uses MiniMax LLM to:
 * - Analyze workflow patterns
 * - Identify optimization opportunities
 * - Suggest workflow improvements
 * - Predict bottlenecks
 */
export class MinimaxOptimizer {
  constructor(apiKey = null) {
    this.apiKey = apiKey || process.env.MINIMAX_API_KEY;
    this.baseUrl = 'https://api.minimax.chat/v1';
    this.model = 'abab6.5-chat';
  }

  /**
   * Generate optimization recommendations
   * @param {Object} workflow - Workflow definition
   * @param {Object} analytics - Analytics data
   */
  async generateRecommendations(workflow, analytics) {
    if (!this.apiKey) {
      return {
        available: false,
        message: 'MiniMax API key not configured',
        fallback: true
      };
    }

    const prompt = this.buildOptimizationPrompt(workflow, analytics);

    try {
      const response = await this.callMiniMax(prompt);
      return this.parseOptimizationResponse(response);
    } catch (error) {
      console.error('MiniMax optimization failed:', error.message);
      return {
        available: false,
        error: error.message,
        fallback: true
      };
    }
  }

  /**
   * Analyze workflow for bottlenecks
   * @param {Object} workflow - Workflow definition
   * @param {Object} analytics - Analytics data
   */
  async analyzeBottlenecks(workflow, analytics) {
    if (!this.apiKey) {
      return {
        available: false,
        message: 'MiniMax API key not configured',
        fallback: true
      };
    }

    const prompt = this.buildBottleneckPrompt(workflow, analytics);

    try {
      const response = await this.callMiniMax(prompt);
      return this.parseBottleneckResponse(response);
    } catch (error) {
      console.error('MiniMax bottleneck analysis failed:', error.message);
      return {
        available: false,
        error: error.message,
        fallback: true
      };
    }
  }

  /**
   * Predict future workflow performance
   * @param {Object} workflow - Workflow definition
   * @param {Object} analytics - Analytics data
   * @param {number} days - Days to predict
   */
  async predictPerformance(workflow, analytics, days = 7) {
    if (!this.apiKey) {
      return {
        available: false,
        message: 'MiniMax API key not configured',
        fallback: true
      };
    }

    const prompt = this.buildPredictionPrompt(workflow, analytics, days);

    try {
      const response = await this.callMiniMax(prompt);
      return this.parsePredictionResponse(response);
    } catch (error) {
      console.error('MiniMax prediction failed:', error.message);
      return {
        available: false,
        error: error.message,
        fallback: true
      };
    }
  }

  /**
   * Build optimization prompt
   * @param {Object} workflow - Workflow definition
   * @param {Object} analytics - Analytics data
   */
  buildOptimizationPrompt(workflow, analytics) {
    const stageAnalysis = Object.entries(analytics.stages || {})
      .map(([stage, metrics]) => `
- ${stage}: 
  - Average time: ${metrics.formatted.avg}
  - Median time: ${metrics.formatted.median}
  - 90th percentile: ${metrics.formatted.p90}
  - Sample size: ${metrics.sampleSize}`
      ).join('');

    const bottleneckInfo = analytics.bottlenecks
      ?.map(b => `- ${b.stageId}: ${b.formatted} (${b.severity} severity)`)
      .join('\n') || 'No clear bottlenecks identified';

    return `You are a workflow optimization expert. Analyze the following Kanban workflow and provide actionable recommendations.

## Workflow Structure
Name: ${workflow.name || 'Unnamed Workflow'}
Stages: ${workflow.stages?.map(s => s.name).join(' → ') || 'N/A'}

## Current Configuration
- WIP Limits: ${workflow.stages?.map(s => `${s.name}: ${s.wipLimit || 'none'}`).join(', ') || 'N/A'}
- Auto-transitions: ${workflow.autoTransitionRules?.length || 0} rules
- Validators: ${workflow.validators?.length || 0} validators

## Performance Data
${stageAnalysis || 'No stage data available'}

## Bottlenecks
${bottleneckInfo}

## Flow Metrics
- Throughput: ${analytics.flow?.throughput?.perDay || 0} cards/day
- Created (period): ${analytics.flow?.created || 0}
- Completion rate: ${((analytics.flow?.completionRate || 0) * 100).toFixed(1)}%

## Optimization Request
Analyze this workflow and provide:
1. Top 3-5 optimization opportunities
2. Specific recommendations for each
3. Expected impact of changes
4. Priority ranking (high/medium/low)
5. Implementation steps

Consider:
- WIP limits (too high/low?)
- Stage durations (bottlenecks?)
- Auto-transition opportunities
- Missing validation gates
- Stage consolidation possibilities

Respond in JSON format:
{
  "optimizations": [
    {
      "id": "opt_1",
      "title": "Short title",
      "description": "Detailed explanation",
      "category": "wip|automation|validation|structure",
      "priority": "high|medium|low",
      "currentState": "what exists now",
      "recommendedChange": "what to change",
      "expectedImpact": "expected improvement",
      "implementation": ["step 1", "step 2"],
      "riskLevel": "low|medium|high",
      "effort": "small|medium|large"
    }
  ],
  "quickWins": ["immediate action 1", "immediate action 2"],
  "summary": "Brief overall assessment"
}`;
  }

  /**
   * Build bottleneck analysis prompt
   */
  buildBottleneckPrompt(workflow, analytics) {
    const stageTimes = Object.entries(analytics.stages || {})
      .map(([stage, metrics]) => `- ${stage}: ${metrics.formatted.avg} (median: ${metrics.formatted.median})`)
      .join('\n');

    return `You are a process improvement analyst. Deep-dive into the bottlenecks in this workflow.

## Stage Timing
${stageTimes || 'No data'}

## Identified Bottlenecks
${analytics.bottlenecks?.map(b => `- ${b.stageId} (${b.severity}): ${b.formatted}`).join('\n') || 'None'}

## Analysis Request
For each bottleneck:
1. Root cause analysis (why is this stage slow?)
2. Contributing factors
3. Impact on overall flow
4. Specific remediation strategies
5. Alternative approaches considered

Respond in JSON format:
{
  "bottlenecks": [
    {
      "stage": "stage name",
      "rootCauses": ["cause 1", "cause 2"],
      "contributingFactors": ["factor 1", "factor 2"],
      "impact": "description of impact",
      "strategies": [
        {
          "approach": "strategy name",
          "description": "how it helps",
          "expectedImprovement": "quantified if possible"
        }
      ],
      "alternativeApproaches": ["alternative 1"]
    }
  ],
  "systemicIssues": ["issue affecting multiple stages"],
  "recommendations": ["top-level recommendation"]
}`;
  }

  /**
   * Build prediction prompt
   */
  buildPredictionPrompt(workflow, analytics, days) {
    return `You are a predictive analytics expert. Forecast workflow performance for the next ${days} days.

## Current State
- Throughput: ${analytics.flow?.throughput?.perDay || 0} cards/day
- WIP: ${analytics.wip?.total || 'unknown'}
- Trend: ${analytics.trends?.stageTimeTrend || 'stable'}

## Request
Predict:
1. Expected throughput
2. Likely bottlenecks
3. Risks and opportunities
4. Recommended adjustments

Respond in JSON format:
{
  "predictions": {
    "throughput": {
      "expectedPerDay": number,
      "range": {"low": number, "high": number},
      "confidence": 0-1
    },
    "bottlenecks": ["likely bottleneck 1"],
    "risks": [{"risk": "description", "likelihood": "high|medium|low"}],
    "opportunities": ["potential improvement 1"]
  },
  "recommendations": ["action to take now"],
  "confidence": "high|medium|low"
}`;
  }

  /**
   * Call MiniMax API
   * @param {string} prompt - Prompt text
   */
  async callMiniMax(prompt) {
    const response = await fetch(`${this.baseUrl}/text/chatcompletion_v2`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { 
            role: 'system', 
            content: 'You are a workflow optimization expert. Always respond with valid JSON.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 2500
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`MiniMax API error: ${error}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content;
  }

  /**
   * Parse optimization response
   * @param {string} response - API response
   */
  parseOptimizationResponse(response) {
    try {
      const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || 
                        response.match(/```\n?([\s\S]*?)\n?```/) ||
                        [null, response];
      
      const json = jsonMatch[1] || response;
      const parsed = JSON.parse(json);

      return {
        available: true,
        optimizations: parsed.optimizations || [],
        quickWins: parsed.quickWins || [],
        summary: parsed.summary || 'No summary provided'
      };
    } catch (error) {
      return {
        available: false,
        error: 'Failed to parse response',
        rawResponse: response
      };
    }
  }

  /**
   * Parse bottleneck response
   */
  parseBottleneckResponse(response) {
    try {
      const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || 
                        response.match(/```\n?([\s\S]*?)\n?```/) ||
                        [null, response];
      
      const json = jsonMatch[1] || response;
      const parsed = JSON.parse(json);

      return {
        available: true,
        bottlenecks: parsed.bottlenecks || [],
        systemicIssues: parsed.systemicIssues || [],
        recommendations: parsed.recommendations || []
      };
    } catch (error) {
      return {
        available: false,
        error: 'Failed to parse response',
        rawResponse: response
      };
    }
  }

  /**
   * Parse prediction response
   */
  parsePredictionResponse(response) {
    try {
      const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || 
                        response.match(/```\n?([\s\S]*?)\n?```/) ||
                        [null, response];
      
      const json = jsonMatch[1] || response;
      const parsed = JSON.parse(json);

      return {
        available: true,
        predictions: parsed.predictions || {},
        recommendations: parsed.recommendations || [],
        confidence: parsed.confidence || 'unknown'
      };
    } catch (error) {
      return {
        available: false,
        error: 'Failed to parse response',
        rawResponse: response
      };
    }
  }

  /**
   * Estimate cost for optimization
   * @param {string} analysisType - Type of analysis
   */
  estimateCost(analysisType = 'optimization') {
    const tokenEstimates = {
      optimization: { input: 1500, output: 800 },
      bottleneck: { input: 1000, output: 600 },
      prediction: { input: 800, output: 400 }
    };

    const estimate = tokenEstimates[analysisType] || tokenEstimates.optimization;
    
    // MiniMax pricing (approximate)
    const inputCostPer1k = 0.0001;
    const outputCostPer1k = 0.0002;

    const cost = (estimate.input / 1000 * inputCostPer1k) + 
                 (estimate.output / 1000 * outputCostPer1k);

    return {
      estimatedCost: cost,
      inputTokens: estimate.input,
      outputTokens: estimate.output
    };
  }
}

export default MinimaxOptimizer;