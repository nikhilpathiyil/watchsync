/**
 * WatchSync Background Service Worker with Pusher Integration
 * Coordinates between tabs and manages extension state using Pusher Channels
 */

class WatchSyncBackground {
  constructor() {
    this.storage = {};
    this.connectedTabs = new Map();
    this.pusher = null;
    this.currentChannel = null;
    this.isConnecting = false;
    this.apiUrl = 'https://watchsync-api.vercel.app/api'; // Will be updated after deployment
    this.pusherConfig = {
      key: 'PUSHER_KEY_PLACEHOLDER', // Will be replaced with actual key
      cluster: 'us2', // Default cluster
      authEndpoint: null // Will be set dynamically
    };
    this.sessionType = null;
    this.instanceId = `instance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.setupMessageListeners();
    this.setupTabListeners();
    this.detectSessionType().then(() => {
      this.initializeStorage().then(() => {
        this.loadPusherScript();
      });
    });
    console.log(`🔧 WatchSync: Background service worker initializing with Pusher...`);
  }

  async detectSessionType() {
    try {
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

  async initializeStorage() {
    try {
      const stored = await this.getStorageData();
      
      this.storage = {
        userId: stored.userId || this.generateUserId(),
        currentRoomId: stored.currentRoomId || null,
        connectionStatus: {
          connected: false,
          lastConnected: null,
          error: null
        },
        currentVideo: stored.currentVideo || null,
        ...stored
      };

      await this.saveStorageData();
      console.log('💾 WatchSync: Storage initialized:', this.storage);
    } catch (error) {
      console.error('❌ WatchSync: Failed to initialize storage:', error);
    }
  }

  generateUserId() {
    const randomId = Math.random().toString(36).substr(2, 9);
    const timestamp = Date.now();
    return `user_${this.sessionType}_${this.instanceId}_${randomId}_${timestamp}`;
  }

  async loadPusherScript() {
    // Load Pusher script dynamically
    const script = document.createElement('script');
    script.src = 'https://js.pusher.com/8.2.0/pusher.min.js';
    script.onload = () => {
      console.log('📡 WatchSync: Pusher script loaded');
      this.initializePusher();
    };
    script.onerror = () => {
      console.error('❌ WatchSync: Failed to load Pusher script');
      this.updateConnectionStatus(false, 'Failed to load Pusher');
    };
    document.head.appendChild(script);
  }

  initializePusher() {
    try {
      // Update API URL and auth endpoint
      this.pusherConfig.authEndpoint = `${this.apiUrl}/pusher-auth`;
      
      this.pusher = new Pusher(this.pusherConfig.key, {
        cluster: this.pusherConfig.cluster,
        authEndpoint: this.pusherConfig.authEndpoint,
        auth: {
          headers: {
            'Content-Type': 'application/json'
          },
          params: {
            user_id: this.storage.userId,
            user_info: {
              sessionType: this.sessionType,
              instanceId: this.instanceId
            }
          }
        }
      });

      this.setupPusherEventListeners();
      this.updateConnectionStatus(true, null);
      console.log('🔌 WatchSync: Connected to Pusher');
      
    } catch (error) {
      console.error('❌ WatchSync: Failed to initialize Pusher:', error);
      this.updateConnectionStatus(false, error.message);
    }
  }

  setupPusherEventListeners() {
    this.pusher.connection.bind('connected', () => {
      console.log('✅ WatchSync: Pusher connection established');
      this.updateConnectionStatus(true, null);
    });

    this.pusher.connection.bind('disconnected', () => {
      console.log('🔌 WatchSync: Pusher disconnected');
      this.updateConnectionStatus(false, 'Disconnected');
    });

    this.pusher.connection.bind('error', (error) => {
      console.error('❌ WatchSync: Pusher connection error:', error);
      this.updateConnectionStatus(false, error.message || 'Connection error');
    });
  }

  async updateConnectionStatus(connected, error) {
    if (this.storage && this.storage.connectionStatus) {
      this.storage.connectionStatus.connected = connected;
      this.storage.connectionStatus.lastConnected = connected ? Date.now() : this.storage.connectionStatus.lastConnected;
      this.storage.connectionStatus.error = error;
      await this.saveStorageData();
    }
  }

  async joinRoom(roomId) {
    if (!this.pusher) {
      console.error('❌ WatchSync: Pusher not initialized');
      return false;
    }

    try {
      // Leave current room if any
      if (this.currentChannel) {
        this.currentChannel.unbind_all();
        this.pusher.unsubscribe(this.currentChannel.name);
      }

      // Join new room using presence channel
      const channelName = `presence-room-${roomId}`;
      this.currentChannel = this.pusher.subscribe(channelName);

      // Bind to video sync events
      this.currentChannel.bind('video-sync', (data) => {
        this.handleVideoSync(data);
      });

      // Bind to presence events
      this.currentChannel.bind('pusher:subscription_succeeded', (members) => {
        console.log(`👥 WatchSync: Joined room ${roomId} with ${members.count} members`);
      });

      this.currentChannel.bind('pusher:member_added', (member) => {
        console.log('👤 WatchSync: User joined:', member.id);
      });

      this.currentChannel.bind('pusher:member_removed', (member) => {
        console.log('👋 WatchSync: User left:', member.id);
      });

      this.storage.currentRoomId = roomId;
      await this.saveStorageData();
      
      return true;
    } catch (error) {
      console.error('❌ WatchSync: Failed to join room:', error);
      return false;
    }
  }

  async leaveRoom() {
    if (this.currentChannel) {
      this.currentChannel.unbind_all();
      this.pusher.unsubscribe(this.currentChannel.name);
      this.currentChannel = null;
    }
    
    this.storage.currentRoomId = null;
    await this.saveStorageData();
    console.log('👋 WatchSync: Left room');
  }

  async broadcastVideoEvent(eventType, eventData) {
    if (!this.storage.currentRoomId) {
      console.warn('⚠️ WatchSync: No room joined, cannot broadcast event');
      return;
    }

    try {
      const payload = {
        roomId: this.storage.currentRoomId,
        userId: this.storage.userId,
        eventType: eventType,
        eventData: eventData,
        socket_id: this.pusher.connection.socket_id
      };

      const response = await fetch(`${this.apiUrl}/video-event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log(`📡 WatchSync: Broadcasted ${eventType} event`);
    } catch (error) {
      console.error('❌ WatchSync: Failed to broadcast video event:', error);
    }
  }

  async handleVideoSync(data) {
    console.log('🎬 WatchSync: Received video sync event:', data);
    
    // Don't sync events from ourselves
    if (data.userId === this.storage.userId) {
      return;
    }

    // Send sync message to content scripts
    const message = {
      type: 'SYNC_VIDEO',
      payload: {
        eventType: data.type,
        currentTime: data.currentTime,
        timestamp: data.timestamp,
        fromUserId: data.userId
      },
      timestamp: Date.now()
    };

    // Send to all tabs with videos
    this.connectedTabs.forEach(async (tabData, tabId) => {
      try {
        await chrome.tabs.sendMessage(tabId, message);
      } catch (error) {
        console.warn(`⚠️ WatchSync: Failed to send message to tab ${tabId}:`, error);
      }
    });
  }

  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async response
    });
  }

  setupTabListeners() {
    chrome.tabs.onRemoved.addListener((tabId) => {
      this.connectedTabs.delete(tabId);
    });
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case 'VIDEO_DETECTED':
          await this.handleVideoDetected(message.payload, sender.tab?.id);
          sendResponse({ success: true });
          break;

        case 'VIDEO_EVENT':
          await this.handleVideoEvent(message.payload);
          sendResponse({ success: true });
          break;

        case 'JOIN_ROOM':
          const joined = await this.joinRoom(message.payload.roomId);
          sendResponse({ success: joined });
          break;

        case 'LEAVE_ROOM':
          await this.leaveRoom();
          sendResponse({ success: true });
          break;

        case 'GET_STATE':
          sendResponse(this.storage);
          break;

        default:
          console.warn('⚠️ WatchSync: Unknown message type:', message.type);
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('❌ WatchSync: Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleVideoDetected(payload, tabId) {
    if (tabId) {
      this.connectedTabs.set(tabId, { 
        hasVideo: payload.hasVideo,
        platform: payload.platform,
        lastDetection: Date.now()
      });
    }

    this.storage.currentVideo = payload;
    await this.saveStorageData();
    
    chrome.action.setBadgeText({ 
      text: payload.hasVideo ? '●' : '' 
    });
    chrome.action.setBadgeBackgroundColor({ 
      color: payload.hasVideo ? '#22c55e' : '#ef4444' 
    });
    chrome.action.setTitle({ 
      title: payload.hasVideo 
        ? `WatchSync: Video detected on ${payload.platform}` 
        : 'WatchSync: No video detected'
    });

    console.log('🎬 WatchSync: Video detection updated:', payload);
  }

  async handleVideoEvent(payload) {
    await this.broadcastVideoEvent(payload.type, {
      currentTime: payload.currentTime,
      timestamp: payload.timestamp
    });
  }
}

// Initialize the background service
const watchSyncBackground = new WatchSyncBackground();