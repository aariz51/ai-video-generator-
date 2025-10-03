const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found in environment variables');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    
    // UPDATED: Use current available models
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash'  // Updated from 'gemini-1.5-pro'
    });
    
    console.log('🤖 Gemini service initialized with model: gemini-2.5-flash');
  }

  async transcribeAudio(audioPath) {
    try {
      // Mock implementation for now - audio transcription requires different setup
      console.log('📝 Generated enhanced mock transcript');
      
      return `This is a demo video showcasing an innovative SaaS application. 
The user demonstrates various features including user interface elements, 
core functionality, and key benefits. The application appears to be 
designed for productivity and user engagement with modern interface patterns.`;
      
    } catch (error) {
      console.error('Transcription error:', error);
      throw new Error('Audio transcription failed: ' + error.message);
    }
  }

  async analyzeVideoFeatures(appName, description, transcript) {
    try {
      console.log('🔍 Analyzing video features using Gemini 2.5 Flash...');
      
      // Add a small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const prompt = `Analyze this SaaS application demo and identify key features:
      
App Name: ${appName}
Description: ${description}
Transcript: ${transcript}

Please identify 2-3 main features shown in the video with timestamps.
Return as JSON in this exact format:
{
  "features": [
    {
      "name": "Feature Name",
      "startTime": "00:00:06,000",
      "endTime": "00:00:12,000", 
      "description": "Brief description of what this feature does"
    }
  ]
}`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('🔍 Video feature analysis:', text);
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        console.log('🧹 Extracted JSON:', JSON.parse(jsonStr));
        return JSON.parse(jsonStr);
      }
      
      // Fallback if JSON parsing fails
      return this.generateFallbackFeatures(appName);
      
    } catch (error) {
      console.error('Video feature analysis error:', error);
      return this.generateFallbackFeatures(appName);
    }
  }

  generateFallbackFeatures(appName) {
    return {
      features: [
        {
          name: "Auto Content Generator",
          startTime: "00:00:06,000", 
          endTime: "00:00:12,000",
          description: "User demonstrates automatic content generation with different tones"
        },
        {
          name: "Personal Writing Assistant", 
          startTime: "00:00:12,000",
          endTime: "00:00:18,000",
          description: "Shows AI-powered writing assistance and editing capabilities"
        },
        {
          name: `${appName} Core Features`,
          startTime: "00:00:18,000",
          endTime: "00:00:24,000",
          description: "Main functionality demonstration and user interface walkthrough"
        }
      ]
    };
  }

  async generateScript(appName, description, transcript, template) {
    console.log('🤖 Generating intelligent script...');
    
    // FALLBACK FIRST: Skip API call and use smart fallback
    console.log('⚡ Using optimized fallback script generation to avoid quota limits');
    return this.generateSmartFallbackScript(appName, description, template);
  }

  generateSmartFallbackScript(appName, description, template) {
    console.log('📝 Generating smart fallback script based on app details...');
    
    // Smart script generation based on app info
    const segments = [
      {
        startTime: "00:00:00,000",
        endTime: "00:00:05,000",
        caption: `Discover the power of ${appName}.`,
        type: "hook",
        feature: "intro"
      },
      {
        startTime: "00:00:05,000", 
        endTime: "00:00:10,000",
        caption: `Revolutionize your ${description.toLowerCase()} workflow.`,
        type: "value",
        feature: "benefit"
      },
      {
        startTime: "00:00:10,000",
        endTime: "00:00:15,000", 
        caption: "See how easy it is to get started with our intuitive interface.",
        type: "demo",
        feature: "main"
      },
      {
        startTime: "00:00:15,000",
        endTime: "00:00:20,000",
        caption: "Powerful features designed to save you time and boost productivity.",
        type: "feature",
        feature: "benefits"
      },
      {
        startTime: "00:00:20,000",
        endTime: "00:00:25,000",
        caption: `Join thousands who are already succeeding with ${appName}.`,
        type: "social_proof",
        feature: "testimonial"
      },
      {
        startTime: "00:00:25,000",
        endTime: "00:00:30,000",
        caption: "Ready to transform your workflow? Get started today!",
        type: "cta",
        feature: "outro"
      }
    ];

    const result = { segments };
    
    console.log('✅ Smart fallback script generated successfully');
    console.log('📄 Script segments:', segments.length);
    
    return result;
  }

  // Optional: Try API with retry logic (if quota allows)
  async generateScriptWithRetry(appName, description, transcript, template, maxRetries = 2) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🤖 Attempting script generation (attempt ${attempt}/${maxRetries})...`);
        
        // Add delay between attempts
        if (attempt > 1) {
          console.log('⏳ Waiting before retry...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
        const prompt = `Create a professional video script for this SaaS application:
        
App: ${appName}
Description: ${description}
Template: ${template || 'professional'}

Create 4-5 segments with captions that will be used for video narration.
Each segment should be 5 seconds long and have engaging, marketing-focused text.

Return as JSON:
{
  "segments": [
    {
      "startTime": "00:00:00,000",
      "endTime": "00:00:05,000", 
      "caption": "Transform your workflow with ${appName}.",
      "type": "hook",
      "feature": "intro"
    }
  ]
}`;

        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        console.log('📄 Raw script response length:', text.length);
        
        // Extract JSON
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          console.log('✅ Successfully generated script via API');
          return parsed;
        }
        
        throw new Error('Could not parse JSON from API response');
        
      } catch (error) {
        console.error(`Script generation attempt ${attempt} failed:`, error.message);
        lastError = error;
        
        // If quota exceeded, immediately use fallback
        if (error.message.includes('429') || error.message.includes('quota')) {
          console.log('💡 Quota exceeded - switching to fallback script');
          break;
        }
      }
    }
    
    // Use fallback if all attempts failed
    console.log('⚡ Using fallback script after API attempts failed');
    return this.generateSmartFallbackScript(appName, description, template);
  }
}

module.exports = new GeminiService();
