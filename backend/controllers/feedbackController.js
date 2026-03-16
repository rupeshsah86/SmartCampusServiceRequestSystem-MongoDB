const Feedback = require('../models/Feedback');
const ServiceRequest = require('../models/ServiceRequest');
const Notification = require('../models/Notification');
const { sendResponse, asyncHandler } = require('../utils/helpers');
const { validationResult } = require('express-validator');

// Submit feedback for resolved request
const submitFeedback = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendResponse(res, 400, false, 'Validation failed', errors.array());
  }

  const { requestId } = req.params;
  const { rating, comments, serviceQuality, responseTime, overallSatisfaction } = req.body;

  // Check if request exists and is resolved
  const request = await ServiceRequest.findById(requestId);
  if (!request) {
    return sendResponse(res, 404, false, 'Service request not found');
  }

  if (request.status !== 'resolved' && request.status !== 'closed') {
    return sendResponse(res, 400, false, 'Feedback can only be submitted for resolved or closed requests');
  }

  // Check if user owns the request
  if (request.userId.toString() !== req.user._id.toString()) {
    return sendResponse(res, 403, false, 'You can only provide feedback for your own requests');
  }

  // Check if feedback already exists
  const existingFeedback = await Feedback.findOne({ requestId });
  if (existingFeedback) {
    return sendResponse(res, 400, false, 'Feedback has already been submitted for this request');
  }

  // Create feedback
  const feedback = await Feedback.create({
    requestId,
    userId: req.user._id,
    rating,
    comments,
    serviceQuality,
    responseTime,
    overallSatisfaction
  });

  await feedback.populate('requestId', 'title requestId assignedTo');
  await feedback.populate('userId', 'name email');
  
  // Send email to technician if assigned
  if (request.assignedTo) {
    const User = require('../models/User');
    const technician = await User.findById(request.assignedTo);
    if (technician) {
      const { sendEmail, emailTemplates } = require('../utils/emailService');
      await sendEmail(
        technician.email,
        '⭐ Feedback Received',
        emailTemplates.feedbackReceived(technician, request, feedback)
      );
    }
  }

  sendResponse(res, 201, true, 'Feedback submitted successfully', feedback);
});

// Get feedback for a request (admin only)
const getFeedbackByRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;

  const feedback = await Feedback.findOne({ requestId })
    .populate('userId', 'name email department')
    .populate('requestId', 'title requestId');

  if (!feedback) {
    return sendResponse(res, 404, false, 'No feedback found for this request');
  }

  sendResponse(res, 200, true, 'Feedback retrieved successfully', feedback);
});

// Get all feedback (admin only)
const getAllFeedback = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, rating } = req.query;

  const filter = {};
  if (rating) filter.rating = parseInt(rating);

  const skip = (page - 1) * limit;

  const feedback = await Feedback.find(filter)
    .populate('userId', 'name email department')
    .populate('requestId', 'title requestId category')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Feedback.countDocuments(filter);

  sendResponse(res, 200, true, 'Feedback retrieved successfully', {
    feedback,
    pagination: {
      current: parseInt(page),
      total: Math.ceil(total / limit),
      count: feedback.length,
      totalFeedback: total
    }
  });
});

// Get feedback statistics (admin only)
const getFeedbackStats = asyncHandler(async (req, res) => {
  const stats = await Feedback.aggregate([
    {
      $group: {
        _id: null,
        totalFeedback: { $sum: 1 },
        avgRating: { $avg: '$rating' },
        avgServiceQuality: { $avg: '$serviceQuality' },
        avgResponseTime: { $avg: '$responseTime' },
        avgSatisfaction: { $avg: '$overallSatisfaction' }
      }
    }
  ]);

  const ratingDistribution = await Feedback.aggregate([
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  sendResponse(res, 200, true, 'Feedback statistics retrieved successfully', {
    overview: stats[0] || {
      totalFeedback: 0,
      avgRating: 0,
      avgServiceQuality: 0,
      avgResponseTime: 0,
      avgSatisfaction: 0
    },
    ratingDistribution
  });
});

// Get public feedback (no authentication required)
const getPublicFeedback = asyncHandler(async (req, res) => {
  const { limit = 6 } = req.query;

  const feedback = await Feedback.find({ rating: { $gte: 4 } })
    .populate('userId', 'name department')
    .populate('requestId', 'category')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

  sendResponse(res, 200, true, 'Public feedback retrieved successfully', feedback);
});

module.exports = {
  submitFeedback,
  getFeedbackByRequest,
  getAllFeedback,
  getFeedbackStats,
  getPublicFeedback
};