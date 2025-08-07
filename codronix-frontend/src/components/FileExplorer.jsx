import React, { useState, useEffect } from 'react';

const FileExplorer = ({ user, socket, groupId }) => {
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('txt');

  useEffect(() => {
    fetchContent(currentFolder);

    // 💡 NEW: Listen for real-time updates for folders and files
    if (socket) {
      socket.on('folder-created', (data) => {
        if (data.parent_folder === currentFolder) {
          setFolders(prev => [...prev, data.folder]);
        }
      });

      socket.on('file-shared', (data) => {
        if (data.folder_id === currentFolder) {
          setFiles(prev => [...prev, data.file]);
        }
      });
    }
    
    // Cleanup function for socket listeners
    return () => {
      if (socket) {
        socket.off('folder-created');
        socket.off('file-shared');
      }
    };
  }, [currentFolder, socket]);

  const fetchContent = async (folderId) => {
    try {
      const token = localStorage.getItem('token');
      const folderPath = folderId ? `/api/folders/${folderId}` : `/api/folders?group_id=${groupId}`;
      const response = await fetch(folderPath, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setFolders(data.folders);
      setFiles(data.files);
    } catch (error) {
      console.error('Error fetching content:', error);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newFolderName,
          group_id: groupId, // 💡 Pass groupId
          parent_folder: currentFolder,
        })
      });

      const newFolder = await response.json();
      if (socket) {
        socket.emit('folder-created', {
          group_id: groupId,
          folder: newFolder,
          createdBy: user._id,
          parent_folder: currentFolder
        });
      }
      setNewFolderName('');
      fetchContent(currentFolder);
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  };

  const handleCreateFile = async () => {
    if (!fileName.trim() || !fileContent.trim()) return;
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      const blob = new Blob([fileContent], { type: 'text/plain' });
      const file = new File([blob], `${fileName}.${fileType}`);
      formData.append('file', file);
      formData.append('group_id', groupId); // 💡 Pass groupId
      formData.append('folder_id', currentFolder || '');
      formData.append('uploaded_by', user._id); // 💡 Pass uploader ID

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      const newFile = await response.json();
      if (socket) {
        socket.emit('file-shared', {
          group_id: groupId,
          file: newFile,
          uploadedBy: user._id,
          folder_id: currentFolder
        });
      }

      setFileName('');
      setFileContent('');
      setFileType('txt');
      fetchContent(currentFolder);
    } catch (error) {
      console.error('Error creating file:', error);
    }
  };

  const handleFileDownload = (filePath, fileName) => {
    const token = localStorage.getItem('token');
    window.open(`http://localhost:5000/${filePath}?token=${token}`, '_blank');
  };

  return (
    <div className="file-explorer">
      <div className="file-header">
        <h2>File Explorer</h2>
        <div className="file-actions">
          <input
            type="text"
            placeholder="New folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
          />
          <button onClick={handleCreateFolder} className="btn-primary">Create Folder</button>
        </div>
      </div>
      
      <div className="file-list">
        {folders.map(folder => (
          <div key={folder._id} className="folder-item" onClick={() => setCurrentFolder(folder._id)}>
            <span className="icon">📁</span>
            <span>{folder.name}</span>
          </div>
        ))}
        {files.map(file => (
          <div key={file._id} className="file-item" onClick={() => handleFileDownload(file.path, file.filename)}>
            <span className="icon">📄</span>
            <span>{file.filename}</span>
          </div>
        ))}
      </div>

      <div className="file-creator">
        <h3>Create New File</h3>
        <input
          type="text"
          placeholder="File name"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
        />
        <select value={fileType} onChange={(e) => setFileType(e.target.value)}>
          <option value="txt">.txt</option>
          <option value="md">.md</option>
          <option value="js">.js</option>
          <option value="json">.json</option>
        </select>
        <textarea
          rows="10"
          value={fileContent}
          onChange={(e) => setFileContent(e.target.value)}
          placeholder="File content..."
        ></textarea>
        <button onClick={handleCreateFile} className="btn-primary">Save File</button>
      </div>
    </div>
  );
};

export default FileExplorer;