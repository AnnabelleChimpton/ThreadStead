import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '@/components/ui/layout/Layout';
import { getSiteConfig, SiteConfig } from '@/lib/config/site/dynamic';
import { getSessionUser } from '@/lib/auth/server';
import { PixelIcon } from '@/components/ui/PixelIcon';
import AnnouncementsPanel from '@/components/community/AnnouncementsPanel';
import PollsPanel from '@/components/community/PollsPanel';
import BulletinBoardPanel from '@/components/community/BulletinBoardPanel';
import CommunityChatPanel from '@/components/community/CommunityChatPanel';

interface CommunityProps {
  siteConfig: SiteConfig;
  user?: {
    id: string;
    primaryHandle: string | null;
    role: string;
  };
}

// Simple card component for community page (avoids thread-module min-width issues)
function SimpleCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#FCFAF7] border border-[#A18463] rounded-lg shadow-[2px_2px_0_#A18463] p-3 sm:p-4 mb-3 sm:mb-4 w-full max-w-full overflow-hidden">
      {title && <h3 className="text-base sm:text-lg font-bold mb-2 sm:mb-3 text-[#2E4B3F] px-1">{title}</h3>}
      {children}
    </div>
  );
}

export default function Community({ siteConfig, user }: CommunityProps) {
  return (
    <>
      <Head>
        <title>Community Center - {siteConfig.site_name}</title>
        <meta name="description" content="A central hub for community announcements, bulletin board, polls, and chat on HomePageAgain." />
        <link rel="canonical" href={`${process.env.NEXT_PUBLIC_BASE_URL}/community`} />
        <meta name="robots" content="index, follow" />

        {/* OpenGraph meta tags */}
        <meta property="og:title" content={`Community Center - ${siteConfig.site_name}`} />
        <meta property="og:description" content="A central hub for community announcements, bulletin board, polls, and chat on HomePageAgain." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${process.env.NEXT_PUBLIC_BASE_URL}/community`} />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`Community Center - ${siteConfig.site_name}`} />
        <meta name="twitter:description" content="A central hub for community announcements, bulletin board, polls, and chat on HomePageAgain." />
      </Head>

      <Layout siteConfig={siteConfig} fullWidth={true}>
        <div className="w-full max-w-full sm:max-w-7xl mx-auto px-0 sm:px-4 py-4 sm:py-6">
          {/* Page Header */}
          <div className="thread-module p-4 sm:p-5 md:p-6 mb-4 sm:mb-5 md:mb-6">
            <div className="flex items-center gap-3 mb-2">
              <PixelIcon
                name="building"
                size={32}
                className="text-thread-sage"
              />
              <h1 className="thread-headline text-2xl sm:text-3xl md:text-4xl font-bold">
                Community Center
              </h1>
            </div>
            <p className="text-thread-sage leading-relaxed text-sm sm:text-base">
              Central hub for announcements, bulletin board, polls, and chat
            </p>
          </div>

          {/* Four Sections in 2x2 Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
            {/* Announcements */}
            <AnnouncementsPanel />

            {/* Bulletin Board */}
            <SimpleCard>
              <BulletinBoardPanel />
            </SimpleCard>

            {/* Polls */}
            <PollsPanel />

            {/* Chat Room */}
            <CommunityChatPanel />
          </div>

          {/* Optional: Info section for logged-out users */}
          {!user && (
            <div className="thread-module p-4 sm:p-5 md:p-6 mt-4 sm:mt-5 md:mt-6 bg-thread-cream/50">
              <p className="text-thread-sage text-sm sm:text-base text-center">
                <Link href="/signup" className="text-thread-sage hover:text-thread-sage/80 underline font-semibold">
                  Join the community
                </Link>
                {' '}to participate in announcements, bulletin board, polls, and chat!
              </p>
            </div>
          )}
        </div>
      </Layout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<CommunityProps> = async (context) => {
  const siteConfig = await getSiteConfig();
  const user = await getSessionUser(context.req as any);

  return {
    props: {
      siteConfig,
      ...(user ? {
        user: {
          id: user.id,
          primaryHandle: user.primaryHandle,
          role: user.role,
        }
      } : {})
    },
  };
};
