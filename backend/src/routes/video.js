const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const geminiService = require('../services/gemini');
const veoService = require('../services/veo');
const ffmpegService = require('../services/ffmpeg');
const fileHandler = require('../utils/fileHandler');

const router = express.Router();

// Configure multer for video upload
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, uuidv4() + path.extname(file.originalname));
  }
});

const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

// Main video processing endpoint
router.post('/process', upload.single('demoVideo'), async (req, res) => {
  try {
    const { appName, description, template } = req.body;
    const videoFile = req.file;

    if (!videoFile || !appName || !description) {
      return res.status(400).json({
        error: 'Missing required fields: demoVideo, appName, description'
      });
    }

    const jobId = uuidv4();
    console.log(`🎬 Starting video processing job: ${jobId}`);

    // Start processing asynchronously
    processVideoAsync(videoFile.path, appName, description, template, jobId);

    res.json({
      jobId,
      message: 'Video processing started',
      estimatedTime: '3-5 minutes'
    });

  } catch (error) {
    console.error('Processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Job status endpoint
router.get('/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  const status = fileHandler.getJobStatus(jobId);
  res.json(status);
});

// Download processed video - FIXED VERSION
router.get('/download/:jobId', (req, res) => {
  const { jobId } = req.params;

  // Try different possible output file names
  const possiblePaths = [
    `./output/${jobId}_with_narration.mp4`, // Current audio-focused output
    `./output/${jobId}_final.mp4`, // Legacy output
    `./output/${jobId}_professional_complete.mp4`, // Professional output
    `./output/${jobId}_fallback.mp4`, // Fallback output
  ];

  for (const videoPath of possiblePaths) {
    if (require('fs').existsSync(videoPath)) {
      console.log(`📹 Found video file: ${videoPath}`);
      return res.download(videoPath);
    }
  }

  console.log(`❌ No video found for job ${jobId}`);
  console.log('🔍 Checking available files...');

  try {
    const outputFiles = require('fs').readdirSync('./output');
    const jobFiles = outputFiles.filter(file => file.includes(jobId));
    console.log(`📁 Available files for job ${jobId}:`, jobFiles);

    if (jobFiles.length > 0) {
      // Return the first available file
      const firstFile = `./output/${jobFiles[0]}`;
      console.log(`📹 Downloading: ${firstFile}`);
      return res.download(firstFile);
    }
  } catch (error) {
    console.error('Error checking output directory:', error);
  }

  res.status(404).json({ error: 'Video not found or still processing' });
});

// Video preview route - NEW ADDITION
router.get('/preview/:jobId', (req, res) => {
  const { jobId } = req.params;

  const possiblePaths = [
    `./output/${jobId}_with_narration.mp4`,
    `./output/${jobId}_final.mp4`,
    `./output/${jobId}_professional_complete.mp4`,
    `./output/${jobId}_fallback.mp4`,
  ];

  for (const videoPath of possiblePaths) {
    if (require('fs').existsSync(videoPath)) {
      console.log(`🎬 Streaming video: ${videoPath}`);

      const stat = require('fs').statSync(videoPath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize-1;
        const chunksize = (end-start)+1;

        const file = require('fs').createReadStream(videoPath, {start, end});
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'video/mp4',
        };
        res.writeHead(206, head);
        file.pipe(res);
      } else {
        const head = {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
        };
        res.writeHead(200, head);
        require('fs').createReadStream(videoPath).pipe(res);
      }
      return;
    }
  }

  res.status(404).json({ error: 'Video not found' });
});

// FIXED: Add video streaming route for better compatibility
router.get('/stream/:jobId', (req, res) => {
  const { jobId } = req.params;

  const videoPath = path.resolve('./output', `${jobId}_with_narration.mp4`);
  console.log(`🎬 Checking for video: ${videoPath}`);

  if (!require('fs').existsSync(videoPath)) {
    console.log(`❌ Video not found: ${videoPath}`);
    return res.status(404).json({
      error: 'Video not found',
      path: videoPath,
      jobId
    });
  }

  console.log(`✅ Streaming video: ${videoPath}`);

  const stat = require('fs').statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;

    const file = require('fs').createReadStream(videoPath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(200, head);
    require('fs').createReadStream(videoPath).pipe(res);
  }
});

// Add this route for direct video serving - NEW ADDITION
router.get('/file/:jobId', (req, res) => {
  const { jobId } = req.params;
  const fs = require('fs');
  const path = require('path');
  
  // Check for video with narration first
  const videoPath = path.resolve('./output', `${jobId}_with_narration.mp4`);
  
  if (fs.existsSync(videoPath)) {
    console.log('📹 Serving video:', videoPath);
    res.sendFile(path.resolve(videoPath));
  } else {
    res.status(404).json({ error: 'Video not found' });
  }
});

// Debug endpoint to check available files
router.get('/debug/:jobId', (req, res) => {
  const { jobId } = req.params;

  try {
    const outputDir = './output';
    const files = require('fs').readdirSync(outputDir);
    const jobFiles = files.filter(file => file.includes(jobId));

    const fileDetails = jobFiles.map(file => {
      const filePath = `${outputDir}/${file}`;
      const stats = require('fs').statSync(filePath);
      return {
        name: file,
        size: stats.size,
        created: stats.birthtime
      };
    });

    res.json({
      jobId,
      totalFiles: jobFiles.length,
      files: fileDetails
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Async processing function
const processVideoAsync = async (videoPath, appName, description, template, jobId) => {
  try {
    console.log(`🎬 Starting video processing job: ${jobId}`);

    // Update status: Processing
    fileHandler.updateJobStatus(jobId, 'processing', 'Processing video...');

    // Step 1: Extract audio
    const audioPath = await ffmpegService.extractAudio(videoPath);

    // Step 2: Generate transcript
    const transcript = await geminiService.transcribeAudio(audioPath);

    // Step 3: Analyze video features
    const featureAnalysis = await geminiService.analyzeVideoFeatures(appName, description, transcript);

    // Step 4: Generate script
    const script = await geminiService.generateScript(appName, description, transcript, template);

    // Step 5: Clean video
    const cleanVideoPath = await ffmpegService.cleanVideo(videoPath, jobId);

    // Update status: AI Processing
    fileHandler.updateJobStatus(jobId, 'generating', 'Generating AI narration...');

    // Step 6: AUDIO-FOCUSED Processing
    console.log('🎙️ Starting AUDIO-FOCUSED processing...');

    try {
      // SIMPLE APPROACH: Just add professional narration to original video
      const videoWithNarration = await veoService.addProfessionalNarration(cleanVideoPath, script, jobId);

      console.log('✅ Professional narration added to video!');

      // Update status: Completed (skip format generation)
      fileHandler.updateJobStatus(jobId, 'completed', 'Video ready for preview!');
      console.log(`✅ Job ${jobId} completed successfully - single video ready`);

    } catch (audioError) {
      console.error('Audio processing failed, using fallback:', audioError);

      // Fallback: Use original processing
      const introVideo = await veoService.generateIntro(appName, template);
      const outroVideo = await veoService.generateOutro(appName, template);

      const finalVideoPath = await ffmpegService.assembleVideo({
        jobId,
        intro: introVideo,
        main: cleanVideoPath,
        outro: outroVideo,
        script: script,
        template
      });

      await ffmpegService.generateFormats(finalVideoPath, jobId);
      fileHandler.updateJobStatus(jobId, 'completed', 'Video processing complete!');
      console.log(`✅ Job ${jobId} completed with fallback method`);
    }

  } catch (error) {
    console.error(`❌ Job ${jobId} failed:`, error);
    fileHandler.updateJobStatus(jobId, 'failed', error.message);
    throw error;
  }
};

module.exports = router;
