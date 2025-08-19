import { useState } from "react";

interface ThreadRingInviteFormProps {
  threadRingSlug: string;
  threadRingName: string;
  onInviteSent?: () => void;
  className?: string;
}

export default function ThreadRingInviteForm({ 
  threadRingSlug, 
  threadRingName, 
  onInviteSent,
  className = ""
}: ThreadRingInviteFormProps) {
  const [username, setUsername] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setMessage({ type: "error", text: "Username is required" });
      return;
    }

    try {
      setSending(true);
      setMessage(null);
      
      const response = await fetch(`/api/threadrings/${threadRingSlug}/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim()
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send invite");
      }

      setMessage({ type: "success", text: data.message });
      setUsername("");
      onInviteSent?.();
      
    } catch (error: any) {
      console.error("Error sending invite:", error);
      setMessage({ type: "error", text: error.message || "Failed to send invite" });
    } finally {
      setSending(false);
    }
  };

  const handleReset = () => {
    setUsername("");
    setMessage(null);
  };

  return (
    <div className={`bg-white border border-black p-4 shadow-[2px_2px_0_#000] ${className}`}>
      <h3 className="font-bold mb-3">Invite Member to {threadRingName}</h3>
      
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="username" className="block text-sm font-medium mb-1">
            Username
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username (without @)"
              className="flex-1 border border-black px-3 py-2 bg-white focus:outline-none focus:shadow-[2px_2px_0_#000]"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !username.trim()}
              className="border border-black px-4 py-2 bg-yellow-200 hover:bg-yellow-300 shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {sending ? "Sending..." : "Invite"}
            </button>
          </div>
        </div>

        {message && (
          <div className={`text-sm p-2 border ${
            message.type === "success" 
              ? "bg-green-100 border-green-300 text-green-800" 
              : "bg-red-100 border-red-300 text-red-800"
          }`}>
            {message.text}
            {message.type === "success" && (
              <button
                type="button"
                onClick={handleReset}
                className="ml-2 underline hover:no-underline"
              >
                Send another
              </button>
            )}
          </div>
        )}
      </form>
      
      <div className="mt-3 text-xs text-gray-600">
        <p><strong>Tip:</strong> Enter just the username without the @ symbol.</p>
        <p>Only curators and moderators can send invites.</p>
      </div>
    </div>
  );
}