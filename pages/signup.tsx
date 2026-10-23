import React, { useState, useEffect, useRef } from "react";
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import Layout from "@/components/ui/layout/Layout";
import { createNewIdentityWithSeedPhrase, createNewIdentityWithPassword } from "@/lib/api/did/did-client";
import { PixelIcon } from '@/components/ui/PixelIcon';
import PasswordRules from '@/components/features/auth/PasswordRules';
import { validatePasswordStrength } from "@/lib/auth/password";
import { validateUsername } from "@/lib/domain/validation/username";
import { DEFAULT_PROFILE_TEMPLATE_INFO, ProfileTemplateType } from "@/lib/templates/default-profile-templates";
import { THEMES } from '@/lib/templates/appearance';
import ThemeSwatch from '@/components/features/profile/ThemeSwatch';
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
import { avatarUploadsAsIs } from '@/lib/media/media-types';
import { fetchAuthMe } from "@/hooks/useCurrentUser";
import { unlockAudio } from "@/lib/audio/context";
import { csrfFetch } from "@/lib/api/client/csrf-fetch";
import { requestCapability } from "@/lib/api/client/capability";
import Button from "@/components/ui/Button";
import { buttonClasses } from "@/components/ui/ButtonLink";
import PageMeta from "@/components/ui/layout/PageMeta";

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

// Signup's own words, in one place so they're easy to read through and change
const COPY = {
  pageTitle: 'Make an account',
  welcomeHeading: 'Make an account',
  welcomeIntro: 'Pick a username and a password. Your house comes after that.',
  welcomeIntroWords: 'Pick a username. Your house comes after that.',
  usernameLabel: 'Username',
  usernameEmpty: 'Pick a username first.',
  checking: 'Checking if it\'s free...',
  passwordLabel: 'Password',
  passwordWeak: 'Your password needs everything on the list below.',
  confirmLabel: 'Password again',
  confirmEmpty: 'Type your password again here.',
  mismatch: 'The two passwords don\'t match.',
  betaLabel: 'Beta invite code',
  betaEmpty: 'You need an invite code while the site is in beta.',
  createButton: 'Create account',
  creating: 'Making your account...',
  createFailed: 'I couldn\'t make your account. Try again?',
  otherWays: 'Other ways to sign in',
  seedHeading: 'Sign in with 12 words instead',
  seedBody: 'Instead of a password, you get 12 words to sign in with. Write them down somewhere safe. If you lose them and haven\'t added an email, I can\'t get you back in. This browser remembers them too, so only do this on your own device.',
  seedLater: 'You can add a password later in Settings.',
  seedButton: 'Make my 12 words',
  usePassword: 'Use a password instead',

  wordsHeading: 'Write these down',
  wordsIntro: 'These 12 words are how you sign in. Keep them in order, somewhere only you can see.',
  wordsSafeHeading: 'Keep these words safe',
  wordsSafe: [
    'Anyone with these words can get into your account.',
    'Paper is best.',
    'Don\'t share them with anyone, me included.',
    'Don\'t put them in email, screenshots or cloud storage.',
  ],
  copyWords: 'Copy words',
  copied: 'Copied',
  copiedStatus: 'Copied the 12 words.',
  copyFailed: 'That didn\'t copy. You can select the words and copy them yourself.',
  downloadWords: 'Download as a file',
  wordsSaved: 'I wrote them down',

  emailHeading: 'Add an email?',
  emailIntroPassword: 'It\'s optional, but it helps. I\'ll send you a link to confirm it. After that you can sign in with an emailed link from any device, and reset your password if you forget it.',
  emailIntroWords: 'It\'s optional, but it helps. I\'ll send you a link to confirm it. After that you can sign in with an emailed link from any device, even if you lose your 12 words.',
  emailNoSpam: 'I don\'t send newsletters or ads.',
  emailLabel: 'Email',
  emailAdd: 'Add email',
  emailSkip: 'Skip',
  emailAdding: 'Adding...',
  skipForNow: 'Skip for now',
  emailFailed: 'I couldn\'t save your email. You can add it later in Settings.',

  rulesHeading: 'Before you move in',
  rulesIntro: 'Here are the house rules, short version. The full guidelines, terms and privacy policy are linked below if you want the long one.',
  rulesInPractice: [
    'No harassment, bullying or hate speech',
    'Share your own stuff and respect other people\'s work',
    'Keep it all-ages',
    'If something\'s wrong, report it and I\'ll take a look',
  ],
  agreeLabel: 'I agree to the community guidelines, terms of service and privacy policy',
  agreeFirst: 'Check the box first, then you can keep going.',
  continue: 'Continue',

  profileHeading: 'Set up your profile',
  profileIntro: 'A photo and a few words about you. Both are optional, and you can change them any time.',
  photoLabel: 'Photo',
  choosePhoto: 'Choose a photo',
  bioLabel: 'Bio',
  saveProfile: 'Save and continue',
  saving: 'Saving...',
  profileSaved: 'Profile saved.',
  profileRetry: 'You can try again, or skip this and do it later in Settings.',
  notAnImage: 'That isn\'t an image. Try a JPEG, PNG, WebP or HEIC.',
  photoTooBig: 'That photo is over 20MB. Try a smaller one?',
  photoUnreadable: 'I couldn\'t read that image. Try a different one?',
  photoFailed: 'Your photo didn\'t upload.',
  bioFailed: 'Your bio didn\'t save.',
  profileFailed: 'Your profile didn\'t save.',

  newTab: '(opens in a new tab)',
};

// The site's focus ring (site-theme :focus-visible), on a label whose visually
// hidden input has focus
const PEER_FOCUS_RING = 'peer-focus-visible:outline-dashed peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[color:var(--ha-lav-ink,#5a4fb3)]';
// Inputs keep the site's own focus look (darker border and a shadow)
const INPUT = 'w-full px-4 py-3 text-lg border-2 border-nb-ink-mid/60 rounded-md bg-white aria-[invalid=true]:border-red-600';
// Step headings take focus on a step change (so a screen reader announces
// the step) but aren't something you Tab to, so no ring
const HEADING = 'thread-headline text-3xl font-bold mb-2 outline-none!';
// Primary buttons use aria-disabled, not disabled: they stay in the Tab order
// and pressing one says what's missing
const PRIMARY = 'w-full font-bold min-h-[48px] aria-disabled:opacity-50 aria-disabled:cursor-not-allowed';

type FieldMsg = { tone: 'ok' | 'error' | 'quiet'; text: string };

/** The line under a field. Always rendered, so changes to it are announced. */
function FieldStatus({ id, msg }: { id: string; msg: FieldMsg | null }) {
  const color = msg?.tone === 'ok' ? 'text-green-600' : msg?.tone === 'error' ? 'text-red-600' : 'text-nb-ink-mid';
  return (
    <div id={id} role="status" className={msg ? 'mt-2' : undefined}>
      {msg && (
        <p className={`${color} text-sm flex items-center gap-1`}>
          {msg.tone !== 'quiet' && <PixelIcon name={msg.tone === 'ok' ? 'check' : 'close'} size={24} className="shrink-0 -my-1 -ml-1" />}
          {msg.text}
        </p>
      )}
    </div>
  );
}

/** A step's error, read out as soon as it appears */
function ErrorAlert({ error }: { error: string | null }) {
  return (
    <div role="alert">
      {error && <div className="p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>}
    </div>
  );
}

function NewTabLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="underline">
      {children}<span className="sr-only"> {COPY.newTab}</span>
    </a>
  );
}

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
  const [selectedAuthMethod, setSelectedAuthMethod] = useState<AuthMethod>('password');
  // Set by the first press of "Create account": from then on empty fields say so
  const [attempted, setAttempted] = useState(false);
  const [copied, setCopied] = useState(false);

  // Focus targets: each step's heading, and the fields a submit sends you back to
  const headingRef = useRef<HTMLHeadingElement>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
  const betaKeyRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const seedPanelRef = useRef<HTMLHeadingElement>(null);
  const agreeRef = useRef<HTMLInputElement>(null);

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
  
  // Step 3: Seed Phrase
  const [generatedSeedPhrase, setGeneratedSeedPhrase] = useState<string>('');

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
        // The theme is signup's last save, so a page with a look of its own
        // has finished signup
        if (template?.hasCustomCss || template?.layout === 'html') {
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

  // On every step change: back to the top, and focus on the new step's
  // heading so a screen reader says where you are. Not on first load.
  const firstStep = useRef(true);
  useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    headingRef.current?.focus({ preventScroll: true });
  }, [currentStep]);

  // Returns what it found, so a submit can wait for a check still in flight
  async function checkUsernameAvailability(username: string): Promise<boolean | null> {
    // First validate the username format
    const validation = validateUsername(username);
    if (!validation.ok) {
      setUsernameAvailable(null);
      return null;
    }

    try {
      const response = await fetch(`/api/account/check-handle?handle=${encodeURIComponent(username)}`);
      const data = await response.json();
      setUsernameAvailable(data.available);
      return data.available;
    } catch (error) {
      console.error('Error checking username:', error);
      setUsernameAvailable(null);
      return null;
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

  // Username, then a password or the 12 words, on one form. This is where
  // the account is made.
  async function handleCreateAccount() {
    if (isLoading) return;
    setAttempted(true);
    setError(null);

    const name = username.trim();
    if (!name || !validateUsername(name).ok) {
      usernameRef.current?.focus();
      return;
    }
    const available = usernameAvailable ?? await checkUsernameAvailability(name);
    if (available === false) {
      usernameRef.current?.focus();
      return;
    }
    if (isBetaEnabled && !betaKey.trim()) {
      betaKeyRef.current?.focus();
      return;
    }

    if (selectedAuthMethod === 'password') {
      if (!validatePasswordStrength(password).valid) {
        passwordRef.current?.focus();
        return;
      }
      if (password !== confirmPassword) {
        confirmRef.current?.focus();
        return;
      }
    }

    setIsLoading(true);
    try {
      if (selectedAuthMethod === 'password') {
        await createNewIdentityWithPassword(name, password, betaKey || undefined);
        setAccountCreated(true);
        setCurrentStep('email');
      } else {
        const result = await createNewIdentityWithSeedPhrase(name, betaKey || undefined);
        setGeneratedSeedPhrase(result.mnemonic);
        setAccountCreated(true);
        setCurrentStep('seed-phrase');
      }
    } catch (e: unknown) {
      setError((e as Error).message || COPY.createFailed);
    } finally {
      setIsLoading(false);
    }
  }

  function switchAuthMethod(method: AuthMethod) {
    setSelectedAuthMethod(method);
    setError(null);
    // Land on what replaced the button that was just pressed
    setTimeout(() => {
      if (method === 'seedphrase') seedPanelRef.current?.focus();
      else passwordRef.current?.focus();
    }, 0);
  }

  async function handleSeedPhraseSaved() {
    setCurrentStep('email');
  }

  function handleGuidelinesAgreement() {
    if (!agreedToGuidelines) {
      setError(COPY.agreeFirst);
      agreeRef.current?.focus();
      return;
    }
    setError(null);
    setCurrentStep('profile');
  }

  async function handleEmailSetup() {
    if (isLoading) return;
    if (!email.trim()) {
      // Skip email step
      setCurrentStep('guidelines');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await csrfFetch('/api/user/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });

      if (response.ok) {
        setCurrentStep('guidelines');
      } else {
        const error = await response.json();
        setError(error.error || COPY.emailFailed);
      }
    } catch (err) {
      setError(COPY.emailFailed);
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
        setError(COPY.notAnImage);
        return;
      }
      if (file.size > 20 * 1024 * 1024) { // 20MB limit (modern phone cameras)
        setError(COPY.photoTooBig);
        return;
      }

      setIsLoading(true);
      try {
        // PNG and WebP go up as they are; the server keeps them as PNG
        // (transparency, pixel art) and makes the avatar sizes itself. Photos
        // (JPEG, HEIC) and anything else are compressed to JPEG first.
        const options = {
          maxSizeMB: 3,          // Target 3MB max
          maxWidthOrHeight: 2400, // High quality for displays
          useWebWorker: true,     // Don't block UI
          fileType: 'image/jpeg'  // Convert to JPEG (handles HEIC conversion)
        };

        const compressedFile = avatarUploadsAsIs(file) ? file : await imageCompression(file, options);
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
        setError(COPY.photoUnreadable);
        setIsLoading(false);
      }
    }
  }

  async function handleHouseSelected() {
    // Inside the click itself, before any await: iPhones only let the
    // welcome music start from here (lib/audio/context.ts)
    unlockAudio();
    setIsLoading(true);
    setError(null);

    try {
      const houseResponse = await csrfFetch(`/api/home/${encodeURIComponent(username)}`, {
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
      const templateResponse = await csrfFetch('/api/user/profile-template', {
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

      // Start the welcome music (only if not already playing). Not awaited:
      // the song and its sounds load while the finale runs
      if (!globalAudio.state.isPlaying) {
        globalAudio.startSignupAudio().catch(() => {
          // Audio failed but don't block signup flow
        });
      }

      // Complete beta landing page tracking if applicable
      if (signupSource === 'beta-landing' && landingSlug && trackingId) {
        try {
          // Get current user ID from session
          const userResponse = await fetch('/api/auth/me');
          if (userResponse.ok) {
            const userData = await userResponse.json();
            if (userData.user?.id) {
              await csrfFetch(`/api/beta-landing-pages/${landingSlug}/complete`, {
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
    if (isLoading) return;
    // Nothing to save: same as skipping
    if (!profilePhoto && !bio.trim()) {
      setCurrentStep('house');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      let profileUpdated = false;
      
      // Upload profile photo if selected
      if (profilePhoto) {
        const formData = new FormData();
        formData.append('photo', profilePhoto);
        formData.append('cap', await requestCapability('profile'));

        const photoResponse = await csrfFetch('/api/profile/upload-photo', {
          method: 'POST',
          body: formData,
          credentials: 'include' // Ensure cookies are sent
        });
        
        if (!photoResponse.ok) {
          const errorData = await photoResponse.json().catch(() => ({}));
          throw new Error(errorData.error || COPY.photoFailed);
        }
        profileUpdated = true;
      }

      // Update bio if provided
      if (bio.trim()) {
        const bioResponse = await csrfFetch('/api/user/bio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bio: bio.trim() }),
          credentials: 'include' // Ensure cookies are sent
        });
        
        if (!bioResponse.ok) {
          const errorData = await bioResponse.json().catch(() => ({}));
          throw new Error(errorData.error || COPY.bioFailed);
        }
        profileUpdated = true;
      }

      if (profileUpdated) {
        setProfileSaved(true);
        setTimeout(() => setCurrentStep('house'), 1500);
      }
    } catch (err) {
      console.error('Profile setup error:', err);
      setError((err as Error).message || COPY.profileFailed);
      // Don't automatically proceed on error - let user retry or skip manually
    } finally {
      setIsLoading(false);
    }
  }


  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      },
      () => setError(COPY.copyFailed),
    );
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

  // What the first form says under each field, live as you type
  const usernameCheck = username ? validateUsername(username) : null;
  const usernameMsg: FieldMsg | null =
    !usernameCheck ? (attempted ? { tone: 'error', text: COPY.usernameEmpty } : null)
    : !usernameCheck.ok ? { tone: 'error', text: usernameCheck.message || COPY.usernameEmpty }
    : usernameAvailable === true ? { tone: 'ok', text: `@${username} is available` }
    : usernameAvailable === false ? { tone: 'error', text: `@${username} is taken` }
    : username.length >= 3 ? { tone: 'quiet', text: COPY.checking }
    : null;
  const passwordOk = validatePasswordStrength(password).valid;
  const passwordMsg: FieldMsg | null = attempted && !passwordOk ? { tone: 'error', text: COPY.passwordWeak } : null;
  const confirmMsg: FieldMsg | null =
    attempted && !confirmPassword ? { tone: 'error', text: COPY.confirmEmpty }
    : confirmPassword && (attempted || confirmPassword.length >= password.length) && confirmPassword !== password
      ? { tone: 'error', text: COPY.mismatch }
      : null;
  const betaMsg: FieldMsg | null = attempted && isBetaEnabled && !betaKey.trim() ? { tone: 'error', text: COPY.betaEmpty } : null;
  const readyToCreate =
    !!usernameCheck?.ok && usernameAvailable !== false && (!isBetaEnabled || !!betaKey.trim()) &&
    (selectedAuthMethod !== 'password' || (passwordOk && password === confirmPassword));

  return (
    <>
      <PageMeta title={COPY.pageTitle} description="Move in: pick a pixel house, make a page that looks however you want, and join the street." path="/signup" />
      <Layout siteConfig={siteConfig}>
        {/* The house step is wider on a big screen: preview and choices side by side */}
        <div className={`max-w-full sm:max-w-2xl ${currentStep === 'house' ? 'lg:max-w-4xl' : ''} mx-auto px-0 sm:px-6 py-6`}>
          {currentStep !== 'finale' && (
          <div className="thread-module">
          <div className="sm:px-4 sm:pb-2">
          {/* Progress: steps before the current one are done. The words step
              is only there for people who chose the 12 words. */}
          {(() => {
            const words = selectedAuthMethod === 'seedphrase';
            const steps: { label: string; covers: SignupStep[] }[] = [
              { label: 'Account', covers: ['welcome', 'auth-method', 'password-setup'] },
              ...(words ? [{ label: 'Words', covers: ['seed-phrase'] as SignupStep[] }] : []),
              { label: 'Email', covers: ['email'] },
              { label: 'Rules', covers: ['guidelines'] },
              { label: 'Profile', covers: ['profile'] },
              { label: 'House', covers: ['house', 'finale'] },
            ];
            const current = Math.max(0, steps.findIndex((s) => s.covers.includes(currentStep)));
            return (
              <div className="mb-6 pb-4 border-b-2 border-dotted border-nb-ink-mid/40">
                <p className="sm:hidden thread-label text-center">
                  Step {current + 1} of {steps.length} · {steps[current].label}
                </p>
                <ol className="hidden sm:flex flex-wrap items-center justify-center gap-y-2 text-[11px] font-mono uppercase">
                  {steps.map(({ label }, i) => (
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
                        {i < current && <PixelIcon name="check" size={12} className="inline-block align-[-1px] mr-1" />}{label}
                        {i < current && <span className="sr-only"> (done)</span>}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            );
          })()}

          {/* Account: username, then a password or the 12 words */}
          {currentStep === 'welcome' && !resumeChecked && <div className="min-h-[320px]" aria-busy="true" />}
          {currentStep === 'welcome' && resumeChecked && (
            <form onSubmit={(e) => { e.preventDefault(); handleCreateAccount(); }} noValidate>
              <div className="text-center mb-8">
                <h1 ref={headingRef} tabIndex={-1} className={HEADING}>{COPY.welcomeHeading}</h1>
                <p className="text-nb-ink-mid">{selectedAuthMethod === 'password' ? COPY.welcomeIntro : COPY.welcomeIntroWords}</p>
              </div>

              <div className="space-y-6 max-w-md mx-auto">
                <div>
                  <label htmlFor="signup-username" className="block text-sm font-bold mb-2">{COPY.usernameLabel}</label>
                  <div className="relative">
                    <span aria-hidden="true" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-nb-ink-mid">@</span>
                    <input
                      ref={usernameRef}
                      id="signup-username"
                      name="username"
                      type="text"
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      value={username}
                      onChange={(e) => {
                        const value = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
                        setUsername(value);
                      }}
                      placeholder="alice"
                      aria-invalid={usernameMsg?.tone === 'error'}
                      aria-describedby="signup-username-status"
                      className={INPUT}
                      // Inline: the site's phone input padding would put the text under the @ otherwise
                      style={{ paddingLeft: '2rem' }}
                      readOnly={isLoading}
                      maxLength={20}
                    />
                  </div>
                  <FieldStatus id="signup-username-status" msg={usernameMsg} />
                </div>

                {isBetaEnabled && (
                  <div>
                    <label htmlFor="signup-beta-key" className="block text-sm font-bold mb-2">
                      {COPY.betaLabel}
                      {urlBetaKey && <span className="text-green-600 ml-1">(Auto-filled)</span>}
                    </label>
                    <input
                      ref={betaKeyRef}
                      id="signup-beta-key"
                      name="beta-key"
                      type="text"
                      autoComplete="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      value={betaKey}
                      onChange={(e) => setBetaKey(e.target.value.toUpperCase())}
                      placeholder="BETA-XXXX-XXXX-XXXX"
                      aria-invalid={!!betaMsg}
                      aria-describedby="signup-beta-hint signup-beta-status"
                      className={`${INPUT} font-mono`}
                      readOnly={isLoading}
                    />
                    <p id="signup-beta-hint" className="text-xs text-nb-ink-mid mt-1">
                      Required during beta. Get one from a friend or contact support.
                    </p>
                    <FieldStatus id="signup-beta-status" msg={betaMsg} />
                  </div>
                )}

                {selectedAuthMethod === 'password' ? (
                  <>
                    <div>
                      <label htmlFor="signup-password" className="block text-sm font-bold mb-2">{COPY.passwordLabel}</label>
                      <div className="relative">
                        <input
                          ref={passwordRef}
                          id="signup-password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          aria-invalid={!!passwordMsg}
                          aria-describedby="signup-password-status signup-password-rules"
                          className={INPUT}
                          // Inline: the site's phone input padding would run the text under the eye button otherwise
                          style={{ paddingRight: '3rem' }}
                          readOnly={isLoading}
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
                      <FieldStatus id="signup-password-status" msg={passwordMsg} />
                    </div>

                    <div>
                      <label htmlFor="signup-password-confirm" className="block text-sm font-bold mb-2">{COPY.confirmLabel}</label>
                      <input
                        ref={confirmRef}
                        id="signup-password-confirm"
                        name="password-confirm"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        aria-invalid={!!confirmMsg}
                        aria-describedby="signup-password-confirm-status"
                        className={INPUT}
                        readOnly={isLoading}
                      />
                      <FieldStatus id="signup-password-confirm-status" msg={confirmMsg} />
                    </div>

                    <div id="signup-password-rules">
                      <PasswordRules password={password} className="p-4" />
                    </div>
                  </>
                ) : (
                  <section aria-labelledby="signup-seed-heading" className="border-2 border-dotted border-nb-ink-mid/60 rounded-md p-4">
                    <h2 id="signup-seed-heading" ref={seedPanelRef} tabIndex={-1} className="font-bold text-nb-ink mb-2 outline-none!">
                      {COPY.seedHeading}
                    </h2>
                    <p className="text-sm text-nb-ink mb-2">{COPY.seedBody}</p>
                    <p className="text-sm text-nb-ink-mid">{COPY.seedLater}</p>
                  </section>
                )}

                <ErrorAlert error={error} />

                <Button type="submit" size="lg" aria-disabled={isLoading || !readyToCreate} className={PRIMARY}>
                  {isLoading ? COPY.creating : selectedAuthMethod === 'password' ? COPY.createButton : COPY.seedButton}
                </Button>

                <p className="text-center">
                  <button
                    type="button"
                    onClick={() => switchAuthMethod(selectedAuthMethod === 'password' ? 'seedphrase' : 'password')}
                    className="ts-bare text-sm underline text-nb-ink-mid"
                  >
                    {selectedAuthMethod === 'password' ? COPY.otherWays : COPY.usePassword}
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* The 12 words, for people who chose them instead of a password */}
          {currentStep === 'seed-phrase' && generatedSeedPhrase && (
            <form onSubmit={(e) => { e.preventDefault(); handleSeedPhraseSaved(); }}>
              <div className="text-center mb-8">
                <h1 ref={headingRef} tabIndex={-1} className={HEADING}>{COPY.wordsHeading}</h1>
                <p className="text-nb-ink-mid max-w-lg mx-auto">{COPY.wordsIntro}</p>
              </div>

              <div className="max-w-2xl mx-auto">
                <div className="border-2 border-dotted border-nb-ink-mid/60 rounded-cozy p-4 sm:p-6 mb-6">
                  <ol className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {generatedSeedPhrase.split(' ').map((word, index) => (
                      <li key={index} className="flex items-center gap-3 p-3 bg-white rounded-md border border-nb-ink-mid/50">
                        <span className="text-sm font-bold text-nb-ink-mid min-w-[24px] font-mono">{index + 1}.</span>
                        <span className="font-mono font-medium text-nb-ink">{word}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="border-2 border-nb-rose bg-nb-paper rounded-md p-4 mb-6">
                  <h2 className="font-bold text-nb-rose-ink mb-2"><PixelIcon name="warning-box" size={16} className="inline-block align-middle mr-1" />{COPY.wordsSafeHeading}</h2>
                  <ul className="text-nb-ink text-sm space-y-1 list-disc pl-5">
                    {COPY.wordsSafe.map((line) => <li key={line}>{line}</li>)}
                  </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <Button variant="secondary" onClick={() => copyToClipboard(generatedSeedPhrase)} className="flex-1">
                    <PixelIcon name={copied ? 'check' : 'clipboard'} className="inline-block align-[-3px] mr-1.5" />
                    {copied ? COPY.copied : COPY.copyWords}
                  </Button>
                  <Button variant="secondary" onClick={() => downloadSeedPhrase(generatedSeedPhrase)} className="flex-1">
                    <PixelIcon name="save" className="inline-block align-[-3px] mr-1.5" />
                    {COPY.downloadWords}
                  </Button>
                </div>
                <p role="status" className="sr-only">{copied ? COPY.copiedStatus : ''}</p>

                <ErrorAlert error={error} />

                <Button type="submit" size="lg" className={PRIMARY}>
                  <PixelIcon name="check" className="inline-block align-[-3px] mr-1.5" />{COPY.wordsSaved}
                </Button>
              </div>
            </form>
          )}

          {/* Email (optional) */}
          {currentStep === 'email' && (
            <form onSubmit={(e) => { e.preventDefault(); handleEmailSetup(); }}>
              <div className="text-center mb-8">
                <h1 ref={headingRef} tabIndex={-1} className={HEADING}>{COPY.emailHeading}</h1>
                <p className="text-nb-ink-mid max-w-lg mx-auto">
                  {selectedAuthMethod === 'seedphrase' ? COPY.emailIntroWords : COPY.emailIntroPassword} {COPY.emailNoSpam}
                </p>
              </div>

              <div className="max-w-md mx-auto space-y-6">
                <div>
                  <label htmlFor="signup-email" className="block text-sm font-bold mb-2">{COPY.emailLabel}</label>
                  <input
                    id="signup-email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alice@example.com"
                    className={INPUT}
                    readOnly={isLoading}
                  />
                </div>

                <ErrorAlert error={error} />

                <div className="flex flex-col gap-3">
                  <Button type="submit" size="lg" aria-disabled={isLoading} className={PRIMARY}>
                    {isLoading ? COPY.emailAdding : email.trim() ? COPY.emailAdd : COPY.emailSkip}
                  </Button>

                  {email.trim() && (
                    <button
                      type="button"
                      onClick={() => setCurrentStep('guidelines')}
                      className="ts-bare text-sm underline self-center"
                    >
                      {COPY.skipForNow}
                    </button>
                  )}
                </div>
              </div>
            </form>
          )}

          {/* House step */}
          {currentStep === 'house' && (
            <form onSubmit={(e) => { e.preventDefault(); if (!isLoading) handleHouseSelected(); }}>
              <div className="text-center mb-6">
                <h1 ref={headingRef} tabIndex={-1} className={HEADING}>Pick your house</h1>
                <p className="text-nb-ink-mid max-w-lg mx-auto">
                  This is the house your neighbors see on the street. You can repaint it any time.
                </p>
              </div>

              <div className="max-w-xl lg:max-w-none mx-auto mb-6">
                <HousePicker value={houseChoice} onChange={setHouseChoice} />
              </div>

              <div className="max-w-md mx-auto">
                {/* Profile page colors: quiet, and they follow the house unless
                    changed. Before "Move in", so it isn't found too late. */}
                <details className="mb-4 text-sm text-nb-ink">
                  <summary className="cursor-pointer text-center text-nb-ink-mid">
                    Your page: {DEFAULT_PROFILE_TEMPLATE_INFO[selectedTemplate].name}. <span className="underline">Change</span>
                  </summary>
                  <fieldset className="mt-3">
                    <legend className="sr-only">Page colors</legend>
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
                      {THEMES.map((t) => (
                        <label key={t.id} className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="page-theme"
                            checked={selectedTemplate === t.id}
                            onChange={() => setPageTheme(t.id)}
                            className="accent-nb-ink"
                          />
                          <ThemeSwatch vars={t.vars} name={t.name} compact />
                          {t.name}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </details>

                <ErrorAlert error={error} />

                <Button type="submit" size="lg" aria-disabled={isLoading} className={PRIMARY}>
                  {isLoading ? 'Moving in...' : 'Move in'}
                </Button>
              </div>
            </form>
          )}

          {/* House rules */}
          {currentStep === 'guidelines' && (
            <form onSubmit={(e) => { e.preventDefault(); handleGuidelinesAgreement(); }}>
              <div className="text-center mb-8">
                <h1 ref={headingRef} tabIndex={-1} className={HEADING}>{COPY.rulesHeading}</h1>
                <p className="text-nb-ink-mid max-w-lg mx-auto">{COPY.rulesIntro}</p>
              </div>

              {/* TODO: Make community guidelines content configurable via admin portal */}
              <div className="border-2 border-dotted border-nb-ink-mid/60 rounded-cozy p-5 mb-6">
                <h2 className="font-bold text-lg mb-3 text-nb-ink">House rules, short version:</h2>
                <p className="text-sm text-nb-ink">Be kind, post your own stuff, no harassment or hate, keep it all-ages.</p>

                <h2 className="font-bold text-lg mt-4 mb-3 text-nb-ink">In practice:</h2>
                <ul className="space-y-1 text-sm text-nb-ink list-disc pl-5">
                  {COPY.rulesInPractice.map((line) => <li key={line}>{line}</li>)}
                </ul>

                <p className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm">
                  <NewTabLink href="/community-guidelines">Community guidelines</NewTabLink>
                  <NewTabLink href="/terms">Terms of service</NewTabLink>
                  <NewTabLink href="/privacy">Privacy policy</NewTabLink>
                </p>
              </div>

              <div className="space-y-4">
                <label htmlFor="signup-agree" className="flex items-start gap-3 cursor-pointer py-1">
                  <input
                    ref={agreeRef}
                    id="signup-agree"
                    type="checkbox"
                    checked={agreedToGuidelines}
                    onChange={(e) => {
                      setAgreedToGuidelines(e.target.checked);
                      if (e.target.checked) setError(null);
                    }}
                    className="mt-0.5 w-6 h-6 shrink-0 accent-nb-ink"
                  />
                  <span className="text-sm text-nb-ink">{COPY.agreeLabel}</span>
                </label>

                <ErrorAlert error={error} />

                <Button type="submit" size="lg" aria-disabled={!agreedToGuidelines} className={PRIMARY}>
                  {COPY.continue}
                </Button>
              </div>
            </form>
          )}

          {/* Profile (optional) */}
          {currentStep === 'profile' && (
            <form onSubmit={(e) => { e.preventDefault(); handleProfileSetup(); }}>
              <div className="text-center mb-8">
                <h1 ref={headingRef} tabIndex={-1} className={HEADING}>{COPY.profileHeading}</h1>
                <p className="text-nb-ink-mid">{COPY.profileIntro}</p>
              </div>

              <div className="space-y-6 max-w-md mx-auto">
                <div>
                  <p className="block text-sm font-bold mb-3 text-nb-ink">{COPY.photoLabel}</p>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full border-2 border-nb-ink-mid bg-thread-cream flex items-center justify-center overflow-hidden">
                      {profilePhotoPreview ? (
                        <img src={profilePhotoPreview} alt="Profile preview" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-nb-ink-mid"><PixelIcon name="user" size={32} /></span>
                      )}
                    </div>
                    <div>
                      {/* Visually hidden, not display:none, so it stays in the Tab order */}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePhotoChange}
                        className="sr-only peer"
                        id="profile-photo"
                        aria-describedby="signup-photo-hint"
                      />
                      <label
                        htmlFor="profile-photo"
                        className={`${buttonClasses('secondary', 'md')} cursor-pointer ${PEER_FOCUS_RING}`}
                      >
                        {COPY.choosePhoto}
                      </label>
                      <p id="signup-photo-hint" className="text-xs text-nb-ink-mid mt-1">JPEG, PNG, WebP or HEIC, up to 20MB</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="signup-bio" className="block text-sm font-bold mb-2 text-nb-ink">{COPY.bioLabel}</label>
                  <textarea
                    id="signup-bio"
                    name="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    aria-describedby="signup-bio-count"
                    className={`${INPUT} resize-none`}
                    readOnly={isLoading}
                    rows={3}
                    maxLength={200}
                  />
                  <p id="signup-bio-count" className="text-xs text-nb-ink-mid mt-1">{bio.length}/200 characters</p>
                </div>

                <div role="status">
                  {profileSaved && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                      <strong className="inline-flex items-center gap-1"><PixelIcon name="check" size={24} className="-my-1 -ml-1" />{COPY.profileSaved}</strong>
                    </div>
                  )}
                </div>

                <ErrorAlert error={error && `${error} ${COPY.profileRetry}`} />

                <div className="flex flex-col gap-3">
                  <Button type="submit" size="lg" aria-disabled={isLoading} className={PRIMARY}>
                    {isLoading ? COPY.saving : COPY.saveProfile}
                  </Button>

                  <button
                    type="button"
                    onClick={() => { if (!isLoading) setCurrentStep('house'); }}
                    className="ts-bare text-sm underline self-center"
                  >
                    {COPY.skipForNow}
                  </button>
                </div>
              </div>
            </form>
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