// pages/onboarding.tsx
import React, { useState } from "react";
import Layout from "@/components/ui/layout/Layout";
import UsernameSelector from "@/components/features/auth/UsernameSelector";
import WelcomeRingOptIn from "@/components/features/onboarding/WelcomeRingOptIn";

type OnboardingStep = 'username' | 'welcome-ring' | 'complete';

export default function Onboarding() {
  const [step, setStep] = useState<OnboardingStep>('username');
  const [username, setUsername] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleUsernameConfirmed(confirmedUsername: string) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/account/claim-handle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: confirmedUsername }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      
      // Username claimed successfully - move to Welcome Ring opt-in
      setUsername(confirmedUsername);
      setStep('welcome-ring');
    } catch (e: unknown) {
      setErr((e as Error)?.message || "Failed to claim handle");
    } finally {
      setBusy(false);
    }
  }

  async function handleWelcomeRingDecision(joinWelcomeRing: boolean) {
    setBusy(true);
    setErr(null);
    
    if (joinWelcomeRing) {
      // If they want to join, redirect directly to Welcome Ring
      // This will let them join manually if needed, or see the ring if it exists
      window.location.href = `/tr/welcome`;
    } else {
      // If they skip, go to their profile
      window.location.href = `/resident/${username}`;
    }
  }

  function handleCancel() {
    window.location.href = "/";
  }

  return (
    <Layout>
      <div className="flex flex-col items-center space-y-4">
        {step === 'username' && (
          <UsernameSelector
            onUsernameConfirmed={handleUsernameConfirmed}
            onCancel={handleCancel}
            title="Claim your username"
            subtitle="Choose a username for your profile"
            confirmButtonText="Claim Username"
            isLoading={busy}
          />
        )}
        
        {step === 'welcome-ring' && (
          <WelcomeRingOptIn
            username={username}
            onDecision={handleWelcomeRingDecision}
            isLoading={busy}
          />
        )}
        
        {err && (
          <div className="border border-red-400 bg-red-100 p-3 text-red-700 text-sm shadow-[2px_2px_0_#000]">
            {err}
          </div>
        )}
      </div>
    </Layout>
  );
}
