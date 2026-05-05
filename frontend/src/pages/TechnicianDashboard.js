import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { requestAPI } from '../services/api';
import { formatDate, formatStatus, getStatusColor, formatPriority, getPriorityColor, formatCategory } from '../utils/helpers';
import Loading from '../components/Loading';
import '../styles/dashboard.css';

const TechnicianDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0
  });
  const [filter, setFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [updateModal, setUpdateModal] = useState(false);
  const [detailsModal, setDetailsModal] = useState(false);
  const [updateData, setUpdateData] = useState({
    status: '',
    resolutionNotes: '',
    workNote: ''
  });
  const [proofFiles, setProofFiles] = useState([]);

  useEffect(() => {
    fetchAssignedRequests();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, priorityFilter, searchTerm, sortBy]);

  const fetchAssignedRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filter !== 'all') params.status = filter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      if (searchTerm) params.search = searchTerm;
      
      const response = await requestAPI.getAllRequests(params);
      let requestsData = response.data.data.requests || [];
      
      // Sort requests
      requestsData = requestsData.sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
        if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
        if (sortBy === 'priority') {
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return 0;
      });
      
      setRequests(requestsData);
      calculateStats(requestsData);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  }, [filter, priorityFilter, searchTerm, sortBy]);

  const calculateStats = (requestsData) => {
    const stats = {
      total: requestsData.length,
      pending: requestsData.filter(r => r.status === 'pending').length,
      inProgress: requestsData.filter(r => r.status === 'in_progress').length,
      resolved: requestsData.filter(r => r.status === 'resolved').length
    };
    setStats(stats);
  };

  const handleUpdateRequest = async () => {
    try {
      const formData = new FormData();
      formData.append('status', updateData.status);
      if (updateData.resolutionNotes) formData.append('resolutionNotes', updateData.resolutionNotes);
      if (updateData.workNote) formData.append('workNote', updateData.workNote);
      
      proofFiles.forEach(file => {
        formData.append('proofOfWork', file);
      });
      
      await requestAPI.updateStatus(selectedRequest._id, formData);
      setUpdateModal(false);
      setSelectedRequest(null);
      setUpdateData({ status: '', resolutionNotes: '', workNote: '' });
      setProofFiles([]);
      fetchAssignedRequests();
    } catch (error) {
      console.error('Error updating request:', error);
    }
  };

  const openUpdateModal = (request) => {
    setSelectedRequest(request);
    setUpdateData({
      status: request.status,
      resolutionNotes: request.resolutionNotes || '',
      workNote: ''
    });
    setProofFiles([]);
    setUpdateModal(true);
  };
  
  const openDetailsModal = (request) => {
    setSelectedRequest(request);
    setDetailsModal(true);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) return <Loading />;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="container">
          <div className="dashboard-nav">
            <h1 className="dashboard-title">🔧 Technician Dashboard</h1>
            <div className="dashboard-user">
              <div className="user-info">
                <p className="user-name">{user?.name}</p>
                <p className="user-role">{user?.department} • Technician</p>
              </div>
              <button className="logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="container">
          {/* Stats Cards */}
          <div className="dashboard-stats">
            <div className="stats-grid">
              <div className="stat-card primary">
                <div className="stat-header">
                  <span className="stat-title">Total Assigned</span>
                  <div className="stat-icon primary">📋</div>
                </div>
                <p className="stat-value">{stats.total}</p>
              </div>
              
              <div className="stat-card warning">
                <div className="stat-header">
                  <span className="stat-title">Pending</span>
                  <div className="stat-icon warning">⏳</div>
                </div>
                <p className="stat-value">{stats.pending}</p>
              </div>
              
              <div className="stat-card primary">
                <div className="stat-header">
                  <span className="stat-title">In Progress</span>
                  <div className="stat-icon primary">🔄</div>
                </div>
                <p className="stat-value">{stats.inProgress}</p>
              </div>
              
              <div className="stat-card success">
                <div className="stat-header">
                  <span className="stat-title">Resolved</span>
                  <div className="stat-icon success">✅</div>
                </div>
                <p className="stat-value">{stats.resolved}</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="dashboard-actions">
            <div className="filters">
              <div className="filter-group">
                <label className="filter-label">Status</label>
                <select 
                  value={filter} 
                  onChange={(e) => setFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              
              <div className="filter-group">
                <label className="filter-label">Priority</label>
                <select 
                  value={priorityFilter} 
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              
              <div className="filter-group">
                <label className="filter-label">Sort By</label>
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                  className="filter-select"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="priority">High Priority First</option>
                </select>
              </div>
              
              <div className="filter-group">
                <label className="filter-label">Search</label>
                <input
                  type="text"
                  placeholder="Search by title or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="filter-select"
                />
              </div>
            </div>
          </div>

          {/* Requests Section */}
          <div className="requests-section">
            <div className="section-header">
              <h2 className="section-title">My Assigned Requests</h2>
            </div>
            
            <div className="requests-list">
              {requests.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📝</div>
                  <h3>No Assigned Requests</h3>
                  <p>You don't have any requests assigned to you yet.</p>
                </div>
              ) : (
                requests.map((request) => {
                  const isHighPriority = request.priority === 'high' || request.priority === 'urgent';
                  return (
                  <div 
                    key={request._id} 
                    className="request-item"
                    style={isHighPriority ? { borderLeft: '4px solid #ef4444', backgroundColor: '#fef2f2' } : {}}
                  >
                    <div className="request-header">
                      <h3 className="request-title">
                        {isHighPriority && <span style={{ color: '#ef4444', marginRight: '8px' }}>🔥</span>}
                        {request.title}
                      </h3>
                      <div className="request-meta">
                        <span
                          className="badge"
                          style={{ backgroundColor: getStatusColor(request.status), color: 'white' }}
                        >
                          {formatStatus(request.status)}
                        </span>
                        <span
                          className="badge"
                          style={{ backgroundColor: getPriorityColor(request.priority), color: 'white' }}
                        >
                          {formatPriority(request.priority)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="request-body">
                      <p className="request-description">
                        {request.description.length > 150
                          ? `${request.description.substring(0, 150)}...`
                          : request.description
                        }
                      </p>
                      
                      <div className="request-details">
                        <span>👤 {request.userId?.name || 'N/A'}</span>
                        <span>🏷️ {formatCategory(request.category)}</span>
                        <span>📍 {request.location}</span>
                        <span>📅 {formatDate(request.createdAt)}</span>
                      </div>
                    </div>
                    
                    <div className="request-footer">
                      <div className="request-actions">
                        <button 
                          className="btn btn-sm btn-secondary"
                          onClick={() => openDetailsModal(request)}
                        >
                          View Details
                        </button>
                        <button 
                          className="btn btn-sm btn-primary"
                          onClick={() => openUpdateModal(request)}
                        >
                          Update Status
                        </button>
                      </div>
                    </div>
                  </div>
                );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Update Modal */}
      {updateModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Update Request Status</h3>
              <button 
                className="modal-close"
                onClick={() => setUpdateModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Status *</label>
                <select
                  value={updateData.status}
                  onChange={(e) => setUpdateData({...updateData, status: e.target.value})}
                  className="form-control"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Work Note</label>
                <textarea
                  value={updateData.workNote}
                  onChange={(e) => setUpdateData({...updateData, workNote: e.target.value})}
                  className="form-control"
                  rows="3"
                  placeholder="Add progress update or comment..."
                />
              </div>
              
              <div className="form-group">
                <label>Resolution Notes</label>
                <textarea
                  value={updateData.resolutionNotes}
                  onChange={(e) => setUpdateData({...updateData, resolutionNotes: e.target.value})}
                  className="form-control"
                  rows="3"
                  placeholder="Final resolution notes (for resolved status)..."
                />
              </div>
              
              <div className="form-group">
                <label>Proof of Work (Optional)</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  onChange={(e) => setProofFiles(Array.from(e.target.files))}
                  className="form-control"
                />
                {proofFiles.length > 0 && (
                  <small style={{ color: '#22c55e', marginTop: '4px', display: 'block' }}>
                    {proofFiles.length} file(s) selected
                  </small>
                )}
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setUpdateModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleUpdateRequest}
              >
                Update Request
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Details Modal */}
      {detailsModal && selectedRequest && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h3 style={{ color: '#1e293b', fontWeight: '600' }}>Request Details</h3>
              <button 
                className="modal-close"
                onClick={() => setDetailsModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ marginBottom: '10px', color: '#0f172a', fontSize: '18px', fontWeight: '600' }}>
                  {selectedRequest.title}
                </h4>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
                  <span className="badge" style={{ backgroundColor: getStatusColor(selectedRequest.status), color: 'white', fontWeight: '500' }}>
                    {formatStatus(selectedRequest.status)}
                  </span>
                  <span className="badge" style={{ backgroundColor: getPriorityColor(selectedRequest.priority), color: 'white', fontWeight: '500' }}>
                    {formatPriority(selectedRequest.priority)}
                  </span>
                </div>
              </div>
              
              <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#f1f5f9', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <strong style={{ color: '#334155', fontSize: '14px', fontWeight: '600' }}>Description:</strong>
                <p style={{ marginTop: '8px', color: '#1e293b', lineHeight: '1.6', fontSize: '14px' }}>
                  {selectedRequest.description}
                </p>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <strong style={{ color: '#475569', fontSize: '13px', fontWeight: '600' }}>Category:</strong>
                  <p style={{ marginTop: '5px', color: '#0f172a', fontSize: '14px', fontWeight: '500' }}>
                    {formatCategory(selectedRequest.category)}
                  </p>
                </div>
                <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <strong style={{ color: '#475569', fontSize: '13px', fontWeight: '600' }}>Location:</strong>
                  <p style={{ marginTop: '5px', color: '#0f172a', fontSize: '14px', fontWeight: '500' }}>
                    📍 {selectedRequest.location}
                  </p>
                </div>
                <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <strong style={{ color: '#475569', fontSize: '13px', fontWeight: '600' }}>Created By:</strong>
                  <p style={{ marginTop: '5px', color: '#0f172a', fontSize: '14px', fontWeight: '500' }}>
                    👤 {selectedRequest.userId?.name || 'N/A'}
                  </p>
                </div>
                <div style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <strong style={{ color: '#475569', fontSize: '13px', fontWeight: '600' }}>Created Date:</strong>
                  <p style={{ marginTop: '5px', color: '#0f172a', fontSize: '14px', fontWeight: '500' }}>
                    📅 {formatDate(selectedRequest.createdAt)}
                  </p>
                </div>
              </div>
              
              {selectedRequest.workNotes && selectedRequest.workNotes.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <strong style={{ color: '#334155', fontSize: '15px', fontWeight: '600', display: 'block', marginBottom: '10px' }}>
                    📝 Activity Timeline:
                  </strong>
                  <div style={{ marginTop: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                    {selectedRequest.workNotes.map((note, idx) => (
                      <div key={idx} style={{ 
                        padding: '12px', 
                        backgroundColor: '#eff6ff', 
                        borderRadius: '6px', 
                        marginBottom: '10px',
                        borderLeft: '4px solid #3b82f6',
                        border: '1px solid #bfdbfe'
                      }}>
                        <p style={{ fontSize: '14px', marginBottom: '8px', color: '#1e293b', lineHeight: '1.5' }}>
                          {note.note}
                        </p>
                        <small style={{ color: '#64748b', fontSize: '12px', fontWeight: '500' }}>
                          👤 {note.addedBy?.name || 'Technician'} • {formatDate(note.addedAt)}
                        </small>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedRequest.resolutionNotes && (
                <div style={{ 
                  marginTop: '20px', 
                  padding: '12px', 
                  backgroundColor: '#f0fdf4', 
                  borderRadius: '6px',
                  border: '1px solid #bbf7d0',
                  borderLeft: '4px solid #22c55e'
                }}>
                  <strong style={{ color: '#166534', fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
                    ✅ Resolution Notes:
                  </strong>
                  <p style={{ marginTop: '5px', color: '#15803d', fontSize: '14px', lineHeight: '1.6' }}>
                    {selectedRequest.resolutionNotes}
                  </p>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setDetailsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicianDashboard;