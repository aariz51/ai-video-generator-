const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const videoRoutes = require('./src/routes/video');

const app = express();
const PORT = process.env.PORT || 5000;

// Create directories if they don't exist
const createDirectories = async () => {
  const dirs = ['uploads', 'temp', 'output'];
  for (const dir of dirs) {
    const dirPath = path.resolve('./', dir);
    try {
      await fs.promises.access(dirPath);
      console.log(`✅ Directory exists: ${dirPath}`);
    } catch {
      await fs.promises.mkdir(dirPath, { recursive: true });
      console.log(`📁 Created directory: ${dirPath}`);
    }
  }
};

// Initialize directories on startup
createDirectories().catch(console.error);

// Test API key on startup
console.log(`🔑 API Key loaded: ${process.env.GEMINI_API_KEY ? 'Yes' : 'No'}`);
console.log(`🔑 API Key prefix: ${process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 10) + '...' : 'Not found'}`);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000'
}));
app.use(express.json());

// Add static file serving for output videos
app.use('/output', express.static(path.join(__dirname, 'output')));

// Add debugging route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    directories: {
      uploads: require('fs').existsSync('./uploads'),
      temp: require('fs').existsSync('./temp'),
      output: require('fs').existsSync('./output')
    }
  });
});

// Add this route for direct video access
app.get('/video/:filename', (req, res) => {
  const { filename } = req.params;
  const videoPath = path.join(__dirname, 'output', filename);
  
  if (require('fs').existsSync(videoPath)) {
    res.sendFile(path.resolve(videoPath));
  } else {
    res.status(404).json({ error: 'Video not found' });
  }
});

// File upload configuration with absolute paths
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.resolve('./uploads');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit
});

// Routes
app.use('/api/video', videoRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});