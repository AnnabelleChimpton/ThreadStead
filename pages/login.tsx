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
            <div className="auth-form bg-white border border-black rounded-none p-8 shadow-[4px_4px_0_#000]">
              <div className="text-center mb-8">
                <span className="text-6xl mb-4 block"></span>
                <h1 className="text-3xl font-bold mb-2">Welcome Back!</h1>
                <p className="text-gray-600">
                  Sign in to your ThreadStead account
                </p>
              </div>

              <div className="space-y-4">
                {/* Password Login (Primary) */}
                <div className="bg-green-50 border border-green-200 rounded p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl"></span>
                    <div>
                      <h3 className="font-bold text-green-900">Sign in with Password</h3>
                      <p className="text-sm text-green-700">
                        Use your username and password
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCurrentView('password-login')}
                    className="mobile-button-enhanced mobile-focus-enhanced w-full px-4 py-3 bg-green-200 hover:bg-green-100 border border-black shadow-[2px_2px_0_#000] font-bold transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000]"
                  >
                    Continue with Password
                  </button>
                </div>

                {/* Seed Phrase Login */}
                <div className="bg-blue-50 border border-blue-200 rounded p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl"></span>
                    <div>
                      <h3 className="font-bold text-blue-900">Sign in with Seed Phrase</h3>
                      <p className="text-sm text-blue-700">
                        Use your 12-word recovery phrase
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCurrentView('seed-phrase')}
                    className="w-full px-4 py-3 bg-blue-200 hover:bg-blue-100 border border-black shadow-[2px_2px_0_#000] font-bold transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000]"
                  >
                    Continue with Seed Phrase
                  </button>
                </div>

                {/* Email Magic Link */}
                <div className="bg-green-50 border border-green-200 rounded p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl"></span>
                    <div>
                      <h3 className="font-bold text-green-900">Email Magic Link</h3>
                      <p className="text-sm text-green-700">
                        Get a secure login link via email
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCurrentView('email-login')}
                    className="w-full px-4 py-3 bg-green-200 hover:bg-green-100 border border-black shadow-[2px_2px_0_#000] font-bold transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000]"
                  >
                    Continue with Email
                  </button>
                </div>
              </div>

              {/* Create Account */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-4">
                    Don&apos;t have an account yet?
                  </p>
                  <button
                    onClick={handleCreateAccount}
                    className="px-6 py-3 bg-yellow-200 hover:bg-yellow-100 border border-black shadow-[2px_2px_0_#000] font-bold transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000]"
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
            <div className="auth-form bg-white border border-black rounded-none p-8 shadow-[4px_4px_0_#000]">
              <div className="flex items-center gap-2 mb-6">
                <button onClick={resetToMain} className="text-gray-500 hover:text-gray-700 text-xl">
                  ←
                </button>
                <h2 className="text-2xl font-bold">Sign in with Seed Phrase</h2>
              </div>

              <div className="mb-6">
                <p className="text-gray-600 text-sm mb-4">
                  Enter your 12-word seed phrase to recover your account and sign in.
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
                  <p className="text-yellow-800 text-sm">
                    <strong>Security tip:</strong> Make sure you&apos;re on the correct website and no one can see your screen.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Seed Phrase</label>
                  <textarea
                    value={seedPhrase}
                    onChange={(e) => setSeedPhrase(e.target.value)}
                    placeholder="Enter your 12-word seed phrase..."
                    className="w-full px-4 py-3 text-lg border border-black rounded-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    disabled={isLoading}
                    rows={3}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        handleSeedPhraseLogin();
                      }
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Ctrl+Enter to sign in quickly
                  </p>
                </div>

                <button
                  onClick={handleSeedPhraseLogin}
                  disabled={isLoading || !seedPhrase.trim()}
                  className="w-full px-6 py-3 bg-blue-200 hover:bg-blue-100 border border-black shadow-[3px_3px_0_#000] font-bold transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#000] disabled:opacity-50"
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
                    className="text-sm text-gray-600 hover:text-gray-800 underline"
                  >
                    Try a different sign in method
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Password Login Form */}
          {currentView === 'password-login' && (
            <div className="auth-form bg-white border border-black rounded-none p-8 shadow-[4px_4px_0_#000]">
              <div className="flex items-center gap-2 mb-6">
                <button onClick={resetToMain} className="text-gray-500 hover:text-gray-700 text-xl">
                  ←
                </button>
                <h2 className="text-2xl font-bold">Sign in with Password</h2>
              </div>

              <div className="mb-6">
                <p className="text-gray-600 text-sm">
                  Enter your username and password to sign in.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Username</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">@</span>
                    <input
                      type="text"
                      value={usernameForPassword}
                      onChange={(e) => setUsernameForPassword(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                      placeholder="alice"
                      className="w-full pl-8 pr-4 py-3 text-lg border border-black rounded-none bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Password</label>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 text-lg border border-black rounded-none bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
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
                  className="w-full px-6 py-3 bg-green-200 hover:bg-green-100 border border-black shadow-[3px_3px_0_#000] font-bold transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#000] disabled:opacity-50"
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </button>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="text-sm text-gray-500 text-center">
                  Don&apos;t have a password? You may have signed up using a seed phrase instead.
                </div>

                <div className="text-center mt-4">
                  <button
                    onClick={resetToMain}
                    className="text-sm text-gray-600 hover:text-gray-800 underline"
                  >
                    Try a different sign in method
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Email Login Form */}
          {currentView === 'email-login' && (
            <div className="auth-form bg-white border border-black rounded-none p-8 shadow-[4px_4px_0_#000]">
              <div className="flex items-center gap-2 mb-6">
                <button onClick={resetToMain} className="text-gray-500 hover:text-gray-700 text-xl">
                  ←
                </button>
                <h2 className="text-2xl font-bold">Email Magic Link</h2>
              </div>

              <div className="mb-6">
                <p className="text-gray-600 text-sm">
                  We&apos;ll send a secure login link to your verified email address.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Username</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">@</span>
                    <input
                      type="text"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                      placeholder="alice"
                      className="w-full pl-8 pr-4 py-3 text-lg border border-black rounded-none bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Email Address</label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="alice@example.com"
                    className="w-full px-4 py-3 text-lg border border-black rounded-none bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
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
                  className="w-full px-6 py-3 bg-green-200 hover:bg-green-100 border border-black shadow-[3px_3px_0_#000] font-bold transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#000] disabled:opacity-50"
                >
                  {isLoading ? "Sending..." : "Send Magic Link"}
                </button>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="text-sm text-gray-500 text-center">
                  We&apos;ll send a secure login link if this username has a verified email at this address.
                </div>

                <div className="text-center mt-4">
                  <button
                    onClick={resetToMain}
                    className="text-sm text-gray-600 hover:text-gray-800 underline"
                  >
                    Try a different sign in method
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Email Sent Confirmation */}
          {currentView === 'email-sent' && (
            <div className="bg-white border border-black rounded-none p-8 shadow-[4px_4px_0_#000] text-center">
              <span className="text-6xl mb-6 block"></span>
              <h2 className="text-2xl font-bold text-green-800 mb-4">Email Sent!</h2>
              <p className="text-gray-700 mb-2">
                If <strong>@{usernameInput}</strong> has a verified email at <strong>{emailInput}</strong>, 
                we&apos;ve sent them a secure login link.
              </p>
              <p className="text-sm text-gray-600 mb-8">
                Check your email and click the link to sign in. The link will expire in 15 minutes.
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={resetToMain}
                  className="w-full px-6 py-3 bg-gray-200 hover:bg-gray-100 border border-black shadow-[2px_2px_0_#000] font-bold transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000]"
                >
                  Back to Sign In Options
                </button>
                
                <button
                  onClick={() => setCurrentView('email-login')}
                  className="w-full text-sm text-gray-600 hover:text-gray-800 underline"
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