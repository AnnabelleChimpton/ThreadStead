import Layout from "../../components/ui/layout/Layout";
import { getSiteConfig, SiteConfig } from "@/lib/config/site/dynamic";
import { GetServerSideProps } from "next";
import { getSessionUser } from "@/lib/auth/server";
import Link from "next/link";
import { PixelIcon } from "@/components/ui/PixelIcon";

interface DashboardProps {
  siteConfig: SiteConfig;
  user?: {
    id: string;
    did: string;
    role: string;
    primaryHandle: string | null;
  };
}

// Simple card component for dashboard (avoids thread-module min-width issues)
function SimpleCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#FCFAF7] border border-[#A18463] rounded-lg shadow-[2px_2px_0_#A18463] p-4 mb-4 w-full max-w-full overflow-hidden">
      {title && <h3 className="text-lg font-bold mb-3 text-[#2E4B3F]">{title}</h3>}
      {children}
    </div>
  );
}

function LandingPage({ siteConfig }: { siteConfig: SiteConfig }) {
  return (
    <Layout siteConfig={siteConfig}>
      <div className="w-full max-w-4xl mx-auto px-4 py-6 space-y-6">
        <SimpleCard title="Welcome to Threadstead">
          <div className="text-center py-4">
            <h1 className="text-xl sm:text-2xl font-bold mb-4">{siteConfig.welcome_message}</h1>
            <p className="text-base sm:text-lg text-gray-700 mb-4">
              <strong>ThreadRings are themed communities you can join — like modern WebRings or clubhouses — where posts live in your profile but also appear in shared Ring feeds.</strong>
            </p>
            <p className="text-gray-600 mb-6">{siteConfig.site_description}</p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Link
                href="/signup"
                className="border border-black px-6 py-3 bg-yellow-200 hover:bg-yellow-100 shadow-[2px_2px_0_#000] inline-block text-lg font-medium"
              >
                Join Community
              </Link>
              <Link
                href="/login"
                className="border border-black px-6 py-3 bg-blue-200 hover:bg-blue-100 shadow-[2px_2px_0_#000] inline-block text-lg font-medium"
              >
                Login
              </Link>
            </div>
          </div>
        </SimpleCard>

        <SimpleCard title="What are ThreadRings?">
          <div className="space-y-4">
            <p className="text-gray-700">
              ThreadRings bring back the spirit of the early web&apos;s WebRings — interconnected communities organized around shared interests.
              Each Ring is a themed community where members can share posts, have discussions, and build connections.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-gray-300 p-3 bg-blue-50 rounded">
                <h3 className="font-bold mb-1"><PixelIcon name="home" className="inline-block align-middle mr-1" /> Your Content Lives with You</h3>
                <p className="text-sm text-gray-600">Posts belong to your profile but also appear in Ring feeds you&apos;ve joined</p>
              </div>
              <div className="border border-gray-300 p-3 bg-green-50 rounded">
                <h3 className="font-bold mb-1">🌳 Rich Family Trees</h3>
                <p className="text-sm text-gray-600">Rings can branch into new communities while maintaining their connections</p>
              </div>
              <div className="border border-gray-300 p-3 bg-purple-50 rounded">
                <h3 className="font-bold mb-1"><PixelIcon name="bookmark" className="inline-block align-middle mr-1" /> Community-Focused</h3>
                <p className="text-sm text-gray-600">Each Ring has its own culture, rules, and personality shaped by members</p>
              </div>
            </div>
            <div className="text-center pt-4">
              <Link
                href="/threadrings"
                className="border border-black px-4 py-2 bg-blue-200 hover:bg-blue-100 shadow-[2px_2px_0_#000] inline-block font-medium"
              >
                Browse ThreadRings
              </Link>
            </div>
          </div>
        </SimpleCard>
      </div>
    </Layout>
  );
}

function PersonalizedHomepage({ siteConfig, user }: { siteConfig: SiteConfig; user: any }) {
  return (
    <Layout siteConfig={siteConfig}>
      <div className="w-full max-w-6xl mx-auto px-4 py-6 space-y-6">
        <SimpleCard title={`Welcome back${user?.primaryHandle ? `, ${user.primaryHandle}` : ''}!`}>
          <div className="py-4">
            <p className="text-gray-700 mb-4">Here&apos;s what&apos;s happening in your community:</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/feed"
                className="border border-black px-4 py-2 bg-green-200 hover:bg-green-100 shadow-[2px_2px_0_#000] inline-block font-medium"
              >
                View Feed
              </Link>
              <Link
                href="/post/new"
                className="border border-black px-4 py-2 bg-blue-200 hover:bg-blue-100 shadow-[2px_2px_0_#000] inline-block font-medium"
              >
                Create Post
              </Link>
              <Link
                href="/threadrings"
                className="border border-black px-4 py-2 bg-purple-200 hover:bg-purple-100 shadow-[2px_2px_0_#000] inline-block font-medium"
              >
                Explore Rings
              </Link>
            </div>
          </div>
        </SimpleCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SimpleCard title="Recent Activity">
            <div className="py-4">
              <p className="text-gray-600 text-sm">Widget placeholder - Recent posts from your ThreadRings</p>
              <div className="mt-3 text-center">
                <Link
                  href="/feed"
                  className="text-blue-600 hover:underline text-sm"
                >
                  View all activity →
                </Link>
              </div>
            </div>
          </SimpleCard>

          <SimpleCard title="New Neighbors">
            <div className="py-4">
              <p className="text-gray-600 text-sm">Widget placeholder - Recently joined community members</p>
              <div className="mt-3 text-center">
                <Link
                  href="/directory"
                  className="text-blue-600 hover:underline text-sm"
                >
                  Browse directory →
                </Link>
              </div>
            </div>
          </SimpleCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SimpleCard title="Your ThreadRings">
            <div className="py-4">
              <p className="text-gray-600 text-sm">Widget placeholder - Your joined ThreadRings and activity</p>
              <div className="mt-3 text-center">
                <Link
                  href="/threadrings"
                  className="text-blue-600 hover:underline text-sm"
                >
                  Manage rings →
                </Link>
              </div>
            </div>
          </SimpleCard>

          <SimpleCard title="Quick Actions">
            <div className="py-4 space-y-2">
              <Link
                href="/post/new"
                className="block w-full text-center border border-black px-3 py-2 bg-yellow-100 hover:bg-yellow-200 shadow-[1px_1px_0_#000] text-sm"
              >
                Create New Post
              </Link>
              <Link
                href="/threadrings"
                className="block w-full text-center border border-black px-3 py-2 bg-blue-100 hover:bg-blue-200 shadow-[1px_1px_0_#000] text-sm"
              >
                Join a ThreadRing
              </Link>
              <Link
                href="/settings"
                className="block w-full text-center border border-black px-3 py-2 bg-green-100 hover:bg-green-200 shadow-[1px_1px_0_#000] text-sm"
              >
                Edit Profile
              </Link>
            </div>
          </SimpleCard>
        </div>
      </div>
    </Layout>
  );
}

export default function Dashboard({ siteConfig, user }: DashboardProps) {
  // Always show default homepage system, ignoring custom page overrides
  if (user) {
    return <PersonalizedHomepage siteConfig={siteConfig} user={user} />;
  } else {
    return <LandingPage siteConfig={siteConfig} />;
  }
}

export const getServerSideProps: GetServerSideProps<DashboardProps> = async (context) => {
  const siteConfig = await getSiteConfig();
  const user = await getSessionUser(context.req as any);

  // Note: This page always bypasses custom homepage settings
  // It's designed to give access to the default homepage system

  if (user) {
    return {
      props: {
        siteConfig,
        user: {
          id: user.id,
          did: user.did,
          role: user.role,
          primaryHandle: user.primaryHandle,
        }
      },
    };
  } else {
    return {
      props: {
        siteConfig,
      },
    };
  }
};