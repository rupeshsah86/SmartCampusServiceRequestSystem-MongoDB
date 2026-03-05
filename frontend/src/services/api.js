import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle responses and errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// Request API calls
export const requestAPI = {
  create: (requestData) => {
    const config = requestData instanceof FormData ? {
      headers: { 'Content-Type': 'multipart/form-data' }
    } : {};
    return api.post('/requests', requestData, config);
  },
  getMyRequests: (params) => api.get('/requests/my-requests', { params }),
  getAllRequests: (params) => api.get('/requests', { params }),
  getById: (id) => api.get(`/requests/${id}`),
  updateStatus: (id, data) => api.put(`/requests/${id}/status`, data),
  confirmResolution: (id, action) => api.put(`/requests/${id}/confirm`, { action }),
  delete: (id) => api.delete(`/requests/${id}`),
};

// Admin API calls
export const adminAPI = {
  getDashboardStats: (params) => api.get('/admin/dashboard/stats', { params }),
  getFilteredRequests: (params) => api.get('/admin/requests/filtered', { params }),
  bulkUpdate: (data) => api.put('/admin/requests/bulk-update', data),
  getUsers: (params) => api.get('/admin/users', { params }),
  toggleUserStatus: (userId) => api.put(`/admin/users/${userId}/toggle-status`),
  getTechnicians: () => api.get('/admin/technicians'),
  getTechnicianPerformance: () => api.get('/admin/technicians/performance'),
};

// Feedback API calls
export const feedbackAPI = {
  getFeedbackByRequest: (requestId) => api.get(`/feedback/${requestId}/details`),
  getPublicFeedback: (limit = 6) => axios.get(`${API_URL}/feedback/public?limit=${limit}`),
};

export default api;