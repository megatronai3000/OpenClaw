/**
 * AnalyticsStore - Storage for analytics data
 */
export class AnalyticsStore {
  constructor() {
    this.metrics = new Map();
    this.reports = new Map();
  }

  /**
   * Save a metric
   * @param {string} key - Metric key
   * @param {Object} data - Metric data
   */
  async saveMetric(key, data) {
    const existing = this.metrics.get(key) || [];
    existing.push({
      ...data,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 1000 entries per key
    if (existing.length > 1000) {
      existing.shift();
    }
    
    this.metrics.set(key, existing);
    return data;
  }

  /**
   * Get metrics by key
   * @param {string} key - Metric key
   */
  async getMetric(key) {
    return this.metrics.get(key) || [];
  }

  /**
   * Save a report
   * @param {string} projectId - Project ID
   * @param {Object} report - Report data
   */
  async saveReport(projectId, report) {
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const reportData = {
      id: reportId,
      projectId,
      ...report,
      savedAt: new Date().toISOString()
    };
    
    const existing = this.reports.get(projectId) || [];
    existing.push(reportData);
    
    // Keep only last 50 reports per project
    if (existing.length > 50) {
      existing.shift();
    }
    
    this.reports.set(projectId, existing);
    return reportData;
  }

  /**
   * Get reports for a project
   * @param {string} projectId - Project ID
   */
  async getReports(projectId) {
    return this.reports.get(projectId) || [];
  }

  /**
   * Get latest report for a project
   * @param {string} projectId - Project ID
   */
  async getLatestReport(projectId) {
    const reports = this.reports.get(projectId) || [];
    return reports.length > 0 ? reports[reports.length - 1] : null;
  }

  /**
   * Query metrics with time range
   * @param {string} key - Metric key
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   */
  async queryMetrics(key, startDate, endDate) {
    const metrics = this.metrics.get(key) || [];
    
    return metrics.filter(m => {
      const timestamp = new Date(m.timestamp);
      return timestamp >= startDate && timestamp <= endDate;
    });
  }

  /**
   * Get all metric keys
   */
  async getMetricKeys() {
    return Array.from(this.metrics.keys());
  }

  /**
   * Clear old data
   * @param {number} days - Keep data for this many days
   */
  async prune(days = 90) {
    const cutoff = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
    
    for (const [key, metrics] of this.metrics) {
      const filtered = metrics.filter(m => new Date(m.timestamp) >= cutoff);
      this.metrics.set(key, filtered);
    }
    
    return { pruned: true, cutoff };
  }
}

export default AnalyticsStore;