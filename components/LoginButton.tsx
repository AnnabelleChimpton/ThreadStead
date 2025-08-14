import React, { useState } from "react";
import { getOrCreateLocalDid, signMessage, createNewIdentityWithUsername } from "@/lib/did-client";
import UsernameSelector from "./UsernameSelector";

export default function LoginButton() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [showUsernameSelector, setShowUsernameSelector] = useState(false);

  async function loginWithCurrent() {
    try {
      setBusy(true); setErr(null);
      const kp = await getOrCreateLocalDid();
      await performLogin(kp);
    } catch (e: unknown) {
      setErr((e as Error)?.message || "Login failed");
    } finally {
      setBusy(false);
      setShowOptions(false);
    }
  }

  function loginAsNew() {
    setShowOptions(false);
    setShowUsernameSelector(true);
  }

  async function handleUsernameConfirmed(username: string) {
    setBusy(true);
    setErr(null);
    try {
      await createNewIdentityWithUsername(username);
      // Redirect to the new user's page
      window.location.href = `/${username}`;
    } catch (e: unknown) {
      setErr((e as Error)?.message || "Failed to create identity");
      setBusy(false);
    }
  }

  function handleUsernameCancel() {
    setShowUsernameSelector(false);
    setBusy(false);
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

  if (showUsernameSelector) {
    return (
      <UsernameSelector
        onUsernameConfirmed={handleUsernameConfirmed}
        onCancel={handleUsernameCancel}
        title="Choose Your Username"
        subtitle="Pick a username for your new account"
        confirmButtonText="Create Account"
        isLoading={busy}
      />
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <button
          onClick={loginWithCurrent}
          disabled={busy}
          className="thread-button text-sm disabled:opacity-50"
        >
          {busy ? "Signing…" : "Log In"}
        </button>
        <button
          onClick={() => setShowOptions(!showOptions)}
          className="px-2 py-1 text-sm border border-thread-sage bg-thread-paper hover:bg-thread-cream rounded shadow-cozySm transition-all"
        >
          ▼
        </button>
        {err && <span className="text-thread-sunset text-sm">{err}</span>}
      </div>

      {showOptions && (
        <div className="absolute top-full left-0 mt-2 thread-module p-0 z-10 min-w-[240px] overflow-hidden">
          <button
            onClick={loginWithCurrent}
            disabled={busy}
            className="w-full text-left px-4 py-3 hover:bg-thread-cream border-b border-thread-sage/20 transition-colors disabled:opacity-50"
          >
            <div className="text-sm font-medium">Continue as current user</div>
            <div className="text-xs text-thread-sage">Use existing identity</div>
          </button>
          <button
            onClick={loginAsNew}
            disabled={busy}
            className="w-full text-left px-4 py-3 hover:bg-thread-cream transition-colors disabled:opacity-50"
          >
            <div className="text-sm font-medium">Create new account</div>
            <div className="text-xs text-thread-sage">Generate fresh identity</div>
          </button>
        </div>
      )}
    </div>
  );
}
