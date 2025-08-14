import React, { useState, useEffect } from "react";
import { getOrCreateLocalDid, exportIdentityToken, importIdentityToken, createNewIdentityWithUsername, LocalKeypair } from "@/lib/did-client";
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

  useEffect(() => {
    loadCurrentIdentity();
  }, []);

  async function loadCurrentIdentity() {
    try {
      const identity = await getOrCreateLocalDid();
      setCurrentIdentity(identity);
    } catch (e) {
      console.error("Failed to load identity:", e);
    }
  }

  async function handleExport() {
    try {
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
      await importIdentityToken(importToken.trim());
      await loadCurrentIdentity();
      setImportToken("");
      setShowImport(false);
      setMessage({ type: 'success', text: 'Identity imported successfully!' });
      // Reload to reflect new identity
      setTimeout(() => window.location.reload(), 1000);
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
      await createNewIdentityWithUsername(username);
      setMessage({ type: 'success', text: `New identity created with username @${username}!` });
      // Reload to reflect new identity and redirect to user page
      setTimeout(() => window.location.href = `/${username}`, 1000);
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
    <div className="thread-module space-y-6 max-w-2xl">
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

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-start">
        <button
          onClick={handleCreateNew}
          className="thread-button text-sm px-4 py-2"
        >
          Create New Identity
        </button>
        
        <button
          onClick={handleExport}
          className="px-4 py-2 text-sm border border-thread-sage bg-thread-paper hover:bg-thread-cream rounded shadow-cozySm transition-all"
        >
          Export Identity
        </button>
        
        <button
          onClick={() => setShowImport(!showImport)}
          className="px-4 py-2 text-sm border border-thread-sage bg-thread-paper hover:bg-thread-cream rounded shadow-cozySm transition-all"
        >
          Import Identity
        </button>
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