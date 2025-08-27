import React, { useState, useEffect } from "react";
import { GetServerSidePropsContext } from "next";
import { NextApiRequest } from "next";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import { getSessionUser } from "@/lib/auth-server";
import { 
  getExistingDid, 
  exportIdentityToken, 
  importIdentityToken, 
  createNewIdentityWithSeedPhrase,
  recoverFromSeedPhrase,
  getSeedPhrase,
  generateSeedPhrase,
  updateIdentityWithSeedPhrase,
  LocalKeypair,
  SeedPhrase
} from "@/lib/did-client";
import UsernameSelector from "@/components/UsernameSelector";
import { useIdentitySync } from "@/hooks/useIdentitySync";
import Modal from "@/components/ui/Modal";
import Link from "next/link";

interface IdentityPageProps {
  initialUser?: { id: string; did: string; primaryHandle: string | null } | null;
}

export default function IdentityPage({ initialUser }: IdentityPageProps) {
  const router = useRouter();
  const { hasMismatch, fixMismatch } = useIdentitySync();
  const [currentIdentity, setCurrentIdentity] = useState<LocalKeypair | null>(null);
  const [currentSeedPhrase, setCurrentSeedPhrase] = useState<SeedPhrase | null>(null);
  const [exportToken, setExportToken] = useState<string>("");
  const [importToken, setImportToken] = useState<string>("");
  const [seedPhrase, setSeedPhrase] = useState<string>("");
  const [recoveryPhrase, setRecoveryPhrase] = useState<string>("");
  
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [showUsernameSelector, setShowUsernameSelector] = useState(false);
  const [showSeedPhraseStep, setShowSeedPhraseStep] = useState(false);
  const [showOptionalEmailStep, setShowOptionalEmailStep] = useState(false);
  const [newAccountEmail, setNewAccountEmail] = useState('');
  const [isNewAccountFlow, setIsNewAccountFlow] = useState(false);
  const [urlBetaKey, setUrlBetaKey] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Email management states
  const [userEmail, setUserEmail] = useState<string>('');
  const [emailVerifiedAt, setEmailVerifiedAt] = useState<Date | null>(null);
  const [showEmailSection, setShowEmailSection] = useState(false);
  const [emailInput, setEmailInput] = useState<string>('');
  const [isEmailLoading, setIsEmailLoading] = useState(false);

  async function loadCurrentIdentity() {
    try {
      const identity = getExistingDid();
      setCurrentIdentity(identity);
      const seedData = getSeedPhrase();
      setCurrentSeedPhrase(seedData);
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
   
  // Intentionally only run once on mount to initialize user identity
  }, []);

  // Read beta key from URL parameters
  useEffect(() => {
    if (router.isReady && router.query.beta && typeof router.query.beta === 'string') {
      setUrlBetaKey(router.query.beta);
    }
  }, [router.isReady, router.query.beta]);

  async function handleExport() {
    try {
      if (!currentIdentity) {
        setMessage({ type: 'error', text: 'No identity to export. Please create or import an identity first.' });
        return;
      }
      const token = await exportIdentityToken();
      setExportToken(token);
      setShowExport(true);
      setMessage({ type: 'success', text: 'Identity token exported successfully!' });
    } catch (e: unknown) {
      setMessage({ type: 'error', text: (e as Error).message || 'Failed to export identity' });
    }
  }

  async function handleImport() {
    if (!importToken.trim()) {
      setMessage({ type: 'error', text: 'Please enter an identity token' });
      return;
    }

    try {
      setIsLoading(true);
      setMessage({ type: 'success', text: 'Switching accounts... Logging out and logging in with new identity.' });
      await importIdentityToken(importToken.trim());
      await loadCurrentIdentity();
      setImportToken("");
      setShowImport(false);
      setMessage({ type: 'success', text: 'Identity imported and logged in successfully!' });
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: unknown) {
      setMessage({ type: 'error', text: (e as Error).message || 'Failed to import identity' });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGenerateSeedPhrase() {
    try {
      setIsLoading(true);
      // Generate a new seed phrase and upgrade the current identity with it
      const newSeed = await generateSeedPhrase();
      await updateIdentityWithSeedPhrase(newSeed, true); // Pass true to indicate this is a legacy user
      setSeedPhrase(newSeed);
      setShowSeedPhraseStep(true);
      setMessage({ type: 'success', text: 'New recovery seed phrase generated and attached to your account! Please save it securely.' });
      await loadCurrentIdentity();
    } catch (e: unknown) {
      setMessage({ type: 'error', text: (e as Error).message || 'Failed to generate or attach seed phrase' });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRegenerateSeedPhrase() {
    const confirmed = confirm(
      'Are you sure you want to generate a new seed phrase?\n\n' +
      'This will:\n' +
      '• Create a completely new 12-word recovery phrase\n' +
      '• Replace your current recovery phrase (if any)\n' +
      '• Log you out and back in with new credentials\n' +
      '• Require you to save the new phrase securely\n\n' +
      'Your old recovery phrase will no longer work. Continue?'
    );

    if (!confirmed) return;

    try {
      setIsLoading(true);
      setMessage({ type: 'success', text: 'Generating new seed phrase and updating your account...' });
      
      // Generate a new seed phrase and update identity with it
      const newSeed = await generateSeedPhrase();
      await updateIdentityWithSeedPhrase(newSeed, true); // Pass true to regenerate identity
      
      setSeedPhrase(newSeed);
      setShowSeedPhraseStep(true);
      setMessage({ type: 'success', text: 'New recovery seed phrase generated! Please save it securely.' });
      
      // Reload the current identity to reflect changes
      await loadCurrentIdentity();
    } catch (e: unknown) {
      setMessage({ type: 'error', text: (e as Error).message || 'Failed to generate new seed phrase' });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateWithSeedPhrase() {
    setIsNewAccountFlow(true);
    setShowUsernameSelector(true);
  }

  async function handleRecoverFromSeed() {
    if (!recoveryPhrase.trim()) {
      setMessage({ type: 'error', text: 'Please enter your recovery phrase' });
      return;
    }

    try {
      setIsLoading(true);
      setMessage({ type: 'success', text: 'Recovering account from seed phrase...' });
      await recoverFromSeedPhrase(recoveryPhrase.trim());
      await loadCurrentIdentity();
      setRecoveryPhrase("");
      setShowRecovery(false);
      setMessage({ type: 'success', text: 'Account recovered successfully!' });
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: unknown) {
      setMessage({ type: 'error', text: (e as Error).message || 'Failed to recover from seed phrase' });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUsernameConfirmed(username: string, betaKey?: string) {
    setIsLoading(true);
    try {
      setMessage({ type: 'success', text: 'Creating new account with seed phrase...' });
      const result = await createNewIdentityWithSeedPhrase(username, betaKey);
      
      // Set the seed phrase and show the dedicated seed phrase step
      setSeedPhrase(result.mnemonic);
      setShowUsernameSelector(false);
      setShowSeedPhraseStep(true);
      
      // Update the current identity state to reflect the new account
      await loadCurrentIdentity();
    } catch (e: unknown) {
      setMessage({ type: 'error', text: (e as Error).message || 'Failed to create new identity' });
      setShowUsernameSelector(false);
      setShowSeedPhraseStep(false);
    } finally {
      setIsLoading(false);
    }
  }

  function handleUsernameCancel() {
    setShowUsernameSelector(false);
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setMessage({ type: 'success', text: 'Copied to clipboard!' });
    }).catch(() => {
      setMessage({ type: 'error', text: 'Failed to copy to clipboard' });
    });
  }

  function downloadSeedPhrase(phrase: string) {
    const blob = new Blob([phrase], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retro-social-seed-phrase-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleSeedPhraseSaved() {
    if (seedPhrase) {
      // Seed phrase is already stored by createNewIdentityWithSeedPhrase or updateIdentityWithSeedPhrase
      setShowSeedPhraseStep(false);
      setSeedPhrase("");
      
      // Show optional email step for new accounts
      if (isNewAccountFlow) {
        setShowOptionalEmailStep(true);
      } else {
        setMessage({ type: 'success', text: 'Seed phrase saved! Your account has been updated with the new recovery phrase.' });
        // Stay on the identity page to show the logged-in state
        setTimeout(() => {
          setMessage(null);
          // Reload the page to reflect the new logged-in state
          window.location.reload();
        }, 1500);
      }
    }
  }

  // New account email handlers
  async function handleNewAccountAddEmail() {
    if (!newAccountEmail.trim()) return;
    
    setIsEmailLoading(true);
    try {
      const response = await fetch('/api/user/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newAccountEmail.trim() })
      });

      if (response.ok) {
        const data = await response.json();
        // Update local state to reflect the new email status
        setUserEmail(newAccountEmail.trim());
        setEmailVerifiedAt(null); // Email is not yet verified
        setMessage({ type: 'success', text: data.message });
        handleCompleteNewAccountFlow();
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to add email' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to add email. Please try again.' });
    } finally {
      setIsEmailLoading(false);
    }
  }

  function handleSkipNewAccountEmail() {
    handleCompleteNewAccountFlow();
  }

  function handleCompleteNewAccountFlow() {
    setShowOptionalEmailStep(false);
    setNewAccountEmail('');
    setIsNewAccountFlow(false);
    setMessage({ type: 'success', text: 'Account created successfully! Welcome to the community.' });
    // Stay on the identity page to show the logged-in state
    // Don't reload immediately so users can see the email verification status
    setTimeout(() => {
      setMessage(null);
    }, 3000);
  }

  // Email management functions
  async function handleSetEmail() {
    if (!emailInput.trim()) {
      setMessage({ type: 'error', text: 'Please enter an email address' });
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
          // Update local state to show pending verification
          setUserEmail(emailInput.trim());
          setEmailVerifiedAt(null);
          setEmailInput('');
          setShowEmailSection(false);
          setMessage({ type: 'success', text: data.message });
        } else {
          setUserEmail(emailInput.trim());
          setEmailVerifiedAt(null);
          setEmailInput('');
          setShowEmailSection(false);
          setMessage({ type: 'success', text: 'Email updated successfully!' });
        }
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to update email' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to update email. Please try again.' });
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
        setMessage({ type: 'success', text: 'Email removed successfully' });
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to remove email' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to remove email. Please try again.' });
    } finally {
      setIsEmailLoading(false);
    }
  }


  if (showUsernameSelector) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto">
          <UsernameSelector
            onUsernameConfirmed={handleUsernameConfirmed}
            onCancel={handleUsernameCancel}
            title="Choose Username for New Account"
            subtitle="Create your decentralized identity with seed phrase recovery"
            confirmButtonText="Create Account"
            isLoading={isLoading}
            initialBetaKey={urlBetaKey}
          />
        </div>
      </Layout>
    );
  }

  // Optional Email Step for New Accounts
  if (showOptionalEmailStep) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto p-6">
          <div className="min-h-screen flex items-center justify-center">
            <div className="w-full max-w-2xl">
              {/* Progress Indicator */}
              <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-medium">✓</div>
                  <div className="w-16 h-1 bg-green-500 rounded"></div>
                  <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-medium">✓</div>
                  <div className="w-16 h-1 bg-thread-pine rounded"></div>
                  <div className="w-8 h-8 bg-thread-pine text-white rounded-full flex items-center justify-center text-sm font-medium">3</div>
                </div>
                <p className="text-sm text-thread-sage">Step 3 of 3: Optional Email Setup</p>
              </div>

              <div className="bg-gradient-to-r from-thread-cream to-blue-50 border-2 border-thread-sage rounded-lg p-8">
                <div className="text-center mb-8">
                  <h1 className="thread-headline text-3xl mb-4">📧 Add Email Address (Optional)</h1>
                  <h2 className="text-xl font-medium text-thread-pine mb-4">Enable Email Login</h2>
                </div>

                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
                  <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                    <span>ℹ️</span>
                    Why add an email address?
                  </h3>
                  <ul className="text-blue-700 space-y-2 mb-4">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span className="text-sm">Sign in without your seed phrase using magic links</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span className="text-sm">Account recovery option if you lose access</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span className="text-sm">Multiple accounts can use the same email</span>
                    </li>
                  </ul>
                  <div className="bg-green-50 border border-green-200 p-3 rounded">
                    <p className="text-green-800 text-sm font-medium">
                      <strong>Privacy guarantee:</strong> We will never send marketing emails or share your address. 
                      It&apos;s strictly for secure login purposes only.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="newAccountEmail" className="block text-sm font-medium text-thread-pine mb-2">
                      Email address
                    </label>
                    <input
                      id="newAccountEmail"
                      type="email"
                      value={newAccountEmail}
                      onChange={(e) => setNewAccountEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full px-4 py-3 text-lg border-2 border-thread-sage rounded-lg bg-white focus:border-thread-pine outline-none transition-colors"
                      disabled={isEmailLoading}
                    />
                  </div>

                  {message && (
                    <div className={`p-4 rounded text-sm ${
                      message.type === 'success' 
                        ? 'bg-green-100 border border-green-300 text-green-800' 
                        : 'bg-red-100 border border-red-300 text-red-800'
                    }`}>
                      {message.text}
                    </div>
                  )}

                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={handleSkipNewAccountEmail}
                      disabled={isEmailLoading}
                      className="px-6 py-3 text-lg border-2 border-gray-400 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      <span>⏭️</span>
                      Skip for now
                    </button>
                    <button
                      onClick={handleNewAccountAddEmail}
                      disabled={!newAccountEmail.trim() || isEmailLoading}
                      className="px-6 py-3 text-lg bg-thread-pine hover:bg-thread-charcoal text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isEmailLoading ? (
                        <>
                          <span>⏳</span>
                          Adding...
                        </>
                      ) : (
                        <>
                          <span>✓</span>
                          Add Email & Continue
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-center text-sm text-thread-sage mt-6">
                    You can always add or change your email later from this Identity page.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Dedicated Seed Phrase Step
  if (showSeedPhraseStep && seedPhrase) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto p-6">
          <div className="min-h-screen flex items-center justify-center">
            <div className="w-full max-w-3xl">
              {/* Progress Indicator */}
              <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-medium">✓</div>
                  <div className="w-16 h-1 bg-green-500 rounded"></div>
                  <div className="w-8 h-8 bg-thread-pine text-white rounded-full flex items-center justify-center text-sm font-medium">2</div>
                  <div className="w-16 h-1 bg-gray-300 rounded"></div>
                  <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm font-medium">3</div>
                </div>
                <p className="text-sm text-thread-sage">Step 2 of 3: Save Your Recovery Phrase</p>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-thread-cream border-2 border-green-300 rounded-lg p-8">
                <div className="text-center mb-8">
                  <h1 className="thread-headline text-3xl mb-4">🎉 Account Created Successfully!</h1>
                  <h2 className="text-xl font-medium text-thread-pine mb-4">🔑 Your Recovery Seed Phrase</h2>
                  <p className="text-thread-charcoal text-lg leading-relaxed">
                    <strong>Critical Step:</strong> Save these 12 words in the exact order shown. 
                    You&apos;ll need them to recover your account if you lose access to this device.
                  </p>
                </div>

                <div className="bg-white border-2 border-thread-sage rounded-lg p-8 mb-8 shadow-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {seedPhrase.split(' ').map((word, index) => (
                      <div key={index} className="flex items-center gap-3 p-4 bg-thread-cream rounded-lg border-2 border-thread-sage min-h-[60px]">
                        <span className="text-lg font-bold min-w-[36px] h-[36px] bg-thread-pine text-white rounded-full flex items-center justify-center flex-shrink-0">
                          {index + 1}
                        </span>
                        <span className="font-mono font-bold text-thread-charcoal text-xl flex-grow">{word}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 mb-8">
                  <h3 className="font-bold text-red-800 mb-4 flex items-center gap-2 text-lg">
                    <span>⚠️</span>
                    Security Guidelines - READ CAREFULLY
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-green-800 mb-2">✅ DO:</h4>
                      <ul className="text-sm text-green-700 space-y-1">
                        <li>• Write these words on paper</li>
                        <li>• Store in a secure location</li>
                        <li>• Make multiple copies</li>
                        <li>• Use a password manager</li>
                        <li>• Double-check the order</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-red-800 mb-2">❌ DON&apos;T:</h4>
                      <ul className="text-sm text-red-700 space-y-1">
                        <li>• Share with anyone</li>
                        <li>• Store in plain text files</li>
                        <li>• Save in emails or messages</li>
                        <li>• Take screenshots</li>
                        <li>• Store only on this device</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 mb-6">
                  <button
                    onClick={() => copyToClipboard(seedPhrase)}
                    className="flex-1 px-6 py-4 text-sm bg-thread-paper border-2 border-thread-sage hover:bg-thread-cream rounded-lg transition-all flex items-center justify-center gap-2 font-medium"
                  >
                    <span>📋</span>
                    Copy Words
                  </button>
                  <button
                    onClick={() => downloadSeedPhrase(seedPhrase)}
                    className="flex-1 px-6 py-4 text-sm bg-thread-paper border-2 border-thread-sage hover:bg-thread-cream rounded-lg transition-all flex items-center justify-center gap-2 font-medium"
                  >
                    <span>💾</span>
                    Download Backup
                  </button>
                </div>

                <div className="text-center">
                  <button
                    onClick={handleSeedPhraseSaved}
                    className="bg-thread-pine hover:bg-thread-charcoal text-white px-8 py-4 rounded-lg text-lg font-medium transition-all shadow-lg flex items-center justify-center gap-2 mx-auto"
                  >
                    <span>✓</span>
                    I&apos;ve Safely Saved My Recovery Phrase
                  </button>
                  <p className="text-sm text-thread-sage mt-4">
                    Only continue after you&apos;ve securely saved these words
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {initialUser && (
          <div className="flex justify-center">
            <Link
              href="/settings"
              className="px-3 py-2 border border-black bg-white hover:bg-gray-100 shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] no-underline text-sm"
            >
              ← Back to Settings
            </Link>
          </div>
        )}
        <div className="text-center">
          <h1 className="thread-headline text-2xl mb-2">Identity Management</h1>
          <p className="text-thread-sage">
            Manage your decentralized identity, create backups, and recover your account
          </p>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`p-4 rounded text-sm ${
            message.type === 'success' 
              ? 'bg-green-100 border border-green-300 text-green-800' 
              : 'bg-red-100 border border-red-300 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Identity Sync Issue Dialog */}
        {hasMismatch && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <h3 className="font-bold text-amber-800 mb-2">Identity Sync Issue Detected</h3>
                <p className="text-amber-700 mb-4">
                  We detected that your browser&apos;s local identity data doesn&apos;t match your logged-in account. 
                  This can happen if your browser data was cleared or you&apos;re on a different device.
                </p>
                <div className="bg-amber-100 border border-amber-200 rounded p-3 mb-4">
                  <p className="text-sm text-amber-800">
                    <strong>Logged in as:</strong> @{initialUser?.primaryHandle}
                  </p>
                  <p className="text-sm text-amber-700">
                    But your browser doesn&apos;t have the matching identity keys stored locally.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setMessage({ type: 'success', text: 'Clearing local data and redirecting to re-login...' });
                      setTimeout(fixMismatch, 1000);
                    }}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded font-medium transition-colors"
                  >
                    Fix This Issue
                  </button>
                </div>
                <p className="text-xs text-amber-600 mt-2">
                  Fixing this will log you out and ask you to log in again to restore proper access.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Current Identity Status */}
        {currentIdentity && (
          <div className="bg-thread-paper border border-thread-sage rounded-lg p-6">
            <h2 className="thread-label text-lg mb-4 flex items-center gap-2">
              <span>🔐</span>
              Current Identity
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-thread-sage block mb-1">DID:</label>
                <code className="text-xs font-mono bg-thread-cream p-2 rounded block">{currentIdentity.did}</code>
              </div>
              {initialUser?.primaryHandle && (
                <div>
                  <label className="text-sm font-medium text-thread-sage block mb-1">Username:</label>
                  <span className="text-thread-pine font-medium">{initialUser.primaryHandle}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-sm text-thread-sage">Email Login:</span>
                {userEmail ? (
                  <div className="flex items-center gap-2">
                    {emailVerifiedAt ? (
                      <>
                        <span className="text-green-600 text-sm font-medium">✓ {userEmail}</span>
                        <span className="text-xs text-green-500">(verified)</span>
                      </>
                    ) : (
                      <>
                        <span className="text-amber-600 text-sm font-medium">⏳ {userEmail}</span>
                        <span className="text-xs text-amber-500">(pending verification)</span>
                      </>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-500 text-sm">Not set</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-thread-sage">Seed Phrase Recovery:</span>
                {currentSeedPhrase ? (
                  <span className="text-green-600 text-sm font-medium">✓ Enabled</span>
                ) : (
                  <span className="text-amber-600 text-sm font-medium">⚠ Not Set</span>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Create New Account */}
          <div className="bg-thread-cream border border-thread-sage rounded-lg p-6">
            <h3 className="thread-label text-lg mb-3 flex items-center gap-2">
              <span>🆕</span>
              New Account
            </h3>
            <p className="text-sm text-thread-sage mb-4 leading-relaxed">
              Create a new decentralized account with automatic seed phrase recovery. 
              This is the recommended way to create accounts.
            </p>
            <button
              onClick={handleCreateWithSeedPhrase}
              disabled={isLoading}
              className="w-full thread-button text-sm px-4 py-3 flex items-center gap-2 justify-center disabled:opacity-50"
            >
              <span>✨</span>
              Create New Account with Seed Phrase
            </button>
          </div>

          {/* Recovery */}
          <div className="bg-thread-cream border border-thread-sage rounded-lg p-6">
            <h3 className="thread-label text-lg mb-3 flex items-center gap-2">
              <span>🔄</span>
              Account Recovery
            </h3>
            <p className="text-sm text-thread-sage mb-4 leading-relaxed">
              Recover your account using a 12-word seed phrase. This will replace your current identity.
            </p>
            <button
              onClick={() => setShowRecovery(true)}
              disabled={isLoading}
              className="w-full px-4 py-3 text-sm border border-thread-sage bg-thread-paper hover:bg-thread-cream rounded shadow-cozySm transition-all flex items-center gap-2 justify-center disabled:opacity-50"
            >
              <span>🔑</span>
              Recover from Seed Phrase
            </button>
          </div>

          {/* Legacy Token Import */}
          <div className="bg-thread-paper border border-thread-sage rounded-lg p-6">
            <h3 className="thread-label text-lg mb-3 flex items-center gap-2">
              <span>📥</span>
              Legacy Token Import
            </h3>
            <p className="text-sm text-thread-sage mb-4 leading-relaxed">
              Import an account using an old-style backup token from another device.
            </p>
            <button
              onClick={() => setShowImport(true)}
              disabled={isLoading}
              className="w-full px-4 py-3 text-sm border border-thread-sage bg-thread-paper hover:bg-thread-cream rounded shadow-cozySm transition-all flex items-center gap-2 justify-center disabled:opacity-50"
            >
              <span>📥</span>
              Import Legacy Token
            </button>
          </div>

          {/* Email Login Management */}
          {currentIdentity && (
            <div className="bg-thread-paper border border-thread-sage rounded-lg p-6">
              <h3 className="thread-label text-lg mb-3 flex items-center gap-2">
                <span>📧</span>
                Email Login
              </h3>
              <div className="space-y-3">
                {userEmail ? (
                  emailVerifiedAt ? (
                    <div className="bg-green-50 border border-green-200 p-3 rounded text-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-green-800 font-medium">✓ Email verified: {userEmail}</span>
                        <span className="text-xs text-green-600">Active</span>
                      </div>
                      <p className="text-green-700 text-xs mb-3">
                        You can now login using magic links sent to this email address.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEmailInput(userEmail);
                            setShowEmailSection(true);
                          }}
                          disabled={isEmailLoading}
                          className="text-xs bg-green-100 hover:bg-green-200 border border-green-300 px-3 py-1 rounded transition-all disabled:opacity-50"
                        >
                          Change Email
                        </button>
                        <button
                          onClick={handleRemoveEmail}
                          disabled={isEmailLoading}
                          className="text-xs bg-red-100 hover:bg-red-200 border border-red-300 px-3 py-1 rounded transition-all disabled:opacity-50"
                        >
                          Remove Email
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 p-3 rounded text-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-amber-800 font-medium">⏳ Email pending verification</span>
                        <span className="text-xs text-amber-600">Unverified</span>
                      </div>
                      <p className="text-amber-700 text-xs mb-3">
                        Check your email and click the verification link to enable email login.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEmailInput(userEmail);
                            setShowEmailSection(true);
                          }}
                          disabled={isEmailLoading}
                          className="text-xs bg-amber-100 hover:bg-amber-200 border border-amber-300 px-3 py-1 rounded transition-all disabled:opacity-50"
                        >
                          Resend Verification
                        </button>
                        <button
                          onClick={handleRemoveEmail}
                          disabled={isEmailLoading}
                          className="text-xs bg-red-100 hover:bg-red-200 border border-red-300 px-3 py-1 rounded transition-all disabled:opacity-50"
                        >
                          Remove Email
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="bg-gray-50 border border-gray-200 p-3 rounded text-sm">
                    <p className="text-gray-800 font-medium mb-2">📧 Email login not set</p>
                    <p className="text-gray-700 text-xs mb-3">
                      Add an email address to enable magic link login as an alternative to your DID key. You&apos;ll need to verify the email before it can be used for login.
                    </p>
                    <button
                      onClick={() => setShowEmailSection(true)}
                      disabled={isEmailLoading}
                      className="text-xs bg-gray-100 hover:bg-gray-200 border border-gray-300 px-3 py-1 rounded transition-all disabled:opacity-50"
                    >
                      Add Email Address
                    </button>
                  </div>
                )}

                {showEmailSection && (
                  <div className="bg-thread-cream border border-thread-sage p-3 rounded space-y-3">
                    <h4 className="text-sm font-medium text-thread-pine">Set Email Address</h4>
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full px-3 py-2 text-sm border border-thread-sage rounded bg-thread-paper"
                      disabled={isEmailLoading}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSetEmail}
                        disabled={isEmailLoading || !emailInput.trim()}
                        className="text-xs bg-thread-pine hover:bg-thread-charcoal text-white px-3 py-1 rounded transition-all disabled:opacity-50"
                      >
                        {isEmailLoading ? "Saving..." : "Save Email"}
                      </button>
                      <button
                        onClick={() => {
                          setShowEmailSection(false);
                          setEmailInput('');
                        }}
                        className="text-xs bg-gray-100 hover:bg-gray-200 border border-gray-300 px-3 py-1 rounded transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                
                <p className="text-sm text-thread-sage leading-relaxed">
                  Email addresses are encrypted and stored securely. You must verify your email before it can be used for login. Multiple accounts can share the same email.
                </p>
              </div>
            </div>
          )}

          {/* Current Account Backup */}
          {currentIdentity && (
            <div className="bg-thread-paper border border-thread-sage rounded-lg p-6">
              <h3 className="thread-label text-lg mb-3 flex items-center gap-2">
                <span>🛡️</span>
                Account Backup
              </h3>
              <div className="space-y-3">
                {!currentSeedPhrase && (
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded text-sm">
                    <p className="text-amber-800 font-medium mb-2">⚠ No seed phrase recovery set</p>
                    <button
                      onClick={handleGenerateSeedPhrase}
                      disabled={isLoading}
                      className="text-xs bg-amber-100 hover:bg-amber-200 border border-amber-300 px-3 py-1 rounded transition-all disabled:opacity-50"
                    >
                      Generate Recovery Seed Phrase
                    </button>
                  </div>
                )}
                
                {currentSeedPhrase && (
                  <div className="bg-green-50 border border-green-200 p-3 rounded text-sm space-y-3">
                    <p className="text-green-800 font-medium">✓ Seed phrase recovery is enabled</p>
                    <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
                      <p className="text-yellow-800 font-medium mb-2">🔄 Need a new recovery phrase?</p>
                      <p className="text-yellow-700 text-xs mb-3">
                        Generate a completely new 12-word recovery phrase. This will replace your current one and log you back in with new credentials.
                      </p>
                      <button
                        onClick={handleRegenerateSeedPhrase}
                        disabled={isLoading}
                        className="text-xs bg-yellow-100 hover:bg-yellow-200 border border-yellow-300 px-3 py-1 rounded transition-all disabled:opacity-50"
                      >
                        {isLoading ? "Generating..." : "Generate New Seed Phrase"}
                      </button>
                    </div>
                  </div>
                )}
                
                <p className="text-sm text-thread-sage leading-relaxed">
                  Export your account as a backup token for use with older versions.
                </p>
                <button
                  onClick={handleExport}
                  disabled={isLoading}
                  className="w-full px-4 py-3 text-sm border border-thread-sage bg-thread-paper hover:bg-thread-cream rounded shadow-cozySm transition-all flex items-center gap-2 justify-center disabled:opacity-50"
                >
                  <span>📤</span>
                  Export Legacy Token
                </button>
              </div>
            </div>
          )}
        </div>


        {/* Recovery Modal */}
        <Modal
          isOpen={showRecovery}
          onClose={() => setShowRecovery(false)}
          title="🔑 Account Recovery"
          maxWidth="max-w-3xl"
        >
          <div className="space-y-4">
            <p className="text-sm text-thread-sage leading-relaxed">
              Enter your 12-word recovery phrase to restore your account. This will replace your current identity.
            </p>
            <div className="space-y-4">
              <textarea
                value={recoveryPhrase}
                onChange={(e) => setRecoveryPhrase(e.target.value)}
                placeholder="Enter your 12-word recovery phrase separated by spaces..."
                className="w-full h-24 text-sm border border-thread-sage p-3 resize-none bg-thread-paper rounded"
                disabled={isLoading}
              />
              <div className="flex gap-3">
                <button
                  onClick={handleRecoverFromSeed}
                  disabled={isLoading || !recoveryPhrase.trim()}
                  className="thread-button text-sm px-6 py-2 disabled:opacity-50 flex items-center gap-2"
                >
                  {isLoading ? "Recovering..." : "🔄 Recover Account"}
                </button>
              </div>
            </div>
          </div>
        </Modal>

        {/* Legacy Export Modal */}
        <Modal
          isOpen={showExport}
          onClose={() => setShowExport(false)}
          title="📤 Legacy Backup Token"
          maxWidth="max-w-3xl"
        >
          <div className="space-y-4">
            <p className="text-sm text-thread-sage leading-relaxed">
              This is your legacy backup token. Use this with older versions of the app.
              For new setups, use the seed phrase recovery instead.
            </p>
            <div className="relative">
              <textarea
                readOnly
                value={exportToken}
                className="w-full h-24 text-xs font-mono border border-thread-sage p-3 resize-none bg-thread-paper rounded"
              />
              <button
                onClick={() => copyToClipboard(exportToken)}
                className="absolute top-2 right-2 px-3 py-1 text-xs bg-thread-paper border border-thread-sage hover:bg-thread-cream rounded shadow-cozySm transition-all"
              >
                Copy
              </button>
            </div>
          </div>
        </Modal>

        {/* Legacy Import Modal */}
        <Modal
          isOpen={showImport}
          onClose={() => setShowImport(false)}
          title="📥 Import Legacy Token"
          maxWidth="max-w-3xl"
        >
          <div className="space-y-4">
            <p className="text-sm text-thread-sage leading-relaxed">
              Paste a backup token from an older version to switch to that account. This will log you out of your current account.
            </p>
            <div className="space-y-4">
              <textarea
                value={importToken}
                onChange={(e) => setImportToken(e.target.value)}
                placeholder="Paste your legacy backup token here..."
                className="w-full h-24 text-xs font-mono border border-thread-sage p-3 resize-none bg-thread-paper rounded"
                disabled={isLoading}
              />
              <button
                onClick={handleImport}
                disabled={isLoading || !importToken.trim()}
                className="thread-button text-sm px-6 py-2 disabled:opacity-50"
              >
                {isLoading ? "Importing..." : "Switch Account"}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const user = await getSessionUser(context.req as NextApiRequest);
  
  // Serialize the user object to avoid Date serialization issues
  const serializedUser = user ? {
    id: user.id,
    did: user.did,
    primaryHandle: user.primaryHandle
  } : null;
  
  return { props: { initialUser: serializedUser } };
}