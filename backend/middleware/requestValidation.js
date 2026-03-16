const { body, param } = require('express-validator');

const createRequestValidation = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),
  
  body('description')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),
  
  body('category')
    .isIn(['maintenance', 'it_support', 'facilities', 'security', 'other'])
    .withMessage('Invalid category'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority'),
  
  body('location')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Location must be between 3 and 100 characters')
];

const updateStatusValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid request ID'),
  
  body('status')
    .isIn(['pending', 'in_progress', 'resolved', 'closed', 'reopened'])
    .withMessage('Invalid status'),
  
  body('adminRemarks')
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage('Admin remarks cannot exceed 300 characters'),
  
  body('resolutionNotes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Resolution notes cannot exceed 500 characters'),
  
  body('assignedTo')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Assigned to cannot exceed 100 characters')
];

const requestIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid request ID')
];

module.exports = {
  createRequestValidation,
  updateStatusValidation,
  requestIdValidation
};