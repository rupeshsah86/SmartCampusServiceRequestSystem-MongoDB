// Helper function to emit real-time notifications
const emitNotification = (req, userId, notification) => {
  const io = req.app.get('io');
  const connectedUsers = req.app.get('connectedUsers');
  
  if (io && connectedUsers) {
    const socketId = connectedUsers.get(userId.toString());
    if (socketId) {
      io.to(socketId).emit('notification', notification);
      console.log(`Notification sent to user ${userId}`);
    }
  }
};

module.exports = { emitNotification };
