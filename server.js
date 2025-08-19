const uWS = require('uWebSockets.js');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Restaurant functions using Supabase
const restaurantFunctions = {
  async getMenuItemByName(name) {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .ilike('name', `%${name}%`)
        .eq('available', true)
        .single();
      
      if (error || !data) {
        return { error: 'Menu item not found' };
      }
      
      return {
        name: data.name,
        description: data.description,
        price: data.price,
        category: data.category
      };
    } catch (error) {
      return { error: 'Failed to get menu item' };
    }
  },

  async getMenuByCategory(category = null) {
    try {
      let query = supabase.from('menu_items').select('*').eq('available', true);
      if (category) {
        query = query.eq('category', category);
      }
      const { data, error } = await query;
      
      if (error) {
        return { error: 'Failed to get menu' };
      }
      
      return {
        items: data,
        count: data.length
      };
    } catch (error) {
      return { error: 'Failed to get menu' };
    }
  },

  async getRestaurantInfo() {
    try {
      const { data, error } = await supabase
        .from('restaurant_info')
        .select('*')
        .single();
      
      if (error || !data) {
        return { error: 'Restaurant info not found' };
      }
      
      return {
        name: data.name,
        address: data.address,
        phone: data.phone,
        hours: data.hours,
        specialties: data.specialties,
        delivery: data.delivery_info,
        pickup: data.pickup_info
      };
    } catch (error) {
      return { error: 'Failed to get restaurant info' };
    }
  }
};

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
        // TODO: Process audio with Deepgram STT
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

// Handle text messages (for testing without STT)
async function handleTextMessage(session, text) {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('menu')) {
    const menu = await restaurantFunctions.getMenuByCategory();
    if (menu.error) {
      return {
        type: 'tts',
        text: 'I\'m sorry, I couldn\'t retrieve the menu at the moment. Please try again later.'
      };
    } else {
      let menuText = 'Here are some of our popular items: ';
      menu.items.slice(0, 5).forEach(item => {
        menuText += `${item.name} for $${item.price}, `;
      });
      menuText += 'Would you like to place an order?';
      
      return {
        type: 'tts',
        text: menuText
      };
    }
  } else if (lowerText.includes('hours') || lowerText.includes('open')) {
    const info = await restaurantFunctions.getRestaurantInfo();
    if (info.error) {
      return {
        type: 'tts',
        text: 'I\'m sorry, I couldn\'t retrieve our hours at the moment.'
      };
    } else {
      return {
        type: 'tts',
        text: `We are ${info.hours}. ${info.specialties}`
      };
    }
  } else if (lowerText.includes('address') || lowerText.includes('location')) {
    const info = await restaurantFunctions.getRestaurantInfo();
    if (info.error) {
      return {
        type: 'tts',
        text: 'I\'m sorry, I couldn\'t retrieve our address at the moment.'
      };
    } else {
      return {
        type: 'tts',
        text: `We are located at ${info.address}. ${info.pickup}`
      };
    }
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
    activeSessions: sessions.size
  }));
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, (token) => {
  if (token) {
    console.log(`🚀 Railway Voice Server running on port ${port}`);
    console.log(`📡 WebSocket endpoint: ws://localhost:${port}/stream`);
    console.log(`🏥 Health check: http://localhost:${port}/health`);
  } else {
    console.error('❌ Failed to start server');
  }
});

// Send pings every 5 seconds to keep connections alive
setInterval(() => {
  const now = Date.now();
  sessions.forEach((session, sessionId) => {
    if (now - session.lastHeard > 5000) {
      // Send ping to keep connection alive
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
