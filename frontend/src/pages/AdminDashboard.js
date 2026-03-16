import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminAPI, requestAPI } from '../services/api';
import { formatDate, formatStatus, formatPriority, getStatusColor, getPriorityColor, handleApiError, formatResolutionTime } from '../utils/helpers';
import { exportAdminReportToPDF, exportTechnicianPerformanceToPDF } from '../utils/pdfExport';
import EnhancedAnalytics from '../components/EnhancedAnalytics';
import '../styles/admin.css';
import '../styles/enhanced-analytics.css';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [techPerformance, setTechPerformance] = useState([]);
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [assignModal, setAssignModal] = useState(false);
  const [technicians, setTechnicians] = useState([]);
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    priority: '',
    page: 1,
    limit: 10
  });

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchDashboardStats();
    } else if (activeTab === 'requests') {
      fetchRequests();
    } else if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'performance') {
      fetchTechnicianPerformance();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, filters]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getDashboardStats();
      setStats(response.data.data);
      setError('');
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await requestAPI.getAllRequests(filters);
      console.log('Requests response:', response.data);
      setRequests(response.data.data.requests);
      setError('');
    } catch (err) {
      console.error('Error fetching requests:', err);
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getUsers(filters);
      console.log('Users response:', response.data);
      setUsers(response.data.data.users);
      setError('');
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchTechnicianPerformance = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getTechnicianPerformance();
      setTechPerformance(response.data.data.performanceData || []);
      setError('');
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (requestId, newStatus) => {
    try {
      await requestAPI.updateStatus(requestId, { status: newStatus });
      fetchRequests(); // Refresh the list
    } catch (err) {
      setError(handleApiError(err));
    }
  };

  const fetchTechnicians = async () => {
    try {
      const response = await adminAPI.getTechnicians();
      setTechnicians(response.data.data.technicians);
    } catch (err) {
      console.error('Error fetching technicians:', err);
    }
  };

  const handleAssignTechnician = async () => {
    if (!selectedTechnician || selectedRequests.length === 0) return;
    
    try {
      await adminAPI.bulkUpdate({
        requestIds: selectedRequests,
        updates: { assignedTo: selectedTechnician }
      });
      setAssignModal(false);
      setSelectedTechnician('');
      setSelectedRequests([]);
      fetchRequests();
    } catch (err) {
      setError(handleApiError(err));
    }
  };

  const openAssignModal = () => {
    fetchTechnicians();
    setAssignModal(true);
  };

  const handleBulkUpdate = async (updates) => {
    if (selectedRequests.length === 0) return;
    
    try {
      await adminAPI.bulkUpdate({
        requestIds: selectedRequests,
        updates
      });
      setSelectedRequests([]);
      fetchRequests();
    } catch (err) {
      setError(handleApiError(err));
    }
  };

  const handleRequestSelect = (requestId) => {
    setSelectedRequests(prev => 
      prev.includes(requestId)
        ? prev.filter(id => id !== requestId)
        : [...prev, requestId]
    );
  };

  const handleSelectAll = () => {
    if (selectedRequests.length === requests.length) {
      setSelectedRequests([]);
    } else {
      setSelectedRequests(requests.map(r => r._id));
    }
  };

  const renderOverview = () => (
    <div className="tab-content">
      {loading ? (
        <div className="text-center p-5">
          <div className="spinner"></div>
          <p>Loading dashboard statistics...</p>
        </div>
      ) : stats ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
            <button
              className="btn btn-primary"
              onClick={() => exportAdminReportToPDF(stats.overview, requests)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              📄 Export Report PDF
            </button>
          </div>
          
          <div className="analytics-grid">
            <div className="analytics-card requests">
              <div className="analytics-header">
                <h3 className="analytics-title">Total Requests</h3>
                <div className="analytics-icon" style={{ backgroundColor: '#6366f1' }}>📋</div>
              </div>
              <div className="analytics-value">{stats.overview.totalRequests}</div>
            </div>

            <div className="analytics-card users">
              <div className="analytics-header">
                <h3 className="analytics-title">Active Users</h3>
                <div className="analytics-icon" style={{ backgroundColor: '#10b981' }}>👥</div>
              </div>
              <div className="analytics-value">{stats.overview.totalUsers}</div>
            </div>

            <div className="analytics-card resolution">
              <div className="analytics-header">
                <h3 className="analytics-title">Avg Resolution Time</h3>
                <div className="analytics-icon" style={{ backgroundColor: '#f59e0b' }}>⏱️</div>
              </div>
              <div className="analytics-value">{stats.overview.avgResolutionTime.toFixed(1)} days</div>
            </div>
          </div>

          <EnhancedAnalytics stats={stats} />
        </>
      ) : null}
    </div>
  );

  const renderRequests = () => (
    <div className="tab-content">
      <div className="admin-filters">
        <div className="filters-header">
          <h3 className="filters-title">Filter Requests</h3>
        </div>
        <div className="filters-grid">
          <div className="filter-group">
            <label className="filter-label">Status</label>
            <select
              className="filter-input"
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label">Category</label>
            <select
              className="filter-input"
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
            >
              <option value="">All Categories</option>
              <option value="maintenance">Maintenance</option>
              <option value="it_support">IT Support</option>
              <option value="facilities">Facilities</option>
              <option value="security">Security</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label">Priority</label>
            <select
              className="filter-input"
              value={filters.priority}
              onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>
      </div>

      {selectedRequests.length > 0 && (
        <div className="bulk-actions">
          <div className="bulk-header">
            <h3 className="bulk-title">Bulk Actions</h3>
            <span className="selected-count">{selectedRequests.length} selected</span>
          </div>
          <div className="bulk-controls">
            <select
              className="bulk-select"
              onChange={(e) => e.target.value && handleBulkUpdate({ status: e.target.value })}
              defaultValue=""
            >
              <option value="">Update Status</option>
              <option value="in_progress">Mark In Progress</option>
              <option value="resolved">Mark Resolved</option>
              <option value="closed">Mark Closed</option>
            </select>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setSelectedRequests([])}
            >
              Clear Selection
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={openAssignModal}
            >
              Assign Technician
            </button>
          </div>
        </div>
      )}

      <div className="requests-table">
        <div className="table-header">
          <h3 className="table-title">Service Requests</h3>
        </div>
        
        {loading ? (
          <div className="text-center p-5">
            <div className="spinner"></div>
            <p>Loading requests...</p>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    className="table-checkbox"
                    checked={selectedRequests.length === requests.length && requests.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                <th>Request ID</th>
                <th>Title</th>
                <th>User</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Category</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests && requests.length > 0 ? (
                requests.map(request => (
                <tr key={request._id}>
                  <td>
                    <input
                      type="checkbox"
                      className="table-checkbox"
                      checked={selectedRequests.includes(request._id)}
                      onChange={() => handleRequestSelect(request._id)}
                    />
                  </td>
                  <td>
                    <span className="request-id">{request.requestId}</span>
                  </td>
                  <td>{request.title}</td>
                  <td>
                    <div className="user-info-cell">
                      <div className="user-name">{request.userId?.name || 'N/A'}</div>
                      <div className="user-email">{request.userId?.email || 'N/A'}</div>
                      <div className="user-dept">{request.userId?.department || 'N/A'}</div>
                    </div>
                  </td>
                  <td>
                    <span
                      className="badge"
                      style={{ backgroundColor: getStatusColor(request.status), color: 'white' }}
                    >
                      {formatStatus(request.status)}
                    </span>
                  </td>
                  <td>
                    <span
                      className="badge"
                      style={{ backgroundColor: getPriorityColor(request.priority), color: 'white' }}
                    >
                      {formatPriority(request.priority)}
                    </span>
                  </td>
                  <td>{request.category.replace('_', ' ')}</td>
                  <td>{formatDate(request.createdAt)}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="action-btn view">View</button>
                      <select
                        className="action-btn edit"
                        value={request.status}
                        onChange={(e) => handleStatusUpdate(request._id, e.target.value)}
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  </td>
                </tr>
              ))
              ) : (
                <tr>
                  <td colSpan="9" className="empty-state">
                    <div className="empty-state-icon">📋</div>
                    <div className="empty-state-title">No Requests Found</div>
                    <div className="empty-state-text">There are no service requests to display</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="tab-content">
      <div className="requests-table">
        <div className="table-header">
          <h3 className="table-title">User Management</h3>
        </div>
        
        {loading ? (
          <div className="text-center p-5">
            <div className="spinner"></div>
            <p>Loading users...</p>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Department</th>
                <th>Requests</th>
                <th>Status</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users && users.length > 0 ? (
                users.map(user => (
                <tr key={user._id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className="badge badge-primary">
                      {user.role.toUpperCase()}
                    </span>
                  </td>
                  <td>{user.department}</td>
                  <td>{user.requestCount || 0}</td>
                  <td>
                    <span className={`badge ${user.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{formatDate(user.createdAt)}</td>
                </tr>
              ))
              ) : (
                <tr>
                  <td colSpan="7" className="empty-state">
                    <div className="empty-state-icon">👥</div>
                    <div className="empty-state-title">No Users Found</div>
                    <div className="empty-state-text">There are no users to display</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  const renderPerformance = () => (
    <div className="tab-content">
      <div className="requests-table">
        <div className="table-header">
          <h3 className="table-title">🏆 Technician Performance Metrics</h3>
          {techPerformance && techPerformance.length > 0 && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => exportTechnicianPerformanceToPDF(techPerformance.map(p => ({
                name: p.technician.name,
                email: p.technician.email,
                totalResolved: p.stats.totalResolved,
                reopenedCount: p.stats.reopenedCount,
                avgResolutionTime: formatResolutionTime(p.stats.avgResolutionTime),
                successRate: parseFloat(p.stats.successRate)
              })))}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              📄 Export PDF
            </button>
          )}
        </div>
        
        {loading ? (
          <div className="text-center p-5">
            <div className="spinner"></div>
            <p>Loading performance data...</p>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Technician</th>
                <th>Department</th>
                <th>Total Resolved</th>
                <th>Reopened Count</th>
                <th>Avg Resolution Time</th>
                <th>Success Rate</th>
                <th>Performance</th>
              </tr>
            </thead>
            <tbody>
              {techPerformance && techPerformance.length > 0 ? (
                techPerformance.map((perf, idx) => {
                  const successRate = parseFloat(perf.stats.successRate);
                  const performanceColor = successRate >= 90 ? '#10b981' : successRate >= 75 ? '#f59e0b' : '#ef4444';
                  return (
                    <tr key={idx}>
                      <td>
                        <div className="user-info-cell">
                          <div className="user-name">{perf.technician.name}</div>
                          <div className="user-email">{perf.technician.email}</div>
                        </div>
                      </td>
                      <td>{perf.technician.department}</td>
                      <td>
                        <span className="badge" style={{ backgroundColor: '#6366f1', color: 'white' }}>
                          {perf.stats.totalResolved}
                        </span>
                      </td>
                      <td>
                        <span className="badge" style={{ backgroundColor: perf.stats.reopenedCount > 0 ? '#ef4444' : '#94a3b8', color: 'white' }}>
                          {perf.stats.reopenedCount}
                        </span>
                      </td>
                      <td>
                        <span className="badge" style={{ backgroundColor: '#8b5cf6', color: 'white' }}>
                          {formatResolutionTime(perf.stats.avgResolutionTime)}
                        </span>
                      </td>
                      <td>
                        <span className="badge" style={{ backgroundColor: performanceColor, color: 'white' }}>
                          {successRate.toFixed(1)}%
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ 
                            width: '100px', 
                            height: '8px', 
                            backgroundColor: '#e2e8f0', 
                            borderRadius: '4px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${successRate}%`,
                              height: '100%',
                              backgroundColor: performanceColor,
                              transition: 'width 0.3s ease'
                            }}></div>
                          </div>
                          <span style={{ fontSize: '20px' }}>
                            {successRate >= 90 ? '🌟' : successRate >= 75 ? '👍' : '⚠️'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="empty-state">
                    <div className="empty-state-icon">📊</div>
                    <div className="empty-state-title">No Performance Data</div>
                    <div className="empty-state-text">No technician performance data available</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div className="container">
          <div className="admin-nav">
            <h1 className="admin-title">Admin Dashboard</h1>
            <div className="dashboard-user">
              <div className="user-info">
                <p className="user-name">{user?.name}</p>
                <p className="user-role">Administrator</p>
              </div>
              <button className="logout-btn" onClick={logout}>
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="admin-content">
        <div className="container">
          {error && (
            <div className="alert alert-error mb-4">
              {error}
            </div>
          )}

          <div className="admin-tabs">
            <div className="tab-nav">
              <button
                className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                📊 Overview
              </button>
              <button
                className={`tab-button ${activeTab === 'requests' ? 'active' : ''}`}
                onClick={() => setActiveTab('requests')}
              >
                📋 Requests
              </button>
              <button
                className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
                onClick={() => setActiveTab('users')}
              >
                👥 Users
              </button>
              <button
                className={`tab-button ${activeTab === 'performance' ? 'active' : ''}`}
                onClick={() => setActiveTab('performance')}
              >
                🏆 Performance
              </button>
            </div>

            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'requests' && renderRequests()}
            {activeTab === 'users' && renderUsers()}
            {activeTab === 'performance' && renderPerformance()}
          </div>
        </div>
      </div>

      {/* Assign Technician Modal */}
      {assignModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Assign Technician</h3>
              <button 
                className="modal-close"
                onClick={() => setAssignModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <p>Assign {selectedRequests.length} selected request(s) to:</p>
              <div className="form-group">
                <label>Select Technician</label>
                <select
                  value={selectedTechnician}
                  onChange={(e) => setSelectedTechnician(e.target.value)}
                  className="form-control"
                >
                  <option value="">Choose a technician...</option>
                  {technicians.map(tech => (
                    <option key={tech._id} value={tech._id}>
                      {tech.name} - {tech.department}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setAssignModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleAssignTechnician}
                disabled={!selectedTechnician}
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;