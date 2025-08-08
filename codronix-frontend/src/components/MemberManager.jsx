import React, { useState, useEffect, useCallback } from 'react';
import '../styles/global.css'; // Assuming you have a global stylesheet for consistent styling

const MemberManager = ({ user }) => {
  const [members, setMembers] = useState([]);
  const [leader, setLeader] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Define your backend URL using the environment variable
  const SERVER_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      // Use the absolute URL here
      const response = await fetch(`${SERVER_URL}/api/groups/by-id/${user.group_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch group members.');
      }

      const data = await response.json();
      setLeader(data.leader);
      setMembers(data.members);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching members:', error);
      setError('Failed to load group members. Please try again.');
      setLoading(false);
    }
  }, [user.group_id, SERVER_URL]);

  useEffect(() => {
    if (user && user.group_id) {
      fetchMembers();
    } else {
      setLoading(false);
    }
  }, [user, fetchMembers]);

  if (loading) {
    return <div className="loading">Loading members...</div>;
  }
  
  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="member-manager">
      <div className="member-header">
        <h2>Group Members</h2>
        <div className="member-stats">
          <span className="stat">
            Total Members: <strong>{members.length + 1}</strong>
          </span>
        </div>
      </div>

      <div className="members-section">
        <h3>Group Leader</h3>
        <div className="member-card leader-card">
          <div className="member-avatar">
            {leader?.name.charAt(0).toUpperCase()}
          </div>
          <div className="member-info">
            <h4>{leader?.name}</h4>
            <p className="member-email">{leader?.email}</p>
            <p className="member-role">Group Leader</p>
            <p className="member-username">Username: {leader?.username}</p>
          </div>
          <div className="member-status">
            <span className="status-badge leader">Leader</span>
          </div>
        </div>

        <h3>Members</h3>
        {members.length === 0 ? (
          <div className="empty-state">
            <p>No members in this group yet.</p>
          </div>
        ) : (
          <div className="members-grid">
            {members.map(member => (
              <div key={member._id} className="member-card">
                <div className="member-avatar">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div className="member-info">
                  <h4>{member.name}</h4>
                  <p className="member-email">{member.email}</p>
                  <p className="member-role">Member</p>
                  <p className="member-id">ID: {member.member_id}</p>
                  <p className="join-date">
                    Joined: {new Date(member.joined_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="member-status">
                  <span className="status-badge member">Member</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberManager;