#!/usr/bin/env node
// budget-tracker.js - Accurate daily budget tracking with projections
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'dashboard.db');

// Initialize budget tracking schema
function initBudgetSchema() {
  const db = new Database(DB_PATH);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS budget_daily (
      date TEXT PRIMARY KEY,
      spent REAL DEFAULT 0,
      budget_limit REAL DEFAULT 10,
      notes TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS budget_monthly (
      month TEXT PRIMARY KEY,
      budget_total REAL DEFAULT 300,
      projected_spend REAL,
      actual_spend REAL DEFAULT 0,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_budget_date ON budget_daily(date);
    CREATE INDEX IF NOT EXISTS idx_budget_month ON budget_monthly(month);
  `);
  
  db.close();
  console.log('[Budget] Schema initialized');
}

// Initialize with estimated historical data (Feb 1-12)
function initHistoricalData(totalSpend, startDate, endDate) {
  const db = new Database(DB_PATH);
  
  // Calculate days and daily average
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
  const dailyAverage = totalSpend / days;
  
  console.log(`[Budget] Splitting $${totalSpend} across ${days} days = $${dailyAverage.toFixed(2)}/day`);
  
  // Clear existing data for this period
  db.prepare("DELETE FROM budget_daily WHERE date >= ? AND date <= ?").run(startDate, endDate);
  
  // Insert estimated daily data with some variance (not flat)
  const stmt = db.prepare(`
    INSERT INTO budget_daily (date, spent, budget_limit, notes)
    VALUES (?, ?, ?, ?)
  `);
  
  let remaining = totalSpend;
  
  for (let i = 0; i < days; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    
    // Add some variance (±30%) so it's not perfectly flat
    // Last day gets remainder
    let daySpend;
    if (i === days - 1) {
      daySpend = remaining;
    } else {
      const variance = 0.7 + Math.random() * 0.6; // 0.7 to 1.3
      daySpend = dailyAverage * variance;
      daySpend = Math.min(daySpend, remaining - (dailyAverage * 0.5 * (days - i - 1)));
      daySpend = Math.max(daySpend, 0.50);
    }
    
    daySpend = Math.round(daySpend * 100) / 100;
    remaining -= daySpend;
    remaining = Math.round(remaining * 100) / 100;
    
    stmt.run(dateStr, daySpend, 10, 'Estimated from historical total');
  }
  
  // Update monthly record
  const month = startDate.substring(0, 7);
  db.prepare(`
    INSERT OR REPLACE INTO budget_monthly (month, actual_spend, updated_at)
    VALUES (?, ?, datetime('now'))
  `).run(month, totalSpend);
  
  db.close();
  
  console.log(`[Budget] Initialized ${days} days of historical data`);
  return { days, dailyAverage };
}

// Log today's actual spend (call this daily)
function logDailySpend(date, amount, notes = '') {
  const db = new Database(DB_PATH);
  
  db.prepare(`
    INSERT INTO budget_daily (date, spent, budget_limit, notes, updated_at)
    VALUES (?, ?, 10, ?, datetime('now'))
    ON CONFLICT(date) DO UPDATE SET
      spent = spent + excluded.spent,
      notes = excluded.notes,
      updated_at = datetime('now')
  `).run(date, amount, notes);
  
  // Update monthly total
  const month = date.substring(0, 7);
  const monthTotal = db.prepare(`
    SELECT SUM(spent) as total FROM budget_daily WHERE date LIKE ?
  `).get(month + '%');
  
  db.prepare(`
    INSERT OR REPLACE INTO budget_monthly (month, actual_spend, updated_at)
    VALUES (?, ?, datetime('now'))
  `).run(month, monthTotal.total || 0);
  
  db.close();
  
  console.log(`[Budget] Logged $${amount} for ${date}`);
}

// Get today's status
function getTodayStatus() {
  const db = new Database(DB_PATH);
  const today = new Date().toISOString().split('T')[0];
  
  const todayData = db.prepare(`
    SELECT * FROM budget_daily WHERE date = ?
  `).get(today);
  
  db.close();
  
  if (!todayData) {
    return {
      date: today,
      spent: 0,
      budget: 10,
      remaining: 10,
      percentage: 0,
      status: 'ok'
    };
  }
  
  const remaining = 10 - todayData.spent;
  const percentage = (todayData.spent / 10) * 100;
  
  return {
    date: today,
    spent: todayData.spent,
    budget: 10,
    remaining: remaining,
    percentage: percentage,
    status: percentage > 100 ? 'exceeded' : percentage > 75 ? 'warning' : 'ok'
  };
}

// Get monthly status with projections
function getMonthlyStatus() {
  const db = new Database(DB_PATH);
  const now = new Date();
  const month = now.toISOString().slice(0, 7);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  
  // Get actual spend so far
  const actualSpend = db.prepare(`
    SELECT SUM(spent) as total FROM budget_daily WHERE date LIKE ?
  `).get(month + '%').total || 0;
  
  // Calculate daily average
  const daysWithData = db.prepare(`
    SELECT COUNT(*) as count FROM budget_daily WHERE date LIKE ? AND spent > 0
  `).get(month + '%').count || 1;
  
  const dailyAverage = actualSpend / daysWithData;
  
  // Project month-end
  const projectedSpend = dailyAverage * daysInMonth;
  const remainingBudget = 300 - actualSpend;
  const projectedRemaining = 300 - projectedSpend;
  
  // Days remaining
  const daysRemaining = daysInMonth - dayOfMonth;
  const dailyBurnRate = actualSpend / dayOfMonth;
  const onTrackDaily = 300 / daysInMonth;
  
  db.close();
  
  return {
    month: month,
    dayOfMonth: dayOfMonth,
    daysInMonth: daysInMonth,
    daysRemaining: daysRemaining,
    actualSpend: actualSpend,
    remainingBudget: remainingBudget,
    dailyAverage: dailyAverage,
    dailyBurnRate: dailyBurnRate,
    onTrackDaily: onTrackDaily,
    projectedSpend: projectedSpend,
    projectedRemaining: projectedRemaining,
    status: projectedSpend > 300 ? 'over-budget' : projectedSpend > 250 ? 'warning' : 'ok'
  };
}

// Get trend analysis
function getTrendAnalysis() {
  const db = new Database(DB_PATH);
  const month = new Date().toISOString().slice(0, 7);
  
  const dailyData = db.prepare(`
    SELECT date, spent FROM budget_daily 
    WHERE date LIKE ? AND spent > 0
    ORDER BY date
  `).all(month + '%');
  
  if (dailyData.length < 2) {
    db.close();
    return { trend: 'insufficient-data' };
  }
  
  // Calculate 3-day moving average
  const recent = dailyData.slice(-3);
  const avg3Day = recent.reduce((sum, d) => sum + d.spent, 0) / recent.length;
  
  // Compare to overall average
  const overallAvg = dailyData.reduce((sum, d) => sum + d.spent, 0) / dailyData.length;
  
  const trend = avg3Day > overallAvg * 1.2 ? 'increasing' : 
                avg3Day < overallAvg * 0.8 ? 'decreasing' : 'stable';
  
  db.close();
  
  return {
    trend: trend,
    recent3DayAvg: avg3Day,
    overallAvg: overallAvg,
    dailyData: dailyData
  };
}

// Generate full report
function generateBudgetReport() {
  const today = getTodayStatus();
  const monthly = getMonthlyStatus();
  const trend = getTrendAnalysis();
  
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║           BUDGET TRACKING REPORT                       ║');
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log(`║  TODAY (${today.date})                                  ║`);
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log(`║  Spent:        $${today.spent.toFixed(2).padStart(8)}                              ║`);
  console.log(`║  Budget:       $${today.budget.toFixed(2).padStart(8)}                              ║`);
  console.log(`║  Remaining:    $${today.remaining.toFixed(2).padStart(8)} ${today.status === 'exceeded' ? '⚠️' : '✅'}                          ║`);
  console.log(`║  Usage:        ${today.percentage.toFixed(1)}%${' '.repeat(30 - today.percentage.toFixed(1).length)}║`);
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log(`║  THIS MONTH (${monthly.month})                           ║`);
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log(`║  Day ${monthly.dayOfMonth} of ${monthly.daysInMonth}                                    ║`);
  console.log(`║  Spent:        $${monthly.actualSpend.toFixed(2).padStart(8)}                              ║`);
  console.log(`║  Budget:       $300.00                                ║`);
  console.log(`║  Remaining:    $${monthly.remainingBudget.toFixed(2).padStart(8)}                              ║`);
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log(`║  BURN RATE & PROJECTIONS                               ║`);
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log(`║  Daily Average:    $${monthly.dailyAverage.toFixed(2)}/day                        ║`);
  console.log(`║  On-Track Daily:   $${monthly.onTrackDaily.toFixed(2)}/day                        ║`);
  console.log(`║  Projected Month:  $${monthly.projectedSpend.toFixed(2)}                        ║`);
  console.log(`║  Trend:            ${trend.trend.toUpperCase().padEnd(20)}          ║`);
  console.log(`║  Status:           ${monthly.status.toUpperCase().padEnd(20)}          ║`);
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  return { today, monthly, trend };
}

// API endpoint handler for dashboard
function getBudgetAPIResponse() {
  const today = getTodayStatus();
  const monthly = getMonthlyStatus();
  const trend = getTrendAnalysis();
  
  return {
    today: {
      date: today.date,
      spent: today.spent,
      budget: today.budget,
      remaining: today.remaining,
      percentage: today.percentage,
      status: today.status
    },
    month: {
      month: monthly.month,
      day: monthly.dayOfMonth,
      daysInMonth: monthly.daysInMonth,
      spent: monthly.actualSpend,
      budget: 300,
      remaining: monthly.remainingBudget,
      projectedSpend: monthly.projectedSpend,
      projectedRemaining: monthly.projectedRemaining,
      status: monthly.status
    },
    burnRate: {
      dailyAverage: monthly.dailyAverage,
      onTrackDaily: monthly.onTrackDaily,
      daysRemaining: monthly.daysRemaining
    },
    trend: {
      direction: trend.trend,
      recent3DayAvg: trend.recent3DayAvg,
      overallAvg: trend.overallAvg
    }
  };
}

module.exports = {
  initBudgetSchema,
  initHistoricalData,
  logDailySpend,
  getTodayStatus,
  getMonthlyStatus,
  getTrendAnalysis,
  generateBudgetReport,
  getBudgetAPIResponse
};

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (command === 'init') {
    initBudgetSchema();
    // Initialize with $45.86 from Feb 1-12
    initHistoricalData(45.86, '2026-02-01', '2026-02-12');
    console.log('\n✅ Historical data initialized for Feb 1-12');
    console.log('Run "node budget-tracker.js" to see report');
  } else if (command === 'log' && args[1] && args[2]) {
    // Usage: node budget-tracker.js log 2026-02-13 5.50 "notes"
    logDailySpend(args[1], parseFloat(args[2]), args[3] || '');
  } else {
    initBudgetSchema();
    generateBudgetReport();
  }
}
