import React, { useState, useEffect, useRef } from 'react';

const Whiteboard = ({ user, socket }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState('pen');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(2);
  const [canvasHistory, setCanvasHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(-1);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    // Set default styles
    context.lineCap = 'round';
    context.lineJoin = 'round';
    
    // Save initial state
    saveCanvasState();
    
    if (socket) {
      socket.on('whiteboard-draw', (data) => {
        drawOnCanvas(data);
      });
      
      socket.on('whiteboard-clear', () => {
        clearCanvas();
      });
      
      socket.on('whiteboard-undo', () => {
        undo();
      });
    }

    return () => {
      if (socket) {
        socket.off('whiteboard-draw');
        socket.off('whiteboard-clear');
        socket.off('whiteboard-undo');
      }
    };
  }, [socket]);

  const saveCanvasState = () => {
    const canvas = canvasRef.current;
    const dataURL = canvas.toDataURL();
    const newHistory = canvasHistory.slice(0, historyStep + 1);
    newHistory.push(dataURL);
    setCanvasHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  };

  const startDrawing = (e) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const context = canvas.getContext('2d');
    context.beginPath();
    context.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const drawData = {
      x,
      y,
      tool: currentTool,
      color: currentColor,
      lineWidth,
      isDrawing: true
    };
    
    drawOnCanvas(drawData);
    
    if (socket) {
      socket.emit('whiteboard-draw', {
        ...drawData,
        groupId: user.group_id,
        userId: user.id
      });
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveCanvasState();
    }
  };

  const drawOnCanvas = (data) => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    context.globalCompositeOperation = data.tool === 'eraser' ? 'destination-out' : 'source-over';
    context.strokeStyle = data.color;
    context.lineWidth = data.lineWidth;
    
    context.lineTo(data.x, data.y);
    context.stroke();
    context.beginPath();
    context.moveTo(data.x, data.y);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    saveCanvasState();
    
    if (socket) {
      socket.emit('whiteboard-clear', {
        groupId: user.group_id,
        userId: user.id
      });
    }
  };

  const undo = () => {
    if (historyStep > 0) {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(img, 0, 0);
      };
      
      setHistoryStep(historyStep - 1);
      img.src = canvasHistory[historyStep - 1];
      
      if (socket) {
        socket.emit('whiteboard-undo', {
          groupId: user.group_id,
          userId: user.id
        });
      }
    }
  };

  const redo = () => {
    if (historyStep < canvasHistory.length - 1) {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(img, 0, 0);
      };
      
      setHistoryStep(historyStep + 1);
      img.src = canvasHistory[historyStep + 1];
    }
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `whiteboard-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const addText = () => {
    const text = prompt('Enter text:');
    if (text) {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      context.font = '20px Arial';
      context.fillStyle = currentColor;
      context.fillText(text, 50, 50);
      saveCanvasState();
    }
  };

  const addShape = (shape) => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.strokeStyle = currentColor;
    context.lineWidth = lineWidth;
    
    switch (shape) {
      case 'rectangle':
        context.strokeRect(100, 100, 150, 100);
        break;
      case 'circle':
        context.beginPath();
        context.arc(200, 200, 50, 0, 2 * Math.PI);
        context.stroke();
        break;
      case 'line':
        context.beginPath();
        context.moveTo(50, 50);
        context.lineTo(200, 200);
        context.stroke();
        break;
    }
    saveCanvasState();
  };

  return (
    <div className="whiteboard-component">
      <div className="whiteboard-header">
        <h2>📝 Collaborative Whiteboard</h2>
        <div className="active-users">
          <span>👥 {user.name} (You)</span>
        </div>
      </div>

      <div className="whiteboard-toolbar">
        <div className="tool-group">
          <button 
            className={`tool-btn ${currentTool === 'pen' ? 'active' : ''}`}
            onClick={() => setCurrentTool('pen')}
            title="Pen"
          >
            ✏️
          </button>
          <button 
            className={`tool-btn ${currentTool === 'eraser' ? 'active' : ''}`}
            onClick={() => setCurrentTool('eraser')}
            title="Eraser"
          >
            🧹
          </button>
          <button 
            className="tool-btn"
            onClick={addText}
            title="Add Text"
          >
            📝
          </button>
        </div>

        <div className="tool-group">
          <button 
            className="tool-btn"
            onClick={() => addShape('rectangle')}
            title="Rectangle"
          >
            ⬜
          </button>
          <button 
            className="tool-btn"
            onClick={() => addShape('circle')}
            title="Circle"
          >
            ⭕
          </button>
          <button 
            className="tool-btn"
            onClick={() => addShape('line')}
            title="Line"
          >
            📏
          </button>
        </div>

        <div className="tool-group">
          <input
            type="color"
            value={currentColor}
            onChange={(e) => setCurrentColor(e.target.value)}
            className="color-picker"
            title="Color"
          />
          <input
            type="range"
            min="1"
            max="20"
            value={lineWidth}
            onChange={(e) => setLineWidth(e.target.value)}
            className="line-width-slider"
            title="Line Width"
          />
          <span className="line-width-display">{lineWidth}px</span>
        </div>

        <div className="tool-group">
          <button 
            className="tool-btn"
            onClick={undo}
            disabled={historyStep <= 0}
            title="Undo"
          >
            ↶
          </button>
          <button 
            className="tool-btn"
            onClick={redo}
            disabled={historyStep >= canvasHistory.length - 1}
            title="Redo"
          >
            ↷
          </button>
          <button 
            className="tool-btn"
            onClick={clearCanvas}
            title="Clear All"
          >
            🗑️
          </button>
        </div>

        <div className="tool-group">
          <button 
            className="tool-btn"
            onClick={downloadCanvas}
            title="Download"
          >
            💾
          </button>
        </div>
      </div>

      <div className="whiteboard-canvas-container">
        <canvas
          ref={canvasRef}
          className="whiteboard-canvas"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
        
        <div className="canvas-info">
          <span>Click and drag to draw • Use toolbar to change tools and colors</span>
        </div>
      </div>

      <div className="whiteboard-footer">
        <div className="collaboration-info">
          <span>🔄 Real-time collaboration enabled</span>
          <span>💾 Auto-saved</span>
        </div>
      </div>
    </div>
  );
};

export default Whiteboard;
