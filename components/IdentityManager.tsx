import React, { useState, useEffect, useCallback } from "react";
import { getExistingDid, exportIdentityToken, importIdentityToken, createNewIdentityWithUsername, LocalKeypair } from "@/lib/did-client";
import UsernameSelector from "./UsernameSelector";

export default function IdentityManager() {
  const [currentIdentity, setCurrentIdentity] = useState<LocalKeypair | null>(null);
  const [exportToken, setExportToken] = useState<string>("");
  const [importToken, setImportToken] = useState<string>("");
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showUsernameSelector, setShowUsernameSelector] = useState(false);
  const [isCreatingIdentity, setIsCreatingIdentity] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [betaKey, setBetaKey] = useState<string>("");
  const [isBetaEnabled, setIsBetaEnabled] = useState<boolean>(false);
  const [betaStatusError, setBetaStatusError] = useState<string | null>(null);
  const [betaStatusRetryCount, setBetaStatusRetryCount] = useState<number>(0);
  const [isCheckingBetaStatus, setIsCheckingBetaStatus] = useState<boolean>(false);

  // Beta key format validation
  function isValidBetaKeyFormat(key: string): boolean {
    // Expected format: BETA-XXXX-XXXX-XXXX (where X is alphanumeric)
    const betaKeyRegex = /^BETA-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    return betaKeyRegex.test(key);
  }

  async function loadCurrentIdentity() {
    try {
      const identity = getExistingDid();
      setCurrentIdentity(identity);
    } catch (e) {
      console.error("Failed to load identity:", e);
    }
  }

  const checkBetaStatus = useCallback(async () => {
    setIsCheckingBetaStatus(true);
    try {
      const response = await fetch('/api/auth/beta-status');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setIsBetaEnabled(data.enabled);
      setBetaStatusError(null);
      setBetaStatusRetryCount(0);
    } catch (e) {
      console.error("Failed to check beta status:", e);
      const errorMessage = e instanceof Error ? e.message : "Unknown error";
      setBetaStatusError(errorMessage);
      
      // Retry up to 3 times with exponential backoff
      if (betaStatusRetryCount < 3) {
        const retryDelay = Math.pow(2, betaStatusRetryCount) * 1000; // 1s, 2s, 4s
        setTimeout(() => {
          setBetaStatusRetryCount(prev => prev + 1);
          checkBetaStatus();
        }, retryDelay);
      }
    } finally {
      setIsCheckingBetaStatus(false);
    }
  }, [betaStatusRetryCount]);

  useEffect(() => {
    loadCurrentIdentity();
    checkBetaStatus();

    // Set up periodic beta status check every 30 seconds
    const statusInterval = setInterval(checkBetaStatus, 30000);

    // Check beta status when window gains focus (user switches back to tab)
    const handleFocus = () => checkBetaStatus();
    window.addEventListener('focus', handleFocus);

    // Cleanup
    return () => {
      clearInterval(statusInterval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkBetaStatus]); // checkBetaStatus already includes betaStatusRetryCount as dependency

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

  async function handleUsernameConfirmed(username: string) {
    setIsCreatingIdentity(true);
    try {
      setMessage({ type: 'success', text: 'Creating new account... Logging out from current session.' });
      await createNewIdentityWithUsername(username, isBetaEnabled ? betaKey : undefined);
      setMessage({ type: 'success', text: `New identity created and logged in with username @${username}!` });
      setBetaKey(""); // Clear beta key after successful use
      // Redirect to user page - they should now be logged in
      setTimeout(() => window.location.href = `/${username}`, 1500);
    } catch (e: unknown) {
      setMessage({ type: 'error', text: (e as Error).message || 'Failed to create new identity' });
      setIsCreatingIdentity(false);
    }
  }

  function handleUsernameCancel() {
    setShowUsernameSelector(false);
    setIsCreatingIdentity(false);
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setMessage({ type: 'success', text: 'Copied to clipboard!' });
    }).catch(() => {
      setMessage({ type: 'error', text: 'Failed to copy to clipboard' });
    });
  }

  function truncateDid(did: string) {
    return did.length > 30 ? `${did.slice(0, 30)}...` : did;
  }

  if (showUsernameSelector) {
    return (
      <UsernameSelector
        onUsernameConfirmed={handleUsernameConfirmed}
        onCancel={handleUsernameCancel}
        title="Choose Username for New Identity"
        subtitle="Create a new DID identity and claim a username"
        confirmButtonText="Create Identity"
        isLoading={isCreatingIdentity}
      />
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="thread-headline text-lg mb-4">Identity Manager</h3>
      
      {/* Current Identity */}
      {currentIdentity && (
        <div className="space-y-3">
          <h4 className="thread-label">Current Identity</h4>
          <div className="text-xs font-mono bg-thread-cream p-4 border border-thread-sage rounded break-all">
            {truncateDid(currentIdentity.did)}
          </div>
        </div>
      )}

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

      {/* Beta Status Error */}
      {betaStatusError && (
        <div className="p-4 rounded text-sm bg-yellow-100 border border-yellow-300 text-yellow-800">
          <div className="flex items-center justify-between">
            <span>⚠️ Failed to load beta status: {betaStatusError}</span>
            <button
              onClick={() => {
                setBetaStatusRetryCount(0);
                checkBetaStatus();
              }}
              className="ml-2 text-xs px-2 py-1 bg-yellow-200 hover:bg-yellow-300 rounded"
            >
              Retry
            </button>
          </div>
          <p className="text-xs mt-2">
            Retried {betaStatusRetryCount}/3 times. Some features may not work correctly.
          </p>
        </div>
      )}

      {/* Beta Key Input (only for new identity creation) */}
      {isBetaEnabled && (
        <div className="space-y-3 border-l-4 border-l-thread-sunset border border-thread-sage p-4 bg-thread-cream rounded">
          <div className="flex items-center gap-2">
            <span className="text-thread-sunset text-sm">🔑</span>
            <h4 className="thread-label text-base text-thread-charcoal">Beta Access Required</h4>
            {isCheckingBetaStatus && (
              <span className="text-xs text-thread-sage animate-pulse">Checking status...</span>
            )}
          </div>
          <p className="text-sm text-thread-sage leading-relaxed">
            This platform is in beta. A beta key is required to <strong>create new identities</strong>. 
            <span className="text-thread-charcoal font-medium"> Existing users can login without a beta key.</span>
          </p>
          <div className="space-y-2">
            <label className="block text-xs font-medium text-thread-sage">
              Beta Key for New Account Creation
            </label>
            <input
              type="text"
              value={betaKey}
              onChange={(e) => setBetaKey(e.target.value.toUpperCase())}
              placeholder="BETA-XXXX-XXXX-XXXX"
              className="w-full px-3 py-2 text-sm border border-thread-sage rounded bg-thread-paper focus:outline-none focus:ring-2 focus:ring-thread-sunset/30 font-mono"
              style={{ letterSpacing: '0.05em' }}
            />
            {betaKey && (
              <p className={`text-xs ${isValidBetaKeyFormat(betaKey) ? 'text-green-600' : 'text-red-600'}`}>
                {isValidBetaKeyFormat(betaKey) 
                  ? "✓ Valid beta key format - you can now create a new identity"
                  : "⚠️ Invalid format. Beta key should be: BETA-XXXX-XXXX-XXXX"
                }
              </p>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-4">
        <h4 className="thread-label text-base">Identity Actions</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={handleCreateNew}
            disabled={isBetaEnabled && (!betaKey.trim() || !isValidBetaKeyFormat(betaKey))}
            className="thread-button text-sm px-4 py-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center"
            title={
              isBetaEnabled && !betaKey.trim() 
                ? "Beta key required to create new identity" 
                : isBetaEnabled && !isValidBetaKeyFormat(betaKey)
                ? "Beta key must be in format: BETA-XXXX-XXXX-XXXX"
                : "Create a brand new identity with username"
            }
          >
            <span>✨</span>
            Create New Identity
          </button>
          
          <button
            onClick={handleExport}
            disabled={!currentIdentity}
            className="px-4 py-3 text-sm border border-thread-sage bg-thread-paper hover:bg-thread-cream rounded shadow-cozySm transition-all flex items-center gap-2 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            title={currentIdentity ? "Export your current identity to backup or transfer to another device" : "No identity to export - create or import one first"}
          >
            <span>📤</span>
            Export Identity
          </button>
          
          <button
            onClick={() => setShowImport(!showImport)}
            className="px-4 py-3 text-sm border border-thread-sage bg-thread-paper hover:bg-thread-cream rounded shadow-cozySm transition-all flex items-center gap-2 justify-center"
            title="Import an existing identity from another device"
          >
            <span>📥</span>
            Import Identity
          </button>
        </div>
        
        {isBetaEnabled && (!betaKey.trim() || !isValidBetaKeyFormat(betaKey)) && (
          <p className="text-xs text-thread-sage italic">
            💡 Tip: You can export/import existing identities without a beta key. Beta keys are only needed for creating completely new accounts.
            {betaKey.trim() && !isValidBetaKeyFormat(betaKey) && (
              <span className="block text-red-600 mt-1">
                Current beta key format is invalid.
              </span>
            )}
          </p>
        )}
      </div>

      {/* Export Section */}
      {showExport && (
        <div className="space-y-4 border border-thread-sage p-5 bg-thread-cream rounded">
          <div className="flex items-center justify-between">
            <h4 className="thread-label text-base">Your Identity Token</h4>
            <button
              onClick={() => setShowExport(false)}
              className="text-thread-sage hover:text-thread-charcoal transition-colors p-1"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-thread-sage leading-relaxed">
            Save this token securely. You can use it to restore your identity on another device.
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
            <h4 className="thread-label text-base">Import Identity Token</h4>
            <button
              onClick={() => setShowImport(false)}
              className="text-thread-sage hover:text-thread-charcoal transition-colors p-1"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-thread-sage leading-relaxed">
            Paste an identity token to switch to that identity. This will replace your current identity.
          </p>
          <textarea
            value={importToken}
            onChange={(e) => setImportToken(e.target.value)}
            placeholder="Paste identity token here..."
            className="w-full h-24 text-xs font-mono border border-thread-sage p-3 resize-none bg-thread-paper rounded"
          />
          <div className="pt-2">
            <button
              onClick={handleImport}
              className="thread-button text-sm px-4 py-2"
            >
              Import & Switch
            </button>
          </div>
        </div>
      )}
    </div>
  );
}