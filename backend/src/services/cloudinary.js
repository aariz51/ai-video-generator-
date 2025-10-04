const cloudinary = require('cloudinary').v2;
const fs = require('fs').promises;

class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
    
    console.log('☁️ Cloudinary service initialized');
    console.log('🔑 Cloud name:', process.env.CLOUDINARY_CLOUD_NAME);
  }

  // Upload input video to Cloudinary
  async uploadInputVideo(filePath, jobId) {
    try {
      console.log('📤 Uploading input video to Cloudinary...');
      
      const result = await cloudinary.uploader.upload(filePath, {
        resource_type: 'video',
        folder: 'saas-video-generator/inputs',
        public_id: `input_${jobId}`,
        overwrite: true
      });

      console.log(`✅ Input video uploaded: ${result.secure_url}`);
      return result;
    } catch (error) {
      console.error('❌ Input video upload failed:', error);
      throw error;
    }
  }

  // Upload final processed video to Cloudinary
  async uploadProcessedVideo(filePath, jobId) {
    try {
      console.log('📤 Uploading processed video to Cloudinary...');
      
      const result = await cloudinary.uploader.upload(filePath, {
        resource_type: 'video',
        folder: 'saas-video-generator/outputs',
        public_id: `output_${jobId}`,
        overwrite: true
      });

      console.log(`✅ Processed video uploaded: ${result.secure_url}`);
      return result;
    } catch (error) {
      console.error('❌ Processed video upload failed:', error);
      throw error;
    }
  }

  // Clean up local files after upload
  async cleanupLocalFile(filePath) {
    try {
      if (filePath) {
        await fs.unlink(filePath);
        console.log(`🧹 Cleaned up local file: ${filePath}`);
      }
    } catch (error) {
      // Ignore cleanup errors
      console.log(`⚠️ Could not cleanup ${filePath}: ${error.message}`);
    }
  }

  // Clean up multiple local files
  async cleanupLocalFiles(filePaths) {
    for (const filePath of filePaths) {
      await this.cleanupLocalFile(filePath);
    }
  }

  // Get video info from Cloudinary
  async getVideoInfo(publicId) {
    try {
      const result = await cloudinary.api.resource(publicId, {
        resource_type: 'video'
      });
      return result;
    } catch (error) {
      console.error('❌ Failed to get video info:', error);
      return null;
    }
  }

  // Generate streaming URL for video
  generateStreamingUrl(publicId) {
    return cloudinary.url(publicId, {
      resource_type: 'video',
      streaming_profile: 'auto',
      format: 'mp4',
      quality: 'auto'
    });
  }

  // Generate download URL for video
  generateDownloadUrl(publicId, originalName = 'video.mp4') {
    return cloudinary.url(publicId, {
      resource_type: 'video',
      attachment: originalName,
      format: 'mp4'
    });
  }
}

module.exports = new CloudinaryService();
