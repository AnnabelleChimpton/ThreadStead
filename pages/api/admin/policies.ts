import { db } from '@/lib/config/database/connection';
import { apiHandler } from '@/lib/api/handler';
import { POLICY_KEYS, policyTexts } from '@/lib/config/site/policies';
import { z } from 'zod';

/** What Admin's policies editor sends: all four texts */
const policyText = z.string().max(200_000);
const policiesSchema = z.object({
  policies: z.object({ terms_simple: policyText, terms_full: policyText, privacy_simple: policyText, privacy_full: policyText }),
});

export default apiHandler(
  { methods: ['GET', 'PUT'], auth: 'admin', rateLimit: 'admin' },
  async (req, res) => {
    if (req.method === 'GET') {
      try {
        const saved = await db.siteConfig.findMany({ where: { key: { in: [...POLICY_KEYS] } } });
        return res.status(200).json({ policies: policyTexts(saved) });
      } catch (error) {
        console.error('Failed to fetch policies:', error);
        return res.status(500).json({ error: 'Failed to fetch policies' });
      }
    }

    if (req.method === 'PUT') {
      const { policies } = policiesSchema.parse(req.body ?? {});
      try {
        // Only the texts that changed, together: every key used to be
        // stamped on each save, which made a new policy version (what
        // residents agree to, terms-agreement.ts) out of no change at all,
        // and a bad value part-way through left half of them saved
        const current = policyTexts(await db.siteConfig.findMany({ where: { key: { in: [...POLICY_KEYS] } } }));
        const changed = POLICY_KEYS.filter((key) => current[key] !== policies[key]);
        await db.$transaction(changed.map((key) => db.siteConfig.upsert({
          where: { key },
          update: { value: policies[key], updatedAt: new Date() },
          create: { key, value: policies[key] },
        })));

        return res.status(200).json({ message: changed.length ? 'Policies saved.' : "Nothing's changed.", policies });
      } catch (error) {
        console.error('Failed to update policies:', error);
        return res.status(500).json({ error: 'Failed to update policies' });
      }
    }
  }
);
