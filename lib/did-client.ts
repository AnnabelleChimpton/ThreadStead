// lib/did-client.ts
import * as ed from "@noble/ed25519";
import { toBase64Url, fromBase64Url } from "@/lib/base64";
import * as bip39 from "bip39";

const KEY_STORAGE = "retro_did_keypair_v1";
const SEED_STORAGE = "retro_seed_phrase_v1";

export type LocalKeypair = { publicKey: string; secretKey: string; did: string };
export type SeedPhrase = { mnemonic: string; created: number };

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
  const keypair = getExistingDid();
  if (!keypair) {
    throw new Error("No existing identity to export. Please create an identity first.");
  }
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

    // Logout from current session before switching identity
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      // Log but don't fail - we still want to switch identity even if logout fails
      console.warn("Failed to logout from current session:", e);
    }

    // Store the imported keypair
    if (typeof window !== "undefined") {
      localStorage.setItem(KEY_STORAGE, JSON.stringify(decoded.keypair));
    }

    // Log in with the imported identity
    const c = await fetch("/api/auth/challenge").then(r => r.json());
    const sig = await signMessage(decoded.keypair.secretKey, c.nonce);
    const loginRes = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        did: decoded.keypair.did, 
        publicKey: decoded.keypair.publicKey, 
        signature: sig
        // No betaKey needed for existing users
      }),
    });
    
    if (!loginRes.ok) {
      const errorData = await loginRes.json();
      throw new Error(errorData?.error || `Login failed with imported identity: ${loginRes.status}`);
    }
  } catch (e: unknown) {
    if ((e as Error).message.startsWith("Invalid") || (e as Error).message.includes("Login failed")) {
      throw e;
    }
    throw new Error("Invalid token format");
  }
}

// Switch to a specific identity (for future multi-identity support)
export async function switchToIdentity(keypair: LocalKeypair): Promise<void> {
  // Logout from current session before switching identity
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch (e) {
    // Log but don't fail - we still want to switch identity even if logout fails
    console.warn("Failed to logout from current session:", e);
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(KEY_STORAGE, JSON.stringify(keypair));
  }

  // Log in with the switched identity
  const c = await fetch("/api/auth/challenge").then(r => r.json());
  const sig = await signMessage(keypair.secretKey, c.nonce);
  const loginRes = await fetch("/api/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      did: keypair.did, 
      publicKey: keypair.publicKey, 
      signature: sig
      // No betaKey needed for existing users
    }),
  });
  
  if (!loginRes.ok) {
    const errorData = await loginRes.json();
    throw new Error(errorData?.error || `Login failed with switched identity: ${loginRes.status}`);
  }
}

// Clear current identity and generate a new one
export async function clearCurrentIdentity(): Promise<LocalKeypair> {
  // Logout from current session before clearing identity
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch (e) {
    // Log but don't fail - we still want to clear identity even if logout fails
    console.warn("Failed to logout from current session:", e);
  }

  if (typeof window !== "undefined") {
    localStorage.removeItem(KEY_STORAGE);
  }
  return await getOrCreateLocalDid();
}

// Manual logout utility function
export async function logoutCurrentSession(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    throw new Error("Failed to logout from current session");
  }
}

// Seed phrase utilities
export async function generateSeedPhrase(): Promise<string> {
  return bip39.generateMnemonic(128); // 12 words
}

export async function createKeypairFromSeedPhrase(mnemonic: string): Promise<LocalKeypair> {
  if (!bip39.validateMnemonic(mnemonic)) {
    throw new Error("Invalid seed phrase");
  }
  
  const seed = await bip39.mnemonicToSeed(mnemonic);
  // Use the first 32 bytes as our Ed25519 private key
  const secret = seed.slice(0, 32);
  const publicKey = await ed.getPublicKeyAsync(secret);
  
  const skb64u = toBase64Url(secret);
  const pkb64u = toBase64Url(publicKey);
  const did = `did:key:ed25519:${pkb64u}`;
  
  return { publicKey: pkb64u, secretKey: skb64u, did };
}

export function hasSeedPhrase(): boolean {
  if (typeof window === "undefined") return false;
  const existing = localStorage.getItem(SEED_STORAGE);
  return !!existing;
}

export function getSeedPhrase(): SeedPhrase | null {
  if (typeof window === "undefined") return null;
  const existing = localStorage.getItem(SEED_STORAGE);
  return existing ? JSON.parse(existing) : null;
}

export function storeSeedPhrase(mnemonic: string): void {
  if (typeof window === "undefined") return;
  const seedData: SeedPhrase = { mnemonic, created: Date.now() };
  localStorage.setItem(SEED_STORAGE, JSON.stringify(seedData));
}

export function clearSeedPhrase(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SEED_STORAGE);
}

// Update an existing identity with a new seed phrase (for upgrade/attach flow)
export async function updateIdentityWithSeedPhrase(mnemonic: string, isLegacyUser: boolean = false): Promise<void> {
  // Validate the seed phrase first
  if (!bip39.validateMnemonic(mnemonic)) {
    throw new Error("Invalid seed phrase");
  }

  // Generate keypair from seed
  const kp = await createKeypairFromSeedPhrase(mnemonic);
  
  // Get existing identity
  const existing = getExistingDid();
  if (!existing) {
    throw new Error("No existing identity found to update");
  }

  // For non-legacy users, ensure the seed phrase matches their existing DID
  if (!isLegacyUser && existing.did !== kp.did) {
    throw new Error("For existing users, seed phrase must match current identity. Cannot update.");
  }

  // For legacy users, we'll update their identity to the new keypair
  if (isLegacyUser) {
    // Store the new keypair and seed phrase
    if (typeof window !== "undefined") {
      localStorage.setItem(KEY_STORAGE, JSON.stringify(kp));
      storeSeedPhrase(mnemonic);
    }

    // Log in with the new identity
    const c = await fetch("/api/auth/challenge").then(r => r.json());
    const sig = await signMessage(kp.secretKey, c.nonce);
    const loginRes = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        did: kp.did, 
        publicKey: kp.publicKey, 
        signature: sig,
        legacyDid: existing.did // Include the legacy DID to link accounts
      }),
    });
    
    if (!loginRes.ok) {
      const errorData = await loginRes.json();
      throw new Error(errorData?.error || `Failed to update legacy identity: ${loginRes.status}`);
    }
  } else {
    // For non-legacy users, just store the seed phrase
    if (typeof window !== "undefined") {
      storeSeedPhrase(mnemonic);
    }
  }
}

export async function recoverFromSeedPhrase(mnemonic: string, username?: string): Promise<void> {
  // Validate the seed phrase first
  if (!bip39.validateMnemonic(mnemonic)) {
    throw new Error("Invalid seed phrase");
  }

  // Logout from current session
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch (e) {
    console.warn("Failed to logout from current session:", e);
  }

  // Generate keypair from seed
  const kp = await createKeypairFromSeedPhrase(mnemonic);
  
  // Store the keypair and seed phrase
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY_STORAGE, JSON.stringify(kp));
    storeSeedPhrase(mnemonic);
  }

  // Attempt login (no beta key needed for recovery of existing account)
  const c = await fetch("/api/auth/challenge").then(r => r.json());
  const sig = await signMessage(kp.secretKey, c.nonce);
  const loginRes = await fetch("/api/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      did: kp.did, 
      publicKey: kp.publicKey, 
      signature: sig
      // Explicitly not passing betaKey for recovery
    }),
  });
  
  if (!loginRes.ok) {
    const errorData = await loginRes.json();
    if (errorData?.error === "Beta key required for account creation") {
      throw new Error("This seed phrase doesn't match any existing account. You can only recover accounts that were previously created with this seed phrase.");
    }
    throw new Error(errorData?.error || `Login failed: ${loginRes.status}`);
  }

  // If username provided, try to claim it (this would only work for new accounts)
  if (username) {
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
}

// Create new identity, log in, and claim username in one flow
export async function createNewIdentityWithUsername(username: string, betaKey?: string): Promise<void> {
  // Generate new keypair (this already handles logout)
  const kp = await clearCurrentIdentity();
  
  // Perform login with new keypair (include beta key if provided)
  const c = await fetch("/api/auth/challenge").then(r => r.json());
  const sig = await signMessage(kp.secretKey, c.nonce);
  const loginRes = await fetch("/api/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      did: kp.did, 
      publicKey: kp.publicKey, 
      signature: sig,
      betaKey 
    }),
  });
  
  if (!loginRes.ok) {
    const errorData = await loginRes.json();
    throw new Error(errorData?.error || `Login failed: ${loginRes.status}`);
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

// Enhanced version that also creates a seed phrase
export async function createNewIdentityWithSeedPhrase(username: string, betaKey?: string): Promise<{ mnemonic: string }> {
  // Generate seed phrase first
  const mnemonic = await generateSeedPhrase();
  
  // Logout from current session
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch (e) {
    console.warn("Failed to logout from current session:", e);
  }

  // Clear existing identity
  if (typeof window !== "undefined") {
    localStorage.removeItem(KEY_STORAGE);
    localStorage.removeItem(SEED_STORAGE);
  }

  // Generate keypair from seed
  const kp = await createKeypairFromSeedPhrase(mnemonic);
  
  // Store both keypair and seed phrase
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY_STORAGE, JSON.stringify(kp));
    storeSeedPhrase(mnemonic);
  }

  // Perform login
  const c = await fetch("/api/auth/challenge").then(r => r.json());
  const sig = await signMessage(kp.secretKey, c.nonce);
  const loginRes = await fetch("/api/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      did: kp.did, 
      publicKey: kp.publicKey, 
      signature: sig,
      betaKey 
    }),
  });
  
  if (!loginRes.ok) {
    const errorData = await loginRes.json();
    throw new Error(errorData?.error || `Login failed: ${loginRes.status}`);
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

  return { mnemonic };
}
