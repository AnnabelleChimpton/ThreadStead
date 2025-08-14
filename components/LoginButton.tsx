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
          className="border border-black px-3 py-1 bg-yellow-200 hover:bg-yellow-100 shadow-[2px_2px_0_#000]"
        >
          {busy ? "Signing…" : "Log in"}
        </button>
        <button
          onClick={() => setShowOptions(!showOptions)}
          className="border border-black px-2 py-1 bg-gray-200 hover:bg-gray-100 shadow-[2px_2px_0_#000] text-sm"
        >
          ▼
        </button>
        {err && <span className="text-red-700 text-sm">{err}</span>}
      </div>

      {showOptions && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-black shadow-[4px_4px_0_#000] z-10 min-w-[200px]">
          <button
            onClick={loginWithCurrent}
            disabled={busy}
            className="w-full text-left px-3 py-2 hover:bg-yellow-100 border-b border-gray-300"
          >
            Log in with current identity
          </button>
          <button
            onClick={loginAsNew}
            disabled={busy}
            className="w-full text-left px-3 py-2 hover:bg-yellow-100"
          >
            Log in as new user
          </button>
        </div>
      )}
    </div>
  );
}
