import React, { useState } from 'react';
import axios from 'axios';

function TemplateSelector({ formData, onSelect }) {
  const [selectedTemplate, setSelectedTemplate] = useState('tech_minimal');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const templates = [
    {
      id: 'tech_minimal',
      name: 'Tech Minimal',
      description: 'Clean, professional design with minimal animations',
      preview: '🎯 Perfect for B2B SaaS'
    },
    {
      id: 'social_viral', 
      name: 'Social Viral',
      description: 'Dynamic, colorful design optimized for social media',
      preview: '🔥 Great for viral content'
    },
    {
      id: 'professional_demo',
      name: 'Professional Demo',
      description: 'Corporate style with professional transitions',
      preview: '💼 Ideal for presentations'
    }
  ];

  const handleGenerate = async () => {
    if (processing) {
      console.log('⏳ Already processing, please wait...');
      return;
    }
  
    setProcessing(true);
    setError('');
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('demoVideo', formData.demoVideo);
      formDataToSend.append('appName', formData.appName);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('template', selectedTemplate);
  
      console.log('🚀 Starting NEW video processing...');
      
      const response = await axios.post(
        'http://localhost:5000/api/video/process',
        formDataToSend,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          timeout: 30000
        }
      );
  
      console.log('📨 Server response:', response.data);
  
      if (response.data && response.data.jobId) {
        console.log('✅ NEW Job started successfully:', response.data.jobId);
        // FIXED: Pass both template and jobId to onSelect
        onSelect(selectedTemplate, response.data.jobId);
      } else {
        throw new Error('Invalid response: No job ID received');
      }
  
    } catch (error) {
      console.error('❌ Video processing error:', error);
      setError('Failed to start video processing: ' + error.message);
      setProcessing(false);
    }
  };

  return (
    <div className="template-container">
      <h2>Choose Your Video Style</h2>
      
      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          color: '#721c24',
          padding: '12px',
          borderRadius: '8px',
          margin: '15px 0',
          fontSize: '14px'
        }}>
          ❌ {error}
          <button 
            onClick={() => setError('')}
            style={{
              float: 'right',
              background: 'transparent',
              border: 'none',
              color: '#721c24',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            ×
          </button>
        </div>
      )}
      
      <div className="template-grid" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '20px',
        margin: '20px 0'
      }}>
        {templates.map(template => (
          <div
            key={template.id}
            className={`template-card ${selectedTemplate === template.id ? 'selected' : ''}`}
            onClick={() => !processing && setSelectedTemplate(template.id)}
            style={{ 
              border: selectedTemplate === template.id ? '2px solid #007bff' : '2px solid #ddd',
              borderRadius: '10px',
              padding: '20px',
              cursor: processing ? 'not-allowed' : 'pointer',
              opacity: processing ? 0.6 : 1,
              backgroundColor: selectedTemplate === template.id ? '#f8f9ff' : 'white'
            }}
          >
            <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>{template.name}</h3>
            <p style={{ margin: '0 0 15px 0', color: '#666', fontSize: '14px' }}>
              {template.description}
            </p>
            <div className="template-preview" style={{ 
              padding: '8px 12px', 
              backgroundColor: '#f1f1f1', 
              borderRadius: '5px',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              {template.preview}
            </div>
          </div>
        ))}
      </div>

      <div className="form-summary" style={{ 
        backgroundColor: '#f8f9fa', 
        padding: '15px', 
        borderRadius: '8px',
        margin: '20px 0'
      }}>
        <h3 style={{ margin: '0 0 10px 0' }}>Video Summary:</h3>
        <p style={{ margin: '5px 0' }}><strong>App:</strong> {formData.appName}</p>
        <p style={{ margin: '5px 0' }}>
          <strong>Template:</strong> {templates.find(t => t.id === selectedTemplate)?.name}
        </p>
        <p style={{ margin: '5px 0' }}><strong>Video:</strong> {formData.demoVideo?.name}</p>
      </div>

      <div className="action-buttons" style={{ textAlign: 'center' }}>
        <button 
          onClick={handleGenerate}
          disabled={processing}
          style={{
            padding: '15px 40px',
            fontSize: '18px',
            fontWeight: '600',
            backgroundColor: processing ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            cursor: processing ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease'
          }}
        >
          {processing ? '🎬 Processing...' : '🚀 Generate Video with AI Narration'}
        </button>
      </div>

      {processing && (
        <div style={{ 
          textAlign: 'center', 
          marginTop: '15px',
          color: '#666',
          fontSize: '14px'
        }}>
          <p>⏳ Please wait while we process your video with ElevenLabs narration...</p>
          <p>This may take 2-3 minutes depending on video length.</p>
        </div>
      )}
    </div>
  );
}

export default TemplateSelector;