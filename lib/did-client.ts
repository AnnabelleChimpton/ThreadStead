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

// Export current identity as a portable token
export async function exportIdentityToken(): Promise<string> {
  const keypair = await getOrCreateLocalDid();
  const token = {
    version: 1,
    keypair,
    exported_at: Date.now()
  };
  return btoa(JSON.stringify(token));
}

// Import an identity token and switch to it
export async function importIdentityToken(token: string): Promise<void> {
  try {
    const decoded = JSON.parse(atob(token));
    
    if (!decoded.version || decoded.version !== 1) {
      throw new Error("Unsupported token version");
    }
    
    if (!decoded.keypair || !decoded.keypair.did || !decoded.keypair.publicKey || !decoded.keypair.secretKey) {
      throw new Error("Invalid token format");
    }

    // Validate the keypair by checking if public key matches the DID
    const expectedDid = `did:key:ed25519:${decoded.keypair.publicKey}`;
    if (decoded.keypair.did !== expectedDid) {
      throw new Error("Invalid keypair: DID doesn't match public key");
    }

    // Validate the keypair by checking if public and private keys match
    try {
      const secret = fromBase64Url(decoded.keypair.secretKey);
      const derivedPublic = await ed.getPublicKeyAsync(secret);
      const derivedPublicB64u = toBase64Url(derivedPublic);
      
      if (derivedPublicB64u !== decoded.keypair.publicKey) {
        throw new Error("Invalid keypair: private key doesn't match public key");
      }
    } catch {
      throw new Error("Invalid keypair: failed to validate keys");
    }

    // Store the imported keypair
    if (typeof window !== "undefined") {
      localStorage.setItem(KEY_STORAGE, JSON.stringify(decoded.keypair));
    }
  } catch (e: unknown) {
    if ((e as Error).message.startsWith("Invalid")) {
      throw e;
    }
    throw new Error("Invalid token format");
  }
}

// Switch to a specific identity (for future multi-identity support)
export async function switchToIdentity(keypair: LocalKeypair): Promise<void> {
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY_STORAGE, JSON.stringify(keypair));
  }
}

// Clear current identity and generate a new one
export async function clearCurrentIdentity(): Promise<LocalKeypair> {
  if (typeof window !== "undefined") {
    localStorage.removeItem(KEY_STORAGE);
  }
  return await getOrCreateLocalDid();
}

// Create new identity, log in, and claim username in one flow
export async function createNewIdentityWithUsername(username: string): Promise<void> {
  // Generate new keypair
  const kp = await clearCurrentIdentity();
  
  // Perform login with new keypair
  const c = await fetch("/api/auth/challenge").then(r => r.json());
  const sig = await signMessage(kp.secretKey, c.nonce);
  const loginRes = await fetch("/api/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ did: kp.did, publicKey: kp.publicKey, signature: sig }),
  });
  
  if (!loginRes.ok) {
    throw new Error(`Login failed: ${loginRes.status}`);
  }

  // Claim the username
  const claimRes = await fetch("/api/account/claim-handle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ handle: username }),
  });

  if (!claimRes.ok) {
    const errorData = await claimRes.json();
    throw new Error(errorData?.error || `Failed to claim username: ${claimRes.status}`);
  }
}
