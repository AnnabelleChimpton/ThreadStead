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
import { useToastContext } from '@/lib/templates/state/ToastProvider';
import ConfirmModal from '@/components/ui/feedback/ConfirmModal';
import { PixelIcon } from '@/components/ui/PixelIcon';

// Import existing components
import ProfilePhotoUpload from "@/components/core/profile/ProfilePhotoUpload";
import WebsiteManager, { Website } from "@/components/shared/WebsiteManager";
import FriendManager, { SelectedFriend } from "@/components/core/social/FriendManager";
import ProfileBadgeSelector from "@/components/core/profile/ProfileBadgeSelector";
import BetaInviteCodesManager from "@/components/features/admin/BetaInviteCodesManager";
import MidiManager from "@/components/ui/media/MidiManager";
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
      avatarUrl?: string | null;
      customCSS?: string | null;
      templateEnabled?: boolean | null;
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
  const { showSuccess, showError } = useToastContext();
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);

  // Profile state
  const [displayName, setDisplayName] = useState(initialUser.profile?.displayName || "");
  const [bio, setBio] = useState(initialUser.profile?.bio || "");
  const [visibility, setVisibility] = useState<'public' | 'private' | 'friends' | 'followers'>(
    (initialUser.profile?.visibility as 'public' | 'private' | 'friends' | 'followers') || 'public'
  );
  const [avatarUrl, setAvatarUrl] = useState(initialUser.profile?.avatarUrl || "");
  const [websites, setWebsites] = useState<Website[]>(
    initialUser.profile?.blogroll?.map((item: any, index: number) => ({
      id: item.id || index.toString(),
      label: item.label || "",
      url: item.url || "",
      blurb: item.blurb || ""
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
        setSaveMessage("Pixel Home updated successfully!");
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        throw new Error('Failed to update pixel home');
      }
    } catch (error) {
      setSaveMessage("Failed to update pixel home. Please try again.");
      setTimeout(() => setSaveMessage(null), 3000);
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

  const isAdmin = initialUser.role === "admin";
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
    setSaveMessage("Profile photo uploaded successfully!");
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveMessage(null);

    try {
      const capRes = await fetch("/api/cap/profile", { method: "POST" });
      if (capRes.status === 401) {
        setSaveMessage("Error: Please log in.");
        setSaving(false);
        return;
      }
      const { token } = await capRes.json();

      const blogroll = websites.filter(w => w.label.trim() && w.url.trim()).map(w => ({
        id: w.id,
        label: w.label,
        url: w.url,
        blurb: w.blurb || ""
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
          visibility,
          blogroll,
          featuredFriends: featuredFriendsData,
          cap: token
        }),
      });

      if (response.ok) {
        setSaveMessage("Profile saved successfully!");
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        const errorData = await response.json();
        setSaveMessage(`Error: ${errorData.error || "Failed to save profile"}`);
      }
    } catch (error) {
      setSaveMessage(`Error: ${error}`);
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
      setSaveMessage("New recovery seed phrase generated! Please save it securely.");
      await loadCurrentIdentity();
    } catch (e: unknown) {
      setSaveMessage(`Error: ${(e as Error).message || 'Failed to generate seed phrase'}`);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRegenerateSeedPhrase() {
    const passwordWarning = (hasPasswordAuth || isPasswordAuth()) ?
      '• You\'ll be asked for your password to keep password login working\n' : '';

    const confirmed = confirm(
      'Are you sure you want to generate a new seed phrase?\n\n' +
      'This will:\n' +
      '• Create a completely new 12-word recovery phrase\n' +
      '• Replace your current recovery phrase (if any)\n' +
      '• Log you out and back in with new credentials\n' +
      '• Require you to save the new phrase securely\n' +
      passwordWarning +
      '\nYour old recovery phrase will no longer work. Continue?'
    );

    if (!confirmed) return;

    try {
      setIsLoading(true);
      setSaveMessage("Generating new seed phrase and updating your account...");

      const newSeed = await generateSeedPhrase();
      await updateIdentityWithSeedPhrase(newSeed, true);

      // If user has password auth, we need to update their encrypted seed phrase too
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
              body: JSON.stringify({ encryptedSeedPhrase: newEncryptedSeed })
            });

            if (!response.ok) {
              console.error('Failed to update encrypted seed phrase on server');
            } else {
              // Update local storage too
              localStorage.setItem('retro_encrypted_seed_v1', newEncryptedSeed);
            }
          }
        } catch (error) {
          console.error('Failed to update password encryption:', error);
          setSaveMessage("Warning: New seed phrase generated but password login may not work. Please add password authentication again if needed.");
        }
      }

      setSeedPhrase(newSeed);
      setSaveMessage("New recovery seed phrase generated! Please save it securely.");
      await loadCurrentIdentity();
    } catch (e: unknown) {
      setSaveMessage(`Error: ${(e as Error).message || 'Failed to generate new seed phrase'}`);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRecoverFromSeed() {
    if (!recoveryPhrase.trim()) {
      setSaveMessage("Please enter your recovery phrase");
      return;
    }

    try {
      setIsLoading(true);
      setSaveMessage("Recovering account from seed phrase...");
      await recoverFromSeedPhrase(recoveryPhrase.trim());

      // If user has password auth, we need to update their encrypted seed phrase too
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
              body: JSON.stringify({ encryptedSeedPhrase: newEncryptedSeed })
            });

            if (response.ok) {
              localStorage.setItem('retro_encrypted_seed_v1', newEncryptedSeed);
            }
          }
        } catch (error) {
          console.error('Failed to update password encryption:', error);
        }
      }

      await loadCurrentIdentity();
      setRecoveryPhrase("");
      setShowRecovery(false);
      setSaveMessage("Account recovered successfully!");
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: unknown) {
      setSaveMessage(`Error: ${(e as Error).message || 'Failed to recover from seed phrase'}`);
    } finally {
      setIsLoading(false);
    }
  }

  // Password management functions
  async function handleAddPassword() {
    if (newPassword !== confirmNewPassword) {
      setSaveMessage("Passwords do not match");
      return;
    }

    const validation = validatePasswordStrength(newPassword);
    if (!validation.valid) {
      setSaveMessage(validation.errors[0]);
      return;
    }

    try {
      setIsLoading(true);
      setSaveMessage("Adding password authentication...");
      await addPasswordToAccount(newPassword);
      await loadCurrentIdentity();
      setNewPassword('');
      setConfirmNewPassword('');
      setShowPasswordSection(false);
      setHasPasswordAuth(true); // Update state immediately
      setSaveMessage("Password authentication added successfully! You can now sign in with either your password or seed phrase.");
    } catch (e: unknown) {
      setSaveMessage(`Error: ${(e as Error).message || 'Failed to add password authentication'}`);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleChangePassword() {
    if (newPasswordChange !== confirmNewPasswordChange) {
      setSaveMessage("New passwords do not match");
      return;
    }

    const validation = validatePasswordStrength(newPasswordChange);
    if (!validation.valid) {
      setSaveMessage(validation.errors[0]);
      return;
    }

    try {
      setIsLoading(true);
      setSaveMessage("Changing password...");

      // Import and use the changePassword function from did-client
      const { changePassword } = await import('@/lib/api/did/did-client');
      await changePassword(currentPassword, newPasswordChange);

      // Reset form
      setCurrentPassword('');
      setNewPasswordChange('');
      setConfirmNewPasswordChange('');
      setShowPasswordChangeSection(false);
      setChangePasswordErrors([]);

      setSaveMessage("Password changed successfully!");
    } catch (e: unknown) {
      setSaveMessage(`Error: ${(e as Error).message || 'Failed to change password'}`);
    } finally {
      setIsLoading(false);
    }
  }

  // Email management functions
  async function handleSetEmail() {
    if (!emailInput.trim()) {
      setSaveMessage("Please enter an email address");
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
          setSaveMessage(data.message);
        } else {
          setUserEmail(emailInput.trim());
          setEmailVerifiedAt(null);
          setEmailInput('');
          setShowEmailSection(false);
          setSaveMessage("Email updated successfully!");
        }
      } else {
        const error = await response.json();
        setSaveMessage(`Error: ${error.error || 'Failed to update email'}`);
      }
    } catch {
      setSaveMessage("Failed to update email. Please try again.");
    } finally {
      setIsEmailLoading(false);
    }
  }

  async function handleRemoveEmail() {
    if (!confirm('Are you sure you want to remove your email address? You will no longer be able to use email login.')) {
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
        setSaveMessage("Email address removed successfully!");
      } else {
        const error = await response.json();
        setSaveMessage(`Error: ${error.error || 'Failed to remove email'}`);
      }
    } catch {
      setSaveMessage("Failed to remove email. Please try again.");
    } finally {
      setIsEmailLoading(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setSaveMessage("Copied to clipboard!");
      setTimeout(() => setSaveMessage(null), 2000);
    }).catch(() => {
      setSaveMessage("Failed to copy to clipboard");
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
            <p className="text-gray-600 mb-6">
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
                className="w-full max-w-md border border-black p-3 bg-white rounded-none focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="Your display name"
              />
            </div>

            <div>
              <label className="block mb-2">
                <span className="font-bold text-black">Bio</span>
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="w-full max-w-xl border border-black p-3 bg-white rounded-none focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="Tell people about yourself..."
              />
            </div>

            <div>
              <label className="block mb-2">
                <span className="font-bold text-black">Profile Visibility</span>
              </label>
              <p className="text-sm text-gray-600 mb-3">
                Control who can see your profile and how your information appears in federated ThreadRings.
              </p>
              <div className="space-y-2">
                <label className="flex items-center p-3 border-2 border-black cursor-pointer hover:bg-yellow-50 transition-colors">
                  <input
                    type="radio"
                    name="visibility"
                    value="public"
                    checked={visibility === 'public'}
                    onChange={(e) => setVisibility(e.target.value as 'public')}
                    className="mr-3 w-5 h-5"
                  />
                  <div>
                    <div className="font-bold text-gray-900"><PixelIcon name="map" className="inline-block align-middle" /> Public</div>
                    <div className="text-sm text-gray-600">
                      Anyone can see your profile. Your name and avatar will be shared with federated instances.
                    </div>
                  </div>
                </label>
                <label className="flex items-center p-3 border-2 border-black cursor-pointer hover:bg-yellow-50 transition-colors">
                  <input
                    type="radio"
                    name="visibility"
                    value="followers"
                    checked={visibility === 'followers'}
                    onChange={(e) => setVisibility(e.target.value as 'followers')}
                    className="mr-3 w-5 h-5"
                  />
                  <div>
                    <div className="font-bold text-gray-900"><PixelIcon name="users" /> Followers Only</div>
                    <div className="text-sm text-gray-600">
                      Only people who follow you can see your profile. Limited federated sharing.
                    </div>
                  </div>
                </label>
                <label className="flex items-center p-3 border-2 border-black cursor-pointer hover:bg-yellow-50 transition-colors">
                  <input
                    type="radio"
                    name="visibility"
                    value="friends"
                    checked={visibility === 'friends'}
                    onChange={(e) => setVisibility(e.target.value as 'friends')}
                    className="mr-3 w-5 h-5"
                  />
                  <div>
                    <div className="font-bold text-gray-900"><PixelIcon name="users" className="inline-block align-middle" /> Friends Only</div>
                    <div className="text-sm text-gray-600">
                      Only mutual friends can see your profile. Limited federated sharing.
                    </div>
                  </div>
                </label>
                <label className="flex items-center p-3 border-2 border-black cursor-pointer hover:bg-yellow-50 transition-colors">
                  <input
                    type="radio"
                    name="visibility"
                    value="private"
                    checked={visibility === 'private'}
                    onChange={(e) => setVisibility(e.target.value as 'private')}
                    className="mr-3 w-5 h-5"
                  />
                  <div>
                    <div className="font-bold text-gray-900"><PixelIcon name="lock" className="inline-block align-middle" /> Private</div>
                    <div className="text-sm text-gray-600">
                      Only you can see your profile. Minimal federated sharing (profile link only).
                    </div>
                  </div>
                </label>
              </div>
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 text-sm text-gray-700">
                <strong>Federated ThreadRings:</strong> Your profile link is always shared when you join federated rings.
                If set to Public, your name and avatar will also be shared. Other visibility settings share only the link.
              </div>
            </div>

            <div className="border-t border-black pt-6">
              <ProfilePhotoUpload
                currentAvatarUrl={avatarUrl}
                onUploadSuccess={handlePhotoUploadSuccess}
                disabled={saving}
              />
            </div>

            <div className="border-t border-black pt-6">
              <WebsiteManager
                websites={websites}
                onChange={setWebsites}
                maxWebsites={10}
              />
            </div>

            <div className="border-t border-black pt-6">
              <FriendManager
                selectedFriends={featuredFriends}
                onChange={setFeaturedFriends}
                maxFriends={8}
              />
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="px-4 py-3 border border-black bg-yellow-200 hover:bg-yellow-100 shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] disabled:opacity-50 min-h-[48px]"
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </div>
      )
    },
    {
      id: "appearance",
      label: <><PixelIcon name="paint-bucket" /> Appearance</>,
      content: (
        <div className="space-y-6 px-4 sm:px-0">
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-2 text-gray-900">Profile Customization</h2>
            <p className="text-gray-600 mb-6">
              Choose how you want to customize your profile - from simple styling to advanced layouts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* CSS Styling - Simplest */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-400 rounded-lg p-6 text-center shadow-md relative">
              <div className="absolute top-2 right-2 bg-green-500 text-white text-sm px-2 py-1 rounded font-bold">
                SIMPLEST
              </div>
              <div className="mb-3">
                <PixelIcon name="bookmark" size={32} />
              </div>
              <h3 className="text-lg font-bold mb-2 text-gray-900">CSS Styling</h3>
              <p className="text-sm text-gray-700 mb-4">
                Change colors, fonts, and spacing on your default layout. Perfect for quick customization.
              </p>
              <a
                href={`/resident/${username}/css-editor`}
                className="px-4 py-3 bg-green-500 hover:bg-green-600 !text-white font-medium rounded shadow-md transition-all inline-block no-underline text-sm min-h-[48px] flex items-center justify-center"
              >
                Open CSS Editor →
              </a>
              <p className="text-sm text-gray-600 mt-2">5 minutes</p>
            </div>

            {/* Visual Builder */}
            <div className="bg-white border-2 border-purple-300 rounded-lg p-6 text-center shadow-md">
              <div className="mb-3">
                <PixelIcon name="building" size={48} />
              </div>
              <h3 className="text-lg font-bold mb-2 text-gray-900">Visual Builder</h3>
              <p className="text-sm text-gray-700 mb-4">
                Drag & drop custom layouts with grid positioning. Build unique page structures.
              </p>
              <a
                href={`/resident/${username}/template-editor?mode=visual`}
                className="px-4 py-3 bg-purple-500 hover:bg-purple-600 !text-white font-medium rounded shadow-md transition-all inline-block no-underline text-sm min-h-[48px] flex items-center justify-center"
              >
                Open Visual Builder →
              </a>
              <p className="text-sm text-gray-600 mt-2">30 minutes</p>
            </div>

            {/* Template Language */}
            <div className="bg-white border-2 border-blue-300 rounded-lg p-6 text-center shadow-md">
              <div className="mb-3">
                <PixelIcon name="code" size={48} />
              </div>
              <h3 className="text-lg font-bold mb-2 text-gray-900">Template Code</h3>
              <p className="text-sm text-gray-700 mb-4">
                Code dynamic features with variables, loops, and conditionals. For developers.
              </p>
              <a
                href={`/resident/${username}/template-editor?mode=template`}
                className="px-4 py-3 bg-blue-500 hover:bg-blue-600 !text-white font-medium rounded shadow-md transition-all inline-block no-underline text-sm min-h-[48px] flex items-center justify-center"
              >
                Open Code Editor →
              </a>
              <p className="text-sm text-gray-600 mt-2">1+ hour</p>
            </div>
          </div>

          {/* Help Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Not sure which to choose?</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Just want to change colors?</strong> Start with CSS Styling</li>
              <li>• <strong>Want to build custom layouts?</strong> Try Visual Builder</li>
              <li>• <strong>Need dynamic features?</strong> Use Template Code</li>
            </ul>
            <Link
              href="/templates"
              className="text-sm text-blue-600 hover:underline mt-2 inline-block"
            >
              Learn more about customization options →
            </Link>
          </div>

          {/* Reset Section */}
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2"><PixelIcon name="reload" /> Reset to Default</h4>
            <p className="text-sm text-gray-700 mb-3">
              Want to start fresh? Remove all your customizations and return your profile to the site&apos;s default appearance.
            </p>
            <button
              onClick={() => setShowResetModal(true)}
              className="px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded border border-gray-400 transition-colors text-sm min-h-[48px] flex items-center gap-2"
            >
              <PixelIcon name="reload" /> Reset to Default Template
            </button>
          </div>

          {/* Reset Confirmation Modal */}
          <ConfirmModal
            isOpen={showResetModal}
            title="Reset to Default Template?"
            message={
              <div className="space-y-3">
                <p className="text-gray-700">This will:</p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-2">
                  <li>Remove all your custom CSS</li>
                  <li>Remove any custom HTML templates</li>
                  <li>Return your profile to the site&apos;s default appearance</li>
                </ul>
                <p className="text-gray-900 font-semibold mt-4">This action cannot be undone.</p>
              </div>
            }
            confirmText="Yes, Reset to Default"
            cancelText="Cancel"
            variant="danger"
            onConfirm={async () => {
              try {
                // Clear CSS
                const cssResponse = await csrfFetch(`/api/profile/${username}/css`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ customCSS: '', cssMode: 'inherit' }),
                });

                // Clear template
                const templateResponse = await csrfFetch(`/api/profile/${username}/template`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ template: '', customCSS: '' }),
                });

                // Set mode to default
                const capRes = await csrfFetch("/api/cap/profile", { method: "POST" });
                const { token } = await capRes.json();

                const layoutResponse = await csrfFetch("/api/profile/update", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ templateMode: 'default', cap: token }),
                });

                if (cssResponse.ok && templateResponse.ok && layoutResponse.ok) {
                  showSuccess('Reset to default successfully!');
                  setTimeout(() => {
                    window.location.href = `/resident/${username}`;
                  }, 1000);
                } else {
                  showError('Failed to reset. Please try again.');
                }
              } catch (error) {
                showError(error instanceof Error ? error.message : 'Failed to reset');
              }
            }}
            onCancel={() => setShowResetModal(false)}
          />
        </div>
      )
    },
    {
      id: "pixel-home",
      label: <><PixelIcon name="home" /> Pixel Home</>,
      content: (
        <div className="space-y-6 px-4 sm:px-0">
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-2 text-gray-900">Pixel Home Customization</h2>
            <p className="text-gray-600 mb-6">
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
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-2 text-gray-900">Profile Music</h2>
            <p className="text-gray-600 mb-6">
              Add background music to your profile with MIDI files. Create the perfect soundtrack for your digital home.
            </p>
          </div>

          {/* Enhanced MIDI Manager */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <PixelIcon name="music" size={32} />
              <div>
                <h3 className="text-lg font-semibold text-purple-800">MIDI Music Manager</h3>
                <p className="text-sm text-purple-600">Upload and manage your profile&apos;s background music</p>
              </div>
            </div>

            <MidiManager username={username} />
          </div>

          {/* Music Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-semibold text-blue-800"><PixelIcon name="lightbulb" className="inline-block align-middle" /> Music Tips</h4>
              <Link
                href="/help/music-guide"
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium"
              >
                Full Guide →
              </Link>
            </div>
            <div className="text-sm text-blue-700 space-y-2">
              <p>• <strong>MIDI files are perfect</strong> for profile music - they&apos;re tiny, load instantly, and create a nostalgic web atmosphere</p>
              <p>• <strong>Keep it subtle</strong> - background music should enhance, not distract from your content</p>
              <p>• <strong>Consider your visitors</strong> - some prefer browsing without sound, so make music easy to control</p>
              <p>• <strong>Shorter loops work best</strong> - 30-60 second tracks that loop seamlessly are ideal</p>
              <p>• <strong>Need help getting started?</strong> Check our <Link href="/help/music-guide" className="underline hover:text-blue-900">complete music creator&apos;s guide</Link> for technical specs, composition tips, and software recommendations</p>
            </div>
          </div>
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
            <p className="text-gray-600 mb-6">
              Manage your identity, keys, email, and account security.
            </p>
          </div>

          {/* Seed Phrase Management */}
          <div className="bg-white border border-black rounded-none p-6 shadow-[3px_3px_0_#000]">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900">
              <PixelIcon name="drop" />
              Recovery Seed Phrase
            </h3>
            <p className="text-gray-600 mb-4">
              Your seed phrase is a 12-word backup that can recover your account if you lose access.
            </p>

            {!currentSeedPhrase ? (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded mb-4">
                <p className="text-amber-800 font-medium mb-2"><PixelIcon name="alert" /> No seed phrase recovery set</p>
                <p className="text-amber-700 text-sm mb-3">
                  Generate a seed phrase to enable account recovery. This is highly recommended for account security.
                </p>
                <button
                  onClick={handleGenerateSeedPhrase}
                  disabled={isLoading}
                  className="px-4 py-3 border border-black bg-yellow-200 hover:bg-yellow-100 shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] disabled:opacity-50 min-h-[48px]"
                >
                  {isLoading ? "Generating..." : "Generate Seed Phrase"}
                </button>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 p-4 rounded mb-4">
                <p className="text-green-800 font-medium mb-2"><PixelIcon name="check" className="inline-block align-middle" /> Seed phrase recovery is enabled</p>
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded mb-3">
                  <p className="text-yellow-800 font-medium mb-2"><PixelIcon name="reload" className="inline-block align-middle" /> Need a new recovery phrase?</p>
                  <p className="text-yellow-700 text-sm mb-3">
                    Generate a completely new 12-word recovery phrase. This will replace your current one and log you back in with new credentials.
                  </p>
                  <button
                    onClick={handleRegenerateSeedPhrase}
                    disabled={isLoading}
                    className="px-3 py-3 text-sm bg-yellow-100 hover:bg-yellow-200 border border-yellow-300 font-medium transition-all disabled:opacity-50 min-h-[48px]"
                  >
                    {isLoading ? "Regenerating..." : "Regenerate Seed Phrase"}
                  </button>
                </div>
              </div>
            )}

            {/* Show seed phrase if just generated */}
            {seedPhrase && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded mb-4">
                <p className="text-blue-800 font-medium mb-2"><PixelIcon name="save" /> Your Recovery Seed Phrase</p>
                <p className="text-blue-700 text-sm mb-3">
                  <strong>Save these 12 words in order!</strong> You&apos;ll need them to recover your account.
                </p>
                <div className="bg-white border border-blue-300 p-3 rounded mb-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {seedPhrase.split(' ').map((word, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <span className="text-sm font-bold text-blue-600 w-6">{index + 1}.</span>
                        <span className="font-mono text-gray-900">{word}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => copyToClipboard(seedPhrase)}
                    className="px-3 py-3 text-sm bg-blue-100 hover:bg-blue-200 border border-blue-300 font-medium transition-all min-h-[48px]"
                  >
                    <PixelIcon name="clipboard" /> Copy
                  </button>
                  <button
                    onClick={() => downloadSeedPhrase(seedPhrase)}
                    className="px-3 py-3 text-sm bg-blue-100 hover:bg-blue-200 border border-blue-300 font-medium transition-all min-h-[48px]"
                  >
                    <PixelIcon name="save" /> Download
                  </button>
                  <button
                    onClick={() => setSeedPhrase("")}
                    className="px-3 py-3 text-sm bg-gray-100 hover:bg-gray-200 border border-gray-300 font-medium transition-all min-h-[48px]"
                  >
                    <PixelIcon name="check" className="inline-block align-middle" /> I&apos;ve Saved It
                  </button>
                </div>
              </div>
            )}

            {/* Account Recovery */}
            <div className="border-t border-gray-200 pt-4">
              <button
                onClick={() => setShowRecovery(!showRecovery)}
                className="px-4 py-3 text-sm bg-white hover:bg-gray-100 border border-black shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] min-h-[48px]"
              >
                <PixelIcon name="reload" /> Recover Account from Seed Phrase
              </button>

              {showRecovery && (
                <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded">
                  <p className="text-sm text-gray-600 mb-3">
                    Enter your 12-word recovery phrase to restore your account. This will replace your current identity.
                  </p>
                  <textarea
                    value={recoveryPhrase}
                    onChange={(e) => setRecoveryPhrase(e.target.value)}
                    placeholder="Enter your 12-word recovery phrase separated by spaces..."
                    className="w-full h-24 text-sm border border-gray-300 p-3 resize-none bg-white rounded"
                    disabled={isLoading}
                  />
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <button
                      onClick={handleRecoverFromSeed}
                      disabled={isLoading || !recoveryPhrase.trim()}
                      className="px-4 py-3 text-sm bg-blue-200 hover:bg-blue-100 border border-black font-medium transition-all disabled:opacity-50 min-h-[48px]"
                    >
                      {isLoading ? "Recovering..." : "Recover Account"}
                    </button>
                    <button
                      onClick={() => setShowRecovery(false)}
                      className="px-4 py-3 text-sm bg-gray-100 hover:bg-gray-200 border border-gray-300 font-medium transition-all min-h-[48px]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Password Authentication */}
          <div className="bg-white border border-black rounded-none p-6 shadow-[3px_3px_0_#000]">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900">
              <PixelIcon name="lock" />
              Password Authentication
            </h3>
            <p className="text-gray-600 mb-4">
              Add password login as an alternative to your seed phrase. You&apos;ll be able to sign in with either method.
            </p>

            {!hasPasswordAuth || !mounted ? (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded mb-4">
                <p className="text-blue-800 font-medium mb-2"><PixelIcon name="lightbulb" /> Enable password login</p>
                <p className="text-blue-700 text-sm mb-3">
                  Add a password to your account for easier login. Your seed phrase will still work and remains the most secure option.
                </p>

                {!showPasswordSection ? (
                  <button
                    onClick={() => setShowPasswordSection(true)}
                    className="px-4 py-3 border border-black bg-blue-200 hover:bg-blue-100 shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] min-h-[48px]"
                  >
                    Add Password Login
                  </button>
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
                        className="w-full px-3 py-2 border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isLoading}
                      />
                    </div>

                    {/* Password Requirements */}
                    <div className="bg-gray-50 border border-gray-200 rounded p-3">
                      <p className="text-sm font-bold text-gray-700 mb-2">Password Requirements:</p>
                      <ul className="text-sm space-y-1">
                        <li className={newPassword.length >= 8 ? "text-green-600" : "text-gray-500"}>
                          {newPassword.length >= 8 ? "✓" : "○"} At least 8 characters
                        </li>
                        <li className={/[a-z]/.test(newPassword) ? "text-green-600" : "text-gray-500"}>
                          {/[a-z]/.test(newPassword) ? "✓" : "○"} One lowercase letter
                        </li>
                        <li className={/[A-Z]/.test(newPassword) ? "text-green-600" : "text-gray-500"}>
                          {/[A-Z]/.test(newPassword) ? "✓" : "○"} One uppercase letter
                        </li>
                        <li className={/[0-9]/.test(newPassword) ? "text-green-600" : "text-gray-500"}>
                          {/[0-9]/.test(newPassword) ? "✓" : "○"} One number
                        </li>
                      </ul>
                    </div>

                    <div className="flex gap-3 flex-wrap">
                      <button
                        onClick={handleAddPassword}
                        disabled={isLoading || !newPassword || !confirmNewPassword || passwordErrors.length > 0}
                        className="px-4 py-3 bg-green-200 hover:bg-green-100 border border-black shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] disabled:opacity-50 min-h-[48px]"
                      >
                        {isLoading ? "Adding..." : "Add Password"}
                      </button>
                      <button
                        onClick={() => {
                          setShowPasswordSection(false);
                          setNewPassword('');
                          setConfirmNewPassword('');
                          setPasswordErrors([]);
                        }}
                        disabled={isLoading}
                        className="px-4 py-3 text-sm bg-gray-100 hover:bg-gray-200 border border-gray-300 font-medium transition-all disabled:opacity-50 min-h-[48px]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 p-4 rounded mb-4">
                <p className="text-green-800 font-medium mb-2"><PixelIcon name="check" className="inline-block align-middle" /> Password authentication is enabled</p>
                <p className="text-green-700 text-sm mb-4">
                  You can now sign in using either your password or your seed phrase.
                </p>

                {/* Change Password Section */}
                {!showPasswordChangeSection ? (
                  <button
                    onClick={() => setShowPasswordChangeSection(true)}
                    className="px-4 py-3 text-sm bg-blue-100 hover:bg-blue-200 border border-blue-300 font-medium transition-all min-h-[48px]"
                  >
                    Change Password
                  </button>
                ) : (
                  <div className="bg-white border border-gray-200 rounded p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-gray-800 text-gray-900">
                        {showForgotPassword ? "Reset Password with Seed Phrase" : "Change Password"}
                      </h4>
                      {!showForgotPassword ? (
                        <button
                          onClick={() => setShowForgotPassword(true)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Forgot Password?
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowForgotPassword(false)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Back to Change Password
                        </button>
                      )}
                    </div>

                    {showForgotPassword ? (
                      // RESET PASSWORD FORM
                      <>
                        <div className="flex gap-4 mb-4 border-b border-gray-200">
                          <button
                            className={`px-3 py-2 ${resetMode === 'seed' ? 'font-bold border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setResetMode('seed')}
                          >
                            Use Seed Phrase
                          </button>
                          <button
                            className={`px-3 py-2 ${resetMode === 'email' ? 'font-bold border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
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
                                className="w-full px-3 py-2 border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 font-mono text-sm"
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
                                className="w-full px-3 py-2 border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                className="w-full px-3 py-2 border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={isLoading}
                              />
                            </div>

                            {/* Reusing existing password requirements display logic */}
                            {newPasswordChange && (
                              <div className="bg-gray-50 border border-gray-200 rounded p-3">
                                <p className="text-sm font-bold text-gray-700 mb-2">Password Requirements:</p>
                                <ul className="text-sm space-y-1">
                                  <li className={newPasswordChange.length >= 8 ? "text-green-600" : "text-gray-500"}>
                                    {newPasswordChange.length >= 8 ? "✓" : "○"} At least 8 characters
                                  </li>
                                  <li className={/[a-z]/.test(newPasswordChange) ? "text-green-600" : "text-gray-500"}>
                                    {/[a-z]/.test(newPasswordChange) ? "✓" : "○"} One lowercase letter
                                  </li>
                                  <li className={/[A-Z]/.test(newPasswordChange) ? "text-green-600" : "text-gray-500"}>
                                    {/[A-Z]/.test(newPasswordChange) ? "✓" : "○"} One uppercase letter
                                  </li>
                                  <li className={/[0-9]/.test(newPasswordChange) ? "text-green-600" : "text-gray-500"}>
                                    {/[0-9]/.test(newPasswordChange) ? "✓" : "○"} One number
                                  </li>
                                </ul>
                              </div>
                            )}

                            <div className="flex gap-3 flex-wrap">
                              <button
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
                                    setSaveMessage("Password reset successfully! You can now login with your new password.");
                                    setShowPasswordChangeSection(false);
                                    setShowForgotPassword(false);
                                    setResetSeedPhrase('');
                                    setNewPasswordChange('');
                                    setConfirmNewPasswordChange('');

                                    // Reload identity to ensure local state is consistent if needed
                                    // (Actually, we should probably update local storage encrypted seed too, 
                                    // but for now, the server state is correct, and next login will sync)

                                  } catch (err) {
                                    setSaveMessage(`Error: ${err instanceof Error ? err.message : 'Failed to reset password'}`);
                                  } finally {
                                    setIsLoading(false);
                                  }
                                }}
                                disabled={isLoading || !resetSeedPhrase || !newPasswordChange || !confirmNewPasswordChange || changePasswordErrors.length > 0}
                                className="px-4 py-3 bg-green-200 hover:bg-green-100 border border-black shadow-[2px_2px_0_#000] font-medium transition-all disabled:opacity-50 min-h-[48px]"
                              >
                                {isLoading ? "Resetting..." : "Reset Password"}
                              </button>
                              <button
                                onClick={() => {
                                  setShowPasswordChangeSection(false);
                                  setShowForgotPassword(false);
                                }}
                                disabled={isLoading}
                                className="px-4 py-3 text-sm bg-gray-100 hover:bg-gray-200 border border-gray-300 font-medium transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          </>
                        ) : (
                          // EMAIL FORM
                          <div className="space-y-4 pt-2">
                            <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm text-blue-800">
                              <PixelIcon name="mail" className="inline-block mr-1" />
                              Enter your verified email address. We&apos;ll send you a link to reset your password.
                            </div>

                            {emailResetStatus === 'sent' ? (
                              <div className="text-center p-4 bg-green-50 rounded border border-green-200">
                                <p className="text-green-700 font-bold mb-2">Email Sent!</p>
                                <p className="text-sm">Check {resetEmail} for the reset link.</p>
                                <button onClick={() => { setEmailResetStatus('idle'); setResetMode('seed'); setShowForgotPassword(false); setShowPasswordChangeSection(false); }} className="mt-4 text-blue-600 hover:underline text-sm">Close</button>
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
                                    className="w-full px-3 py-2 border border-gray-300 rounded"
                                    disabled={emailResetStatus === 'sending'}
                                  />
                                </div>
                                {emailResetStatus === 'error' && (
                                  <div className="text-red-500 text-sm mb-2">Error: {emailResetMessage}</div>
                                )}
                                <div className="flex gap-3">
                                  <button
                                    onClick={handleRequestEmailReset}
                                    disabled={!resetEmail || emailResetStatus === 'sending'}
                                    className="px-4 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 font-medium min-h-[48px]"
                                  >
                                    {emailResetStatus === 'sending' ? "Sending..." : "Send Reset Link"}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setShowPasswordChangeSection(false);
                                      setShowForgotPassword(false);
                                    }}
                                    disabled={emailResetStatus === 'sending'}
                                    className="px-4 py-3 text-sm bg-gray-100 hover:bg-gray-200 border border-gray-300 font-medium transition-all"
                                  >
                                    Cancel
                                  </button>
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
                            className="w-full px-3 py-2 border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isLoading}
                          />
                        </div>

                        {/* Password Requirements for Change */}
                        {newPasswordChange && (
                          <div className="bg-gray-50 border border-gray-200 rounded p-3">
                            <p className="text-sm font-bold text-gray-700 mb-2">Password Requirements:</p>
                            <ul className="text-sm space-y-1">
                              <li className={newPasswordChange.length >= 8 ? "text-green-600" : "text-gray-500"}>
                                {newPasswordChange.length >= 8 ? "✓" : "○"} At least 8 characters
                              </li>
                              <li className={/[a-z]/.test(newPasswordChange) ? "text-green-600" : "text-gray-500"}>
                                {/[a-z]/.test(newPasswordChange) ? "✓" : "○"} One lowercase letter
                              </li>
                              <li className={/[A-Z]/.test(newPasswordChange) ? "text-green-600" : "text-gray-500"}>
                                {/[A-Z]/.test(newPasswordChange) ? "✓" : "○"} One uppercase letter
                              </li>
                              <li className={/[0-9]/.test(newPasswordChange) ? "text-green-600" : "text-gray-500"}>
                                {/[0-9]/.test(newPasswordChange) ? "✓" : "○"} One number
                              </li>
                            </ul>
                          </div>
                        )}

                        <div className="flex gap-3 flex-wrap">
                          <button
                            onClick={handleChangePassword}
                            disabled={isLoading || !currentPassword || !newPasswordChange || !confirmNewPasswordChange || changePasswordErrors.length > 0}
                            className="px-4 py-3 bg-blue-200 hover:bg-blue-100 border border-black shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] disabled:opacity-50 min-h-[48px]"
                          >
                            {isLoading ? "Changing..." : "Change Password"}
                          </button>
                          <button
                            onClick={() => {
                              setShowPasswordChangeSection(false);
                              setCurrentPassword('');
                              setNewPasswordChange('');
                              setConfirmNewPasswordChange('');
                              setChangePasswordErrors([]);
                            }}
                            disabled={isLoading}
                            className="px-4 py-3 text-sm bg-gray-100 hover:bg-gray-200 border border-gray-300 font-medium transition-all disabled:opacity-50 min-h-[48px]"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Email Management */}
          <div className="bg-white border border-black rounded-none p-6 shadow-[3px_3px_0_#000]">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900">
              <PixelIcon name="mail" />
              Email Login
            </h3>
            <p className="text-gray-600 mb-4">
              Add an email address for magic link login and account recovery.
            </p>

            <div className="space-y-3">
              {userEmail ? (
                <div className="flex items-center gap-2">
                  {emailVerifiedAt ? (
                    <>
                      <span className="text-green-600 text-sm font-medium"><PixelIcon name="check" className="inline-block align-middle" /> {userEmail}</span>
                      <span className="text-sm text-gray-500">(verified)</span>
                    </>
                  ) : (
                    <>
                      <span className="text-amber-600 text-sm font-medium"><PixelIcon name="clock" /> {userEmail}</span>
                      <span className="text-sm text-gray-500">(pending verification)</span>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-gray-800 font-medium mb-2"><PixelIcon name="mail" className="inline-block align-middle" /> Email login not set</p>
              )}

              {userEmail ? (
                <div className="flex gap-2">
                  {emailVerifiedAt ? (
                    <p className="text-green-700 text-sm">
                      You can now login using magic links sent to this email address.
                    </p>
                  ) : (
                    <p className="text-amber-700 text-sm">
                      Check your email and click the verification link to enable email login.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-700 text-sm mb-3">
                  Add an email address to enable magic link login as an alternative to your DID key.
                </p>
              )}

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setShowEmailSection(!showEmailSection)}
                  className="px-3 py-3 text-sm bg-blue-100 hover:bg-blue-200 border border-blue-300 font-medium transition-all min-h-[48px]"
                >
                  {userEmail ? "Change Email" : "Add Email"}
                </button>
                {userEmail && (
                  <button
                    onClick={handleRemoveEmail}
                    disabled={isEmailLoading}
                    className="px-3 py-3 text-sm bg-red-100 hover:bg-red-200 border border-red-300 font-medium transition-all disabled:opacity-50 min-h-[48px]"
                  >
                    Remove Email
                  </button>
                )}
              </div>

              {showEmailSection && (
                <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded">
                  <h4 className="text-sm font-medium text-gray-800 mb-2">Set Email Address</h4>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-white"
                    disabled={isEmailLoading}
                  />
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={handleSetEmail}
                      disabled={isEmailLoading || !emailInput.trim()}
                      className="px-4 py-2 text-sm bg-blue-200 hover:bg-blue-100 border border-black font-medium transition-all disabled:opacity-50"
                    >
                      {isEmailLoading ? "Setting..." : "Set Email"}
                    </button>
                    <button
                      onClick={() => setShowEmailSection(false)}
                      className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 border border-gray-300 font-medium transition-all"
                    >
                      Cancel
                    </button>
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
            <p className="text-gray-600 mb-6">
              Manage which badges from your ThreadRings are displayed on your profile and posts.
            </p>
          </div>

          <ProfileBadgeSelector
            onSave={(preferences) => {
              setSaveMessage("Badge preferences saved successfully!");
              setTimeout(() => setSaveMessage(null), 3000);
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
            <p className="text-gray-600 mb-6">
              Manage your privacy settings, data consent preferences, and blocked users.
            </p>
          </div>

          {/* Consent Management */}
          <ConsentManager userId={initialUser.id} />

          {/* Data Export */}
          <div className="bg-white border border-black rounded-none p-6 shadow-[3px_3px_0_#000]">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <PixelIcon name="archive" />
              Export Your Data
            </h3>
            <p className="text-gray-600 mb-4">
              Download a complete copy of all your data in machine-readable JSON format. This includes posts, ThreadRing memberships, comments, media, profile data, and social connections.
            </p>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded mb-4">
              <h4 className="font-semibold text-blue-800 mb-2"><PixelIcon name="clipboard" className="inline-block align-middle" /> What&apos;s Included:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
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

            <button
              onClick={async () => {
                try {
                  setSaveMessage("Generating your data export...");
                  const response = await fetch('/api/user/export/data');

                  if (!response.ok) {
                    const error = await response.json();
                    setSaveMessage(`Error: ${error.error || 'Failed to export data'}`);
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

                  setSaveMessage("Data export downloaded successfully!");
                  setTimeout(() => setSaveMessage(null), 3000);
                } catch (error) {
                  setSaveMessage(`Error: ${error instanceof Error ? error.message : 'Failed to export data'}`);
                }
              }}
              className="px-4 py-3 border border-black bg-green-200 hover:bg-green-100 shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] min-h-[48px]"
            >
              <PixelIcon name="download" className="inline-block align-middle" /> Export All My Data
            </button>

            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded">
              <p className="text-sm text-gray-600">
                <strong>GDPR Compliance:</strong> This export provides your personal data in a structured, commonly used, and machine-readable format as required by data protection regulations.
              </p>
            </div>
          </div>

          {/* Blocking Management */}
          <div className="bg-blue-50 border border-black rounded-none p-4 shadow-[2px_2px_0_#000]">
            <h3 className="text-lg font-bold mb-2 text-gray-900">User & Community Blocking</h3>
            <p className="text-sm text-gray-700 mb-3">
              <strong>Blocked users and communities are managed separately.</strong>
            </p>
            <Link
              href="/settings/blocks"
              className="px-4 py-2 border border-black bg-yellow-200 hover:bg-yellow-100 shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] inline-block no-underline text-sm"
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
            <p className="text-gray-600 mb-6">
              Share beta access with friends using your personal invite codes.
            </p>
          </div>

          <BetaInviteCodesManager />
        </div>
      )
    }] : [])
  ];

  // Add admin tab for admins
  if (isAdmin) {
    settingsTabs.push({
      id: "admin",
      label: <><PixelIcon name="sliders" /> Admin</>,
      content: (
        <div className="space-y-6 px-4 sm:px-0">
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-2">Admin Panel</h2>
            <p className="text-gray-600 mb-6">
              Administrative tools and site management.
            </p>
          </div>

          <div className="bg-orange-50 border border-black rounded-none p-4 shadow-[2px_2px_0_#000]">
            <p className="text-sm text-gray-700 mb-2">
              <strong>Admin features are available in the dedicated admin panel.</strong>
            </p>
            <Link
              href="/settings/admin"
              className="px-4 py-3 border border-black bg-yellow-200 hover:bg-yellow-100 shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] inline-block no-underline text-sm min-h-[48px] flex items-center"
            >
              Open Admin Panel →
            </Link>
          </div>
        </div>
      )
    });
  }



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
                className="px-4 py-3 border border-black bg-white hover:bg-gray-100 shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] no-underline min-h-[48px] flex items-center"
              >
                View Profile
              </a>
            </div>
          </div>

          {saveMessage && (
            <div className={`mb-4 p-3 rounded mx-4 sm:mx-0 ${saveMessage.includes("Error")
              ? "bg-red-100 text-red-700 border border-red-300"
              : "bg-green-100 text-green-700 border border-green-300"
              }`}>
              {saveMessage}
            </div>
          )}

          <Tabs tabs={settingsTabs} initialId={router.query.tab as string || "profile"} />
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
        destination: '/identity',
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
          destination: '/identity',
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
            avatarUrl: userData.profile.avatarUrl || null,
            customCSS: userData.profile.customCSS || null,
            templateEnabled: userData.profile.templateEnabled ?? null,
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