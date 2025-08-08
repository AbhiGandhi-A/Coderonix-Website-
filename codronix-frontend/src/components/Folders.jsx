import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Folder, FileText, Plus, Trash2, Edit, Share2, Users, Download, X, Check } from 'lucide-react';
import { EditorState, convertToRaw, convertFromRaw } from 'draft-js';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';
import '../styles/Folders.css';
import DocumentEditor from './DocumentEditor';

const SERVER_URL = 'http://192.168.1.15:5000';

const Folders = ({ user, socket }) => {
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [showDocEditor, setShowDocEditor] = useState(false);
  const [currentDoc, setCurrentDoc] = useState(null);
  const [docTitle, setDocTitle] = useState('');
  const [editorState, setEditorState] = useState(EditorState.createEmpty());
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareDocId, setShareDocId] = useState(null);
  const [shareDocTitle, setShareDocTitle] = useState('');
  const [groupMembers, setGroupMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [activeTab, setActiveTab] = useState('my-folders');
  const [sharedDocs, setSharedDocs] = useState([]);
  const [sharingStatus, setSharingStatus] = useState({});

  const editorRef = useRef(null);

  useEffect(() => {
    if (user && user.group_id) {
      fetchFolders();
      fetchGroupMembers();
      fetchSharedDocs();
    }
  }, [user.group_id]);

  // Socket listeners for real-time updates
  useEffect(() => {
    if (socket) {
      socket.on('document-shared', (data) => {
        if (data.group_id === user.group_id) {
          fetchSharedDocs();
          setError('');
        }
      });

      socket.on('document-updated', (data) => {
        if (data.group_id === user.group_id) {
          fetchFolders();
          fetchSharedDocs();
        }
      });

      return () => {
        socket.off('document-shared');
        socket.off('document-updated');
      };
    }
  }, [socket, user.group_id]);

  const fetchFolders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${SERVER_URL}/api/folders/group/${user.group_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch folders');
      const data = await response.json();
      setFolders(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load folders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${SERVER_URL}/api/groups/${user.group_id}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        console.error('Failed to fetch group members');
        return;
      }
      const data = await response.json();
      setGroupMembers(data.filter(member => member._id !== user._id));
    } catch (err) {
      console.error('Error fetching group members:', err);
    }
  };

  const fetchSharedDocs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${SERVER_URL}/api/docs/shared`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        console.error('Failed to fetch shared documents');
        return;
      }
      const data = await response.json();
      setSharedDocs(data);
    } catch (err) {
      console.error('Error fetching shared docs:', err);
    }
  };

  const createFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${SERVER_URL}/api/folders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newFolderName, group_id: user.group_id })
      });
      if (!response.ok) throw new Error('Failed to create folder');
      const newFolder = await response.json();
      setFolders([...folders, newFolder]);
      setNewFolderName('');
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to create folder.');
    }
  };

  const deleteFolder = async (folderId) => {
    if (!window.confirm('Are you sure you want to delete this folder and all its contents?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${SERVER_URL}/api/folders/${folderId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to delete folder');
      setFolders(folders.filter(f => f._id !== folderId));
      setCurrentFolder(null);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to delete folder.');
    }
  };

  const handleFolderClick = async (folder) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${SERVER_URL}/api/folders/${folder._id}/contents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch folder contents');
      const folderWithContents = await response.json();
      setCurrentFolder(folderWithContents);
      setShowDocEditor(false);
      setCurrentDoc(null);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to fetch folder contents.');
    } finally {
      setLoading(false);
    }
  };

  const createNewDoc = () => {
    setDocTitle('');
    setCurrentDoc(null);
    setError('');
    setEditorState(EditorState.createEmpty());
    setShowDocEditor(true);
  };

  const saveDoc = async () => {
    if (!docTitle.trim() || !currentFolder) {
      setError('Title and folder are required.');
      return;
    }

    const content = JSON.stringify(convertToRaw(editorState.getCurrentContent()));

    try {
      const token = localStorage.getItem('token');
      const method = currentDoc ? 'PUT' : 'POST';
      const url = currentDoc 
        ? `${SERVER_URL}/api/docs/${currentDoc._id}`
        : `${SERVER_URL}/api/docs`;
      
      const body = {
        folderId: currentFolder._id,
        title: docTitle,
        content,
        group_id: user.group_id
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save document');
      }

      const savedDoc = await response.json();

      if (currentDoc) {
        setCurrentFolder(prev => ({
          ...prev,
          docs: prev.docs.map(doc => doc._id === savedDoc._id ? savedDoc : doc)
        }));
      } else {
        setCurrentFolder(prev => ({
          ...prev,
          docs: [...prev.docs, savedDoc]
        }));
      }

      setShowDocEditor(false);
      setCurrentDoc(savedDoc);
      setError('');

      if (socket) {
        socket.emit('document-updated', {
          group_id: user.group_id,
          document: savedDoc,
          action: currentDoc ? 'updated' : 'created',
          user: user
        });
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to save document.');
    }
  };

  const openDoc = async (doc, isShared = false) => {
    try {
      const token = localStorage.getItem('token');
      const url = isShared 
        ? `${SERVER_URL}/api/docs/shared/${doc._id}`
        : `${SERVER_URL}/api/docs/${doc._id}`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || 'Failed to fetch document content';
        } catch {
          errorMessage = 'Failed to fetch document content';
        }
        throw new Error(errorMessage);
      }
      
      const docWithContent = await response.json();

      // Set basic info first
      setDocTitle(docWithContent.title);
      setCurrentDoc({ ...docWithContent, isShared });
      setError('');
      
      // Prepare editor state
      let contentState;
      try {
        if (docWithContent.content) {
          contentState = convertFromRaw(JSON.parse(docWithContent.content));
        } else {
          contentState = EditorState.createEmpty().getCurrentContent();
        }
      } catch {
        contentState = EditorState.createEmpty().getCurrentContent();
      }
      
      setEditorState(EditorState.createWithContent(contentState));
      setShowDocEditor(true);
      
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to open document.');
    }
  };

  const deleteDoc = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${SERVER_URL}/api/docs/${docId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to delete document');

      setCurrentFolder(prev => ({
        ...prev,
        docs: prev.docs.filter(doc => doc._id !== docId)
      }));
      setCurrentDoc(null);
      setError('');

      if (socket) {
        socket.emit('document-updated', {
          group_id: user.group_id,
          action: 'deleted',
          user: user
        });
      }
    } catch (err) {
      console.error(err);
      setError('Failed to delete document.');
    }
  };

  const handleDownload = () => {
    if (!currentDoc) return;
    const content = editorState.getCurrentContent().getPlainText('\u0001');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docTitle}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const openShareModal = (docId, docTitle) => {
    setShareDocId(docId);
    setShareDocTitle(docTitle);
    setSelectedMembers([]);
    setShowShareModal(true);
    setSharingStatus({});
  };

  const shareDocument = async () => {
    if (selectedMembers.length === 0) {
      setError('Please select at least one member to share with.');
      return;
    }

    setSharingStatus({ loading: true });

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${SERVER_URL}/api/docs/${shareDocId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          sharedWith: selectedMembers,
          group_id: user.group_id
        })
      });

      if (!response.ok) throw new Error('Failed to share document');

      setSharingStatus({ success: true });
      
      setTimeout(() => {
        setShowShareModal(false);
        setShareDocId(null);
        setShareDocTitle('');
        setSelectedMembers([]);
        setSharingStatus({});
        setError('');
      }, 1500);

      if (socket) {
        socket.emit('document-shared', {
          group_id: user.group_id,
          document_id: shareDocId,
          shared_with: selectedMembers,
          shared_by: user
        });
      }

    } catch (err) {
      console.error(err);
      setSharingStatus({ error: true });
      setError('Failed to share document.');
    }
  };

  const handleMemberToggle = (memberId) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const closeEditor = useCallback(() => {
    setShowDocEditor(false);
    setCurrentDoc(null);
    setDocTitle('');
    setTimeout(() => {
      setEditorState(EditorState.createEmpty());
    }, 100);
  }, []);

  const closeShareModal = () => {
    setShowShareModal(false);
    setShareDocId(null);
    setShareDocTitle('');
    setSelectedMembers([]);
    setSharingStatus({});
    setError('');
  };

  return (
    <div className="folders-page">
      <aside className="folders-sidebar">
        <div className="sidebar-tabs">
          <button 
            className={`tab-button ${activeTab === 'my-folders' ? 'active' : ''}`}
            onClick={() => setActiveTab('my-folders')}
          >
            <Folder size={16} />
            My Folders
          </button>
          <button 
            className={`tab-button ${activeTab === 'shared' ? 'active' : ''}`}
            onClick={() => setActiveTab('shared')}
          >
            <Users size={16} />
            Shared with Me ({sharedDocs.length})
          </button>
        </div>

        {activeTab === 'my-folders' ? (
          <>
            <h3>Folders</h3>
            <form onSubmit={createFolder} className="create-folder-form">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="New folder name"
                required
              />
              <button type="submit" className="btn-primary">
                <Plus size={16} />
              </button>
            </form>
            <ul className="folder-list">
              {loading ? (
                <p>Loading folders...</p>
              ) : folders.length === 0 ? (
                <p>No folders yet.</p>
              ) : (
                folders.map(folder => (
                  <li
                    key={folder._id}
                    onClick={() => handleFolderClick(folder)}
                    className={`folder-item ${currentFolder?._id === folder._id ? 'active' : ''}`}
                  >
                    <Folder size={20} />
                    <span>{folder.name}</span>
                    {(user._id === folder.created_by || user.role === 'leader') && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteFolder(folder._id); }} 
                        className="delete-btn"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </li>
                ))
              )}
            </ul>
          </>
        ) : (
          <>
            <h3>Shared Documents</h3>
            <ul className="shared-docs-list">
              {sharedDocs.length === 0 ? (
                <p>No shared documents.</p>
              ) : (
                sharedDocs.map(doc => (
                  <li key={doc._id} className="shared-doc-item">
                    <FileText size={20} />
                    <div className="doc-info">
                      <span 
                        className="doc-title" 
                        onClick={() => openDoc(doc, true)}
                      >
                        {doc.title}
                      </span>
                      <small className="shared-by">
                        Shared by {doc.owner_name || 'Unknown'}
                      </small>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </>
        )}
      </aside>

      <main className="folder-content">
        {error && <p className="error-message">{error}</p>}
        
        {activeTab === 'my-folders' && currentFolder ? (
          <>
            <div className="folder-header">
              <h2>{currentFolder.name}</h2>
              <button onClick={createNewDoc} className="btn-secondary">
                <FileText size={18} /> New Document
              </button>
            </div>

            {showDocEditor ? (
              <DocumentEditor
                docTitle={docTitle}
                setDocTitle={setDocTitle}
                editorState={editorState}
                setEditorState={setEditorState}
                onSave={saveDoc}
                onClose={closeEditor}
                onDownload={handleDownload}
                currentDoc={currentDoc}
                isReadOnly={currentDoc?.isShared}
              />
            ) : (
              <div className="document-list">
                {currentFolder.docs.length === 0 ? (
                  <p className="empty-state">This folder is empty. Create a new document!</p>
                ) : (
                  currentFolder.docs.map(doc => (
                    <div key={doc._id} className="doc-item">
                      <FileText size={20} />
                      <span className="doc-title" onClick={() => openDoc(doc)}>
                        {doc.title}
                      </span>
                      <div className="doc-item-actions">
                        <button onClick={() => openDoc(doc)} className="icon-btn" title="Edit">
                          <Edit size={16} />
                        </button>
                        {user._id === doc.owner_id && (
                          <>
                            <button 
                              onClick={() => openShareModal(doc._id, doc.title)} 
                              className="icon-btn share-btn"
                              title="Share"
                            >
                              <Share2 size={16} />
                            </button>
                            <button 
                              onClick={() => deleteDoc(doc._id)} 
                              className="icon-btn delete-btn"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        ) : activeTab === 'shared' ? (
          <div className="shared-content">
            <h2>Documents Shared with Me</h2>
            {showDocEditor ? (
              <DocumentEditor
                docTitle={docTitle}
                setDocTitle={setDocTitle}
                editorState={editorState}
                setEditorState={setEditorState}
                onSave={() => {}}
                onClose={closeEditor}
                onDownload={handleDownload}
                currentDoc={currentDoc}
                isReadOnly={true}
              />
            ) : (
              <div className="shared-docs-grid">
                {sharedDocs.length === 0 ? (
                  <p className="empty-state">No documents have been shared with you yet.</p>
                ) : (
                  sharedDocs.map(doc => (
                    <div key={doc._id} className="shared-doc-card">
                      <FileText size={24} />
                      <h3 onClick={() => openDoc(doc, true)}>{doc.title}</h3>
                      <p>Shared by {doc.owner_name || 'Unknown'}</p>
                      <small>{new Date(doc.shared_at || doc.created_at).toLocaleDateString()}</small>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="welcome-message">
            <h2>Welcome to Folders!</h2>
            <p>Select a folder from the left or create a new one to get started.</p>
          </div>
        )}

        {/* Enhanced Share Modal */}
        {showShareModal && (
          <div className="modal-overlay">
            <div className="modal share-modal">
              <div className="modal-header">
                <h3>Share "{shareDocTitle}"</h3>
                <button onClick={closeShareModal} className="close-btn">
                  <X size={20} />
                </button>
              </div>
              
              <div className="modal-body">
                <p className="share-description">
                  Select group members to share this document with:
                </p>
                
                <div className="members-list">
                  {groupMembers.length === 0 ? (
                    <p className="no-members">No other group members found.</p>
                  ) : (
                    groupMembers.map(member => (
                      <label key={member._id} className="member-item">
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(member._id)}
                          onChange={() => handleMemberToggle(member._id)}
                          disabled={sharingStatus.loading}
                        />
                        <div className="member-info">
                          <span className="member-name">{member.name}</span>
                          <small className="member-email">{member.email}</small>
                        </div>
                      </label>
                    ))
                  )}
                </div>
                
                {selectedMembers.length > 0 && (
                  <div className="selected-count">
                    {selectedMembers.length} member{selectedMembers.length > 1 ? 's' : ''} selected
                  </div>
                )}
              </div>
              
              <div className="modal-actions">
                {sharingStatus.success ? (
                  <div className="success-message">
                    <Check size={16} />
                    Document shared successfully!
                  </div>
                ) : (
                  <>
                    <button 
                      onClick={shareDocument} 
                      className="btn-primary"
                      disabled={selectedMembers.length === 0 || sharingStatus.loading}
                    >
                      {sharingStatus.loading ? 'Sharing...' : 'Share Document'}
                    </button>
                    <button 
                      onClick={closeShareModal} 
                      className="btn-secondary"
                      disabled={sharingStatus.loading}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Folders;
