// pages/onboarding.tsx
import React, { useState } from "react";
import Layout from "@/components/Layout";
import UsernameSelector from "@/components/UsernameSelector";

export default function Onboarding() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleUsernameConfirmed(username: string) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/account/claim-handle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      // go to my page
      window.location.href = `/${username}`;
    } catch (e: unknown) {
      setErr((e as Error)?.message || "Failed to claim handle");
      setBusy(false);
    }
  }

  function handleCancel() {
    window.location.href = "/";
  }

  return (
    <Layout>
      <div className="flex flex-col items-center space-y-4">
        <UsernameSelector
          onUsernameConfirmed={handleUsernameConfirmed}
          onCancel={handleCancel}
          title="Claim your username"
          subtitle="Choose a username for your profile"
          confirmButtonText="Claim Username"
          isLoading={busy}
        />
        {err && (
          <div className="border border-red-400 bg-red-100 p-3 text-red-700 text-sm shadow-[2px_2px_0_#000]">
            {err}
          </div>
        )}
      </div>
    </Layout>
  );
}
