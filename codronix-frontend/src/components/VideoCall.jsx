import React, { useState, useEffect, useRef } from 'react';

const VideoCall = ({ user, socket }) => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callId, setCallId] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({});

  useEffect(() => {
    if (socket) {
      socket.on('incoming-call', (data) => {
        setIncomingCall(data);
      });
      
      socket.on('call-accepted', (data) => {
        handleCallAccepted(data);
      });
      
      socket.on('call-rejected', () => {
        setIncomingCall(null);
      });
      
      socket.on('participant-joined', (participant) => {
        setParticipants(prev => [...prev, participant]);
      });
      
      socket.on('participant-left', (participantId) => {
        setParticipants(prev => prev.filter(p => p.id !== participantId));
      });
      
      socket.on('call-ended', () => {
        endCall();
      });
    }

    return () => {
      if (socket) {
        socket.off('incoming-call');
        socket.off('call-accepted');
        socket.off('call-rejected');
        socket.off('participant-joined');
        socket.off('participant-left');
        socket.off('call-ended');
      }
    };
  }, [socket]);

  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      const newCallId = `call_${Date.now()}`;
      setCallId(newCallId);
      setIsCallActive(true);
      
      if (socket) {
        socket.emit('start-call', {
          callId: newCallId,
          groupId: user.group_id,
          initiator: user
        });
      }
    } catch (error) {
      console.error('Error starting call:', error);
      alert('Could not access camera/microphone');
    }
  };

  const joinCall = async (callData) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      setCallId(callData.callId);
      setIsCallActive(true);
      setIncomingCall(null);
      
      if (socket) {
        socket.emit('join-call', {
          callId: callData.callId,
          participant: user
        });
      }
    } catch (error) {
      console.error('Error joining call:', error);
      alert('Could not access camera/microphone');
    }
  };

  const endCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    setIsCallActive(false);
    setParticipants([]);
    setCallId(null);
    setIncomingCall(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setIsScreenSharing(false);
    
    if (socket && callId) {
      socket.emit('end-call', { callId });
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const shareScreen = async () => {
    try {
      if (isScreenSharing) {
        // Stop screen sharing
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setIsScreenSharing(false);
      } else {
        // Start screen sharing
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setIsScreenSharing(true);
        
        // Stop screen sharing when user stops it from browser
        stream.getVideoTracks()[0].onended = () => {
          shareScreen(); // This will stop screen sharing
        };
      }
    } catch (error) {
      console.error('Error sharing screen:', error);
    }
  };

  const rejectCall = () => {
    if (socket && incomingCall) {
      socket.emit('reject-call', { callId: incomingCall.callId });
    }
    setIncomingCall(null);
  };

  const handleCallAccepted = (data) => {
    // Handle WebRTC connection setup here
    console.log('Call accepted:', data);
  };

  return (
    <div className="video-call-component">
      <div className="video-call-header">
        <h2>📹 Video Call</h2>
        <div className="call-status">
          {isCallActive ? (
            <span className="status-active">🔴 Call Active</span>
          ) : (
            <span className="status-inactive">⚫ No Active Call</span>
          )}
        </div>
      </div>

      {!isCallActive ? (
        <div className="call-lobby">
          <div className="call-preview">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="preview-video"
            />
            <div className="preview-overlay">
              <h3>Ready to start a call?</h3>
              <p>Click the button below to start a video call with your team</p>
            </div>
          </div>
          
          <div className="call-actions">
            <button onClick={startCall} className="btn-primary btn-large">
              📹 Start Video Call
            </button>
          </div>
          
          <div className="recent-calls">
            <h3>Recent Calls</h3>
            <div className="call-history">
              <div className="call-history-item">
                <div className="call-info">
                  <span className="call-participants">Team Meeting</span>
                  <span className="call-time">2 hours ago • 45 min</span>
                </div>
                <button className="btn-secondary">📞 Call Again</button>
              </div>
              <div className="call-history-item">
                <div className="call-info">
                  <span className="call-participants">Project Review</span>
                  <span className="call-time">Yesterday • 1h 20min</span>
                </div>
                <button className="btn-secondary">📞 Call Again</button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="active-call">
          <div className="video-grid">
            <div className="video-container local">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="video-stream"
              />
              <div className="video-overlay">
                <span className="participant-name">You</span>
                {isMuted && <span className="muted-indicator">🔇</span>}
                {isVideoOff && <span className="video-off-indicator">📹</span>}
                {isScreenSharing && <span className="screen-share-indicator">🖥️</span>}
              </div>
            </div>
            
            {participants.map(participant => (
              <div key={participant.id} className="video-container remote">
                <div className="video-placeholder">
                  <div className="participant-avatar">
                    {participant.name.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="video-overlay">
                  <span className="participant-name">{participant.name}</span>
                </div>
              </div>
            ))}
            
            {participants.length === 0 && (
              <div className="waiting-for-participants">
                <div className="waiting-message">
                  <h3>Waiting for others to join...</h3>
                  <p>Share the call link with your team members</p>
                  <button className="btn-secondary">📋 Copy Call Link</button>
                </div>
              </div>
            )}
          </div>
          
          <div className="call-controls">
            <button 
              onClick={toggleMute}
              className={`control-btn ${isMuted ? 'muted' : ''}`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? '🔇' : '🎤'}
            </button>
            
            <button 
              onClick={toggleVideo}
              className={`control-btn ${isVideoOff ? 'video-off' : ''}`}
              title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
            >
              {isVideoOff ? '📹' : '📷'}
            </button>
            
            <button 
              onClick={shareScreen}
              className={`control-btn ${isScreenSharing ? 'sharing' : ''}`}
              title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
            >
              🖥️
            </button>
            
            <button 
              onClick={endCall}
              className="control-btn end-call"
              title="End call"
            >
              📞
            </button>
          </div>
          
          <div className="call-info">
            <span className="call-duration">Call duration: 00:05:23</span>
            <span className="participants-count">
              {participants.length + 1} participant{participants.length !== 0 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      {/* Incoming Call Modal */}
      {incomingCall && (
        <div className="modal-overlay">
          <div className="incoming-call-modal">
            <div className="caller-info">
              <div className="caller-avatar">
                {incomingCall.initiator.name.charAt(0).toUpperCase()}
              </div>
              <h3>{incomingCall.initiator.name} is calling...</h3>
              <p>Team video call</p>
            </div>
            
            <div className="call-actions">
              <button 
                onClick={() => joinCall(incomingCall)}
                className="btn-success btn-large"
              >
                📞 Accept
              </button>
              <button 
                onClick={rejectCall}
                className="btn-danger btn-large"
              >
                📞 Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoCall;
