import React from "react";
import { useRouter } from "next/router";
import Layout from "../../../components/ui/layout/Layout";
import ForkThreadRingForm from "../../../components/ui/forms/ForkThreadRingForm";
import { getSiteConfig, SiteConfig } from "@/lib/get-site-config";
import { GetServerSideProps } from "next";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-server";
import { featureFlags } from "@/lib/feature-flags";
import { getRingHubClient } from "@/lib/ringhub-client";

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
              You must be logged in to fork a ThreadRing.
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

  try {
    let ring = null;

    // Use Ring Hub if enabled
    if (featureFlags.ringhub()) {
      const client = getRingHubClient();
      if (client) {
        try {
          const ringDescriptor = await client.getRing(slug as string);
          if (ringDescriptor) {
            ring = {
              id: ringDescriptor.slug,
              name: ringDescriptor.name,
              slug: ringDescriptor.slug,
              description: ringDescriptor.description,
              visibility: ringDescriptor.visibility?.toLowerCase() || 'public',
            };
          }
        } catch (error) {
          console.error("Error fetching ring from Ring Hub for fork page:", error);
          // Fall through to local database as fallback
        }
      }
    }

    // Fallback to local database if Ring Hub is not available or failed
    if (!ring) {
      ring = await db.threadRing.findUnique({
        where: { slug },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          visibility: true,
        },
      });
    }

    if (!ring) {
      return {
        props: {
          siteConfig,
          originalRing: null,
          error: "ThreadRing not found",
          isAuthenticated: true,
        },
      };
    }

    // Check if the ring is visible to the viewer
    if (ring.visibility === "private") {
      // Check if viewer is a member
      const membership = await db.threadRingMember.findUnique({
        where: {
          threadRingId_userId: {
            threadRingId: ring.id,
            userId: viewer.id
          }
        }
      });

      if (!membership) {
        return {
          props: {
            siteConfig,
            originalRing: null,
            error: "You cannot fork a private ThreadRing you're not a member of",
            isAuthenticated: true,
          },
        };
      }
    }

    return {
      props: {
        siteConfig,
        originalRing: {
          name: ring.name,
          slug: ring.slug,
          description: ring.description,
        },
        isAuthenticated: true,
      },
    };
  } catch (error: any) {
    console.error("Fork page error:", error);
    return {
      props: {
        siteConfig,
        originalRing: null,
        error: "Failed to load ThreadRing",
        isAuthenticated: true,
      },
    };
  }
};