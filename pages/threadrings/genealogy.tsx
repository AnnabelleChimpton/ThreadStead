import Link from 'next/link';
import { GetServerSideProps, NextApiRequest } from 'next';
import ThreadRingGenealogy from '@/components/core/threadring/ThreadRingGenealogy';
import Layout from '@/components/ui/layout/Layout';
import { getSiteConfig, SiteConfig } from '@/lib/config/site/dynamic';
import PageMeta from '@/components/ui/layout/PageMeta';
import { getSessionUser } from '@/lib/auth/server';

interface GenealogyPageProps {
  siteConfig: SiteConfig;
  signedIn: boolean;
}

export default function GenealogyPage({ siteConfig, signedIn }: GenealogyPageProps) {
  return (
    <Layout siteConfig={siteConfig}>
      <PageMeta title="ThreadRing family tree" description="Every ThreadRing and the rings it grew from, as one family tree." path="/threadrings/genealogy" />
      
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h1 className="text-3xl font-bold text-gray-900">Family tree</h1>
              <div className="flex flex-col sm:flex-row gap-2">
                <Link
                  href="/threadrings"
                  className="px-3 py-2.5 text-sm md:px-4 md:py-2 min-h-[2.5rem] font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-center"
                >
                  Browse All
                </Link>
                <Link
                  href={signedIn ? "/tr/spool/fork" : "/login"}
                  className="px-3 py-2.5 text-sm md:px-4 md:py-2 min-h-[2.5rem] font-medium !text-white bg-indigo-600 rounded-md hover:bg-indigo-700 text-center"
                >
                  {signedIn ? "Start a ring" : "Sign in to start a ring"}
                </Link>
              </div>
            </div>
            <p className="text-gray-600 mb-4">
              Every ring grew from another one, all the way back to The Spool. Click a ring to visit it.
            </p>
          </div>

          <div className="genealogy-container bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <ThreadRingGenealogy maxInitialDepth={5} />
          </div>
        </div>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const [siteConfig, user] = await Promise.all([
    getSiteConfig(),
    getSessionUser(context.req as NextApiRequest),
  ]);

  return {
    props: {
      siteConfig,
      signedIn: !!user,
    },
  };
};