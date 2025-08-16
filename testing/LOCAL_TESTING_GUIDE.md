# Local Testing Guide for Multi-User Video Sync

## 🎯 Testing Multi-User Scenarios Locally

### Quick Setup
1. **Start the WebSocket server**: `cd server && npm start`
2. **Open multiple browser instances** (see methods below)
3. **Navigate to the same video** on YouTube/Hotstar
4. **Create/join a room** and test synchronization

---

## 🧪 Testing Methods

### **Method 1: Multiple Windows (Easiest)**
```bash
# Terminal 1: Start server
cd server && npm start

# Then open 2+ Chrome windows:
# Window 1: User A - go to YouTube video
# Window 2: User B - go to same YouTube video
```

**Pros**: Quick and easy
**Cons**: Same Chrome profile, shared cookies

### **Method 2: Incognito + Regular (Better)**
```bash
# Terminal 1: Start server
cd server && npm start

# Chrome Regular: User A 
# Chrome Incognito: User B (Ctrl+Shift+N)
```

**Pros**: Isolated sessions, different user IDs
**Cons**: Still same browser instance

### **Method 3: Multiple Browser Profiles (Most Realistic)**
```bash
# Create new Chrome profile for testing
google-chrome --profile-directory="Profile 2" --user-data-dir="/tmp/chrome-test"

# Use your main Chrome profile for User A
# Use test profile for User B
```

**Pros**: Complete isolation, most realistic
**Cons**: Slightly more setup

---

## 🧪 Testing Scenarios

### **Scenario 1: Basic Room Creation & Joining**
1. **User A**: Click "Create Room" → Note room ID (e.g., `ABC123`)
2. **User B**: Enter room ID `ABC123` → Click "Join"
3. **Expected**: Both users see participant count = 2

### **Scenario 2: Video Play/Pause Sync**
1. **Setup**: Both users in same room, same video
2. **User A**: Press play
3. **Expected**: User B's video starts playing automatically
4. **User B**: Press pause
5. **Expected**: User A's video pauses automatically

### **Scenario 3: Seek Synchronization**
1. **Setup**: Both users in same room, video playing
2. **User A**: Seek to 2:30 in the video
3. **Expected**: User B's video jumps to 2:30
4. **User B**: Seek to 5:00
5. **Expected**: User A's video jumps to 5:00

### **Scenario 4: User Join Mid-Video**
1. **User A**: Start video, play for 1 minute
2. **User B**: Join room later
3. **Expected**: User B's video syncs to User A's current position

### **Scenario 5: Network Disconnection**
1. **Setup**: Both users syncing normally
2. **User A**: Disconnect internet briefly
3. **User B**: Continue watching
4. **User A**: Reconnect
5. **Expected**: User A syncs to User B's current position

---

## 🛠️ Debug Tools

### **WebSocket Server Logs**
Monitor the terminal running the server:
```bash
🏠 Room created: ABC123 by user user_xyz
👤 User user_abc joined room ABC123
🎮 Video event in room ABC123: {type: 'play', currentTime: 120.5}
```

### **Browser Console Logs**
Check DevTools console for:
```javascript
🔌 WatchSync: Connected to WebSocket server
🏠 WatchSync: Joined room ABC123
📡 WatchSync: Received sync event: play at 120.5s
🎮 WatchSync: Applied sync: playing video
```

### **Extension Popup Debug**
- **Connection Status**: Should show "Connected"
- **Room ID**: Should display current room
- **Participant Count**: Should show number of users

### **Server Status Endpoints**
- **Status**: `http://localhost:3001/status`
- **Rooms**: `http://localhost:3001/rooms`

---

## ✅ Success Indicators

### **For Each Scenario:**
- [ ] Room creation/joining works
- [ ] Video events are captured (console logs)
- [ ] Events are broadcast to other users
- [ ] Video control works programmatically
- [ ] Synchronization is smooth (< 1 second delay)
- [ ] Users can leave/rejoin without issues

### **Error Cases to Test:**
- [ ] What happens when server is down?
- [ ] What happens when room doesn't exist?
- [ ] What happens when user leaves mid-video?
- [ ] What happens with network lag?

---

## 🚨 Common Issues & Solutions

### **Issue**: "Cannot connect to WebSocket server"
**Solution**: Make sure server is running on `http://localhost:3001`

### **Issue**: "Room not found"
**Solution**: Ensure room ID is correct and case-sensitive

### **Issue**: "Video not syncing"
**Solution**: Check both users are on the same video URL

### **Issue**: "Extension not detecting video"
**Solution**: Start playing the video first (especially on Hotstar)

### **Issue**: "User IDs are the same"
**Solution**: Use different browser profiles or incognito mode

---

## 📊 Performance Testing

### **Latency Test**
1. User A presses play
2. Time how long until User B's video starts
3. **Target**: < 1 second for local testing

### **Stability Test**
1. Let both users watch for 10+ minutes
2. Periodically pause/play/seek
3. **Target**: No disconnections or sync drift

### **Load Test** (Advanced)
1. Open 3-4 browser instances
2. All join the same room
3. **Target**: All users stay synchronized

This testing setup will give you confidence that your sync logic works perfectly before moving to production!