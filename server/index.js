/**
 * WatchSync WebSocket Server
 * Handles room management and event broadcasting for video synchronization
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ 
  server,
  path: '/' 
});

app.use(cors());
app.use(express.json());

// In-memory storage for rooms and users
const rooms = new Map();
const users = new Map();

// Utility functions
function generateRoomId() {
  return Math.random().toString(36).substr(2, 8).toUpperCase();
}

function createRoom(roomId, creatorId) {
  const room = {
    id: roomId,
    participants: new Map(),
    createdAt: Date.now(),
    videoState: {
      isPlaying: false,
      currentTime: 0,
      lastUpdate: Date.now()
    }
  };
  
  rooms.set(roomId, room);
  console.log(`🏠 Room created: ${roomId} by user ${creatorId}`);
  return room;
}

function addUserToRoom(roomId, userId, userData) {
  const room = rooms.get(roomId);
  if (!room) return null;
  
  const participant = {
    id: userId,
    name: userData.name || `User ${userId.slice(-4)}`,
    joinedAt: Date.now(),
    lastSeen: Date.now()
  };
  
  room.participants.set(userId, participant);
  users.set(userId, { ...userData, roomId });
  
  console.log(`👤 User ${userId} joined room ${roomId}`);
  return participant;
}

function removeUserFromRoom(roomId, userId) {
  const room = rooms.get(roomId);
  if (!room) return false;
  
  room.participants.delete(userId);
  users.delete(userId);
  
  // Delete empty rooms
  if (room.participants.size === 0) {
    rooms.delete(roomId);
    console.log(`🗑️ Empty room ${roomId} deleted`);
  }
  
  console.log(`👋 User ${userId} left room ${roomId}`);
  return true;
}

function broadcastToRoom(roomId, event, data, excludeUserId = null) {
  const room = rooms.get(roomId);
  if (!room) return false;
  
  // Find all connected WebSocket clients in this room
  wss.clients.forEach((client) => {
    if (client.roomId === roomId && client.id !== excludeUserId && client.readyState === WebSocket.OPEN) {
      sendToClient(client, event, data);
    }
  });
  
  return true;
}

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log(`🔌 User connected`);
  
  ws.userId = null;
  ws.roomId = null;
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('📥 Received message:', data);
      
      switch (data.event) {
        case 'join_room':
          handleJoinRoom(ws, data.data);
          break;
        case 'leave_room':
          handleLeaveRoom(ws, data.data);
          break;
        case 'video_event':
          handleVideoEvent(ws, data.data);
          break;
        case 'get_room_info':
          handleGetRoomInfo(ws, data.data);
          break;
        default:
          sendToClient(ws, 'error', { message: 'Unknown event type' });
      }
    } catch (error) {
      console.error('❌ Failed to parse message:', error);
      sendToClient(ws, 'error', { message: 'Invalid message format' });
    }
  });
  
  ws.on('close', () => {
    console.log(`🔌 User disconnected`);
    
    if (ws.roomId) {
      const room = rooms.get(ws.roomId);
      if (room) {
        removeUserFromRoom(ws.roomId, ws.id);
        
        // Notify others in the room
        broadcastToRoom(ws.roomId, 'user_left', {
          userId: ws.userId,
          participantCount: room.participants.size
        }, ws.id);
      }
    }
  });
});

function sendToClient(ws, event, data) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ event, data, timestamp: Date.now() }));
  }
}

function handleJoinRoom(ws, data) {
  const { roomId, userId, userName } = data;
  
  console.log(`📥 Join room request: ${userId} -> ${roomId}`);
  
  let room = rooms.get(roomId);
  if (!room) {
    room = createRoom(roomId, userId);
  }
  
  // Store user info on websocket
  ws.userId = userId;
  ws.roomId = roomId;
  ws.id = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const participant = addUserToRoom(roomId, ws.id, { 
    userId, 
    name: userName 
  });
  
  if (participant) {
    // Send room state to the joining user
    sendToClient(ws, 'room_joined', {
      roomId,
      participants: Array.from(room.participants.values()),
      videoState: room.videoState
    });
    
    // Notify others in the room
    broadcastToRoom(roomId, 'user_joined', {
      participant,
      participantCount: room.participants.size
    }, ws.id);
    
    console.log(`✅ User ${userId} successfully joined room ${roomId}`);
  } else {
    sendToClient(ws, 'error', { message: 'Failed to join room' });
  }
}

function handleLeaveRoom(ws, data) {
  if (ws.roomId) {
    const room = rooms.get(ws.roomId);
    if (room) {
      removeUserFromRoom(ws.roomId, ws.id);
      
      // Notify others in the room
      broadcastToRoom(ws.roomId, 'user_left', {
        userId: ws.userId,
        participantCount: room.participants.size
      }, ws.id);
    }
    
    ws.roomId = null;
    ws.userId = null;
  }
}

function handleVideoEvent(ws, data) {
  if (!ws.roomId) {
    sendToClient(ws, 'error', { message: 'Not in a room' });
    return;
  }
  
  const room = rooms.get(ws.roomId);
  if (!room) {
    sendToClient(ws, 'error', { message: 'Room not found' });
    return;
  }
  
  console.log(`🎮 Video event in room ${ws.roomId}:`, data);
  
  // Update room video state
  if (data.type === 'play') {
    room.videoState.isPlaying = true;
    room.videoState.currentTime = data.currentTime;
    room.videoState.lastUpdate = Date.now();
  } else if (data.type === 'pause') {
    room.videoState.isPlaying = false;
    room.videoState.currentTime = data.currentTime;
    room.videoState.lastUpdate = Date.now();
  } else if (data.type === 'seek') {
    room.videoState.currentTime = data.currentTime;
    room.videoState.lastUpdate = Date.now();
  }
  
  // Broadcast to all other users in the room
  broadcastToRoom(ws.roomId, 'sync_video', {
    type: data.type,
    currentTime: data.currentTime,
    timestamp: Date.now(),
    userId: ws.userId
  }, ws.id);
}

function handleGetRoomInfo(ws, roomId) {
  const room = rooms.get(roomId);
  if (room) {
    sendToClient(ws, 'room_info', {
      roomId,
      participantCount: room.participants.size,
      participants: Array.from(room.participants.values()),
      videoState: room.videoState
    });
  } else {
    sendToClient(ws, 'room_info', null);
  }
}

// API endpoint for testing
app.get('/status', (req, res) => {
  res.json({
    status: 'running',
    rooms: rooms.size,
    totalUsers: users.size,
    timestamp: new Date().toISOString()
  });
});

app.get('/rooms', (req, res) => {
  const roomList = Array.from(rooms.entries()).map(([id, room]) => ({
    id,
    participantCount: room.participants.size,
    createdAt: room.createdAt,
    videoState: room.videoState
  }));
  
  res.json({ rooms: roomList });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 WatchSync server running on http://localhost:${PORT}`);
  console.log(`📊 Status endpoint: http://localhost:${PORT}/status`);
  console.log(`🏠 Rooms endpoint: http://localhost:${PORT}/rooms`);
});