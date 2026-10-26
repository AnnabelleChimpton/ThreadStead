// The keypair this browser holds, read without did-client.ts's crypto and
// seed-phrase word lists: the Layout checks it on every page (useIdentitySync).

export const KEY_STORAGE = "retro_did_keypair_v1";

export type LocalKeypair = { publicKey: string; secretKey: string; did: string };

export function hasExistingDid(): boolean {
  if (typeof window === "undefined") return false;
  const existing = localStorage.getItem(KEY_STORAGE);
  return !!existing;
}

export function getExistingDid(): LocalKeypair | null {
  if (typeof window === "undefined") return null;
  const existing = localStorage.getItem(KEY_STORAGE);
  return existing ? JSON.parse(existing) : null;
}

/**
 * That this browser's account has recovery words, and since when: never
 * the words. They're shown once (signup, Settings) for the resident to keep;
 * this browser holding them in plain text next to the key contradicted
 * that (signup audit #13). Older browsers held { mnemonic, created } here.
 */
export const SEED_STORAGE = "retro_seed_phrase_v1";
/** A password account's words, encrypted with the password */
export const ENCRYPTED_SEED_STORAGE = "retro_encrypted_seed_v1";

/** The account has recovery words, set at `created` (0: kept encrypted with a password) */
export type RecoveryPhraseSet = { created: number };

export function markRecoveryPhraseSet(created = Date.now()): void {
  if (typeof window === "undefined") return;
  const marker: RecoveryPhraseSet = { created };
  localStorage.setItem(SEED_STORAGE, JSON.stringify(marker));
}

/**
 * Whether this browser's account has recovery words: set here (signup,
 * recovery, Settings), or kept encrypted with a password. A plain copy of
 * the words that an older version kept is forgotten on the way.
 */
export function recoveryPhraseSet(): RecoveryPhraseSet | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(SEED_STORAGE);
  if (stored) {
    let created = Date.now();
    let words = true;
    try {
      const parsed = JSON.parse(stored) as { created?: unknown; mnemonic?: unknown };
      if (typeof parsed.created === "number") created = parsed.created;
      words = parsed.mnemonic !== undefined;
    } catch {
      // Not ours to read: keep only the fact
    }
    if (words) markRecoveryPhraseSet(created);
    return { created };
  }
  return localStorage.getItem(ENCRYPTED_SEED_STORAGE) ? { created: 0 } : null;
}
