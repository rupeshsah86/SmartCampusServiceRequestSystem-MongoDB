// Frontend security utilities

// XSS protection - sanitize user input
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Validate file uploads
export const validateFile = (file, allowedTypes = [], maxSize = 5 * 1024 * 1024) => {
  const errors = [];
  
  if (!file) {
    errors.push('No file selected');
    return { isValid: false, errors };
  }
  
  // Check file size
  if (file.size > maxSize) {
    errors.push(`File size must be less than ${maxSize / (1024 * 1024)}MB`);
  }
  
  // Check file type
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    errors.push(`File type must be one of: ${allowedTypes.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Secure token storage
export const tokenStorage = {
  set: (token) => {
    // In production, consider using httpOnly cookies
    localStorage.setItem('token', token);
  },
  
  get: () => {
    return localStorage.getItem('token');
  },
  
  remove: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  
  isValid: (token) => {
    if (!token) return false;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }
};

// CSRF protection for forms
export const generateCSRFToken = () => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

// Rate limiting for client-side
export const clientRateLimit = {
  attempts: new Map(),

  isAllowed(key, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
    const now = Date.now();
    const attempts = clientRateLimit.attempts.get(key) || [];
    const validAttempts = attempts.filter(time => now - time < windowMs);
    if (validAttempts.length >= maxAttempts) return false;
    validAttempts.push(now);
    clientRateLimit.attempts.set(key, validAttempts);
    return true;
  },

  reset(key) {
    clientRateLimit.attempts.delete(key);
  }
};