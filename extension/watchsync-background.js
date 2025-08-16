/**
 * WatchSync Background Service Worker
 * Coordinates between tabs and manages extension state
 */

class WatchSyncBackground {
  constructor() {
    this.storage = {};
    this.connectedTabs = new Map();
    this.websocket = null;
    this.isConnecting = false;
    this.serverUrl = 'ws://localhost:3001';
    this.sessionType = null; // Will be determined async
    // Create unique instance ID for this background script instance
    this.instanceId = `instance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.setupMessageListeners();
    this.setupTabListeners();
    this.detectSessionType().then(() => {
      this.initializeStorage().then(() => {
        this.connectToServer();
      });
    });
    console.log(`🔧 WatchSync: Background service worker initializing...`);
  }

  async initializeStorage() {
    try {
      const stored = await this.getStorageData();
      
      this.storage = {
        userId: stored.userId || this.generateUserId(),
        userName: stored.userName || 'Anonymous User',
        currentRoomId: stored.currentRoomId,
        connectionStatus: {
          connected: false,
          participantCount: 0
        },
        currentVideo: stored.currentVideo,
        settings: {
          autoJoinRooms: stored.settings?.autoJoinRooms ?? true,
          syncDelay: stored.settings?.syncDelay ?? 100,
          debugMode: stored.settings?.debugMode ?? true
        }
      };

      await this.saveStorageData();
      console.log('💾 WatchSync: Storage initialized:', this.storage);

    } catch (error) {
      console.error('❌ WatchSync: Failed to initialize storage:', error);
    }
  }

  async detectSessionType() {
    try {
      // Query current window to detect incognito mode
      const windows = await chrome.windows.getAll();
      const currentWindow = windows.find(w => w.focused) || windows[0];
      this.sessionType = currentWindow && currentWindow.incognito ? 'incognito' : 'regular';
      console.log(`🔍 WatchSync: Session type detected: ${this.sessionType}`);
    } catch (error) {
      console.warn('⚠️ WatchSync: Could not detect session type, using fallback');
      this.sessionType = 'unknown';
    }
  }

  async getStorageKey() {
    // Use session type + instance ID to ensure complete separation
    return `watchsync_${this.sessionType}_${this.instanceId}`;
  }

  async getStorageData() {
    return new Promise(async (resolve) => {
      const key = await this.getStorageKey();
      chrome.storage.local.get([key], (result) => {
        resolve(result[key] || {});
      });
    });
  }

  async saveStorageData() {
    return new Promise(async (resolve) => {
      const key = await this.getStorageKey();
      const data = { [key]: this.storage };
      chrome.storage.local.set(data, () => {
        resolve();
      });
    });
  }

  generateUserId() {
    const randomId = Math.random().toString(36).substr(2, 9);
    const timestamp = Date.now();
    return `user_${this.sessionType}_${this.instanceId}_${randomId}_${timestamp}`;
  }

  // WebSocket connection management
  async connectToServer() {
    if (this.isConnecting || (this.websocket && this.websocket.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    console.log('🔌 WatchSync: Attempting to connect to server...');

    try {
      // Import socket.io client - we'll need to include this in the extension
      // For now, we'll use native WebSocket and implement socket.io protocol later
      this.websocket = new WebSocket(this.serverUrl);

      this.websocket.onopen = () => {
        console.log('✅ WatchSync: Connected to server');
        if (this.storage && this.storage.connectionStatus) {
          this.storage.connectionStatus.connected = true;
          this.saveStorageData();
        }
        this.isConnecting = false;
      };

      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleServerMessage(data);
        } catch (error) {
          console.error('❌ WatchSync: Failed to parse server message:', error);
        }
      };

      this.websocket.onclose = () => {
        console.log('🔌 WatchSync: Disconnected from server');
        if (this.storage && this.storage.connectionStatus) {
          this.storage.connectionStatus.connected = false;
          this.saveStorageData();
        }
        this.websocket = null;
        this.isConnecting = false;

        // Attempt to reconnect after 3 seconds
        setTimeout(() => this.connectToServer(), 3000);
      };

      this.websocket.onerror = (error) => {
        console.error('❌ WatchSync: WebSocket error:', error);
        this.isConnecting = false;
      };

    } catch (error) {
      console.error('❌ WatchSync: Failed to connect to server:', error);
      this.isConnecting = false;
      
      // Retry connection after 5 seconds
      setTimeout(() => this.connectToServer(), 5000);
    }
  }

  async sendToServer(event, data) {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ WatchSync: Cannot send to server - not connected');
      // Try to reconnect
      this.connectToServer();
      return false;
    }

    try {
      const message = { event, data, timestamp: Date.now() };
      this.websocket.send(JSON.stringify(message));
      console.log('📤 WatchSync: Sent to server:', event, data);
      return true;
    } catch (error) {
      console.error('❌ WatchSync: Failed to send to server:', error);
      return false;
    }
  }

  handleServerMessage(message) {
    console.log('📨 WatchSync: Received from server:', message);
    
    switch (message.event) {
      case 'room_joined':
        this.handleRoomJoined(message.data);
        break;
      case 'user_joined':
        this.handleUserJoined(message.data);
        break;
      case 'user_left':
        this.handleUserLeft(message.data);
        break;
      case 'sync_video':
        this.handleVideoSync(message.data);
        break;
      case 'error':
        console.error('❌ WatchSync: Server error:', message.data);
        break;
      default:
        console.warn('⚠️ WatchSync: Unknown server message:', message.event);
    }
  }

  handleRoomJoined(data) {
    console.log('🏠 WatchSync: Successfully joined room:', data.roomId);
    console.log('👥 WatchSync: Participants:', data.participants);
    this.storage.currentRoomId = data.roomId;
    this.storage.connectionStatus.participantCount = data.participants ? data.participants.length : 1;
    this.saveStorageData();
    console.log('💾 WatchSync: Updated participant count to:', this.storage.connectionStatus.participantCount);
  }

  handleUserJoined(data) {
    console.log('👤 WatchSync: User joined room:', data.participant.name);
    this.storage.connectionStatus.participantCount = data.participantCount;
    this.saveStorageData();
  }

  handleUserLeft(data) {
    console.log('👋 WatchSync: User left room:', data.userId);
    this.storage.connectionStatus.participantCount = data.participantCount;
    this.saveStorageData();
  }

  async handleVideoSync(data) {
    console.log('🎮 WatchSync: Received video sync event:', data);
    
    // Send sync command to all tabs with video
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (this.connectedTabs.has(tab.id)) {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            type: 'SYNC_VIDEO',
            payload: data,
            timestamp: Date.now()
          });
        } catch (error) {
          console.warn('⚠️ WatchSync: Failed to send sync to tab:', tab.id);
        }
      }
    }
  }

  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender.tab?.id).then(sendResponse);
      return true; // Keep the message channel open for async response
    });
  }

  setupTabListeners() {
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete') {
        console.log('🔄 WatchSync: Tab updated:', tabId, tab.url);
      }
    });

    chrome.tabs.onRemoved.addListener((tabId) => {
      this.connectedTabs.delete(tabId);
      console.log('🗑️ WatchSync: Tab removed:', tabId);
    });
  }

  async handleMessage(message, tabId) {
    console.log('📨 WatchSync: Received message:', message.type, 'from tab:', tabId);
    
    try {
      switch (message.type) {
        case 'VIDEO_DETECTED':
          return this.handleVideoDetected(message.payload, tabId);
        case 'VIDEO_EVENT':
          return this.handleVideoEvent(message.payload, tabId);
        case 'JOIN_ROOM':
          return this.handleJoinRoom(message.payload, tabId);
        case 'LEAVE_ROOM':
          return this.handleLeaveRoom(tabId);
        case 'CONNECTION_STATUS':
          return this.handleConnectionStatus(message.payload, tabId);
        case 'GET_STATE':
          return this.handleGetState();
        default:
          console.warn('⚠️ WatchSync: Unknown message type:', message.type);
          return { error: 'Unknown message type' };
      }
    } catch (error) {
      console.error('❌ WatchSync: Error handling message:', error);
      return { error: error.message };
    }
  }

  async handleVideoDetected(payload, tabId) {
    console.log('🎬 WatchSync: Video detected in tab', tabId, ':', payload);
    
    if (tabId) {
      this.connectedTabs.set(tabId, payload.hasVideo);
    }

    // Store video detection data in storage for popup to access
    this.storage.currentVideo = {
      platform: payload.platform,
      videoCount: payload.videoCount,
      hasVideo: payload.hasVideo
    };
    await this.saveStorageData();

    // Update extension badge to show video status
    if (tabId) {
      await this.updateBadge(tabId, payload.hasVideo);
    }

    return { success: true, videoDetected: payload.hasVideo };
  }

  async handleVideoEvent(payload, tabId) {
    console.log('🎮 WatchSync: Video event from tab', tabId, ':', payload);
    
    if (!this.storage.currentRoomId) {
      console.warn('⚠️ WatchSync: Not in a room, ignoring video event');
      return { success: false, error: 'Not in a room' };
    }

    // Fill in missing data
    const event = {
      type: payload.type,
      currentTime: payload.currentTime,
      timestamp: payload.timestamp,
      userId: this.storage.userId,
      roomId: this.storage.currentRoomId
    };

    // Send to WebSocket server for broadcasting
    const success = await this.sendToServer('video_event', event);
    
    if (success) {
      console.log('📡 WatchSync: Video event sent to server');
      return { success: true, eventReceived: true };
    } else {
      console.error('❌ WatchSync: Failed to send video event to server');
      return { success: false, error: 'Server communication failed' };
    }
  }

  async handleJoinRoom(payload, tabId) {
    const roomId = payload.roomId || this.generateRoomId();
    
    console.log('🚪 WatchSync: Attempting to join room:', roomId);

    // Send join request to server
    const success = await this.sendToServer('join_room', {
      roomId: roomId,
      userId: this.storage.userId,
      userName: this.storage.userName
    });

    if (success) {
      // Update local storage (will be updated again when server confirms)
      this.storage.currentRoomId = roomId;
      await this.saveStorageData();
      
      return { 
        success: true, 
        roomId: roomId,
        userId: this.storage.userId
      };
    } else {
      return { 
        success: false, 
        error: 'Failed to connect to server'
      };
    }
  }

  async handleLeaveRoom(tabId) {
    console.log('🚪 WatchSync: Leaving room:', this.storage.currentRoomId);

    // Send leave request to server
    await this.sendToServer('leave_room', {
      roomId: this.storage.currentRoomId,
      userId: this.storage.userId
    });

    // Update local storage
    this.storage.currentRoomId = undefined;
    this.storage.connectionStatus.participantCount = 0;
    
    await this.saveStorageData();
    
    console.log('🚪 WatchSync: Left room');
    
    return { success: true };
  }

  async handleConnectionStatus(payload, tabId) {
    this.storage.connectionStatus = { ...this.storage.connectionStatus, ...payload };
    await this.saveStorageData();
    
    return { success: true, status: this.storage.connectionStatus };
  }

  async handleGetState() {
    return this.storage;
  }

  generateRoomId() {
    return Math.random().toString(36).substr(2, 8).toUpperCase();
  }

  async updateBadge(tabId, hasVideo) {
    try {
      if (hasVideo) {
        await chrome.action.setBadgeText({ text: '●', tabId });
        await chrome.action.setBadgeBackgroundColor({ color: '#4CAF50', tabId });
        await chrome.action.setTitle({ title: 'WatchSync - Video detected', tabId });
      } else {
        await chrome.action.setBadgeText({ text: '', tabId });
        await chrome.action.setTitle({ title: 'WatchSync', tabId });
      }
    } catch (error) {
      console.error('❌ WatchSync: Failed to update badge:', error);
    }
  }
}

// Initialize the background script
console.log('🔧 WatchSync: Background script loaded!');
new WatchSyncBackground();