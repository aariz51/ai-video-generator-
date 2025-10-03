const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class TTSService {
  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY;
    this.baseURL = 'https://api.elevenlabs.io/v1';
    
    if (this.apiKey) {
      console.log('🎙️ ElevenLabs TTS service initialized');
      console.log('🔑 API Key loaded:', this.apiKey ? 'Yes' : 'No');
    } else {
      console.log('⚠️ ElevenLabs API key not found - audio generation disabled');
    }
  }

  async generateNarration(script, jobId) {
    if (!this.apiKey) {
      console.log('🎙️ No ElevenLabs API key, skipping audio generation');
      return null;
    }

    try {
      console.log('🎙️ Generating professional narration with ElevenLabs...');
      
      // Create narration script from segments
      const narrationText = this.createNarrationScript(script);
      console.log('📝 Narration text:', narrationText);

      // Use a high-quality voice ID (Rachel - professional female voice)
      const voiceId = '21m00Tcm4TlvDq8ikWAM'; // Rachel voice
      
      const requestData = {
        text: narrationText,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.75,
          similarity_boost: 0.75,
          style: 0.5,
          use_speaker_boost: true
        }
      };

      console.log('🎤 Calling ElevenLabs TTS API...');
      
      const response = await axios.post(
        `${this.baseURL}/text-to-speech/${voiceId}`,
        requestData,
        {
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey
          },
          responseType: 'arraybuffer'
        }
      );

      // Save audio file
      await this.ensureDirectory('./temp');
      const audioPath = path.resolve('./temp', `narration_${jobId}.mp3`);
      await fs.writeFile(audioPath, response.data);
      
      console.log(`✅ ElevenLabs narration generated: ${audioPath}`);
      console.log(`📊 Audio file size: ${(response.data.length / 1024 / 1024).toFixed(2)} MB`);
      
      return audioPath;

    } catch (error) {
      console.error('❌ ElevenLabs TTS generation failed:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        console.error('🔑 Invalid ElevenLabs API key');
      } else if (error.response?.status === 429) {
        console.error('⏰ ElevenLabs rate limit exceeded');
      }
      
      return null;
    }
  }

  createNarrationScript(script) {
    let narration = '';
    
    if (script && script.segments) {
      // Create natural-sounding narration from script segments
      for (let i = 0; i < script.segments.length; i++) {
        const segment = script.segments[i];
        narration += `${segment.caption}`;
        
        // Add natural pauses between segments
        if (i < script.segments.length - 1) {
          narration += '. ';
        }
      }
    } else {
      // Fallback narration
      narration = 'Welcome to this innovative SaaS application. Discover powerful features that will transform your workflow. See how easy it is to get started and experience the difference our platform makes. Join thousands of satisfied users who have already revolutionized their productivity.';
    }
    
    // Clean up the text for better TTS
    return narration
      .replace(/\s+/g, ' ')           // Remove extra spaces
      .replace(/([.!?])\s*([.!?])/g, '$1 ')  // Fix multiple punctuation
      .trim();
  }

  async ensureDirectory(dirPath) {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  // Get available voices (optional - for future use)
  async getAvailableVoices() {
    if (!this.apiKey) return [];
    
    try {
      const response = await axios.get(`${this.baseURL}/voices`, {
        headers: { 'xi-api-key': this.apiKey }
      });
      
      console.log('🎵 Available voices:', response.data.voices.length);
      return response.data.voices;
    } catch (error) {
      console.error('Error fetching voices:', error.message);
      return [];
    }
  }
}

module.exports = new TTSService();
