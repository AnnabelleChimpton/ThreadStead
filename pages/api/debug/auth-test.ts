// Debug endpoint to test authentication
import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '@/lib/auth/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('AUTH_TEST: Checking session...');
    console.log('AUTH_TEST: Cookies:', req.headers.cookie || 'No cookies');

    const sessionUser = await getSessionUser(req);
    console.log('AUTH_TEST: Session user:', sessionUser);

    if (!sessionUser) {
      return res.status(401).json({
        authenticated: false,
        message: 'No valid session',
        cookies: req.headers.cookie || 'No cookies'
      });
    }

    return res.json({
      authenticated: true,
      user: {
        id: sessionUser.id,
        primaryHandle: sessionUser.primaryHandle,
        // Don't expose sensitive data
      }
    });

  } catch (error) {
    console.error('AUTH_TEST: Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: String(error)
    });
  }
}