/**
 * A resident agreeing to the house rules, terms and privacy policy
 * (TermsAgreement). Signup asks on the account form, before the account
 * exists; /api/auth/verify won't make an account without it and records it
 * with the account, in one transaction. An account made before that (a
 * signup that was under way on the old flow) records it from the Rules step
 * (/api/account/agree-to-terms).
 */
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/config/database/connection';
import { POLICY_KEYS } from '@/lib/config/site/policies';

/** The texts agreed to: the ones in Admin (pages/api/admin/policies.ts) */
export { POLICY_KEYS } from '@/lib/config/site/policies';

/** What verify answers when a new account comes without agreement */
export const AGREEMENT_REQUIRED = 'agreement_required';

type Tx = Pick<Prisma.TransactionClient, 'siteConfig' | 'termsAgreement'>;

/**
 * Which texts someone agrees to now: when the ones in Admin last changed, to
 * the minute ("policies 2026-10-20T14:03Z"), or "built-in" before any were
 * saved (the defaults in lib/config/site/policies.ts).
 */
export async function currentPolicyVersion(client: Tx = db): Promise<string> {
  const latest = await client.siteConfig.findFirst({
    where: { key: { in: [...POLICY_KEYS] } },
    orderBy: { updatedAt: 'desc' },
    select: { updatedAt: true },
  });
  return latest ? `policies ${latest.updatedAt.toISOString().slice(0, 16)}Z` : 'built-in';
}

/** Records that this resident agreed to the texts as they are now */
export async function recordTermsAgreement(userId: string, client: Tx = db): Promise<void> {
  await client.termsAgreement.create({ data: { userId, version: await currentPolicyVersion(client) } });
}
