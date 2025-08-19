# Railway Voice Server

Real-time WebSocket server for handling Twilio Media Streams with low-latency voice interactions.

## Features

- 🚀 Real-time WebSocket connections
- 🎤 Audio streaming support
- 💬 Conversation state management
- 🏥 Health check endpoint
- 🔄 Automatic connection keep-alive

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set environment variables:**
   ```bash
   SUPABASE_URL=your_supabase_url_here
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
   PORT=3000
   ```

3. **Run locally:**
   ```bash
   npm run dev
   ```

4. **Deploy to Railway:**
   - Connect your GitHub repository to Railway
   - Set environment variables in Railway dashboard
   - Deploy automatically

## Endpoints

- **WebSocket:** `ws://localhost:3000/stream`
- **Health Check:** `http://localhost:3000/health`

## Next Steps

1. Integrate Deepgram for real-time STT
2. Add streaming TTS (11labs or similar)
3. Implement full conversation flow
4. Add order processing functionality
