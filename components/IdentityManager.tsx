import React, { useState, useEffect } from "react";
import { getExistingDid, exportIdentityToken, importIdentityToken, createNewIdentityWithUsername, LocalKeypair } from "@/lib/did-client";
import UsernameSelector from "./UsernameSelector";
import WelcomeDialog from "./WelcomeDialog";

export default function IdentityManager() {
  const [currentIdentity, setCurrentIdentity] = useState<LocalKeypair | null>(null);
  const [exportToken, setExportToken] = useState<string>("");
  const [importToken, setImportToken] = useState<string>("");
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showUsernameSelector, setShowUsernameSelector] = useState(false);
  const [isCreatingIdentity, setIsCreatingIdentity] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeUsername, setWelcomeUsername] = useState<string>("");


  async function loadCurrentIdentity() {
    try {
      const identity = getExistingDid();
      setCurrentIdentity(identity);
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
      setMessage({ type: 'success', text: 'Switching accounts... Logging out and logging in with new identity.' });
      await importIdentityToken(importToken.trim());
      await loadCurrentIdentity();
      setImportToken("");
      setShowImport(false);
      setMessage({ type: 'success', text: 'Identity imported and logged in successfully!' });
      // Reload to refresh the entire app state with new logged-in user
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: unknown) {
      setMessage({ type: 'error', text: (e as Error).message || 'Failed to import identity' });
    }
  }

  async function handleCreateNew() {
    setShowUsernameSelector(true);
  }

  async function handleUsernameConfirmed(username: string, betaKey?: string) {
    setIsCreatingIdentity(true);
    try {
      setMessage({ type: 'success', text: 'Creating new account... Logging out from current session.' });
      await createNewIdentityWithUsername(username, betaKey);
      setMessage({ type: 'success', text: `New identity created and logged in with username @${username}!` });
      
      // Show welcome dialog for new users instead of immediate redirect
      setWelcomeUsername(username);
      setShowWelcome(true);
      setIsCreatingIdentity(false);
    } catch (e: unknown) {
      setMessage({ type: 'error', text: (e as Error).message || 'Failed to create new identity' });
      setIsCreatingIdentity(false);
    }
  }

  function handleUsernameCancel() {
    setShowUsernameSelector(false);
    setIsCreatingIdentity(false);
  }

  function handleWelcomeComplete() {
    setShowWelcome(false);
    // Redirect to user page after they complete the welcome flow
    setTimeout(() => window.location.href = `/${welcomeUsername}`, 500);
  }

  function handleWelcomeSkip() {
    setShowWelcome(false);
    // Still redirect but show a warning
    setMessage({ type: 'error', text: 'Warning: You skipped backing up your key. You may lose access to your account!' });
    setTimeout(() => window.location.href = `/${welcomeUsername}`, 2000);
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setMessage({ type: 'success', text: 'Copied to clipboard!' });
    }).catch(() => {
      setMessage({ type: 'error', text: 'Failed to copy to clipboard' });
    });
  }


  if (showWelcome) {
    return (
      <WelcomeDialog
        username={welcomeUsername}
        onComplete={handleWelcomeComplete}
        onSkip={handleWelcomeSkip}
      />
    );
  }

  if (showUsernameSelector) {
    return (
      <UsernameSelector
        onUsernameConfirmed={handleUsernameConfirmed}
        onCancel={handleUsernameCancel}
        title="Choose Username for New Account"
        subtitle="Create your decentralized identity and claim a username"
        confirmButtonText="Create Account"
        isLoading={isCreatingIdentity}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="thread-headline text-lg mb-2">Account Manager</h3>
        <p className="text-sm text-thread-sage">
          Create a new account or switch between existing identities
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


      {/* Main Actions */}
      <div className="space-y-4">
        <div className="bg-thread-cream border border-thread-sage rounded-lg p-4">
          <h4 className="thread-label text-base mb-3 flex items-center gap-2">
            <span>🆕</span>
            New to Retro Social?
          </h4>
          <p className="text-sm text-thread-sage mb-4">
            Create your first decentralized account. Your identity will be secured by cryptographic keys.
          </p>
          <button
            onClick={handleCreateNew}
            className="w-full thread-button text-sm px-4 py-3 flex items-center gap-2 justify-center"
          >
            <span>✨</span>
            Create New Account
          </button>
        </div>

        <div className="bg-thread-paper border border-thread-sage rounded-lg p-4">
          <h4 className="thread-label text-base mb-3 flex items-center gap-2">
            <span>🔄</span>
            Already have an account?
          </h4>
          <p className="text-sm text-thread-sage mb-4">
            Switch to an existing account by importing your backup key from another device.
          </p>
          <button
            onClick={() => setShowImport(!showImport)}
            className="w-full px-4 py-3 text-sm border border-thread-sage bg-thread-paper hover:bg-thread-cream rounded shadow-cozySm transition-all flex items-center gap-2 justify-center"
          >
            <span>📥</span>
            Import Account
          </button>
        </div>

        {currentIdentity && (
          <div className="bg-thread-paper border border-thread-sage rounded-lg p-4">
            <h4 className="thread-label text-base mb-3 flex items-center gap-2">
              <span>🛡️</span>
              Backup Current Account
            </h4>
            <p className="text-sm text-thread-sage mb-4">
              Export your current account key to back it up or move it to another device.
            </p>
            <button
              onClick={handleExport}
              className="w-full px-4 py-3 text-sm border border-thread-sage bg-thread-paper hover:bg-thread-cream rounded shadow-cozySm transition-all flex items-center gap-2 justify-center"
            >
              <span>📤</span>
              Export Account Backup
            </button>
          </div>
        )}
        
      </div>

      {/* Export Section */}
      {showExport && (
        <div className="space-y-4 border border-thread-sage p-5 bg-thread-cream rounded">
          <div className="flex items-center justify-between">
            <h4 className="thread-label text-base">Your Account Backup Key</h4>
            <button
              onClick={() => setShowExport(false)}
              className="text-thread-sage hover:text-thread-charcoal transition-colors p-1"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-thread-sage leading-relaxed">
            Save this backup key securely. You&apos;ll need it to access your account from another device.
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
      )}

      {/* Import Section */}
      {showImport && (
        <div className="space-y-4 border border-thread-sage p-5 bg-thread-cream rounded">
          <div className="flex items-center justify-between">
            <h4 className="thread-label text-base">Import Account</h4>
            <button
              onClick={() => setShowImport(false)}
              className="text-thread-sage hover:text-thread-charcoal transition-colors p-1"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-thread-sage leading-relaxed">
            Paste your backup key to switch to an existing account. This will log you out of your current account.
          </p>
          <textarea
            value={importToken}
            onChange={(e) => setImportToken(e.target.value)}
            placeholder="Paste your account backup key here..."
            className="w-full h-24 text-xs font-mono border border-thread-sage p-3 resize-none bg-thread-paper rounded"
          />
          <div className="pt-2">
            <button
              onClick={handleImport}
              className="thread-button text-sm px-4 py-2"
            >
              Switch Account
            </button>
          </div>
        </div>
      )}
    </div>
  );
}