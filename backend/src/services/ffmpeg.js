const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs').promises;

class FFmpegService {
  
  async ensureDirectory(dirPath) {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
      console.log(`📁 Created directory: ${dirPath}`);
    }
  }

  async extractAudio(videoPath) {
    return new Promise(async (resolve, reject) => {
      try {
        await this.ensureDirectory('./temp');
        const outputPath = path.resolve('./temp', `audio_${Date.now()}.wav`);
        
        console.log(`🔊 Extracting audio: ${videoPath} -> ${outputPath}`);
        
        ffmpeg(videoPath)
          .noVideo()
          .audioFrequency(16000)
          .audioChannels(1)
          .format('wav')
          .save(outputPath)
          .on('end', () => {
            console.log(`✅ Audio extracted: ${outputPath}`);
            resolve(outputPath);
          })
          .on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  async cleanVideo(videoPath, jobId) {
    return new Promise(async (resolve, reject) => {
      try {
        await this.ensureDirectory('./temp');
        const outputPath = path.resolve('./temp', `${jobId}_clean.mp4`);
        
        console.log(`🧹 Cleaning video: ${videoPath} -> ${outputPath}`);
        
        // Simplified cleaning for Windows compatibility
        ffmpeg(videoPath)
          .videoCodec('libx264')
          .audioCodec('aac')
          .format('mp4')
          .outputOptions([
            '-preset fast',
            '-crf 23',
            '-movflags faststart'
          ])
          .save(outputPath)
          .on('end', () => {
            console.log(`✅ Video cleaned: ${outputPath}`);
            resolve(outputPath);
          })
          .on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Intelligent video segmentation based on features
  async segmentVideoByFeatures(videoPath, featureMapping, jobId) {
    try {
      await this.ensureDirectory('./temp');
      const segments = {};
      
      for (const [featureName, timing] of Object.entries(featureMapping)) {
        const outputPath = path.resolve('./temp', `${jobId}_${featureName}.mp4`);
        
        console.log(`✂️ Segmenting ${featureName}: ${timing.start} to ${timing.end}`);
        
        await new Promise((resolve, reject) => {
          // Convert SRT time to seconds
          const startSeconds = this.srtTimeToSeconds(timing.start);
          const endSeconds = this.srtTimeToSeconds(timing.end);
          const duration = endSeconds - startSeconds;
          
          ffmpeg(videoPath)
            .seekInput(startSeconds)
            .duration(duration)
            .videoCodec('libx264')
            .audioCodec('aac')
            .save(outputPath)
            .on('end', () => {
              console.log(`✅ Feature segment created: ${outputPath}`);
              segments[featureName] = outputPath;
              resolve();
            })
            .on('error', reject);
        });
      }
      
      return segments;
    } catch (error) {
      console.error('Video segmentation error:', error);
      throw error;
    }
  }

  srtTimeToSeconds(srtTime) {
    const [time, ms] = srtTime.split(',');
    const [hours, minutes, seconds] = time.split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds + (parseInt(ms) / 1000);
  }

  async addCaptions(videoPath, script, jobId) {
    return new Promise(async (resolve, reject) => {
      try {
        await this.ensureDirectory('./temp');
        
        if (!script || !script.segments || script.segments.length === 0) {
          console.log('⚠️ No script segments, skipping captions');
          resolve(videoPath);
          return;
        }
  
        const srtPath = path.resolve('./temp', `${jobId}_captions.srt`);
        let srtContent = '';
        
        script.segments.forEach((segment, index) => {
          srtContent += `${index + 1}\n`;
          srtContent += `${segment.startTime} --> ${segment.endTime}\n`;
          srtContent += `${segment.caption}\n\n`;
        });
        
        await fs.writeFile(srtPath, srtContent, 'utf8');
        console.log(`📝 SRT file created: ${srtPath}`);
        
        const outputPath = path.resolve('./temp', `${jobId}_captioned.mp4`);
        
        // Use simpler subtitle approach for Windows
        ffmpeg(videoPath)
          .videoFilter([
            `subtitles='${srtPath.replace(/\\/g, '/')}':force_style='FontName=Arial,FontSize=24,PrimaryColour=&H00FFFFFF,BackColour=&H80000000,BorderStyle=1,Outline=2'`
          ])
          .videoCodec('libx264')
          .audioCodec('aac')
          .save(outputPath)
          .on('end', () => {
            console.log(`✅ Captions added: ${outputPath}`);
            resolve(outputPath);
          })
          .on('error', (err) => {
            console.log('⚠️ Caption error, adding simple text overlay instead');
            
            // Fallback: add simple text overlay
            ffmpeg(videoPath)
              .videoFilter(`drawtext=text='${script.segments[0]?.caption || 'Demo Video'}':fontcolor=white:fontsize=24:x=(w-text_w)/2:y=h-100`)
              .videoCodec('libx264')
              .audioCodec('aac')
              .save(outputPath)
              .on('end', () => {
                console.log(`✅ Simple caption overlay added: ${outputPath}`);
                resolve(outputPath);
              })
              .on('error', () => {
                console.log('⚠️ All caption methods failed, using original video');
                resolve(videoPath);
              });
          });
          
      } catch (error) {
        console.log('⚠️ Caption setup error, using original:', error.message);
        resolve(videoPath);
      }
    });
  }

  async assembleVideo({ jobId, intro, main, outro, script, template }) {
    return new Promise(async (resolve, reject) => {
      try {
        await this.ensureDirectory('./output');
        const outputPath = path.resolve('./output', `${jobId}_final.mp4`);
        
        console.log(`🎬 Assembling final video: ${outputPath}`);
        
        // Add captions to main video
        const captionedMain = await this.addCaptions(main, script, jobId);
        
        // Simple concatenation without file list (more reliable on Windows)
        const tempConcatPath = path.resolve('./temp', `${jobId}_concat.mp4`);
        
        // First, combine intro and main
        await new Promise((resolveConcat, rejectConcat) => {
          ffmpeg()
            .input(intro)
            .input(captionedMain)
            .videoCodec('libx264')
            .audioCodec('aac')
            .outputOptions([
              '-filter_complex [0:v:0][0:a:0][1:v:0][1:a:0]concat=n=2:v=1:a=1[outv][outa]',
              '-map [outv]',
              '-map [outa]'
            ])
            .save(tempConcatPath)
            .on('end', () => resolveConcat())
            .on('error', rejectConcat);
        });
        
        // Then add outro
        ffmpeg()
          .input(tempConcatPath)
          .input(outro)
          .videoCodec('libx264')
          .audioCodec('aac')
          .outputOptions([
            '-filter_complex [0:v:0][0:a:0][1:v:0][1:a:0]concat=n=2:v=1:a=1[outv][outa]',
            '-map [outv]',
            '-map [outa]'
          ])
          .save(outputPath)
          .on('end', () => {
            console.log(`✅ Final video assembled: ${outputPath}`);
            // Clean up temp file
            fs.unlink(tempConcatPath).catch(() => {});
            resolve(outputPath);
          })
          .on('error', reject);
          
      } catch (error) {
        console.error('Assembly error:', error);
        reject(error);
      }
    });
  }

  async generateFormats(videoPath, jobId) {
    console.log('🎯 Format generation disabled for testing - using main video only');
    console.log(`✅ Main video available: ${videoPath}`);
    // Skip multiple format generation for now
    return;
  }
}

module.exports = new FFmpegService();