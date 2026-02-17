/**
 * MiniMax API Client for advanced pattern analysis
 * Uses MiniMax for LLM-powered insights
 */
export class MinimaxClient {
  constructor(apiKey = null) {
    this.apiKey = apiKey || process.env.MINIMAX_API_KEY;
    this.baseUrl = 'https://api.minimax.chat/v1';
    this.model = 'abab6.5-chat'; // Cost-effective model
  }

  /**
   * Analyze patterns using MiniMax LLM
   * @param {Array} decisions - Decision data
   * @param {Object} stats - Pre-calculated statistics
   */
  async analyzePatterns(decisions, stats = {}) {
    const prompt = this.buildPatternPrompt(decisions, stats);
    
    try {
      const response = await this.callMiniMax(prompt);
      return this.parsePatternResponse(response);
    } catch (error) {
      console.error('MiniMax analysis failed:', error.message);
      return {
        available: false,
        error: error.message,
        fallback: true
      };
    }
  }

  /**
   * Generate improvement recommendations using MiniMax
   * @param {Object} analysis - Full analysis results
   * @param {string} agent - Agent identifier
   */
  async generateRecommendations(analysis, agent) {
    const prompt = this.buildRecommendationPrompt(analysis, agent);
    
    try {
      const response = await this.callMiniMax(prompt);
      return this.parseRecommendationResponse(response);
    } catch (error) {
      console.error('MiniMax recommendation failed:', error.message);
      return {
        available: false,
        error: error.message,
        fallback: true
      };
    }
  }

  /**
   * Build prompt for pattern analysis
   */
  buildPatternPrompt(decisions, stats) {
    // Summarize decision data for the prompt
    const summary = this.summarizeDecisions(decisions);
    
    return `You are an expert AI behavior analyst. Analyze the following agent decision data and identify patterns.

## Decision Summary
- Total decisions: ${summary.total}
- Success rate: ${(summary.successRate * 100).toFixed(1)}%
- Tasks performed: ${Object.keys(summary.byTask).join(', ')}

## Task Performance
${Object.entries(summary.byTask)
  .map(([task, data]) => `- ${task}: ${data.success}/${data.total} successful (${(data.rate * 100).toFixed(0)}%)`)
  .join('\n')}

## Recent Decisions (last 10)
${decisions.slice(-10).map((d, i) => 
  `${i + 1}. [${d.outcome?.success ? '✓' : '✗'}] ${d.task} - ${d.outcome?.feedback || 'No feedback'}`
).join('\n')}

## Analysis Request
Identify 3-5 key patterns in this data:
1. What types of decisions succeed most often?
2. What factors correlate with failure?
3. Are there any surprising insights?
4. What should the agent do more/less of?

Respond in JSON format:
{
  "patterns": [
    {
      "type": "task|context|timing|confidence",
      "description": "clear pattern description",
      "confidence": 0.0-1.0,
      "evidence": "supporting evidence"
    }
  ],
  "keyInsights": ["insight 1", "insight 2"],
  "anomalies": ["any unusual patterns"]
}`;
  }

  /**
   * Build prompt for recommendations
   */
  buildRecommendationPrompt(analysis, agent) {
    return `You are an expert AI coach. Based on the following performance analysis for agent "${agent}", provide actionable recommendations.

## Performance Overview
- Overall accuracy: ${(analysis.accuracy?.overall?.accuracy * 100).toFixed(1)}%
- Trend: ${analysis.trends?.accuracyTrend?.direction}
- Sample size: ${analysis.patterns?.sampleSize} decisions

## Task Breakdown
${Object.entries(analysis.accuracy?.byTask || {})
  .map(([task, data]) => `- ${task}: ${(data.accuracy * 100).toFixed(0)}% accuracy`)
  .join('\n')}

## Detected Patterns
${(analysis.patterns?.commonFactors || [])
  .map(f => `- ${f.finding} (strength: ${(f.strength * 100).toFixed(0)}%)`)
  .join('\n') || 'No clear patterns detected'}

## Recommendation Request
Provide 3-5 specific, actionable recommendations:
1. What should this agent focus on improving?
2. What should they keep doing?
3. What new behaviors should they adopt?
4. What behaviors should they avoid?

For each recommendation, include:
- Priority (high/medium/low)
- Expected impact
- How to implement

Respond in JSON format:
{
  "recommendations": [
    {
      "id": "rec_1",
      "title": "short title",
      "description": "detailed description",
      "category": "skill|behavior|process|tool",
      "priority": "high|medium|low",
      "expectedImpact": "description",
      "implementation": "how to implement",
      "metrics": ["how to measure success"]
    }
  ],
  "summary": "brief overall summary"
}`;
  }

  /**
   * Call MiniMax API
   */
  async callMiniMax(prompt) {
    if (!this.apiKey) {
      throw new Error('MiniMax API key not configured');
    }

    const response = await fetch(`${this.baseUrl}/text/chatcompletion_v2`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: 'You are an expert AI analyst. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 2000
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
   * Parse pattern analysis response
   */
  parsePatternResponse(response) {
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || 
                        response.match(/```\n?([\s\S]*?)\n?```/) ||
                        [null, response];
      
      const json = jsonMatch[1] || response;
      return JSON.parse(json);
    } catch (error) {
      // Fallback: return raw response
      return {
        rawResponse: response,
        parseError: error.message
      };
    }
  }

  /**
   * Parse recommendation response
   */
  parseRecommendationResponse(response) {
    return this.parsePatternResponse(response);
  }

  /**
   * Summarize decisions for prompt
   */
  summarizeDecisions(decisions) {
    const withOutcomes = decisions.filter(d => d.outcome);
    const successful = withOutcomes.filter(d => d.outcome.success);

    const byTask = {};
    for (const d of withOutcomes) {
      const task = d.task || 'unknown';
      if (!byTask[task]) {
        byTask[task] = { total: 0, success: 0, rate: 0 };
      }
      byTask[task].total++;
      if (d.outcome.success) byTask[task].success++;
    }

    for (const task of Object.keys(byTask)) {
      byTask[task].rate = byTask[task].success / byTask[task].total;
    }

    return {
      total: withOutcomes.length,
      successRate: successful.length / withOutcomes.length,
      byTask
    };
  }

  /**
   * Estimate cost for analysis
   */
  estimateCost(decisionCount) {
    // MiniMax pricing (approximate)
    const inputTokensPerDecision = 50;
    const outputTokens = 500;
    const inputCostPer1k = 0.0001;
    const outputCostPer1k = 0.0002;

    const inputTokens = decisionCount * inputTokensPerDecision + 500; // Base prompt
    const cost = (inputTokens / 1000 * inputCostPer1k) + 
                 (outputTokens / 1000 * outputCostPer1k);

    return {
      estimatedCost: cost,
      inputTokens,
      outputTokens
    };
  }
}