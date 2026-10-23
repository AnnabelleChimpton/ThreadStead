import Layout from "@/components/ui/layout/Layout";
import Tabs, { TabSpec } from "@/components/ui/navigation/Tabs";
import Feed from "@/components/core/content/Feed";
import RingHubFeed from "@/components/core/content/RingHubFeed";
import TrendingFeedTab from "@/components/core/content/TrendingFeedTab";
import { getSiteConfig, SiteConfig } from "@/lib/config/site/dynamic";
import { GetServerSideProps, NextApiRequest } from "next";
import { getSessionUser } from "@/lib/auth/server";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import ButtonLink from "@/components/ui/ButtonLink";
import Callout from "@/components/ui/feedback/Callout";
import PageMeta from "@/components/ui/layout/PageMeta";
import { SITE_TITLE } from "@/lib/config/site/constants";

interface FeedPageProps {
  siteConfig: SiteConfig;
  signedIn: boolean;
  initialTab: string;
}

const TAB_IDS = ["following", "recent", "active", "my-rings", "trending"];

export default function FeedPage({ siteConfig, signedIn, initialTab }: FeedPageProps) {
  const { user: currentUser } = useCurrentUser();

  // Base tabs that are always available
  const baseTabs: TabSpec[] = [
    ...(signedIn || currentUser
      ? [{ id: "following", label: "Following", content: <Feed type="following" /> }]
      : []),
    {
      id: "recent",
      label: "Recent",
      content: <Feed type="recent" />
    },
    {
      id: "active",
      label: "Active",
      content: <Feed type="active" />
    }
  ];

  const ringHubTabs: TabSpec[] = [
    {
      id: "my-rings",
      label: "Ring posts",
      content: currentUser ? (
        <RingHubFeed type="my-rings" />
      ) : (
        <Callout variant="framed" title="Sign in to see ring posts">
          <p>Posts from the rings you&apos;ve joined show up here.</p>
          <p><ButtonLink href="/login">Sign in</ButtonLink></p>
        </Callout>
      )
    },
    {
      id: "trending",
      label: "Trending",
      content: <TrendingFeedTab />
    }
  ];

  const tabs: TabSpec[] = [...baseTabs, ...ringHubTabs];

  return (
    <Layout siteConfig={siteConfig}>
      <PageMeta title="Feed" description={`The latest posts from everyone on ${SITE_TITLE}.`} path="/feed" />
      <div className="thread-module p-4 sm:p-5 md:p-6 mb-3 sm:mb-4 md:mb-6">
        <div className="mb-4">
          <h1 className="thread-headline text-3xl font-bold mb-2">Feed</h1>
          <p className="text-thread-sage leading-relaxed">
            Latest posts and active discussions from the community.
          </p>
        </div>
        <div className="thread-divider"></div>
        <div className="mt-6">
          <span className="thread-label">community feed</span>
        </div>
      </div>

      <Tabs tabs={tabs} initialId={initialTab} variant="site" />
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<FeedPageProps> = async ({ req, query }) => {
  const [siteConfig, user] = await Promise.all([
    getSiteConfig(),
    getSessionUser(req as NextApiRequest),
  ]);
  const signedIn = !!user;

  const requested = typeof query.tab === "string" ? query.tab : "";
  const initialTab =
    TAB_IDS.includes(requested) && (signedIn || requested !== "following")
      ? requested
      : signedIn ? "following" : "recent";

  return {
    props: {
      siteConfig,
      signedIn,
      initialTab,
    },
  };
};