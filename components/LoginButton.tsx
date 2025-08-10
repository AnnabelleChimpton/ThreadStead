import React, { useState } from "react";
import { getOrCreateLocalDid, signMessage } from "@/lib/did-client";

export default function LoginButton() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onClick() {
    try {
      setBusy(true); setErr(null);
      const kp = await getOrCreateLocalDid();
      const c = await fetch("/api/auth/challenge").then(r => r.json());
      const sig = await signMessage(kp.secretKey, c.nonce);
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ did: kp.did, publicKey: kp.publicKey, signature: sig }),
      });
      if (!res.ok) throw new Error(`Verify failed: ${res.status}`);
      // Optional: refresh to reflect logged-in state
      window.location.reload();
    } catch (e: any) {
      setErr(e?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onClick}
        disabled={busy}
        className="border border-black px-3 py-1 bg-yellow-200 hover:bg-yellow-100 shadow-[2px_2px_0_#000]"
      >
        {busy ? "Signing…" : "Log in"}
      </button>
      {err && <span className="text-red-700 text-sm">{err}</span>}
    </div>
  );
}
