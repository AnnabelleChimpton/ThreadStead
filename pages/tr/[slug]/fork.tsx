import React from "react";
import { useRouter } from "next/router";
import Layout from "../../../components/ui/layout/Layout";
import ForkThreadRingForm from "../../../components/ui/forms/ForkThreadRingForm";
import { getSiteConfig, SiteConfig } from "@/lib/config/site/dynamic";
import { GetServerSideProps } from "next";
import { getSessionUser } from "@/lib/auth/server";
import { raceHubCall, HUB_TIMEOUT } from "@/lib/api/ringhub/ringhub-ssr";
import { readRingAs } from "@/lib/domain/threadrings/ring-access";

interface ForkPageProps {
  siteConfig: SiteConfig;
  originalRing: {
    name: string;
    slug: string;
    description?: string | null;
  } | null;
  error?: string;
  isAuthenticated: boolean;
}

export default function ForkThreadRingPage({
  siteConfig,
  originalRing,
  error,
  isAuthenticated
}: ForkPageProps) {
  const router = useRouter();

  if (!isAuthenticated) {
    return (
      <Layout siteConfig={siteConfig}>
        <div className="max-w-2xl mx-auto py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
            <p className="text-gray-600">
              You must be logged in to start a new Ring.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !originalRing) {
    return (
      <Layout siteConfig={siteConfig}>
        <div className="max-w-2xl mx-auto py-8">
          <div className="text-center text-red-600">
            {error || "ThreadRing not found"}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout siteConfig={siteConfig}>
      <div className="max-w-2xl mx-auto py-8">
        <ForkThreadRingForm
          originalRing={originalRing}
          onCancel={() => router.push(`/tr/${originalRing.slug}`)}
        />
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const siteConfig = await getSiteConfig();
  const { slug } = context.params!;

  if (typeof slug !== "string") {
    return {
      props: {
        siteConfig,
        originalRing: null,
        error: "Invalid ThreadRing URL",
        isAuthenticated: false,
      },
    };
  }

  // Check if user is authenticated
  const viewer = await getSessionUser(context.req as any);

  if (!viewer) {
    return {
      props: {
        siteConfig,
        originalRing: null,
        isAuthenticated: false,
      },
    };
  }

  // Signed as the viewer: a private ring is there only for its members, and
  // nothing falls back to the local mirror row
  const access = await raceHubCall(readRingAs(viewer, slug));
  if (access === HUB_TIMEOUT) {
    return {
      props: {
        siteConfig,
        originalRing: null,
        error: "We can't reach Ring Hub right now. Try again in a minute.",
        isAuthenticated: true,
      },
    };
  }
  if (!access) {
    return { props: { siteConfig, originalRing: null, error: "Ring not found", isAuthenticated: true } };
  }

  return {
    props: {
      siteConfig,
      originalRing: {
        name: access.ring.name,
        slug: access.ring.slug,
        description: access.ring.description,
      },
      isAuthenticated: true,
    },
  };
};