import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ProgressTracker({ jobId, onComplete }) {
  const [status, setStatus] = useState({ status: 'starting', message: 'Initializing...' });
  const [downloadReady, setDownloadReady] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [cloudinaryUrls, setCloudinaryUrls] = useState(null);

  useEffect(() => {
    let pollCount = 0;
    const maxPolls = 150;

    const pollStatus = async () => {
      pollCount++;
      
      try {
        console.log(`🔄 Polling status for job: ${jobId} (attempt ${pollCount})`);
        const response = await axios.get(`http://localhost:5000/api/video/status/${jobId}`);
        console.log('📊 Status response:', response.data);
        setStatus(response.data);

        if (response.data.status === 'completed') {
          console.log('✅ Job completed! Video available on Cloudinary');
          setDownloadReady(true);
          setVideoReady(true);
          setCloudinaryUrls(response.data.cloudinaryUrls);
          onComplete();
          return true;
        } else if (response.data.status === 'failed') {
          console.error('❌ Job failed:', response.data.message);
          return true;
        }
      } catch (error) {
        console.error('⚠️ Status check error:', error);
        
        if (pollCount >= maxPolls) {
          setStatus({ 
            status: 'timeout', 
            message: 'Processing timed out. Please try again.' 
          });
          return true;
        }
      }
      
      return false;
    };

    const interval = setInterval(async () => {
      const shouldStop = await pollStatus();
      if (shouldStop) {
        clearInterval(interval);
      }
    }, 2000);

    pollStatus();

    return () => clearInterval(interval);
  }, [jobId, onComplete]);

  const handleDownload = () => {
    if (cloudinaryUrls?.download) {
      console.log('📥 Downloading from Cloudinary:', cloudinaryUrls.download);
      window.open(cloudinaryUrls.download, '_blank');
    } else {
      const downloadUrl = `http://localhost:5000/api/video/download/${jobId}`;
      console.log('📥 Downloading via backend:', downloadUrl);
      window.open(downloadUrl, '_blank');
    }
  };

  const getProgressSteps = () => [
    { key: 'starting', label: 'Initializing', icon: '🚀' },
    { key: 'processing', label: 'Processing Video', icon: '⚙️' },
    { key: 'generating', label: 'Adding AI Voice', icon: '🎵' },
    { key: 'uploading', label: 'Uploading to Cloud', icon: '☁️' },
    { key: 'completed', label: 'Ready!', icon: '✅' }
  ];

  const currentStepIndex = getProgressSteps().findIndex(step => step.key === status.status);
  const displayStepIndex = currentStepIndex >= 0 ? currentStepIndex : 0;

  return (
    <div className="progress-container">
      <h2>🎬 Processing Your Video</h2>
      <p className="job-id">Job ID: {jobId}</p>

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

      <div className="status-message">
        <h3>Current Status</h3>
        <p>{status.message}</p>
        <p><small>Status: {status.status}</small></p>
      </div>

      {status.status === 'completed' && videoReady && (
        <div style={{ margin: '30px 0', textAlign: 'center' }}>
          <h3>🎬 Your Generated Video (Powered by Cloudinary):</h3>
          
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
            }}
            onLoadStart={() => console.log('🎬 Video loading from Cloudinary')}
            onCanPlay={() => console.log('🎬 Video ready to play')}
          >
            {cloudinaryUrls?.streaming && (
              <source src={cloudinaryUrls.streaming} type="video/mp4" />
            )}
            {cloudinaryUrls?.processed && (
              <source src={cloudinaryUrls.processed} type="video/mp4" />
            )}
            <source src={`http://localhost:5000/api/video/stream/${jobId}`} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          
          <div style={{ marginTop: '15px' }}>
            <button onClick={handleDownload} style={{
              padding: '12px 24px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px'
            }}>
              📥 Download Video
            </button>
          </div>

          {cloudinaryUrls && (
            <div style={{
              marginTop: '15px',
              padding: '10px',
              backgroundColor: '#e8f5e8',
              borderRadius: '5px',
              fontSize: '12px'
            }}>
              ☁️ Video hosted on Cloudinary CDN for fast global delivery
            </div>
          )}
        </div>
      )}

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
          <h3>🎉 Processing Complete!</h3>
          <p>Your professional video with ElevenLabs narration is ready!</p>
          <p><small>✨ No local files stored - everything is cloud-powered!</small></p>
        </div>
      )}

      {(status.status === 'failed' || status.status === 'timeout') && (
        <div style={{
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
