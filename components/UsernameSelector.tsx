import React, { useState, useEffect } from "react";

interface UsernameSelectorProps {
  onUsernameConfirmed: (username: string) => void;
  onCancel: () => void;
  title?: string;
  subtitle?: string;
  confirmButtonText?: string;
  isLoading?: boolean;
}

export default function UsernameSelector({ 
  onUsernameConfirmed, 
  onCancel, 
  title = "Choose your username",
  subtitle = "Pick a unique username for your new identity",
  confirmButtonText = "Confirm",
  isLoading = false
}: UsernameSelectorProps) {
  const [username, setUsername] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkTimeout, setCheckTimeout] = useState<NodeJS.Timeout | null>(null);

  const isValidFormat = /^[a-z0-9\-_.]{3,20}$/.test(username);

  useEffect(() => {
    // Clear previous state when username changes
    setIsAvailable(null);
    setError(null);
    
    if (!username || !isValidFormat) {
      return;
    }

    // Clear existing timeout
    if (checkTimeout) {
      clearTimeout(checkTimeout);
      setCheckTimeout(null);
    }

    // Set new timeout for checking availability
    const timeout = setTimeout(async () => {
      setIsChecking(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/account/check-handle?handle=${encodeURIComponent(username)}`);
        const data = await response.json();
        
        if (response.ok) {
          setIsAvailable(data.available);
          if (!data.available) {
            setError(data.message || "Username is not available");
          }
        } else {
          setError(data.error || "Error checking username");
          setIsAvailable(false);
        }
      } catch {
        setError("Network error checking username");
        setIsAvailable(false);
      } finally {
        setIsChecking(false);
      }
    }, 500); // 500ms debounce

    setCheckTimeout(timeout);

    return () => {
      clearTimeout(timeout);
    };
  }, [username, isValidFormat]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canConfirm) {
      onUsernameConfirmed(username);
    }
  };

  const getStatusIcon = () => {
    if (!username || !isValidFormat) return null;
    if (isChecking) return <span className="text-gray-500">⏳</span>;
    if (isAvailable === true) return <span className="text-green-600">✓</span>;
    if (isAvailable === false) return <span className="text-red-600">✗</span>;
    return null;
  };

  const getStatusMessage = () => {
    if (!username) return null;
    if (!isValidFormat) return <span className="text-red-600 text-xs">Use 3–20 chars: a–z, 0–9, - _ .</span>;
    if (isChecking) return <span className="text-gray-500 text-xs">Checking availability...</span>;
    if (error) return <span className="text-red-600 text-xs">{error}</span>;
    if (isAvailable === true) return <span className="text-green-600 text-xs">Username is available!</span>;
    return null;
  };

  const canConfirm = username && isValidFormat && isAvailable === true && !isLoading && !isChecking;

  return (
    <div className="border border-black bg-white p-4 shadow-[4px_4px_0_#000] space-y-4 max-w-md">
      <div>
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Username</label>
          <div className="relative">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="yourname"
              className="border border-black p-2 bg-white w-full pr-8"
              disabled={isLoading}
              maxLength={20}
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              {getStatusIcon()}
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-1">@local</div>
          <div className="mt-1">{getStatusMessage()}</div>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!canConfirm}
            className={`border border-black px-4 py-2 shadow-[2px_2px_0_#000] transition-colors ${
              canConfirm 
                ? 'bg-green-200 hover:bg-green-100 cursor-pointer' 
                : 'bg-gray-200 text-gray-500 cursor-not-allowed opacity-50'
            }`}
          >
            {isLoading ? "Creating..." : confirmButtonText}
          </button>
          
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="border border-black px-4 py-2 bg-white hover:bg-gray-100 shadow-[2px_2px_0_#000]"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}