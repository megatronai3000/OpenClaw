// minimax-client.js - MiniMax API integration for OpenClaw
const https = require('https');

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || 'sk-cp-EM5rk1-f13-mwFGErtj2ioxr0giXpI5WBNbeTjShVcIJkEizXdKnVl_d_UjuxodiH04G6BJ8oCdfHd5wGs4JWaOLhsoqa5VDPh3twOmngh1f1Q4U9ztzDg4';
const MINIMAX_BASE_URL = 'api.minimax.io';

/**
 * Call MiniMax API for coding tasks
 * Compatible with Claude Code / OpenClaw message format
 */
async function callMiniMax(messages, options = {}) {
  const { model = 'MiniMax-M2.5', maxTokens = 4000, temperature = 0.7 } = options;
  
  const postData = JSON.stringify({
    model,
    messages,
    max_tokens: maxTokens,
    temperature
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: MINIMAX_BASE_URL,
      path: '/v1/text/chatcompletion_v2',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            reject(new Error(`MiniMax API error: ${json.error.message}`));
          } else {
            resolve({
              content: json.choices?.[0]?.message?.content,
              usage: json.usage,
              model: json.model
            });
          }
        } catch (err) {
          reject(new Error(`Parse error: ${err.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Check MiniMax usage
 */
async function getMiniMaxUsage() {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: MINIMAX_BASE_URL,
      path: '/v1/api/openplatform/coding_plan/remains',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * Route task to MiniMax (for coding/architecture)
 */
async function routeToMiniMax(task, context = {}) {
  const messages = [
    {
      role: 'system',
      content: `You are a specialized coding agent. Task type: ${task.type}. ${context.system || ''}`
    },
    {
      role: 'user',
      content: task.prompt
    }
  ];

  const startTime = Date.now();
  const result = await callMiniMax(messages, {
    model: task.model || 'MiniMax-M2.5',
    maxTokens: task.maxTokens || 4000
  });
  const duration = Date.now() - startTime;

  return {
    ...result,
    duration,
    provider: 'minimax',
    cost: 0.01 // Approximate per prompt
  };
}

module.exports = {
  callMiniMax,
  getMiniMaxUsage,
  routeToMiniMax
};
