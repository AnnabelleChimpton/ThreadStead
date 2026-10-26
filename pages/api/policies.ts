import { db } from '@/lib/config/database/connection';
import { apiHandler } from '@/lib/api/handler';
import { POLICY_KEYS, policyTexts } from '@/lib/config/site/policies';

export default apiHandler(
  { methods: ['GET'], auth: 'none' },
  async (_req, res) => {
    try {
      const saved = await db.siteConfig.findMany({ where: { key: { in: [...POLICY_KEYS] } } });
      const policyData = policyTexts(saved);

      return res.status(200).json({ policies: policyData });
    } catch (error) {
      console.error('Failed to fetch policies:', error);
      return res.status(500).json({ error: 'Failed to fetch policies' });
    }
  }
);