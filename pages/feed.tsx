import Layout from "../components/Layout";
import Tabs, { TabSpec } from "../components/navigation/Tabs";
import Feed from "../components/content/Feed";
import RingHubFeed from "../components/content/RingHubFeed";
import TrendingFeedTab from "../components/content/TrendingFeedTab";
import { getSiteConfig, SiteConfig } from "@/lib/get-site-config";
import { GetServerSideProps } from "next";
import { featureFlags } from "@/lib/feature-flags";
import { useCurrentUser } from "../hooks/useCurrentUser";

interface FeedPageProps {
  siteConfig: SiteConfig;
}

export default function FeedPage({ siteConfig }: FeedPageProps) {
  const { user: currentUser } = useCurrentUser();
  
  // Base tabs that are always available
  const baseTabs: TabSpec[] = [
    {
      id: "recent",
      label: "Recent Posts",
      content: <Feed type="recent" />
    },
    {
      id: "active", 
      label: "Active Discussions",
      content: <Feed type="active" />
    }
  ];

  // RingHub tabs (only show if feature is enabled)
  const ringHubTabs: TabSpec[] = featureFlags.ringhub() ? [
    {
      id: "my-rings",
      label: "My Rings",
      content: currentUser ? (
        <RingHubFeed type="my-rings" />
      ) : (
        <div className="bg-yellow-50 border border-yellow-300 p-6 text-center">
          <div className="text-yellow-800 font-medium mb-2">Login Required</div>
          <div className="text-yellow-700 text-sm mb-4">
            You need to be logged in to see posts from your ThreadRings.
          </div>
          <a
            href="/login"
            className="border border-black px-4 py-2 bg-yellow-200 hover:bg-yellow-300 shadow-[2px_2px_0_#000] inline-block"
          >
            Login
          </a>
        </div>
      )
    },
    {
      id: "trending",
      label: "Trending",
      content: <TrendingFeedTab />
    }
  ] : [];

  const tabs: TabSpec[] = [...baseTabs, ...ringHubTabs];

  return (
    <Layout siteConfig={siteConfig}>
      <div className="thread-module p-6 mb-6">
        <div className="mb-4">
          <h1 className="thread-headline text-3xl font-bold mb-2">Community Feed</h1>
          <p className="text-thread-sage leading-relaxed">
            Latest posts and active discussions from the community.
          </p>
        </div>
        <div className="thread-divider"></div>
        <div className="mt-6">
          <span className="thread-label">community feed</span>
        </div>
      </div>

      <Tabs tabs={tabs} initialId="recent" />
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<FeedPageProps> = async () => {
  const siteConfig = await getSiteConfig();
  
  return {
    props: {
      siteConfig,
    },
  };
};