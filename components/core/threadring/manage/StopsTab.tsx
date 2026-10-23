import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Button from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { csrfFetch } from "@/lib/api/client/csrf-fetch";
import type { StopsData } from "@/lib/rings/manage";
import type { ManageRing } from "@/pages/tr/[slug]/manage";
import { ChoiceCards, HELP, Heading, ROWS, type Choice } from "./form";

type Row = StopsData["rows"][number];
type Action = "approve" | "hide" | "unhide";

const RULES: Choice<StopsData["rule"]>[] = [
  { id: "allow", label: "List them as soon as they're proved (I can hide one after)" },
  { id: "ask", label: "Ask me first" },
  { id: "off", label: "No outside sites: everyone's stop is their pixel home" },
];
const ACTION_LABELS: Record<Action, string> = { approve: "Let it in", hide: "Hide", unhide: "Unhide" };

/** Members' own sites as their stops on the ring's strip: the host's rule and say (lib/rings/stops.ts). */
export default function StopsTab({ ring, stops }: { ring: ManageRing; stops: StopsData }) {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState<string | null>(null);

  const call = async (method: "POST" | "PUT", body: object, done: string) => {
    const res = await csrfFetch(`/api/threadrings/${encodeURIComponent(ring.slug)}/outside-sites`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      showError(data?.error || "Couldn't do that. Try again.");
      return;
    }
    showSuccess(done);
    await router.replace(router.asPath, undefined, { scroll: false });
  };

  const act = async (row: Row, action: Action) => {
    if (action === "hide") {
      const ok = await confirm({
        title: `Hide ${row.site.address} from ${ring.name}?`,
        message: `${row.name}'s pixel home becomes their stop here instead, and I'll let them know. You can unhide it later.`,
        confirmText: "Hide",
        variant: "danger",
      });
      if (!ok) return;
    }
    setBusy(row.stopId);
    try {
      await call("POST", { stopId: row.stopId, action }, action === "approve" ? "It's in the ring now." : action === "hide" ? "Hidden." : "It's back in the ring.");
    } finally {
      setBusy(null);
    }
  };

  const group = (title: string, status: Row["status"], actions: Action[]) => {
    const rows = stops.rows.filter((r) => r.status === status);
    if (rows.length === 0) return null;
    return (
      <div>
        <Heading>{title}</Heading>
        <ul className={`${ROWS} mt-2`}>
          {rows.map((row) => (
            <li key={row.stopId} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <a href={row.site.url} rel={status === "listed" ? "ugc" : "ugc nofollow"} className="font-semibold text-nb-ink underline break-words">
                  {row.site.title || row.site.address}
                </a>
                <div className="text-sm text-nb-ink-mid break-words">
                  {row.name}&apos;s site · {row.site.address}
                  {row.reason ? ` · hidden: ${row.reason}` : ""}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {actions.map((a) => (
                  <Button key={a} variant={a === "approve" ? "primary" : "secondary"} size="sm" disabled={busy === row.stopId} onClick={() => act(row, a)}>
                    {ACTION_LABELS[a]}
                  </Button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <Heading>Members&apos; own sites</Heading>
        <p className={HELP}>
          Every member is a stop on the ring&apos;s strip. When they&apos;ve added their own site, it can be their stop instead of
          their pixel home.
        </p>
        {!stops.isPublic && <p className={HELP}>Strips are for public rings, so this waits until the ring is seen by everyone.</p>}
        <ChoiceCards name="outside-sites" plain choices={RULES} value={stops.rule} onChange={(rule) => call("PUT", { rule }, "Saved.")} />
        {stops.ruleIsDefault && <p className="text-sm text-nb-ink-mid mt-2 mb-0">Until you pick, it follows who can join.</p>}
      </div>

      {group("Waiting for a yes", "pending", ["approve", "hide"])}
      {group("In the ring", "listed", ["hide"])}
      {group("Hidden", "hidden", ["unhide"])}
      {stops.rows.length === 0 && <p className="text-sm text-nb-ink-mid mt-0">No member has added their own site to this ring yet.</p>}

      {stops.busiest.length > 0 && (
        <div>
          <Heading>Busiest doorways this month</Heading>
          <ul className="m-0 pl-5 text-nb-ink mt-2">
            {stops.busiest.map((b) => (
              <li key={b.address}>
                {b.address}: {b.clicks === 1 ? "1 click" : `${b.clicks} clicks`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {stops.isPublic && (
        <p className="text-sm m-0">
          <Link href={`/neighborhood/ring/${encodeURIComponent(ring.slug)}#people`} className="underline text-nb-ink">
            See every stop the way visitors do →
          </Link>
        </p>
      )}
    </div>
  );
}
