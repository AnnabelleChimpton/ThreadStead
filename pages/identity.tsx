import React, { useState, useEffect } from "react";
import { GetServerSidePropsContext } from "next";
import { NextApiRequest } from "next";
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
  LocalKeypair,
  SeedPhrase
} from "@/lib/did-client";
import UsernameSelector from "@/components/UsernameSelector";

interface IdentityPageProps {
  initialUser?: { id: string; did: string; primaryHandle: string | null } | null;
}

export default function IdentityPage({ initialUser }: IdentityPageProps) {
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
  
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  async function loadCurrentIdentity() {
    try {
      const identity = getExistingDid();
      setCurrentIdentity(identity);
      const seedData = getSeedPhrase();
      setCurrentSeedPhrase(seedData);
    } catch (e) {
      console.error("Failed to load identity:", e);
    }
  }

  useEffect(() => {
    loadCurrentIdentity();
  }, []);

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
      const newSeed = await generateSeedPhrase();
      setSeedPhrase(newSeed);
      setShowSeedPhraseStep(true);
      setMessage({ type: 'success', text: 'New seed phrase generated! Please save it securely.' });
    } catch (e: unknown) {
      setMessage({ type: 'error', text: (e as Error).message || 'Failed to generate seed phrase' });
    }
  }

  async function handleCreateWithSeedPhrase() {
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
      // Seed phrase is already stored by createNewIdentityWithSeedPhrase
      setShowSeedPhraseStep(false);
      setSeedPhrase("");
      setMessage({ type: 'success', text: 'Seed phrase saved! Your account is now ready to use.' });
      // Stay on the identity page to show the logged-in state
      setTimeout(() => {
        setMessage(null);
        // Reload the page to reflect the new logged-in state
        window.location.reload();
      }, 1500);
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
          />
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
                  <span className="text-thread-pine font-medium">@{initialUser.primaryHandle}</span>
                </div>
              )}
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
              onClick={() => setShowRecovery(!showRecovery)}
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
              onClick={() => setShowImport(!showImport)}
              disabled={isLoading}
              className="w-full px-4 py-3 text-sm border border-thread-sage bg-thread-paper hover:bg-thread-cream rounded shadow-cozySm transition-all flex items-center gap-2 justify-center disabled:opacity-50"
            >
              <span>📥</span>
              Import Legacy Token
            </button>
          </div>

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


        {/* Recovery Section */}
        {showRecovery && (
          <div className="bg-thread-cream border border-thread-sage rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="thread-label text-lg">🔑 Account Recovery</h3>
              <button
                onClick={() => setShowRecovery(false)}
                className="text-thread-sage hover:text-thread-charcoal transition-colors p-1"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-thread-sage leading-relaxed mb-4">
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
        )}

        {/* Legacy Export Section */}
        {showExport && (
          <div className="bg-thread-cream border border-thread-sage rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="thread-label text-lg">📤 Legacy Backup Token</h3>
              <button
                onClick={() => setShowExport(false)}
                className="text-thread-sage hover:text-thread-charcoal transition-colors p-1"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-thread-sage leading-relaxed mb-4">
              This is your legacy backup token. Use this with older versions of the app.
              For new setups, use the seed phrase recovery instead.
            </p>
            <div className="relative mb-4">
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
        )}

        {/* Legacy Import Section */}
        {showImport && (
          <div className="bg-thread-cream border border-thread-sage rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="thread-label text-lg">📥 Import Legacy Token</h3>
              <button
                onClick={() => setShowImport(false)}
                className="text-thread-sage hover:text-thread-charcoal transition-colors p-1"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-thread-sage leading-relaxed mb-4">
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
        )}
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