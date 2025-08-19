const uWS = require('uWebSockets.js');
require('dotenv').config();

console.log('🚀 Starting Railway Voice Server...');

// Session management
const sessions = new Map();

// Create WebSocket server
const app = uWS.App();

// WebSocket endpoint for Twilio Media Streams
app.ws('/stream', {
  idleTimeout: 60, // 60 second timeout
  compression: uWS.SHARED_COMPRESSOR,
  maxPayloadLength: 16 * 1024 * 1024, // 16MB max payload
  
  open: (ws) => {
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
  },
  
  message: async (ws, message, isBinary) => {
    try {
      ws.userData.lastHeard = Date.now();
      
      if (isBinary) {
        // Handle audio data from Twilio
        console.log('Received audio data:', message.length, 'bytes');
        
        // For now, just acknowledge receipt
        const response = {
          type: 'ack',
          timestamp: Date.now()
        };
        
        ws.send(JSON.stringify(response));
        
      } else {
        // Handle text messages (for testing)
        const data = JSON.parse(Buffer.from(message).toString());
        console.log('Received text message:', data);
        
        if (data.type === 'text') {
          const response = await handleTextMessage(ws.userData, data.text);
          ws.send(JSON.stringify(response));
        }
      }
    } catch (error) {
      console.error('Error handling message:', error);
      
      const errorResponse = {
        type: 'error',
        message: 'An error occurred while processing your request'
      };
      
      ws.send(JSON.stringify(errorResponse));
    }
  },
  
  close: (ws, code, message) => {
    console.log('WebSocket connection closed:', code, message);
    
    // Clean up session
    if (ws.userData && ws.userData.sessionId) {
      sessions.delete(ws.userData.sessionId);
    }
  }
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
app.get('/health', (res, req) => {
  res.writeStatus('200 OK');
  res.writeHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    activeSessions: sessions.size,
    message: 'Railway Voice Server is running!'
  }));
});

// Start server
const port = process.env.PORT || 3000;
console.log(`Starting server on port ${port}...`);

app.listen(port, (token) => {
  if (token) {
    console.log(`🚀 Railway Voice Server running on port ${port}`);
    console.log(`📡 WebSocket endpoint: ws://localhost:${port}/stream`);
    console.log(`🏥 Health check: http://localhost:${port}/health`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  } else {
    console.error('❌ Failed to start server');
    process.exit(1);
  }
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
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
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
