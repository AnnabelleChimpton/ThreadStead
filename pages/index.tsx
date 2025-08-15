import Layout from "../components/Layout";
import Tabs, { TabSpec } from "../components/Tabs";
import Feed from "../components/Feed";
import { getSiteConfig, SiteConfig } from "@/lib/get-site-config";
import { GetServerSideProps } from "next";

interface HomeProps {
  siteConfig: SiteConfig;
}

export default function Home({ siteConfig }: HomeProps) {
  const config = siteConfig;
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
          <h1 className="thread-headline text-3xl font-bold mb-2">{config.welcome_message}</h1>
          <p className="text-thread-sage leading-relaxed">
            {config.site_description}
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

export const getServerSideProps: GetServerSideProps<HomeProps> = async () => {
  const siteConfig = await getSiteConfig();
  
  return {
    props: {
      siteConfig,
    },
  };
};
