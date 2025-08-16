import Layout from "../components/Layout";
import Tabs, { TabSpec } from "../components/navigation/Tabs";
import Feed from "../components/content/Feed";
import { getSiteConfig, SiteConfig } from "@/lib/get-site-config";
import { GetServerSideProps } from "next";

interface FeedPageProps {
  siteConfig: SiteConfig;
}

export default function FeedPage({ siteConfig }: FeedPageProps) {
  const tabs: TabSpec[] = [
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