import { useState } from "react";
import Button from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";
import { csrfFetch } from "@/lib/api/client/csrf-fetch";

/** Invite a resident to a ring by their exact username (Manage › People). */
export default function ThreadRingInviteForm({ threadRingSlug }: { threadRingSlug: string }) {
  const [username, setUsername] = useState("");
  const [sending, setSending] = useState(false);
  const { showSuccess, showError } = useToast();

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setSending(true);
    try {
      const res = await csrfFetch(`/api/threadrings/${encodeURIComponent(threadRingSlug)}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(res.status === 404 ? "There's nobody here by that username." : data.error || "Couldn't send the invite. Try again.");
      }
      showSuccess(data.message);
      setUsername("");
    } catch (error) {
      showError(error instanceof Error && error.message ? error.message : "Couldn't send the invite. Try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={send} className="flex flex-wrap gap-2 max-w-lg">
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Their username, like @bea"
        aria-label="Their username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        disabled={sending}
        className="flex-1 min-w-[12rem] border-2 border-nb-ink-mid/60 rounded-md p-3 bg-white text-nb-ink focus:outline-none focus:border-nb-ink-mid"
      />
      <Button type="submit" disabled={sending || !username.trim()} className="thread-button disabled:opacity-50">
        {sending ? "Sending..." : "Send invite"}
      </Button>
    </form>
  );
}
