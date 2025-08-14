import React, { useState } from "react";
import { getOrCreateLocalDid, signMessage } from "@/lib/did-client";

export default function LoginButton() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleLogin() {
    try {
      setBusy(true); 
      setErr(null);
      const kp = await getOrCreateLocalDid();
      await performLogin(kp);
    } catch (e: unknown) {
      setErr((e as Error)?.message || "Login failed");
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
