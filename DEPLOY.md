# 🚀 WatchSync Deployment Guide

Your Pusher credentials are ready! Here's how to deploy WatchSync to make it work like Teleparty (zero setup for users).

## ✅ **Your Pusher Configuration:**
- App ID: `2037850` (server-side only)
- Key: `3cfef5c6d50e16f168a1` ✅ (public, safe in extension)
- Secret: `2d28eb5a12b48a6ef78f` (server-side only - NEVER commit!)
- Cluster: `ap2` ✅ (public, safe in extension)

## 🎯 **Step 1: Deploy to Vercel**

### 1a. Create Vercel Account
1. Go to [vercel.com](https://vercel.com) and sign up with GitHub
2. Connect your GitHub account

### 1b. Deploy via Vercel Dashboard (Easiest)
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your `nikhilpathiyil/watchsync` repository
3. **IMPORTANT**: Add these environment variables during setup:
   ```
   PUSHER_APP_ID = 2037850
   PUSHER_KEY = 3cfef5c6d50e16f168a1
   PUSHER_SECRET = 2d28eb5a12b48a6ef78f
   PUSHER_CLUSTER = ap2
   ```
4. Click "Deploy"
5. Your API will be live at `https://YOUR-PROJECT-NAME.vercel.app`

### 1c. Alternative: Deploy via CLI
```bash
# First login to Vercel (will open browser)
npx vercel login

# Add environment variables
npx vercel env add PUSHER_APP_ID
# Enter: 2037850

npx vercel env add PUSHER_KEY  
# Enter: 3cfef5c6d50e16f168a1

npx vercel env add PUSHER_SECRET
# Enter: 2d28eb5a12b48a6ef78f

npx vercel env add PUSHER_CLUSTER
# Enter: ap2

# Deploy
npx vercel --prod
```

## 🔧 **Step 2: Update Extension**

After deployment, you'll get a URL like `https://watchsync-xyz.vercel.app`

Update this line in `extension/watchsync-background-pusher.js`:
```javascript
this.apiUrl = 'https://YOUR-ACTUAL-VERCEL-URL.vercel.app/api';
```

## 🎉 **Step 3: Test Your Deployment**

1. **Check API health**: Visit `https://YOUR-URL.vercel.app/api/status`
   - Should show: `{"status":"online","service":"WatchSync Pusher API"}`

2. **Update manifest.json**: Change background script:
   ```json
   {
     "background": {
       "service_worker": "watchsync-background-pusher.js"
     }
   }
   ```

3. **Reload extension** in Chrome
4. **Test sync** between regular and incognito windows

## ✅ **Success! Zero-Setup Experience**

Once deployed, users just need to:
1. ✅ Install extension
2. ✅ Works immediately!

No more localhost servers, no technical setup - just like Teleparty!

## 🎯 **What Happens Next:**

**For Users:**
- Install extension → Go to Netflix/YouTube → Create/join room → Watch together!

**For You:**
- Free hosting on Vercel + Pusher
- Scalable to thousands of users  
- Professional deployment ready for sharing

---

**Ready to deploy?** Follow Step 1b (Vercel Dashboard) for the easiest setup!