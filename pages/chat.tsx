import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Layout from '@/components/ui/layout/Layout';
import { getSiteConfig, SiteConfig } from '@/lib/config/site/dynamic';
import { getSessionUser } from '@/lib/auth/server';
import { PixelIcon } from '@/components/ui/PixelIcon';
import CommunityChatPanel from '@/components/community/CommunityChatPanel';

interface ChatPageProps {
  siteConfig: SiteConfig;
  user?: {
    id: string;
    primaryHandle: string | null;
    role: string;
  };
}

export default function ChatPage({ siteConfig, user }: ChatPageProps) {
  return (
    <>
      <Head>
        <title>Chat Lounge - {siteConfig.site_name}</title>
        <meta name="description" content="Join the community chat lounge for real-time conversations with your neighbors." />
        <link rel="canonical" href={`${process.env.NEXT_PUBLIC_BASE_URL}/chat`} />
        <meta name="robots" content="index, follow" />

        {/* OpenGraph meta tags */}
        <meta property="og:title" content={`Chat Lounge - ${siteConfig.site_name}`} />
        <meta property="og:description" content="Join the community chat lounge for real-time conversations with your neighbors." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${process.env.NEXT_PUBLIC_BASE_URL}/chat`} />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`Chat Lounge - ${siteConfig.site_name}`} />
        <meta name="twitter:description" content="Join the community chat lounge for real-time conversations with your neighbors." />
      </Head>

      <Layout siteConfig={siteConfig} fullWidth={true}>
        <div className="w-full max-w-full sm:max-w-7xl mx-auto px-0 sm:px-4 py-4 sm:py-6">
          {/* Page Header */}
          <div className="thread-module p-4 sm:p-5 md:p-6 mb-4 sm:mb-5 md:mb-6">
            <div className="flex items-center gap-3 mb-2">
              <PixelIcon
                name="chat"
                size={32}
                className="text-thread-sage"
              />
              <h1 className="thread-headline text-2xl sm:text-3xl md:text-4xl font-bold">
                Chat Lounge
              </h1>
            </div>
            <p className="text-thread-sage leading-relaxed text-sm sm:text-base">
              Real-time conversations with the community
            </p>
          </div>

          {/* Fullscreen Chat */}
          <div className="w-full">
            <CommunityChatPanel fullscreen />
          </div>
        </div>
      </Layout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const siteConfig = await getSiteConfig();
  const user = await getSessionUser(context.req as any);

  return {
    props: {
      siteConfig,
      user: user ? {
        id: user.id,
        primaryHandle: user.primaryHandle,
        role: user.role,
      } : null,
    },
  };
};
