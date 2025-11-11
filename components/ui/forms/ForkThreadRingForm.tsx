import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import BadgeSelector from "../../shared/BadgeSelector";
import Toast from "../feedback/Toast";
import { useToast } from "@/hooks/useToast";
import { validateThreadRingName } from "@/lib/domain/validation";
import { csrfFetch } from "@/lib/api/client/csrf-fetch";

interface ForkThreadRingFormProps {
  originalRing: {
    name: string;
    slug: string;
    description?: string | null;
  };
  onCancel?: () => void;
  className?: string;
}

export default function ForkThreadRingForm({ 
  originalRing, 
  onCancel,
  className = ""
}: ForkThreadRingFormProps) {
  const router = useRouter();
  
  // Function to generate slug from name (moved up for initial state)
  const generateSlugFromName = useCallback((name: string) => {
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric chars except spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple consecutive hyphens with single hyphen
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      .substring(0, 25); // Limit to 25 characters
  }, []);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: originalRing.description || "",
    joinType: "open" as "open" | "invite" | "closed",
    visibility: "public" as "public" | "unlisted" | "private"
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  
  // Toast notifications
  const { toasts, showError, showWarning, hideToast } = useToast();

  // Helper function to format rate limit error messages
  const formatRateLimitError = useCallback((errorData: any) => {
    const { details } = errorData;
    
    if (!details) {
      return errorData.message || "Rate limit exceeded";
    }

    const resetDate = new Date(details.resetTime);
    const now = new Date();
    const timeDiff = resetDate.getTime() - now.getTime();
    
    switch (details.errorType) {
      case 'quality_gate':
        return {
          title: "Quality Gate Not Met",
          message: "Please add at least one post to your newest ThreadRing before starting another Ring. This helps maintain community quality.",
          type: 'warning' as const
        };
        
      case 'cooldown':
        const cooldownHours = Math.ceil(timeDiff / (1000 * 60 * 60));
        return {
          title: "Account Temporarily Restricted",
          message: `Your account is in cooldown until ${resetDate.toLocaleDateString()} at ${resetDate.toLocaleTimeString()}. Please try again later.`,
          type: 'error' as const
        };
        
      case 'rate_limit':
        if (details.remaining.hourly === 0) {
          const minutesLeft = Math.ceil(timeDiff / (1000 * 60));
          return {
            title: "Hourly Ring Creation Limit Reached",
            message: `You've reached your hourly Ring creation limit. Try again in ${minutesLeft} minutes.`,
            type: 'warning' as const
          };
        } else if (details.remaining.daily === 0) {
          return {
            title: "Daily Ring Creation Limit Reached", 
            message: "You've reached today's Ring creation limit. Come back tomorrow to start more Rings!",
            type: 'warning' as const
          };
        } else if (details.remaining.weekly === 0) {
          return {
            title: "Weekly Ring Creation Limit Reached",
            message: "You've used all your Ring creations for this week. Limit resets next week.",
            type: 'warning' as const
          };
        }
        break;
    }
    
    return {
      title: "Ring Creation Limit Exceeded",
      message: errorData.message || "You've reached your Ring creation limit. Please try again later.",
      type: 'error' as const
    };
  }, []);
  const [badgeData, setBadgeData] = useState<{
    templateId?: string;
    backgroundColor?: string;
    textColor?: string;
    title?: string;
    subtitle?: string;
  }>({ templateId: 'classic_blue' });

  // Slug validation state
  const [slugStatus, setSlugStatus] = useState<{
    isValid: boolean;
    isAvailable: boolean | null;
    isChecking: boolean;
    message: string;
  }>({
    isValid: true,
    isAvailable: null,
    isChecking: false,
    message: ''
  });

  // Slug validation function
  const validateSlug = useCallback((slug: string) => {
    // Length check (3-25 characters)
    if (slug.length === 0) {
      return { isValid: false, message: "Slug is required" };
    }
    if (slug.length < 3) {
      return { isValid: false, message: "Slug must be at least 3 characters" };
    }
    if (slug.length > 25) {
      return { isValid: false, message: "Slug must be 25 characters or less" };
    }

    // Pattern check: ^[a-z0-9-]+$
    const pattern = /^[a-z0-9-]+$/;
    if (!pattern.test(slug)) {
      return { isValid: false, message: "Slug can only contain lowercase letters, numbers, and hyphens" };
    }

    // Cannot start or end with hyphen
    if (slug.startsWith('-') || slug.endsWith('-')) {
      return { isValid: false, message: "Slug cannot start or end with a hyphen" };
    }

    // Cannot contain consecutive hyphens
    if (slug.includes('--')) {
      return { isValid: false, message: "Slug cannot contain consecutive hyphens" };
    }

    return { isValid: true, message: "" };
  }, []);

  // Check slug availability with Ring Hub API
  const checkSlugAvailability = useCallback(async (slug: string) => {
    if (!slug) return;

    setSlugStatus(prev => ({ ...prev, isChecking: true }));

    try {
      const response = await fetch(`/api/threadrings/check-availability/${encodeURIComponent(slug)}`);
      const data = await response.json();

      if (response.ok) {
        setSlugStatus(prev => ({
          ...prev,
          isAvailable: data.available,
          message: data.message,
          isChecking: false
        }));
      } else {
        setSlugStatus(prev => ({
          ...prev,
          isAvailable: false,
          message: data.message || "Failed to check availability",
          isChecking: false
        }));
      }
    } catch {
      setSlugStatus(prev => ({
        ...prev,
        isAvailable: null,
        message: "Failed to check availability",
        isChecking: false
      }));
    }
  }, []);

  // Debounced slug validation and availability check
  useEffect(() => {
    const validation = validateSlug(formData.slug);
    setSlugStatus(prev => ({
      ...prev,
      isValid: validation.isValid,
      message: validation.message || prev.message,
      isAvailable: validation.isValid ? prev.isAvailable : null
    }));

    if (validation.isValid && formData.slug) {
      const timeoutId = setTimeout(() => {
        checkSlugAvailability(formData.slug);
      }, 500); // 500ms debounce

      return () => clearTimeout(timeoutId);
    }
  }, [formData.slug, validateSlug, checkSlugAvailability]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError("ThreadRing name is required");
      return;
    }

    // Validate ThreadRing name for offensive content
    const nameValidation = validateThreadRingName(formData.name.trim());
    if (!nameValidation.ok) {
      setError(nameValidation.message);
      return;
    }

    if (!slugStatus.isValid || slugStatus.isAvailable === false) {
      setError("Please fix the slug issues before submitting");
      return;
    }

    try {
      setCreating(true);
      setError(null);
      
      const response = await csrfFetch(`/api/threadrings/${originalRing.slug}/fork`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          badge: badgeData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle rate limiting errors with friendly messages
        if (response.status === 429) {
          setError(null); // Clear any existing form errors
          const errorInfo = formatRateLimitError(data);
          if (errorInfo.type === 'warning') {
            showWarning(errorInfo.message);
          } else {
            showError(errorInfo.message);
          }
          setCreating(false); // Make sure to stop the loading state
          return; // Don't throw error for rate limits
        }
        
        throw new Error(data.error || "Failed to create new Ring");
      }

      // Redirect to the new Ring
      router.push(`/threadrings/${data.threadRing.slug}`);
      
    } catch (error: any) {
      console.error("Error creating new Ring:", error);
      setError(error.message || "Failed to create new Ring");
    } finally {
      setCreating(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    if (field === 'name') {
      // Validate name for offensive content
      const nameValidation = validateThreadRingName(value.trim());
      setNameError(nameValidation.ok ? null : nameValidation.message);
      
      // Always auto-generate slug from name when name changes
      const newSlug = generateSlugFromName(value);
      setFormData(prev => ({ 
        ...prev, 
        [field]: value,
        slug: newSlug
      }));
      // Reset manual edit flag since we're now auto-generating again
      setSlugManuallyEdited(false);
    } else if (field === 'slug') {
      // Mark slug as manually edited when user changes it directly
      setSlugManuallyEdited(true);
      setFormData(prev => ({ ...prev, [field]: value }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  return (
    <div className={`bg-white border border-black p-6 shadow-[2px_2px_0_#000] ${className}`}>
      <h2 className="text-xl font-bold mb-4">
        Start a New Ring from &quot;{originalRing.name}&quot;
      </h2>
      <p className="text-sm text-gray-600 mb-6">
        Create your own Ring branching from this community with custom settings and members.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-2">
            ThreadRing Name *
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className={`w-full border p-3 bg-white focus:outline-none focus:shadow-[2px_2px_0_#000] ${
              nameError ? 'border-red-500' : 'border-black'
            }`}
            placeholder={`e.g. "${originalRing.name} Community" or your own creative name`}
            maxLength={100}
            required
          />
          {nameError && (
            <div className="text-red-600 text-sm mt-1">{nameError}</div>
          )}
          <div className="text-xs text-gray-600 mt-1">
            {formData.name.length}/100 characters
          </div>
        </div>

        {/* Slug */}
        <div>
          <label htmlFor="slug" className="block text-sm font-medium mb-2">
            ThreadRing Slug (URL) *
            {!slugManuallyEdited && (
              <span className="ml-2 text-xs text-blue-600 font-normal">
                (auto-generated from name)
              </span>
            )}
          </label>
          <div className="relative">
            <input
              type="text"
              id="slug"
              value={formData.slug}
              onChange={(e) => handleChange("slug", e.target.value.toLowerCase())}
              className={`w-full border p-3 bg-white focus:outline-none focus:shadow-[2px_2px_0_#000] ${
                !slugStatus.isValid ? 'border-red-500' : 
                slugStatus.isAvailable === false ? 'border-red-500' : 
                slugStatus.isAvailable === true ? 'border-green-500' : 'border-black'
              }`}
              placeholder="my-ring"
              maxLength={25}
              pattern="[a-z0-9-]+"
              required
            />
            {slugStatus.isChecking && (
              <div className="absolute right-3 top-3">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
              </div>
            )}
          </div>
          <div className="text-xs mt-1 space-y-1">
            <div className="text-gray-600">
              {formData.slug.length}/25 characters
            </div>
            {slugStatus.message && (
              <div className={`${
                !slugStatus.isValid || slugStatus.isAvailable === false ? 'text-red-600' : 
                slugStatus.isAvailable === true ? 'text-green-600' : 'text-gray-600'
              }`}>
                {slugStatus.message}
                {slugStatus.isAvailable === true && ' ✓'}
                {slugStatus.isAvailable === false && ' ✗'}
              </div>
            )}
            <div className="text-gray-500">
              URL will be: /threadrings/{formData.slug || 'your-slug'}
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-2">
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            rows={3}
            className="w-full border border-black p-3 bg-white focus:outline-none focus:shadow-[2px_2px_0_#000] resize-none"
            placeholder="What's this ThreadRing about? (Optional)"
            maxLength={500}
          />
          <div className="text-xs text-gray-600 mt-1">
            {formData.description.length}/500 characters
          </div>
        </div>

        {/* Join Type */}
        <div>
          <label htmlFor="joinType" className="block text-sm font-medium mb-2">
            Who can join?
          </label>
          <select
            id="joinType"
            value={formData.joinType}
            onChange={(e) => handleChange("joinType", e.target.value)}
            className="w-full border border-black p-3 bg-white focus:outline-none"
          >
            <option value="open">Open - Anyone can join</option>
            <option value="invite">Invite Only - Members by invitation</option>
            <option value="closed">Closed - No new members</option>
          </select>
        </div>

        {/* Visibility */}
        <div>
          <label htmlFor="visibility" className="block text-sm font-medium mb-2">
            ThreadRing Visibility
          </label>
          <select
            id="visibility"
            value={formData.visibility}
            onChange={(e) => handleChange("visibility", e.target.value)}
            className="w-full border border-black p-3 bg-white focus:outline-none"
          >
            <option value="public">Public - Visible to everyone</option>
            <option value="unlisted">Unlisted - Only visible via direct link</option>
            <option value="private">Private - Only visible to members</option>
          </select>
        </div>

        {/* Badge Selection */}
        <div>
          <BadgeSelector
            threadRingName={formData.name}
            onBadgeChange={setBadgeData}
            initialBadge={badgeData}
            compact={true}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-100 border border-red-300 text-red-800 p-3 text-sm">
            {error}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={creating || !!nameError}
            className="flex-1 border border-black px-6 py-3 bg-yellow-200 hover:bg-yellow-300 shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {creating ? "Starting New Ring..." : "Start New Ring"}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={creating}
              className="border border-black px-6 py-3 bg-white hover:bg-gray-100 shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="mt-6 p-3 bg-gray-50 border border-gray-300 text-xs text-gray-700">
        <h4 className="font-medium mb-1">About Starting a New Ring:</h4>
        <ul className="space-y-1">
          <li>• You&apos;ll become the Ring Host of the new ThreadRing</li>
          <li>• The original Ring Host will be notified</li>
          <li>• Members and posts are not copied over</li>
          <li>• The connection is tracked in the Ring Family Tree</li>
        </ul>
      </div>
      
      {/* Toast Notifications */}
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => hideToast(toast.id)}
        />
      ))}
    </div>
  );
}