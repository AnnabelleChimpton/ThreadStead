import { db } from '@/lib/config/database/connection';
import { apiHandler } from '@/lib/api/handler';
import { POLICY_KEYS } from '@/lib/domain/users/terms-agreement';
import { z } from 'zod';

/** What each text is before Admin saves one (and what saving it unchanged leaves alone) */
const DEFAULT_POLICIES: Record<(typeof POLICY_KEYS)[number], string> = {
  terms_simple: 'By creating an account, you agree to use our platform respectfully and responsibly. We reserve the right to remove content or accounts that violate these terms.',
  terms_full: '# Terms and Conditions\n\n## 1. Acceptance of Terms\nBy creating an account on this platform, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.\n\n## 2. User Conduct\nYou agree to:\n- Use the platform responsibly and respectfully\n- Not post content that is illegal, harmful, or violates others\' rights\n- Respect other users and maintain civil discourse\n- Not attempt to hack, disrupt, or misuse the platform\n\n## 3. Content Policy\n- You retain ownership of content you post\n- You grant us a license to display and distribute your content on our platform\n- We reserve the right to remove content that violates our policies\n\n## 4. Account Termination\nWe reserve the right to suspend or terminate accounts that violate these terms without prior notice.\n\n## 5. Changes to Terms\nWe may update these terms from time to time. Continued use of the platform constitutes acceptance of any changes.\n\n## 6. Contact\nFor questions about these terms, please contact the site administrators.',
  privacy_simple: 'We collect minimal personal information to provide our service. We do not sell your data to third parties. We use reasonable security measures to protect your information.',
  privacy_full: '# Privacy Policy\n\n## 1. Information We Collect\nWe collect information you provide when creating an account and using our platform:\n- Username and display name\n- Email address (if provided)\n- Profile information you choose to share\n- Content you post (posts, comments, messages)\n- Usage data and analytics\n\n## 2. How We Use Your Information\nWe use your information to:\n- Provide and maintain our service\n- Authenticate your account\n- Display your content to other users as intended\n- Improve our platform and user experience\n- Communicate important updates about our service\n\n## 3. Information Sharing\nWe do not sell, trade, or rent your personal information to third parties. We may share information only:\n- With your explicit consent\n- To comply with legal obligations\n- To protect our rights and safety of our users\n- In connection with a business transfer (with notice)\n\n## 4. Data Security\nWe implement reasonable security measures to protect your information, including:\n- Encrypted data transmission\n- Secure servers and databases\n- Regular security updates and monitoring\n- Limited access to personal data\n\n## 5. Your Rights\nYou have the right to:\n- Access your personal information\n- Correct inaccurate information\n- Delete your account and associated data\n- Control privacy settings for your content\n\n## 6. Data Retention\nWe retain your information as long as your account is active or as needed to provide services. You may delete your account at any time.\n\n## 7. Changes to This Policy\nWe may update this privacy policy from time to time. We will notify users of significant changes through our platform.\n\n## 8. Contact Us\nFor questions about this privacy policy or your data, please contact the site administrators.',
};

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
        // Get all policy documents
        const policies = await db.siteConfig.findMany({
          where: {
            key: {
              in: ['terms_simple', 'terms_full', 'privacy_simple', 'privacy_full']
            }
          }
        });

        // Transform to object with default values if not found
        const policyData = Object.fromEntries(
          POLICY_KEYS.map((key) => [key, policies.find((p) => p.key === key)?.value || DEFAULT_POLICIES[key]])
        );

        return res.status(200).json({ policies: policyData });
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
        const saved = await db.siteConfig.findMany({ where: { key: { in: [...POLICY_KEYS] } } });
        const changed = POLICY_KEYS.filter((key) => (saved.find((row) => row.key === key)?.value || DEFAULT_POLICIES[key]) !== policies[key]);
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
