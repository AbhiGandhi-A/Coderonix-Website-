import React, { useState, useEffect } from 'react';

const MemberManager = ({ user }) => {
  const [members, setMembers] = useState([]);
  const [leader, setLeader] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/groups/by-id/${user.group_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      setLeader(data.leader);
      setMembers(data.members);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching members:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading members...</div>;
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