# WatchSync Testing Guide

## Quick Testing Setup

### 1. Local Testing (No Extension Needed)
1. Open `testing/mock-video.html` in two different browser windows
2. You'll see a video player with event logging
3. Click play/pause/seek in one window and observe the event logs
4. This validates that video events are being captured correctly

### 2. Extension Testing (Development)
1. Load the Chrome extension in development mode
2. Open `testing/mock-video.html` in two windows
3. Use the extension to join the same room in both windows
4. Test synchronization between the windows

### 3. Real Platform Testing
1. Load extension in Chrome
2. Open Netflix/YouTube in two different browser windows
3. Join the same room in both windows
4. Test synchronization on real streaming platforms

## Testing Milestones

### Milestone 1: Video Detection ✅
**Goal**: Extension can detect video elements on any page
**Test**: 
- Load extension on `mock-video.html`
- Check console for "Video detected" message
- Verify video element is found

### Milestone 2: Event Capture ✅
**Goal**: Extension can capture play/pause/seek events
**Test**:
- Click play/pause/seek buttons on mock video
- Check extension logs for captured events
- Verify events have correct timestamps and data

### Milestone 3: WebSocket Connection ✅
**Goal**: Extension can connect to WebSocket server
**Test**:
- Start local WebSocket server
- Extension connects without errors
- Connection status shows "Connected"

### Milestone 4: Event Broadcasting ✅
**Goal**: Events are sent to server and received by other clients
**Test**:
- Two browser windows with extension
- Join same room in both windows
- Action in Window A appears in Window B's logs
- Verify event data is correct

### Milestone 5: Video Synchronization ✅
**Goal**: Actions in one window control video in other window
**Test**:
- Play video in Window A
- Video in Window B starts playing automatically
- Seek in Window A, Window B seeks to same time
- Pause in Window A, Window B pauses

### Milestone 6: Real Platform Testing ✅
**Goal**: Works on Netflix, YouTube, etc.
**Test**:
- Load Netflix/YouTube in two windows
- Join same room
- Test synchronization on real content
- Verify no conflicts with platform's own controls

## Testing Tools

### Browser DevTools
```javascript
// In console, check for video elements
document.querySelectorAll('video')

// Check extension logs
// (Extension will add logs to console)

// Monitor WebSocket traffic
// (Use Network tab to see WebSocket messages)
```

### WebSocket Inspector
```javascript
// In browser console, monitor WebSocket
const originalSend = WebSocket.prototype.send;
WebSocket.prototype.send = function(data) {
    console.log('WebSocket Send:', data);
    return originalSend.call(this, data);
};
```

### Network Simulation
- Use Chrome DevTools Network tab
- Set throttling to "Slow 3G" to test latency
- Test with different connection speeds

## Common Issues & Solutions

### Issue: Video not detected
**Solution**: 
- Check if page uses `<video>` elements
- Some platforms use iframes (need different approach)
- Verify extension has correct permissions

### Issue: Events not captured
**Solution**:
- Check if events are being prevented by page
- Verify event listeners are attached correctly
- Check for conflicts with page's own JavaScript

### Issue: WebSocket connection fails
**Solution**:
- Verify server is running
- Check for CORS issues
- Ensure WebSocket URL is correct

### Issue: Synchronization lag
**Solution**:
- Check network latency
- Implement event buffering
- Add timestamp-based ordering

### Issue: Video controls conflict
**Solution**:
- Prevent default behavior on user actions
- Use programmatic control instead of UI clicks
- Handle platform-specific quirks

## Performance Testing

### Latency Testing
- Measure time from user action to sync
- Target: < 200ms for good UX
- Test with different network conditions

### Memory Testing
- Monitor extension memory usage
- Check for memory leaks in long sessions
- Ensure cleanup on page unload

### Stress Testing
- Test with 5+ participants
- Rapid play/pause/seek actions
- Long video sessions (2+ hours)

## Platform-Specific Testing

### Netflix
- Test with different video types (movies, shows, trailers)
- Check ad handling (should skip sync during ads)
- Test with different video qualities

### YouTube
- Test with regular videos and live streams
- Check playlist handling
- Test with different video lengths

### Other Platforms
- Test with Disney+, Hulu, Prime Video
- Check for platform-specific video player quirks
- Verify compatibility with different browsers

## Automated Testing (Future)

### Unit Tests
```javascript
// Test video detection
test('should detect video elements', () => {
    // Test implementation
});

// Test event capture
test('should capture play events', () => {
    // Test implementation
});

// Test WebSocket communication
test('should send events to server', () => {
    // Test implementation
});
```

### Integration Tests
- End-to-end synchronization tests
- Multi-user scenario tests
- Cross-platform compatibility tests

## Reporting Issues

When reporting issues, include:
1. **Platform**: Netflix, YouTube, etc.
2. **Browser**: Chrome version
3. **Extension Version**: Current version
4. **Steps to Reproduce**: Exact steps
5. **Expected vs Actual**: What should happen vs what happens
6. **Console Logs**: Any error messages
7. **Network Conditions**: Connection speed and stability

This testing guide ensures thorough validation of the WatchSync functionality at each development stage. 