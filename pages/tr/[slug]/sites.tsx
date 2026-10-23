// Every stop in a public ring, in the order its strip walks them
// (lib/rings/walk.ts): a member's own site when it's their stop here,
// otherwise their pixel home. Ring owners and moderators also see sites
// waiting for a yes and sites they hid, and set the ring's rule.
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import type { GetServerSideProps } from "next";
import type { RingOutsideSites } from "@prisma/client";
import Layout from "@/components/ui/layout/Layout";
import Button from "@/components/ui/Button";
import ButtonLink, { buttonClasses } from "@/components/ui/ButtonLink";
import ReportButton from "@/components/ui/feedback/ReportButton";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { csrfFetch } from "@/lib/api/client/csrf-fetch";
import { getSiteConfig, type SiteConfig } from "@/lib/config/site/dynamic";
import PageMeta from "@/components/ui/layout/PageMeta";
import { ringShareImage } from "@/lib/share-images";

type StopStatus = "listed" | "pending" | "hidden";

interface StopRow {
  number: number;
  handle: string;
  name: string;
  userId: string;
  site: { id: string; url: string; title: string | null; host: string; buttonUrl: string | null } | null;
}

interface StewardRow {
  stopId: string;
  status: StopStatus;
  reason: string | null;
  handle: string | null;
  name: string;
  site: { id: string; url: string; title: string | null; host: string };
}

interface Props {
  siteConfig: SiteConfig;
  ring: { slug: string; name: string; badgeImageUrl: string | null };
  stops: StopRow[] | null;
  viewerId: string | null;
  steward: {
    rule: RingOutsideSites;
    ruleIsDefault: boolean;
    rows: StewardRow[];
    busiest: Array<{ host: string; clicks: number }>;
  } | null;
}

const RULES: Array<{ id: RingOutsideSites; label: string }> = [
  { id: "allow", label: "List them as soon as they're proved (I can hide one after)" },
  { id: "ask", label: "Ask me first" },
  { id: "off", label: "No outside sites: everyone's stop is their pixel home" },
];

function SiteLink({ site, nofollow = false }: { site: { url: string; title: string | null; host: string }; nofollow?: boolean }) {
  return (
    <a href={site.url} rel={nofollow ? "ugc nofollow" : "ugc"} className="font-semibold text-nb-ink underline decoration-dotted break-words">
      {site.title || site.host}
    </a>
  );
}

function StewardPanel({ ring, steward }: { ring: Props["ring"]; steward: NonNullable<Props["steward"]> }) {
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

  const act = async (row: StewardRow, action: "approve" | "hide" | "unhide") => {
    if (action === "hide") {
      const ok = await confirm({
        title: `Hide ${row.site.host} from ${ring.name}?`,
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

  const pending = steward.rows.filter((r) => r.status === "pending");
  const hidden = steward.rows.filter((r) => r.status === "hidden");
  const listed = steward.rows.filter((r) => r.status === "listed");

  const rowView = (row: StewardRow, actions: Array<"approve" | "hide" | "unhide">) => (
    <li key={row.stopId} className="flex flex-wrap items-center justify-between gap-2 py-2">
      <div className="min-w-0">
        <SiteLink site={row.site} nofollow={row.status !== "listed"} />
        <span className="text-sm text-nb-ink-mid"> · {row.name}&apos;s site{row.reason ? ` · hidden: ${row.reason}` : ""}</span>
      </div>
      <div className="flex gap-2">
        {actions.map((a) => (
          <Button
            key={a}
            size="sm"
            variant={a === "approve" ? "primary" : "secondary"}
            className={a === "approve" ? "thread-button" : "thread-button-secondary"}
            disabled={busy === row.stopId}
            onClick={() => act(row, a)}
          >
            {a === "approve" ? "Let it in" : a === "hide" ? "Hide" : "Unhide"}
          </Button>
        ))}
      </div>
    </li>
  );

  return (
    <section className="thread-module flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-nb-ink m-0">For the ring&apos;s owner and moderators</h2>

      <fieldset className="m-0 p-0 border-0">
        <legend className="font-semibold text-nb-ink mb-1">Members&apos; own sites in this ring</legend>
        <div className="space-y-1">
          {RULES.map((r) => (
            <label key={r.id} className="flex items-start gap-2 text-nb-ink cursor-pointer">
              <input
                type="radio"
                name="outside-sites"
                checked={steward.rule === r.id}
                onChange={() => call("PUT", { rule: r.id }, "Saved.")}
                className="mt-1 accent-nb-ink"
              />
              <span>{r.label}</span>
            </label>
          ))}
        </div>
        {steward.ruleIsDefault && (
          <p className="m-0 mt-1 text-sm text-nb-ink-mid">Until you pick, it follows how people join the ring.</p>
        )}
      </fieldset>

      {pending.length > 0 && (
        <div>
          <div className="font-semibold text-nb-ink">Waiting for a yes</div>
          <ul className="m-0 p-0 list-none divide-y divide-dotted divide-nb-ink-mid/30">{pending.map((r) => rowView(r, ["approve", "hide"]))}</ul>
        </div>
      )}
      {listed.length > 0 && (
        <div>
          <div className="font-semibold text-nb-ink">In the ring</div>
          <ul className="m-0 p-0 list-none divide-y divide-dotted divide-nb-ink-mid/30">{listed.map((r) => rowView(r, ["hide"]))}</ul>
        </div>
      )}
      {hidden.length > 0 && (
        <div>
          <div className="font-semibold text-nb-ink">Hidden</div>
          <ul className="m-0 p-0 list-none divide-y divide-dotted divide-nb-ink-mid/30">{hidden.map((r) => rowView(r, ["unhide"]))}</ul>
        </div>
      )}
      {steward.rows.length === 0 && <p className="m-0 text-sm text-nb-ink-mid">No member has added their own site to this ring yet.</p>}

      {steward.busiest.length > 0 && (
        <div>
          <div className="font-semibold text-nb-ink mb-1">Busiest doorways this month</div>
          <ul className="m-0 pl-5 text-sm text-nb-ink">
            {steward.busiest.map((b) => (
              <li key={b.host}>{b.host}: {b.clicks === 1 ? "1 click" : `${b.clicks} clicks`}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export default function RingSitesPage({ siteConfig, ring, stops, viewerId, steward }: Props) {
  const ringHref = `/tr/${encodeURIComponent(ring.slug)}`;
  const sites = stops?.filter((s) => s.site).length ?? 0;
  return (
    <Layout siteConfig={siteConfig}>
      <PageMeta
        title={`Every stop in ${ring.name}`}
        description={`The members of ${ring.name} and their sites, in the order the ring's webring strip walks them.`}
        path={`${ringHref}/sites`}
        image={ringShareImage(ring)}
      />
      <div className="max-w-3xl mx-auto py-6 space-y-6">
        <div>
          <Link href={ringHref} className="text-sm underline text-nb-ink-mid">← {ring.name}</Link>
          <h1 className="text-3xl font-bold text-nb-ink mt-1 mb-2">Every stop in {ring.name}</h1>
          <p className="m-0 text-nb-ink-mid">
            In the order the ring&apos;s prev and next walk them. A member&apos;s stop is their own site when they&apos;ve added one, and
            their pixel home otherwise.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <a href={`/ring/${encodeURIComponent(ring.slug)}/random`} className={`${buttonClasses("secondary", "sm")} thread-button-secondary`}>
              Random stop
            </a>
            <ButtonLink href={`${ringHref}?strip=#strip`} variant="secondary" size="sm" className="thread-button-secondary">
              Get a strip for your site
            </ButtonLink>
          </div>
        </div>

        {steward && <StewardPanel ring={ring} steward={steward} />}

        {stops === null ? (
          <p className="text-nb-ink">I can&apos;t reach the ring right now. Try again in a bit.</p>
        ) : stops.length === 0 ? (
          <p className="text-nb-ink">None of this ring&apos;s members live here yet, so there&apos;s nowhere to walk.</p>
        ) : (
          <section className="thread-module">
            <p className="m-0 mb-2 text-sm text-nb-ink-mid">
              {stops.length === 1 ? "1 stop" : `${stops.length} stops`}, {sites === 1 ? "1 of them a member's own site" : `${sites} of them members' own sites`}.
            </p>
            <ol className="m-0 p-0 list-none divide-y divide-dotted divide-nb-ink-mid/30">
              {stops.map((stop) => (
                <li key={stop.userId} className="flex items-center gap-3 py-3">
                  <span className="w-12 flex-shrink-0 text-sm text-nb-ink-mid tabular-nums">No. {stop.number}</span>
                  <span className={`w-[88px] h-[31px] flex-shrink-0 ${stop.site && !stop.site.buttonUrl ? "hidden sm:block" : ""}`}>
                    {stop.site ? (
                      stop.site.buttonUrl && (
                        <a href={stop.site.url} rel="ugc" tabIndex={-1} aria-hidden="true">
                          <img src={stop.site.buttonUrl} width={88} height={31} alt="" loading="lazy" style={{ imageRendering: "pixelated" }} />
                        </a>
                      )
                    ) : (
                      <Link href={`/home/${encodeURIComponent(stop.handle)}`} tabIndex={-1} aria-hidden="true">
                        <img src={`/api/home/${encodeURIComponent(stop.handle)}/badge`} width={88} height={31} alt="" loading="lazy" style={{ imageRendering: "pixelated" }} />
                      </Link>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    {stop.site ? (
                      <>
                        <SiteLink site={stop.site} />
                        <div className="text-sm text-nb-ink-mid">
                          <Link href={`/resident/${encodeURIComponent(stop.handle)}`} className="underline">{stop.name}</Link>&apos;s site
                          {stop.site.title && <> · {stop.site.host}</>}
                        </div>
                      </>
                    ) : (
                      <>
                        <Link href={`/home/${encodeURIComponent(stop.handle)}`} className="font-semibold text-nb-ink underline decoration-dotted">
                          {stop.name}&apos;s pixel home
                        </Link>
                      </>
                    )}
                  </div>
                  {stop.site && viewerId && viewerId !== stop.userId && (
                    <ReportButton reportType="site" targetId={stop.site.id} reportedUserId={stop.userId} contentPreview={stop.site.url} size="small" />
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </Layout>
  );
}

function hostOf(url: string): string {
  try {
    const u = new URL(url);
    return (u.host + u.pathname).replace(/^www\./, "").replace(/\/$/, "");
  } catch {
    return url;
  }
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ req, params }) => {
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const [{ db }, { getSessionUser }, { SITE_NAME }, walk, stopsLib, counts] = await Promise.all([
    import("@/lib/config/database/connection"),
    import("@/lib/auth/server"),
    import("@/lib/config/site/constants"),
    import("@/lib/rings/walk"),
    import("@/lib/rings/stops"),
    import("@/lib/rings/counts"),
  ]);
  const siteConfig = await getSiteConfig();
  const viewer = await getSessionUser(req as any);
  const result = await walk.ringStops(db, { slug, viewerId: viewer?.id, host: SITE_NAME });
  if (result.kind === "none") return { notFound: true };

  const hub = walk.defaultHub();
  const facts = result.kind === "stops" ? result.ring : hub ? await walk.ringFacts(hub, slug).catch(() => null) : null;
  if (result.kind === "unavailable" && !facts) {
    return { props: { siteConfig, ring: { slug, name: slug, badgeImageUrl: null }, stops: null, viewerId: viewer?.id ?? null, steward: null } };
  }
  const ring = { slug, name: facts?.name ?? slug, badgeImageUrl: facts?.badgeImageUrl ?? null };

  // The sites' own 88×31s, from the Indie Index when it has one
  const siteRefs = result.kind === "stops" ? result.stops.flatMap((s) => (s.site ? [s.site.siteRef] : [])) : [];
  const buttons = new Map(
    (await db.site.findMany({ where: { key: { in: siteRefs }, buttonUrl: { not: null } }, select: { key: true, buttonUrl: true } }))
      .map((s) => [s.key, s.buttonUrl])
  );
  const stops: StopRow[] | null =
    result.kind === "stops"
      ? result.stops.map((s) => ({
          number: s.number,
          handle: s.handle,
          name: s.displayName || s.handle,
          userId: s.userId,
          site: s.site && {
            id: s.site.id,
            url: s.site.url,
            title: s.site.title,
            host: hostOf(s.site.url),
            buttonUrl: buttons.get(s.site.siteRef) ?? null,
          },
        }))
      : null;

  let steward: Props["steward"] = null;
  if (viewer && hub && facts && (await stopsLib.isRingSteward(db, hub, slug, viewer.id).catch(() => false))) {
    const rows = await stopsLib.ringSiteRows(db, slug);
    const people = await db.user.findMany({
      where: { id: { in: rows.map((r) => r.userId) } },
      select: { id: true, handles: { where: { host: SITE_NAME }, select: { handle: true }, take: 1 }, profile: { select: { displayName: true } } },
    });
    const who = new Map(people.map((p) => [p.id, p]));
    const now = new Date();
    const busiest = await counts.busiestDoorways(db, slug, new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
    const hostById = new Map(rows.map((r) => [r.site.id, hostOf(r.site.url)]));
    const setting = await db.ringSiteSettings.findUnique({ where: { ringSlug: slug } });
    steward = {
      rule: await walk.outsideSitesRule(db, facts),
      ruleIsDefault: !setting,
      rows: rows.map((r) => {
        const person = who.get(r.userId);
        const handle = person?.handles[0]?.handle ?? null;
        return {
          stopId: r.id,
          status: r.status,
          reason: r.reason,
          handle,
          name: person?.profile?.displayName || handle || "A member",
          site: { id: r.site.id, url: r.site.url, title: r.site.title, host: hostOf(r.site.url) },
        };
      }),
      busiest: busiest.flatMap((b) => (hostById.has(b.siteId) ? [{ host: hostById.get(b.siteId)!, clicks: b.clicks }] : [])),
    };
  }

  return { props: { siteConfig, ring, stops, viewerId: viewer?.id ?? null, steward } };
};
