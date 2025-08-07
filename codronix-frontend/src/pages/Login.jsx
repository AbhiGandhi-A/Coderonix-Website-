import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Login = ({ setUser }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Forgot password modal states
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotError, setForgotError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('token', data.token);
        setUser(data.user);
        navigate('/dashboard');
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }
    
    setLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError('');
    setForgotMessage('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: forgotEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setForgotMessage('Password has been sent to your email address.');
        setForgotEmail('');
        setTimeout(() => {
          setShowForgotModal(false);
          setForgotMessage('');
        }, 3000);
      } else {
        setForgotError(data.message || 'Failed to send password');
      }
    } catch (error) {
      setForgotError('Network error. Please try again.');
    }

    setForgotLoading(false);
  };

  const closeForgotModal = () => {
    setShowForgotModal(false);
    setForgotEmail('');
    setForgotError('');
    setForgotMessage('');
  };

  return (
    <div className="login-page">
      <div className="container">
        <div className="login-form">
          <div className="form-header">
            <h2>Welcome Back</h2>
            <p>Sign in to your Codronix account</p>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username or Member ID</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                placeholder="Enter your username or member ID"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="Enter your password"
                required
              />
            </div>
            
            {error && <div className="error-message">{error}</div>}
            
            <button type="submit" disabled={loading} className="btn-primary btn-large">
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
          
          <div className="form-footer">
            <p>Don't have an account? <Link to="/register">Create a group</Link></p>
            <p>
              <button 
                type="button" 
                onClick={() => setShowForgotModal(true)}
                className="forgot-password-link"
              >
                Forgot Password?
              </button>
            </p>
            <p><Link to="/">Back to Home</Link></p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="modal-overlay" onClick={closeForgotModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Forgot Password</h3>
              <button className="close-btn" onClick={closeForgotModal}>×</button>
            </div>
            
            <form onSubmit={handleForgotPassword}>
              <div className="form-group">
                <label>Username or Email</label>
                <input
                  type="text"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="Enter your username or email"
                  required
                />
              </div>
              
              {forgotError && <div className="error-message">{forgotError}</div>}
              {forgotMessage && <div className="success-message">{forgotMessage}</div>}
              
              <div className="modal-actions">
                <button 
                  type="button" 
                  onClick={closeForgotModal}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={forgotLoading}
                  className="btn-primary"
                >
                  {forgotLoading ? 'Sending...' : 'Send Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
