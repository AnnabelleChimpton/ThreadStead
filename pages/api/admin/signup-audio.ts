import { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '@/lib/auth/server';
import fs from 'fs';
import path from 'path';
import formidable from 'formidable';

export const config = {
  api: {
    bodyParser: false,
  },
};

const AUDIO_CONFIG_FILE = path.join(process.cwd(), 'data', 'signup-audio-config.json');
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads', 'admin');

// Ensure upload directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

interface AudioConfig {
  enabled: boolean;
  filename?: string;
  originalName?: string;
  uploadedAt?: string;
  volume?: number;
}

function getAudioConfig(): AudioConfig {
  try {
    if (fs.existsSync(AUDIO_CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(AUDIO_CONFIG_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Error reading signup audio config:', error);
  }
  return { enabled: false, volume: 0.7 };
}

function saveAudioConfig(config: AudioConfig) {
  const configDir = path.dirname(AUDIO_CONFIG_FILE);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  fs.writeFileSync(AUDIO_CONFIG_FILE, JSON.stringify(config, null, 2));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireAdmin(req);
  if (!user) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  if (req.method === 'GET') {
    const config = getAudioConfig();
    return res.json(config);
  }

  if (req.method === 'POST') {
    const form = formidable({
      uploadDir: UPLOADS_DIR,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      filter: ({ mimetype }) => {
        return mimetype?.startsWith('audio/') || false;
      },
    });

    try {
      const [fields, files] = await form.parse(req);
      
      const audioFile = Array.isArray(files.audio) ? files.audio[0] : files.audio;
      if (!audioFile) {
        return res.status(400).json({ error: 'No audio file provided' });
      }

      // Generate a clean filename
      const ext = path.extname(audioFile.originalFilename || '.mp3');
      const filename = `signup-audio-${Date.now()}${ext}`;
      const newPath = path.join(UPLOADS_DIR, filename);

      // Move file to final location
      fs.renameSync(audioFile.filepath, newPath);

      // Delete old file if exists
      const oldConfig = getAudioConfig();
      if (oldConfig.filename) {
        const oldPath = path.join(UPLOADS_DIR, oldConfig.filename);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      // Save new config
      const config: AudioConfig = {
        enabled: true,
        filename,
        originalName: audioFile.originalFilename || filename,
        uploadedAt: new Date().toISOString(),
        volume: oldConfig.volume || 0.7,
      };
      
      saveAudioConfig(config);

      return res.json({ success: true, config });
    } catch (error) {
      console.error('Upload error:', error);
      return res.status(500).json({ error: 'Upload failed' });
    }
  }

  if (req.method === 'PUT') {
    // Update config (enable/disable, volume)
    const { enabled, volume } = req.body;
    const config = getAudioConfig();
    
    if (typeof enabled === 'boolean') {
      config.enabled = enabled;
    }
    if (typeof volume === 'number' && volume >= 0 && volume <= 1) {
      config.volume = volume;
    }
    
    saveAudioConfig(config);
    return res.json(config);
  }

  if (req.method === 'DELETE') {
    // Delete audio file and config
    const config = getAudioConfig();
    if (config.filename) {
      const filePath = path.join(UPLOADS_DIR, config.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    saveAudioConfig({ enabled: false, volume: 0.7 });
    return res.json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}