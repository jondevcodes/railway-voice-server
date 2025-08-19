const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
require('dotenv').config();

console.log('🚀 Starting Railway Voice Server...');

// Create Express app
const app = express();
const server = http.createServer(app);

// Session management
const sessions = new Map();

// Create WebSocket server
const wss = new WebSocketServer({ server });

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('WebSocket connection opened');
  
  // Initialize session data
  ws.userData = {
    sessionId: Date.now().toString(),
    lastHeard: Date.now(),
    conversationState: 'greeting',
    customerName: '',
    currentOrder: []
  };
  
  sessions.set(ws.userData.sessionId, ws.userData);
  
  // Send initial greeting
  const greeting = {
    type: 'tts',
    text: 'Hello! Welcome to Myrtle Beach Seafood & Grill! I can help you with our menu, place orders, and provide restaurant information. How can I assist you today?'
  };
  
  ws.send(JSON.stringify(greeting));
  
  // Handle messages
  ws.on('message', async (message) => {
    try {
      ws.userData.lastHeard = Date.now();
      
      // Try to parse as JSON first (text messages)
      try {
        const data = JSON.parse(message.toString());
        console.log('Received text message:', data);
        
        if (data.type === 'text') {
          const response = await handleTextMessage(ws.userData, data.text);
          ws.send(JSON.stringify(response));
        }
      } catch (parseError) {
        // If not JSON, treat as binary audio data
        console.log('Received audio data:', message.length, 'bytes');
        
        const response = {
          type: 'ack',
          timestamp: Date.now()
        };
        
        ws.send(JSON.stringify(response));
      }
    } catch (error) {
      console.error('Error handling message:', error);
      
      const errorResponse = {
        type: 'error',
        message: 'An error occurred while processing your request'
      };
      
      ws.send(JSON.stringify(errorResponse));
    }
  });
  
  // Handle connection close
  ws.on('close', (code, reason) => {
    console.log('WebSocket connection closed:', code, reason);
    
    // Clean up session
    if (ws.userData && ws.userData.sessionId) {
      sessions.delete(ws.userData.sessionId);
    }
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Handle text messages (simple responses for now)
async function handleTextMessage(session, text) {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('menu')) {
    return {
      type: 'tts',
      text: 'Here are some of our popular items: Classic Cheeseburger for $12.99, Grilled Chicken Breast for $14.99, Margherita Pizza for $16.99, Caesar Salad for $9.99, and Chocolate Cake for $6.99. Would you like to place an order?'
    };
  } else if (lowerText.includes('hours') || lowerText.includes('open')) {
    return {
      type: 'tts',
      text: 'We are open daily from 11:00 AM to 10:00 PM. We specialize in fresh seafood, grilled specialties, and local favorites.'
    };
  } else if (lowerText.includes('address') || lowerText.includes('location')) {
    return {
      type: 'tts',
      text: 'We are located at 123 Ocean Boulevard, Myrtle Beach, South Carolina 29577. We offer pickup for all orders and delivery for orders over $25.'
    };
  } else if (lowerText.includes('order') || lowerText.includes('food')) {
    return {
      type: 'tts',
      text: 'Great! I\'d be happy to help you place an order. Please spell out your full name clearly, and then tell me what you\'d like to order.'
    };
  } else if (lowerText.includes('goodbye') || lowerText.includes('bye')) {
    return {
      type: 'tts',
      text: 'Thank you for calling Myrtle Beach Seafood & Grill. Have a great day!'
    };
  } else {
    return {
      type: 'tts',
      text: `I heard you say "${text}". I can help you with our menu, hours, location, or placing an order. What would you like to know?`
    };
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    activeSessions: sessions.size,
    message: 'Railway Voice Server is running!'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Railway Voice Server',
    status: 'running',
    endpoints: {
      health: '/health',
      websocket: '/stream'
    }
  });
});

// Start server
const port = process.env.PORT || 3000;
console.log(`Starting server on port ${port}...`);

server.listen(port, () => {
  console.log(`🚀 Railway Voice Server running on port ${port}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${port}/stream`);
  console.log(`🏥 Health check: http://localhost:${port}/health`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Send pings every 5 seconds to keep connections alive
setInterval(() => {
  const now = Date.now();
  sessions.forEach((session, sessionId) => {
    if (now - session.lastHeard > 5000) {
      console.log('Sending ping to session:', sessionId);
    }
  });
}, 5000);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
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
