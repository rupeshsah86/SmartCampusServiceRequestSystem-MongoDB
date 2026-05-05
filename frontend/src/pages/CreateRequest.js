import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { requestAPI } from '../services/api';
import { handleApiError } from '../utils/helpers';
import '../styles/forms.css';

const CreateRequest = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium',
    location: ''
  });
  const [files, setFiles] = useState([]);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const categories = [
    { value: 'maintenance', label: 'Maintenance', desc: 'Repairs, cleaning, equipment issues' },
    { value: 'it_support', label: 'IT Support', desc: 'Computer, network, software issues' },
    { value: 'facilities', label: 'Facilities', desc: 'Room booking, furniture, utilities' },
    { value: 'security', label: 'Security', desc: 'Safety concerns, access issues' },
    { value: 'other', label: 'Other', desc: 'General inquiries and requests' }
  ];

  const priorities = [
    { value: 'low', label: 'Low', desc: 'Can wait a few days' },
    { value: 'medium', label: 'Medium', desc: 'Should be addressed soon' },
    { value: 'high', label: 'High', desc: 'Needs attention today' },
    { value: 'urgent', label: 'Urgent', desc: 'Immediate attention required' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handlePriorityChange = (priority) => {
    setFormData(prev => ({
      ...prev,
      priority
    }));
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 5) {
      setErrors({ files: 'Maximum 5 files allowed' });
      return;
    }
    setFiles(selectedFiles);
    setErrors(prev => ({ ...prev, files: '' }));
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.trim().length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    } else if (formData.title.trim().length > 100) {
      newErrors.title = 'Title cannot exceed 100 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    } else if (formData.description.trim().length > 500) {
      newErrors.description = 'Description cannot exceed 500 characters';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    } else if (formData.location.trim().length < 3) {
      newErrors.location = 'Location must be at least 3 characters';
    } else if (formData.location.trim().length > 100) {
      newErrors.location = 'Location cannot exceed 100 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('priority', formData.priority);
      formDataToSend.append('location', formData.location);
      
      files.forEach(file => {
        formDataToSend.append('attachments', file);
      });

      const response = await requestAPI.create(formDataToSend);
      
      if (response.data.data.aiSuggestion) {
        setAiSuggestion(response.data.data.aiSuggestion);
      }
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      setErrors({ submit: handleApiError(error) });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="form-container">
        <div className="container">
          <div className="form-card">
            <div className="form-success">
              <h2>✅ Request Submitted Successfully!</h2>
              <p>Your service request has been created and assigned a unique ID.</p>
              {aiSuggestion && (
                <div className="ai-suggestion-result">
                  <p><strong>AI Analysis:</strong></p>
                  <p>Suggested Category: {aiSuggestion.category} ({aiSuggestion.confidence}% confidence)</p>
                  <p>Suggested Priority: {aiSuggestion.priority}</p>
                </div>
              )}
              <p>Redirecting to dashboard...</p>
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
          <h1>Create Service Request</h1>
          <div className="form-breadcrumb">
            <Link to="/dashboard">Dashboard</Link> / Create Request
          </div>
        </div>
      </div>

      <div className="container">
        <div className="form-card">
          <form onSubmit={handleSubmit} className={loading ? 'form-loading' : ''}>
            {errors.submit && (
              <div className="alert alert-error">
                {errors.submit}
              </div>
            )}

            <div className="form-section">
              <h3 className="form-section-title">Request Details</h3>
              
              <div className="form-group">
                <label className="form-label required">Title</label>
                <input
                  type="text"
                  name="title"
                  className={`form-control ${errors.title ? 'error' : ''}`}
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Brief description of your request"
                  disabled={loading}
                />
                {errors.title && <div className="form-error">{errors.title}</div>}
                <div className="character-count">
                  {formData.title.length}/100 characters
                </div>
              </div>

              <div className="form-group">
                <label className="form-label required">Description</label>
                <textarea
                  name="description"
                  className={`form-control form-textarea ${errors.description ? 'error' : ''}`}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Provide detailed information about your request..."
                  disabled={loading}
                />
                {errors.description && <div className="form-error">{errors.description}</div>}
                <div className="character-count">
                  {formData.description.length}/500 characters
                </div>
              </div>

              <div className="form-row">
                <div className="form-col">
                  <div className="form-group">
                    <label className="form-label required">Category</label>
                    <select
                      name="category"
                      className={`form-select ${errors.category ? 'error' : ''}`}
                      value={formData.category}
                      onChange={handleChange}
                      disabled={loading}
                    >
                      <option value="">Select a category</option>
                      {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label} - {cat.desc}
                        </option>
                      ))}
                    </select>
                    {errors.category && <div className="form-error">{errors.category}</div>}
                  </div>
                </div>

                <div className="form-col">
                  <div className="form-group">
                    <label className="form-label required">Location</label>
                    <input
                      type="text"
                      name="location"
                      className={`form-control ${errors.location ? 'error' : ''}`}
                      value={formData.location}
                      onChange={handleChange}
                      placeholder="e.g., Room 101, Building A"
                      disabled={loading}
                    />
                    {errors.location && <div className="form-error">{errors.location}</div>}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Attachments (Optional)</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  onChange={handleFileChange}
                  className="form-control"
                  disabled={loading}
                />
                <small className="form-help">Upload images or PDF files (Max 5 files, 5MB each)</small>
                {errors.files && <div className="form-error">{errors.files}</div>}
                
                {files.length > 0 && (
                  <div className="file-list">
                    {files.map((file, index) => (
                      <div key={index} className="file-item">
                        <span>{file.name}</span>
                        <button type="button" onClick={() => removeFile(index)}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="form-section">
              <h3 className="form-section-title">Priority Level</h3>
              <div className="priority-selector">
                {priorities.map(priority => (
                  <div
                    key={priority.value}
                    className={`priority-option ${priority.value} ${formData.priority === priority.value ? 'active' : ''}`}
                    onClick={() => handlePriorityChange(priority.value)}
                  >
                    <input
                      type="radio"
                      name="priority"
                      value={priority.value}
                      checked={formData.priority === priority.value}
                      readOnly
                    />
                    <div className="priority-label">{priority.label}</div>
                    <div className="priority-desc">{priority.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-actions">
              <Link to="/dashboard" className="btn btn-secondary">
                Cancel
              </Link>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateRequest;