import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import BadgeSelector from "../BadgeSelector";

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
  const [formData, setFormData] = useState({
    name: `${originalRing.name} Fork`,
    slug: `${originalRing.slug.slice(0, 20)}-fork`.slice(0, 25),
    description: originalRing.description || "",
    joinType: "open" as "open" | "invite" | "closed",
    visibility: "public" as "public" | "unlisted" | "private"
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    } catch (error) {
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

    if (!slugStatus.isValid || slugStatus.isAvailable === false) {
      setError("Please fix the slug issues before submitting");
      return;
    }

    try {
      setCreating(true);
      setError(null);
      
      const response = await fetch(`/api/threadrings/${originalRing.slug}/fork`, {
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
        throw new Error(data.error || "Failed to fork ThreadRing");
      }

      // Redirect to the new forked ThreadRing
      router.push(`/threadrings/${data.threadRing.slug}`);
      
    } catch (error: any) {
      console.error("Error forking ThreadRing:", error);
      setError(error.message || "Failed to fork ThreadRing");
    } finally {
      setCreating(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className={`bg-white border border-black p-6 shadow-[2px_2px_0_#000] ${className}`}>
      <h2 className="text-xl font-bold mb-4">
        Fork &quot;{originalRing.name}&quot;
      </h2>
      <p className="text-sm text-gray-600 mb-6">
        Create your own version of this ThreadRing with custom settings and members.
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
            className="w-full border border-black p-3 bg-white focus:outline-none focus:shadow-[2px_2px_0_#000]"
            placeholder="My Awesome ThreadRing"
            maxLength={100}
            required
          />
          <div className="text-xs text-gray-600 mt-1">
            {formData.name.length}/100 characters
          </div>
        </div>

        {/* Slug */}
        <div>
          <label htmlFor="slug" className="block text-sm font-medium mb-2">
            ThreadRing Slug (URL) *
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
              placeholder="my-fork"
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
            threadRingName={formData.name || "ThreadRing Fork"}
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
            disabled={creating}
            className="flex-1 border border-black px-6 py-3 bg-yellow-200 hover:bg-yellow-300 shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {creating ? "Creating Fork..." : "Create Fork"}
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
        <h4 className="font-medium mb-1">About Forking:</h4>
        <ul className="space-y-1">
          <li>• You&apos;ll become the curator of the new ThreadRing</li>
          <li>• The original curator will be notified of the fork</li>
          <li>• Members and posts are not copied over</li>
          <li>• The fork relationship is tracked for lineage</li>
        </ul>
      </div>
    </div>
  );
}