import React, { useState, useEffect, useCallback } from "react";

type PolicyDocuments = {
  terms_simple: string;
  terms_full: string;
  privacy_simple: string;
  privacy_full: string;
};

interface UsernameSelectorProps {
  onUsernameConfirmed: (username: string, betaKey?: string) => void;
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
  const [step, setStep] = useState<'username' | 'policies' | 'beta'>('username');
  const [username, setUsername] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkTimeout, setCheckTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Beta key state
  const [isBetaEnabled, setIsBetaEnabled] = useState<boolean>(false);
  const [betaKey, setBetaKey] = useState<string>("");
  const [betaStatusError, setBetaStatusError] = useState<string | null>(null);
  const [betaStatusRetryCount, setBetaStatusRetryCount] = useState<number>(0);

  // Policy agreement state
  const [policies, setPolicies] = useState<PolicyDocuments | null>(null);
  const [loadingPolicies, setLoadingPolicies] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [agreeToPrivacy, setAgreeToPrivacy] = useState(false);
  const [showFullTerms, setShowFullTerms] = useState(false);
  const [showFullPrivacy, setShowFullPrivacy] = useState(false);

  const isValidFormat = /^[a-z0-9\-_.]{3,20}$/.test(username);
  
  // Beta key format validation
  function isValidBetaKeyFormat(key: string): boolean {
    // Expected format: BETA-XXXX-XXXX-XXXX (where X is alphanumeric)
    const betaKeyRegex = /^BETA-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    return betaKeyRegex.test(key);
  }

  const checkBetaStatus = useCallback(async () => {
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
    }
  }, [betaStatusRetryCount]);

  const loadPolicies = useCallback(async () => {
    setLoadingPolicies(true);
    try {
      const response = await fetch('/api/policies');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setPolicies(data.policies);
    } catch (e) {
      // Set fallback policies
      setPolicies({
        terms_simple: "By creating an account, you agree to use our platform respectfully and responsibly.",
        terms_full: "Full terms and conditions not yet configured.",
        privacy_simple: "We protect your privacy and use reasonable security measures to protect your information.",
        privacy_full: "Full privacy policy not yet configured."
      });
    } finally {
      setLoadingPolicies(false);
    }
  }, []);

  useEffect(() => {
    // Check beta status and load policies when component mounts
    checkBetaStatus();
    loadPolicies();
  }, [checkBetaStatus, loadPolicies]);

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
    
    if (step === 'username') {
      if (canConfirmUsername) {
        // Always go to policies step first
        setStep('policies');
      }
    } else if (step === 'policies') {
      if (canConfirmPolicies) {
        // Check if beta key is required
        if (isBetaEnabled) {
          setStep('beta');
        } else {
          // No beta key required, proceed directly
          onUsernameConfirmed(username);
        }
      }
    } else if (step === 'beta') {
      if (canConfirmBeta) {
        onUsernameConfirmed(username, betaKey);
      }
    }
  };

  const handleBackFromBeta = () => {
    setStep('policies');
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

  const canConfirmUsername = username && isValidFormat && isAvailable === true && !isLoading && !isChecking;
  const canConfirmPolicies = agreeToTerms && agreeToPrivacy && !isLoading && !loadingPolicies;
  const canConfirmBeta = betaKey.trim() && isValidBetaKeyFormat(betaKey) && !isLoading;

  if (step === 'username') {
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
            <div className="text-xs text-gray-500 mt-1">@{process.env.NEXT_PUBLIC_SITE_HANDLE_DOMAIN || "YourSiteHere"}</div>
            <div className="mt-1">{getStatusMessage()}</div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!canConfirmUsername}
              className={`border border-black px-4 py-2 shadow-[2px_2px_0_#000] transition-colors ${
                canConfirmUsername 
                  ? 'bg-green-200 hover:bg-green-100 cursor-pointer' 
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed opacity-50'
              }`}
            >
              Next
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

  // Policies step
  if (step === 'policies') {
    return (
      <div className="border border-black bg-white p-4 shadow-[4px_4px_0_#000] space-y-4 max-w-2xl">
        <div>
          <h3 className="text-lg font-bold">Terms & Privacy Agreement</h3>
          <p className="text-sm text-gray-600 mt-1">
            Username: <span className="font-medium">@{username}</span>
          </p>
          <p className="text-sm text-gray-600">
            Please review and agree to our terms and privacy policy to continue.
          </p>
        </div>

        {loadingPolicies ? (
          <div className="text-center py-4">
            <span className="text-gray-500">Loading policies...</span>
          </div>
        ) : policies ? (
          <div className="space-y-4">
            {/* Terms Agreement */}
            <div className="border border-gray-300 rounded p-3 bg-gray-50">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="agree-terms"
                  checked={agreeToTerms}
                  onChange={(e) => setAgreeToTerms(e.target.checked)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <label htmlFor="agree-terms" className="font-medium text-sm cursor-pointer">
                    I agree to the Terms of Service
                  </label>
                  <div className="text-xs text-gray-600 mt-2 p-2 bg-white border border-gray-200 rounded">
                    {policies.terms_simple}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFullTerms(!showFullTerms)}
                    className="text-xs text-blue-600 hover:text-blue-800 underline mt-2"
                  >
                    {showFullTerms ? "Hide" : "Read"} full Terms of Service
                  </button>
                  {showFullTerms && (
                    <div className="text-xs text-gray-700 mt-2 p-3 bg-white border border-gray-300 rounded max-h-40 overflow-y-auto">
                      <pre className="whitespace-pre-wrap font-sans">{policies.terms_full}</pre>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Privacy Agreement */}
            <div className="border border-gray-300 rounded p-3 bg-gray-50">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="agree-privacy"
                  checked={agreeToPrivacy}
                  onChange={(e) => setAgreeToPrivacy(e.target.checked)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <label htmlFor="agree-privacy" className="font-medium text-sm cursor-pointer">
                    I agree to the Privacy Policy
                  </label>
                  <div className="text-xs text-gray-600 mt-2 p-2 bg-white border border-gray-200 rounded">
                    {policies.privacy_simple}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFullPrivacy(!showFullPrivacy)}
                    className="text-xs text-blue-600 hover:text-blue-800 underline mt-2"
                  >
                    {showFullPrivacy ? "Hide" : "Read"} full Privacy Policy
                  </button>
                  {showFullPrivacy && (
                    <div className="text-xs text-gray-700 mt-2 p-3 bg-white border border-gray-300 rounded max-h-40 overflow-y-auto">
                      <pre className="whitespace-pre-wrap font-sans">{policies.privacy_full}</pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-red-600">
            <span>Failed to load policies. Please try again.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!canConfirmPolicies}
              className={`border border-black px-4 py-2 shadow-[2px_2px_0_#000] transition-colors ${
                canConfirmPolicies 
                  ? 'bg-green-200 hover:bg-green-100 cursor-pointer' 
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed opacity-50'
              }`}
            >
              {isBetaEnabled ? "Next" : (isLoading ? "Creating..." : confirmButtonText)}
            </button>
            
            <button
              type="button"
              onClick={() => setStep('username')}
              disabled={isLoading}
              className="border border-black px-4 py-2 bg-white hover:bg-gray-100 shadow-[2px_2px_0_#000]"
            >
              Back
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

  // Beta key step
  return (
    <div className="border border-black bg-white p-4 shadow-[4px_4px_0_#000] space-y-4 max-w-md">
      <div>
        <h3 className="text-lg font-bold">Beta Access Required</h3>
        <p className="text-sm text-gray-600 mt-1">
          Username: <span className="font-medium">@{username}</span>
        </p>
        <p className="text-sm text-gray-600">
          Enter your beta key to create this account.
        </p>
      </div>

      {betaStatusError && (
        <div className="p-3 rounded text-sm bg-yellow-100 border border-yellow-300 text-yellow-800">
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
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Beta Key</label>
          <input
            type="text"
            value={betaKey}
            onChange={(e) => setBetaKey(e.target.value.toUpperCase())}
            placeholder="BETA-XXXX-XXXX-XXXX"
            className="username-input border border-black p-2 bg-white w-full font-mono text-sm"
            disabled={isLoading}
          />
          {betaKey && (
            <div className={`text-xs mt-1 ${isValidBetaKeyFormat(betaKey) ? 'text-green-600' : 'text-red-600'}`}>
              {isValidBetaKeyFormat(betaKey) 
                ? "✓ Valid beta key format"
                : "⚠️ Invalid format. Should be: BETA-XXXX-XXXX-XXXX"
              }
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!canConfirmBeta}
            className={`border border-black px-4 py-2 shadow-[2px_2px_0_#000] transition-colors ${
              canConfirmBeta 
                ? 'bg-green-200 hover:bg-green-100 cursor-pointer' 
                : 'bg-gray-200 text-gray-500 cursor-not-allowed opacity-50'
            }`}
          >
            {isLoading ? "Creating..." : confirmButtonText}
          </button>
          
          <button
            type="button"
            onClick={handleBackFromBeta}
            disabled={isLoading}
            className="border border-black px-4 py-2 bg-white hover:bg-gray-100 shadow-[2px_2px_0_#000]"
          >
            Back
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