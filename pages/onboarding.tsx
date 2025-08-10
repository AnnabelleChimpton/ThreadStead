// pages/onboarding.tsx
import React, { useState } from "react";
import Layout from "@/components/Layout";
import RetroCard from "@/components/RetroCard";

export default function Onboarding() {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!/^[a-z0-9\-_.]{3,20}$/.test(name)) {
      setErr("Use 3–20 chars: a–z, 0–9, - _ .");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/account/claim-handle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      // go to my page
      window.location.href = `/${name}`;
    } catch (e: any) {
      setErr(e?.message || "Failed to claim handle");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout>
      <RetroCard title="Claim your username">
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Username</label>
            <input
              className="border border-black p-2 bg-white w-64"
              placeholder="yourname"
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase())}
              disabled={busy}
            />
            <div className="text-xs opacity-70 mt-1">@local</div>
          </div>
          <button
            className="border border-black px-3 py-1 bg-yellow-200 hover:bg-yellow-100 shadow-[2px_2px_0_#000]"
            disabled={busy || !name}
          >
            {busy ? "Claiming…" : "Claim"}
          </button>
          {err && <div className="text-red-700">{err}</div>}
        </form>
      </RetroCard>
    </Layout>
  );
}
