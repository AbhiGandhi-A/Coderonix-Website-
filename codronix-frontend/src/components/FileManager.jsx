import React, { useState, useEffect } from 'react';

const FileManager = ({ user, socket }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [members, setMembers] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [sharedWith, setSharedWith] = useState([]);

  useEffect(() => {
    fetchFiles();
    fetchMembers();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('file-shared', (file) => {
        // 💡 FIXED: Check for duplicate file before updating the state to avoid key collision
        setFiles(prev => {
          if (!prev.some(f => f._id === file._id)) {
            return [file, ...prev];
          }
          return prev; // Do not add duplicate
        });
      });

      return () => {
        socket.off('file-shared');
      };
    }
  }, [socket]);

  const fetchFiles = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/files', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setFiles(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching files:', error);
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/groups/by-id/${user.group_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setMembers([data.leader, ...data.members]);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('shared_with', JSON.stringify(sharedWith));
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      if (response.ok) {
        const newFile = await response.json();
        setFiles([newFile, ...files]);
        setSelectedFile(null);
        setSharedWith([]);
        if (socket) {
          // 💡 FIXED: Emit the uploadedBy and file_name for notifications.
          socket.emit('file-shared', { 
            group_id: user.group_id, 
            uploadedBy: user.id, // The user ID is sent
            file_name: newFile.file_name,
            file: newFile // Also send the full file object
          });
        }
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    }
    setUploading(false);
  };

  const toggleMemberShare = (memberId) => {
    if (sharedWith.includes(memberId)) {
      setSharedWith(sharedWith.filter(id => id !== memberId));
    } else {
      setSharedWith([...sharedWith, memberId]);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return <div className="loading">Loading files...</div>;
  }

  const isValidDate = (date) => {
    return date instanceof Date && !isNaN(date);
  };

  return (
    <div className="file-manager">
      <div className="file-header">
        <h2>File Sharing</h2>
      </div>

      <div className="upload-section">
        <h3>Upload New File</h3>
        <form onSubmit={handleFileUpload} className="upload-form">
          <div className="form-group">
            <label>Select File</label>
            <input
              type="file"
              onChange={(e) => setSelectedFile(e.target.files[0])}
              className="file-input"
              required
            />
          </div>

          <div className="form-group">
            <label>Share With (optional - leave empty to share with everyone)</label>
            <div className="member-selection">
              {members && members.length > 0 && members
                .filter(member => member._id !== user.id)
                .map(member => (
                  <label key={member._id} className="member-checkbox">
                    <input
                      type="checkbox"
                      checked={sharedWith.includes(member._id)}
                      onChange={() => toggleMemberShare(member._id)}
                    />
                    <span>{member.name} ({member.role})</span>
                  </label>
                ))
              }
            </div>
          </div>

          <button type="submit" disabled={uploading || !selectedFile} className="btn-primary">
            {uploading ? 'Uploading...' : 'Upload File'}
          </button>
        </form>
      </div>

      <div className="files-section">
        <h3>Shared Files</h3>
        {files.length === 0 ? (
          <div className="empty-state">
            <p>No files shared yet. Upload your first file!</p>
          </div>
        ) : (
          <div className="files-grid">
            {files.map(file => {
              const uploadedDate = new Date(file.uploaded_at);
              return (
                <div key={file._id} className="file-card">
                  <div className="file-icon">
                    📄
                  </div>
                  <div className="file-info">
                    <h4>{file.file_name}</h4>
                    <div className="file-meta">
                      <p>Shared by: <strong>{file.shared_by?.name || 'Unknown'}</strong></p>
                      <p>Date: {isValidDate(uploadedDate) ? uploadedDate.toLocaleDateString() : 'N/A'}</p>
                      {file.shared_with && file.shared_with.length > 0 ? (
                        <div className="shared-with">
                          <p>Shared with:</p>
                          <div className="shared-list">
                            {file.shared_with.map(member => (
                              <span key={member._id} className="shared-tag">
                                {member?.name || 'Unknown'}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="shared-all">Shared with everyone</p>
                      )}
                    </div>
                  </div>
                  <div className="file-actions">
                    <a
                      href={`http://localhost:5000/${file.file_path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary"
                    >
                      Download
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileManager;