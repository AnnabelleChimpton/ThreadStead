// lib/did-client.ts
import * as ed from "@noble/ed25519";
import { toBase64Url, fromBase64Url } from "@/lib/base64";

const KEY_STORAGE = "retro_did_keypair_v1";

export type LocalKeypair = { publicKey: string; secretKey: string; did: string };

export async function getOrCreateLocalDid(): Promise<LocalKeypair> {
  const existing = typeof window !== "undefined" ? localStorage.getItem(KEY_STORAGE) : null;
  if (existing) return JSON.parse(existing);

  const secret = ed.utils.randomPrivateKey(); // Uint8Array(32)
  const publicKey = await ed.getPublicKeyAsync(secret); // Uint8Array(32)
  const skb64u = toBase64Url(secret);
  const pkb64u = toBase64Url(publicKey);
  const did = `did:key:ed25519:${pkb64u}`;

  const kp: LocalKeypair = { publicKey: pkb64u, secretKey: skb64u, did };
  if (typeof window !== "undefined") localStorage.setItem(KEY_STORAGE, JSON.stringify(kp));
  return kp;
}

export async function signMessage(secretKeyB64Url: string, msg: string): Promise<string> {
  const secret = fromBase64Url(secretKeyB64Url);
  const sig = await ed.signAsync(new TextEncoder().encode(msg), secret);
  return toBase64Url(sig);
}
