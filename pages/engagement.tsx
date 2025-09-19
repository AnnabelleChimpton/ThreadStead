/**
 * Community Engagement Analytics Page
 */

import { GetServerSideProps } from 'next';
import Layout from '@/components/ui/layout/Layout';
import { getSiteConfig, SiteConfig } from '@/lib/config/site/dynamic';
import { getSessionUser } from '@/lib/auth/server';
import EngagementDashboard from '@/components/features/engagement/EngagementDashboard';

interface EngagementPageProps {
  siteConfig: SiteConfig;
  user?: {
    id: string;
    did: string;
    role: string;
    primaryHandle: string | null;
    createdAt: string | null;
    updatedAt: string | null;
  };
}

export default function EngagementPage({ siteConfig, user }: EngagementPageProps) {
  return (
    <Layout siteConfig={siteConfig}>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <EngagementDashboard />
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  try {
    const [siteConfig, user] = await Promise.all([
      getSiteConfig(),
      getSessionUser(context.req as any)
    ]);

    return {
      props: {
        siteConfig,
        user: user ? {
          ...user,
          createdAt: user.createdAt?.toISOString() || null,
          updatedAt: user.updatedAt?.toISOString() || null,
        } : null,
      },
    };
  } catch (error) {
    console.error('Error in getServerSideProps:', error);
    return {
      notFound: true,
    };
  }
};