# WatchSync Pusher Setup Guide

## 1. Create Pusher Account

1. Go to [pusher.com](https://pusher.com) and sign up for free
2. Create a new **Channels** app
3. Choose a name like "WatchSync"
4. Select cluster closest to your users (e.g., `us2` for US)

## 2. Get Your Pusher Credentials

From your Pusher dashboard, go to **App Keys** tab and copy:
- App ID
- Key  
- Secret
- Cluster

## 3. Configure Vercel Environment Variables

Install Vercel CLI if you haven't:
```bash
npm i -g vercel
```

Add your Pusher credentials as Vercel secrets:
```bash
vercel secrets add pusher-app-id "YOUR_APP_ID"
vercel secrets add pusher-key "YOUR_KEY" 
vercel secrets add pusher-secret "YOUR_SECRET"
vercel secrets add pusher-cluster "YOUR_CLUSTER"
```

## 4. Update Extension Configuration

Replace `PUSHER_KEY_PLACEHOLDER` in `extension/watchsync-background-pusher.js`:
```javascript
pusherConfig: {
  key: 'YOUR_ACTUAL_PUSHER_KEY', // Replace this
  cluster: 'us2', // Replace with your cluster
  authEndpoint: null
}
```

## 5. Deploy to Vercel

```bash
vercel --prod
```

## 6. Update Extension API URL

After deployment, update the `apiUrl` in `watchsync-background-pusher.js`:
```javascript
this.apiUrl = 'https://your-vercel-url.vercel.app/api';
```

## 7. Update Manifest

Update `manifest.json` to use the Pusher background script:
```json
{
  "background": {
    "service_worker": "watchsync-background-pusher.js"
  }
}
```

## Pusher Free Tier Limits

✅ **100 concurrent connections**  
✅ **200,000 messages per day**  
✅ **Unlimited channels**  
✅ **SSL included**

Perfect for testing and moderate usage!