/**
 * Quick test script to verify WebSocket server is working
 * Run this with: node testing/quick-test.js
 */

const WebSocket = require('ws');

console.log('🧪 Testing WebSocket server connection...');

const ws = new WebSocket('ws://localhost:3001');

ws.on('open', () => {
  console.log('✅ Connected to WebSocket server');
  
  // Test join room
  console.log('🧪 Testing room join...');
  ws.send(JSON.stringify({
    event: 'join_room',
    data: {
      roomId: 'TEST123',
      userId: 'test-user-1',
      userName: 'Test User'
    }
  }));
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data);
    console.log('📨 Received:', message);
  } catch (error) {
    console.log('📨 Received (raw):', data.toString());
  }
});

ws.on('close', () => {
  console.log('🔌 Disconnected from server');
  process.exit(0);
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
  process.exit(1);
});

// Close connection after 5 seconds
setTimeout(() => {
  console.log('🧪 Test complete, closing connection...');
  ws.close();
}, 5000);