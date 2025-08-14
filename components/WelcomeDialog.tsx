import React, { useState } from "react";
import { exportIdentityToken } from "@/lib/did-client";

interface WelcomeDialogProps {
  username: string;
  onComplete: () => void;
  onSkip: () => void;
}

export default function WelcomeDialog({ username, onComplete, onSkip }: WelcomeDialogProps) {
  const [step, setStep] = useState<'welcome' | 'backup' | 'verify'>('welcome');
  const [backupToken, setBackupToken] = useState<string>("");
  const [hasBackedUp, setHasBackedUp] = useState(false);

  async function handleCreateBackup() {
    try {
      const token = await exportIdentityToken();
      setBackupToken(token);
      setStep('backup');
    } catch (e) {
      console.error("Failed to create backup:", e);
    }
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(backupToken).then(() => {
      setHasBackedUp(true);
    }).catch(() => {
      // Fallback for older browsers or clipboard permission issues
      setHasBackedUp(true);
    });
  }

  function downloadAsFile() {
    const blob = new Blob([backupToken], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${username}-identity-backup.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setHasBackedUp(true);
  }

  if (step === 'welcome') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-thread-paper border-2 border-thread-sage rounded-lg max-w-lg w-full p-6 space-y-4">
          <div className="text-center">
            <h2 className="thread-headline text-xl mb-2">🎉 Welcome to Retro Social!</h2>
            <p className="text-thread-sage">
              Your account <span className="font-medium text-thread-pine">@{username}</span> has been created successfully!
            </p>
          </div>
          
          <div className="bg-thread-cream border border-thread-sage rounded p-4 space-y-3">
            <h3 className="thread-label text-base flex items-center gap-2">
              <span>🔐</span>
              Important: Your Digital Identity
            </h3>
            <p className="text-sm text-thread-charcoal leading-relaxed">
              Your account is secured by a unique digital key that&apos;s stored only on this device. 
              If you lose this device or clear your browser data, you&apos;ll lose access to your account forever.
            </p>
            <p className="text-sm font-medium text-thread-pine">
              Let&apos;s create a secure backup of your key right now!
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleCreateBackup}
              className="flex-1 thread-button text-sm py-3 flex items-center justify-center gap-2"
            >
              <span>🛡️</span>
              Create Backup Now
            </button>
            <button
              onClick={onSkip}
              className="px-4 py-3 text-sm border border-thread-sage bg-thread-paper hover:bg-thread-cream text-thread-charcoal rounded transition-all"
            >
              Skip (Risky)
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'backup') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-thread-paper border-2 border-thread-sage rounded-lg max-w-2xl w-full p-6 space-y-4">
          <div className="text-center">
            <h2 className="thread-headline text-xl mb-2">🔑 Your Identity Backup Key</h2>
            <p className="text-thread-sage">
              Save this backup key securely. You&apos;ll need it to recover your account.
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-thread-cream border border-thread-sage rounded p-4">
              <h3 className="thread-label text-base mb-3 flex items-center gap-2">
                <span>⚠️</span>
                Security Guidelines
              </h3>
              <ul className="text-sm text-thread-charcoal space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Save to a password manager (recommended)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Download and store in a secure location</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Make multiple copies in different places</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-0.5">✗</span>
                  <span>Never share this key with anyone</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-0.5">✗</span>
                  <span>Don&apos;t store in plain text files or emails</span>
                </li>
              </ul>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-thread-sage mb-2">
                Your Identity Backup Key:
              </label>
              <textarea
                readOnly
                value={backupToken}
                className="w-full h-32 text-xs font-mono border border-thread-sage p-3 resize-none bg-thread-paper rounded"
                style={{ userSelect: 'all' }}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={copyToClipboard}
                className="flex-1 px-4 py-3 text-sm bg-thread-cream border border-thread-sage hover:bg-thread-sage hover:text-thread-paper rounded transition-all flex items-center justify-center gap-2"
              >
                <span>📋</span>
                Copy to Clipboard
              </button>
              <button
                onClick={downloadAsFile}
                className="flex-1 px-4 py-3 text-sm bg-thread-cream border border-thread-sage hover:bg-thread-sage hover:text-thread-paper rounded transition-all flex items-center justify-center gap-2"
              >
                <span>💾</span>
                Download File
              </button>
            </div>

            {hasBackedUp && (
              <div className="text-center">
                <p className="text-sm text-green-600 font-medium mb-3">
                  ✓ Great! You&apos;ve saved your backup key.
                </p>
                <button
                  onClick={onComplete}
                  className="thread-button text-sm px-6 py-3"
                >
                  Continue to Your Profile →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}