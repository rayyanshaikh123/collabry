/**
 * AI Engine Proxy Routes
 * Forwards requests to the AI engine server
 */
const express = require('express');
const axios = require('axios');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8000';

/**
 * Proxy middleware for AI engine requests
 */
const proxyToAI = async (req, res) => {
  try {
    // Special handling: /health is at root level, everything else needs /ai prefix
    const path = req.path === '/health' ? '/health' : `/ai${req.path}`;
    const queryString = req.url.includes('?') ? '?' + req.url.split('?')[1] : '';
    const url = `${AI_ENGINE_URL}${path}${queryString}`;
    
    console.log(`Proxying to AI engine: ${url}`);
    
    // Get auth token from request
    const token = req.headers.authorization;
    
    // Check if this is a streaming endpoint
    const isStreaming = req.path.includes('/stream');
    
    if (isStreaming) {
      // Stream response directly without wrapping
      const config = {
        method: req.method,
        url,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: token }),
        },
        ...(req.method !== 'GET' && req.method !== 'HEAD' && { data: req.body }),
        responseType: 'stream'
      };
      
      const response = await axios(config);
      
      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Pipe the stream directly
      response.data.pipe(res);
      
      return;
    }
    
    // Non-streaming: Forward request normally
    const config = {
      method: req.method,
      url,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: token }),
      },
      ...(req.method !== 'GET' && req.method !== 'HEAD' && { data: req.body }),
    };

    const response = await axios(config);
    
    // Return response in standard API format
    res.status(response.status).json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    console.error('AI Proxy Error:', error.message);
    
    if (error.response) {
      // Forward error from AI engine
      res.status(error.response.status).json({
        success: false,
        message: error.response.data?.message || error.response.data?.detail || 'AI engine error',
        error: error.response.data,
      });
    } else {
      // Network or other error
      res.status(503).json({
        success: false,
        message: 'AI engine unavailable',
        error: error.message,
      });
    }
  }
};

// Public routes (no auth)
router.get('/health', proxyToAI);
router.get('/usage/stats', proxyToAI);

// Protected routes (require auth)
router.get('/usage/me', protect, proxyToAI);
router.get('/usage/global', protect, proxyToAI);
router.get('/usage/realtime', protect, proxyToAI);
router.get('/usage/user/:userId', protect, proxyToAI);

// Session routes
router.get('/sessions', protect, proxyToAI);
router.post('/sessions', protect, proxyToAI);
router.get('/sessions/:id', protect, proxyToAI);
router.delete('/sessions/:id', protect, proxyToAI);
router.get('/sessions/:id/messages', protect, proxyToAI);
router.post('/sessions/:id/messages', protect, proxyToAI);

// AI operation routes
router.post('/chat', protect, proxyToAI);
router.post('/chat/stream', protect, proxyToAI);
router.post('/summarize', protect, proxyToAI);
router.post('/summarize/stream', protect, proxyToAI);
router.post('/qa', protect, proxyToAI);
router.post('/qa/stream', protect, proxyToAI);
router.post('/mindmap', protect, proxyToAI);
router.post('/upload', protect, proxyToAI);

module.exports = router;
