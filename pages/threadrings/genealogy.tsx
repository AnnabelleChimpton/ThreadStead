import Head from 'next/head';
import Link from 'next/link';
import { GetServerSideProps } from 'next';
import { featureFlags } from '@/lib/feature-flags';
import ThreadRingGenealogy from '@/components/ThreadRingGenealogy';
import Layout from '@/components/Layout';
import { getSiteConfig, SiteConfig } from '@/lib/get-site-config';
import { getSessionUser } from '@/lib/auth-server';

interface GenealogyPageProps {
  siteConfig: SiteConfig;
}

export default function GenealogyPage({ siteConfig }: GenealogyPageProps) {
  return (
    <Layout siteConfig={siteConfig}>
      <Head>
        <title>ThreadRing Genealogy - ThreadStead</title>
        <meta name="description" content="Explore the family tree of all ThreadRing communities" />
      </Head>
      
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold text-gray-900">ThreadRing Genealogy</h1>
              <div className="flex gap-2">
                <Link 
                  href="/threadrings"
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Browse All
                </Link>
                <Link 
                  href="/threadrings/create"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                >
                  Create ThreadRing
                </Link>
              </div>
            </div>
            
            <p className="text-gray-600 mb-4">
              Explore the interconnected family tree of all ThreadRing communities. 
              Each node represents a ThreadRing, with lines showing fork relationships.
              Larger nodes have more descendants, and colors indicate the depth of their lineage.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">How to Navigate</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Click</strong> on any node to visit that ThreadRing</li>
                <li>• <strong>Scroll</strong> to zoom in and out</li>
                <li>• <strong>Drag</strong> to pan around the tree</li>
                <li>• <strong>Hover</strong> over nodes to see details</li>
              </ul>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" style={{ minHeight: '600px' }}>
            <ThreadRingGenealogy maxInitialDepth={5} />
          </div>

          <div className="mt-8 text-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">About ThreadRing Genealogy</h2>
            <p className="text-gray-600 max-w-3xl mx-auto">
              ThreadRings can be forked to create derivative communities, forming a genealogical tree. 
              The Spool sits at the root as the universal parent, with all ThreadRings tracing their lineage 
              back to this origin point. This visualization helps you discover related communities and 
              understand how different ThreadRings evolved from one another.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  // Get current user for feature flag check
  const user = await getSessionUser(context.req as any);
  
  // Check if ThreadRings feature is enabled for this user
  if (!featureFlags.threadrings(user)) {
    return {
      notFound: true,
    };
  }

  const siteConfig = await getSiteConfig();

  return {
    props: {
      siteConfig,
    },
  };
};