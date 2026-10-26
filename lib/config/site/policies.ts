/**
 * The policy texts residents agree to (terms and privacy, short and full),
 * and what each is before Admin saves one. One copy: there were five, and
 * Admin's editor showed long boilerplate residents never saw, so saving it
 * unchanged published new texts. Client-safe (the signup form reads it).
 */
export const POLICY_KEYS = ['terms_simple', 'terms_full', 'privacy_simple', 'privacy_full'] as const;

export type PolicyKey = (typeof POLICY_KEYS)[number];
export type PolicyTexts = Record<PolicyKey, string>;

export const DEFAULT_POLICIES: PolicyTexts = {
  terms_simple: "By creating an account, you agree to use our platform respectfully and responsibly.",
  terms_full: "Full terms and conditions not yet configured.",
  privacy_simple: "We protect your privacy and use reasonable security measures to protect your information.",
  privacy_full: "Full privacy policy not yet configured.",
};

/** The saved texts, each falling back to its default (an empty one too) */
export function policyTexts(saved: ReadonlyArray<{ key: string; value: string }>): PolicyTexts {
  const texts = { ...DEFAULT_POLICIES };
  for (const key of POLICY_KEYS) {
    const value = saved.find((row) => row.key === key)?.value;
    if (value) texts[key] = value;
  }
  return texts;
}
