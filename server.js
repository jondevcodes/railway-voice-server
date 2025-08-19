const express = require('express');
require('dotenv').config();

console.log('🚀 Starting Railway Voice Server...');

// Create Express app
const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Railway Voice Server',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      test: '/test'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'Railway Voice Server is running!'
  });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({
    message: 'Test endpoint working!',
    timestamp: new Date().toISOString()
  });
});

// Start server
const port = process.env.PORT || 3000;
console.log(`Starting server on port ${port}...`);

app.listen(port, () => {
  console.log(`🚀 Railway Voice Server running on port ${port}`);
  console.log(`🏥 Health check: http://localhost:${port}/health`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
