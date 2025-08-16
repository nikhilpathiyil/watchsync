/**
 * Rooms endpoint for checking active rooms
 * In Pusher model, rooms are managed client-side via channel subscriptions
 */
export default function handler(req, res) {
  const response = {
    message: 'Rooms are managed via Pusher Channels',
    activeRooms: 'Check Pusher dashboard for channel activity',
    timestamp: new Date().toISOString()
  };

  res.status(200).json(response);
}