import Layout from "../../components/ui/layout/Layout";
import RetroCard from "../../components/ui/layout/RetroCard";
import { getSiteConfig, SiteConfig } from "@/lib/config/site/dynamic";
import { GetServerSideProps } from "next";
import Link from "next/link";

interface LandingPageProps {
  siteConfig: SiteConfig;
}

export default function LandingPage({ siteConfig }: LandingPageProps) {
  return (
    <Layout siteConfig={siteConfig}>
      <div className="space-y-6">
        <RetroCard title="Welcome to Threadstead">
          <div className="text-center py-8">
            <h1 className="text-2xl font-bold mb-4">{siteConfig.welcome_message}</h1>
            <p className="text-lg text-gray-700 mb-4">
              <strong>ThreadRings are themed communities you can join — like modern WebRings or clubhouses — where posts live in your profile but also appear in shared Ring feeds.</strong>
            </p>
            <p className="text-gray-600 mb-8">{siteConfig.site_description}</p>
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
              <Link
                href="/getting-started"
                className="border border-black px-6 py-3 bg-green-200 hover:bg-green-100 shadow-[2px_2px_0_#000] inline-block text-lg font-medium"
              >
                Learn More
              </Link>
            </div>
          </div>
        </RetroCard>

        <RetroCard title="What are ThreadRings?">
          <div className="space-y-4">
            <p className="text-gray-700">
              ThreadRings bring back the spirit of the early web&apos;s WebRings — interconnected communities organized around shared interests.
              Each Ring is a themed community where members can share posts, have discussions, and build connections.
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="border border-gray-300 p-3 bg-blue-50">
                <h3 className="font-bold mb-1">🏠 Your Content Lives with You</h3>
                <p className="text-sm text-gray-600">Posts belong to your profile but also appear in Ring feeds you&apos;ve joined</p>
              </div>
              <div className="border border-gray-300 p-3 bg-green-50">
                <h3 className="font-bold mb-1">🌳 Rich Family Trees</h3>
                <p className="text-sm text-gray-600">Rings can branch into new communities while maintaining their connections</p>
              </div>
              <div className="border border-gray-300 p-3 bg-purple-50">
                <h3 className="font-bold mb-1">✨ Community-Focused</h3>
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
        </RetroCard>

        <RetroCard title="Community Highlights">
          <div className="text-center py-4">
            <p className="text-gray-600 mb-4">Join our growing community of creative individuals</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-green-50 p-3 border border-gray-200">
                <div className="font-bold text-green-800">Active Members</div>
                <div className="text-gray-600">Building connections daily</div>
              </div>
              <div className="bg-purple-50 p-3 border border-gray-200">
                <div className="font-bold text-purple-800">ThreadRings</div>
                <div className="text-gray-600">Communities to explore</div>
              </div>
            </div>
            <div className="mt-4">
              <Link
                href="/directory"
                className="text-blue-600 hover:underline"
              >
                Browse our community directory →
              </Link>
            </div>
          </div>
        </RetroCard>

        <RetroCard title="Start Exploring">
          <div className="py-4">
            <p className="text-gray-700 mb-4 text-center">
              Ready to dive into our community? Here are some places to start:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="text-center">
                <Link
                  href="/feed"
                  className="block border border-black px-4 py-3 bg-green-100 hover:bg-green-200 shadow-[2px_2px_0_#000] font-medium"
                >
                  🌊 View Community Feed
                </Link>
                <p className="text-xs text-gray-600 mt-2">See what members are posting</p>
              </div>
              <div className="text-center">
                <Link
                  href="/threadrings"
                  className="block border border-black px-4 py-3 bg-purple-100 hover:bg-purple-200 shadow-[2px_2px_0_#000] font-medium"
                >
                  🔗 Explore ThreadRings
                </Link>
                <p className="text-xs text-gray-600 mt-2">Discover themed communities</p>
              </div>
            </div>
          </div>
        </RetroCard>

        <div className="text-center py-6 border-t border-gray-200">
          <p className="text-gray-600 mb-3">Ready to join our community?</p>
          <Link
            href="/signup"
            className="border border-black px-8 py-4 bg-yellow-200 hover:bg-yellow-100 shadow-[3px_3px_0_#000] inline-block text-xl font-bold"
          >
            🎉 Join ThreadStead Today!
          </Link>
        </div>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<LandingPageProps> = async () => {
  const siteConfig = await getSiteConfig();

  return {
    props: {
      siteConfig,
    },
  };
};