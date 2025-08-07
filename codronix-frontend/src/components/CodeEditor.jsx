// components/CodeEditor.js
import React, { useRef, useEffect } from 'react';
import Codemirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/dracula.css';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/addon/edit/closetag';
import 'codemirror/addon/edit/closebrackets';

const CodeEditor = () => {
  const editorRef = useRef(null);

  useEffect(() => {
    editorRef.current = Codemirror.fromTextArea(
      document.getElementById('dashboardCodeEditor'),
      {
        mode: { name: 'javascript', json: true },
        theme: 'dracula',
        autoCloseTags: true,
        autoCloseBrackets: true,
        lineNumbers: true,
      }
    );
  }, []);

  return (
    <div className="code-editor-container">
      <h2>Code Editor</h2>
      <textarea id="dashboardCodeEditor"></textarea>
    </div>
  );
};

export default CodeEditor;
