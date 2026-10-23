import { GetServerSideProps } from 'next';
import Layout from '@/components/ui/layout/Layout';
import { getSiteConfig, SiteConfig } from '@/lib/config/site/dynamic';
import { getSessionUser } from '@/lib/auth/server';
import CommunityHeader from '@/components/ui/navigation/CommunityHeader';
import CommunityChatPanel from '@/components/community/CommunityChatPanel';
import PageMeta from '@/components/ui/layout/PageMeta';

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
      <PageMeta title="Chat" description={`Chat with your neighbors on ${siteConfig.site_name}.`} path="/community/chat" />

      <Layout siteConfig={siteConfig} fullWidth={true}>
        <div className="w-full max-w-full sm:max-w-7xl mx-auto px-0 sm:px-4 py-4 sm:py-6">
          <CommunityHeader current="chat" />

          {/* The room fills the rest of the screen, but never gets too short to use */}
          <div className="w-full h-[calc(100vh-var(--nav-height,4rem)-2rem)] min-h-[28rem]">
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
