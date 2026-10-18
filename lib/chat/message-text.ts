/** Longest chat message or whisper body, after trimming. */
export const MAX_MESSAGE_LENGTH = 280;

/**
 * Trim, strip a leading `/me ` into `isAction`, cap the length and strip HTML
 * tags. An empty `text` means there is nothing to send.
 */
export function sanitizeMessage(body: unknown): { text: string; isAction: boolean } {
  if (typeof body !== "string") return { text: "", isAction: false };

  let text = body.trim();

  const isAction = text.startsWith("/me ");
  if (isAction) {
    text = text.substring(4);
  }

  if (text.length > MAX_MESSAGE_LENGTH) {
    text = text.substring(0, MAX_MESSAGE_LENGTH);
  }

  // Basic XSS prevention - strip HTML tags
  text = text.replace(/<[^>]*>/g, "");

  return { text, isAction };
}

/**
 * Resolve `/flip` and `/roll [max]` on the server so results are fair and
 * can't be spoofed by hand-typing "/me rolls 20". Anything else is returned
 * trimmed and otherwise unchanged.
 */
export function resolveDiceCommands(body: unknown, random: () => number = Math.random): string {
  const raw = typeof body === "string" ? body.trim() : "";
  if (raw === "/flip" || raw.startsWith("/flip ")) {
    return `/me flips a coin: ${random() < 0.5 ? "Heads" : "Tails"}`;
  }
  if (raw === "/roll" || raw.startsWith("/roll ")) {
    let max = parseInt(raw.split(/\s+/)[1], 10);
    if (!Number.isFinite(max) || max < 1) max = 100;
    if (max > 1000000) max = 1000000;
    const roll = Math.floor(random() * max) + 1;
    return `/me rolls ${roll} (1-${max})`;
  }
  return raw;
}
