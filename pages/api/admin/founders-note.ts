import { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '@/lib/auth-server';
import { db as prisma } from '@/lib/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    // Public endpoint - anyone can read the founder's note
    try {
      const setting = await prisma.siteConfig.findUnique({
        where: { key: 'founders_note' }
      });
      
      return res.status(200).json({
        message: setting?.value || ''
      });
    } catch (error) {
      console.error('Error fetching founders note:', error);
      return res.status(500).json({ error: 'Failed to fetch founders note' });
    }
  }
  
  if (req.method === 'POST') {
    // Admin-only endpoint to update the founder's note
    const user = await requireAdmin(req);
    if (!user) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { message } = req.body;
    
    if (typeof message !== 'string') {
      return res.status(400).json({ error: 'Message must be a string' });
    }
    
    try {
      await prisma.siteConfig.upsert({
        where: { key: 'founders_note' },
        update: { value: message },
        create: {
          key: 'founders_note',
          value: message
        }
      });
      
      return res.status(200).json({ success: true, message });
    } catch (error) {
      console.error('Error saving founders note:', error);
      return res.status(500).json({ error: 'Failed to save founders note' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}