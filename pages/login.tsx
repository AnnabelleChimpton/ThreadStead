import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Layout from "@/components/ui/layout/Layout";
import { recoverFromSeedPhrase, loginWithPassword } from "@/lib/api/did/did-client";

type LoginMethod = 'main' | 'password-login' | 'seed-phrase' | 'email-login' | 'email-sent';

export default function LoginPage() {
  const router = useRouter();
  const [currentView, setCurrentView] = useState<LoginMethod>('main');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed phrase login state
  const [seedPhrase, setSeedPhrase] = useState('');

  // Password login state
  const [passwordInput, setPasswordInput] = useState('');
  const [usernameForPassword, setUsernameForPassword] = useState('');

  // Email login state
  const [emailInput, setEmailInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');

  // Auto-populate username from URL if provided
  useEffect(() => {
    if (router.query.username && typeof router.query.username === 'string') {
      setUsernameInput(router.query.username);
    }
  }, [router.query.username]);

  async function handleSeedPhraseLogin() {
    if (!seedPhrase.trim()) {
      setError('Please enter your seed phrase');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Recover the identity from seed phrase
      await recoverFromSeedPhrase(seedPhrase.trim());
      
      // The recoverFromSeedPhrase function should handle authentication
      // Redirect to profile or reload to update auth state
      window.location.href = '/me';
    } catch (e) {
      setError((e as Error).message || 'Invalid seed phrase or login failed');
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePasswordLogin() {
    if (!passwordInput.trim() || !usernameForPassword.trim()) {
      setError('Please enter both username and password');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Use the new password login function
      await loginWithPassword(usernameForPassword.trim(), passwordInput.trim());
      
      // Redirect to profile on success
      window.location.href = '/me';
    } catch (e) {
      setError((e as Error).message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleEmailLogin() {
    if (!emailInput.trim() || !usernameInput.trim()) {
      setError('Please fill in both username and email');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/auth/email-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: emailInput.trim(),
          username: usernameInput.trim()
        })
      });

      if (response.ok) {
        setCurrentView('email-sent');
      } else {
        const error = await response.json();
        setError(error.error || 'Failed to send login email');
      }
    } catch (error) {
      setError('Failed to send login email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  function resetToMain() {
    setCurrentView('main');
    setError(null);
    setSeedPhrase('');
    setPasswordInput('');
    setUsernameForPassword('');
    setEmailInput('');
    setUsernameInput('');
  }

  function handleCreateAccount() {
    router.push('/signup');
  }

  return (
    <>
      <Head>
        <title>Sign In - ThreadStead</title>
        <meta name="description" content="Sign in to ThreadStead with your seed phrase or email" />
      </Head>
      <Layout>
        <div className="auth-container max-w-md mx-auto p-6 mt-8">
          {/* Main Login Options */}
          {currentView === 'main' && (
            <div className="auth-form thread-module p-6 sm:p-8">
              <div className="text-center mb-8">
                <h1 className="thread-headline text-3xl font-bold mb-2">Welcome Back!</h1>
                <p className="text-nb-ink-mid">
                  Sign in to your ThreadStead account
                </p>
              </div>

              {/* One list of sign-in methods; password is the primary one */}
              <div className="divide-y-2 divide-dotted divide-nb-ink-mid/40">
                <div className="pb-5">
                  <h3 className="font-bold text-base text-nb-ink">Sign in with Password</h3>
                  <p className="text-sm text-nb-ink-mid mb-3">
                    Use your username and password
                  </p>
                  <button
                    onClick={() => setCurrentView('password-login')}
                    className="mobile-button-enhanced mobile-focus-enhanced thread-button btn btn--primary w-full px-4 py-3 font-bold"
                  >
                    Continue with Password
                  </button>
                </div>

                <div className="py-5">
                  <h3 className="font-bold text-base text-nb-ink">Sign in with Seed Phrase</h3>
                  <p className="text-sm text-nb-ink-mid mb-3">
                    Use your 12-word recovery phrase
                  </p>
                  <button
                    onClick={() => setCurrentView('seed-phrase')}
                    className="thread-button-secondary btn btn--secondary w-full px-4 py-3 font-bold"
                  >
                    Continue with Seed Phrase
                  </button>
                </div>

                <div className="pt-5">
                  <h3 className="font-bold text-base text-nb-ink">Email Magic Link</h3>
                  <p className="text-sm text-nb-ink-mid mb-3">
                    Get a secure login link via email
                  </p>
                  <button
                    onClick={() => setCurrentView('email-login')}
                    className="thread-button-secondary btn btn--secondary w-full px-4 py-3 font-bold"
                  >
                    Continue with Email
                  </button>
                </div>
              </div>

              {/* Create Account */}
              <div className="mt-6 pt-6 border-t-2 border-dotted border-nb-ink-mid/40">
                <div className="text-center">
                  <p className="text-sm text-nb-ink-mid mb-4">
                    Don&apos;t have an account yet?
                  </p>
                  <button
                    onClick={handleCreateAccount}
                    className="px-6 py-3 thread-button-secondary btn btn--secondary font-bold"
                  >
                    Create New Account →
                  </button>
                </div>
              </div>

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Seed Phrase Login */}
          {currentView === 'seed-phrase' && (
            <div className="auth-form thread-module p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-6">
                <button onClick={resetToMain} className="ts-icon-button px-2" aria-label="Back">
                  ←
                </button>
                <h2 className="thread-headline text-2xl font-bold">Sign in with Seed Phrase</h2>
              </div>

              <div className="mb-6">
                <p className="text-nb-ink-mid text-sm mb-4">
                  Enter your 12-word seed phrase to recover your account and sign in.
                </p>
                <div className="border-2 border-dotted border-nb-ink-mid/60 rounded-md bg-nb-paper p-3 mb-4">
                  <p className="text-nb-ink text-sm">
                    <strong>Security tip:</strong> Make sure you&apos;re on the correct website and no one can see your screen.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="login-seed-phrase" className="block text-sm font-bold mb-2">Seed Phrase</label>
                  <textarea
                    id="login-seed-phrase"
                    value={seedPhrase}
                    onChange={(e) => setSeedPhrase(e.target.value)}
                    placeholder="Enter your 12-word seed phrase..."
                    className="w-full px-4 py-3 text-lg border-2 border-nb-ink-mid/60 rounded-md bg-white focus:outline-none focus:border-nb-ink-mid resize-none"
                    disabled={isLoading}
                    rows={3}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        handleSeedPhraseLogin();
                      }
                    }}
                  />
                  <p className="text-xs text-nb-ink-mid mt-1">
                    Ctrl+Enter to sign in quickly
                  </p>
                </div>

                <button
                  onClick={handleSeedPhraseLogin}
                  disabled={isLoading || !seedPhrase.trim()}
                  className="w-full px-6 py-3 thread-button btn btn--primary font-bold disabled:opacity-50"
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </button>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="text-center mt-4">
                  <button
                    onClick={resetToMain}
                    className="ts-bare text-sm underline"
                  >
                    Try a different sign in method
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Password Login Form */}
          {currentView === 'password-login' && (
            <div className="auth-form thread-module p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-6">
                <button onClick={resetToMain} className="ts-icon-button px-2" aria-label="Back">
                  ←
                </button>
                <h2 className="thread-headline text-2xl font-bold">Sign in with Password</h2>
              </div>

              <div className="mb-6">
                <p className="text-nb-ink-mid text-sm">
                  Enter your username and password to sign in.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="login-password-username" className="block text-sm font-bold mb-2">Username</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-nb-ink-mid">@</span>
                    <input
                      id="login-password-username"
                      type="text"
                      value={usernameForPassword}
                      onChange={(e) => setUsernameForPassword(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                      placeholder="alice"
                      className="w-full pl-8 pr-4 py-3 text-lg border-2 border-nb-ink-mid/60 rounded-md bg-white focus:outline-none focus:border-nb-ink-mid"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="login-password" className="block text-sm font-bold mb-2">Password</label>
                  <input
                    id="login-password"
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 text-lg border-2 border-nb-ink-mid/60 rounded-md bg-white focus:outline-none focus:border-nb-ink-mid"
                    disabled={isLoading}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handlePasswordLogin();
                      }
                    }}
                  />
                </div>

                <button
                  onClick={handlePasswordLogin}
                  disabled={isLoading || !passwordInput.trim() || !usernameForPassword.trim()}
                  className="w-full px-6 py-3 thread-button btn btn--primary font-bold disabled:opacity-50"
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </button>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="text-sm text-nb-ink-mid text-center">
                  Don&apos;t have a password? You may have signed up using a seed phrase instead.
                </div>

                <div className="text-center mt-4">
                  <button
                    onClick={resetToMain}
                    className="ts-bare text-sm underline"
                  >
                    Try a different sign in method
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Email Login Form */}
          {currentView === 'email-login' && (
            <div className="auth-form thread-module p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-6">
                <button onClick={resetToMain} className="ts-icon-button px-2" aria-label="Back">
                  ←
                </button>
                <h2 className="thread-headline text-2xl font-bold">Email Magic Link</h2>
              </div>

              <div className="mb-6">
                <p className="text-nb-ink-mid text-sm">
                  We&apos;ll send a secure login link to your verified email address.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="login-email-username" className="block text-sm font-bold mb-2">Username</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-nb-ink-mid">@</span>
                    <input
                      id="login-email-username"
                      type="text"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                      placeholder="alice"
                      className="w-full pl-8 pr-4 py-3 text-lg border-2 border-nb-ink-mid/60 rounded-md bg-white focus:outline-none focus:border-nb-ink-mid"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="login-email-address" className="block text-sm font-bold mb-2">Email Address</label>
                  <input
                    id="login-email-address"
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="alice@example.com"
                    className="w-full px-4 py-3 text-lg border-2 border-nb-ink-mid/60 rounded-md bg-white focus:outline-none focus:border-nb-ink-mid"
                    disabled={isLoading}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleEmailLogin();
                      }
                    }}
                  />
                </div>

                <button
                  onClick={handleEmailLogin}
                  disabled={isLoading || !emailInput.trim() || !usernameInput.trim()}
                  className="w-full px-6 py-3 thread-button btn btn--primary font-bold disabled:opacity-50"
                >
                  {isLoading ? "Sending..." : "Send Magic Link"}
                </button>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="text-sm text-nb-ink-mid text-center">
                  We&apos;ll send a secure login link if this username has a verified email at this address.
                </div>

                <div className="text-center mt-4">
                  <button
                    onClick={resetToMain}
                    className="ts-bare text-sm underline"
                  >
                    Try a different sign in method
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Email Sent Confirmation */}
          {currentView === 'email-sent' && (
            <div className="thread-module p-6 sm:p-8 text-center">
              <h2 className="thread-headline text-2xl font-bold mb-4">Email Sent!</h2>
              <p className="text-nb-ink mb-2">
                If <strong>@{usernameInput}</strong> has a verified email at <strong>{emailInput}</strong>, 
                we&apos;ve sent them a secure login link.
              </p>
              <p className="text-sm text-nb-ink-mid mb-8">
                Check your email and click the link to sign in. The link will expire in 15 minutes.
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={resetToMain}
                  className="w-full px-6 py-3 thread-button-secondary btn btn--secondary font-bold"
                >
                  Back to Sign In Options
                </button>
                
                <button
                  onClick={() => setCurrentView('email-login')}
                  className="ts-bare w-full text-sm underline"
                >
                  Try a different email or username
                </button>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </>
  );
}