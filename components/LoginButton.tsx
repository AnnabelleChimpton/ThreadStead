import React, { useState } from "react";
import { getExistingDid, signMessage, hasExistingDid } from "@/lib/did-client";

interface LoginButtonProps {
  onToggleIdentity?: () => void;
  isIdentityOpen?: boolean;
}

export default function LoginButton({ onToggleIdentity, isIdentityOpen }: LoginButtonProps) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleLogin() {
    // If Identity tab is open, close it
    if (isIdentityOpen && onToggleIdentity) {
      onToggleIdentity();
      return;
    }

    // Check if DID exists, if not redirect to identity page
    if (!hasExistingDid()) {
      window.location.href = '/identity';
      return;
    }

    try {
      setBusy(true); 
      setErr(null);
      const kp = getExistingDid();
      if (!kp) {
        // Redirect to identity page instead of showing error
        window.location.href = '/identity';
        return;
      }
      await performLogin(kp);
    } catch {
      // If login fails (bad DID, deleted account, etc.), redirect to identity page
      // instead of showing confusing error messages
      window.location.href = '/identity';
    } finally {
      setBusy(false);
    }
  }

  async function performLogin(kp: { did: string; publicKey: string; secretKey: string }) {
    const c = await fetch("/api/auth/challenge").then(r => r.json());
    const sig = await signMessage(kp.secretKey, c.nonce);
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ did: kp.did, publicKey: kp.publicKey, signature: sig }),
    });
    if (!res.ok) throw new Error(`Verify failed: ${res.status}`);
    window.location.reload();
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleLogin}
        disabled={busy}
        className="thread-button text-sm disabled:opacity-50"
      >
        {busy ? "Signing…" : "Log In"}
      </button>
      {err && <span className="text-thread-sunset text-sm">{err}</span>}
    </div>
  );
}
