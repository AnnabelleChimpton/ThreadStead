import React from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import Layout from '@/components/ui/layout/Layout';
import RetroCard from '@/components/ui/layout/RetroCard';
import BadgeDesigner from '@/components/core/threadring/BadgeDesigner';
import { getSessionUser } from '@/lib/auth/server';
import { featureFlags } from '@/lib/utils/features/feature-flags';
import { raceHubCall, HUB_TIMEOUT } from '@/lib/api/ringhub/ringhub-ssr';
import { readRingAs } from '@/lib/domain/threadrings/ring-access';
import PageMeta from "@/components/ui/layout/PageMeta";

interface BadgeManagerPageProps {
  ring: {
    id: string;
    slug: string;
    name: string;
    description: string;
    visibility: string;
    themeColor: string | null;
  };
  user: {
    id: string;
    primaryHandle: string;
  };
  canManage: boolean;
  hubUnavailable?: boolean;
}

export default function BadgeManagerPage({ ring, canManage, hubUnavailable }: BadgeManagerPageProps) {
  const router = useRouter();

  if (hubUnavailable) {
    return (
      <>
        <PageMeta title="Badge manager" noIndex />
        <Layout>
          <RetroCard>
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold mb-4">Badge service temporarily unavailable</h1>
              <p className="text-gray-600 mb-6">
                We couldn&apos;t reach the ring service right now. Please try again in a moment.
              </p>
            </div>
          </RetroCard>
        </Layout>
      </>
    );
  }

  if (!canManage) {
    return (
      <>
        <PageMeta title="Badge manager" noIndex />
        <Layout>
          <RetroCard>
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold mb-4">Only the Host changes this</h1>
              <p className="text-gray-600 mb-6">
                A ring&apos;s badge is its Host&apos;s to change.
              </p>
              <button
                onClick={() => router.push(`/tr/${ring.slug}`)}
                className="px-6 py-2 border border-black bg-yellow-200 hover:bg-yellow-100 shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000]"
              >
                ← Back to ThreadRing
              </button>
            </div>
          </RetroCard>
        </Layout>
      </>
    );
  }

  return (
    <>
      <PageMeta title={`${ring.name} badge`} noIndex />
      <Layout>
        <RetroCard>
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Badge Manager</h1>
                <p className="text-gray-600">
                  Manage the badge design for <strong>{ring.name}</strong> ThreadRing
                </p>
              </div>
              <button
                onClick={() => router.push(`/tr/${ring.slug}/settings`)}
                className="px-4 py-2 border border-black bg-white hover:bg-gray-100 shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000]"
              >
                ← Back to Settings
              </button>
            </div>
          </div>

          <BadgeDesigner ring={ring} />
        </RetroCard>
      </Layout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<BadgeManagerPageProps> = async (context) => {
  const { slug } = context.query;
  const user = await getSessionUser(context.req as any);

  if (!user) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  if (!featureFlags.ringhub()) {
    return {
      notFound: true,
    };
  }

  if (typeof slug !== 'string') {
    return {
      notFound: true,
    };
  }

  // Signed as the viewer, so a private ring's Host can reach it; rights
  // from the hub (ring-access.ts), not the local owner row
  const access = await raceHubCall(readRingAs(user, slug));
  if (access === HUB_TIMEOUT) {
    return {
      props: {
        ring: { id: '', slug, name: '', description: '', visibility: 'public', themeColor: null },
        user: { id: user.id, primaryHandle: user.primaryHandle || '' },
        canManage: false,
        hubUnavailable: true,
      },
    };
  }
  if (!access) return { notFound: true };

  const { ring } = access;
  return {
    props: {
      ring: {
        id: ring.id,
        slug: ring.slug,
        name: ring.name,
        description: ring.description || '',
        visibility: ring.visibility,
        themeColor: ring.themeColor ?? null,
      },
      user: {
        id: user.id,
        primaryHandle: user.primaryHandle || '',
      },
      canManage: access.manageAs !== null,
    },
  };
};
