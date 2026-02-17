const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

// Initialize quota tracking database
const DATA_DIR = path.join(__dirname, 'data');
if (!require('fs').existsSync(DATA_DIR)) {
  require('fs').mkdirSync(DATA_DIR, { recursive: true });
}
const db = new Database(path.join(DATA_DIR, 'dashboard.db'));

// Ensure quota table exists
db.exec(`
  CREATE TABLE IF NOT EXISTS provider_quota_snapshots (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    requests_limit INTEGER,
    requests_remaining INTEGER,
    tokens_limit INTEGER,
    tokens_remaining INTEGER,
    reset_time TEXT,
    raw_headers TEXT
  );
`);

/**
 * Extract quota info from provider response headers
 */
function extractQuotaInfo(provider, headers) {
  const normalizedHeaders = {};
  for (const [key, value] of Object.entries(headers)) {
    normalizedHeaders[key.toLowerCase()] = value;
  }

  const now = new Date();
  
  switch (provider) {
    case 'openai':
      return {
        provider: 'openai',
        model: normalizedHeaders['x-model-id'] || 'unknown',
        requestsLimit: parseInt(normalizedHeaders['x-ratelimit-limit-requests']) || null,
        requestsRemaining: parseInt(normalizedHeaders['x-ratelimit-remaining-requests']) || null,
        tokensLimit: parseInt(normalizedHeaders['x-ratelimit-limit-tokens']) || null,
        tokensRemaining: parseInt(normalizedHeaders['x-ratelimit-remaining-tokens']) || null,
        resetTime: normalizedHeaders['x-ratelimit-reset-tokens'] || null
      };
      
    case 'anthropic':
      // Anthropic uses different header format
      const anthropicLimit = normalizedHeaders['anthropic-ratelimit-requests-limit'];
      const anthropicRemaining = normalizedHeaders['anthropic-ratelimit-requests-remaining'];
      return {
        provider: 'anthropic',
        model: normalizedHeaders['anthropic-model'] || 'unknown',
        requestsLimit: anthropicLimit ? parseInt(anthropicLimit) : null,
        requestsRemaining: anthropicRemaining ? parseInt(anthropicRemaining) : null,
        tokensLimit: null, // Anthropic doesn't expose token limits in headers
        tokensRemaining: null,
        resetTime: normalizedHeaders['anthropic-ratelimit-reset'] || null
      };
      
    case 'moonshot':
      // Moonshot/Kimi headers
      return {
        provider: 'moonshot',
        model: normalizedHeaders['x-model'] || 'unknown',
        requestsLimit: parseInt(normalizedHeaders['x-ratelimit-limit']) || null,
        requestsRemaining: parseInt(normalizedHeaders['x-ratelimit-remaining']) || null,
        tokensLimit: null,
        tokensRemaining: null,
        resetTime: null
      };
      
    default:
      return null;
  }
}

/**
 * Store quota snapshot
 */
function storeQuotaSnapshot(quotaInfo, rawHeaders) {
  if (!quotaInfo) return;
  
  const { v4: uuidv4 } = require('uuid');
  const stmt = db.prepare(`
    INSERT INTO provider_quota_snapshots 
    (id, provider, model, requests_limit, requests_remaining, tokens_limit, tokens_remaining, reset_time, raw_headers)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    uuidv4(),
    quotaInfo.provider,
    quotaInfo.model,
    quotaInfo.requestsLimit,
    quotaInfo.requestsRemaining,
    quotaInfo.tokensLimit,
    quotaInfo.tokensRemaining,
    quotaInfo.resetTime,
    JSON.stringify(rawHeaders)
  );
  
  // Clean up old snapshots (keep last 100 per provider)
  db.prepare(`
    DELETE FROM provider_quota_snapshots 
    WHERE id NOT IN (
      SELECT id FROM provider_quota_snapshots 
      WHERE provider = ? 
      ORDER BY timestamp DESC 
      LIMIT 100
    )
  `).run(quotaInfo.provider);
}

/**
 * Get latest quota data for dashboard
 */
function getLatestQuotas() {
  // Get the most recent snapshot per provider/model
  const latest = db.prepare(`
    SELECT provider, model, 
           requests_limit, requests_remaining,
           tokens_limit, tokens_remaining,
           reset_time, timestamp
    FROM provider_quota_snapshots
    WHERE (provider, model, timestamp) IN (
      SELECT provider, model, MAX(timestamp)
      FROM provider_quota_snapshots
      GROUP BY provider, model
    )
    ORDER BY provider, model
  `).all();
  
  return latest.map(row => ({
    provider: row.provider,
    model: row.model,
    limits: {
      requestsPerMinute: row.requests_limit || 60,
      tokensPerMinute: row.tokens_limit || 100000,
    },
    currentUsage: {
      requestsUsed: row.requests_limit && row.requests_remaining ? 
        row.requests_limit - row.requests_remaining : 0,
      tokensUsed: row.tokens_limit && row.tokens_remaining ? 
        row.tokens_limit - row.tokens_remaining : 0,
      requestsRemaining: row.requests_remaining || 60,
      tokensRemaining: row.tokens_remaining || 100000,
      resetTime: row.reset_time || new Date(Date.now() + 60000).toISOString()
    },
    status: calculateStatus(row.requests_remaining, row.requests_limit),
    lastUpdated: row.timestamp
  }));
}

function calculateStatus(remaining, limit) {
  if (!remaining || !limit) return 'unknown';
  const pct = remaining / limit;
  if (pct < 0.1) return 'critical';
  if (pct < 0.3) return 'warning';
  return 'healthy';
}

// Express middleware to capture response headers
function quotaCaptureMiddleware(provider) {
  return (req, res, next) => {
    const originalEnd = res.end;
    const chunks = [];
    
    res.end = function(chunk, encoding) {
      if (chunk) chunks.push(Buffer.from(chunk, encoding));
      
      // Capture headers after response is complete
      try {
        const quotaInfo = extractQuotaInfo(provider, res.getHeaders());
        if (quotaInfo) {
          storeQuotaSnapshot(quotaInfo, res.getHeaders());
        }
      } catch (err) {
        console.error('Failed to capture quota:', err);
      }
      
      originalEnd.apply(res, arguments);
    };
    
    next();
  };
}

module.exports = {
  extractQuotaInfo,
  storeQuotaSnapshot,
  getLatestQuotas,
  quotaCaptureMiddleware
};