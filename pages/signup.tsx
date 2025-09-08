import React, { useState, useEffect } from "react";
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import Head from "next/head";
import Layout from "@/components/ui/layout/Layout";
import { createNewIdentityWithSeedPhrase, createNewIdentityWithPassword } from "@/lib/api/did/did-client";
import { validatePasswordStrength } from "@/lib/password-auth";
import { validateUsername } from "@/lib/validateUsername";
import { DEFAULT_PROFILE_TEMPLATE_INFO, ProfileTemplateType } from "@/lib/default-profile-templates";
import { getTemplatePreviewStyle, getTemplateGradientOverlay, TEMPLATE_PREVIEW_STYLES } from "@/lib/template-preview-styles";
import SignupFinaleAnimation from "@/components/features/onboarding/SignupFinaleAnimation";
import { useGlobalAudio } from "@/contexts/GlobalAudioContext";

interface SignupPageProps {
  betaKey?: string | null;
}

type SignupStep = 'welcome' | 'auth-method' | 'password-setup' | 'seed-phrase' | 'email' | 'profile' | 'template' | 'finale';
type AuthMethod = 'password' | 'seedphrase';

export default function SignupPage({ betaKey: urlBetaKey }: SignupPageProps) {
  const router = useRouter();
  const globalAudio = useGlobalAudio();
  const [currentStep, setCurrentStep] = useState<SignupStep>('welcome');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAuthMethod, setSelectedAuthMethod] = useState<AuthMethod | null>(null);

  // Step 1: Username and Beta Key
  const [username, setUsername] = useState('');
  const [betaKey, setBetaKey] = useState(urlBetaKey || '');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  // Step 2: Password Setup (if password auth)
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  
  // Step 3: Seed Phrase
  const [generatedSeedPhrase, setGeneratedSeedPhrase] = useState<string>('');
  const [seedPhraseSaved, setSeedPhraseSaved] = useState(false);

  // Step 3: Email (Optional)
  const [email, setEmail] = useState('');
  const [skipEmail, setSkipEmail] = useState(false);

  // Step 4: Template Selection
  const [selectedTemplate, setSelectedTemplate] = useState<ProfileTemplateType>('abstract-art');

  // Step 5: Profile Setup (Optional)
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);

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

    // Move to auth method selection
    setCurrentStep('auth-method');
  }

  async function handleAuthMethodSelected(method: AuthMethod) {
    setSelectedAuthMethod(method);
    
    if (method === 'password') {
      setCurrentStep('password-setup');
    } else {
      // Create account with seed phrase immediately
      setIsLoading(true);
      setError(null);

      try {
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
  }

  async function handlePasswordSetup() {
    // Validate password
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const validation = validatePasswordStrength(password);
    if (!validation.valid) {
      setPasswordErrors(validation.errors);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create account with password
      const result = await createNewIdentityWithPassword(username.trim(), password, betaKey || undefined);
      setGeneratedSeedPhrase(result.mnemonic);
      setAccountCreated(true);
      // For password users, optionally show seed phrase but move to email step
      setCurrentStep('email');
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

  async function handleTemplateSelected() {
    setIsLoading(true);
    setError(null);

    try {
      // Save the selected template immediately
      if (selectedTemplate) {
        const templateResponse = await fetch('/api/user/profile-template', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ template: selectedTemplate }),
          credentials: 'include'
        });

        if (!templateResponse.ok) {
          const errorData = await templateResponse.json().catch(() => ({ error: 'Failed to set template' }));
          setError(errorData.error || 'Failed to save template. Please try again.');
          return;
        }
      }
      
      // Start music when theme is selected (only if not already playing)
      if (!globalAudio.state.isPlaying) {
        try {
          await globalAudio.startSignupAudio();
        } catch (error) {
          // Audio failed but don't block signup flow
        }
      }
      
      // Move to finale animation
      setCurrentStep('finale');
    } catch (err) {
      setError('Failed to save template. Please try again.');
      console.error('Template selection error:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleProfileSetup() {
    setIsLoading(true);
    setError(null);

    try {
      let profileUpdated = false;
      
      // Upload profile photo if selected
      if (profilePhoto) {
        const formData = new FormData();
        formData.append('photo', profilePhoto);
        
        const photoResponse = await fetch('/api/user/photo', {
          method: 'POST',
          body: formData,
          credentials: 'include' // Ensure cookies are sent
        });
        
        if (!photoResponse.ok) {
          const errorData = await photoResponse.json().catch(() => ({ error: 'Failed to upload photo' }));
          throw new Error(errorData.error || 'Failed to upload profile photo');
        }
        profileUpdated = true;
      }

      // Update bio if provided
      if (bio.trim()) {
        const bioResponse = await fetch('/api/user/bio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bio: bio.trim() }),
          credentials: 'include' // Ensure cookies are sent
        });
        
        if (!bioResponse.ok) {
          const errorData = await bioResponse.json().catch(() => ({ error: 'Failed to save bio' }));
          throw new Error(errorData.error || 'Failed to update bio');
        }
        profileUpdated = true;
      }

      // Only proceed if either operation was attempted and successful
      if (profileUpdated || (!profilePhoto && !bio.trim())) {
        setProfileSaved(true);
        // Go to template selection
        setTimeout(() => setCurrentStep('template'), 1500);
      } else {
        throw new Error('No profile data to save');
      }
    } catch (err) {
      console.error('Profile setup error:', err);
      setError((err as Error).message || 'Failed to set up profile');
      // Don't automatically proceed on error - let user retry or skip manually
    } finally {
      setIsLoading(false);
    }
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
              <div className={`flex items-center gap-2 ${currentStep === 'welcome' ? 'text-blue-600 font-medium' : ['seed-phrase', 'email', 'profile', 'finale'].includes(currentStep) ? 'text-green-600' : 'text-gray-400'}`}>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${currentStep === 'welcome' ? 'bg-blue-100' : ['seed-phrase', 'email', 'profile', 'finale'].includes(currentStep) ? 'bg-green-100' : 'bg-gray-100'}`}>
                  1
                </span>
                Username
              </div>
              <div className="w-6 h-px bg-gray-300"></div>
              <div className={`flex items-center gap-2 ${currentStep === 'seed-phrase' ? 'text-blue-600 font-medium' : ['email', 'profile', 'finale'].includes(currentStep) ? 'text-green-600' : 'text-gray-400'}`}>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${currentStep === 'seed-phrase' ? 'bg-blue-100' : ['email', 'profile', 'finale'].includes(currentStep) ? 'bg-green-100' : 'bg-gray-100'}`}>
                  2
                </span>
                Backup
              </div>
              <div className="w-6 h-px bg-gray-300"></div>
              <div className={`flex items-center gap-2 ${currentStep === 'email' ? 'text-blue-600 font-medium' : ['profile', 'finale'].includes(currentStep) ? 'text-green-600' : 'text-gray-400'}`}>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${currentStep === 'email' ? 'bg-blue-100' : ['profile', 'finale'].includes(currentStep) ? 'bg-green-100' : 'bg-gray-100'}`}>
                  3
                </span>
                Email
              </div>
              <div className="w-6 h-px bg-gray-300"></div>
              <div className={`flex items-center gap-2 ${currentStep === 'profile' ? 'text-blue-600 font-medium' : ['template', 'finale'].includes(currentStep) ? 'text-green-600' : 'text-gray-400'}`}>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${currentStep === 'profile' ? 'bg-blue-100' : ['template', 'finale'].includes(currentStep) ? 'bg-green-100' : 'bg-gray-100'}`}>
                  4
                </span>
                Profile
              </div>
              <div className="w-6 h-px bg-gray-300"></div>
              <div className={`flex items-center gap-2 ${currentStep === 'template' ? 'text-blue-600 font-medium' : currentStep === 'finale' ? 'text-green-600' : 'text-gray-400'}`}>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${currentStep === 'template' ? 'bg-blue-100' : currentStep === 'finale' ? 'bg-green-100' : 'bg-gray-100'}`}>
                  5
                </span>
                Template
              </div>
              <div className="w-6 h-px bg-gray-300"></div>
              <div className={`flex items-center gap-2 ${currentStep === 'finale' ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${currentStep === 'finale' ? 'bg-green-100' : 'bg-gray-100'}`}>
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

          {/* Step 2: Auth Method Selection */}
          {currentStep === 'auth-method' && (
            <div className="bg-white border border-black rounded-none p-8 shadow-[4px_4px_0_#000]">
              <div className="text-center mb-8">
                <span className="text-6xl mb-4 block">🔑</span>
                <h2 className="text-3xl font-bold mb-2">Choose Your Security Method</h2>
                <p className="text-gray-600">
                  How would you like to secure your @{username} account?
                </p>
              </div>

              <div className="max-w-2xl mx-auto space-y-4">
                {/* Password Option (Recommended) */}
                <div className="border-2 border-green-500 rounded-lg p-6 bg-green-50">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <span className="inline-block px-3 py-1 bg-green-200 text-green-800 text-xs font-bold rounded">
                        RECOMMENDED
                      </span>
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-xl font-bold mb-2">🔐 Use a Password</h3>
                      <p className="text-gray-700 mb-4">
                        Familiar and easy! Sign in with a username and password, just like traditional apps.
                      </p>
                      <ul className="text-sm text-gray-600 space-y-1 mb-4">
                        <li>✓ Easy to remember and use</li>
                        <li>✓ Change your password anytime</li>
                        <li>✓ Recovery phrase generated but hidden</li>
                        <li>✓ Perfect for most users</li>
                      </ul>
                      <button
                        onClick={() => handleAuthMethodSelected('password')}
                        className="w-full px-6 py-3 bg-green-200 hover:bg-green-100 border border-black shadow-[2px_2px_0_#000] font-bold transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000]"
                      >
                        Continue with Password →
                      </button>
                    </div>
                  </div>
                </div>

                {/* Seed Phrase Option (Advanced) */}
                <div className="border border-gray-300 rounded-lg p-6 bg-gray-50">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <span className="inline-block px-3 py-1 bg-gray-200 text-gray-700 text-xs font-bold rounded">
                        ADVANCED
                      </span>
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-xl font-bold mb-2">🌱 Passwordless Keypair</h3>
                      <p className="text-gray-700 mb-4">
                        Maximum security with a 12-word recovery phrase. No passwords needed.
                      </p>
                      <ul className="text-sm text-gray-600 space-y-1 mb-4">
                        <li>✓ Most secure option</li>
                        <li>✓ Full control of your identity</li>
                        <li>✓ No password to remember or reset</li>
                        <li>⚠️ Must safely store recovery phrase</li>
                      </ul>
                      <button
                        onClick={() => handleAuthMethodSelected('seedphrase')}
                        className="w-full px-6 py-3 bg-gray-200 hover:bg-gray-100 border border-black shadow-[2px_2px_0_#000] font-bold transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000]"
                      >
                        Continue with Seed Phrase →
                      </button>
                    </div>
                  </div>
                </div>

                <div className="text-center text-sm text-gray-500 mt-6">
                  <p>You can switch between methods later in your account settings.</p>
                </div>
              </div>

              {error && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Step 2b: Password Setup */}
          {currentStep === 'password-setup' && (
            <div className="bg-white border border-black rounded-none p-8 shadow-[4px_4px_0_#000]">
              <div className="text-center mb-8">
                <span className="text-6xl mb-4 block">🔐</span>
                <h2 className="text-3xl font-bold mb-2">Create Your Password</h2>
                <p className="text-gray-600">
                  Choose a strong password for your @{username} account
                </p>
              </div>

              <div className="max-w-md mx-auto space-y-6">
                <div>
                  <label className="block text-sm font-bold mb-2">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        const validation = validatePasswordStrength(e.target.value);
                        setPasswordErrors(validation.errors);
                      }}
                      placeholder="Enter a strong password"
                      className="w-full px-4 py-3 text-lg border border-black rounded-none bg-white focus:outline-none focus:ring-2 focus:ring-green-500 pr-12"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Confirm Password</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Enter password again"
                    className="w-full px-4 py-3 text-lg border border-black rounded-none bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={isLoading}
                  />
                </div>

                {/* Password Requirements */}
                <div className="bg-gray-50 border border-gray-200 rounded p-4">
                  <p className="text-sm font-bold text-gray-700 mb-2">Password Requirements:</p>
                  <ul className="text-sm space-y-1">
                    <li className={password.length >= 8 ? "text-green-600" : "text-gray-500"}>
                      {password.length >= 8 ? "✓" : "○"} At least 8 characters
                    </li>
                    <li className={/[a-z]/.test(password) ? "text-green-600" : "text-gray-500"}>
                      {/[a-z]/.test(password) ? "✓" : "○"} One lowercase letter
                    </li>
                    <li className={/[A-Z]/.test(password) ? "text-green-600" : "text-gray-500"}>
                      {/[A-Z]/.test(password) ? "✓" : "○"} One uppercase letter
                    </li>
                    <li className={/[0-9]/.test(password) ? "text-green-600" : "text-gray-500"}>
                      {/[0-9]/.test(password) ? "✓" : "○"} One number
                    </li>
                  </ul>
                </div>

                <button
                  onClick={handlePasswordSetup}
                  disabled={isLoading || !password || !confirmPassword || passwordErrors.length > 0}
                  className="w-full px-6 py-4 text-lg bg-green-200 hover:bg-green-100 border border-black shadow-[3px_3px_0_#000] font-bold transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#000] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Creating Account..." : "Create Account with Password"}
                </button>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    {error}
                  </div>
                )}

                {passwordErrors.length > 0 && password && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
                    {passwordErrors[0]}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Seed Phrase */}
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

          {/* Step 4: Template Selection */}
          {currentStep === 'template' && (
            <div className="bg-white border border-black rounded-none p-8 shadow-[4px_4px_0_#000]">
              <div className="text-center mb-8">
                <span className="text-6xl mb-4 block">🎨</span>
                <h2 className="text-3xl font-bold mb-2">Choose Your Theme</h2>
                <p className="text-gray-600 max-w-lg mx-auto">
                  Select a profile template to personalize your ThreadStead experience.
                  You can change this anytime in your settings.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto mb-6">
                {(['abstract-art', 'charcoal-nights', 'pixel-petals', 'retro-social', 'classic-linen'] as ProfileTemplateType[]).map((templateType) => {
                  const templateInfo = DEFAULT_PROFILE_TEMPLATE_INFO[templateType];
                  const previewStyle = getTemplatePreviewStyle(templateType);
                  const isSelected = selectedTemplate === templateType;
                  
                  return (
                    <button
                      key={templateType}
                      onClick={() => setSelectedTemplate(templateType)}
                      className={`relative border-2 ${isSelected ? 'border-blue-500 shadow-[4px_4px_0_#3B82F6]' : 'border-black shadow-[2px_2px_0_#000]'} rounded-lg p-4 transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] text-left overflow-hidden`}
                      style={{
                        ...previewStyle,
                        borderColor: isSelected ? '#3B82F6' : '#000'
                      }}
                    >
                      {/* Gradient Overlay */}
                      <div style={getTemplateGradientOverlay(templateType)} />
                      
                      {/* Selection Badge */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-bold z-10">
                          Selected
                        </div>
                      )}
                      
                      {/* Template Content */}
                      <div className="relative z-10">
                        <div className="flex items-start gap-3 mb-3">
                          <span className="text-3xl">{templateInfo.emoji}</span>
                          <div className="flex-1">
                            <h3 className="text-lg font-bold mb-1" style={{ color: TEMPLATE_PREVIEW_STYLES[templateType]?.primaryColor }}>
                              {templateInfo.name}
                            </h3>
                            <p className="text-sm opacity-80" style={{ color: TEMPLATE_PREVIEW_STYLES[templateType]?.secondaryColor }}>
                              {templateInfo.description}
                            </p>
                          </div>
                        </div>
                        
                        {/* Preview Elements */}
                        <div className="mt-3 flex gap-2">
                          <div 
                            className="px-2 py-1 text-xs font-medium rounded"
                            style={{
                              backgroundColor: TEMPLATE_PREVIEW_STYLES[templateType]?.primaryColor + '20',
                              color: TEMPLATE_PREVIEW_STYLES[templateType]?.primaryColor,
                              borderStyle: TEMPLATE_PREVIEW_STYLES[templateType]?.borderStyle,
                              borderWidth: '1px',
                              borderColor: TEMPLATE_PREVIEW_STYLES[templateType]?.primaryColor
                            }}
                          >
                            Button
                          </div>
                          <div 
                            className="px-2 py-1 text-xs font-medium rounded"
                            style={{
                              backgroundColor: TEMPLATE_PREVIEW_STYLES[templateType]?.secondaryColor + '20',
                              color: TEMPLATE_PREVIEW_STYLES[templateType]?.secondaryColor,
                              borderStyle: TEMPLATE_PREVIEW_STYLES[templateType]?.borderStyle,
                              borderWidth: '1px',
                              borderColor: TEMPLATE_PREVIEW_STYLES[templateType]?.secondaryColor
                            }}
                          >
                            Link
                          </div>
                          {TEMPLATE_PREVIEW_STYLES[templateType]?.accentColor && (
                            <div 
                              className="px-2 py-1 text-xs font-medium rounded"
                              style={{
                                backgroundColor: TEMPLATE_PREVIEW_STYLES[templateType].accentColor + '20',
                                color: TEMPLATE_PREVIEW_STYLES[templateType].accentColor,
                                borderStyle: TEMPLATE_PREVIEW_STYLES[templateType]?.borderStyle,
                                borderWidth: '1px',
                                borderColor: TEMPLATE_PREVIEW_STYLES[templateType].accentColor
                              }}
                            >
                              Accent
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="max-w-md mx-auto">
                <button
                  onClick={handleTemplateSelected}
                  disabled={!selectedTemplate || isLoading}
                  className="w-full px-6 py-4 text-lg bg-blue-200 hover:bg-blue-100 border border-black shadow-[3px_3px_0_#000] font-bold transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#000] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Saving Template...' : `Continue with ${DEFAULT_PROFILE_TEMPLATE_INFO[selectedTemplate]?.name || 'Template'} →`}
                </button>
                
                {error && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    {error}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Profile Setup (Optional) */}
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
                    disabled={isLoading || (!profilePhoto && !bio.trim())}
                    className="w-full px-6 py-3 bg-green-200 hover:bg-green-100 border border-black shadow-[3px_3px_0_#000] font-bold transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#000] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "Saving..." : "Save Profile & Continue"}
                  </button>
                  
                  <button
                    onClick={() => setCurrentStep('template')}
                    disabled={isLoading}
                    className="text-sm text-gray-600 hover:text-gray-800 underline disabled:opacity-50"
                  >
                    Skip for now
                  </button>
                </div>

                {profileSaved && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                    <strong>✓ Success!</strong> Your profile has been saved.
                  </div>
                )}
                
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    <strong>Error:</strong> {error}
                    <div className="mt-2 text-xs">
                      You can try again or skip this step and set up your profile later in settings.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}


          {/* Finale Animation */}
          {currentStep === 'finale' && (
            <SignupFinaleAnimation
              username={username}
              selectedTheme={selectedTemplate}
              onComplete={() => {
                // Fallback navigation if animation fails
                router.push(`/resident/${username}`);
              }}
            />
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