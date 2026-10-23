// One page for running a ring (design/threadring-audit/mockups, approved
// 2026-10-23): Ring · People · Badge · Stops · Prompts, each tab only for
// whoever Ring Hub lets do it (lib/rings/manage.ts). The tab is in the URL
// (?tab=people), so links can open one. Read as the viewer, never from the
// local mirror.
import { useEffect, useState } from "react";
import type { GetServerSideProps } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import Layout from "@/components/ui/layout/Layout";
import RetroCard from "@/components/ui/layout/RetroCard";
import PageMeta from "@/components/ui/layout/PageMeta";
import Tabs from "@/components/ui/navigation/Tabs";
import { PixelIcon, type PixelIconName } from "@/components/ui/PixelIcon";
import RingTab from "@/components/core/threadring/manage/RingTab";
import PeopleTab from "@/components/core/threadring/manage/PeopleTab";
import BadgeTab from "@/components/core/threadring/manage/BadgeTab";
import StopsTab from "@/components/core/threadring/manage/StopsTab";
import PromptsTab from "@/components/core/threadring/manage/PromptsTab";
import { db } from "@/lib/config/database/connection";
import { getSessionUser } from "@/lib/auth/server";
import { SITE_NAME } from "@/lib/config/site/constants";
import { raceHubCall, HUB_TIMEOUT } from "@/lib/api/ringhub/ringhub-ssr";
import { getPublicRingHubClient } from "@/lib/api/ringhub/ringhub-client";
import { createAuthenticatedRingHubClient } from "@/lib/api/ringhub/ringhub-user-operations";
import { ringSettingsFromHub, type RingSettings } from "@/lib/api/ringhub/ringhub-transformers";
import { readRingAs } from "@/lib/domain/threadrings/ring-access";
import {
  manageRights,
  openingTab,
  ringPeople,
  ringStopsData,
  type ManageMember,
  type ManageRights,
  type ManageTab,
  type StopsData,
} from "@/lib/rings/manage";
import { badgeUrlOf } from "@/lib/rings/walk";

export interface ManageRing {
  slug: string;
  name: string;
  memberCount: number;
  badgeImageUrl: string | null;
}

type Props =
  | {
      kind: "manage";
      ring: ManageRing;
      settings: RingSettings;
      rights: ManageRights;
      /** null when the hub didn't answer in time */
      people: ManageMember[] | null;
      stops: StopsData | null;
      viewer: { id: string; username: string };
      tab: ManageTab;
    }
  | { kind: "unavailable"; slug: string };

const TAB_LABELS: Record<ManageTab, { label: string; icon: PixelIconName }> = {
  ring: { label: "Ring", icon: "sliders" },
  people: { label: "People", icon: "users" },
  badge: { label: "Badge", icon: "trophy" },
  stops: { label: "Stops", icon: "link" },
  prompts: { label: "Prompts", icon: "script" },
};

export default function ManageRingPage(props: Props) {
  if (props.kind === "unavailable") {
    return (
      <Layout>
        <PageMeta title="Manage a ring" noIndex />
        <RetroCard className="ts-phone-sheet max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold">Manage a ring</h1>
          <p className="text-nb-ink-mid">
            I can&apos;t reach Ring Hub right now, so the ring can&apos;t be shown. Try again in a minute, or go back to{" "}
            <Link href={`/tr/${encodeURIComponent(props.slug)}`}>the ring</Link>.
          </p>
        </RetroCard>
      </Layout>
    );
  }
  return <Manage {...props} />;
}

function Manage({ ring: initialRing, settings: initialSettings, rights, people: initialPeople, stops, viewer, tab }: Extract<Props, { kind: "manage" }>) {
  const router = useRouter();
  // Kept here so a tab keeps its saved state when another one is opened
  const [ring, setRing] = useState(initialRing);
  const [settings, setSettings] = useState(initialSettings);
  const [people, setPeople] = useState(initialPeople);
  // A reload (after a colour change or a Stops action) brings fresh copies
  useEffect(() => setRing(initialRing), [initialRing]);
  useEffect(() => setSettings(initialSettings), [initialSettings]);
  useEffect(() => setPeople(initialPeople), [initialPeople]);
  const ringHref = `/tr/${encodeURIComponent(ring.slug)}`;

  const onSettingsSaved = (saved: RingSettings, colourChanged: boolean) => {
    setSettings(saved);
    setRing((r) => ({ ...r, name: saved.name }));
    // The settings route redraws a badge we drew in the new colour; reload for its new image
    if (colourChanged) router.replace(router.asPath, undefined, { scroll: false });
  };

  const content: Record<ManageTab, React.ReactNode> = {
    ring: (
      <RingTab ring={ring} settings={settings} rights={rights} people={people} viewer={viewer} onSaved={onSettingsSaved} />
    ),
    people: <PeopleTab ring={ring} settings={settings} rights={rights} people={people} viewerId={viewer.id} onChange={setPeople} />,
    badge: (
      <BadgeTab
        ring={{ slug: ring.slug, name: ring.name, themeColor: settings.themeColor }}
        onSaved={(badge) => setRing((r) => ({ ...r, badgeImageUrl: badge.badgeImageUrl }))}
      />
    ),
    stops: stops && <StopsTab ring={ring} stops={stops} />,
    prompts: <PromptsTab ringSlug={ring.slug} />,
  };

  return (
    <Layout>
      <PageMeta title={`Manage ${ring.name}`} noIndex />
      <RetroCard className="ts-phone-sheet max-w-4xl mx-auto">
        <Link href={ringHref} className="text-sm underline text-nb-ink-mid">
          ← {ring.name}
        </Link>
        <div className="flex items-center justify-between gap-3 mt-1 mb-4 sm:mb-6">
          <h1 className="text-2xl font-bold m-0">Manage {ring.name}</h1>
          {ring.badgeImageUrl && (
             
            <img
              src={ring.badgeImageUrl}
              alt=""
              width={88}
              height={31}
              className="hidden sm:block shrink-0"
              style={{ imageRendering: "pixelated" }}
            />
          )}
        </div>
        {/* Narrower tabs on a phone, so all five fit at 375 */}
        <div className="max-sm:[&_.ts-tab]:!px-2">
          <Tabs
            variant="site"
            compactOnPhone
            initialId={tab}
            tabs={rights.tabs.map((id) => ({
              id,
              label: (
                <>
                  {/* No icons on a phone, so all five tabs fit */}
                  <span className="hidden sm:inline">
                    <PixelIcon name={TAB_LABELS[id].icon} size={20} />
                  </span>
                  {TAB_LABELS[id].label}
                </>
              ),
              content: content[id],
            }))}
          />
        </div>
      </RetroCard>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  const slug = typeof context.params?.slug === "string" ? context.params.slug : "";
  const viewer = await getSessionUser(context.req);
  if (!viewer) {
    const next = `/tr/${encodeURIComponent(slug)}/manage`;
    return { redirect: { destination: `/login?next=${encodeURIComponent(next)}`, permanent: false } };
  }

  const access = await raceHubCall(readRingAs(viewer, slug));
  if (access === HUB_TIMEOUT) {
    context.res.statusCode = 503;
    return { props: { kind: "unavailable", slug } };
  }
  if (!access) return { notFound: true };

  const rights = manageRights(access, viewer.role);
  if (rights.tabs.length === 0) return { notFound: true };
  const { ring } = access;

  // People: their tab, and who the ring can be handed to
  let people: ManageMember[] | null = null;
  if (rights.tabs.includes("people") || rights.handOver) {
    const reader = access.viewerDid ? createAuthenticatedRingHubClient(viewer.id) : getPublicRingHubClient();
    const result = await ringPeople(db, { reader, ring, viewerId: viewer.id, host: SITE_NAME });
    people = result === HUB_TIMEOUT ? null : result;
  }
  const stops = rights.tabs.includes("stops") ? await ringStopsData(db, { ring, host: SITE_NAME }) : null;

  return {
    props: {
      kind: "manage",
      ring: { slug: ring.slug, name: ring.name, memberCount: ring.memberCount ?? 0, badgeImageUrl: badgeUrlOf(ring) },
      settings: ringSettingsFromHub(ring),
      rights,
      people,
      stops,
      viewer: { id: viewer.id, username: viewer.primaryHandle?.split("@")[0] ?? "" },
      tab: openingTab(context.query.tab, rights.tabs),
    },
  };
};
