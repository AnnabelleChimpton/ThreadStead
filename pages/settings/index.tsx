import React, { useState, useEffect } from "react";
import { GetServerSideProps, NextApiRequest } from "next";
import { useRouter } from "next/router";
import Head from "next/head";
import Layout from "@/components/Layout";
import RetroCard from "@/components/layout/RetroCard";
import Tabs, { TabSpec } from "@/components/navigation/Tabs";
import { getSessionUser } from "@/lib/auth-server";
import { useCurrentUser } from "@/hooks/useCurrentUser";

// Import existing components
import ProfilePhotoUpload from "@/components/ProfilePhotoUpload";
import WebsiteManager, { Website } from "@/components/WebsiteManager";
import FriendManager, { SelectedFriend } from "@/components/FriendManager";
import ProfileBadgeSelector from "@/components/ProfileBadgeSelector";
import BetaInviteCodesManager from "@/components/BetaInviteCodesManager";
import MidiManager from "@/components/MidiManager";
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
} from "@/lib/did-client";
import { validatePasswordStrength } from "@/lib/password-auth";
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
      avatarUrl?: string | null;
      customCSS?: string | null;
      templateEnabled?: boolean | null;
      hideNavigation?: boolean | null;
      templateMode?: 'default' | 'enhanced' | 'advanced' | null;
      blogroll?: any[] | null;
      featuredFriends?: any[] | null;
    } | null;
  };
}

export default function UnifiedSettingsPage({ initialUser }: UserSettingsProps) {
  const router = useRouter();
  const { user: currentUser } = useCurrentUser();
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Profile state
  const [displayName, setDisplayName] = useState(initialUser.profile?.displayName || "");
  const [bio, setBio] = useState(initialUser.profile?.bio || "");
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

  const isAdmin = initialUser.role === "admin";
  const username = React.useMemo(() => initialUser.primaryHandle?.split("@")[0] || "", [initialUser.primaryHandle]);

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

      const response = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          displayName, 
          bio, 
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
            const { encryptSeedPhraseWithPassword } = await import('@/lib/password-auth');
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
            const { encryptSeedPhraseWithPassword } = await import('@/lib/password-auth');
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
      const { changePassword } = await import('@/lib/did-client');
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
      label: "👤 Profile",
      content: (
        <div className="space-y-6">
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
              className="px-4 py-2 border border-black bg-yellow-200 hover:bg-yellow-100 shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </div>
      )
    },
    {
      id: "appearance",
      label: "🎨 Appearance", 
      content: (
        <div className="space-y-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-2">Profile Appearance</h2>
            <p className="text-gray-600 mb-6">
              Customize how your profile looks with CSS, templates, and badges.
            </p>
          </div>

          <div className="max-w-md mx-auto">
            <div className="bg-white border border-black rounded-none p-6 text-center shadow-[3px_3px_0_#000]">
              <div className="mb-4">
                <span className="text-5xl">Profile Editor</span>
              </div>
              <h3 className="text-lg font-bold mb-2">Profile Layout Editor</h3>
              <p className="text-sm text-gray-600 mb-4">
                Design your profile with templates, components, and custom CSS - all in one place
              </p>
              <a
                href={`/resident/${username}/template-editor`}
                className="px-4 py-2 border border-black bg-yellow-200 hover:bg-yellow-100 shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] inline-block no-underline"
              >
                Open Profile Layout Editor →
              </a>
            </div>
          </div>


          {/* MIDI Music Section */}
          <div className="border-t border-black pt-6">
            <MidiManager username={username} />
          </div>
        </div>
      )
    },
    {
      id: "account",
      label: "🔐 Account & Security", 
      content: (
        <div className="space-y-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-2">Account & Security</h2>
            <p className="text-gray-600 mb-6">
              Manage your identity, keys, email, and account security.
            </p>
          </div>

          {/* Seed Phrase Management */}
          <div className="bg-white border border-black rounded-none p-6 shadow-[3px_3px_0_#000]">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span>🌱</span>
              Recovery Seed Phrase
            </h3>
            <p className="text-gray-600 mb-4">
              Your seed phrase is a 12-word backup that can recover your account if you lose access.
            </p>
            
            {!currentSeedPhrase ? (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded mb-4">
                <p className="text-amber-800 font-medium mb-2">⚠ No seed phrase recovery set</p>
                <p className="text-amber-700 text-sm mb-3">
                  Generate a seed phrase to enable account recovery. This is highly recommended for account security.
                </p>
                <button
                  onClick={handleGenerateSeedPhrase}
                  disabled={isLoading}
                  className="px-4 py-2 border border-black bg-yellow-200 hover:bg-yellow-100 shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] disabled:opacity-50"
                >
                  {isLoading ? "Generating..." : "Generate Seed Phrase"}
                </button>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 p-4 rounded mb-4">
                <p className="text-green-800 font-medium mb-2">✓ Seed phrase recovery is enabled</p>
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded mb-3">
                  <p className="text-yellow-800 font-medium mb-2">🔄 Need a new recovery phrase?</p>
                  <p className="text-yellow-700 text-sm mb-3">
                    Generate a completely new 12-word recovery phrase. This will replace your current one and log you back in with new credentials.
                  </p>
                  <button
                    onClick={handleRegenerateSeedPhrase}
                    disabled={isLoading}
                    className="px-3 py-2 text-sm bg-yellow-100 hover:bg-yellow-200 border border-yellow-300 font-medium transition-all disabled:opacity-50"
                  >
                    {isLoading ? "Regenerating..." : "Regenerate Seed Phrase"}
                  </button>
                </div>
              </div>
            )}

            {/* Show seed phrase if just generated */}
            {seedPhrase && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded mb-4">
                <p className="text-blue-800 font-medium mb-2">💾 Your Recovery Seed Phrase</p>
                <p className="text-blue-700 text-sm mb-3">
                  <strong>Save these 12 words in order!</strong> You&apos;ll need them to recover your account.
                </p>
                <div className="bg-white border border-blue-300 p-3 rounded mb-3">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {seedPhrase.split(' ').map((word, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <span className="text-xs font-bold text-blue-600 w-6">{index + 1}.</span>
                        <span className="font-mono">{word}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(seedPhrase)}
                    className="px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 border border-blue-300 font-medium transition-all"
                  >
                    📋 Copy
                  </button>
                  <button
                    onClick={() => downloadSeedPhrase(seedPhrase)}
                    className="px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 border border-blue-300 font-medium transition-all"
                  >
                    💾 Download
                  </button>
                  <button
                    onClick={() => setSeedPhrase("")}
                    className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 border border-gray-300 font-medium transition-all"
                  >
                    ✓ I&apos;ve Saved It
                  </button>
                </div>
              </div>
            )}

            {/* Account Recovery */}
            <div className="border-t border-gray-200 pt-4">
              <button
                onClick={() => setShowRecovery(!showRecovery)}
                className="px-4 py-2 text-sm bg-white hover:bg-gray-100 border border-black shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000]"
              >
                🔄 Recover Account from Seed Phrase
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
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={handleRecoverFromSeed}
                      disabled={isLoading || !recoveryPhrase.trim()}
                      className="px-4 py-2 text-sm bg-blue-200 hover:bg-blue-100 border border-black font-medium transition-all disabled:opacity-50"
                    >
                      {isLoading ? "Recovering..." : "Recover Account"}
                    </button>
                    <button
                      onClick={() => setShowRecovery(false)}
                      className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 border border-gray-300 font-medium transition-all"
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
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span>🔐</span>
              Password Authentication
            </h3>
            <p className="text-gray-600 mb-4">
              Add password login as an alternative to your seed phrase. You&apos;ll be able to sign in with either method.
            </p>
            
            {!hasPasswordAuth && !isPasswordAuth() ? (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded mb-4">
                <p className="text-blue-800 font-medium mb-2">💡 Enable password login</p>
                <p className="text-blue-700 text-sm mb-3">
                  Add a password to your account for easier login. Your seed phrase will still work and remains the most secure option.
                </p>
                
                {!showPasswordSection ? (
                  <button
                    onClick={() => setShowPasswordSection(true)}
                    className="px-4 py-2 border border-black bg-blue-200 hover:bg-blue-100 shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000]"
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

                    <div className="flex gap-3">
                      <button
                        onClick={handleAddPassword}
                        disabled={isLoading || !newPassword || !confirmNewPassword || passwordErrors.length > 0}
                        className="px-4 py-2 bg-green-200 hover:bg-green-100 border border-black shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] disabled:opacity-50"
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
                        className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 border border-gray-300 font-medium transition-all disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 p-4 rounded mb-4">
                <p className="text-green-800 font-medium mb-2">✓ Password authentication is enabled</p>
                <p className="text-green-700 text-sm mb-4">
                  You can now sign in using either your password or your seed phrase.
                </p>
                
                {/* Change Password Section */}
                {!showPasswordChangeSection ? (
                  <button
                    onClick={() => setShowPasswordChangeSection(true)}
                    className="px-4 py-2 text-sm bg-blue-100 hover:bg-blue-200 border border-blue-300 font-medium transition-all"
                  >
                    Change Password
                  </button>
                ) : (
                  <div className="bg-white border border-gray-200 rounded p-4 space-y-4">
                    <h4 className="font-bold text-gray-800">Change Password</h4>
                    
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

                    <div className="flex gap-3">
                      <button
                        onClick={handleChangePassword}
                        disabled={isLoading || !currentPassword || !newPasswordChange || !confirmNewPasswordChange || changePasswordErrors.length > 0}
                        className="px-4 py-2 bg-blue-200 hover:bg-blue-100 border border-black shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] disabled:opacity-50"
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
                        className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 border border-gray-300 font-medium transition-all disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Email Management */}
          <div className="bg-white border border-black rounded-none p-6 shadow-[3px_3px_0_#000]">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span>📧</span>
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
                      <span className="text-green-600 text-sm font-medium">✓ {userEmail}</span>
                      <span className="text-xs text-gray-500">(verified)</span>
                    </>
                  ) : (
                    <>
                      <span className="text-amber-600 text-sm font-medium">⏳ {userEmail}</span>
                      <span className="text-xs text-gray-500">(pending verification)</span>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-gray-800 font-medium mb-2">📧 Email login not set</p>
              )}

              {userEmail ? (
                <div className="flex gap-2">
                  {emailVerifiedAt ? (
                    <p className="text-green-700 text-xs">
                      You can now login using magic links sent to this email address.
                    </p>
                  ) : (
                    <p className="text-amber-700 text-xs">
                      Check your email and click the verification link to enable email login.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-700 text-xs mb-3">
                  Add an email address to enable magic link login as an alternative to your DID key.
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setShowEmailSection(!showEmailSection)}
                  className="px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 border border-blue-300 font-medium transition-all"
                >
                  {userEmail ? "Change Email" : "Add Email"}
                </button>
                {userEmail && (
                  <button
                    onClick={handleRemoveEmail}
                    disabled={isEmailLoading}
                    className="px-3 py-2 text-sm bg-red-100 hover:bg-red-200 border border-red-300 font-medium transition-all disabled:opacity-50"
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
      label: "🏆 Badges",
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
      label: "🚫 Privacy & Blocking",
      content: (
        <div className="space-y-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-2">Privacy & Blocking</h2>
            <p className="text-gray-600 mb-6">
              Manage blocked users and communities for a better experience.
            </p>
          </div>

          <div className="bg-blue-50 border border-black rounded-none p-4 shadow-[2px_2px_0_#000]">
            <p className="text-sm text-gray-700 mb-2">
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
    {
      id: "beta",
      label: "🎫 Beta Invites",
      content: (
        <div className="space-y-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-2">Beta Invite Codes</h2>
            <p className="text-gray-600 mb-6">
              Share beta access with friends using your personal invite codes.
            </p>
          </div>

          <BetaInviteCodesManager />
        </div>
      )
    }
  ];

  // Add admin tab for admins
  if (isAdmin) {
    settingsTabs.push({
      id: "admin",
      label: "⚙️ Admin",
      content: (
        <div className="space-y-6">
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
              className="px-4 py-2 border border-black bg-yellow-200 hover:bg-yellow-100 shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] inline-block no-underline text-sm"
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
      <Layout>
        <RetroCard>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Settings</h1>
            <div className="flex gap-2">
              <a 
                href={`/resident/${username}`}
                className="px-4 py-2 border border-black bg-white hover:bg-gray-100 shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] no-underline"
              >
                View Profile
              </a>
            </div>
          </div>

          {saveMessage && (
            <div className={`mb-4 p-3 rounded ${
              saveMessage.includes("Error") 
                ? "bg-red-100 text-red-700 border border-red-300" 
                : "bg-green-100 text-green-700 border border-green-300"
            }`}>
              {saveMessage}
            </div>
          )}

          <Tabs tabs={settingsTabs} initialId="profile" />
        </RetroCard>
      </Layout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<UserSettingsProps> = async ({ req }) => {
  const { getSessionUser } = await import('@/lib/auth-server');
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
    const { db } = await import('@/lib/db');
    
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
            avatarUrl: userData.profile.avatarUrl || null,
            customCSS: userData.profile.customCSS || null,
            templateEnabled: userData.profile.templateEnabled ?? null,
            hideNavigation: userData.profile.hideNavigation ?? null,
            templateMode: (userData.profile.templateMode as 'default' | 'enhanced' | 'advanced') || null,
            blogroll: (userData.profile.blogroll as any[]) || null,
            featuredFriends: (userData.profile.featuredFriends as any[]) || null,
          } : null,
        },
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