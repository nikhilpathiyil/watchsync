/**
 * Video event broadcast endpoint
 * Receives video events and broadcasts them via Pusher
 */
import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { roomId, userId, eventType, eventData } = req.body;

    if (!roomId || !userId || !eventType) {
      return res.status(400).json({ 
        error: 'Missing required fields: roomId, userId, eventType' 
      });
    }

    const channelName = `presence-room-${roomId}`;
    const eventName = 'video-sync';
    
    const payload = {
      type: eventType,
      userId: userId,
      timestamp: Date.now(),
      ...eventData
    };

    // Broadcast to all users in the room except the sender
    await pusher.trigger(channelName, eventName, payload, {
      socket_id: req.body.socket_id // Exclude sender
    });

    console.log(`📺 Video event broadcasted to ${channelName}:`, payload);

    res.status(200).json({ 
      success: true,
      message: 'Event broadcasted successfully' 
    });

  } catch (error) {
    console.error('❌ Error broadcasting video event:', error);
    res.status(500).json({ 
      error: 'Failed to broadcast event',
      details: error.message 
    });
  }
}