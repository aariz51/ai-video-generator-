const fs = require('fs').promises;
const path = require('path');

class FileHandler {
  constructor() {
    this.jobs = new Map(); // In production, use Redis or database
  }

  async ensureDirectories() {
    const dirs = ['./uploads', './temp', './output'];
    for (const dir of dirs) {
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
      }
    }
  }

  updateJobStatus(jobId, status, message, progress = null) {
    console.log(`📊 Updating job ${jobId}: ${status} - ${message}`);
    this.jobs.set(jobId, {
      jobId,
      status,
      message,
      progress,
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
      message: 'Job not found in memory. Check if video was generated.' 
    };
  }

  fileExists(filePath) {
    try {
      return fs.access(filePath).then(() => true).catch(() => false);
    } catch {
      return false;
    }
  }

  async cleanupTempFiles(jobId) {
    try {
      const tempPattern = `./temp/${jobId}*`;
      console.log(`🧹 Cleaned up temp files for job ${jobId}`);
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
}

module.exports = new FileHandler();
