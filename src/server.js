/**
 * Express Server for Gemini 1.5 Pro API
 * 
 * This is a standalone Express server that can be used to run the Gemini API
 * independently of the Next.js application.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import API routes
const apiRoutes = require('./routes/apiRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increase limit for base64 images
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'MedGemma 4B API Server',
    version: '1.0.0',
    endpoints: {
      'POST /api/analyze-medicine': 'Analyze medicine images with MedGemma 4B',
      'GET /api/health': 'Health check endpoint',
      'GET /api/token-status/:userId': 'Check user token balance'
    },
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Server Error:', error);
  res.status(500).json({
    status: 'ERROR',
    message: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'ERROR',
    message: 'Endpoint not found',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Gemini 1.5 Pro API Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔍 Medicine analysis: POST http://localhost:${PORT}/api/analyze-medicine`);
  console.log(`💰 Token status: GET http://localhost:${PORT}/api/token-status/:userId`);
});

module.exports = app;
