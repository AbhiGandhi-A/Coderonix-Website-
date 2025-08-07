import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    groupName: '',
    leader: {
      name: '',
      email: '',
      username: '',
      password: ''
    },
    members: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const addMember = () => {
    setFormData({
      ...formData,
      members: [...formData.members, { name: '', email: '' }]
    });
  };

  const removeMember = (index) => {
    setFormData({
      ...formData,
      members: formData.members.filter((_, i) => i !== index)
    });
  };

  const updateMember = (index, field, value) => {
    const updatedMembers = [...formData.members];
    updatedMembers[index][field] = value;
    setFormData({
      ...formData,
      members: updatedMembers
    });
  };

  const updateLeader = (field, value) => {
    setFormData({
      ...formData,
      leader: {
        ...formData.leader,
        [field]: value
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/register-group', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data);
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }

    setLoading(false);
  };

  if (success) {
    return (
      <div className="register-page">
        <div className="container">
          <div className="register-success">
            <h2>Group Created Successfully!</h2>
            <p>Group ID: <strong>{success.group_id}</strong></p>
            
            <div className="member-credentials">
              <h3>Member Login Credentials:</h3>
              {success.member_credentials.map((member, index) => (
                <div key={index} className="credential-card">
                  <h4>{member.name}</h4>
                  <p>Member ID: <strong>{member.member_id}</strong></p>
                  <p>Password: <strong>{member.password}</strong></p>
                </div>
              ))}
            </div>

            <div className="success-actions">
              <p>Please share these credentials with your team members.</p>
              <Link to="/login" className="btn-primary">Go to Login</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="register-page">
      <div className="container">
        <div className="register-form">
          <div className="form-header">
            <h2>Create Your Group</h2>
            <p>Set up your team and start collaborating</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-section">
              <h3>Group Information</h3>
              <div className="form-group">
                <label>Group Name</label>
                <input
                  type="text"
                  value={formData.groupName}
                  onChange={(e) => setFormData({...formData, groupName: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="form-section">
              <h3>Group Leader Details</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={formData.leader.name}
                    onChange={(e) => updateLeader('name', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.leader.email}
                    onChange={(e) => updateLeader('email', e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Username</label>
                  <input
                    type="text"
                    value={formData.leader.username}
                    onChange={(e) => updateLeader('username', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    value={formData.leader.password}
                    onChange={(e) => updateLeader('password', e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="section-header">
                <h3>Team Members</h3>
                <button type="button" onClick={addMember} className="btn-secondary">
                  Add Member
                </button>
              </div>

              {formData.members.map((member, index) => (
                <div key={index} className="member-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Full Name</label>
                      <input
                        type="text"
                        value={member.name}
                        onChange={(e) => updateMember(index, 'name', e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input
                        type="email"
                        value={member.email}
                        onChange={(e) => updateMember(index, 'email', e.target.value)}
                        required
                      />
                    </div>
                    <button 
                      type="button" 
                      onClick={() => removeMember(index)}
                      className="btn-danger remove-btn"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="form-actions">
              <button type="submit" disabled={loading} className="btn-primary btn-large">
                {loading ? 'Creating Group...' : 'Create Group'}
              </button>
            </div>
          </form>

          <div className="form-footer">
            <p>Already have an account? <Link to="/login">Sign in</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;