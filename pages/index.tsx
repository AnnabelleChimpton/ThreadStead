import Layout from "../components/Layout";
import RetroCard from "../components/RetroCard";
import { getSiteConfig, SiteConfig } from "@/lib/get-site-config";
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
    createdAt: string;
    updatedAt: string;
  };
}

export default function Home({ siteConfig, customPage }: HomeProps) {
  // If there's a custom homepage, show it
  if (customPage) {
    return (
      <Layout siteConfig={siteConfig}>
        <RetroCard title={customPage.title}>
          <div 
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: customPage.content }}
          />
          <div className="mt-6 pt-4 border-t border-gray-200 text-xs text-gray-500">
            Last updated: {new Date(customPage.updatedAt).toLocaleDateString()}
          </div>
        </RetroCard>
        <div className="mt-8 text-center">
          <Link 
            href="/feed" 
            className="border border-black px-4 py-2 bg-blue-200 hover:bg-blue-100 shadow-[2px_2px_0_#000] inline-block"
          >
            View Community Feed
          </Link>
        </div>
      </Layout>
    );
  }

  // Fallback content if no custom homepage exists
  return (
    <Layout siteConfig={siteConfig}>
      <RetroCard title="Welcome">
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold mb-4">{siteConfig.welcome_message}</h1>
          <p className="text-gray-600 mb-6">{siteConfig.site_description}</p>
          <p className="text-sm text-gray-500 mb-8">
            The admin hasn&apos;t created a custom homepage yet.
          </p>
          <Link 
            href="/feed" 
            className="border border-black px-6 py-3 bg-green-200 hover:bg-green-100 shadow-[2px_2px_0_#000] inline-block text-lg font-medium"
          >
            Enter Community
          </Link>
        </div>
      </RetroCard>
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
    // Look for a custom page that could serve as homepage
    // Priority: 1) "home" slug, 2) "index" slug, 3) any page with isHomepage flag (if we add it later)
    const customPage = await db.customPage.findFirst({
      where: {
        published: true,
        OR: [
          { slug: "home" },
          { slug: "index" }
        ]
      },
      select: {
        id: true,
        slug: true,
        title: true,
        content: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        { slug: "asc" } // "home" comes before "index" alphabetically
      ]
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
