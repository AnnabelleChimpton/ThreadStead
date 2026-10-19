import React, { useEffect, useState } from "react";
import Modal from "@/components/ui/feedback/Modal";
import Button from "@/components/ui/Button";
import { csrfFetch } from "@/lib/api/client/csrf-fetch";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";

export type ModerationStatus = "active" | "suspended" | "banned";

export interface ModeratedAccount {
  id: string;
  handle: string | null;
  moderationStatus: ModerationStatus;
  suspendedUntil?: string | null;
  moderationReason?: string | null;
}

interface HistoryRow {
  id: string;
  action: "suspend" | "ban" | "lift" | "delete";
  reason: string | null;
  until: string | null;
  reportId: string | null;
  createdAt: string;
  actor: { primaryHandle: string | null } | null;
}

interface Summary {
  history: HistoryRow[];
  posts: number;
  ringPosts: number;
  hasKey: boolean;
}

type Action = "suspend" | "ban" | "lift";

const shortHandle = (handle: string | null | undefined) => (handle ? handle.split("@")[0] : "someone");

export function formatDay(value: string | Date): string {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** "Suspended until 3 November 2026" / "Banned" / "Active" */
export function statusText(account: Pick<ModeratedAccount, "moderationStatus" | "suspendedUntil">): string {
  if (account.moderationStatus === "banned") return "Banned";
  if (account.moderationStatus === "suspended") {
    return account.suspendedUntil ? `Suspended until ${formatDay(account.suspendedUntil)}` : "Suspended";
  }
  return "Active";
}

function inDays(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const HISTORY_VERB: Record<HistoryRow["action"], string> = {
  suspend: "Suspended",
  ban: "Banned",
  lift: "Lifted",
  delete: "Deleted",
};

/**
 * Suspend, ban or lift one account, and delete a banned one. Used from the
 * admin users table and from a report (pass reportId and the action
 * resolves that report too).
 */
export default function ModerationDialog({
  account,
  reportId,
  onClose,
  onChanged,
}: {
  account: ModeratedAccount;
  reportId?: string;
  onClose: () => void;
  /** After an action: the new state, or null when the account was deleted. */
  onChanged: (account: ModeratedAccount | null) => void;
}) {
  const { showSuccess, showError } = useToast();
  const confirm = useConfirm();
  const restricted = account.moderationStatus !== "active";
  const [action, setAction] = useState<Action>(restricted ? "lift" : "suspend");
  const [until, setUntil] = useState(inDays(7));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [hubFailures, setHubFailures] = useState<number | null>(null);
  const name = shortHandle(account.handle);

  useEffect(() => {
    let live = true;
    fetch(`/api/admin/moderation?userId=${encodeURIComponent(account.id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => live && data && setSummary(data))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [account.id]);

  async function apply() {
    setBusy(true);
    try {
      const body =
        action === "suspend"
          ? { action, userId: account.id, until, reason, reportId }
          : { action, userId: account.id, reason, reportId };
      const res = await csrfFetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showError(data.error || "Couldn't do that. Try again.");
        return;
      }
      const next: ModeratedAccount = {
        ...account,
        moderationStatus: data.user.moderationStatus,
        suspendedUntil: data.user.suspendedUntil,
        moderationReason: reason.trim() || null,
      };
      showSuccess(
        action === "lift" ? `@${name} is back.` : `@${name} is ${statusText(next).toLowerCase()}.`
      );
      onChanged(next);
    } catch {
      showError("Couldn't do that. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount(force = false) {
    const ringPosts = summary?.ringPosts ?? 0;
    const ok = await confirm({
      title: force ? `Delete @${name} anyway?` : `Delete @${name} for good?`,
      message: force
        ? "Their ring posts that couldn't come off Ring Hub will stay there until a ring owner removes them."
        : `${ringPosts ? `Their ${ringPosts} ring post${ringPosts === 1 ? "" : "s"} come off Ring Hub first. Then their` : "Their"} posts, home, guestbook and everything else go. This can't be undone.`,
      confirmText: force ? "Delete anyway" : "Delete",
      variant: "danger",
    });
    if (!ok) return;

    setBusy(true);
    try {
      const res = await csrfFetch("/api/admin/delete-user", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: account.id, force, reason: account.moderationReason || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && Array.isArray(data.failed)) {
        setHubFailures(data.failed.length);
        return;
      }
      if (!res.ok) {
        showError(data.error || "Couldn't delete the account. Try again.");
        return;
      }
      showSuccess(`@${name} is deleted.`);
      onChanged(null);
    } catch {
      showError("Couldn't delete the account. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const options: Array<{ value: Action; label: string }> = [
    { value: "suspend", label: restricted ? "Suspend until a new date" : "Suspend until a date" },
    ...(account.moderationStatus !== "banned" ? [{ value: "ban" as const, label: "Ban" }] : []),
    ...(restricted ? [{ value: "lift" as const, label: account.moderationStatus === "banned" ? "Lift the ban" : "Lift the suspension" }] : []),
  ];
  const needsReason = action !== "lift";
  const canApply = !busy && (!needsReason || reason.trim().length > 0) && (action !== "suspend" || !!until);

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Moderate @${name}`}
      maxWidth="max-w-lg"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant={action === "ban" ? "danger" : "primary"} onClick={apply} disabled={!canApply}>
            {busy ? "Saving..." : action === "suspend" ? "Suspend" : action === "ban" ? "Ban" : "Lift"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-sm">
        <p>
          <strong>{statusText(account)}.</strong>
          {account.moderationReason && <> Reason: {account.moderationReason}</>}
        </p>

        <fieldset className="space-y-2">
          <legend className="font-semibold mb-1">What to do</legend>
          {options.map((option) => (
            <label key={option.value} className="flex items-center gap-2">
              <input
                type="radio"
                name="moderation-action"
                value={option.value}
                checked={action === option.value}
                onChange={() => setAction(option.value)}
              />
              {option.label}
            </label>
          ))}
        </fieldset>

        {action === "suspend" && (
          <label className="block">
            <span className="font-semibold">Until</span>
            <input
              type="date"
              className="block mt-1 border border-black p-2 bg-white"
              value={until}
              min={inDays(1)}
              onChange={(e) => setUntil(e.target.value)}
            />
          </label>
        )}

        <label className="block">
          <span className="font-semibold">Reason{needsReason ? "" : " (optional)"}</span>
          <input
            type="text"
            className="block w-full mt-1 border border-black p-2 bg-white"
            value={reason}
            maxLength={500}
            placeholder={needsReason ? "Spam, for example" : ""}
            onChange={(e) => setReason(e.target.value)}
          />
          <span className="text-xs text-gray-600">Only admins see this.</span>
        </label>

        {action !== "lift" && (
          <p className="text-gray-700">
            They&apos;re signed out and can&apos;t post, comment, sign guestbooks or chat. They drop out of the street,
            New Neighbors, the directory, search and feeds, and their pages show as not found.
            {action === "suspend" ? " It ends by itself on that day." : ""}
          </p>
        )}
        {reportId && <p className="text-gray-700">This also marks the report resolved.</p>}

        {account.moderationStatus === "banned" && (
          <div className="border-t border-dotted border-gray-400 pt-3 space-y-2">
            <p className="font-semibold">Delete the account</p>
            <p className="text-gray-700">
              The ban already hides everything. Deleting is for good
              {summary ? `: ${summary.posts} post${summary.posts === 1 ? "" : "s"}, ${summary.ringPosts} in rings` : ""}.
              {summary && !summary.hasKey && summary.ringPosts > 0
                ? " Their signing key is gone, so ring owners remove their ring posts instead."
                : ""}
            </p>
            {hubFailures !== null ? (
              <>
                <p className="text-red-700">
                  {hubFailures} ring post{hubFailures === 1 ? "" : "s"} couldn&apos;t come off Ring Hub, so nothing was
                  deleted. Try again later, or delete anyway.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => deleteAccount(false)} disabled={busy}>
                    Try again
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => deleteAccount(true)} disabled={busy}>
                    Delete anyway
                  </Button>
                </div>
              </>
            ) : (
              <Button size="sm" variant="danger" onClick={() => deleteAccount(false)} disabled={busy}>
                Delete account
              </Button>
            )}
          </div>
        )}

        {summary && summary.history.length > 0 && (
          <div className="border-t border-dotted border-gray-400 pt-3">
            <p className="font-semibold mb-1">History</p>
            <ul className="space-y-1 text-gray-700">
              {summary.history.map((row) => (
                <li key={row.id}>
                  {HISTORY_VERB[row.action]}
                  {row.action === "suspend" && row.until ? ` until ${formatDay(row.until)}` : ""} by @
                  {shortHandle(row.actor?.primaryHandle)} on {formatDay(row.createdAt)}
                  {row.reason ? `: ${row.reason}` : ""}
                  {row.reportId ? " (from a report)" : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}
