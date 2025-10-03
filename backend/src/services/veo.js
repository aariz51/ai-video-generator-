const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const ttsService = require('./tts');

class VeoService {
  constructor() {
    console.log('🎬 Veo service initialized with ElevenLabs integration');
  }

  async addProfessionalNarration(videoPath, script, jobId) {
    try {
      console.log('🎙️ Starting REAL audio generation with ElevenLabs...');
      
      await this.ensureDirectory('./output');
      const outputPath = path.resolve('./output', `${jobId}_with_narration.mp4`);
      
      // STEP 1: Generate actual narration audio using ElevenLabs
      console.log('🎤 Generating AI narration...');
      const narrationPath = await ttsService.generateNarration(script, jobId);
      
      if (!narrationPath) {
        console.log('⚠️ No narration generated, copying original video');
        return this.copyOriginalVideo(videoPath, outputPath);
      }

      // STEP 2: Use direct FFmpeg spawn for reliable audio mixing
      console.log('🎬 Mixing video with ElevenLabs AI narration using FFmpeg...');
      
      return new Promise((resolve, reject) => {
        // FFmpeg command to replace video audio with narration
        const ffmpegArgs = [
          '-i', videoPath,        // Input video
          '-i', narrationPath,    // Input audio (narration)
          '-c:v', 'copy',         // Copy video stream
          '-c:a', 'aac',          // Encode audio as AAC
          '-map', '0:v:0',        // Map video from first input
          '-map', '1:a:0',        // Map audio from second input
          '-shortest',            // End when shortest stream ends
          '-y',                   // Overwrite output
          outputPath
        ];

        console.log('📝 FFmpeg command:', 'ffmpeg', ffmpegArgs.join(' '));

        const ffmpegProcess = spawn('ffmpeg', ffmpegArgs, {
          stdio: ['ignore', 'pipe', 'pipe']
        });

        let stderr = '';
        
        ffmpegProcess.stderr.on('data', (data) => {
          stderr += data.toString();
          // Log progress if available
          const progressMatch = stderr.match(/time=(\d+:\d+:\d+\.\d+)/);
          if (progressMatch) {
            console.log(`🎙️ Mixing progress: ${progressMatch[1]}`);
          }
        });

        ffmpegProcess.on('close', (code) => {
          if (code === 0) {
            console.log(`✅ Professional video with ElevenLabs narration created: ${outputPath}`);
            // Clean up temporary narration file
            this.cleanupTempFile(narrationPath);
            resolve(outputPath);
          } else {
            console.error('❌ FFmpeg failed with code:', code);
            console.error('FFmpeg stderr:', stderr);
            
            // Fallback: try without audio encoding
            this.fallbackAudioMix(videoPath, narrationPath, outputPath)
              .then(resolve)
              .catch(() => {
                // Final fallback: copy original
                this.copyOriginalVideo(videoPath, outputPath).then(resolve).catch(reject);
              });
          }
        });

        ffmpegProcess.on('error', (error) => {
          console.error('❌ FFmpeg process error:', error.message);
          // Fallback: copy original
          this.copyOriginalVideo(videoPath, outputPath).then(resolve).catch(reject);
        });
      });

    } catch (error) {
      console.error('❌ Professional narration error:', error);
      const fallbackPath = path.resolve('./output', `${jobId}_with_narration.mp4`);
      await this.copyOriginalVideo(videoPath, fallbackPath);
      return fallbackPath;
    }
  }

  async fallbackAudioMix(videoPath, narrationPath, outputPath) {
    console.log('🔄 Trying fallback audio mix method...');
    
    return new Promise((resolve, reject) => {
      const ffmpegArgs = [
        '-i', videoPath,
        '-i', narrationPath,
        '-c:v', 'libx264',        // Re-encode video
        '-c:a', 'aac',
        '-preset', 'ultrafast',   // Fastest encoding
        '-crf', '28',             // Lower quality for speed
        '-map', '0:v:0',
        '-map', '1:a:0',
        '-shortest',
        '-y',
        outputPath
      ];

      const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

      ffmpegProcess.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Fallback audio mix successful: ${outputPath}`);
          resolve(outputPath);
        } else {
          console.error('❌ Fallback audio mix failed with code:', code);
          reject(new Error(`FFmpeg fallback failed: ${code}`));
        }
      });

      ffmpegProcess.on('error', reject);
    });
  }

  async copyOriginalVideo(videoPath, outputPath) {
    console.log('📋 Copying original video as final fallback...');
    await fs.copyFile(videoPath, outputPath);
    console.log(`✅ Original video copied to: ${outputPath}`);
    return outputPath;
  }

  async cleanupTempFile(filePath) {
    try {
      if (filePath) {
        await fs.unlink(filePath);
        console.log(`🧹 Cleaned up temp file: ${filePath}`);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  async ensureDirectory(dirPath) {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  async generateIntro(appName, template) {
    return null;
  }

  async generateOutro(appName, template) {
    return null;
  }
}

module.exports = new VeoService();