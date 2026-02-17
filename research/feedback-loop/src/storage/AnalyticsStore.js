import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ANALYTICS_DIR = path.join(__dirname, '../../data/analytics');

/**
 * Storage for calculated analytics and metrics
 */
export class AnalyticsStore {
  constructor() {
    this.analyticsDir = ANALYTICS_DIR;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    await fs.mkdir(this.analyticsDir, { recursive: true });
    this.initialized = true;
  }

  /**
   * Save accuracy metrics for an agent
   */
  async saveAccuracyMetrics(agent, metrics) {
    await this.init();
    
    const filePath = path.join(this.analyticsDir, `${agent}-accuracy.json`);
    const existing = await this.loadJson(filePath, { history: [] });
    
    existing.history.push({
      timestamp: new Date().toISOString(),
      ...metrics
    });
    
    // Keep last 90 days
    if (existing.history.length > 90) {
      existing.history = existing.history.slice(-90);
    }
    
    await fs.writeFile(filePath, JSON.stringify(existing, null, 2));
  }

  /**
   * Get accuracy metrics for an agent
   */
  async getAccuracyMetrics(agent) {
    await this.init();
    
    const filePath = path.join(this.analyticsDir, `${agent}-accuracy.json`);
    return this.loadJson(filePath, { history: [] });
  }

  /**
   * Save pattern analysis results
   */
  async savePatterns(agent, patterns) {
    await this.init();
    
    const filePath = path.join(this.analyticsDir, `${agent}-patterns.json`);
    await fs.writeFile(filePath, JSON.stringify({
      timestamp: new Date().toISOString(),
      patterns
    }, null, 2));
  }

  /**
   * Get patterns for an agent
   */
  async getPatterns(agent) {
    await this.init();
    
    const filePath = path.join(this.analyticsDir, `${agent}-patterns.json`);
    return this.loadJson(filePath, { patterns: [], timestamp: null });
  }

  /**
   * Save recommendations
   */
  async saveRecommendations(agent, recommendations) {
    await this.init();
    
    const filePath = path.join(this.analyticsDir, `${agent}-recommendations.json`);
    await fs.writeFile(filePath, JSON.stringify({
      timestamp: new Date().toISOString(),
      recommendations
    }, null, 2));
  }

  /**
   * Get recommendations for an agent
   */
  async getRecommendations(agent) {
    await this.init();
    
    const filePath = path.join(this.analyticsDir, `${agent}-recommendations.json`);
    return this.loadJson(filePath, { recommendations: [], timestamp: null });
  }

  /**
   * Save trend analysis
   */
  async saveTrends(agent, trends) {
    await this.init();
    
    const filePath = path.join(this.analyticsDir, `${agent}-trends.json`);
    await fs.writeFile(filePath, JSON.stringify({
      timestamp: new Date().toISOString(),
      trends
    }, null, 2));
  }

  /**
   * Get trends for an agent
   */
  async getTrends(agent) {
    await this.init();
    
    const filePath = path.join(this.analyticsDir, `${agent}-trends.json`);
    return this.loadJson(filePath, { trends: [], timestamp: null });
  }

  async loadJson(filePath, defaultValue) {
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return defaultValue;
    }
  }
}