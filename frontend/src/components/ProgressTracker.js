import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ProgressTracker({ jobId, onComplete }) {
  const [status, setStatus] = useState({ status: 'starting', message: 'Initializing...' });
  const [downloadReady, setDownloadReady] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);

  useEffect(() => {
    let pollCount = 0;
    const maxPolls = 150; // 5 minutes max

    const pollStatus = async () => {
      pollCount++;
      
      try {
        console.log(`🔄 Polling status for job: ${jobId} (attempt ${pollCount})`);
        const response = await axios.get(`http://localhost:5000/api/video/status/${jobId}`);
        console.log('📊 Status response:', response.data);
        setStatus(response.data);

        if (response.data.status === 'completed') {
          console.log('✅ Job completed! Checking video availability...');
          setDownloadReady(true);
          setVideoReady(true);
          
          // Get debug info
          try {
            const debugResponse = await axios.get(`http://localhost:5000/api/video/debug/${jobId}`);
            setDebugInfo(debugResponse.data);
            console.log('🔍 Debug info:', debugResponse.data);
          } catch (debugError) {
            console.error('Debug check failed:', debugError);
          }
          
          onComplete();
          return true; // Stop polling
        } else if (response.data.status === 'failed') {
          console.error('❌ Job failed:', response.data.message);
          return true; // Stop polling
        }
      } catch (error) {
        console.error('⚠️ Status check error:', error);
        
        if (pollCount > 30) {
          try {
            const debugResponse = await axios.get(`http://localhost:5000/api/video/debug/${jobId}`);
            console.log('🔍 Debug response:', debugResponse.data);
            
            if (debugResponse.data.files && debugResponse.data.files.length > 0) {
              console.log('✅ Found video files, marking as completed!');
              setStatus({ status: 'completed', message: 'Video processing complete!' });
              setDownloadReady(true);
              setVideoReady(true);
              setDebugInfo(debugResponse.data);
              onComplete();
              return true;
            }
          } catch (debugError) {
            console.error('Debug check failed:', debugError);
          }
        }
        
        if (pollCount >= maxPolls) {
          setStatus({ 
            status: 'timeout', 
            message: 'Processing timed out. Please check backend logs.' 
          });
          return true;
        }
      }
      
      return false; // Continue polling
    };

    const interval = setInterval(async () => {
      const shouldStop = await pollStatus();
      if (shouldStop) {
        clearInterval(interval);
      }
    }, 2000);

    // Initial poll
    pollStatus();

    return () => clearInterval(interval);
  }, [jobId, onComplete]);

  const handleDownload = () => {
    const downloadUrl = `http://localhost:5000/api/video/download/${jobId}`;
    console.log('📥 Downloading from:', downloadUrl);
    window.open(downloadUrl, '_blank');
  };

  const handleDirectFileAccess = () => {
    const fileUrl = `http://localhost:5000/api/video/file/${jobId}`;
    console.log('📁 Opening file directly:', fileUrl);
    window.open(fileUrl, '_blank');
  };

  const getProgressSteps = () => [
    { key: 'starting', label: 'Initializing', icon: '🚀' },
    { key: 'processing', label: 'Processing Video', icon: '⚙️' },
    { key: 'generating', label: 'Adding Audio', icon: '🎵' },
    { key: 'completed', label: 'Complete!', icon: '✅' }
  ];

  const currentStepIndex = getProgressSteps().findIndex(step => step.key === status.status);
  const displayStepIndex = currentStepIndex >= 0 ? currentStepIndex : 0;

  return (
    <div className="progress-container">
      <h2>🎬 Processing Your Video</h2>
      <p className="job-id">Job ID: {jobId}</p>

      {/* Progress Steps */}
      <div className="progress-steps">
        {getProgressSteps().map((step, index) => (
          <div
            key={step.key}
            className={`progress-step ${
              index <= displayStepIndex ? 'completed' : ''
            } ${index === displayStepIndex && status.status !== 'completed' ? 'active' : ''}`}
          >
            <div className="step-icon">{step.icon}</div>
            <div className="step-label">{step.label}</div>
          </div>
        ))}
      </div>

      {/* Status Message */}
      <div className="status-message">
        <h3>Current Status</h3>
        <p>{status.message}</p>
        <p><small>Status: {status.status}</small></p>
      </div>

      {/* Debug Information */}
      {debugInfo && (
        <div className="debug-info" style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '15px', 
          borderRadius: '8px',
          margin: '20px 0'
        }}>
          <h4>🔍 Debug Information:</h4>
          <p>Files found: {debugInfo.totalFiles}</p>
          {debugInfo.files && debugInfo.files.map((file, index) => (
            <div key={index} style={{ fontSize: '12px', fontFamily: 'monospace' }}>
              📁 {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </div>
          ))}
        </div>
      )}

      {/* Video Preview */}
      {status.status === 'completed' && videoReady && (
        <div style={{ margin: '30px 0', textAlign: 'center' }}>
          <h3>🎬 Your Generated Video:</h3>
          
          <video 
            controls 
            preload="metadata"
            width="800"
            style={{ 
              maxWidth: '100%', 
              height: 'auto',
              borderRadius: '8px',
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
              backgroundColor: '#f0f0f0'
            }}
            onError={(e) => {
              console.error('🎬 Video load error:', e);
              console.log('🔄 Video may not be accessible via streaming...');
            }}
            onLoadStart={() => console.log('🎬 Video loading started')}
            onCanPlay={() => console.log('🎬 Video can play')}
          >
            <source src={`http://localhost:5000/api/video/stream/${jobId}`} type="video/mp4" />
            <source src={`http://localhost:5000/api/video/preview/${jobId}`} type="video/mp4" />
            <source src={`http://localhost:5000/api/video/file/${jobId}`} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          
          <div style={{ marginTop: '15px' }}>
            <button onClick={handleDownload} className="download-button" style={{
              padding: '12px 24px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              marginRight: '10px',
              cursor: 'pointer'
            }}>
              📥 Download Video
            </button>
            
            <button onClick={handleDirectFileAccess} className="file-button" style={{
              padding: '12px 24px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}>
              📁 Open File Directly
            </button>
          </div>
        </div>
      )}

      {/* Success Message */}
      {status.status === 'completed' && (
        <div style={{ 
          backgroundColor: '#d4edda',
          border: '1px solid #c3e6cb',
          color: '#155724',
          padding: '15px',
          borderRadius: '8px',
          margin: '20px 0',
          textAlign: 'center'
        }}>
          <h3>🎉 Video Processing Complete!</h3>
          <p>Your professional video with narration is ready!</p>
        </div>
      )}

      {/* Error Section */}
      {(status.status === 'failed' || status.status === 'timeout') && (
        <div className="error-section" style={{
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          color: '#721c24',
          padding: '15px',
          borderRadius: '8px',
          margin: '20px 0'
        }}>
          <h3>❌ Processing {status.status === 'timeout' ? 'Timed Out' : 'Failed'}</h3>
          <p>{status.message}</p>
          <button onClick={() => window.location.reload()}>
            🔄 Try Again
          </button>
        </div>
      )}
    </div>
  );
}

export default ProgressTracker;
