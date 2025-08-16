/**
 * WatchSync Content Script
 * Runs inside web pages to detect videos and handle synchronization
 */

// Platform detection configurations
const PLATFORM_CONFIGS = [
  {
    name: 'netflix',
    hostPatterns: ['netflix.com'],
    videoSelectors: [
      'video[src*="blob:"]',
      '.VideoContainer video',
      '[data-testid="video-player"] video',
      'video'
    ]
  },
  {
    name: 'youtube',
    hostPatterns: ['youtube.com', 'youtu.be'],
    videoSelectors: [
      '.video-stream',
      'video.video-stream',
      '#player video',
      'video'
    ]
  },
  {
    name: 'disney',
    hostPatterns: ['disneyplus.com'],
    videoSelectors: [
      '[data-testid="player"] video',
      '.btm-media-client-element video',
      'video'
    ]
  },
  {
    name: 'hulu',
    hostPatterns: ['hulu.com'],
    videoSelectors: [
      '[data-testid="vilos-player"] video',
      '.video-player video',
      'video'
    ]
  },
  {
    name: 'prime',
    hostPatterns: ['primevideo.com', 'amazon.com'],
    videoSelectors: [
      '[data-testid="video-player"] video',
      '.webPlayerContainer video',
      'video'
    ]
  },
  {
    name: 'hotstar',
    hostPatterns: ['hotstar.com'],
    videoSelectors: [
      '[data-testid="player-space-container"] video',
      'video[src*="blob:"]',
      'video',
      '.video-js video',
      '.player-video video'
    ]
  },
  {
    name: 'mock',
    hostPatterns: ['localhost'],
    videoSelectors: ['video']
  }
];

class VideoDetector {
  detectVideos() {
    const platform = this.detectPlatform();
    const config = PLATFORM_CONFIGS.find(p => p.name === platform) || 
                   { name: 'unknown', videoSelectors: ['video'] };
    
    const videos = this.findVideoElements(config.videoSelectors);
    const primaryVideo = this.selectPrimaryVideo(videos);
    
    return {
      platform: config.name,
      videos: videos,
      primaryVideo: primaryVideo,
      videoCount: videos.length,
      hasVideo: videos.length > 0
    };
  }

  detectPlatform() {
    const hostname = window.location.hostname.toLowerCase();
    
    for (const config of PLATFORM_CONFIGS) {
      if (config.hostPatterns.some(pattern => hostname.includes(pattern))) {
        return config.name;
      }
    }
    
    return 'unknown';
  }

  findVideoElements(selectors) {
    const videos = [];
    
    for (const selector of selectors) {
      try {
        const elements = Array.from(document.querySelectorAll(selector));
        videos.push(...elements.filter(video => this.isValidVideo(video)));
      } catch (error) {
        console.warn('VideoDetector: Invalid selector:', selector, error);
      }
    }
    
    return [...new Set(videos)]; // Remove duplicates
  }

  isValidVideo(video) {
    if (!video || !(video instanceof HTMLVideoElement)) {
      return false;
    }
    
    const rect = video.getBoundingClientRect();
    const isVisible = rect.width > 50 && rect.height > 50;
    const hasValidSrc = video.src || video.currentSrc;
    
    return isVisible && hasValidSrc;
  }

  selectPrimaryVideo(videos) {
    if (videos.length === 0) return null;
    if (videos.length === 1) return videos[0];
    
    return videos.reduce((largest, current) => {
      const largestArea = largest.getBoundingClientRect().width * largest.getBoundingClientRect().height;
      const currentArea = current.getBoundingClientRect().width * current.getBoundingClientRect().height;
      return currentArea > largestArea ? current : largest;
    });
  }
}

class WatchSyncContentScript {
  constructor() {
    this.currentVideo = null;
    this.isInitialized = false;
    this.monitoringCleanup = null;
    this.detector = new VideoDetector();
    this.isSyncing = false; // Flag to prevent infinite sync loops
    
    // Add delay to ensure Chrome APIs are ready
    setTimeout(() => {
      this.init();
    }, 50);
  }

  async init() {
    try {
      console.log('🎬 WatchSync: Content script initializing...');
      
      this.detectAndSetupVideo();
      this.setupPageMonitoring();
      this.setupMessageListeners();
      this.isInitialized = true;
      
      console.log('✅ WatchSync: Content script initialized');
    } catch (error) {
      console.error('❌ WatchSync: Content script initialization failed:', error);
    }
  }

  detectAndSetupVideo() {
    const detection = this.detector.detectVideos();
    
    console.log('🔍 WatchSync: Video detection result:', {
      platform: detection.platform,
      videoCount: detection.videoCount,
      hasVideo: detection.hasVideo
    });

    // Send detection results to background script
    this.sendMessageToBackground({
      type: 'VIDEO_DETECTED',
      payload: detection,
      timestamp: Date.now()
    });

    if (detection.primaryVideo && detection.primaryVideo !== this.currentVideo) {
      this.setupVideoListeners(detection.primaryVideo);
      this.currentVideo = detection.primaryVideo;
    }
  }

  setupVideoListeners(video) {
    if (!video) return;
    
    console.log('🎧 WatchSync: Setting up video listeners');
    
    // Remove existing listeners
    this.removeVideoListeners();
    
    // Video event handlers
    const handlePlay = () => this.handleVideoEvent('play');
    const handlePause = () => this.handleVideoEvent('pause');
    const handleSeeked = () => this.handleVideoEvent('seek');
    const handleTimeUpdate = () => this.handleTimeUpdate();
    
    // Add event listeners
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('timeupdate', handleTimeUpdate);
    
    // Store cleanup function
    this.videoListenersCleanup = () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }

  removeVideoListeners() {
    if (this.videoListenersCleanup) {
      this.videoListenersCleanup();
      this.videoListenersCleanup = null;
    }
  }

  handleVideoEvent(eventType) {
    if (!this.currentVideo || this.isSyncing) return;
    
    const eventData = {
      type: eventType,
      currentTime: this.currentVideo.currentTime,
      duration: this.currentVideo.duration,
      playbackRate: this.currentVideo.playbackRate,
      videoUrl: window.location.href,
      timestamp: Date.now()
    };
    
    console.log(`🎮 WatchSync: ${eventType} event:`, eventData);
    
    this.sendMessageToBackground({
      type: 'VIDEO_EVENT',
      payload: eventData,
      timestamp: Date.now()
    });
  }

  handleTimeUpdate() {
    // Throttle time updates to avoid spam
    if (this.lastTimeUpdate && Date.now() - this.lastTimeUpdate < 1000) {
      return;
    }
    this.lastTimeUpdate = Date.now();
  }

  setupPageMonitoring() {
    // Monitor for dynamic content changes
    const observer = new MutationObserver(() => {
      this.detectAndSetupVideo();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    this.monitoringCleanup = () => observer.disconnect();
  }

  async sendMessageToBackground(message) {
    try {
      // Safety check for Chrome APIs with retry mechanism
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
        console.warn('⚠️ WatchSync: Chrome APIs not ready, retrying...');
        
        // Retry after a short delay
        setTimeout(() => this.sendMessageToBackground(message), 100);
        return;
      }

      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response);
          }
        });
      });
      
      console.log('📡 WatchSync: Message sent successfully:', response);
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ WatchSync: Failed to send message:', errorMessage);
    }
  }

  setupMessageListeners() {
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('📨 WatchSync: Received message:', message.type);
      
      switch (message.type) {
        case 'SYNC_VIDEO':
          this.handleVideoSync(message.payload);
          sendResponse({ success: true });
          break;
        default:
          console.warn('⚠️ WatchSync: Unknown message type:', message.type);
          sendResponse({ success: false, error: 'Unknown message type' });
      }
      
      return true; // Keep message channel open for async response
    });
  }

  async handleVideoSync(syncData) {
    if (!this.currentVideo) {
      console.warn('⚠️ WatchSync: Cannot sync - no video element');
      return;
    }

    console.log('🎬 WatchSync: Applying video sync:', syncData);

    // Set syncing flag to prevent our own events from being sent
    this.isSyncing = true;

    try {
      const targetTime = syncData.currentTime;
      const currentTime = this.currentVideo.currentTime;
      const timeDiff = Math.abs(targetTime - currentTime);

      // Only sync if there's a significant difference (> 1 second)
      if (timeDiff > 1.0) {
        console.log(`🎯 WatchSync: Seeking from ${currentTime}s to ${targetTime}s (diff: ${timeDiff}s)`);
        this.currentVideo.currentTime = targetTime;
      }

      // Apply the sync action
      switch (syncData.type) {
        case 'play':
          if (this.currentVideo.paused) {
            console.log('▶️ WatchSync: Starting playback');
            await this.currentVideo.play();
          }
          break;
        case 'pause':
          if (!this.currentVideo.paused) {
            console.log('⏸️ WatchSync: Pausing playback');
            this.currentVideo.pause();
          }
          break;
        case 'seek':
          // Time sync already handled above
          console.log('🎯 WatchSync: Seek sync applied');
          break;
        default:
          console.warn('⚠️ WatchSync: Unknown sync type:', syncData.type);
      }

    } catch (error) {
      console.error('❌ WatchSync: Failed to apply video sync:', error);
    } finally {
      // Clear syncing flag after a short delay to allow the operation to complete
      setTimeout(() => {
        this.isSyncing = false;
      }, 500);
    }
  }

  cleanup() {
    this.removeVideoListeners();
    if (this.monitoringCleanup) {
      this.monitoringCleanup();
    }
  }
}

// Initialize the content script
console.log('🎬 WatchSync: Content script loaded!');
new WatchSyncContentScript();