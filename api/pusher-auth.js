/**
 * Pusher authentication endpoint
 * Authenticates users for private/presence channels
 */
import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

export default function handler(req, res) {
  const { socket_id, channel_name, user_id, user_info } = req.body;

  // For presence channels, include user data
  const presenceData = {
    user_id: user_id,
    user_info: user_info || {
      name: `User ${user_id?.split('_').pop()?.substring(0, 8) || 'Anonymous'}`
    }
  };

  try {
    const authResponse = pusher.authorizeChannel(socket_id, channel_name, presenceData);
    res.status(200).json(authResponse);
  } catch (error) {
    console.error('Pusher auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}