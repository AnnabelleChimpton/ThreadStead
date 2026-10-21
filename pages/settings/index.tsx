import React, { useState, useEffect } from "react";
import { GetServerSideProps, NextApiRequest } from "next";
import { useRouter } from "next/router";
import Head from "next/head";
import Layout from "@/components/ui/layout/Layout";
import RetroCard from "@/components/ui/layout/RetroCard";
import Tabs, { TabSpec } from "@/components/ui/navigation/Tabs";
import { getSessionUser } from "@/lib/auth/server";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { csrfFetch } from '@/lib/api/client/csrf-fetch';
import { useToast } from '@/contexts/ToastContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { PixelIcon } from '@/components/ui/PixelIcon';

// Import existing components
import ProfilePhotoUpload from "@/components/core/profile/ProfilePhotoUpload";
import WebsiteManager, { Website } from "@/components/shared/WebsiteManager";
import FriendManager, { SelectedFriend } from "@/components/core/social/FriendManager";
import ProfileBadgeSelector from "@/components/core/profile/ProfileBadgeSelector";
import BetaInviteCodesManager from "@/components/features/admin/BetaInviteCodesManager";
import MidiManager from "@/components/ui/media/MidiManager";
import MusicListeningSetting from "@/components/ui/media/MusicListeningSetting";
import ThemePicker from "@/components/pixel-homes/ThemePicker";
import ConsentManager from "@/components/features/auth/ConsentManager";
// Full identity management imports
import {
  getExistingDid,
  createNewIdentityWithSeedPhrase,
  recoverFromSeedPhrase,
  getSeedPhrase,
  generateSeedPhrase,
  updateIdentityWithSeedPhrase,
  LocalKeypair,
  SeedPhrase,
  isPasswordAuth,
  addPasswordToAccount
} from "@/lib/api/did/did-client";
import { validatePasswordStrength } from "@/lib/auth/password";
import Link from "next/link";
import Button from "@/components/ui/Button";
import YourPage from "@/components/features/profile/YourPage";
import DownloadMyPage from "@/components/features/profile/DownloadMyPage";
import BannerUpload from "@/components/core/profile/BannerUpload";
import { STATUS_MAX } from "@/lib/domain/profile/status";
import { layoutFields } from "@/lib/domain/profile/layout";

// We'll need to extract blocks functionality into a component
interface UserSettingsProps {
  initialUser: {
    id: string;
    did: string;
    primaryHandle: string | null;
    role: string;
    emailVerifiedAt: string | null;
    profile?: {
      displayName?: string | null;
      bio?: string | null;
      visibility?: 'public' | 'private' | 'friends' | 'followers' | null;
      showInVisitorTrails?: boolean | null;
      status?: string | null;
      bannerUrl?: string | null;
      avatarUrl?: string | null;
      customCSS?: string | null;
      hideNavigation?: boolean | null;
      templateMode?: 'default' | 'enhanced' | 'advanced' | null;
      blogroll?: any[] | null;
      featuredFriends?: any[] | null;
    } | null;
  };
  isBetaEnabled: boolean;
}

export default function UnifiedSettingsPage({ initialUser, isBetaEnabled }: UserSettingsProps) {
  const router = useRouter();
  const { user: currentUser } = useCurrentUser();
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  const confirm = useConfirm();
  const [saving, setSaving] = useState(false);
  // Results from the forms below: "Error: …" / "Failed …" show as error toasts
  const notify = (message: string) => {
    if (/^(Error|Failed)/.test(message)) showError(message.replace(/^Error:\s*/, ""));
    else showSuccess(message);
  };

  // Profile state
  const [displayName, setDisplayName] = useState(initialUser.profile?.displayName || "");
  const [bio, setBio] = useState(initialUser.profile?.bio || "");
  const [status, setStatus] = useState<string>(initialUser.profile?.status || "");
  const [visibility, setVisibility] = useState<'public' | 'private' | 'friends' | 'followers'>(
    (initialUser.profile?.visibility as 'public' | 'private' | 'friends' | 'followers') || 'public'
  );
  const [showInVisitorTrails, setShowInVisitorTrails] = useState<boolean>(
    initialUser.profile?.showInVisitorTrails ?? true
  );
  const [avatarUrl, setAvatarUrl] = useState(initialUser.profile?.avatarUrl || "");
  const [websites, setWebsites] = useState<Website[]>(
    initialUser.profile?.blogroll?.map((item: any, index: number) => ({
      id: item.id || index.toString(),
      label: item.label || "",
      url: item.url || "",
      blurb: item.blurb || "",
      mine: item.mine === true
    })) || []
  );
  const [featuredFriends, setFeaturedFriends] = useState<SelectedFriend[]>(
    initialUser.profile?.featuredFriends?.map((item: any, index: number) => ({
      id: item.id || index.toString(),
      handle: item.handle || "",
      displayName: item.displayName || "",
      avatarUrl: item.avatarUrl || "/assets/default-avatar.gif"
    })) || []
  );

  // What the profile form holds vs what's saved, for the save bar and the
  // leave-the-page guard (the photo saves on its own, so it isn't here)
  const profileSnapshot = JSON.stringify({ displayName, bio, status, visibility, showInVisitorTrails, websites, featuredFriends });
  const [savedProfileSnapshot, setSavedProfileSnapshot] = useState(profileSnapshot);
  const profileDirty = profileSnapshot !== savedProfileSnapshot;
  useEffect(() => {
    if (!profileDirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [profileDirty]);

  // Identity management state
  const [currentIdentity, setCurrentIdentity] = useState<LocalKeypair | null>(null);
  const [currentSeedPhrase, setCurrentSeedPhrase] = useState<SeedPhrase | null>(null);
  const [seedPhrase, setSeedPhrase] = useState<string>("");
  const [recoveryPhrase, setRecoveryPhrase] = useState<string>("");
  const [showRecovery, setShowRecovery] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Email management state
  const [userEmail, setUserEmail] = useState<string>('');
  const [emailVerifiedAt, setEmailVerifiedAt] = useState<Date | null>(null);
  const [showEmailSection, setShowEmailSection] = useState(false);
  const [emailInput, setEmailInput] = useState<string>('');
  const [isEmailLoading, setIsEmailLoading] = useState(false);

  // Pixel Home state
  const [pixelHomeLoading, setPixelHomeLoading] = useState(false);

  // Handle pixel home theme updates
  const handlePixelHomeUpdate = async (template: string, palette: string) => {
    if (!currentUser?.primaryHandle) return;

    setPixelHomeLoading(true);
    try {
      const response = await fetch(`/api/home/${username}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ houseTemplate: template, palette })
      });

      if (response.ok) {
        notify("House saved.");
      } else {
        throw new Error('Failed to update pixel home');
      }
    } catch (error) {
      notify("Failed to update pixel home. Please try again.");
    } finally {
      setPixelHomeLoading(false);
    }
  };

  // Hydration fix: ensure we only render client-specific auth state after mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Password auth state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [hasPasswordAuth, setHasPasswordAuth] = useState(false);

  // Password change state
  const [showPasswordChangeSection, setShowPasswordChangeSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPasswordChange, setNewPasswordChange] = useState('');
  const [confirmNewPasswordChange, setConfirmNewPasswordChange] = useState('');
  const [changePasswordErrors, setChangePasswordErrors] = useState<string[]>([]);

  // Password reset state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetSeedPhrase, setResetSeedPhrase] = useState('');
  const [resetMode, setResetMode] = useState<'seed' | 'email'>('seed');
  const [resetEmail, setResetEmail] = useState('');
  const [emailResetStatus, setEmailResetStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [emailResetMessage, setEmailResetMessage] = useState('');

  const username = React.useMemo(() => initialUser.primaryHandle?.split("@")[0] || "", [initialUser.primaryHandle]);

  const handleRequestEmailReset = async () => {
    if (!resetEmail) return;
    setEmailResetStatus('sending');
    setEmailResetMessage('');
    try {
      const res = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: resetEmail })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send');
      setEmailResetStatus('sent');
    } catch (err: any) {
      setEmailResetStatus('error');
      setEmailResetMessage(err.message || "Failed to send reset email");
    }
  };

  const handlePhotoUploadSuccess = (urls: { thumbnailUrl: string; mediumUrl: string; fullUrl: string }) => {
    setAvatarUrl(urls.mediumUrl);
    notify("Photo updated.");
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    const savingSnapshot = profileSnapshot;

    try {
      const capRes = await fetch("/api/cap/profile", { method: "POST" });
      if (capRes.status === 401) {
        notify("Error: Please log in.");
        setSaving(false);
        return;
      }
      const { token } = await capRes.json();

      const blogroll = websites.filter(w => w.label.trim() && w.url.trim()).map(w => ({
        id: w.id,
        label: w.label,
        url: w.url,
        blurb: w.blurb || "",
        ...(w.mine ? { mine: true } : {})
      }));

      const featuredFriendsData = featuredFriends.map(f => ({
        id: f.id,
        handle: f.handle,
        displayName: f.displayName,
        avatarUrl: f.avatarUrl
      }));

      const response = await csrfFetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          bio,
          status,
          visibility,
          showInVisitorTrails,
          blogroll,
          featuredFriends: featuredFriendsData,
          cap: token
        }),
      });

      if (response.ok) {
        setSavedProfileSnapshot(savingSnapshot);
        notify("Saved.");
      } else {
        const errorData = await response.json();
        notify(`Error: ${errorData.error || "Failed to save profile"}`);
      }
    } catch (error) {
      notify(`Error: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  // Identity management functions
  async function loadCurrentIdentity() {
    try {
      const identity = getExistingDid();
      setCurrentIdentity(identity);
      const seedData = getSeedPhrase();
      setCurrentSeedPhrase(seedData);
      setHasPasswordAuth(isPasswordAuth());

      // Also check if user has password auth enabled by checking if they have encrypted seed phrase
      const encryptedSeed = localStorage.getItem('retro_encrypted_seed_v1');
      if (encryptedSeed && !hasPasswordAuth) {
        setHasPasswordAuth(true);
      }

      await loadUserEmail();
    } catch {
      // Identity loading failed silently
    }
  }

  async function loadUserEmail() {
    if (!initialUser) return;

    try {
      const response = await fetch('/api/user/email');
      if (response.ok) {
        const data = await response.json();
        setUserEmail(data.email || '');
        setEmailVerifiedAt(data.emailVerifiedAt ? new Date(data.emailVerifiedAt) : null);
      }
    } catch (error) {
      console.error('Failed to load user email:', error);
      notify("Error: Failed to load your email address. Email settings may be out of date.");
    }
  }

  useEffect(() => {
    loadCurrentIdentity();
  }, []);


  async function handleGenerateSeedPhrase() {
    try {
      setIsLoading(true);
      const newSeed = await generateSeedPhrase();
      await updateIdentityWithSeedPhrase(newSeed, true);
      setSeedPhrase(newSeed);
      notify("New recovery seed phrase generated! Please save it securely.");
      await loadCurrentIdentity();
    } catch (e: unknown) {
      notify(`Error: ${(e as Error).message || 'Failed to generate seed phrase'}`);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRegenerateSeedPhrase() {
    const passwordWarning = (hasPasswordAuth || isPasswordAuth()) ?
      '• You\'ll be asked for your password to keep password login working\n' : '';

    const confirmed = await confirm({
      title: 'Generate a new seed phrase?',
      message:
      'This will:\n' +
      '• Create a completely new 12-word recovery phrase\n' +
      '• Replace your current recovery phrase (if any)\n' +
      '• Log you out and back in with new credentials\n' +
      '• Require you to save the new phrase securely\n' +
      passwordWarning +
      '\nYour old recovery phrase will no longer work.',
      confirmText: 'Generate new phrase',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      setIsLoading(true);
      showInfo("Generating new seed phrase and updating your account...");

      const newSeed = await generateSeedPhrase();
      await updateIdentityWithSeedPhrase(newSeed, true);

      // If user has password auth, we need to update their encrypted seed phrase too
      let passwordSyncFailed = false;
      if (hasPasswordAuth || isPasswordAuth()) {
        try {
          // Ask user to confirm their password to re-encrypt with new seed
          const userPassword = prompt("To keep password login working, please enter your current password:");
          if (userPassword) {
            const { encryptSeedPhraseWithPassword } = await import('@/lib/auth/password');
            const newEncryptedSeed = encryptSeedPhraseWithPassword(newSeed, userPassword);

            // Update the encrypted seed phrase on server
            const response = await fetch('/api/auth/update-encrypted-seed', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ encryptedSeedPhrase: newEncryptedSeed, currentPassword: userPassword })
            });

            if (!response.ok) {
              console.error('Failed to update encrypted seed phrase on server');
              passwordSyncFailed = true;
            } else {
              // Update local storage too
              localStorage.setItem('retro_encrypted_seed_v1', newEncryptedSeed);
            }
          }
        } catch (error) {
          console.error('Failed to update password encryption:', error);
          passwordSyncFailed = true;
        }
      }

      setSeedPhrase(newSeed);
      notify(passwordSyncFailed
        ? "Error: New seed phrase generated, but password login could not be updated. Please save the new phrase securely and re-add password authentication if needed."
        : "New recovery seed phrase generated! Please save it securely.");
      await loadCurrentIdentity();
    } catch (e: unknown) {
      notify(`Error: ${(e as Error).message || 'Failed to generate new seed phrase'}`);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRecoverFromSeed() {
    if (!recoveryPhrase.trim()) {
      showWarning("Please enter your recovery phrase");
      return;
    }

    try {
      setIsLoading(true);
      showInfo("Recovering account from seed phrase...");
      await recoverFromSeedPhrase(recoveryPhrase.trim());

      // If user has password auth, we need to update their encrypted seed phrase too
      let passwordSyncFailed = false;
      if (hasPasswordAuth || isPasswordAuth()) {
        try {
          const userPassword = prompt("To keep password login working, please enter your current password:");
          if (userPassword) {
            const { encryptSeedPhraseWithPassword } = await import('@/lib/auth/password');
            const newEncryptedSeed = encryptSeedPhraseWithPassword(recoveryPhrase.trim(), userPassword);

            // Update the encrypted seed phrase on server
            const response = await fetch('/api/auth/update-encrypted-seed', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ encryptedSeedPhrase: newEncryptedSeed, currentPassword: userPassword })
            });

            if (response.ok) {
              localStorage.setItem('retro_encrypted_seed_v1', newEncryptedSeed);
            } else {
              console.error('Failed to update encrypted seed phrase on server');
              passwordSyncFailed = true;
            }
          }
        } catch (error) {
          console.error('Failed to update password encryption:', error);
          passwordSyncFailed = true;
        }
      }

      await loadCurrentIdentity();
      setRecoveryPhrase("");
      setShowRecovery(false);
      notify(passwordSyncFailed
        ? "Error: Account recovered, but password login could not be updated. You may need to re-add password authentication."
        : "Account recovered.");
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: unknown) {
      notify(`Error: ${(e as Error).message || 'Failed to recover from seed phrase'}`);
    } finally {
      setIsLoading(false);
    }
  }

  // Password management functions
  async function handleAddPassword() {
    if (newPassword !== confirmNewPassword) {
      showWarning("Passwords do not match");
      return;
    }

    const validation = validatePasswordStrength(newPassword);
    if (!validation.valid) {
      showWarning(validation.errors[0]);
      return;
    }

    try {
      setIsLoading(true);
      showInfo("Adding password authentication...");
      await addPasswordToAccount(newPassword);
      await loadCurrentIdentity();
      setNewPassword('');
      setConfirmNewPassword('');
      setShowPasswordSection(false);
      setHasPasswordAuth(true); // Update state immediately
      notify("Password added. You can sign in with either your password or your seed phrase.");
    } catch (e: unknown) {
      notify(`Error: ${(e as Error).message || 'Failed to add password authentication'}`);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleChangePassword() {
    if (newPasswordChange !== confirmNewPasswordChange) {
      showWarning("New passwords do not match");
      return;
    }

    const validation = validatePasswordStrength(newPasswordChange);
    if (!validation.valid) {
      showWarning(validation.errors[0]);
      return;
    }

    try {
      setIsLoading(true);
      showInfo("Changing password...");

      // Import and use the changePassword function from did-client
      const { changePassword } = await import('@/lib/api/did/did-client');
      await changePassword(currentPassword, newPasswordChange);

      // Reset form
      setCurrentPassword('');
      setNewPasswordChange('');
      setConfirmNewPasswordChange('');
      setShowPasswordChangeSection(false);
      setChangePasswordErrors([]);

      notify("Password changed.");
    } catch (e: unknown) {
      notify(`Error: ${(e as Error).message || 'Failed to change password'}`);
    } finally {
      setIsLoading(false);
    }
  }

  // Email management functions
  async function handleSetEmail() {
    if (!emailInput.trim()) {
      showWarning("Please enter an email address");
      return;
    }

    setIsEmailLoading(true);
    try {
      const response = await fetch('/api/user/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput.trim() })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.requiresVerification) {
          setUserEmail(emailInput.trim());
          setEmailVerifiedAt(null);
          setEmailInput('');
          setShowEmailSection(false);
          notify(data.message);
        } else {
          setUserEmail(emailInput.trim());
          setEmailVerifiedAt(null);
          setEmailInput('');
          setShowEmailSection(false);
          notify("Email updated.");
        }
      } else {
        const error = await response.json();
        notify(`Error: ${error.error || 'Failed to update email'}`);
      }
    } catch {
      notify("Failed to update email. Please try again.");
    } finally {
      setIsEmailLoading(false);
    }
  }

  async function handleResetToDefault() {
    const ok = await confirm({
      title: "Reset to Default Template?",
      message: (
        <div className="space-y-3">
          <p>This will:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Remove all your custom CSS</li>
            <li>Remove any custom HTML templates</li>
            <li>Return your profile to the site&apos;s default appearance</li>
          </ul>
          <p className="mt-4">You can bring the old version back from History.</p>
        </div>
      ),
      confirmText: "Yes, Reset to Default",
      variant: "danger",
    });
    if (!ok) return;

    try {
      // Clear CSS
      const cssResponse = await csrfFetch(`/api/profile/${username}/css`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customCSS: '', ...layoutFields({ siteStyles: true }) }),
      });

      // Clear template
      const templateResponse = await csrfFetch(`/api/profile/${username}/template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: '', customCSS: '' }),
      });

      // Back to the standard layout
      const capRes = await csrfFetch("/api/cap/profile", { method: "POST" });
      const { token } = await capRes.json();

      const layoutResponse = await csrfFetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...layoutFields({ layout: 'standard' }), cap: token }),
      });

      if (cssResponse.ok && templateResponse.ok && layoutResponse.ok) {
        showSuccess('Reset to default.');
        setTimeout(() => {
          window.location.href = `/resident/${username}`;
        }, 1000);
      } else {
        showError('Failed to reset. Please try again.');
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to reset');
    }
  }

  async function handleRemoveEmail() {
    if (!(await confirm({
      title: 'Remove your email address?',
      message: 'You will no longer be able to use email login.',
      confirmText: 'Remove email',
      variant: 'danger',
    }))) {
      return;
    }

    setIsEmailLoading(true);
    try {
      const response = await fetch('/api/user/email', {
        method: 'DELETE'
      });

      if (response.ok) {
        setUserEmail('');
        setEmailVerifiedAt(null);
        notify("Email removed.");
      } else {
        const error = await response.json();
        notify(`Error: ${error.error || 'Failed to remove email'}`);
      }
    } catch {
      notify("Failed to remove email. Please try again.");
    } finally {
      setIsEmailLoading(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      notify("Copied to clipboard.");
    }).catch(() => {
      notify("Failed to copy to clipboard.");
    });
  }

  function downloadSeedPhrase(phrase: string) {
    const blob = new Blob([phrase], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `threadstead-seed-phrase-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Create unified settings tabs
  const settingsTabs: TabSpec[] = [
    {
      id: "profile",
      label: <><PixelIcon name="user" /> Profile</>,
      content: (
        <div className="space-y-6 px-4 sm:px-0">
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-2">Profile Information</h2>
            <p className="text-nb-ink-mid mb-6">
              Manage your public profile, photo, and personal information.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block mb-2">
                <span className="font-bold text-black">Display Name</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full max-w-md border-2 border-nb-ink-mid/60 rounded-md p-3 bg-white focus:outline-none focus:border-nb-ink-mid"
                placeholder="Your display name"
              />
            </div>

            <div>
              <label className="block mb-2" htmlFor="profile-status">
                <span className="font-bold text-black">Status</span>
              </label>
              <p className="text-sm text-nb-ink-mid mb-2">A short line under your name, like what you&apos;re up to. Leave it empty for the site&apos;s usual label.</p>
              <input
                id="profile-status"
                type="text"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                maxLength={STATUS_MAX}
                className="w-full max-w-md border-2 border-nb-ink-mid/60 rounded-md p-3 bg-white focus:outline-none focus:border-nb-ink-mid"
                placeholder="knitting a very long scarf"
              />
              <p className="text-xs text-nb-ink-mid mt-1">{status.length} / {STATUS_MAX}</p>
            </div>

            <div>
              <label className="block mb-2">
                <span className="font-bold text-black">Bio</span>
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                maxLength={1000}
                className="w-full max-w-xl border-2 border-nb-ink-mid/60 rounded-md p-3 bg-white focus:outline-none focus:border-nb-ink-mid"
                placeholder="Tell people about yourself..."
              />
              <p className="text-xs text-nb-ink-mid mt-1">{bio.length} / 1000</p>
            </div>

            <div>
              <label className="block mb-2">
                <span className="font-bold text-black">Profile Visibility</span>
              </label>
              <p className="text-sm text-nb-ink-mid mb-3">
                Control who can see your profile and how your information appears in federated ThreadRings.
              </p>
              <div className="space-y-2">
                <label className="flex items-center p-3 border-2 border-nb-ink-mid/60 rounded-md cursor-pointer hover:border-nb-ink-mid">
                  <input
                    type="radio"
                    name="visibility"
                    value="public"
                    checked={visibility === 'public'}
                    onChange={(e) => setVisibility(e.target.value as 'public')}
                    className="mr-3 w-5 h-5"
                  />
                  <div>
                    <div className="font-bold text-nb-ink"><PixelIcon name="map" className="inline-block align-middle" /> Public</div>
                    <div className="text-sm text-nb-ink-mid">
                      Anyone can see your profile. Your name and avatar will be shared with federated instances.
                    </div>
                  </div>
                </label>
                <label className="flex items-center p-3 border-2 border-nb-ink-mid/60 rounded-md cursor-pointer hover:border-nb-ink-mid">
                  <input
                    type="radio"
                    name="visibility"
                    value="followers"
                    checked={visibility === 'followers'}
                    onChange={(e) => setVisibility(e.target.value as 'followers')}
                    className="mr-3 w-5 h-5"
                  />
                  <div>
                    <div className="font-bold text-nb-ink"><PixelIcon name="users" /> Followers Only</div>
                    <div className="text-sm text-nb-ink-mid">
                      Only people who follow you can see your profile. Limited federated sharing.
                    </div>
                  </div>
                </label>
                <label className="flex items-center p-3 border-2 border-nb-ink-mid/60 rounded-md cursor-pointer hover:border-nb-ink-mid">
                  <input
                    type="radio"
                    name="visibility"
                    value="friends"
                    checked={visibility === 'friends'}
                    onChange={(e) => setVisibility(e.target.value as 'friends')}
                    className="mr-3 w-5 h-5"
                  />
                  <div>
                    <div className="font-bold text-nb-ink"><PixelIcon name="users" className="inline-block align-middle" /> Friends Only</div>
                    <div className="text-sm text-nb-ink-mid">
                      Only mutual friends can see your profile. Limited federated sharing.
                    </div>
                  </div>
                </label>
                <label className="flex items-center p-3 border-2 border-nb-ink-mid/60 rounded-md cursor-pointer hover:border-nb-ink-mid">
                  <input
                    type="radio"
                    name="visibility"
                    value="private"
                    checked={visibility === 'private'}
                    onChange={(e) => setVisibility(e.target.value as 'private')}
                    className="mr-3 w-5 h-5"
                  />
                  <div>
                    <div className="font-bold text-nb-ink"><PixelIcon name="lock" className="inline-block align-middle" /> Private</div>
                    <div className="text-sm text-nb-ink-mid">
                      Only you can see your profile. Minimal federated sharing (profile link only).
                    </div>
                  </div>
                </label>
              </div>
              <div className="mt-3 p-3 border-2 border-dotted border-nb-ink-mid/60 rounded-md text-sm text-nb-ink">
                <strong>Federated ThreadRings:</strong> Your profile link is always shared when you join federated rings.
                If set to Public, your name and avatar will also be shared. Other visibility settings share only the link.
              </div>
            </div>

            <div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInVisitorTrails}
                  onChange={(e) => setShowInVisitorTrails(e.target.checked)}
                  className="mt-1 w-5 h-5"
                />
                <span>
                  <span className="block font-bold text-black">Show me in visitor trails</span>
                  <span className="block text-sm text-nb-ink-mid">
                    When you visit someone&apos;s pixel home, your name and picture show under it for a week. Turned off, you&apos;re only counted as a visit, with nothing about you kept.
                  </span>
                </span>
              </label>
            </div>

            <div className="border-t-2 border-dotted border-nb-ink-mid/40 pt-6">
              <ProfilePhotoUpload
                currentAvatarUrl={avatarUrl}
                onUploadSuccess={handlePhotoUploadSuccess}
                disabled={saving}
              />
            </div>

            <div className="border-t-2 border-dotted border-nb-ink-mid/40 pt-6">
              <BannerUpload initialUrl={initialUser.profile?.bannerUrl} />
            </div>

            <div className="border-t-2 border-dotted border-nb-ink-mid/40 pt-6">
              <WebsiteManager
                websites={websites}
                onChange={setWebsites}
                maxWebsites={10}
              />
            </div>

            <div className="border-t-2 border-dotted border-nb-ink-mid/40 pt-6">
              <FriendManager
                selectedFriends={featuredFriends}
                onChange={setFeaturedFriends}
                maxFriends={8}
              />
            </div>

            {/* Stays in view while there's something to save */}
            <div className={`${profileDirty ? "sticky bottom-0 z-10" : ""} -mx-4 sm:mx-0 px-4 py-3 bg-thread-paper border-t-2 border-dotted border-nb-ink-mid/40 flex flex-wrap items-center gap-3`}>
              <Button
                onClick={handleSaveProfile}
                disabled={saving || !profileDirty}
                className="thread-button disabled:opacity-50 min-h-[48px]"
              >
                {saving ? "Saving..." : "Save Profile"}
              </Button>
              <span className="text-sm text-nb-ink-mid" role="status">
                {profileDirty ? "You have unsaved changes." : "Everything's saved."}
              </span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "appearance",
      label: <><PixelIcon name="paint-bucket" /> Your page</>,
      content: (
        <div className="space-y-6 px-4 sm:px-0">
          <div>
            <h2 className="text-xl font-bold mb-2 text-nb-ink">Your page</h2>
            <p className="text-nb-ink-mid">How your profile looks to people who visit it.</p>
          </div>

          <YourPage username={username} />

          <DownloadMyPage />

          {/* Reset Section */}
          <div className="border-2 border-dotted border-nb-ink-mid/60 rounded-md p-4">
            <h4 className="font-semibold text-nb-ink mb-2 flex items-center gap-2"><PixelIcon name="reload" /> Start over</h4>
            <p className="text-sm text-nb-ink mb-3">
              Takes your CSS and HTML off your page and goes back to the site&apos;s look. Both stay in History.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleResetToDefault}
              className="thread-button-secondary min-h-[48px]"
            >
              <PixelIcon name="reload" /> Start over
            </Button>
          </div>

        </div>
      )
    },
    {
      id: "pixel-home",
      label: <><PixelIcon name="home" /> Pixel Home</>,
      content: (
        <div className="space-y-6 px-4 sm:px-0">
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-2 text-nb-ink">Pixel Home Customization</h2>
            <p className="text-nb-ink-mid mb-6">
              Customize your interactive Pixel Home - choose your house style and color palette to create your unique digital front door.
            </p>
          </div>

          {currentUser?.primaryHandle && (
            <div className="bg-thread-paper border border-thread-sage rounded-lg p-4 mb-4">
              <div className="text-center text-sm text-thread-sage mb-2">
                Preview your current Pixel Home:
              </div>
              <div className="text-center space-y-2">
                <div>
                  <a
                    href={`/home/${username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-3 bg-thread-sage text-thread-paper rounded-md hover:bg-thread-pine transition-colors mr-2 min-h-[48px]"
                  >
                    View My Pixel Home
                    <span className="text-sm">↗</span>
                  </a>
                  <a
                    href={`/home/${username}/decorate`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-3 bg-thread-sage text-thread-paper rounded-md hover:bg-thread-pine transition-colors mr-2 min-h-[48px]"
                  >
                    Decorate Home
                    <span className="text-sm">↗</span>
                  </a>
                </div>
                <div className="text-sm text-thread-sage">
                  Use the decorator to place decorations, change themes, and customize your home&apos;s atmosphere
                </div>
              </div>
            </div>
          )}
        </div>
      )
    },
    {
      id: "music",
      label: <><PixelIcon name="music" /> Music</>,
      content: (
        <div className="space-y-6 px-4 sm:px-0">
          <div>
            <h2 className="text-xl font-bold mb-2 text-nb-ink">Music</h2>
            <p className="text-nb-ink-mid m-0">
              Your profile can play a MIDI song, the way homepages used to. Pick one here, or none.
            </p>
          </div>

          <div className="thread-module">
            <h3 className="text-lg font-semibold text-nb-ink mb-4">Your songs</h3>
            <MidiManager username={username} />
          </div>

          <MusicListeningSetting />

          <p className="text-sm text-nb-ink-mid m-0">
            New to MIDI? The <Link href="/help/music-guide" className="underline hover:text-nb-ink">music guide</Link> covers where to find songs and how to make your own.
          </p>
        </div>
      )
    },
    {
      id: "account",
      label: <><PixelIcon name="shield" /> Account & Security</>,
      content: (
        <div className="space-y-6 px-4 sm:px-0">
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-2">Account & Security</h2>
            <p className="text-nb-ink-mid mb-6">
              Manage your identity, keys, email, and account security.
            </p>
          </div>

          {/* Seed Phrase Management */}
          <div className="thread-module">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-nb-ink">
              <PixelIcon name="drop" />
              Recovery Seed Phrase
            </h3>
            <p className="text-nb-ink-mid mb-4">
              Your seed phrase is a 12-word backup that can recover your account if you lose access.
            </p>

            {!currentSeedPhrase ? (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded mb-4">
                <p className="text-amber-800 font-medium mb-2"><PixelIcon name="alert" /> No seed phrase recovery set</p>
                <p className="text-amber-700 text-sm mb-3">
                  Generate a seed phrase to enable account recovery. This is highly recommended for account security.
                </p>
                <Button
                  onClick={handleGenerateSeedPhrase}
                  disabled={isLoading}
                  className="thread-button disabled:opacity-50 min-h-[48px]"
                >
                  {isLoading ? "Generating..." : "Generate Seed Phrase"}
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dotted border-nb-ink-mid/60 rounded-md p-4 mb-4">
                <p className="text-nb-ink font-medium mb-2"><PixelIcon name="check" className="inline-block align-middle" /> Seed phrase recovery is enabled</p>
                <div className="border-2 border-dotted border-nb-ink-mid/60 rounded-md p-3 mb-3">
                  <p className="text-nb-ink font-medium mb-2"><PixelIcon name="reload" className="inline-block align-middle" /> Need a new recovery phrase?</p>
                  <p className="text-nb-ink text-sm mb-3">
                    Generate a completely new 12-word recovery phrase. This will replace your current one and log you back in with new credentials.
                  </p>
                  <Button
                    size="sm"
                    onClick={handleRegenerateSeedPhrase}
                    disabled={isLoading}
                    className="thread-button disabled:opacity-50 min-h-[48px]"
                  >
                    {isLoading ? "Regenerating..." : "Regenerate Seed Phrase"}
                  </Button>
                </div>
              </div>
            )}

            {/* Show seed phrase if just generated */}
            {seedPhrase && (
              <div className="border-2 border-dotted border-nb-ink-mid/60 rounded-md p-4 mb-4">
                <p className="text-nb-ink font-medium mb-2"><PixelIcon name="save" /> Your Recovery Seed Phrase</p>
                <p className="text-nb-ink text-sm mb-3">
                  <strong>Save these 12 words in order!</strong> You&apos;ll need them to recover your account.
                </p>
                <div className="border-2 border-dotted border-nb-ink-mid/60 rounded-md p-3 mb-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {seedPhrase.split(' ').map((word, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-white rounded-md border border-nb-ink-mid/40">
                        <span className="text-sm font-bold text-nb-ink-mid w-6 font-mono">{index + 1}.</span>
                        <span className="font-mono text-nb-ink">{word}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => copyToClipboard(seedPhrase)}
                    className="thread-button-secondary min-h-[48px]"
                  >
                    <PixelIcon name="clipboard" /> Copy
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => downloadSeedPhrase(seedPhrase)}
                    className="thread-button-secondary min-h-[48px]"
                  >
                    <PixelIcon name="save" /> Download
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSeedPhrase("")}
                    className="thread-button-secondary min-h-[48px]"
                  >
                    <PixelIcon name="check" className="inline-block align-middle" /> I&apos;ve Saved It
                  </Button>
                </div>
              </div>
            )}

            {/* Account Recovery */}
            <div className="border-t border-nb-ink-mid/30 pt-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowRecovery(!showRecovery)}
                className="thread-button-secondary min-h-[48px]"
              >
                <PixelIcon name="reload" /> Recover Account from Seed Phrase
              </Button>

              {showRecovery && (
                <div className="mt-4 p-4 border-2 border-dotted border-nb-ink-mid/60 rounded-md">
                  <p className="text-sm text-nb-ink-mid mb-3">
                    Enter your 12-word recovery phrase to restore your account. This will replace your current identity.
                  </p>
                  <textarea
                    value={recoveryPhrase}
                    onChange={(e) => setRecoveryPhrase(e.target.value)}
                    placeholder="Enter your 12-word recovery phrase separated by spaces..."
                    className="w-full h-24 text-sm border border-nb-ink-mid/40 p-3 resize-none bg-white rounded"
                    disabled={isLoading}
                  />
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleRecoverFromSeed}
                      disabled={isLoading || !recoveryPhrase.trim()}
                      className="thread-button-secondary disabled:opacity-50 min-h-[48px]"
                    >
                      {isLoading ? "Recovering..." : "Recover Account"}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowRecovery(false)}
                      className="thread-button-secondary min-h-[48px]"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Password Authentication */}
          <div className="thread-module">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-nb-ink">
              <PixelIcon name="lock" />
              Password Authentication
            </h3>
            <p className="text-nb-ink-mid mb-4">
              Add password login as an alternative to your seed phrase. You&apos;ll be able to sign in with either method.
            </p>

            {!hasPasswordAuth || !mounted ? (
              <div className="border-2 border-dotted border-nb-ink-mid/60 rounded-md p-4 mb-4">
                <p className="text-nb-ink font-medium mb-2"><PixelIcon name="lightbulb" /> Enable password login</p>
                <p className="text-nb-ink text-sm mb-3">
                  Add a password to your account for easier login. Your seed phrase will still work and remains the most secure option.
                </p>

                {!showPasswordSection ? (
                  <Button
                    variant="secondary"
                    onClick={() => setShowPasswordSection(true)}
                    className="thread-button-secondary min-h-[48px]"
                  >
                    Add Password Login
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold mb-2">New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          const validation = validatePasswordStrength(e.target.value);
                          setPasswordErrors(validation.errors);
                        }}
                        placeholder="Enter a strong password"
                        className="w-full px-3 py-2 border border-nb-ink-mid/40 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isLoading}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold mb-2">Confirm Password</label>
                      <input
                        type="password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Enter password again"
                        className="w-full px-3 py-2 border border-nb-ink-mid/40 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isLoading}
                      />
                    </div>

                    {/* Password Requirements */}
                    <div className="border-2 border-dotted border-nb-ink-mid/60 rounded-md p-3">
                      <p className="text-sm font-bold text-nb-ink mb-2">Password Requirements:</p>
                      <ul className="text-sm space-y-1">
                        <li className={newPassword.length >= 8 ? "text-nb-ink font-medium" : "text-nb-ink-mid"}>
                          {newPassword.length >= 8 ? "✓" : "○"} At least 8 characters
                        </li>
                        <li className={/[a-z]/.test(newPassword) ? "text-nb-ink font-medium" : "text-nb-ink-mid"}>
                          {/[a-z]/.test(newPassword) ? "✓" : "○"} One lowercase letter
                        </li>
                        <li className={/[A-Z]/.test(newPassword) ? "text-nb-ink font-medium" : "text-nb-ink-mid"}>
                          {/[A-Z]/.test(newPassword) ? "✓" : "○"} One uppercase letter
                        </li>
                        <li className={/[0-9]/.test(newPassword) ? "text-nb-ink font-medium" : "text-nb-ink-mid"}>
                          {/[0-9]/.test(newPassword) ? "✓" : "○"} One number
                        </li>
                      </ul>
                    </div>

                    <div className="flex gap-3 flex-wrap">
                      <Button
                        onClick={handleAddPassword}
                        disabled={isLoading || !newPassword || !confirmNewPassword || passwordErrors.length > 0}
                        className="thread-button disabled:opacity-50 min-h-[48px]"
                      >
                        {isLoading ? "Adding..." : "Add Password"}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setShowPasswordSection(false);
                          setNewPassword('');
                          setConfirmNewPassword('');
                          setPasswordErrors([]);
                        }}
                        disabled={isLoading}
                        className="thread-button-secondary disabled:opacity-50 min-h-[48px]"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="border-2 border-dotted border-nb-ink-mid/60 rounded-md p-4 mb-4">
                <p className="text-nb-ink font-medium mb-2"><PixelIcon name="check" className="inline-block align-middle" /> Password authentication is enabled</p>
                <p className="text-nb-ink text-sm mb-4">
                  You can now sign in using either your password or your seed phrase.
                </p>

                {/* Change Password Section */}
                {!showPasswordChangeSection ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowPasswordChangeSection(true)}
                    className="thread-button-secondary min-h-[48px]"
                  >
                    Change Password
                  </Button>
                ) : (
                  <div className="bg-white border border-nb-ink-mid/30 rounded p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-nb-ink text-nb-ink">
                        {showForgotPassword ? "Reset Password with Seed Phrase" : "Change Password"}
                      </h4>
                      {!showForgotPassword ? (
                        <button
                          onClick={() => setShowForgotPassword(true)}
                          className="text-xs"
                        >
                          Forgot Password?
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowForgotPassword(false)}
                          className="text-xs"
                        >
                          Back to Change Password
                        </button>
                      )}
                    </div>

                    {showForgotPassword ? (
                      // RESET PASSWORD FORM
                      <>
                        <div className="flex gap-4 mb-4 border-b border-nb-ink-mid/30">
                          <button
                            className={`px-3 py-2 ${resetMode === 'seed' ? 'font-bold border-b-2 border-nb-ink text-nb-ink' : 'text-nb-ink-mid hover:text-nb-ink'}`}
                            onClick={() => setResetMode('seed')}
                          >
                            Use Seed Phrase
                          </button>
                          <button
                            className={`px-3 py-2 ${resetMode === 'email' ? 'font-bold border-b-2 border-nb-ink text-nb-ink' : 'text-nb-ink-mid hover:text-nb-ink'}`}
                            onClick={() => setResetMode('email')}
                          >
                            Use Email
                          </button>
                        </div>

                        {resetMode === 'seed' ? (
                          <>
                            <div className="bg-amber-50 border border-amber-200 p-3 rounded text-sm text-amber-800 mb-2">
                              <PixelIcon name="lock" className="inline-block mr-1" />
                              To reset your password, please enter your 12-word recovery seed phrase.
                              This proves you own the account.
                            </div>

                            <div>
                              <label className="block text-sm font-bold mb-2">Recovery Seed Phrase</label>
                              <textarea
                                value={resetSeedPhrase}
                                onChange={(e) => setResetSeedPhrase(e.target.value)}
                                placeholder="alert angry ... (12 words)"
                                className="w-full px-3 py-2 border border-nb-ink-mid/40 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 font-mono text-sm"
                                disabled={isLoading}
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-bold mb-2">New Password</label>
                              <input
                                type="password"
                                value={newPasswordChange}
                                onChange={(e) => {
                                  setNewPasswordChange(e.target.value);
                                  const validation = validatePasswordStrength(e.target.value);
                                  setChangePasswordErrors(validation.errors);
                                }}
                                placeholder="Enter new password"
                                className="w-full px-3 py-2 border border-nb-ink-mid/40 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={isLoading}
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-bold mb-2">Confirm New Password</label>
                              <input
                                type="password"
                                value={confirmNewPasswordChange}
                                onChange={(e) => setConfirmNewPasswordChange(e.target.value)}
                                placeholder="Confirm new password"
                                className="w-full px-3 py-2 border border-nb-ink-mid/40 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={isLoading}
                              />
                            </div>

                            {/* Reusing existing password requirements display logic */}
                            {newPasswordChange && (
                              <div className="border-2 border-dotted border-nb-ink-mid/60 rounded-md p-3">
                                <p className="text-sm font-bold text-nb-ink mb-2">Password Requirements:</p>
                                <ul className="text-sm space-y-1">
                                  <li className={newPasswordChange.length >= 8 ? "text-nb-ink font-medium" : "text-nb-ink-mid"}>
                                    {newPasswordChange.length >= 8 ? "✓" : "○"} At least 8 characters
                                  </li>
                                  <li className={/[a-z]/.test(newPasswordChange) ? "text-nb-ink font-medium" : "text-nb-ink-mid"}>
                                    {/[a-z]/.test(newPasswordChange) ? "✓" : "○"} One lowercase letter
                                  </li>
                                  <li className={/[A-Z]/.test(newPasswordChange) ? "text-nb-ink font-medium" : "text-nb-ink-mid"}>
                                    {/[A-Z]/.test(newPasswordChange) ? "✓" : "○"} One uppercase letter
                                  </li>
                                  <li className={/[0-9]/.test(newPasswordChange) ? "text-nb-ink font-medium" : "text-nb-ink-mid"}>
                                    {/[0-9]/.test(newPasswordChange) ? "✓" : "○"} One number
                                  </li>
                                </ul>
                              </div>
                            )}

                            <div className="flex gap-3 flex-wrap">
                              <Button
                                onClick={async () => {
                                  setIsLoading(true);
                                  try {
                                    const res = await fetch('/api/auth/add-password', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        password: newPasswordChange,
                                        seedPhrase: resetSeedPhrase
                                      })
                                    });
                                    if (!res.ok) {
                                      const data = await res.json();
                                      throw new Error(data.error || 'Failed to reset password');
                                    }
                                    // Success!
                                    notify("Password reset. Sign in with the new one from now on.");
                                    setShowPasswordChangeSection(false);
                                    setShowForgotPassword(false);
                                    setResetSeedPhrase('');
                                    setNewPasswordChange('');
                                    setConfirmNewPasswordChange('');
                                    // Reload identity to ensure local state is consistent if needed
                                    // (Actually, we should probably update local storage encrypted seed too, 
                                    // but for now, the server state is correct, and next login will sync)
                                  } catch (err) {
                                    notify(`Error: ${err instanceof Error ? err.message : 'Failed to reset password'}`);
                                  } finally {
                                    setIsLoading(false);
                                  }
                                }}
                                disabled={isLoading || !resetSeedPhrase || !newPasswordChange || !confirmNewPasswordChange || changePasswordErrors.length > 0}
                                className="thread-button disabled:opacity-50 min-h-[48px]"
                              >
                                {isLoading ? "Resetting..." : "Reset Password"}
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  setShowPasswordChangeSection(false);
                                  setShowForgotPassword(false);
                                }}
                                disabled={isLoading}
                                className="thread-button-secondary"
                              >
                                Cancel
                              </Button>
                            </div>
                          </>
                        ) : (
                          // EMAIL FORM
                          <div className="space-y-4 pt-2">
                            <div className="border-2 border-dotted border-nb-ink-mid/60 rounded-md p-3 text-sm text-nb-ink">
                              <PixelIcon name="mail" className="inline-block mr-1" />
                              Enter your verified email address. We&apos;ll send you a link to reset your password.
                            </div>

                            {emailResetStatus === 'sent' ? (
                              <div className="text-center p-4 border-2 border-dotted border-nb-ink-mid/60 rounded-md">
                                <p className="text-nb-ink font-bold mb-2">Email Sent!</p>
                                <p className="text-sm">Check {resetEmail} for the reset link.</p>
                                <button onClick={() => { setEmailResetStatus('idle'); setResetMode('seed'); setShowForgotPassword(false); setShowPasswordChangeSection(false); }} className="mt-4 text-nb-ink-mid hover:underline text-sm">Close</button>
                              </div>
                            ) : (
                              <>
                                <div>
                                  <label className="block text-sm font-bold mb-2">Email Address</label>
                                  <input
                                    type="email"
                                    value={resetEmail}
                                    onChange={(e) => setResetEmail(e.target.value)}
                                    placeholder="name@example.com"
                                    className="w-full px-3 py-2 border border-nb-ink-mid/40 rounded"
                                    disabled={emailResetStatus === 'sending'}
                                  />
                                </div>
                                {emailResetStatus === 'error' && (
                                  <div className="text-red-500 text-sm mb-2">Error: {emailResetMessage}</div>
                                )}
                                <div className="flex gap-3">
                                  <Button
                                    variant="secondary"
                                    onClick={handleRequestEmailReset}
                                    disabled={!resetEmail || emailResetStatus === 'sending'}
                                    className="thread-button-secondary disabled:opacity-50 min-h-[48px]"
                                  >
                                    {emailResetStatus === 'sending' ? "Sending..." : "Send Reset Link"}
                                  </Button>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => {
                                      setShowPasswordChangeSection(false);
                                      setShowForgotPassword(false);
                                    }}
                                    disabled={emailResetStatus === 'sending'}
                                    className="thread-button-secondary"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      // STANDARD CHANGE PASSWORD FORM
                      <>
                        <div>
                          <label className="block text-sm font-bold mb-2">Current Password</label>
                          <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Enter current password"
                            className="w-full px-3 py-2 border border-nb-ink-mid/40 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isLoading}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-bold mb-2">New Password</label>
                          <input
                            type="password"
                            value={newPasswordChange}
                            onChange={(e) => {
                              setNewPasswordChange(e.target.value);
                              const validation = validatePasswordStrength(e.target.value);
                              setChangePasswordErrors(validation.errors);
                            }}
                            placeholder="Enter new password"
                            className="w-full px-3 py-2 border border-nb-ink-mid/40 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isLoading}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-bold mb-2">Confirm New Password</label>
                          <input
                            type="password"
                            value={confirmNewPasswordChange}
                            onChange={(e) => setConfirmNewPasswordChange(e.target.value)}
                            placeholder="Confirm new password"
                            className="w-full px-3 py-2 border border-nb-ink-mid/40 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isLoading}
                          />
                        </div>

                        {/* Password Requirements for Change */}
                        {newPasswordChange && (
                          <div className="border-2 border-dotted border-nb-ink-mid/60 rounded-md p-3">
                            <p className="text-sm font-bold text-nb-ink mb-2">Password Requirements:</p>
                            <ul className="text-sm space-y-1">
                              <li className={newPasswordChange.length >= 8 ? "text-nb-ink font-medium" : "text-nb-ink-mid"}>
                                {newPasswordChange.length >= 8 ? "✓" : "○"} At least 8 characters
                              </li>
                              <li className={/[a-z]/.test(newPasswordChange) ? "text-nb-ink font-medium" : "text-nb-ink-mid"}>
                                {/[a-z]/.test(newPasswordChange) ? "✓" : "○"} One lowercase letter
                              </li>
                              <li className={/[A-Z]/.test(newPasswordChange) ? "text-nb-ink font-medium" : "text-nb-ink-mid"}>
                                {/[A-Z]/.test(newPasswordChange) ? "✓" : "○"} One uppercase letter
                              </li>
                              <li className={/[0-9]/.test(newPasswordChange) ? "text-nb-ink font-medium" : "text-nb-ink-mid"}>
                                {/[0-9]/.test(newPasswordChange) ? "✓" : "○"} One number
                              </li>
                            </ul>
                          </div>
                        )}

                        <div className="flex gap-3 flex-wrap">
                          <Button
                            variant="secondary"
                            onClick={handleChangePassword}
                            disabled={isLoading || !currentPassword || !newPasswordChange || !confirmNewPasswordChange || changePasswordErrors.length > 0}
                            className="thread-button-secondary disabled:opacity-50 min-h-[48px]"
                          >
                            {isLoading ? "Changing..." : "Change Password"}
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setShowPasswordChangeSection(false);
                              setCurrentPassword('');
                              setNewPasswordChange('');
                              setConfirmNewPasswordChange('');
                              setChangePasswordErrors([]);
                            }}
                            disabled={isLoading}
                            className="thread-button-secondary disabled:opacity-50 min-h-[48px]"
                          >
                            Cancel
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Email Management */}
          <div className="thread-module">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-nb-ink">
              <PixelIcon name="mail" />
              Email Login
            </h3>
            <p className="text-nb-ink-mid mb-4">
              Add an email address for magic link login and account recovery.
            </p>

            <div className="space-y-3">
              {userEmail ? (
                <div className="flex items-center gap-2">
                  {emailVerifiedAt ? (
                    <>
                      <span className="text-nb-ink text-sm font-medium">✓ {userEmail}</span>
                      <span className="text-sm text-nb-ink-mid">(verified)</span>
                    </>
                  ) : (
                    <>
                      <span className="text-amber-600 text-sm font-medium"><PixelIcon name="clock" /> {userEmail}</span>
                      <span className="text-sm text-nb-ink-mid">(pending verification)</span>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-nb-ink font-medium mb-2"><PixelIcon name="mail" className="inline-block align-middle" /> Email login not set</p>
              )}

              {userEmail ? (
                <div className="flex gap-2">
                  {emailVerifiedAt ? (
                    <p className="text-nb-ink text-sm">
                      You can now login using magic links sent to this email address.
                    </p>
                  ) : (
                    <p className="text-amber-700 text-sm">
                      Check your email and click the verification link to enable email login.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-nb-ink text-sm mb-3">
                  Add an email address to enable magic link login as an alternative to your DID key.
                </p>
              )}

              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowEmailSection(!showEmailSection)}
                  className="thread-button-secondary min-h-[48px]"
                >
                  {userEmail ? "Change Email" : "Add Email"}
                </Button>
                {userEmail && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleRemoveEmail}
                    disabled={isEmailLoading}
                    className="thread-button-secondary disabled:opacity-50 min-h-[48px]"
                  >
                    Remove Email
                  </Button>
                )}
              </div>

              {showEmailSection && (
                <div className="mt-4 p-4 border-2 border-dotted border-nb-ink-mid/60 rounded-md">
                  <h4 className="text-sm font-medium text-nb-ink mb-2">Set Email Address</h4>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-3 py-2 text-sm border border-nb-ink-mid/40 rounded bg-white"
                    disabled={isEmailLoading}
                  />
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleSetEmail}
                      disabled={isEmailLoading || !emailInput.trim()}
                      className="thread-button-secondary disabled:opacity-50"
                    >
                      {isEmailLoading ? "Setting..." : "Set Email"}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowEmailSection(false)}
                      className="thread-button-secondary"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      )
    },
    {
      id: "badges",
      label: <><PixelIcon name="trophy" /> Badges</>,
      content: (
        <div className="space-y-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-2">ThreadRing Badges</h2>
            <p className="text-nb-ink-mid mb-6">
              Manage which badges from your ThreadRings are displayed on your profile and posts.
            </p>
          </div>

          <ProfileBadgeSelector
            onSave={(preferences) => {
              notify("Badge settings saved.");
            }}
          />
        </div>
      )
    },
    {
      id: "privacy",
      label: <><PixelIcon name="shield" /> Privacy & Consent</>,
      content: (
        <div className="space-y-6 px-4 sm:px-0">
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-2">Privacy & Consent</h2>
            <p className="text-nb-ink-mid mb-6">
              Manage your privacy settings, data consent preferences, and blocked users.
            </p>
          </div>

          {/* Consent Management */}
          <ConsentManager userId={initialUser.id} />

          {/* Data Export */}
          <div className="thread-module">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <PixelIcon name="archive" />
              Export Your Data
            </h3>
            <p className="text-nb-ink-mid mb-4">
              Download a complete copy of all your data in machine-readable JSON format. This includes posts, ThreadRing memberships, comments, media, profile data, and social connections.
            </p>

            <div className="border-2 border-dotted border-nb-ink-mid/60 rounded-md p-4 mb-4">
              <h4 className="font-semibold text-nb-ink mb-2"><PixelIcon name="clipboard" className="inline-block align-middle" /> What&apos;s Included:</h4>
              <ul className="text-sm text-nb-ink space-y-1">
                <li><PixelIcon name="check" size={16} className="inline-block align-middle" /> All posts and content</li>
                <li><PixelIcon name="check" size={16} className="inline-block align-middle" /> ThreadRing memberships and badges</li>
                <li><PixelIcon name="check" size={16} className="inline-block align-middle" /> Comments and interactions</li>
                <li><PixelIcon name="check" size={16} className="inline-block align-middle" /> Media library (photos, MIDI files)</li>
                <li><PixelIcon name="check" size={16} className="inline-block align-middle" /> Profile and customization settings</li>
                <li><PixelIcon name="check" size={16} className="inline-block align-middle" /> Social connections (followers, following)</li>
                <li><PixelIcon name="check" size={16} className="inline-block align-middle" /> Account data and consent records</li>
              </ul>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-3 rounded mb-4">
              <p className="text-sm text-amber-800">
                <strong><PixelIcon name="clock" className="inline-block align-middle" /> Rate Limit:</strong> You can export your data once per hour to prevent abuse.
              </p>
            </div>

            <Button
              onClick={async () => {
                try {
                  showInfo("Generating your data export...");
                  const response = await fetch('/api/user/export/data');
                  if (!response.ok) {
                    const error = await response.json();
                    notify(`Error: ${error.error || 'Failed to export data'}`);
                    return;
                  }
                  // Get the JSON data
                  const blob = await response.blob();
                  // Create download link
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `threadstead-data-export-${Date.now()}.json`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(url);
                  notify("Export downloaded.");
                } catch (error) {
                  notify(`Error: ${error instanceof Error ? error.message : 'Failed to export data'}`);
                }
              }}
              className="thread-button min-h-[48px]"
            >
              <PixelIcon name="download" className="inline-block align-middle" /> Export All My Data
            </Button>

            <div className="mt-4 p-3 bg-gray-50 border border-nb-ink-mid/30 rounded">
              <p className="text-sm text-nb-ink-mid">
                <strong>GDPR Compliance:</strong> This export provides your personal data in a structured, commonly used, and machine-readable format as required by data protection regulations.
              </p>
            </div>
          </div>

          {/* Blocking Management */}
          <div className="widget-container widget--flat bg-thread-paper border border-thread-sage rounded-cozy shadow-cozy-sm p-4">
            <h3 className="text-lg font-bold mb-2 text-nb-ink">User & Community Blocking</h3>
            <p className="text-sm text-nb-ink mb-3">
              <strong>Blocked users and communities are managed separately.</strong>
            </p>
            <Link
              href="/settings/blocks"
              className="btn btn--primary bg-thread-cream inline-block text-thread-pine border-2 border-thread-sage rounded-md shadow-cozy-sm font-semibold text-sm"
            >
              Manage Blocked Users & Communities →
            </Link>
          </div>
        </div>
      )
    },
    ...(isBetaEnabled ? [{
      id: "beta" as const,
      label: <><PixelIcon name="gift" /> Beta Invites</>,
      content: (
        <div className="space-y-6 px-4 sm:px-0">
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-2">Beta Invite Codes</h2>
            <p className="text-nb-ink-mid mb-6">
              Share beta access with friends using your personal invite codes.
            </p>
          </div>

          <BetaInviteCodesManager />
        </div>
      )
    }] : [])
  ];

  // Admin tools live at /admin (the account menu links there for admins)

  return (
    <>
      <Head>
        <title>Settings | ThreadStead</title>
      </Head>
      <Layout fullWidth={true}>
        <RetroCard>
          <div className="flex items-center justify-between mb-6 px-4 sm:px-0">
            <h1 className="text-2xl font-bold">Settings</h1>
            <div className="flex gap-2">
              <a
                href={`/resident/${username}`}
                className="btn btn--secondary bg-thread-paper inline-block text-thread-pine border-2 border-thread-sage rounded-md shadow-cozy-sm font-semibold min-h-[48px]"
              >
                View Profile
              </a>
            </div>
          </div>

          <Tabs tabs={settingsTabs} initialId={router.query.tab as string || "profile"} variant="site" />
        </RetroCard>
      </Layout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<UserSettingsProps> = async ({ req }) => {
  const { getSessionUser } = await import('@/lib/auth/server');
  const user = await getSessionUser(req as NextApiRequest);

  if (!user) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  // Fetch user profile data
  try {
    const { db } = await import('@/lib/config/database/connection');

    const userData = await db.user.findUnique({
      where: { id: user.id },
      include: {
        profile: true,
      }
    });

    if (!userData) {
      return {
        redirect: {
          destination: '/login',
          permanent: false,
        },
      };
    }

    // Check if beta keys are enabled
    const { isBetaKeysEnabled } = await import('@/lib/config/beta-keys');
    const betaEnabled = isBetaKeysEnabled();

    return {
      props: {
        initialUser: {
          id: userData.id,
          did: userData.did,
          primaryHandle: userData.primaryHandle,
          role: userData.role,
          emailVerifiedAt: userData.emailVerifiedAt?.toISOString() || null,
          profile: userData.profile ? {
            displayName: userData.profile.displayName || null,
            bio: userData.profile.bio || null,
            visibility: (userData.profile.visibility as 'public' | 'private' | 'friends' | 'followers') || 'public',
            showInVisitorTrails: userData.profile.showInVisitorTrails,
            status: userData.profile.status,
            bannerUrl: userData.profile.bannerUrl,
            avatarUrl: userData.profile.avatarUrl || null,
            customCSS: userData.profile.customCSS || null,
            hideNavigation: userData.profile.hideNavigation ?? null,
            templateMode: (userData.profile.templateMode as 'default' | 'enhanced' | 'advanced') || null,
            blogroll: (userData.profile.blogroll as any[]) || null,
            featuredFriends: (userData.profile.featuredFriends as any[]) || null,
          } : null,
        },
        isBetaEnabled: betaEnabled,
      },
    };
  } catch (error) {
    console.error('Error fetching user data:', error);
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }
};