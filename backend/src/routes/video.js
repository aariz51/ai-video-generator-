const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const geminiService = require('../services/gemini');
const veoService = require('../services/veo');
const ffmpegService = require('../services/ffmpeg');
const fileHandler = require('../utils/fileHandler');
const cloudinaryService = require('../services/cloudinary');

const router = express.Router();

// Configure multer for temporary video upload
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, uuidv4() + path.extname(file.originalname));
  }
});

const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

// Main video processing endpoint with Cloudinary integration
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

    // Start processing asynchronously with Cloudinary
    processVideoWithCloudinary(videoFile.path, videoFile.originalname, appName, description, template, jobId);

    res.json({
      jobId,
      message: 'Video processing started with Cloudinary storage',
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

// Download processed video from Cloudinary
router.get('/download/:jobId', (req, res) => {
  const { jobId } = req.params;
  const status = fileHandler.getJobStatus(jobId);

  if (status.status === 'completed' && status.cloudinaryUrls?.processed) {
    const downloadUrl = cloudinaryService.generateDownloadUrl(`saas-video-generator/outputs/output_${jobId}`, `${jobId}_final.mp4`);
    console.log(`📥 Redirecting download to Cloudinary: ${downloadUrl}`);
    res.redirect(downloadUrl);
  } else {
    console.log(`❌ Video not ready for download: ${jobId}`);
    res.status(404).json({ error: 'Video not ready or not found' });
  }
});

// Stream video from Cloudinary
router.get('/stream/:jobId', (req, res) => {
  const { jobId } = req.params;
  const status = fileHandler.getJobStatus(jobId);

  if (status.status === 'completed' && status.cloudinaryUrls?.processed) {
    const streamUrl = cloudinaryService.generateStreamingUrl(`saas-video-generator/outputs/output_${jobId}`);
    console.log(`🎬 Redirecting stream to Cloudinary: ${streamUrl}`);
    res.redirect(streamUrl);
  } else {
    console.log(`❌ Video not ready for streaming: ${jobId}`);
    res.status(404).json({ error: 'Video not ready or not found' });
  }
});

// Direct file access from Cloudinary
router.get('/file/:jobId', (req, res) => {
  const { jobId } = req.params;
  const status = fileHandler.getJobStatus(jobId);

  if (status.status === 'completed' && status.cloudinaryUrls?.processed) {
    console.log(`📹 Serving video from Cloudinary: ${jobId}`);
    res.redirect(status.cloudinaryUrls.processed);
  } else {
    res.status(404).json({ error: 'Video not found on Cloudinary' });
  }
});

// Debug endpoint with Cloudinary info
router.get('/debug/:jobId', (req, res) => {
  const { jobId } = req.params;
  const status = fileHandler.getJobStatus(jobId);

  try {
    res.json({
      jobId,
      status: status.status,
      message: status.message,
      cloudinaryUrls: status.cloudinaryUrls || null,
      hasCloudinaryVideo: !!status.cloudinaryUrls?.processed
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Async processing function with Cloudinary integration
const processVideoWithCloudinary = async (videoPath, originalName, appName, description, template, jobId) => {
  try {
    console.log(`🎬 Starting video processing with Cloudinary: ${jobId}`);

    // Update status: Processing
    fileHandler.updateJobStatus(jobId, 'processing', 'Uploading to Cloudinary and processing...');

    // Step 1: Upload input video to Cloudinary
    const inputCloudinaryResult = await cloudinaryService.uploadInputVideo(videoPath, jobId);
    
    // Step 2: Extract audio (keep local for processing)
    const audioPath = await ffmpegService.extractAudio(videoPath);

    // Step 3: Generate transcript
    const transcript = await geminiService.transcribeAudio(audioPath);

    // Step 4: Analyze video features
    const featureAnalysis = await geminiService.analyzeVideoFeatures(appName, description, transcript);

    // Step 5: Generate script
    const script = await geminiService.generateScript(appName, description, transcript, template);

    // Step 6: Clean video
    const cleanVideoPath = await ffmpegService.cleanVideo(videoPath, jobId);

    // Update status: AI Processing
    fileHandler.updateJobStatus(jobId, 'generating', 'Generating AI narration...');

    // Step 7: Process video with ElevenLabs narration (local processing)
    console.log('🎙️ Starting AUDIO-FOCUSED processing...');
    
    const videoWithNarration = await veoService.addProfessionalNarration(cleanVideoPath, script, jobId);

    console.log('✅ Professional narration added to video!');

    // Step 8: Upload final processed video to Cloudinary
    fileHandler.updateJobStatus(jobId, 'uploading', 'Uploading final video to Cloudinary...');
    
    const processedCloudinaryResult = await cloudinaryService.uploadProcessedVideo(videoWithNarration, jobId);

    // Step 9: Update job status with Cloudinary URLs
    const cloudinaryUrls = {
      input: inputCloudinaryResult.secure_url,
      processed: processedCloudinaryResult.secure_url,
      streaming: cloudinaryService.generateStreamingUrl(`saas-video-generator/outputs/output_${jobId}`),
      download: cloudinaryService.generateDownloadUrl(`saas-video-generator/outputs/output_${jobId}`, `${appName}_final.mp4`)
    };

    fileHandler.updateJobStatus(jobId, 'completed', 'Video ready on Cloudinary!', null, cloudinaryUrls);

    // Step 10: Clean up ALL local files
    console.log('🧹 Cleaning up all local files...');
    await cloudinaryService.cleanupLocalFiles([
      videoPath,           // Original uploaded video
      audioPath,          // Extracted audio
      cleanVideoPath,     // Cleaned video
      videoWithNarration  // Final processed video
    ]);

    console.log(`✅ Job ${jobId} completed successfully - video stored on Cloudinary`);

  } catch (error) {
    console.error(`❌ Job ${jobId} failed:`, error);
    fileHandler.updateJobStatus(jobId, 'failed', error.message);
    
    // Try to clean up local files even on failure
    try {
      await cloudinaryService.cleanupLocalFiles([videoPath]);
    } catch (cleanupError) {
      console.error('Cleanup failed:', cleanupError);
    }
    
    throw error;
  }
};

module.exports = router;
