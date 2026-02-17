/**
 * OpenClaw Quota Reporter
 * 
 * Add this to your OpenClaw config to capture rate limit headers
 * and send them to the dashboard API.
 * 
 * Usage: Add to openclaw.json config or as a plugin
 */

const DASHBOARD_API_URL = 'http://localhost:3001/api/analytics/quotas/report';

/**
 * Extract rate limit headers from API response
 */
function extractRateLimitHeaders(responseHeaders, provider) {
  const headers = {};
  
  // Normalize header names
  const normalized = {};
  if (responseHeaders) {
    for (const [key, value] of Object.entries(responseHeaders)) {
      normalized[key.toLowerCase()] = value;
    }
  }
  
  switch (provider) {
    case 'openai':
      headers['x-ratelimit-limit-requests'] = normalized['x-ratelimit-limit-requests'];
      headers['x-ratelimit-remaining-requests'] = normalized['x-ratelimit-remaining-requests'];
      headers['x-ratelimit-limit-tokens'] = normalized['x-ratelimit-limit-tokens'];
      headers['x-ratelimit-remaining-tokens'] = normalized['x-ratelimit-remaining-tokens'];
      headers['x-ratelimit-reset-tokens'] = normalized['x-ratelimit-reset-tokens'];
      headers['x-model-id'] = normalized['x-model-id'] || normalized['openai-model'];
      break;
      
    case 'anthropic':
      headers['anthropic-ratelimit-requests-limit'] = normalized['anthropic-ratelimit-requests-limit'];
      headers['anthropic-ratelimit-requests-remaining'] = normalized['anthropic-ratelimit-requests-remaining'];
      headers['anthropic-ratelimit-reset'] = normalized['anthropic-ratelimit-reset'];
      headers['anthropic-model'] = normalized['anthropic-model'];
      break;
      
    case 'moonshot':
      headers['x-ratelimit-limit'] = normalized['x-ratelimit-limit'];
      headers['x-ratelimit-remaining'] = normalized['x-ratelimit-remaining'];
      headers['x-model'] = normalized['x-model'];
      break;
  }
  
  // Only return if we found at least one rate limit header
  const hasData = Object.values(headers).some(v => v !== undefined);
  return hasData ? headers : null;
}

/**
 * Report quota data to dashboard
 */
async function reportQuota(provider, model, headers) {
  try {
    const response = await fetch(DASHBOARD_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider,
        model,
        headers,
        timestamp: new Date().toISOString()
      })
    });
    
    if (!response.ok) {
      console.error('Failed to report quota:', await response.text());
    }
  } catch (err) {
    // Silent fail - don't break the main flow
    console.debug('Quota report failed:', err.message);
  }
}

/**
 * Wrap an API call to capture quota headers
 */
function wrapApiCall(apiCall, provider, model) {
  return async function(...args) {
    const result = await apiCall(...args);
    
    // Try to extract headers from result
    let headers = null;
    
    // Different providers return headers in different ways
    if (result?.response?.headers) {
      headers = extractRateLimitHeaders(result.response.headers, provider);
    } else if (result?.headers) {
      headers = extractRateLimitHeaders(result.headers, provider);
    }
    
    if (headers) {
      reportQuota(provider, model || headers['x-model-id'] || headers['anthropic-model'] || 'unknown', headers);
    }
    
    return result;
  };
}

/**
 * Express middleware for capturing outgoing responses
 */
function quotaCaptureMiddleware(provider) {
  return (req, res, next) => {
    const originalEnd = res.end;
    
    res.end = function(...args) {
      // Capture headers
      const headers = extractRateLimitHeaders(res.getHeaders(), provider);
      if (headers) {
        const model = req.body?.model || headers['x-model-id'] || headers['anthropic-model'] || 'unknown';
        reportQuota(provider, model, headers);
      }
      
      originalEnd.apply(res, args);
    };
    
    next();
  };
}

// Export for different integration methods
module.exports = {
  extractRateLimitHeaders,
  reportQuota,
  wrapApiCall,
  quotaCaptureMiddleware,
  DASHBOARD_API_URL
};

// If used as a standalone script
if (require.main === module) {
  console.log('OpenClaw Quota Reporter');
  console.log('Add this module to your OpenClaw configuration to enable quota tracking.');
  console.log('Dashboard API:', DASHBOARD_API_URL);
}