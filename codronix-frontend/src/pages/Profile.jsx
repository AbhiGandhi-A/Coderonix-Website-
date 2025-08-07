import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Profile = ({ user, logout, setUser }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email
  });
  
  const [passwordData, setPasswordData] = useState({
    tempPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setUser(data.user);
        setMessage('Profile updated successfully');
        setEditing(false);
        setTimeout(() => setMessage(''), 3000);
      } else {
        setError(data.message || 'Failed to update profile');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }
    
    setLoading(false);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      setLoading(false);
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tempPassword: passwordData.tempPassword,
          newPassword: passwordData.newPassword
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage('Password updated successfully! Please login with your new password.');
        setPasswordData({
          tempPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setTimeout(() => {
          logout(); // Auto logout after password change
        }, 2000);
      } else {
        setError(data.message || 'Failed to update password');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }
    
    setLoading(false);
  };

  return (
    <div className="profile-page">
      <header className="dashboard-header">
        <div className="container">
          <div className="header-left">
            <h1>Codronix</h1>
          </div>
          <div className="header-right">
            <Link to="/dashboard" className="btn-secondary">Back to Dashboard</Link>
            <button onClick={logout} className="btn-danger">Logout</button>
          </div>
        </div>
      </header>

      <main className="profile-main">
        <div className="container">
          <div className="profile-card">
            <div className="profile-header">
              <div className="profile-avatar">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="profile-info">
                <h2>{user.name}</h2>
                <p className="role-badge">{user.role === 'leader' ? 'Group Leader' : 'Member'}</p>
                <p className="group-id">Group: {user.group_id}</p>
                {user.member_id && <p className="member-id">Member ID: {user.member_id}</p>}
              </div>
            </div>

            <div className="profile-tabs">
              <button 
                className={activeTab === 'profile' ? 'active' : ''}
                onClick={() => setActiveTab('profile')}
              >
                👤 Profile Info
              </button>
              <button 
                className={activeTab === 'password' ? 'active' : ''}
                onClick={() => setActiveTab('password')}
              >
                🔒 Update Password
              </button>
              <button 
                className={activeTab === 'settings' ? 'active' : ''}
                onClick={() => setActiveTab('settings')}
              >
                ⚙️ Settings
              </button>
            </div>

            <div className="profile-content">
              {message && <div className="success-message">{message}</div>}
              {error && <div className="error-message">{error}</div>}

              {activeTab === 'profile' && (
                <>
                  {editing ? (
                    <form onSubmit={handleProfileSubmit} className="profile-form">
                      <div className="form-group">
                        <label>Full Name</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Email</label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          required
                        />
                      </div>
                      <div className="form-actions">
                        <button type="submit" disabled={loading} className="btn-primary">
                          {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button type="button" onClick={() => setEditing(false)} className="btn-secondary">
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="profile-details">
                      <div className="detail-item">
                        <label>Full Name</label>
                        <span>{user.name}</span>
                      </div>
                      <div className="detail-item">
                        <label>Email</label>
                        <span>{user.email}</span>
                      </div>
                      <div className="detail-item">
                        <label>Username</label>
                        <span>{user.username || user.member_id}</span>
                      </div>
                      <div className="detail-item">
                        <label>Role</label>
                        <span>{user.role === 'leader' ? 'Group Leader' : 'Member'}</span>
                      </div>
                      <div className="detail-item">
                        <label>Joined</label>
                        <span>{new Date(user.joined_at).toLocaleDateString()}</span>
                      </div>
                      
                      <button onClick={() => setEditing(true)} className="btn-primary">
                        Edit Profile
                      </button>
                    </div>
                  )}
                </>
              )}

              {activeTab === 'password' && (
                <div className="password-update-section">
                  <div className="password-info">
                    <h3>🔐 Update Your Password</h3>
                    <p>Enter your temporary password (received via email) and set a new secure password.</p>
                  </div>
                  
                  <form onSubmit={handlePasswordSubmit} className="password-form">
                    <div className="form-group">
                      <label>
                        <span className="label-text">Temporary Password</span>
                        <span className="label-hint">Enter the password sent to your email</span>
                      </label>
                      <input
                        type="password"
                        value={passwordData.tempPassword}
                        onChange={(e) => setPasswordData({...passwordData, tempPassword: e.target.value})}
                        placeholder="Enter temporary password"
                        required
                        className="temp-password-input"
                      />
                    </div>

                    <div className="form-group">
                      <label>
                        <span className="label-text">New Password</span>
                        <span className="label-hint">Minimum 6 characters</span>
                      </label>
                      <input
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                        placeholder="Enter new password"
                        required
                        minLength="6"
                        className="new-password-input"
                      />
                    </div>

                    <div className="form-group">
                      <label>
                        <span className="label-text">Confirm New Password</span>
                        <span className="label-hint">Re-enter your new password</span>
                      </label>
                      <input
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                        placeholder="Confirm new password"
                        required
                        className="confirm-password-input"
                      />
                    </div>

                    <div className="password-strength">
                      {passwordData.newPassword && (
                        <div className="strength-indicator">
                          <span className={`strength-bar ${passwordData.newPassword.length >= 6 ? 'valid' : 'invalid'}`}>
                            {passwordData.newPassword.length >= 6 ? '✓' : '✗'} Minimum 6 characters
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="form-actions">
                      <button type="submit" disabled={loading} className="btn-primary update-password-btn">
                        {loading ? (
                          <>
                            <span className="loading-spinner"></span>
                            Updating...
                          </>
                        ) : (
                          <>
                            🔒 Update Password
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="settings-section">
                  <h3>Account Settings</h3>
                  <div className="setting-item">
                    <label>Email Notifications</label>
                    <input type="checkbox" defaultChecked />
                    <span>Receive email notifications for new messages and tasks</span>
                  </div>
                  <div className="setting-item">
                    <label>Desktop Notifications</label>
                    <input type="checkbox" defaultChecked />
                    <span>Show desktop notifications when the app is open</span>
                  </div>
                  <div className="setting-item">
                    <label>Theme</label>
                    <select>
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="auto">Auto</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
