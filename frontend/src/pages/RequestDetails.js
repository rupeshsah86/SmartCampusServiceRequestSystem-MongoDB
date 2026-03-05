import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { requestAPI, feedbackAPI } from '../services/api';
import { formatDate, formatStatus, formatPriority, getStatusColor, getPriorityColor, handleApiError, formatResolutionTime } from '../utils/helpers';
import { exportRequestToPDF } from '../utils/pdfExport';
import QRCodeGenerator from '../components/QRCodeGenerator';
import Toast from '../components/Toast';
import '../styles/forms.css';

const RequestDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [slaStatus, setSlaStatus] = useState({ timeLeft: '', isOverdue: false, percentage: 0 });

  useEffect(() => {
    fetchRequest();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (request && request.status !== 'closed' && request.status !== 'resolved') {
      calculateSLA();
      const interval = setInterval(calculateSLA, 60000); // Update every minute
      return () => clearInterval(interval);
    }
  }, [request]);

  const calculateSLA = () => {
    if (!request) return;

    const slaHours = {
      urgent: 24,
      high: 24,
      medium: 48,
      low: 72
    };

    const slaTime = slaHours[request.priority] || 48;
    const createdAt = new Date(request.createdAt);
    const now = new Date();
    const elapsedHours = (now - createdAt) / (1000 * 60 * 60);
    const remainingHours = slaTime - elapsedHours;

    if (remainingHours <= 0) {
      setSlaStatus({
        timeLeft: 'OVERDUE',
        isOverdue: true,
        percentage: 100
      });
    } else {
      const days = Math.floor(remainingHours / 24);
      const hours = Math.floor(remainingHours % 24);
      const timeLeft = days > 0 ? `${days}d ${hours}h` : `${hours}h`;
      const percentage = ((slaTime - remainingHours) / slaTime) * 100;

      setSlaStatus({
        timeLeft,
        isOverdue: false,
        percentage
      });
    }
  };

  const fetchRequest = async () => {
    try {
      setLoading(true);
      const response = await requestAPI.getById(id);
      setRequest(response.data.data);
      
      // Fetch feedback if request is closed
      if (response.data.data.status === 'closed') {
        try {
          const feedbackResponse = await feedbackAPI.getFeedbackByRequest(id);
          setFeedback(feedbackResponse.data.data);
        } catch (err) {
          // Feedback not found is okay
          console.log('No feedback found');
        }
      }
      
      setError('');
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this request?')) return;
    
    try {
      await requestAPI.delete(id);
      navigate('/dashboard');
    } catch (err) {
      setError(handleApiError(err));
    }
  };

  const handleConfirmResolution = async (action) => {
    const confirmMsg = action === 'accept' 
      ? 'Are you sure you want to accept this resolution and close the ticket?'
      : 'Are you sure you want to reject this resolution? The ticket will be reopened.';
    
    if (!window.confirm(confirmMsg)) return;
    
    try {
      setConfirmLoading(true);
      await requestAPI.confirmResolution(id, action);
      setToast({
        show: true,
        message: action === 'accept' ? 'Resolution accepted! Ticket closed.' : 'Resolution rejected. Ticket reopened.',
        type: 'success'
      });
      setTimeout(() => fetchRequest(), 1000);
    } catch (err) {
      setToast({
        show: true,
        message: handleApiError(err),
        type: 'error'
      });
    } finally {
      setConfirmLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="form-container">
        <div className="container">
          <div className="text-center p-5">
            <div className="spinner"></div>
            <p>Loading request details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="form-container">
        <div className="container">
          <div className="form-card">
            <div className="alert alert-error">
              {error}
            </div>
            <div className="text-center">
              <Link to="/dashboard" className="btn btn-primary">
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="form-container">
        <div className="container">
          <div className="form-card">
            <div className="text-center">
              <h2>Request Not Found</h2>
              <p>The requested service request could not be found.</p>
              <Link to="/dashboard" className="btn btn-primary">
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="form-container">
      <div className="form-header">
        <div className="container">
          <h1>Request Details</h1>
          <div className="form-breadcrumb">
            <Link to="/dashboard">Dashboard</Link> / Request #{request.requestId}
          </div>
        </div>
      </div>

      <div className="container">
        <div className="form-card">
          <div className="form-section">
            <div className="d-flex justify-content-between align-items-start mb-4">
              <div>
                <h2 className="form-section-title">{request.title}</h2>
                <p className="text-muted">Request ID: {request.requestId}</p>
              </div>
              <div className="d-flex gap-2">
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

            <div className="row mb-4">
              <div className="col-6">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <div className="form-control" style={{ backgroundColor: 'var(--color-background-tertiary)', color: 'var(--color-text-primary)' }}>
                    {request.category.replace('_', ' ').toUpperCase()}
                  </div>
                </div>
              </div>
              <div className="col-6">
                <div className="form-group">
                  <label className="form-label">Location</label>
                  <div className="form-control" style={{ backgroundColor: 'var(--color-background-tertiary)', color: 'var(--color-text-primary)' }}>
                    📍 {request.location}
                  </div>
                </div>
              </div>
            </div>

            {/* SLA Timer */}
            {request.status !== 'closed' && request.status !== 'resolved' && (
              <div className="form-group">
                <label className="form-label">SLA Status</label>
                <div style={{
                  padding: '15px',
                  backgroundColor: slaStatus.isOverdue ? '#fee2e2' : '#eff6ff',
                  border: `2px solid ${slaStatus.isOverdue ? '#dc2626' : '#3b82f6'}`,
                  borderRadius: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ 
                      fontSize: '14px', 
                      fontWeight: '600',
                      color: slaStatus.isOverdue ? '#dc2626' : '#1e40af'
                    }}>
                      {slaStatus.isOverdue ? '⚠️ OVERDUE' : `⏱️ Time Remaining: ${slaStatus.timeLeft}`}
                    </span>
                    <span style={{ 
                      fontSize: '12px', 
                      color: '#64748b',
                      fontWeight: '500'
                    }}>
                      Priority: {formatPriority(request.priority)}
                    </span>
                  </div>
                  <div style={{
                    height: '8px',
                    backgroundColor: '#e2e8f0',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${slaStatus.percentage}%`,
                      backgroundColor: slaStatus.isOverdue ? '#dc2626' : slaStatus.percentage > 75 ? '#f59e0b' : '#3b82f6',
                      transition: 'width 0.3s ease'
                    }}></div>
                  </div>
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Description</label>
              <div className="form-control form-textarea" style={{ backgroundColor: 'var(--color-background-tertiary)', color: 'var(--color-text-primary)', minHeight: '120px' }}>
                {request.description}
              </div>
            </div>

            <div className="row mb-4">
              <div className="col-6">
                <div className="form-group">
                  <label className="form-label">Submitted By</label>
                  <div className="form-control" style={{ backgroundColor: 'var(--color-background-tertiary)', color: 'var(--color-text-primary)' }}>
                    {request.userId.name} ({request.userId.email})
                  </div>
                </div>
              </div>
              <div className="col-6">
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <div className="form-control" style={{ backgroundColor: 'var(--color-background-tertiary)', color: 'var(--color-text-primary)' }}>
                    {request.userId.department}
                  </div>
                </div>
              </div>
            </div>

            <div className="row mb-4">
              <div className="col-6">
                <div className="form-group">
                  <label className="form-label">Created Date</label>
                  <div className="form-control" style={{ backgroundColor: 'var(--color-background-tertiary)', color: 'var(--color-text-primary)' }}>
                    📅 {formatDate(request.createdAt)}
                  </div>
                </div>
              </div>
              <div className="col-6">
                <div className="form-group">
                  <label className="form-label">Last Updated</label>
                  <div className="form-control" style={{ backgroundColor: 'var(--color-background-tertiary)', color: 'var(--color-text-primary)' }}>
                    🔄 {formatDate(request.updatedAt)}
                  </div>
                </div>
              </div>
            </div>

            {request.assignedTo && (
              <div className="form-group">
                <label className="form-label">Assigned To</label>
                <div className="form-control" style={{ 
                  backgroundColor: 'rgba(59, 130, 246, 0.1)', 
                  color: 'var(--color-primary-700)', 
                  border: '1px solid rgba(59, 130, 246, 0.2)' 
                }}>
                  👤 {request.assignedTo}
                </div>
              </div>
            )}

            {request.adminRemarks && (
              <div className="form-group">
                <label className="form-label">Admin Remarks</label>
                <div className="form-control form-textarea" style={{ 
                  backgroundColor: 'rgba(245, 158, 11, 0.1)', 
                  color: 'var(--color-warning)', 
                  border: '1px solid rgba(245, 158, 11, 0.2)', 
                  minHeight: '80px' 
                }}>
                  {request.adminRemarks}
                </div>
              </div>
            )}

            {request.resolutionNotes && (
              <div className="form-group">
                <label className="form-label">Resolution Notes</label>
                <div className="form-control form-textarea" style={{ 
                  backgroundColor: 'rgba(16, 185, 129, 0.1)', 
                  color: 'var(--color-success)', 
                  border: '1px solid rgba(16, 185, 129, 0.2)', 
                  minHeight: '80px' 
                }}>
                  {request.resolutionNotes}
                </div>
              </div>
            )}

            {request.resolvedAt && (
              <div className="form-group">
                <label className="form-label">Resolved Date</label>
                <div className="form-control" style={{ 
                  backgroundColor: 'rgba(16, 185, 129, 0.1)', 
                  color: 'var(--color-success)', 
                  border: '1px solid rgba(16, 185, 129, 0.2)' 
                }}>
                  ✅ {formatDate(request.resolvedAt)}
                </div>
              </div>
            )}

            {request.closedAt && (
              <div className="form-group">
                <label className="form-label">Closed Date</label>
                <div className="form-control" style={{ backgroundColor: 'var(--color-background-tertiary)', color: 'var(--color-text-primary)' }}>
                  🔒 {formatDate(request.closedAt)}
                </div>
              </div>
            )}

            {request.resolutionTime && (
              <div className="form-group">
                <label className="form-label">Resolution Time</label>
                <div className="form-control" style={{ 
                  backgroundColor: 'rgba(59, 130, 246, 0.1)', 
                  color: 'var(--color-primary-700)', 
                  border: '1px solid rgba(59, 130, 246, 0.2)' 
                }}>
                  ⏱️ {formatResolutionTime(request.resolutionTime)}
                </div>
              </div>
            )}

            {request.reopenedCount > 0 && (
              <div className="form-group">
                <label className="form-label">Reopen History</label>
                <div className="form-control" style={{ 
                  backgroundColor: 'rgba(220, 53, 69, 0.1)', 
                  color: '#dc3545', 
                  border: '1px solid rgba(220, 53, 69, 0.2)' 
                }}>
                  🔄 Reopened {request.reopenedCount} time{request.reopenedCount > 1 ? 's' : ''}
                </div>
              </div>
            )}

            {request.isLocked && (
              <div className="form-group">
                <div className="form-control" style={{ 
                  backgroundColor: 'rgba(108, 117, 125, 0.1)', 
                  color: '#6c757d', 
                  border: '1px solid rgba(108, 117, 125, 0.2)',
                  textAlign: 'center',
                  fontWeight: 'bold'
                }}>
                  🔒 This ticket is closed and locked. No further modifications allowed.
                </div>
              </div>
            )}

            {request.workNotes && request.workNotes.length > 0 && (
              <div className="form-group">
                <label className="form-label">Work Notes</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {request.workNotes.map((note, idx) => (
                    <div key={idx} style={{
                      padding: '12px',
                      backgroundColor: 'rgba(59, 130, 246, 0.05)',
                      borderLeft: '3px solid #3b82f6',
                      borderRadius: '4px'
                    }}>
                      <p style={{ margin: '0 0 8px 0', color: 'var(--color-text-primary)' }}>{note.note}</p>
                      <small style={{ color: '#64748b' }}>
                        👤 {note.addedBy?.name || 'Technician'} • {formatDate(note.addedAt)}
                      </small>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {request.proofOfWork && request.proofOfWork.length > 0 && (
              <div className="form-group">
                <label className="form-label">Proof of Work</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {request.proofOfWork.map((file, idx) => (
                    <div key={idx} style={{
                      padding: '10px 15px',
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span>📎</span>
                      <div>
                        <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                          {file.originalName}
                        </div>
                        <small style={{ color: '#64748b' }}>
                          {formatDate(file.uploadedAt)}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {request.activityLogs && request.activityLogs.length > 0 && (
              <div className="form-group">
                <label className="form-label">Activity Timeline</label>
                <div style={{ position: 'relative', paddingLeft: '30px' }}>
                  {request.activityLogs.map((log, idx) => (
                    <div key={idx} style={{
                      position: 'relative',
                      paddingBottom: '20px',
                      borderLeft: idx < request.activityLogs.length - 1 ? '2px solid #e2e8f0' : 'none'
                    }}>
                      <div style={{
                        position: 'absolute',
                        left: '-36px',
                        top: '0',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: '#3b82f6',
                        border: '2px solid white'
                      }}></div>
                      <div style={{
                        padding: '10px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0'
                      }}>
                        <div style={{ fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                          {log.action}
                        </div>
                        {log.details && (
                          <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>
                            {log.details}
                          </div>
                        )}
                        <small style={{ color: '#94a3b8' }}>
                          👤 {log.performedBy?.name || 'System'} • {formatDate(log.timestamp)}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {feedback && (
              <div className="form-group">
                <label className="form-label">User Feedback</label>
                <div style={{
                  padding: '20px',
                  backgroundColor: 'rgba(16, 185, 129, 0.05)',
                  border: '2px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: '8px'
                }}>
                  <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '5px' }}>Overall Rating</div>
                      <div style={{ fontSize: '24px' }}>{'⭐'.repeat(feedback.rating)}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '5px' }}>Service Quality</div>
                      <div style={{ fontSize: '24px' }}>{'⭐'.repeat(feedback.serviceQuality)}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '5px' }}>Response Time</div>
                      <div style={{ fontSize: '24px' }}>{'⭐'.repeat(feedback.responseTime)}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '5px' }}>Satisfaction</div>
                      <div style={{ fontSize: '24px' }}>{'⭐'.repeat(feedback.overallSatisfaction)}</div>
                    </div>
                  </div>
                  {feedback.comments && (
                    <div style={{
                      padding: '15px',
                      backgroundColor: 'white',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0'
                    }}>
                      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', fontWeight: '600' }}>Comments:</div>
                      <div style={{ color: 'var(--color-text-primary)', lineHeight: '1.6' }}>
                        {feedback.comments}
                      </div>
                    </div>
                  )}
                  <div style={{ marginTop: '15px', fontSize: '12px', color: '#94a3b8' }}>
                    Submitted by {feedback.userId?.name} on {formatDate(feedback.createdAt)}
                  </div>
                </div>
              </div>
            )}

            {request.status === 'resolved' && request.userId._id === user?._id && !request.isLocked && (
              <div className="form-group">
                <label className="form-label">Confirm Resolution</label>
                <div style={{
                  padding: '20px',
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  border: '2px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <p style={{ margin: '0 0 15px 0', color: 'var(--color-text-primary)', fontWeight: '500' }}>
                    The technician has marked this request as resolved. Please review and confirm.
                  </p>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <button
                      className="btn btn-success"
                      onClick={() => handleConfirmResolution('accept')}
                      disabled={confirmLoading}
                      style={{ minWidth: '150px' }}
                    >
                      {confirmLoading ? '⏳ Processing...' : '✅ Accept Resolution'}
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleConfirmResolution('reject')}
                      disabled={confirmLoading}
                      style={{ minWidth: '150px' }}
                    >
                      {confirmLoading ? '⏳ Processing...' : '❌ Reject Resolution'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="form-actions">
            <Link to="/dashboard" className="btn btn-secondary">
              Back to Dashboard
            </Link>
            
            <QRCodeGenerator requestId={request._id} requestData={request} />
            
            <button
              className="btn btn-primary"
              onClick={() => exportRequestToPDF(request)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              📄 Export PDF
            </button>
            
            {request.status === 'pending' && user?.role !== 'admin' && (
              <button
                className="btn btn-danger"
                onClick={handleDelete}
              >
                Delete Request
              </button>
            )}

            {request.status === 'resolved' && (
              <Link
                to={`/feedback/${request._id}`}
                className="btn btn-success"
              >
                Provide Feedback
              </Link>
            )}
          </div>
        </div>
      </div>

      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ show: false, message: '', type: '' })}
        />
      )}
    </div>
  );
};

export default RequestDetails;