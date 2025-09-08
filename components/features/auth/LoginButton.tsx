import React, { useState } from "react";
import { getExistingDid, signMessage, hasExistingDid } from "@/lib/did-client";

interface LoginButtonProps {
  onToggleIdentity?: () => void;
  isIdentityOpen?: boolean;
}

export default function LoginButton({ onToggleIdentity, isIdentityOpen }: LoginButtonProps) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [emailSent, setEmailSent] = useState(false);

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

  async function handleEmailLogin() {
    if (!emailInput.trim()) {
      setErr('Please enter an email address');
      return;
    }

    if (!usernameInput.trim()) {
      setErr('Please enter a username');
      return;
    }

    try {
      setBusy(true);
      setErr(null);
      
      const response = await fetch('/api/auth/email-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: emailInput.trim(),
          username: usernameInput.trim()
        })
      });

      if (response.ok) {
        setEmailSent(true);
        setErr(null);
      } else {
        const error = await response.json();
        setErr(error.error || 'Failed to send login email');
      }
    } catch (error) {
      setErr('Failed to send login email. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (emailSent) {
    return (
      <div className="bg-green-50 border border-green-200 rounded p-4 max-w-md">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-green-600">✓</span>
          <span className="text-green-800 font-medium">Email Sent!</span>
        </div>
        <p className="text-green-700 text-sm mb-3">
          If @{usernameInput} has a verified email at this address, we&apos;ve sent them a login link.
        </p>
        <button
          onClick={() => {
            setEmailSent(false);
            setEmailInput('');
            setUsernameInput('');
            setShowEmailLogin(false);
          }}
          className="text-sm bg-green-100 hover:bg-green-200 border border-green-300 px-3 py-1 rounded transition-all"
        >
          Back to Login
        </button>
      </div>
    );
  }

  if (showEmailLogin) {
    return (
      <div className="bg-thread-paper border border-thread-sage rounded p-4 max-w-md">
        <h4 className="font-medium text-thread-pine mb-3">Login with Email</h4>
        <div className="space-y-3">
          <input
            type="text"
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
            placeholder="Username (e.g. alice)"
            className="w-full px-3 py-2 text-sm border border-thread-sage rounded bg-white"
            disabled={busy}
          />
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="Email address"
            className="w-full px-3 py-2 text-sm border border-thread-sage rounded bg-white"
            disabled={busy}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleEmailLogin();
              }
            }}
          />
          <div className="flex gap-2">
            <button
              onClick={handleEmailLogin}
              disabled={busy || !emailInput.trim() || !usernameInput.trim()}
              className="thread-button text-sm disabled:opacity-50"
            >
              {busy ? "Sending..." : "Send Magic Link"}
            </button>
            <button
              onClick={() => {
                setShowEmailLogin(false);
                setEmailInput('');
                setUsernameInput('');
                setErr(null);
              }}
              className="px-3 py-2 text-sm border border-thread-sage bg-thread-paper hover:bg-thread-cream rounded transition-all"
            >
              Cancel
            </button>
          </div>
          {err && <p className="text-red-600 text-sm">{err}</p>}
          <p className="text-xs text-thread-sage">
            We&apos;ll send a login link to this user if they have a verified email at this address.
          </p>
        </div>
      </div>
    );
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
      <button
        onClick={() => setShowEmailLogin(true)}
        className="px-3 py-2 text-sm border border-thread-sage bg-thread-paper hover:bg-thread-cream rounded transition-all"
      >
        Email Login
      </button>
      {err && <span className="text-thread-sunset text-sm">{err}</span>}
    </div>
  );
}
