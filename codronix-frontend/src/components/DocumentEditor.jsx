import React, { useState, useEffect, useRef } from 'react';
import { EditorState, convertToRaw, convertFromRaw } from 'draft-js';
import { Editor } from 'react-draft-wysiwyg';
import { Download } from 'lucide-react';

const DocumentEditor = ({ 
  docTitle, 
  setDocTitle, 
  editorState, 
  setEditorState, 
  onSave, 
  onClose, 
  onDownload, 
  currentDoc, 
  isReadOnly = false 
}) => {
  const editorRef = useRef(null);
  const [isEditorReady, setIsEditorReady] = useState(false);

  useEffect(() => {
    // Small delay to ensure editor is properly mounted
    const timer = setTimeout(() => {
      setIsEditorReady(true);
    }, 200);

    return () => {
      clearTimeout(timer);
      setIsEditorReady(false);
    };
  }, []);

  const handleEditorStateChange = (newEditorState) => {
    if (isEditorReady && !isReadOnly) {
      setEditorState(newEditorState);
    }
  };

  return (
    <div className="doc-editor-container">
      <div className="doc-editor-header">
        <input
          type="text"
          value={docTitle}
          onChange={(e) => !isReadOnly && setDocTitle(e.target.value)}
          placeholder="Document Title"
          className="doc-title-input"
          readOnly={isReadOnly}
        />
        <div className="doc-actions">
          {!isReadOnly && (
            <button onClick={onSave} className="btn-primary">Save</button>
          )}
          {currentDoc && (
            <button onClick={onDownload} className="btn-secondary">
              <Download size={16} /> Download
            </button>
          )}
          <button onClick={onClose} className="btn-danger">Close</button>
        </div>
      </div>
      <div className="text-editor">
        {isEditorReady && (
          <Editor
            ref={editorRef}
            editorState={editorState}
            onEditorStateChange={handleEditorStateChange}
            wrapperClassName="editor-wrapper"
            editorClassName="editor-main"
            toolbarClassName="editor-toolbar"
            readOnly={isReadOnly}
            toolbar={{
              options: isReadOnly ? [] : [
                'inline', 'blockType', 'fontSize', 'list', 'textAlign', 
                'colorPicker', 'link', 'history'
              ]
            }}
          />
        )}
      </div>
    </div>
  );
};

export default DocumentEditor;
