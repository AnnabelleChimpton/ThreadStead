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
    <div className="border border-black bg-white p-4 shadow-[4px_4px_0_#000] space-y-4">
      <h3 className="text-lg font-bold border-b border-black pb-2">Identity Manager</h3>
      
      {/* Current Identity */}
      {currentIdentity && (
        <div className="space-y-2">
          <h4 className="font-semibold">Current Identity</h4>
          <div className="text-sm font-mono bg-gray-100 p-2 border border-gray-300">
            {truncateDid(currentIdentity.did)}
          </div>
        </div>
      )}

      {/* Message Display */}
      {message && (
        <div className={`p-2 border text-sm ${
          message.type === 'success' 
            ? 'bg-green-100 border-green-400 text-green-800' 
            : 'bg-red-100 border-red-400 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleExport}
          className="border border-black px-3 py-1 bg-blue-200 hover:bg-blue-100 shadow-[2px_2px_0_#000] text-sm"
        >
          Export Identity
        </button>
        
        <button
          onClick={() => setShowImport(!showImport)}
          className="border border-black px-3 py-1 bg-green-200 hover:bg-green-100 shadow-[2px_2px_0_#000] text-sm"
        >
          Import Identity
        </button>
        
        <button
          onClick={handleCreateNew}
          className="border border-black px-3 py-1 bg-yellow-200 hover:bg-yellow-100 shadow-[2px_2px_0_#000] text-sm"
        >
          Create New Identity
        </button>
      </div>

      {/* Export Section */}
      {showExport && (
        <div className="space-y-2 border border-gray-300 p-3 bg-gray-50">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Your Identity Token</h4>
            <button
              onClick={() => setShowExport(false)}
              className="text-gray-500 hover:text-black"
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-gray-600">
            Save this token securely. You can use it to restore your identity on another device.
          </p>
          <div className="relative">
            <textarea
              readOnly
              value={exportToken}
              className="w-full h-20 text-xs font-mono border border-gray-300 p-2 resize-none"
            />
            <button
              onClick={() => copyToClipboard(exportToken)}
              className="absolute top-1 right-1 px-2 py-1 text-xs bg-white border border-gray-300 hover:bg-gray-100"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* Import Section */}
      {showImport && (
        <div className="space-y-2 border border-gray-300 p-3 bg-gray-50">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Import Identity Token</h4>
            <button
              onClick={() => setShowImport(false)}
              className="text-gray-500 hover:text-black"
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-gray-600">
            Paste an identity token to switch to that identity. This will replace your current identity.
          </p>
          <textarea
            value={importToken}
            onChange={(e) => setImportToken(e.target.value)}
            placeholder="Paste identity token here..."
            className="w-full h-20 text-xs font-mono border border-gray-300 p-2 resize-none"
          />
          <button
            onClick={handleImport}
            className="border border-black px-3 py-1 bg-green-200 hover:bg-green-100 shadow-[2px_2px_0_#000] text-sm"
          >
            Import & Switch
          </button>
        </div>
      )}
    </div>
  );
}