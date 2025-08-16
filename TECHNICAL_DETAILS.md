# Technical Implementation Details

## How Video Synchronization Works

### 1. Event Flow Architecture

```
User A clicks "Play" 
    ↓
Content Script intercepts event
    ↓
Prevents default behavior
    ↓
Sends event to WebSocket server
    ↓
Server broadcasts to all room participants
    ↓
Other users' content scripts receive event
    ↓
Programmatically trigger same action
    ↓
All videos stay synchronized
```

### 2. Universal Video Detection Strategy

**Why Universal Detection Works:**
All modern streaming platforms (Netflix, YouTube, Prime, etc.) use standard HTML5 `<video>` elements. The differences are mostly in the UI controls, not the underlying video player.

#### Universal Video Detection
```javascript
// This works across ALL streaming platforms
function findVideoElements() {
  // Find all video elements on the page
  const videos = document.querySelectorAll('video');
  
  // Filter out hidden or non-functional videos
  return Array.from(videos).filter(video => {
    return video.offsetWidth > 0 && 
           video.offsetHeight > 0 && 
           video.duration > 0;
  });
}

// Listen for standard HTML5 video events
function setupVideoListeners(video) {
  video.addEventListener('play', () => {
    sendToServer({ type: 'play', currentTime: video.currentTime });
  });
  
  video.addEventListener('pause', () => {
    sendToServer({ type: 'pause', currentTime: video.currentTime });
  });
  
  video.addEventListener('seeking', () => {
    sendToServer({ type: 'seek', targetTime: video.currentTime });
  });
}
```

#### What Remains Common Across All Platforms
- **Video Element**: All use `<video>` tags
- **Standard Events**: `play`, `pause`, `timeupdate`, `seeking`
- **Standard Methods**: `play()`, `pause()`, `currentTime`
- **Standard Properties**: `duration`, `currentTime`, `paused`

#### What Might Need Platform-Specific Handling
- **Custom Controls**: Some platforms have custom play/pause buttons
- **Ad Detection**: Skip synchronization during ads
- **Quality Changes**: Handle when video quality changes
- **Error Recovery**: Different platforms handle errors differently

### 3. DOM Manipulation Explained

**DOM Manipulation** means programmatically controlling HTML elements using JavaScript.

#### Examples:
```javascript
// Find a video element
const video = document.querySelector('video');

// Control playback (this is DOM manipulation)
video.play();    // Start playing
video.pause();   // Pause
video.currentTime = 120;  // Seek to 2 minutes

// Listen for events (also DOM manipulation)
video.addEventListener('play', () => {
  console.log('Video started playing');
});
```

#### Why We Need It:
- **Intercept User Actions**: Prevent default behavior and send to server
- **Apply Remote Actions**: When someone else controls playback, apply it locally
- **Sync State**: Ensure all videos are at the same time and state

### 4. Infrastructure Requirements

#### WebSocket Server (Required)
- **Purpose**: Relay events between participants
- **Hosting**: Heroku, Vercel, Railway (free tiers available)
- **Cost**: Free tier typically sufficient for MVP
- **Scaling**: Can upgrade as user base grows

#### Chrome Extension (Required)
- **Distribution**: Chrome Web Store ($5 one-time fee)
- **Updates**: Automatic through store
- **Storage**: Local browser storage (free)

#### Optional Infrastructure
- **Custom Domain**: For nicer room URLs (e.g., `watchsync.com/room/abc123`)
- **Analytics**: Track usage (optional)
- **CDN**: For faster global access (optional)

### 5. Testing Setup Strategy

#### Quick Testing Setup
```html
<!-- mock-video.html -->
<!DOCTYPE html>
<html>
<head>
    <title>Mock Video Player</title>
</head>
<body>
    <video id="test-video" controls width="640" height="360">
        <source src="https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4" type="video/mp4">
    </video>
    
    <div id="status">Status: Ready</div>
    <div id="events">Events: None</div>
    
    <script>
        // This will be replaced by our extension
        const video = document.getElementById('test-video');
        const status = document.getElementById('status');
        const events = document.getElementById('events');
        
        video.addEventListener('play', () => {
            status.textContent = 'Status: Playing';
            events.textContent = 'Events: Play';
        });
        
        video.addEventListener('pause', () => {
            status.textContent = 'Status: Paused';
            events.textContent = 'Events: Pause';
        });
    </script>
</body>
</html>
```

#### Testing Workflow
1. **Setup**: Load extension in Chrome, open mock video page
2. **Test 1**: Open same page in two browser windows
3. **Test 2**: Click play in one window, verify other window plays
4. **Test 3**: Seek in one window, verify other window seeks
5. **Test 4**: Test with real Netflix/YouTube

#### Testing Milestones
- **Milestone 1**: Extension detects video on mock page
- **Milestone 2**: Events are captured and logged
- **Milestone 3**: Events are sent to local WebSocket server
- **Milestone 4**: Events are received and applied to other window
- **Milestone 5**: Works with real streaming services

### 6. WebSocket Message Protocol (Simplified)

#### Event Types (No Volume)
```javascript
// Play/Pause events
{
  type: 'play' | 'pause',
  timestamp: 1234567890,
  currentTime: 45.2,  // video time in seconds
  roomId: 'abc123'
}

// Seek events
{
  type: 'seek',
  timestamp: 1234567890,
  targetTime: 120.5,  // seek to this time
  roomId: 'abc123'
}

// Join/Leave events
{
  type: 'join' | 'leave',
  timestamp: 1234567890,
  userId: 'user123',
  roomId: 'abc123'
}
```

### 7. Room Management (Equal Control)

#### Room State
```javascript
const roomState = {
  roomId: 'abc123',
  participants: [
    { id: 'user123', name: 'Alice', status: 'ready' },
    { id: 'user456', name: 'Bob', status: 'ready' }
  ],
  videoState: {
    isPlaying: false,
    currentTime: 0,
    duration: 0
  },
  platform: 'netflix',
  videoUrl: 'https://netflix.com/watch/123'
};
```

#### Equal Control Implementation
```javascript
// All participants can control playback
function handleUserAction(event) {
  // Send to all participants (including sender)
  broadcastToRoom({
    type: event.type,
    currentTime: video.currentTime,
    timestamp: Date.now(),
    roomId: currentRoomId
  });
}

// Apply actions from any participant
function applyRemoteAction(event) {
  const video = findVideoElement();
  
  switch(event.type) {
    case 'play':
      video.play();
      break;
    case 'pause':
      video.pause();
      break;
    case 'seek':
      video.currentTime = event.targetTime;
      break;
  }
}
```

### 8. Performance Optimizations

#### Event Batching
```javascript
// Batch rapid events (like seeking)
let eventQueue = [];
let batchTimeout;

function sendEvent(event) {
  eventQueue.push(event);
  
  clearTimeout(batchTimeout);
  batchTimeout = setTimeout(() => {
    // Send batched events
    ws.send(JSON.stringify(eventQueue));
    eventQueue = [];
  }, 50); // 50ms batch window
}
```

#### Selective Broadcasting
```javascript
// Only broadcast significant events
function shouldBroadcast(event) {
  const significantEvents = ['play', 'pause', 'seek'];
  return significantEvents.includes(event.type);
}
```

### 9. Error Handling & Recovery

#### Connection Issues
```javascript
// Automatic reconnection
let ws = new WebSocket('wss://server.com');
ws.onclose = () => {
  setTimeout(() => {
    // Attempt to reconnect
    ws = new WebSocket('wss://server.com');
  }, 1000);
};
```

#### State Recovery
```javascript
// When reconnecting, request current state
ws.onopen = () => {
  ws.send({
    type: 'request_state',
    roomId: currentRoomId
  });
};
```

This technical foundation provides everything needed to build a robust, synchronized video watching experience that rivals Teleparty's core functionality. 