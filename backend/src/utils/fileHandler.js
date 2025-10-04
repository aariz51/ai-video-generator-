const fs = require('fs').promises;
const path = require('path');

class FileHandler {
  constructor() {
    this.jobs = new Map(); // In production, use Redis or database
  }

  async ensureDirectories() {
    const dirs = ['./uploads', './temp'];  // Removed output dir since we use Cloudinary
    for (const dir of dirs) {
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
      }
    }
  }

  updateJobStatus(jobId, status, message, progress = null, cloudinaryUrls = null) {
    console.log(`📊 Updating job ${jobId}: ${status} - ${message}`);
    
    const existingJob = this.jobs.get(jobId) || {};
    
    this.jobs.set(jobId, {
      jobId,
      status,
      message,
      progress,
      cloudinaryUrls: cloudinaryUrls || existingJob.cloudinaryUrls,
      updatedAt: new Date().toISOString()
    });
  }

  getJobStatus(jobId) {
    const status = this.jobs.get(jobId);
    if (status) {
      console.log(`📊 Job ${jobId} status:`, status);
      return status;
    }
    
    console.log(`❌ Job ${jobId} not found in memory`);
    return { 
      jobId,
      status: 'not_found', 
      message: 'Job not found in memory.' 
    };
  }

  async cleanupTempFiles(jobId) {
    try {
      console.log(`🧹 Cleaning up temp files for job ${jobId}`);
      // Only temp files remain, uploads and outputs are on Cloudinary
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
}

module.exports = new FileHandler();
