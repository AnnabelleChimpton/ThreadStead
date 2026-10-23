import { GetServerSideProps } from 'next';
import Layout from '@/components/ui/layout/Layout';
import { getSiteConfig, SiteConfig } from '@/lib/config/site/dynamic';
import CommunityHeader from '@/components/ui/navigation/CommunityHeader';
import PollsPanel from '@/components/community/PollsPanel';
import PageMeta from '@/components/ui/layout/PageMeta';

interface PollsPageProps {
  siteConfig: SiteConfig;
}

export default function PollsPage({ siteConfig }: PollsPageProps) {
  return (
    <>
      <PageMeta title="Polls" description={`Polls on ${siteConfig.site_name}: what the neighborhood thinks.`} path="/community/polls" />

      <Layout siteConfig={siteConfig} fullWidth={true}>
        <div className="w-full max-w-full sm:max-w-7xl mx-auto px-0 sm:px-4 py-4 sm:py-6">
          <CommunityHeader current="polls" />
          <div className="max-w-3xl">
            <PollsPanel />
          </div>
        </div>
      </Layout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<PollsPageProps> = async () => {
  const siteConfig = await getSiteConfig();
  return { props: { siteConfig } };
};
