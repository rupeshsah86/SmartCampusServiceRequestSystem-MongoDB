const Notification = require('../models/Notification');
const { sendResponse, asyncHandler } = require('../utils/helpers');
const { emitNotification } = require('../utils/socketHelper');

// Create notification (internal function)
const createNotification = async (userId, requestId, type, title, message, req = null) => {
  try {
    const notification = await Notification.create({
      userId,
      requestId,
      type,
      title,
      message
    });
    
    // Emit real-time notification if req is provided
    if (req) {
      emitNotification(req, userId, {
        _id: notification._id,
        type,
        title,
        message,
        createdAt: notification.createdAt
      });
    }
    
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

// Get user notifications
const getUserNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, isRead } = req.query;

  const filter = { userId: req.user._id };
  if (isRead !== undefined) filter.isRead = isRead === 'true';

  const skip = (page - 1) * limit;

  const notifications = await Notification.find(filter)
    .populate('requestId', 'title requestId')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Notification.countDocuments(filter);
  const unreadCount = await Notification.countDocuments({ 
    userId: req.user._id, 
    isRead: false 
  });

  sendResponse(res, 200, true, 'Notifications retrieved successfully', {
    notifications,
    unreadCount,
    pagination: {
      current: parseInt(page),
      total: Math.ceil(total / limit),
      count: notifications.length,
      totalNotifications: total
    }
  });
});

// Mark notification as read
const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const notification = await Notification.findById(id);
  if (!notification) {
    return sendResponse(res, 404, false, 'Notification not found');
  }

  // Check if user owns the notification
  if (notification.userId.toString() !== req.user._id.toString()) {
    return sendResponse(res, 403, false, 'Access denied');
  }

  notification.isRead = true;
  await notification.save();

  sendResponse(res, 200, true, 'Notification marked as read');
});

// Mark all notifications as read
const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { userId: req.user._id, isRead: false },
    { isRead: true }
  );

  sendResponse(res, 200, true, 'All notifications marked as read');
});

// Delete notification
const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const notification = await Notification.findById(id);
  if (!notification) {
    return sendResponse(res, 404, false, 'Notification not found');
  }

  // Check if user owns the notification
  if (notification.userId.toString() !== req.user._id.toString()) {
    return sendResponse(res, 403, false, 'Access denied');
  }

  await Notification.findByIdAndDelete(id);
  sendResponse(res, 200, true, 'Notification deleted successfully');
});

module.exports = {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
};