import React, { useState, useEffect } from "react";
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import Head from "next/head";
import Layout from "@/components/ui/layout/Layout";
import { createNewIdentityWithSeedPhrase, createNewIdentityWithPassword } from "@/lib/api/did/did-client";
import { PixelIcon } from '@/components/ui/PixelIcon';
import { validatePasswordStrength } from "@/lib/auth/password";
import { validateUsername } from "@/lib/domain/validation/username";
import { DEFAULT_PROFILE_TEMPLATE_INFO, ProfileTemplateType } from "@/lib/templates/default-profile-templates";
import SignupFinaleAnimation from "@/components/features/onboarding/SignupFinaleAnimation";
import { useGlobalAudio } from "@/contexts/GlobalAudioContext";
import { getSiteConfig, SiteConfig } from "@/lib/config/site/dynamic";
import { isBetaKeysEnabled } from "@/lib/config/beta-keys";
import HousePicker from "@/components/home/HousePicker";
import {
  DEFAULT_HOUSE_CHOICE, HouseChoice, PAGE_THEME_FOR_PALETTE,
  parseHouseChoice, readHouseChoice, saveHouseChoice, clearHouseChoice,
} from "@/lib/pixel-homes/house-choice";
import imageCompression from 'browser-image-compression';
import { fetchAuthMe } from "@/hooks/useCurrentUser";
import { csrfFetch } from "@/lib/api/client/csrf-fetch";

interface SignupPageProps {
  betaKey?: string | null;
  betaRequired: boolean;
  siteConfig: SiteConfig;
}

type SignupStep = 'welcome' | 'auth-method' | 'password-setup' | 'seed-phrase' | 'email' | 'guidelines' | 'profile' | 'house' | 'finale';
type AuthMethod = 'password' | 'seedphrase';

// Steps after the account exists. Progress through them is remembered so a
// reload (or a return visit while signed in) resumes instead of restarting.
const RESUMABLE_STEPS: SignupStep[] = ['email', 'guidelines', 'profile', 'house'];
const PROGRESS_KEY = 'ts-signup-progress';

function readSavedStep(username: string): SignupStep | null {
  try {
    const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY) || 'null');
    if (saved?.username !== username) return null;
    // 'template' was this step's name before the house picker
    const step = saved.step === 'template' ? 'house' : saved.step;
    return RESUMABLE_STEPS.includes(step) ? step : null;
  } catch {
    return null;
  }
}

export default function SignupPage({ betaKey: urlBetaKey, betaRequired: isBetaEnabled, siteConfig }: SignupPageProps) {
  const router = useRouter();
  const globalAudio = useGlobalAudio();
  const [currentStep, setCurrentStep] = useState<SignupStep>('welcome');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAuthMethod, setSelectedAuthMethod] = useState<AuthMethod | null>(null);

  // Beta landing page tracking
  const [signupSource, setSignupSource] = useState<string | null>(null);
  const [landingSlug, setLandingSlug] = useState<string | null>(null);
  const [trackingId, setTrackingId] = useState<string | null>(null);

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

  // House step: the house (maybe picked on the homepage demo) and, quietly,
  // the profile page theme, which matches the house unless changed
  const [houseChoice, setHouseChoice] = useState<HouseChoice>(DEFAULT_HOUSE_CHOICE);
  const [pageTheme, setPageTheme] = useState<ProfileTemplateType | null>(null);
  const selectedTemplate = pageTheme ?? PAGE_THEME_FOR_PALETTE[houseChoice.palette];

  // Step 5: Profile Setup (Optional)
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);

  // Community Guidelines Agreement
  const [agreedToGuidelines, setAgreedToGuidelines] = useState(false);

  // Step 5: Complete
  const [accountCreated, setAccountCreated] = useState(false);
  // False until we know whether a signed-in user should resume mid-wizard
  const [resumeChecked, setResumeChecked] = useState(false);

  // Signed in already? Resume at the first step not yet done; if the template
  // is chosen, signup is finished and there's nothing to resume.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const me = await fetchAuthMe();
        const handle = me?.loggedIn ? me.user?.primaryHandle?.split('@')[0] : null;
        if (!alive || !handle) return;
        const template = await fetch('/api/user/profile-template')
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null);
        if (!alive) return;
        if (template?.templateEnabled) {
          router.replace('/');
          return;
        }
        setUsername(handle);
        setAccountCreated(true);
        setCurrentStep(readSavedStep(handle) ?? 'email');
      } catch {
        // Couldn't tell — start from the beginning as before
      } finally {
        if (alive) setResumeChecked(true);
      }
    })();
    return () => { alive = false; };
  }, []); // Runs once on mount

  // Remember progress once the account exists; forget it when signup ends
  useEffect(() => {
    if (!accountCreated || !username) return;
    try {
      if (RESUMABLE_STEPS.includes(currentStep)) {
        localStorage.setItem(PROGRESS_KEY, JSON.stringify({ username, step: currentStep }));
      } else if (currentStep === 'finale') {
        localStorage.removeItem(PROGRESS_KEY);
      }
    } catch {
      // Storage unavailable — resume falls back to the first post-account step
    }
  }, [accountCreated, username, currentStep]);

  useEffect(() => {
    // Auto-populate beta key from URL
    if (urlBetaKey && !betaKey) {
      setBetaKey(urlBetaKey);
    }

    // Extract tracking parameters from URL
    const source = router.query.source as string;
    const landing = router.query.landing as string;
    const tracking = router.query.tracking as string;

    if (source) setSignupSource(source);
    if (landing) setLandingSlug(landing);
    if (tracking) setTrackingId(tracking);
  }, [urlBetaKey, betaKey, router.query]);

  // The house picked on the homepage demo: from the link, else from earlier
  // in this browser session (signup can be reloaded or resumed)
  useEffect(() => {
    if (!router.isReady) return;
    const fromLink = parseHouseChoice(router.query.house, router.query.palette);
    if (fromLink) saveHouseChoice(fromLink);
    const choice = fromLink ?? readHouseChoice();
    if (choice) setHouseChoice(choice);
  }, [router.isReady, router.query.house, router.query.palette]);

  useEffect(() => {
    // Scroll to top when step changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

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

  function handleGuidelinesAgreement() {
    if (!agreedToGuidelines) {
      setError('Please agree to the Terms of Service, Privacy Policy, and Community Guidelines to continue');
      return;
    }
    setError(null);
    setCurrentStep('profile');
  }

  async function handleEmailSetup() {
    if (!email.trim()) {
      // Skip email step
      setCurrentStep('guidelines');
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
        setCurrentStep('guidelines');
      } else {
        const error = await response.json();
        setError(error.error || 'Failed to set email');
      }
    } catch (err) {
      setError('Failed to set email. You can add it later in settings.');
      // Continue to guidelines even if email fails
      setTimeout(() => setCurrentStep('guidelines'), 2000);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleProfilePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const isHEIC = file.type === 'image/heic' || file.type === 'image/heif' ||
                     file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
      const isImage = file.type.startsWith('image/') || isHEIC;

      if (!isImage) {
        setError('Please select an image file');
        return;
      }
      if (file.size > 20 * 1024 * 1024) { // 20MB limit (modern phone cameras)
        setError('Profile photo must be smaller than 20MB');
        return;
      }

      setIsLoading(true);
      try {
        // Compress image (handles HEIC conversion automatically)
        const options = {
          maxSizeMB: 3,          // Target 3MB max
          maxWidthOrHeight: 2400, // High quality for displays
          useWebWorker: true,     // Don't block UI
          fileType: 'image/jpeg'  // Convert to JPEG (handles HEIC conversion)
        };

        const compressedFile = await imageCompression(file, options);
        setProfilePhoto(compressedFile);

        const reader = new FileReader();
        reader.onload = (e) => {
          setProfilePhotoPreview(e.target?.result as string);
        };
        reader.readAsDataURL(compressedFile);
        setError(null);
        setIsLoading(false);
      } catch (compressionError: any) {
        console.error('Image compression error:', compressionError);
        setError('Failed to process image. Please try a different file.');
        setIsLoading(false);
      }
    }
  }

  async function handleHouseSelected() {
    setIsLoading(true);
    setError(null);

    try {
      const houseResponse = await fetch(`/api/home/${encodeURIComponent(username)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ houseTemplate: houseChoice.template, palette: houseChoice.palette }),
        credentials: 'include'
      });
      if (!houseResponse.ok) {
        setError("Couldn't save your house. Please try again.");
        return;
      }

      // The page theme goes last: it's what marks signup as finished
      const templateResponse = await fetch('/api/user/profile-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: selectedTemplate }),
        credentials: 'include'
      });
      if (!templateResponse.ok) {
        const errorData = await templateResponse.json().catch(() => ({}));
        setError(errorData.error || "Couldn't save your page colors. Please try again.");
        return;
      }
      clearHouseChoice();

      // Start the welcome music (only if not already playing)
      if (!globalAudio.state.isPlaying) {
        try {
          await globalAudio.startSignupAudio();
        } catch (error) {
          // Audio failed but don't block signup flow
        }
      }

      // Complete beta landing page tracking if applicable
      if (signupSource === 'beta-landing' && landingSlug && trackingId) {
        try {
          // Get current user ID from session
          const userResponse = await fetch('/api/auth/me');
          if (userResponse.ok) {
            const userData = await userResponse.json();
            if (userData.user?.id) {
              await fetch(`/api/beta-landing-pages/${landingSlug}/complete`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  signupId: trackingId,
                  userId: userData.user.id,
                  betaCode: betaKey
                })
              });
            }
          }
        } catch (error) {
          console.error('Failed to complete landing page tracking:', error);
          // Don't block signup flow for tracking errors
        }
      }

      // Move to finale animation
      setCurrentStep('finale');
    } catch (err) {
      setError("Couldn't save your house. Please try again.");
      console.error('House step error:', err);
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
        const capRes = await csrfFetch('/api/cap/profile', { method: 'POST' });
        if (capRes.ok) formData.append('cap', (await capRes.json()).token);

        const photoResponse = await csrfFetch('/api/profile/upload-photo', {
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
        setTimeout(() => setCurrentStep('house'), 1500);
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
        <title>Create Your Account | {siteConfig.site_name}</title>
      </Head>
      <Layout siteConfig={siteConfig}>
        <div className="max-w-full sm:max-w-2xl mx-auto px-0 sm:px-6 py-6">
          {currentStep !== 'finale' && (
          <div className="thread-module">
          <div className="sm:px-4 sm:pb-2">
          {/* Progress: steps before the current one are done */}
          {(() => {
            const labels = ['Username', 'Backup', 'Email', 'Agreements', 'Profile', 'House', 'Done'];
            const stepIndex: Record<SignupStep, number> = {
              'welcome': 0, 'auth-method': 1, 'password-setup': 1, 'seed-phrase': 1,
              'email': 2, 'guidelines': 3, 'profile': 4, 'house': 5, 'finale': 6,
            };
            const current = stepIndex[currentStep] ?? 0;
            return (
              <div className="mb-6 pb-4 border-b-2 border-dotted border-nb-ink-mid/40">
                <p className="sm:hidden thread-label text-center">
                  Step {current + 1} of {labels.length} · {labels[current]}
                </p>
                <ol className="hidden sm:flex flex-wrap items-center justify-center gap-y-2 text-[11px] font-mono uppercase">
                  {labels.map((label, i) => (
                    <li key={label} className="flex items-center gap-1">
                      {i > 0 && <span aria-hidden="true" className="text-nb-ink-mid px-0.5">·</span>}
                      <span
                        aria-current={i === current ? 'step' : undefined}
                        className={
                          i === current
                            ? 'badge badge--butter font-bold text-nb-ink'
                            : i < current
                              ? 'text-nb-ink'
                              : 'text-nb-ink-mid'
                        }
                      >
                        {i < current ? '✓ ' : ''}{label}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            );
          })()}

          {/* Step 1: Welcome & Username */}
          {currentStep === 'welcome' && !resumeChecked && <div className="min-h-[320px]" aria-busy="true" />}
          {currentStep === 'welcome' && resumeChecked && (
            <div>
              <div className="text-center mb-8">
                <h1 className="thread-headline text-3xl font-bold mb-2">Welcome to {siteConfig.site_name}!</h1>
                <p className="text-nb-ink-mid">
                  Pick a username and a way to sign in.
                </p>
              </div>

              <div className="space-y-6 max-w-md mx-auto">
                <div>
                  <label className="block text-sm font-bold mb-2">Choose Your Username</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-nb-ink-mid">@</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => {
                        const value = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
                        setUsername(value);
                      }}
                      placeholder="alice"
                      className="w-full pl-8 pr-4 py-3 text-lg border-2 border-nb-ink-mid/60 rounded-md bg-white focus:outline-none focus:border-nb-ink-mid"
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
                          <p className="text-green-600 text-sm">✓ @{username} is available</p>
                        )}
                        {usernameAvailable === false && (
                          <p className="text-red-600 text-sm">✗ @{username} is taken</p>
                        )}
                        {usernameAvailable === null && username.length >= 3 && (
                          <p className="text-nb-ink-mid text-sm">Checking availability...</p>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {isBetaEnabled && (
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
                      className="w-full px-4 py-3 text-lg border-2 border-nb-ink-mid/60 rounded-md bg-white focus:outline-none focus:border-nb-ink-mid font-mono"
                      disabled={isLoading}
                    />
                    <p className="text-xs text-nb-ink-mid mt-1">
                      Required during beta. Get one from a friend or contact support.
                    </p>
                  </div>
                )}

                <button
                  onClick={handleCreateAccount}
                  disabled={isLoading || !username || usernameAvailable !== true || (isBetaEnabled && !betaKey.trim())}
                  className="w-full thread-button btn btn--primary btn--lg text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
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
            <div>
              <div className="text-center mb-8">
                <h2 className="thread-headline text-3xl font-bold mb-2">Choose Your Security Method</h2>
                <p className="text-nb-ink-mid">
                  How would you like to secure your @{username} account?
                </p>
              </div>

              <div className="max-w-2xl mx-auto space-y-4">
                {/* Password Option (Recommended) */}
                <div className="border-2 border-nb-ink-mid rounded-cozy p-5 sm:p-6 bg-nb-paper shadow-nb-sm">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <span className="badge badge--butter inline-block text-xs font-bold font-mono">
                        RECOMMENDED
                      </span>
                    </div>
                    <div className="flex-grow">
                      <h3 className="thread-headline text-xl font-bold mb-2">Use a Password</h3>
                      <p className="text-nb-ink mb-4">
                        Sign in with a username and password, the way you&apos;re used to.
                      </p>
                      <ul className="text-sm text-nb-ink-mid space-y-1 mb-4">
                        <li>✓ Easy to remember and use</li>
                        <li>✓ Change your password anytime</li>
                        <li>✓ Recovery phrase generated but hidden</li>
                        <li>✓ A good fit for most people</li>
                      </ul>
                      <button
                        onClick={() => handleAuthMethodSelected('password')}
                        className="w-full thread-button btn btn--primary btn--lg font-bold min-h-[48px]"
                      >
                        Continue with Password →
                      </button>
                    </div>
                  </div>
                </div>

                {/* Seed Phrase Option (Advanced) */}
                <div className="border-2 border-dotted border-nb-ink-mid/60 rounded-cozy p-5 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <span className="badge inline-block text-xs font-bold font-mono">
                        ADVANCED
                      </span>
                    </div>
                    <div className="flex-grow">
                      <h3 className="thread-headline text-xl font-bold mb-2">Passwordless Keypair</h3>
                      <p className="text-nb-ink mb-4">
                        Maximum security with a 12-word recovery phrase. No passwords needed.
                      </p>
                      <ul className="text-sm text-nb-ink-mid space-y-1 mb-4">
                        <li>✓ Most secure option</li>
                        <li>✓ Full control of your identity</li>
                        <li>✓ No password to remember or reset</li>
                        <li><PixelIcon name="warning-box" size={14} className="inline-block align-middle mr-1" />Must safely store recovery phrase</li>
                      </ul>
                      <button
                        onClick={() => handleAuthMethodSelected('seedphrase')}
                        className="w-full thread-button-secondary btn btn--secondary btn--lg font-bold min-h-[48px]"
                      >
                        Continue with Seed Phrase →
                      </button>
                    </div>
                  </div>
                </div>

                <div className="text-center text-sm text-nb-ink-mid mt-6">
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
            <div>
              <div className="text-center mb-8">
                <h2 className="thread-headline text-3xl font-bold mb-2">Create Your Password</h2>
                <p className="text-nb-ink-mid">
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
                      className="w-full px-4 py-3 text-lg border-2 border-nb-ink-mid/60 rounded-md bg-white focus:outline-none focus:border-nb-ink-mid pr-12"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="ts-icon-button absolute right-2 top-1/2 -translate-y-1/2"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <PixelIcon name="eye" size={20} /> : <PixelIcon name="eye-closed" size={20} />}
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
                    className="w-full px-4 py-3 text-lg border-2 border-nb-ink-mid/60 rounded-md bg-white focus:outline-none focus:border-nb-ink-mid"
                    disabled={isLoading}
                  />
                </div>

                {/* Password Requirements */}
                <div className="border-2 border-dotted border-nb-ink-mid/60 rounded-md p-4">
                  <p className="text-sm font-bold text-nb-ink mb-2">Password Requirements:</p>
                  <ul className="text-sm space-y-1">
                    <li className={password.length >= 8 ? "text-nb-ink font-medium" : "text-nb-ink-mid"}>
                      {password.length >= 8 ? "✓" : "○"} At least 8 characters
                    </li>
                    <li className={/[a-z]/.test(password) ? "text-nb-ink font-medium" : "text-nb-ink-mid"}>
                      {/[a-z]/.test(password) ? "✓" : "○"} One lowercase letter
                    </li>
                    <li className={/[A-Z]/.test(password) ? "text-nb-ink font-medium" : "text-nb-ink-mid"}>
                      {/[A-Z]/.test(password) ? "✓" : "○"} One uppercase letter
                    </li>
                    <li className={/[0-9]/.test(password) ? "text-nb-ink font-medium" : "text-nb-ink-mid"}>
                      {/[0-9]/.test(password) ? "✓" : "○"} One number
                    </li>
                  </ul>
                </div>

                <button
                  onClick={handlePasswordSetup}
                  disabled={isLoading || !password || !confirmPassword || passwordErrors.length > 0}
                  className="w-full thread-button btn btn--primary btn--lg text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
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
            <div>
              <div className="text-center mb-8">
                <h2 className="thread-headline text-3xl font-bold mb-2">Secure Your Account</h2>
                <p className="text-nb-ink-mid max-w-lg mx-auto">
                  <strong>Save these 12 words in order!</strong> This is your account recovery phrase. 
                  You&apos;ll need it if you lose access to this device.
                </p>
              </div>

              <div className="max-w-2xl mx-auto">
                <div className="border-2 border-dotted border-nb-ink-mid/60 rounded-cozy p-4 sm:p-6 mb-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {generatedSeedPhrase.split(' ').map((word, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-md border border-nb-ink-mid/50">
                        <span className="text-sm font-bold text-nb-ink-mid min-w-[24px] font-mono">{index + 1}.</span>
                        <span className="font-mono font-medium text-nb-ink">{word}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-2 border-nb-rose bg-nb-paper rounded-md p-4 mb-6">
                  <h3 className="font-bold text-nb-rose-ink mb-2"><PixelIcon name="warning-box" size={16} className="inline-block align-middle mr-1" />Keep these words safe</h3>
                  <ul className="text-nb-ink text-sm space-y-1">
                    <li>• Anyone with these words can access your account</li>
                    <li>• Write them down on paper and store safely</li>
                    <li>• Never share them with anyone</li>
                    <li>• Don&apos;t store them in email, screenshots, or cloud storage</li>
                  </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <button
                    onClick={() => copyToClipboard(generatedSeedPhrase)}
                    className="thread-button-secondary btn btn--secondary flex-1"
                  >
                    <PixelIcon name="clipboard" className="inline-block align-[-3px] mr-1.5" />
                    Copy Words
                  </button>
                  <button
                    onClick={() => downloadSeedPhrase(generatedSeedPhrase)}
                    className="thread-button-secondary btn btn--secondary flex-1"
                  >
                    <PixelIcon name="save" className="inline-block align-[-3px] mr-1.5" />
                    Download Backup
                  </button>
                </div>

                <button
                  onClick={handleSeedPhraseSaved}
                  className="w-full thread-button btn btn--primary btn--lg text-lg font-bold min-h-[48px]"
                >
                  ✓ I&apos;ve Safely Saved My Recovery Phrase
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Email (Optional) */}
          {currentStep === 'email' && (
            <div>
              <div className="text-center mb-8">
                <h2 className="thread-headline text-3xl font-bold mb-2">Add Email (Optional)</h2>
                <p className="text-nb-ink-mid max-w-lg mx-auto">
                  Add your email address for magic link login. This makes it easier to access your account
                  from different devices.
                </p>
              </div>

              <div className="max-w-md mx-auto space-y-6">
                <div className="border-2 border-dotted border-nb-ink-mid/60 rounded-md p-4">
                  <p className="font-bold text-nb-ink mb-2">Why add an email?</p>
                  <ul className="text-nb-ink text-sm space-y-1">
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
                    className="w-full px-4 py-3 text-lg border-2 border-nb-ink-mid/60 rounded-md bg-white focus:outline-none focus:border-nb-ink-mid"
                    disabled={isLoading}
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleEmailSetup}
                    disabled={isLoading}
                    className="w-full thread-button btn btn--primary btn--lg font-bold disabled:opacity-50 min-h-[48px]"
                  >
                    {isLoading ? "Setting up..." : email.trim() ? "Add Email & Continue" : "Skip Email Setup"}
                  </button>
                  
                  {email.trim() && (
                    <button
                      onClick={() => setCurrentStep('guidelines')}
                      className="ts-bare text-sm underline self-center"
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

          {/* House step */}
          {currentStep === 'house' && (
            <div>
              <div className="text-center mb-6">
                <h2 className="thread-headline text-3xl font-bold mb-2">Pick your house</h2>
                <p className="text-nb-ink-mid max-w-lg mx-auto">
                  This is the house your neighbors see on the street. You can repaint it any time.
                </p>
              </div>

              <div className="max-w-xl mx-auto mb-6">
                <HousePicker value={houseChoice} onChange={setHouseChoice} />
              </div>

              <div className="max-w-md mx-auto">
                <button
                  onClick={handleHouseSelected}
                  disabled={isLoading}
                  className="w-full thread-button btn btn--primary btn--lg text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
                >
                  {isLoading ? 'Moving in...' : 'Move in'}
                </button>

                {/* Profile page colors: quiet, and they follow the house unless changed */}
                <details className="mt-4 text-sm text-nb-ink">
                  <summary className="cursor-pointer text-center text-nb-ink-mid">
                    Your page will use {DEFAULT_PROFILE_TEMPLATE_INFO[selectedTemplate].name} colors{pageTheme ? '' : ' to match'}
                  </summary>
                  <fieldset className="mt-3">
                    <legend className="sr-only">Page colors</legend>
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
                      {(['classic-linen', 'charcoal-nights', 'pixel-petals', 'retro-social', 'abstract-art'] as ProfileTemplateType[]).map((t) => (
                        <label key={t} className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="page-theme"
                            checked={selectedTemplate === t}
                            onChange={() => setPageTheme(t)}
                            className="accent-nb-ink"
                          />
                          {DEFAULT_PROFILE_TEMPLATE_INFO[t].name}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </details>

                {error && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    {error}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Community Guidelines Agreement */}
          {currentStep === 'guidelines' && (
            <div>
              <div className="text-center mb-8">
                <h2 className="thread-headline text-3xl font-bold mb-2">Legal & Community Agreements</h2>
                <p className="text-nb-ink-mid max-w-lg mx-auto">
                  Before joining our community, please review and agree to our Terms of Service,
                  Privacy Policy, and Community Guidelines.
                </p>
              </div>

              {/* TODO: Make community guidelines content configurable via admin portal */}
              <div className="border-2 border-dotted border-nb-ink-mid/60 rounded-cozy p-5 mb-6 max-h-64 overflow-y-auto">
                <h3 className="font-bold text-lg mb-3 text-nb-ink">House rules, short version:</h3>
                <div className="space-y-2 text-sm text-nb-ink">
                  <p>Be kind, post your own stuff, no harassment or hate, keep it all-ages.</p>
                </div>

                <h3 className="font-bold text-lg mt-4 mb-3 text-nb-ink">In practice:</h3>
                <div className="space-y-1 text-sm text-nb-ink">
                  <div>• No harassment, bullying, or hate speech</div>
                  <div>• Share original content and respect others&apos; work</div>
                  <div>• Keep content appropriate for all ages</div>
                  <div>• Report issues to help maintain a safe space</div>
                </div>

                <div className="mt-4 text-center">
                  <a
                    href="/community-guidelines"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-sm"
                  >
                    Read Full Guidelines →
                  </a>
                </div>
              </div>

              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToGuidelines}
                    onChange={(e) => setAgreedToGuidelines(e.target.checked)}
                    className="mt-1 w-5 h-5 accent-nb-ink"
                  />
                  <span className="text-sm text-nb-ink">
                    I have read and agree to the{' '}
                    <a
                      href="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      Terms of Service
                    </a>
                    ,{' '}
                    <a
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      Privacy Policy
                    </a>
                    , and{' '}
                    <a
                      href="/community-guidelines"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      Community Guidelines
                    </a>
                  </span>
                </label>

                <button
                  onClick={handleGuidelinesAgreement}
                  disabled={!agreedToGuidelines}
                  className="w-full thread-button btn btn--primary btn--lg font-bold disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
                >
                  {agreedToGuidelines ? "Continue to Profile Setup" : "Please agree to all terms to continue"}
                </button>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    {error}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Profile Setup (Optional) */}
          {currentStep === 'profile' && (
            <div>
              <div className="text-center mb-8">
                <h2 className="thread-headline text-3xl font-bold mb-2">Set up your profile</h2>
                <p className="text-nb-ink-mid">
                  Add a profile photo and bio to help others recognize you (optional)
                </p>
              </div>

              <div className="space-y-6 max-w-md mx-auto">
                <div>
                  <label className="block text-sm font-bold mb-3 text-nb-ink">Profile Photo</label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full border-2 border-nb-ink-mid bg-thread-cream flex items-center justify-center overflow-hidden">
                      {profilePhotoPreview ? (
                        <img src={profilePhotoPreview} alt="Profile preview" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-nb-ink-mid"><PixelIcon name="user" size={32} /></span>
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
                        className="thread-button-secondary btn btn--secondary cursor-pointer inline-block"
                      >
                        Choose Photo
                      </label>
                      <p className="text-xs text-nb-ink-mid mt-1">JPG, PNG up to 20MB</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 text-nb-ink">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell others about yourself..."
                    className="w-full px-4 py-3 text-lg border-2 border-nb-ink-mid/60 rounded-md bg-white focus:outline-none focus:border-nb-ink-mid resize-none"
                    disabled={isLoading}
                    rows={3}
                    maxLength={200}
                  />
                  <p className="text-xs text-nb-ink-mid mt-1">{bio.length}/200 characters</p>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleProfileSetup}
                    disabled={isLoading || (!profilePhoto && !bio.trim())}
                    className="w-full thread-button btn btn--primary btn--lg font-bold disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
                  >
                    {isLoading ? "Saving..." : "Save Profile & Continue"}
                  </button>
                  
                  <button
                    onClick={() => setCurrentStep('house')}
                    disabled={isLoading}
                    className="ts-bare text-sm underline self-center disabled:opacity-50"
                  >
                    Skip for now
                  </button>
                </div>

                {profileSaved && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                    <strong>✓ Profile saved.</strong>
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

          </div>
          </div>
          )}

          {/* Finale Animation */}
          {currentStep === 'finale' && (
            <SignupFinaleAnimation username={username} />
          )}
        </div>
      </Layout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<SignupPageProps> = async ({ query }) => {
  // Auto-populate beta key from URL parameter
  const betaKey = typeof query.beta === 'string' ? query.beta : null;
  const siteConfig = await getSiteConfig();

  return {
    props: {
      betaKey,
      betaRequired: isBetaKeysEnabled(),
      siteConfig,
    },
  };
};