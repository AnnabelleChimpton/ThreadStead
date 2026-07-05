// pages/onboarding.tsx
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Layout from "@/components/ui/layout/Layout";
import UsernameSelector from "@/components/features/auth/UsernameSelector";
import WelcomeRingOptIn from "@/components/features/onboarding/WelcomeRingOptIn";
import { PixelIcon } from '@/components/ui/PixelIcon';

type OnboardingStep = 'username' | 'welcome-ring' | 'complete';

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>('username');
  const [username, setUsername] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Progress tracking
  const stepInfo = {
    username: { number: 1, title: 'Choose Username' },
    'welcome-ring': { number: 2, title: 'Join Community' },
    complete: { number: 3, title: 'Welcome!' }
  };

  const currentStepInfo = stepInfo[step];
  const totalSteps = Object.keys(stepInfo).length;

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
      router.push(`/tr/welcome`);
    } else {
      // If they skip, go to their profile
      router.push(`/resident/${username}`);
    }
  }

  function handleCancel() {
    router.push("/");
  }

  return (
    <Layout>
      <div className="flex flex-col items-center space-y-6">
        {/* Progress Indicator */}
        <div className="w-full max-w-md bg-white border border-gray-300 rounded-lg shadow-[2px_2px_0_#000] p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">Getting Started</h2>
            <span className="text-sm text-gray-600">
              Step {currentStepInfo.number} of {totalSteps}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
            <div
              className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStepInfo.number / totalSteps) * 100}%` }}
            />
          </div>

          {/* Current Step Info */}
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-gray-900">{currentStepInfo.title}</span>
          </div>
        </div>

        {/* Step Content */}
        {step === 'username' && (
          <UsernameSelector
            onUsernameConfirmed={handleUsernameConfirmed}
            onCancel={handleCancel}
            title="Claim your username"
            subtitle="Choose a username for your profile — this will be your unique identity on Threadstead"
            confirmButtonText="Continue to Communities"
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
          <div className="w-full max-w-md border border-red-400 bg-red-100 p-3 text-red-700 text-sm shadow-[2px_2px_0_#000] rounded">
            <div className="flex items-center gap-2">
              <PixelIcon name="alert" size={16} />
              <span>{err}</span>
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="text-center text-sm text-gray-500 max-w-md">
          <p>Need help? Check out our <Link href="/getting-started" className="text-blue-600 hover:underline">Getting Started guide</Link></p>
        </div>
      </div>
    </Layout>
  );
}
