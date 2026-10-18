import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Layout from '@/components/ui/layout/Layout';
import { getSiteConfig, SiteConfig } from '@/lib/config/site/dynamic';
import { getSiteBaseUrl } from '@/lib/config/site-url';
import CommunityHeader from '@/components/ui/navigation/CommunityHeader';
import PollsPanel from '@/components/community/PollsPanel';

interface PollsPageProps {
  siteConfig: SiteConfig;
}

export default function PollsPage({ siteConfig }: PollsPageProps) {
  return (
    <>
      <Head>
        <title>{`${siteConfig.site_name} — Polls`}</title>
        <meta name="description" content={`Polls on ${siteConfig.site_name}.`} />
        <link rel="canonical" href={`${getSiteBaseUrl()}/community/polls`} />
      </Head>

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
