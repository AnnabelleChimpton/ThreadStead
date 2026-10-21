import fs from 'fs';
import path from 'path';
import formidable from 'formidable';
import { apiHandler } from '@/lib/api/handler';
import { trimSoundBank } from '@/lib/audio/server/trim-sound-bank';

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

/** A MIDI's sound bank sits beside it as <file>.sf2 (lib/audio/sound-bank-url.ts) */
async function writeSoundBank(midiPath: string) {
  if (!/\.midi?$/i.test(midiPath)) return;
  try {
    const bank = await trimSoundBank(await fs.promises.readFile(midiPath));
    await fs.promises.writeFile(`${midiPath}.sf2`, bank);
  } catch (error) {
    // The music still plays, on the old synth
    console.error('Could not make the signup music\'s sound bank:', error);
  }
}

function removeAudioFile(filePath: string) {
  for (const file of [filePath, `${filePath}.sf2`]) {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
}

function saveAudioConfig(config: AudioConfig) {
  const configDir = path.dirname(AUDIO_CONFIG_FILE);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  fs.writeFileSync(AUDIO_CONFIG_FILE, JSON.stringify(config, null, 2));
}

export default apiHandler(
  { methods: ['GET', 'POST', 'PUT', 'DELETE'], auth: 'admin', rateLimit: 'admin' },
  async (req, res) => {
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
        await writeSoundBank(newPath);

        // Delete old file if exists
        const oldConfig = getAudioConfig();
        if (oldConfig.filename) {
          removeAudioFile(path.join(UPLOADS_DIR, oldConfig.filename));
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
        removeAudioFile(path.join(UPLOADS_DIR, config.filename));
      }

      saveAudioConfig({ enabled: false, volume: 0.7 });
      return res.json({ success: true });
    }
  }
);
