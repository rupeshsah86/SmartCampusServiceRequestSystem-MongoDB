import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { requestAPI } from '../services/api';
import { handleApiError } from '../utils/helpers';
import '../styles/forms.css';

const Feedback = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [formData, setFormData] = useState({
    rating: 5,
    serviceQuality: 5,
    responseTime: 5,
    overallSatisfaction: 5,
    comments: ''
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchRequest();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchRequest = async () => {
    try {
      setLoading(true);
      const response = await requestAPI.getById(id);
      const requestData = response.data.data;
      
      if (requestData.status !== 'resolved') {
        setError('Feedback can only be submitted for resolved requests');
        return;
      }
      
      setRequest(requestData);
      setError('');
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRatingChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: parseInt(value)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setSubmitting(true);
    try {
      await fetch(`${process.env.REACT_APP_API_URL}/feedback/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      setError(handleApiError(error));
    } finally {
      setSubmitting(false);
    }
  };

  const renderStarRating = (field, value, label) => (
    <div className="form-group">
      <label className="form-label required">{label}</label>
      <div className="star-rating">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            className={`star ${star <= value ? 'active' : ''}`}
            onClick={() => handleRatingChange(field, star)}
            disabled={submitting}
          >
            ⭐
          </button>
        ))}
        <span className="rating-text">({value}/5)</span>
      </div>
    </div>
  );

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

  if (success) {
    return (
      <div className="form-container">
        <div className="container">
          <div className="form-card">
            <div className="form-success">
              <h2>✅ Feedback Submitted Successfully!</h2>
              <p>Thank you for your feedback. It helps us improve our services.</p>
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
          <h1>Submit Feedback</h1>
          <div className="form-breadcrumb">
            <Link to="/dashboard">Dashboard</Link> / 
            <Link to={`/request/${id}`}>Request Details</Link> / Feedback
          </div>
        </div>
      </div>

      <div className="container">
        <div className="form-card">
          {request && (
            <div className="form-section">
              <h3 className="form-section-title">Request Information</h3>
              <div className="request-summary">
                <p><strong>Title:</strong> {request.title}</p>
                <p><strong>Request ID:</strong> {request.requestId}</p>
                <p><strong>Status:</strong> <span className="badge badge-resolved">Resolved</span></p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className={submitting ? 'form-loading' : ''}>
            <div className="form-section">
              <h3 className="form-section-title">Rate Our Service</h3>
              
              {renderStarRating('rating', formData.rating, 'Overall Rating')}
              {renderStarRating('serviceQuality', formData.serviceQuality, 'Service Quality')}
              {renderStarRating('responseTime', formData.responseTime, 'Response Time')}
              {renderStarRating('overallSatisfaction', formData.overallSatisfaction, 'Overall Satisfaction')}

              <div className="form-group">
                <label className="form-label">Additional Comments</label>
                <textarea
                  name="comments"
                  className="form-control form-textarea"
                  value={formData.comments}
                  onChange={(e) => setFormData(prev => ({ ...prev, comments: e.target.value }))}
                  placeholder="Share your experience or suggestions for improvement..."
                  disabled={submitting}
                  maxLength={300}
                />
                <div className="character-count">
                  {formData.comments.length}/300 characters
                </div>
              </div>
            </div>

            <div className="form-actions">
              <Link to={`/request/${id}`} className="btn btn-secondary">
                Cancel
              </Link>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="spinner"></span>
                    Submitting...
                  </>
                ) : (
                  'Submit Feedback'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Feedback;