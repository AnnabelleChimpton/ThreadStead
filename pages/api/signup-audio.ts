import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

const AUDIO_CONFIG_FILE = path.join(process.cwd(), 'data', 'signup-audio-config.json');

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const config = getAudioConfig();
  
  if (!config.enabled || !config.filename) {
    return res.json({ enabled: false });
  }

  // Check if file exists
  const filePath = path.join(process.cwd(), 'public', 'uploads', 'admin', config.filename);
  if (!fs.existsSync(filePath)) {
    return res.json({ enabled: false });
  }

  return res.json({
    enabled: true,
    url: `/uploads/admin/${config.filename}`,
    volume: config.volume || 0.7,
    originalName: config.originalName,
  });
}