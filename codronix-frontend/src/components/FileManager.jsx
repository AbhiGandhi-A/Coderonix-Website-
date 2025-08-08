// src/components/FileManager.jsx

import React, { useState, useEffect, useCallback } from 'react';
import '../styles/global.css';

const FileManager = ({ user, socket }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [members, setMembers] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [sharedWith, setSharedWith] = useState([]);
  
  // 💡 NEW: State for handling notification messages
  const [message, setMessage] = useState(null); 

  // Define your backend URL using the environment variable
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

  // 💡 NEW: Helper function to display messages
  const displayMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => {
      setMessage(null);
    }, 5000); // Message disappears after 5 seconds
  };
  
  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      // Use the absolute URL here
      const response = await fetch(`${BACKEND_URL}/api/files`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }
      const data = await response.json();
      setFiles(data);
    } catch (error) {
      console.error('Error fetching files:', error);
      displayMessage('Failed to load files.', 'error');
    } finally {
      setLoading(false);
    }
  }, [BACKEND_URL]);

  const fetchMembers = useCallback(async () => {
    if (!user || !user.group_id) {
      console.warn('Cannot fetch members: user or group_id is missing.');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      // Use the absolute URL here
      const response = await fetch(`${BACKEND_URL}/api/groups/by-id/${user.group_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch members');
      }
      const data = await response.json();
      const allMembers = [];
      if (data.leader) allMembers.push(data.leader);
      if (data.members && Array.isArray(data.members)) {
        allMembers.push(...data.members);
      }
      setMembers(allMembers);
    } catch (error) {
      console.error('Error fetching members:', error);
      displayMessage('Failed to load group members.', 'error');
    }
  }, [user, BACKEND_URL]);


  // Fetch files and members on component mount
  useEffect(() => {
    if (user && user.group_id) {
      fetchFiles();
      fetchMembers();
    } else {
      setLoading(false);
    }
  }, [user, fetchFiles, fetchMembers]);

  // Socket listener for file-shared events
  useEffect(() => {
    if (socket) {
      const handleFileShared = (newFile) => {
        setFiles(prevFiles => {
          if (newFile && newFile._id && !prevFiles.some(file => file._id === newFile._id)) {
            return [newFile, ...prevFiles];
          }
          return prevFiles;
        });
      };
      socket.on('file-shared', handleFileShared);

      return () => {
        socket.off('file-shared', handleFileShared);
      };
    }
  }, [socket]);

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      displayMessage('Please select a file to upload.', 'error');
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('shared_with', JSON.stringify(sharedWith));
    try {
      const token = localStorage.getItem('token');
      // Use the absolute URL here
      const response = await fetch(`${BACKEND_URL}/api/files/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      if (response.ok) {
        const newFile = await response.json();
        setFiles(prevFiles => [newFile, ...prevFiles]);
        setSelectedFile(null);
        setSharedWith([]);
        if (socket && user) {
          socket.emit('file-shared', { 
            group_id: user.group_id, 
            uploadedBy: user._id, 
            fileName: newFile.file_name,
            file: newFile
          });
        }
        // 💡 REPLACED alert() with displayMessage()
        displayMessage('File uploaded successfully!', 'success');
        
      } else {
        const errorData = await response.json();
        // 💡 REPLACED alert() with displayMessage()
        displayMessage(`Failed to upload file: ${errorData.message || 'Unknown error'}`, 'error');
        console.error('Error uploading file:', errorData);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      // 💡 REPLACED alert() with displayMessage()
      displayMessage('An error occurred during file upload.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!fileId) {
      console.error('Attempted to delete file with undefined ID.');
      displayMessage('Cannot delete file: ID is missing.', 'error');
      return;
    }
    if (window.confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
      try {
        const token = localStorage.getItem('token');
        // Use the absolute URL here
        const response = await fetch(`${BACKEND_URL}/api/files/${fileId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          setFiles(prevFiles => prevFiles.filter(file => file._id !== fileId));
          console.log(`File with ID ${fileId} successfully deleted.`);
          // 💡 REPLACED alert() with displayMessage()
          displayMessage('File deleted successfully!', 'success');
        } else {
          const errorData = await response.json();
          // 💡 REPLACED alert() with displayMessage()
          displayMessage(`Failed to delete file: ${errorData.message || 'Unknown error'}`, 'error');
          console.error('Error deleting file:', errorData);
        }
      } catch (error) {
        console.error('Error deleting file:', error);
        // 💡 REPLACED alert() with displayMessage()
        displayMessage('An error occurred while deleting the file.', 'error');
      }
    }
  };

  const toggleMemberShare = (memberId) => {
    setSharedWith(prevSharedWith => {
      if (prevSharedWith.includes(memberId)) {
        return prevSharedWith.filter(id => id !== memberId);
      } else {
        return [...prevSharedWith, memberId];
      }
    });
  };

  const isValidDate = (date) => {
    return date instanceof Date && !isNaN(date);
  };

  if (loading) {
    return <div className="loading">Loading files...</div>;
  }

  return (
    <div className="file-manager">
      {/* 💡 NEW: Notification message display */}
      {message && (
        <div className={`notification-message ${message.type}`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="close-btn">
            &times;
          </button>
        </div>
      )}

      <div className="file-header">
        <h2>File Sharing</h2>
      </div>
      <div className="upload-section">
        <h3>Upload New File</h3>
        <form onSubmit={handleFileUpload} className="upload-form">
          <div className="form-group">
            <label>Select File</label>
            <div className="file-input-wrapper">
              <input
                id="file-upload"
                type="file"
                onChange={(e) => setSelectedFile(e.target.files[0])}
                className="file-input"
                required
              />
              <label htmlFor="file-upload" className="file-input-label">
                <span className="file-icon">📁</span>
                <span className="file-name">
                  {selectedFile ? selectedFile.name : 'Choose a file...'}
                </span>
              </label>
            </div>
          </div>
          <div className="form-group">
            <label>Share With (optional - leave empty to share with everyone)</label>
            <div className="member-selection">
              {members && members.length > 0 ? (
                members
                  .filter(member => member._id !== user._id) 
                  .map((member, index) => (
                    <label key={member._id || `member-${index}`} className="member-checkbox">
                      <input
                        type="checkbox"
                        checked={sharedWith.includes(member._id)}
                        onChange={() => toggleMemberShare(member._id)}
                      />
                      <span>{member.name} ({member.role})</span>
                    </label>
                  ))
              ) : (
                <p>No other members to share with.</p>
              )}
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
            {files.map((file, index) => {
              const uploadedDate = new Date(file.uploaded_at);
              const isUploader = (file.shared_by && file.shared_by._id === user._id);
              
              return (
                <div key={file._id || `file-${index}`} className="file-card">
                  <div className="file-icon">📄</div>
                  <div className="file-info">
                    <h4>{file.file_name || 'Untitled File'}</h4>
                    <div className="file-meta">
                      <p>Shared by: <strong>{file.shared_by?.name || 'Unknown'}</strong></p>
                      <p>Date: {isValidDate(uploadedDate) ? uploadedDate.toLocaleDateString() : 'N/A'}</p>
                      {file.shared_with && file.shared_with.length > 0 ? (
                        <div className="shared-with">
                          <p>Shared with:</p>
                          <div className="shared-list">
                            {file.shared_with.map((member, memberIndex) => (
                              <span key={member._id || `shared-member-${memberIndex}`} className="shared-tag">
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
                      // Use the absolute URL for the download link
                      href={`${BACKEND_URL}/${file.file_path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary"
                    >
                      Download
                    </a>
                    {isUploader && (
                      <button
                        onClick={() => handleDeleteFile(file._id)}
                        className="btn-danger"
                      >
                        Delete
                      </button>
                    )}
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