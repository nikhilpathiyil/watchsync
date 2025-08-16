/**
 * Status endpoint for checking server health
 */
export default function handler(req, res) {
  const stats = {
    status: 'online',
    service: 'WatchSync Pusher API',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  };

  res.status(200).json(stats);
}