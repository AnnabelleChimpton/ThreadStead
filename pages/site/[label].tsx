import type { GetServerSideProps } from "next";
import Layout from "@/components/ui/layout/Layout";
import RetroCard from "@/components/ui/layout/RetroCard";
import { db } from "@/lib/config/database/connection";
import { getSiteBaseUrl } from "@/lib/config/site-url";
import { SITE_TITLE } from "@/lib/config/site/constants";
import { isLabelTombstoned } from "@/lib/domain/users/handle-tombstones";
import { requestedLabel } from "@/lib/subdomains/host";
import type { ResidentHost } from "@/contexts/ResidentHostContext";
import ProfilePage, {
  getServerSideProps as profileServerSideProps,
  type ProfileProps,
} from "@/pages/resident/[username]/index";
import PageMeta from "@/components/ui/layout/PageMeta";

/**
 * A resident's page on their own address: GET https://alice.homepageagain.com/
 * (rewritten here by middleware.ts, which takes the Cookie header off). The
 * same render as /resident/<username>, made signed out, so it shows what
 * anyone could see. Nothing here can be written: the bits that would (the
 * guestbook form, Follow) link to the main site through ResidentHostContext.
 *
 * Middleware's header names the resident (a production build); in dev the
 * rewritten path's [label] does. /site/<label> on the main site renders the
 * same signed-out page as /resident/<username>, so it isn't blocked there
 * (dev sends rewrites back through middleware as main-site requests).
 */

type SiteProps =
  | (ProfileProps & { residentHost: ResidentHost })
  // onResidentHost: _app leaves out what a resident's host never needs (the cookie banner)
  | { closed: true; mainSiteUrl: string; onResidentHost: true };

export default function SitePage(props: SiteProps) {
  if ("closed" in props) return <ClosedAddress mainSiteUrl={props.mainSiteUrl} />;
  return <ProfilePage {...props} />;
}

function ClosedAddress({ mainSiteUrl }: { mainSiteUrl: string }) {
  return (
    <>
      <PageMeta title="This page has closed" noIndex />
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-8">
          <RetroCard>
            <div className="p-6 text-center">
              <h1 className="thread-headline text-2xl font-bold mb-3">This page has closed</h1>
              <p className="mb-6">Whoever lived here has moved out, and the address is resting.</p>
              <a href={`${mainSiteUrl}/`} className="thread-button inline-block">
                Go to {SITE_TITLE}
              </a>
            </div>
          </RetroCard>
        </div>
      </Layout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<SiteProps> = async (context) => {
  // Middleware's header (production) or the rewritten path's [label] (dev)
  const label = requestedLabel({ headers: context.req.headers, query: context.query });
  if (!label) return { notFound: true };
  const mainSiteUrl = getSiteBaseUrl().replace(/\/+$/, "");

  const user = await db.user.findUnique({ where: { subdomainLabel: label }, select: { primaryHandle: true } });
  const username = user?.primaryHandle?.split("@")[0];
  if (!username) {
    if (await isLabelTombstoned(db, label)) {
      context.res.statusCode = 410;
      return { props: { closed: true, mainSiteUrl, onResidentHost: true } };
    }
    return { redirect: { destination: `${mainSiteUrl}/`, statusCode: 302 } };
  }

  // Signed out, whatever arrives: middleware already took the cookies off
  delete context.req.headers.cookie;
  const tab = typeof context.query.tab === "string" ? context.query.tab : undefined;
  const result = await profileServerSideProps({
    ...context,
    params: { username },
    query: tab ? { tab } : {},
    resolvedUrl: "/",
  });
  if (!("props" in result)) return result;

  const props = await result.props;
  return { props: { ...props, residentHost: { mainSiteUrl, username } } };
};
