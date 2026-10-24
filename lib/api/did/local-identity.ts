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
