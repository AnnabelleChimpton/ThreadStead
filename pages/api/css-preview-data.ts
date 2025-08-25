import type { NextApiRequest, NextApiResponse } from 'next';

// In-memory storage for preview data (could be Redis in production)
const previewStore = new Map<string, {
  customCSS: string;
  includeSiteCSS: string;
  bio: string;
  photoUrl: string;
  timestamp: number;
}>();

// Clean up old entries every hour
setInterval(() => {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  for (const [key, value] of previewStore.entries()) {
    if (now - value.timestamp > oneHour) {
      previewStore.delete(key);
    }
  }
}, 60 * 60 * 1000);

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    // Store preview data
    const { customCSS, includeSiteCSS, bio, photoUrl } = req.body;
    
    // Generate a unique preview ID
    const previewId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    
    // Store the data
    previewStore.set(previewId, {
      customCSS: customCSS || '',
      includeSiteCSS: includeSiteCSS || 'true',
      bio: bio || 'Welcome to my profile!',
      photoUrl: photoUrl || '/assets/default-avatar.gif',
      timestamp: Date.now()
    });
    
    res.json({ previewId });
    
  } else if (req.method === 'GET') {
    // Retrieve preview data
    const { id } = req.query;
    
    if (typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid preview ID' });
    }
    
    const data = previewStore.get(id);
    
    if (!data) {
      return res.status(404).json({ error: 'Preview data not found or expired' });
    }
    
    res.json(data);
    
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({ error: 'Method not allowed' });
  }
}