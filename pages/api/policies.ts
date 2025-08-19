import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get all policy documents
    const policies = await prisma.siteConfig.findMany({
      where: {
        key: {
          in: ['terms_simple', 'terms_full', 'privacy_simple', 'privacy_full']
        }
      }
    });

    // Transform to object with default values if not found
    const policyData = {
      terms_simple: policies.find(p => p.key === 'terms_simple')?.value || 'By creating an account, you agree to use our platform respectfully and responsibly.',
      terms_full: policies.find(p => p.key === 'terms_full')?.value || 'Full terms and conditions not yet configured.',
      privacy_simple: policies.find(p => p.key === 'privacy_simple')?.value || 'We protect your privacy and use reasonable security measures to protect your information.',
      privacy_full: policies.find(p => p.key === 'privacy_full')?.value || 'Full privacy policy not yet configured.'
    };

    return res.status(200).json({ policies: policyData });
  } catch (error) {
    console.error('Failed to fetch policies:', error);
    return res.status(500).json({ error: 'Failed to fetch policies' });
  }
}