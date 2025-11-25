// routes/ai.js
// Proxy routes for AI service - backend acts as intermediary between frontend and AI service
const express = require('express');
const axios = require('axios');
const router = express.Router();

// AI Service URL from environment variable
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-service:8000';

/**
 * Proxy endpoint for AI plan generation
 * POST /api/ai/plan
 */
router.post('/plan', async (req, res) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/api/agent/plan`, req.body, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 60000, // 60 second timeout for AI processing
    });
    res.json(response.data);
  } catch (error) {
    console.error('AI Service Error (plan):', error.message);
    if (error.response) {
      res.status(error.response.status).json({
        error: error.response.data?.error || 'AI service error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    } else if (error.request) {
      res.status(503).json({
        error: 'AI service unavailable',
        message: 'The AI service is not responding. Please try again later.',
      });
    } else {
      res.status(500).json({
        error: 'Failed to process AI request',
        message: error.message,
      });
    }
  }
});

/**
 * Proxy endpoint for AI chat queries
 * POST /api/ai/query
 */
router.post('/query', async (req, res) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/api/agent/query`, req.body, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 60000, // 60 second timeout for AI processing
    });
    res.json(response.data);
  } catch (error) {
    console.error('AI Service Error (query):', error.message);
    if (error.response) {
      res.status(error.response.status).json({
        error: error.response.data?.error || 'AI service error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    } else if (error.request) {
      res.status(503).json({
        error: 'AI service unavailable',
        message: 'The AI service is not responding. Please try again later.',
      });
    } else {
      res.status(500).json({
        error: 'Failed to process AI request',
        message: error.message,
      });
    }
  }
});

/**
 * Health check endpoint for AI service
 * GET /api/ai/health
 */
router.get('/health', async (req, res) => {
  try {
    const response = await axios.get(`${AI_SERVICE_URL}/api/agent/health`, {
      timeout: 5000,
    });
    res.json(response.data);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'AI service unavailable',
    });
  }
});

module.exports = router;

