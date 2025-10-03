import React, { useState } from 'react';

function VideoUpload({ onSubmit }) {  // Changed from onNext to onSubmit
  const [formData, setFormData] = useState({
    demoVideo: null,
    appName: '',
    description: ''
  });
  const [dragActive, setDragActive] = useState(false);

  const handleInputChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleFileSelect = (file) => {
    if (file && file.type.startsWith('video/')) {
      setFormData(prev => ({ ...prev, demoVideo: file }));
    } else {
      alert('Please select a valid video file');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.demoVideo || !formData.appName || !formData.description) {
      alert('Please fill all required fields');
      return;
    }
    onSubmit(formData);  // Changed from onNext to onSubmit
  };

  return (
    <div className="upload-container">
      <h2>Upload Your Demo Video</h2>
      
      <form onSubmit={handleSubmit} className="upload-form">
        {/* File Upload Area */}
        <div 
          className={`file-upload-area ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={() => setDragActive(true)}
          onDragLeave={() => setDragActive(false)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          {formData.demoVideo ? (
            <div className="file-selected">
              <span>✅ {formData.demoVideo.name}</span>
              <button 
                type="button" 
                onClick={() => setFormData(prev => ({ ...prev, demoVideo: null }))}
                style={{
                  marginLeft: '10px',
                  padding: '5px 10px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="file-upload-prompt">
              <p>🎥 Drag & drop your demo video here</p>
              <p>or</p>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => handleFileSelect(e.target.files[0])}
                className="file-input"
              />
            </div>
          )}
        </div>

        {/* App Details */}
        <div className="form-group">
          <label htmlFor="appName">App/SaaS Name *</label>
          <input
            type="text"
            id="appName"
            name="appName"
            value={formData.appName}
            onChange={handleInputChange}
            placeholder="e.g., TweetX Pro"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description *</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Describe your SaaS, key features, target audience..."
            rows={4}
            required
          />
        </div>

        <button type="submit" className="next-button">
          Continue to Templates →
        </button>
      </form>
    </div>
  );
}

export default VideoUpload;
