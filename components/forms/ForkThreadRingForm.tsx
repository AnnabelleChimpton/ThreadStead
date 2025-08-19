import { useState } from "react";
import { useRouter } from "next/router";

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
    description: originalRing.description || "",
    joinType: "open" as "open" | "invite" | "closed",
    visibility: "public" as "public" | "unlisted" | "private"
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError("ThreadRing name is required");
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
        body: JSON.stringify(formData),
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