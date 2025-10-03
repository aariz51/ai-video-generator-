import React, { useState } from 'react';
import VideoUpload from './components/VideoUpload';
import TemplateSelector from './components/TemplateSelector';
import ProgressTracker from './components/ProgressTracker';
import './App.css';

function App() {
  const [step, setStep] = useState('upload');
  const [formData, setFormData] = useState({
    appName: '',
    description: '',
    template: 'professional',
    demoVideo: null
  });
  const [jobId, setJobId] = useState(null);

  const handleVideoUpload = (data) => {
    console.log('📤 Video upload data received:', data);
    setFormData({
      ...formData,
      ...data
    });
    setStep('template');
  };

  const handleTemplateSelect = (template, jobId) => {
    console.log('🎨 Template selected:', template);
    console.log('🎬 Job ID received:', jobId);
    
    setFormData({
      ...formData,
      template
    });
    setJobId(jobId);
    setStep('progress'); // FIXED: Go directly to progress, skip processing step
  };

  const handleProcessingStart = (newJobId) => {
    console.log('🎬 Processing started with job ID:', newJobId);
    setJobId(newJobId);
    setStep('progress');
  };

  const handleProcessingComplete = () => {
    console.log('✅ Processing completed for job:', jobId);
    // Keep the user on the progress page to see the video
    // Don't change the step - let them stay and see the result
  };

  const handleStartOver = () => {
    console.log('🔄 Starting over...');
    setStep('upload');
    setFormData({
      appName: '',
      description: '',
      template: 'professional',
      demoVideo: null
    });
    setJobId(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>🎬 SaaS Video Generator</h1>
          <p>Transform your raw demo into professional marketing videos</p>
        </div>
      </header>

      <main className="app-main">
        {step === 'upload' && (
          <VideoUpload onSubmit={handleVideoUpload} />
        )}

        {step === 'template' && (
          <TemplateSelector 
            onSelect={handleTemplateSelect}
            formData={formData}
          />
        )}

        {step === 'processing' && (
          <div className="processing-step">
            <h2>🚀 Starting Video Processing...</h2>
            <p>Please wait while we prepare your video...</p>
            {/* This will automatically move to progress step */}
          </div>
        )}

        {step === 'progress' && jobId && (
          <div className="progress-step">
            <ProgressTracker 
              jobId={jobId} 
              onComplete={handleProcessingComplete} 
            />
            
            {/* Add Start Over Button */}
            <div style={{ textAlign: 'center', marginTop: '30px' }}>
              <button 
                onClick={handleStartOver}
                className="start-over-button"
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                🔄 Create Another Video
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;