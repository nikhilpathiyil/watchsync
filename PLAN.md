# WatchSync - Free Teleparty Alternative

## Overview
A minimal Chrome extension that enables synchronized video watching across multiple users, similar to Teleparty but free and open-source.

## Core Features (MVP)
1. **Shareable Links**: Generate unique room URLs to share with friends
2. **Real-time Synchronization**: Play, pause, and seek controls sync across all participants
3. **Multiple Platform Support**: Works with Netflix, YouTube, Disney+, Hulu, and other major streaming platforms
4. **Simple UI**: Minimal interface that doesn't interfere with the viewing experience
5. **Equal Control**: All participants can control playback (no host restrictions)

## Technical Architecture

### 1. Chrome Extension Components
```
watch-sync/
├── extension/
│   ├── manifest.json          # Extension configuration
│   ├── content-scripts/       # Scripts injected into video pages
│   │   └── video-sync.js     # Universal video detection and control
│   ├── background.js         # Extension background service
│   ├── popup/               # Extension popup UI
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   └── icons/               # Extension icons
├── server/                  # WebSocket server
│   ├── server.js           # Main server file
│   ├── room-manager.js     # Room management logic
│   └── package.json
├── testing/                # Testing utilities
│   ├── test-setup.html     # Local testing page
│   └── mock-video.html     # Mock video player for testing
└── README.md
```

### 2. How It Works

#### Universal Video Detection & Control
- **HTML5 Video Detection**: Find all `<video>` elements on the page
- **Event Interception**: Capture native video events (play, pause, seek)
- **DOM Manipulation**: Programmatically control video playback using standard HTML5 video APIs
- **Cross-Platform Compatibility**: Same code works across all streaming platforms

#### Real-time Synchronization
- **WebSocket Connection**: Maintain persistent connection to server
- **Room-based Communication**: All participants in same room receive same events
- **Event Broadcasting**: When one user acts, event is sent to all others
- **State Management**: Track current playback state (time, playing status)

#### Room Management
- **Unique Room IDs**: Generate shareable URLs (e.g., `watchsync.com/room/abc123`)
- **Participant Tracking**: Know who's in the room and their status
- **Equal Control**: All participants can control playback

### 3. Implementation Steps

#### Phase 1: Basic Extension Setup
1. Create Chrome extension manifest
2. Set up basic popup UI
3. Implement content script injection
4. Add universal video detection

#### Phase 2: Video Control
1. Implement universal video player detection
2. Add event listeners for play/pause/seek
3. Create programmatic video control functions
4. Test with Netflix and YouTube

#### Phase 3: WebSocket Server
1. Set up Node.js WebSocket server
2. Implement room creation and management
3. Add event broadcasting between participants
4. Handle connection/disconnection

#### Phase 4: Synchronization
1. Connect extension to WebSocket server
2. Implement event broadcasting from extension
3. Add event handling to sync video playback
4. Test multi-user synchronization

#### Phase 5: Testing & Polish
1. Create comprehensive testing setup
2. Add participant list and status
3. Implement error handling and reconnection logic
4. Test across multiple platforms

### 4. Technical Challenges & Solutions

#### Challenge: Universal Video Detection
**Problem**: Need to work across different streaming platforms
**Solution**: Use standard HTML5 video APIs that work everywhere
- All modern streaming services use HTML5 `<video>` elements
- Standard events: `play`, `pause`, `timeupdate`, `seeking`
- Standard methods: `play()`, `pause()`, `currentTime`

#### Challenge: Synchronization Accuracy
**Problem**: Network latency can cause slight desyncs
**Solution**: Buffer events and use timestamps to maintain sync

#### Challenge: WebSocket Reliability
**Problem**: Connections can drop, causing sync issues
**Solution**: Automatic reconnection with state recovery

### 5. Development Stack

#### Frontend (Chrome Extension)
- **Vanilla JavaScript**: No build process needed
- **Chrome Extension APIs**: For extension functionality
- **WebSocket Client**: For real-time communication

#### Backend (WebSocket Server)
- **Node.js**: Lightweight and fast
- **ws library**: WebSocket implementation
- **Express**: For room management endpoints

#### Deployment
- **Heroku/Vercel**: For WebSocket server hosting
- **Chrome Web Store**: For extension distribution

### 6. Infrastructure Requirements

#### WebSocket Server
- **Hosting**: Heroku, Vercel, or similar (free tier available)
- **Domain**: Optional custom domain for room URLs
- **SSL**: Required for WebSocket connections
- **Scaling**: Start with free tier, scale as needed

#### Chrome Extension
- **Distribution**: Chrome Web Store (one-time $5 fee)
- **Updates**: Automatic through Chrome Web Store
- **Storage**: Local storage for room preferences

#### Testing Infrastructure
- **Local Testing**: Mock video player for development
- **Multi-Browser Testing**: Chrome, Firefox, Edge
- **Network Simulation**: Test with different latencies

### 7. Testing Strategy

#### Local Testing Setup
1. **Mock Video Player**: Create a simple HTML page with video controls
2. **Multiple Browser Windows**: Open same page in different windows
3. **Extension Testing**: Load unpacked extension for development
4. **WebSocket Testing**: Local server for development

#### Testing Milestones
- **Milestone 1**: Video detection works on mock player
- **Milestone 2**: Events are captured and sent to server
- **Milestone 3**: Events are received and applied to other instances
- **Milestone 4**: Works on Netflix/YouTube
- **Milestone 5**: Multiple users can control playback

#### Testing Tools
- **Browser DevTools**: For debugging extension
- **WebSocket Inspector**: For monitoring server communication
- **Network Throttling**: Test with different connection speeds

### 8. Security Considerations
- **Room Access**: Simple room IDs (not secure, but sufficient for MVP)
- **No Authentication**: Keep it simple and free
- **Rate Limiting**: Prevent abuse of WebSocket server
- **Input Validation**: Sanitize all user inputs

### 9. Success Metrics
- **User Adoption**: Number of active rooms
- **Platform Support**: Number of streaming services working
- **Sync Accuracy**: How well videos stay synchronized
- **User Feedback**: Reviews and feature requests

## Next Steps
1. Start with Phase 1: Basic extension setup
2. Create mock video player for testing
3. Implement universal video detection
4. Set up local WebSocket server
5. Test basic synchronization between 2 browser windows

This plan provides a solid foundation for building a free Teleparty alternative while keeping the scope manageable and focused on core functionality. 