const ServiceRequest = require('../models/ServiceRequest');
const User = require('../models/User');
const { statsCache, getPagination } = require('../utils/performance');
const { sendResponse, asyncHandler } = require('../utils/helpers');

// Get dashboard analytics
const getDashboardStats = asyncHandler(async (req, res) => {
  const { period = '30' } = req.query;
  const cacheKey = `dashboard_stats_${period}`;
  
  // Check cache first
  const cachedStats = statsCache.get(cacheKey);
  if (cachedStats) {
    return sendResponse(res, 200, true, 'Dashboard statistics retrieved successfully (cached)', cachedStats);
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(period));

  // Total requests count by status
  const statusStats = await ServiceRequest.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  // Convert to object for easy access
  const statusMap = {};
  statusStats.forEach(stat => {
    statusMap[stat._id] = stat.count;
  });

  const pendingRequests = statusMap.pending || 0;
  const inProgressRequests = statusMap.in_progress || 0;
  const resolvedRequests = statusMap.resolved || 0;
  const closedRequests = statusMap.closed || 0;
  const reopenedRequests = statusMap.reopened || 0;

  // Requests by category
  const categoryStats = await ServiceRequest.aggregate([
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 }
      }
    }
  ]);

  // Convert to object
  const categoryBreakdown = {};
  categoryStats.forEach(stat => {
    categoryBreakdown[stat._id] = stat.count;
  });

  // Priority distribution
  const priorityStats = await ServiceRequest.aggregate([
    {
      $group: {
        _id: '$priority',
        count: { $sum: 1 }
      }
    }
  ]);

  // Convert to object
  const priorityBreakdown = {};
  priorityStats.forEach(stat => {
    priorityBreakdown[stat._id] = stat.count;
  });

  // Recent requests trend (last 30 days with daily breakdown)
  const trendStats = await ServiceRequest.aggregate([
    {
      $match: {
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        count: { $sum: 1 },
        resolved: {
          $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
        },
        pending: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Average resolution time
  const resolutionTime = await ServiceRequest.aggregate([
    {
      $match: {
        status: 'resolved',
        resolvedAt: { $exists: true }
      }
    },
    {
      $project: {
        resolutionTime: {
          $divide: [
            { $subtract: ['$resolvedAt', '$createdAt'] },
            1000 * 60 * 60 * 24 // Convert to days
          ]
        }
      }
    },
    {
      $group: {
        _id: null,
        avgResolutionTime: { $avg: '$resolutionTime' }
      }
    }
  ]);

  // Total users count by role
  const totalUsers = await User.countDocuments({ isActive: true });
  const totalTechnicians = await User.countDocuments({ role: 'technician', isActive: true });
  const totalRequests = await ServiceRequest.countDocuments();

  const dashboardData = {
    overview: {
      totalRequests,
      pendingRequests,
      inProgressRequests,
      resolvedRequests,
      closedRequests,
      reopenedRequests,
      totalUsers,
      totalTechnicians,
      avgResolutionTime: resolutionTime[0]?.avgResolutionTime || 0
    },
    categoryBreakdown,
    priorityBreakdown,
    trends: {
      daily: trendStats.map(stat => ({
        date: stat._id,
        count: stat.count,
        resolved: stat.resolved,
        pending: stat.pending
      }))
    }
  };

  // Cache the results
  statsCache.set(cacheKey, dashboardData);

  sendResponse(res, 200, true, 'Dashboard statistics retrieved successfully', dashboardData);
});

// Get requests with advanced filters
const getFilteredRequests = asyncHandler(async (req, res) => {
  const {
    status,
    category,
    priority,
    assignedTo,
    dateFrom,
    dateTo,
    department,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  const { page, limit, skip } = getPagination(req.query.page, req.query.limit);

  // Build filter object
  const filter = {};
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (priority) filter.priority = priority;
  if (assignedTo) filter.assignedTo = assignedTo;

  // Date range filter
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filter.createdAt.$lte = new Date(dateTo);
  }

  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  // Get requests with user department filter
  let requests = await ServiceRequest.find(filter)
    .populate({
      path: 'userId',
      select: 'name email department role phone',
      match: department ? { department: { $regex: department, $options: 'i' } } : {}
    })
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean(); // Performance optimization

  // Filter out requests where user doesn't match department filter
  if (department) {
    requests = requests.filter(req => req.userId);
  }

  const total = await ServiceRequest.countDocuments(filter);

  sendResponse(res, 200, true, 'Filtered requests retrieved successfully', {
    requests,
    pagination: {
      current: page,
      total: Math.ceil(total / limit),
      count: requests.length,
      totalRequests: total
    },
    filters: {
      status,
      category,
      priority,
      assignedTo,
      dateFrom,
      dateTo,
      department
    }
  });
});

// Bulk update requests
const bulkUpdateRequests = asyncHandler(async (req, res) => {
  const { requestIds, updates } = req.body;

  if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
    return sendResponse(res, 400, false, 'Request IDs array is required');
  }

  if (!updates || Object.keys(updates).length === 0) {
    return sendResponse(res, 400, false, 'Updates object is required');
  }

  // Validate allowed update fields
  const allowedFields = ['status', 'priority', 'assignedTo', 'adminRemarks'];
  const updateFields = Object.keys(updates);
  const invalidFields = updateFields.filter(field => !allowedFields.includes(field));

  if (invalidFields.length > 0) {
    return sendResponse(res, 400, false, `Invalid update fields: ${invalidFields.join(', ')}`);
  }

  // Perform bulk update
  const updateData = { ...updates };
  if (updates.status === 'resolved') updateData.resolvedAt = new Date();
  if (updates.status === 'closed') updateData.closedAt = new Date();

  const result = await ServiceRequest.updateMany(
    { _id: { $in: requestIds } },
    { $set: updateData }
  );

  sendResponse(res, 200, true, `${result.modifiedCount} requests updated successfully`, {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount
  });
});

// Get user management data
const getUserManagement = asyncHandler(async (req, res) => {
  const { role, department, isActive, page = 1, limit = 10 } = req.query;

  const filter = {};
  if (role) filter.role = role;
  if (department) filter.department = { $regex: department, $options: 'i' };
  if (isActive !== undefined) filter.isActive = isActive === 'true';

  const skip = (page - 1) * limit;

  const users = await User.find(filter)
    .select('-password')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await User.countDocuments(filter);

  // Get request counts for each user
  const usersWithStats = await Promise.all(
    users.map(async (user) => {
      const requestCount = await ServiceRequest.countDocuments({ userId: user._id });
      return {
        ...user.toObject(),
        requestCount
      };
    })
  );

  sendResponse(res, 200, true, 'Users retrieved successfully', {
    users: usersWithStats,
    pagination: {
      current: parseInt(page),
      total: Math.ceil(total / limit),
      count: users.length,
      totalUsers: total
    }
  });
});

// Toggle user status
const toggleUserStatus = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId);
  if (!user) {
    return sendResponse(res, 404, false, 'User not found');
  }

  user.isActive = !user.isActive;
  await user.save();

  sendResponse(res, 200, true, `User ${user.isActive ? 'activated' : 'deactivated'} successfully`, {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      isActive: user.isActive
    }
  });
});

// Get technicians for assignment
const getTechnicians = asyncHandler(async (req, res) => {
  const technicians = await User.find({ 
    role: 'technician', 
    isActive: true 
  }).select('name email department');

  sendResponse(res, 200, true, 'Technicians retrieved successfully', {
    technicians
  });
});

// Get technician performance stats
const getTechnicianPerformance = asyncHandler(async (req, res) => {
  const technicians = await User.find({ role: 'technician', isActive: true }).select('name email department');
  
  const performanceData = await Promise.all(
    technicians.map(async (tech) => {
      const totalResolved = await ServiceRequest.countDocuments({ 
        assignedTo: tech._id, 
        status: { $in: ['resolved', 'closed'] }
      });
      
      const reopenedCount = await ServiceRequest.countDocuments({ 
        assignedTo: tech._id, 
        reopenedCount: { $gt: 0 }
      });
      
      const avgResolutionTime = await ServiceRequest.aggregate([
        { 
          $match: { 
            assignedTo: tech._id, 
            resolutionTime: { $exists: true } 
          } 
        },
        { 
          $group: { 
            _id: null, 
            avgTime: { $avg: '$resolutionTime' } 
          } 
        }
      ]);
      
      return {
        technician: {
          id: tech._id,
          name: tech.name,
          email: tech.email,
          department: tech.department
        },
        stats: {
          totalResolved,
          reopenedCount,
          avgResolutionTime: avgResolutionTime[0]?.avgTime || 0,
          successRate: totalResolved > 0 ? ((totalResolved - reopenedCount) / totalResolved * 100).toFixed(2) : 0
        }
      };
    })
  );
  
  sendResponse(res, 200, true, 'Technician performance retrieved successfully', { performanceData });
});

module.exports = {
  getDashboardStats,
  getFilteredRequests,
  bulkUpdateRequests,
  getUserManagement,
  toggleUserStatus,
  getTechnicians,
  getTechnicianPerformance
};