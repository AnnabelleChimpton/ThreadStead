import Layout from "../components/ui/layout/Layout";
import CustomPageLayout from "../components/ui/layout/CustomPageLayout";
import RetroCard from "../components/ui/layout/RetroCard";
import { getSiteConfig, SiteConfig } from "@/lib/config/site/dynamic";
import { GetServerSideProps } from "next";
import { PrismaClient } from "@prisma/client";
import Link from "next/link";

const db = new PrismaClient();

interface HomeProps {
  siteConfig: SiteConfig;
  customPage?: {
    id: string;
    slug: string;
    title: string;
    content: string;
    hideNavbar: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

export default function Home({ siteConfig, customPage }: HomeProps) {
  // If there's a custom homepage, render it exactly like a regular custom page
  if (customPage) {
    return (
      <CustomPageLayout siteConfig={siteConfig} hideNavbar={customPage.hideNavbar}>
        <div 
          className="custom-page-content flex-1"
          dangerouslySetInnerHTML={{ __html: customPage.content }}
        />
      </CustomPageLayout>
    );
  }

  // Fallback content if no custom homepage exists
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
                href="/getting-started" 
                className="border border-black px-6 py-3 bg-yellow-200 hover:bg-yellow-100 shadow-[2px_2px_0_#000] inline-block text-lg font-medium"
              >
                Learn More
              </Link>
              <Link 
                href="/feed" 
                className="border border-black px-6 py-3 bg-green-200 hover:bg-green-100 shadow-[2px_2px_0_#000] inline-block text-lg font-medium"
              >
                Enter Community
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
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<HomeProps> = async () => {
  const siteConfig = await getSiteConfig();
  
  // Check if default homepage is disabled - redirect to feed if so
  if (siteConfig.disable_default_home === "true") {
    return {
      redirect: {
        destination: "/feed",
        permanent: false,
      },
    };
  }
  
  try {
    // Look for a custom page that is explicitly set as homepage
    const customPage = await db.customPage.findFirst({
      where: {
        published: true,
        isHomepage: true,
      },
      select: {
        id: true,
        slug: true,
        title: true,
        content: true,
        hideNavbar: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (customPage) {
      return {
        props: {
          siteConfig,
          customPage: {
            ...customPage,
            createdAt: customPage.createdAt.toISOString(),
            updatedAt: customPage.updatedAt.toISOString(),
          }
        },
      };
    }

    // No custom homepage found
    return {
      props: {
        siteConfig,
      },
    };
  } catch (error) {
    console.error("Error fetching homepage:", error);
    return {
      props: {
        siteConfig,
      },
    };
  }
};
