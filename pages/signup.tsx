import React, { useState, useEffect } from "react";
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import Head from "next/head";
import Layout from "@/components/Layout";
import { createNewIdentityWithSeedPhrase } from "@/lib/did-client";
import { validateUsername } from "@/lib/validateUsername";

interface SignupPageProps {
  betaKey?: string | null;
}

type SignupStep = 'welcome' | 'seed-phrase' | 'email' | 'profile' | 'complete';

export default function SignupPage({ betaKey: urlBetaKey }: SignupPageProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<SignupStep>('welcome');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Username and Beta Key
  const [username, setUsername] = useState('');
  const [betaKey, setBetaKey] = useState(urlBetaKey || '');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  // Step 2: Seed Phrase
  const [generatedSeedPhrase, setGeneratedSeedPhrase] = useState<string>('');
  const [seedPhraseSaved, setSeedPhraseSaved] = useState(false);

  // Step 3: Email (Optional)
  const [email, setEmail] = useState('');
  const [skipEmail, setSkipEmail] = useState(false);

  // Step 4: Profile Setup (Optional)
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [bio, setBio] = useState('');

  // Step 5: Complete
  const [accountCreated, setAccountCreated] = useState(false);

  useEffect(() => {
    // Auto-populate beta key from URL
    if (urlBetaKey && !betaKey) {
      setBetaKey(urlBetaKey);
    }
  }, [urlBetaKey, betaKey]);

  async function checkUsernameAvailability(username: string) {
    // First validate the username format
    const validation = validateUsername(username);
    if (!validation.ok) {
      setUsernameAvailable(null);
      return;
    }

    try {
      const response = await fetch(`/api/account/check-handle?handle=${encodeURIComponent(username)}`);
      const data = await response.json();
      setUsernameAvailable(data.available);
    } catch (error) {
      console.error('Error checking username:', error);
      setUsernameAvailable(null);
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (username) {
        checkUsernameAvailability(username);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [username]);

  async function handleCreateAccount() {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    const validation = validateUsername(username);
    if (!validation.ok) {
      setError(validation.message);
      return;
    }

    if (usernameAvailable === false) {
      setError('Username is not available');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create account with seed phrase
      const result = await createNewIdentityWithSeedPhrase(username.trim(), betaKey || undefined);
      
      setGeneratedSeedPhrase(result.mnemonic);
      setCurrentStep('seed-phrase');
      setAccountCreated(true);
    } catch (e: unknown) {
      setError((e as Error).message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSeedPhraseSaved() {
    setSeedPhraseSaved(true);
    setCurrentStep('email');
  }

  async function handleEmailSetup() {
    if (!email.trim()) {
      // Skip email step
      setCurrentStep('profile');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/user/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });

      if (response.ok) {
        setCurrentStep('profile');
      } else {
        const error = await response.json();
        setError(error.error || 'Failed to set email');
      }
    } catch (err) {
      setError('Failed to set email. You can add it later in settings.');
      // Continue to profile setup even if email fails
      setTimeout(() => setCurrentStep('profile'), 2000);
    } finally {
      setIsLoading(false);
    }
  }

  function handleProfilePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Profile photo must be smaller than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      setProfilePhoto(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfilePhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  }

  async function handleProfileSetup() {
    setIsLoading(true);
    setError(null);

    try {
      // Upload profile photo if selected
      if (profilePhoto) {
        const formData = new FormData();
        formData.append('photo', profilePhoto);
        
        const photoResponse = await fetch('/api/user/photo', {
          method: 'POST',
          body: formData
        });
        
        if (!photoResponse.ok) {
          throw new Error('Failed to upload profile photo');
        }
      }

      // Update bio if provided
      if (bio.trim()) {
        const bioResponse = await fetch('/api/user/bio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bio: bio.trim() })
        });
        
        if (!bioResponse.ok) {
          throw new Error('Failed to update bio');
        }
      }

      setCurrentStep('complete');
    } catch (err) {
      setError((err as Error).message || 'Failed to set up profile');
      // Continue to completion even if profile setup fails
      setTimeout(() => setCurrentStep('complete'), 2000);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleComplete() {
    // Use Next.js router for proper navigation
    router.push(`/resident/${username}`);
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      // Could show a toast here
    });
  }

  function downloadSeedPhrase(phrase: string) {
    const blob = new Blob([phrase], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `threadstead-recovery-phrase-${username}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Head>
        <title>Create Your Account | ThreadStead</title>
      </Head>
      <Layout>
        <div className="max-w-2xl mx-auto p-6">
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2 text-sm">
              <div className={`flex items-center gap-2 ${currentStep === 'welcome' ? 'text-blue-600 font-medium' : ['seed-phrase', 'email', 'profile', 'complete'].includes(currentStep) ? 'text-green-600' : 'text-gray-400'}`}>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${currentStep === 'welcome' ? 'bg-blue-100' : ['seed-phrase', 'email', 'profile', 'complete'].includes(currentStep) ? 'bg-green-100' : 'bg-gray-100'}`}>
                  1
                </span>
                Username
              </div>
              <div className="w-6 h-px bg-gray-300"></div>
              <div className={`flex items-center gap-2 ${currentStep === 'seed-phrase' ? 'text-blue-600 font-medium' : ['email', 'profile', 'complete'].includes(currentStep) ? 'text-green-600' : 'text-gray-400'}`}>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${currentStep === 'seed-phrase' ? 'bg-blue-100' : ['email', 'profile', 'complete'].includes(currentStep) ? 'bg-green-100' : 'bg-gray-100'}`}>
                  2
                </span>
                Backup
              </div>
              <div className="w-6 h-px bg-gray-300"></div>
              <div className={`flex items-center gap-2 ${currentStep === 'email' ? 'text-blue-600 font-medium' : ['profile', 'complete'].includes(currentStep) ? 'text-green-600' : 'text-gray-400'}`}>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${currentStep === 'email' ? 'bg-blue-100' : ['profile', 'complete'].includes(currentStep) ? 'bg-green-100' : 'bg-gray-100'}`}>
                  3
                </span>
                Email
              </div>
              <div className="w-6 h-px bg-gray-300"></div>
              <div className={`flex items-center gap-2 ${currentStep === 'profile' ? 'text-blue-600 font-medium' : currentStep === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${currentStep === 'profile' ? 'bg-blue-100' : currentStep === 'complete' ? 'bg-green-100' : 'bg-gray-100'}`}>
                  4
                </span>
                Profile
              </div>
              <div className="w-6 h-px bg-gray-300"></div>
              <div className={`flex items-center gap-2 ${currentStep === 'complete' ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${currentStep === 'complete' ? 'bg-green-100' : 'bg-gray-100'}`}>
                  ✓
                </span>
                Done
              </div>
            </div>
          </div>

          {/* Step 1: Welcome & Username */}
          {currentStep === 'welcome' && (
            <div className="bg-white border border-black rounded-none p-8 shadow-[4px_4px_0_#000]">
              <div className="text-center mb-8">
                <span className="text-6xl mb-4 block">👋</span>
                <h1 className="text-3xl font-bold mb-2">Welcome to ThreadStead!</h1>
                <p className="text-gray-600">
                  Let&apos;s create your decentralized identity. You&apos;ll own your account completely.
                </p>
              </div>

              <div className="space-y-6 max-w-md mx-auto">
                <div>
                  <label className="block text-sm font-bold mb-2">Choose Your Username</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">@</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => {
                        const value = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
                        setUsername(value);
                      }}
                      placeholder="alice"
                      className="w-full pl-8 pr-4 py-3 text-lg border border-black rounded-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isLoading}
                      maxLength={20}
                    />
                  </div>
                  {username.length > 0 && (() => {
                    const validation = validateUsername(username);
                    if (!validation.ok) {
                      return (
                        <div className="mt-2">
                          <p className="text-red-600 text-sm">✗ {validation.message}</p>
                        </div>
                      );
                    }
                    return (
                      <div className="mt-2">
                        {usernameAvailable === true && (
                          <p className="text-green-600 text-sm">✓ @{username} is available!</p>
                        )}
                        {usernameAvailable === false && (
                          <p className="text-red-600 text-sm">✗ @{username} is taken</p>
                        )}
                        {usernameAvailable === null && username.length >= 3 && (
                          <p className="text-gray-500 text-sm">Checking availability...</p>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">
                    Beta Invite Code
                    {urlBetaKey && <span className="text-green-600 ml-1">(Auto-filled)</span>}
                  </label>
                  <input
                    type="text"
                    value={betaKey}
                    onChange={(e) => setBetaKey(e.target.value.toUpperCase())}
                    placeholder="BETA-XXXX-XXXX-XXXX"
                    className="w-full px-4 py-3 text-lg border border-black rounded-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Required during beta. Get one from a friend or contact support.
                  </p>
                </div>

                <button
                  onClick={handleCreateAccount}
                  disabled={isLoading || !username || usernameAvailable !== true || !betaKey}
                  className="w-full px-6 py-4 text-lg bg-yellow-200 hover:bg-yellow-100 border border-black shadow-[3px_3px_0_#000] font-bold transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#000] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Creating Account..." : "Create My Account"}
                </button>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    {error}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Seed Phrase */}
          {currentStep === 'seed-phrase' && generatedSeedPhrase && (
            <div className="bg-white border border-black rounded-none p-8 shadow-[4px_4px_0_#000]">
              <div className="text-center mb-8">
                <span className="text-6xl mb-4 block">🛡️</span>
                <h2 className="text-3xl font-bold mb-2">Secure Your Account</h2>
                <p className="text-gray-600 max-w-lg mx-auto">
                  <strong>Save these 12 words in order!</strong> This is your account recovery phrase. 
                  You&apos;ll need it if you lose access to this device.
                </p>
              </div>

              <div className="max-w-2xl mx-auto">
                <div className="bg-blue-50 border border-blue-200 rounded p-6 mb-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {generatedSeedPhrase.split(' ').map((word, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-white rounded border border-blue-300">
                        <span className="text-sm font-bold text-blue-600 min-w-[24px]">{index + 1}.</span>
                        <span className="font-mono font-medium">{word}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded p-4 mb-6">
                  <h3 className="font-bold text-red-800 mb-2">⚠️ Important Security Notice</h3>
                  <ul className="text-red-700 text-sm space-y-1">
                    <li>• Anyone with these words can access your account</li>
                    <li>• Write them down on paper and store safely</li>
                    <li>• Never share them with anyone</li>
                    <li>• Don&apos;t store them in email, screenshots, or cloud storage</li>
                  </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <button
                    onClick={() => copyToClipboard(generatedSeedPhrase)}
                    className="flex-1 px-4 py-3 bg-green-100 hover:bg-green-200 border border-green-300 font-medium transition-all flex items-center justify-center gap-2"
                  >
                    <span>📋</span>
                    Copy Words
                  </button>
                  <button
                    onClick={() => downloadSeedPhrase(generatedSeedPhrase)}
                    className="flex-1 px-4 py-3 bg-blue-100 hover:bg-blue-200 border border-blue-300 font-medium transition-all flex items-center justify-center gap-2"
                  >
                    <span>💾</span>
                    Download Backup
                  </button>
                </div>

                <button
                  onClick={handleSeedPhraseSaved}
                  className="w-full px-6 py-4 text-lg bg-green-200 hover:bg-green-100 border border-black shadow-[3px_3px_0_#000] font-bold transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#000]"
                >
                  ✓ I&apos;ve Safely Saved My Recovery Phrase
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Email (Optional) */}
          {currentStep === 'email' && (
            <div className="bg-white border border-black rounded-none p-8 shadow-[4px_4px_0_#000]">
              <div className="text-center mb-8">
                <span className="text-6xl mb-4 block">📧</span>
                <h2 className="text-3xl font-bold mb-2">Add Email (Optional)</h2>
                <p className="text-gray-600 max-w-lg mx-auto">
                  Add your email address for magic link login. This makes it easier to access your account
                  from different devices.
                </p>
              </div>

              <div className="max-w-md mx-auto space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded p-4">
                  <h3 className="font-bold text-blue-800 mb-2">Why add an email?</h3>
                  <ul className="text-blue-700 text-sm space-y-1">
                    <li>• Sign in without your recovery phrase</li>
                    <li>• Access your account from any device</li>
                    <li>• Additional account recovery option</li>
                    <li>• We&apos;ll never send spam or marketing emails</li>
                  </ul>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alice@example.com"
                    className="w-full px-4 py-3 text-lg border border-black rounded-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleEmailSetup}
                    disabled={isLoading}
                    className="w-full px-6 py-3 bg-blue-200 hover:bg-blue-100 border border-black shadow-[3px_3px_0_#000] font-bold transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#000] disabled:opacity-50"
                  >
                    {isLoading ? "Setting up..." : email.trim() ? "Add Email & Continue" : "Skip Email Setup"}
                  </button>
                  
                  {email.trim() && (
                    <button
                      onClick={() => setCurrentStep('profile')}
                      className="text-sm text-gray-600 hover:text-gray-800 underline"
                    >
                      Skip for now
                    </button>
                  )}
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    {error}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Profile Setup (Optional) */}
          {currentStep === 'profile' && (
            <div className="bg-white border border-black rounded-none p-8 shadow-[4px_4px_0_#000]">
              <div className="text-center mb-8">
                <span className="text-6xl mb-4 block">📸</span>
                <h2 className="text-3xl font-bold mb-2">Set up your profile</h2>
                <p className="text-gray-600">
                  Add a profile photo and bio to help others recognize you (optional)
                </p>
              </div>

              <div className="space-y-6 max-w-md mx-auto">
                <div>
                  <label className="block text-sm font-bold mb-3">Profile Photo</label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full border-2 border-black bg-gray-100 flex items-center justify-center overflow-hidden">
                      {profilePhotoPreview ? (
                        <img src={profilePhotoPreview} alt="Profile preview" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl text-gray-400">👤</span>
                      )}
                    </div>
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePhotoChange}
                        className="hidden"
                        id="profile-photo"
                        disabled={isLoading}
                      />
                      <label
                        htmlFor="profile-photo"
                        className="cursor-pointer inline-block px-4 py-2 bg-gray-200 hover:bg-gray-100 border border-black font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#000] shadow-[3px_3px_0_#000]"
                      >
                        Choose Photo
                      </label>
                      <p className="text-xs text-gray-500 mt-1">JPG, PNG up to 5MB</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell others about yourself..."
                    className="w-full px-4 py-3 text-lg border border-black rounded-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    disabled={isLoading}
                    rows={3}
                    maxLength={200}
                  />
                  <p className="text-xs text-gray-500 mt-1">{bio.length}/200 characters</p>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleProfileSetup}
                    disabled={isLoading}
                    className="w-full px-6 py-3 bg-green-200 hover:bg-green-100 border border-black shadow-[3px_3px_0_#000] font-bold transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#000] disabled:opacity-50"
                  >
                    {isLoading ? "Setting up..." : (profilePhoto || bio.trim()) ? "Save Profile & Finish" : "Skip Profile Setup"}
                  </button>
                  
                  <button
                    onClick={() => setCurrentStep('complete')}
                    className="text-sm text-gray-600 hover:text-gray-800 underline"
                  >
                    Skip for now
                  </button>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    {error}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Complete */}
          {currentStep === 'complete' && (
            <div className="bg-white border border-black rounded-none p-8 shadow-[4px_4px_0_#000] text-center">
              <span className="text-6xl mb-6 block">🎉</span>
              <h2 className="text-3xl font-bold mb-4">Welcome to ThreadStead!</h2>
              <p className="text-gray-600 mb-2">
                Your account <strong>@{username}</strong> has been created successfully.
              </p>
              <p className="text-sm text-gray-500 mb-8">
                You now own your decentralized identity completely. Nobody can take it away from you!
              </p>

              <button
                onClick={handleComplete}
                className="px-8 py-4 text-lg bg-green-200 hover:bg-green-100 border border-black shadow-[3px_3px_0_#000] font-bold transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#000]"
              >
                Go to My Profile →
              </button>

              <div className="mt-8 text-xs text-gray-500 max-w-md mx-auto">
                <p>
                  Next steps: Customize your profile, join communities, and invite friends using your beta codes!
                </p>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<SignupPageProps> = async ({ query }) => {
  // Auto-populate beta key from URL parameter
  const betaKey = typeof query.beta === 'string' ? query.beta : null;

  return {
    props: {
      betaKey,
    },
  };
};