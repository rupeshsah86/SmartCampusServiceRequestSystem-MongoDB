const ServiceRequest = require('../models/ServiceRequest');
const { createNotification } = require('./notificationController');
const { generateRequestId, sendResponse, asyncHandler } = require('../utils/helpers');
const { sendEmail, emailTemplates } = require('../utils/emailService');
const { categorizeIssue, determinePriority } = require('../utils/aiCategorization');
const { validationResult } = require('express-validator');

// Create service request
const createRequest = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendResponse(res, 400, false, 'Validation failed', errors.array());
  }

  const { title, description, category, priority, location } = req.body;

  // AI-based categorization
  const aiSuggestion = categorizeIssue(title, description);
  const aiPriority = determinePriority(title, description);

  const requestData = {
    requestId: generateRequestId(),
    userId: req.user._id,
    title,
    description,
    category: category || aiSuggestion.category,
    priority: priority || aiPriority,
    location,
    aiSuggestion: {
      category: aiSuggestion.category,
      confidence: aiSuggestion.confidence,
      priority: aiPriority
    }
  };

  // Handle file uploads
  if (req.files && req.files.length > 0) {
    requestData.attachments = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path
    }));
  }

  const serviceRequest = await ServiceRequest.create(requestData);
  await serviceRequest.populate('userId', 'name email department');

  // Send email notification
  await sendEmail(
    serviceRequest.userId.email,
    'Service Request Created',
    emailTemplates.requestCreated(serviceRequest.userId, serviceRequest)
  );

  sendResponse(res, 201, true, 'Service request created successfully', {
    request: serviceRequest,
    aiSuggestion: aiSuggestion
  });
});

// Get user's service requests
const getUserRequests = asyncHandler(async (req, res) => {
  const { status, category, search, sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 10 } = req.query;
  
  const filter = { userId: req.user._id };
  if (status) filter.status = status;
  if (category) filter.category = category;
  
  // Add search functionality
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { requestId: { $regex: search, $options: 'i' } },
      { location: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (page - 1) * limit;
  
  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
  
  const requests = await ServiceRequest.find(filter)
    .populate('userId', 'name email department')
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));

  const total = await ServiceRequest.countDocuments(filter);

  sendResponse(res, 200, true, 'Requests retrieved successfully', {
    requests,
    pagination: {
      current: parseInt(page),
      total: Math.ceil(total / limit),
      count: requests.length,
      totalRequests: total
    }
  });
});

// Get all service requests (Admin and Technician)
const getAllRequests = asyncHandler(async (req, res) => {
  const { status, category, priority, page = 1, limit = 10, search, assignedTo } = req.query;
  
  const filter = {};
  
  // Technicians can only see their assigned requests
  if (req.user.role === 'technician') {
    filter.assignedTo = req.user._id;
  }
  
  // Apply filters
  if (assignedTo) filter.assignedTo = assignedTo;
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (priority) filter.priority = priority;
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { requestId: { $regex: search, $options: 'i' } },
      { location: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (page - 1) * limit;
  
  const requests = await ServiceRequest.find(filter)
    .populate('userId', 'name email department role')
    .populate('assignedTo', 'name email department')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await ServiceRequest.countDocuments(filter);

  sendResponse(res, 200, true, 'Requests retrieved successfully', {
    requests,
    pagination: {
      current: parseInt(page),
      total: Math.ceil(total / limit),
      count: requests.length,
      totalRequests: total
    }
  });
});

// Get single service request
const getRequestById = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendResponse(res, 400, false, 'Invalid request ID');
  }

  const request = await ServiceRequest.findById(req.params.id)
    .populate('userId', 'name email department role phone')
    .populate('assignedTo', 'name email department')
    .populate('workNotes.addedBy', 'name role')
    .populate('activityLogs.performedBy', 'name role');

  if (!request) {
    return sendResponse(res, 404, false, 'Service request not found');
  }

  // Check if user can access this request
  if (req.user.role !== 'admin' && request.userId._id.toString() !== req.user._id.toString()) {
    return sendResponse(res, 403, false, 'Access denied');
  }

  sendResponse(res, 200, true, 'Request retrieved successfully', request);
});

// Update service request status (Admin and Technician)
const updateRequestStatus = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendResponse(res, 400, false, 'Validation failed', errors.array());
  }

  const { status, adminRemarks, resolutionNotes, assignedTo, workNote } = req.body;

  const request = await ServiceRequest.findById(req.params.id);
  if (!request) {
    return sendResponse(res, 404, false, 'Service request not found');
  }
  
  // Technicians can only update their assigned requests
  if (req.user.role === 'technician') {
    if (!request.assignedTo || request.assignedTo.toString() !== req.user._id.toString()) {
      return sendResponse(res, 403, false, 'You can only update requests assigned to you');
    }
    if (assignedTo) {
      return sendResponse(res, 403, false, 'Technicians cannot assign requests');
    }
  }

  // Validate status transition
  const validTransitions = {
    pending: ['in_progress', 'closed'],
    in_progress: ['resolved', 'pending'],
    resolved: ['closed', 'reopened'], // User confirms or rejects
    reopened: ['in_progress'], // Technician picks up again
    closed: [] // Locked
  };

  if (!validTransitions[request.status].includes(status)) {
    return sendResponse(res, 400, false, `Cannot change status from ${request.status} to ${status}`);
  }
  
  // Prevent editing locked tickets
  if (request.isLocked) {
    return sendResponse(res, 400, false, 'Cannot modify closed ticket');
  }

  // Add work note if provided
  if (workNote && workNote.trim()) {
    request.workNotes.push({
      note: workNote,
      addedBy: req.user._id
    });
  }
  
  // Handle proof of work uploads
  if (req.files && req.files.length > 0) {
    const proofFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
      uploadedBy: req.user._id
    }));
    request.proofOfWork.push(...proofFiles);
  }

  // Update request
  const oldStatus = request.status;
  request.status = status;
  if (adminRemarks) request.adminRemarks = adminRemarks;
  if (resolutionNotes) request.resolutionNotes = resolutionNotes;
  if (assignedTo && req.user.role === 'admin') request.assignedTo = assignedTo;

  // Add activity log
  request.activityLogs.push({
    action: `Status changed from ${oldStatus} to ${status}`,
    performedBy: req.user._id,
    details: workNote || resolutionNotes || `Status updated by ${req.user.role}`
  });

  // Set timestamps and send emails
  if (status === 'resolved') {
    request.resolvedAt = new Date();
    await createNotification(
      request.userId,
      request._id,
      'resolution_pending',
      'Request Resolved - Please Confirm',
      `Your request "${request.title}" has been resolved. Please review and confirm.`,
      req
    );
    // Send email to user
    const user = await ServiceRequest.findById(request._id).populate('userId', 'name email');
    await sendEmail(
      user.userId.email,
      '✅ Request Resolved - Action Required',
      emailTemplates.requestResolved(user.userId, request)
    );
  }
  if (status === 'closed') request.closedAt = new Date();
  
  // Handle reopened status
  if (status === 'reopened') {
    request.reopenedCount += 1;
    request.resolvedAt = null;
  }

  // Handle assignment
  if (assignedTo && req.user.role === 'admin') {
    const user = await ServiceRequest.findById(request._id).populate('userId', 'name email');
    const technician = await require('../models/User').findById(assignedTo);
    if (user && technician) {
      await sendEmail(
        user.userId.email,
        '👤 Technician Assigned to Your Request',
        emailTemplates.requestAssigned(user.userId, request, technician)
      );
    }
  }

  // Create notification for status update
  if (request.status !== status) {
    await createNotification(
      request.userId,
      request._id,
      'status_update',
      'Request Status Updated',
      `Your request "${request.title}" status changed to ${status.replace('_', ' ')}.`,
      req
    );
  }

  await request.save();
  await request.populate('userId', 'name email department');
  await request.populate('workNotes.addedBy', 'name role');
  await request.populate('activityLogs.performedBy', 'name role');

  sendResponse(res, 200, true, 'Request status updated successfully', request);
});

// Delete service request
const deleteRequest = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendResponse(res, 400, false, 'Invalid request ID');
  }

  const request = await ServiceRequest.findById(req.params.id);
  if (!request) {
    return sendResponse(res, 404, false, 'Service request not found');
  }

  // Only allow deletion of pending requests by the creator or admin
  if (request.status !== 'pending') {
    return sendResponse(res, 400, false, 'Only pending requests can be deleted');
  }

  if (req.user.role !== 'admin' && request.userId.toString() !== req.user._id.toString()) {
    return sendResponse(res, 403, false, 'Access denied');
  }

  await ServiceRequest.findByIdAndDelete(req.params.id);
  sendResponse(res, 200, true, 'Service request deleted successfully');
});

// Confirm resolution (User accepts/rejects)
const confirmResolution = asyncHandler(async (req, res) => {
  const { action } = req.body; // 'accept' or 'reject'
  
  const request = await ServiceRequest.findById(req.params.id)
    .populate('userId', 'name email')
    .populate('assignedTo', 'name email')
    .populate('workNotes.addedBy', 'name role')
    .populate('activityLogs.performedBy', 'name role');
    
  if (!request) {
    return sendResponse(res, 404, false, 'Service request not found');
  }
  
  // Only request creator can confirm
  if (request.userId._id.toString() !== req.user._id.toString()) {
    return sendResponse(res, 403, false, 'Only request creator can confirm resolution');
  }
  
  // Must be in resolved status
  if (request.status !== 'resolved') {
    return sendResponse(res, 400, false, 'Request must be in resolved status');
  }
  
  if (action === 'accept') {
    // Accept resolution - Close ticket
    request.status = 'closed';
    request.closedAt = new Date();
    request.isLocked = true;
    
    // Calculate resolution time
    if (request.resolvedAt && request.createdAt) {
      request.resolutionTime = Math.round((request.resolvedAt - request.createdAt) / (1000 * 60));
    }
    
    // Add activity log
    request.activityLogs.push({
      action: 'Resolution Accepted',
      performedBy: req.user._id,
      details: 'User confirmed resolution and closed ticket'
    });
    
    // Notify technician
    if (request.assignedTo) {
      await createNotification(
        request.assignedTo._id,
        request._id,
        'resolution_accepted',
        'Resolution Accepted',
        `User accepted your resolution for "${request.title}"`,
        req
      );
    }
    
    // Send email to user
    await sendEmail(
      request.userId.email,
      '🎉 Request Closed Successfully',
      emailTemplates.requestClosed(request.userId, request)
    );
    
    await request.save();
    await request.populate('workNotes.addedBy', 'name role');
    await request.populate('activityLogs.performedBy', 'name role');
    sendResponse(res, 200, true, 'Resolution accepted. Ticket closed successfully', request);
    
  } else if (action === 'reject') {
    // Reject resolution - Reopen ticket
    request.status = 'reopened';
    request.reopenedCount += 1;
    request.resolvedAt = null;
    
    // Add activity log
    request.activityLogs.push({
      action: 'Resolution Rejected',
      performedBy: req.user._id,
      details: 'User rejected resolution and reopened ticket'
    });
    
    // Notify technician
    if (request.assignedTo) {
      await createNotification(
        request.assignedTo._id,
        request._id,
        'resolution_rejected',
        'Resolution Rejected - Ticket Reopened',
        `User rejected your resolution for "${request.title}". Please review.`,
        req
      );
      
      // Send email to technician
      await sendEmail(
        request.assignedTo.email,
        '🔄 Request Reopened',
        emailTemplates.requestReopened(request.assignedTo, request, request.userId)
      );
    }
    
    await request.save();
    await request.populate('workNotes.addedBy', 'name role');
    await request.populate('activityLogs.performedBy', 'name role');
    sendResponse(res, 200, true, 'Resolution rejected. Ticket reopened', request);
    
  } else {
    return sendResponse(res, 400, false, 'Invalid action. Use "accept" or "reject"');
  }
});

module.exports = {
  createRequest,
  getUserRequests,
  getAllRequests,
  getRequestById,
  updateRequestStatus,
  deleteRequest,
  confirmResolution
};