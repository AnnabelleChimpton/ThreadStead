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
        <div className="flex flex-col h-[calc(100vh-var(--nav-height,4rem))] w-full mx-auto px-0 sm:px-4 py-2 sm:py-3">
          {/* Page Header */}
          <div className="thread-module p-3 sm:p-4 mb-2 sm:mb-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <PixelIcon
                name="chat"
                size={24}
                className="text-thread-sage"
              />
              <h1 className="thread-headline text-xl sm:text-2xl font-bold">
                Chat Lounge
              </h1>
            </div>
          </div>

          {/* Fullscreen Chat */}
          <div className="w-full flex-1 min-h-0">
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
