const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceRequest',
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: [true, 'Overall rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  comments: {
    type: String,
    trim: true,
    maxlength: [300, 'Comments cannot exceed 300 characters']
  },
  serviceQuality: {
    type: Number,
    required: [true, 'Service quality rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  responseTime: {
    type: Number,
    required: [true, 'Response time rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  overallSatisfaction: {
    type: Number,
    required: [true, 'Overall satisfaction rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  }
}, {
  timestamps: true
});

// Index for better query performance
// Note: requestId index is created automatically via unique:true above
feedbackSchema.index({ userId: 1 });

module.exports = mongoose.model('Feedback', feedbackSchema);