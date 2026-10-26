import { getSiteConfig, SiteConfig } from "@/lib/config/site/dynamic";
import { GetServerSideProps } from "next";
import { contentMetadataGenerator } from "@/lib/utils/metadata/content-metadata";
import CustomPageLayout from "@/components/ui/layout/CustomPageLayout";
import { db } from "@/lib/config/database/connection";
import PageMeta from "@/components/ui/layout/PageMeta";

interface CustomLanding {
  title: string;
  content: string;
  hideNavbar: boolean;
}

interface LandingPageProps {
  siteConfig: SiteConfig;
  /** The published custom page marked "Use as Landing Page" in Admin */
  customLanding: CustomLanding | null;
}

export default function LandingPage({ siteConfig, customLanding }: LandingPageProps) {
  // Generate metadata for landing page
  const homepageMetadata = contentMetadataGenerator.generateHomepageMetadata(siteConfig);

  if (customLanding) {
    return (
      <>
        <PageMeta title={homepageMetadata.title} description={homepageMetadata.description} path="/landing" />
        <CustomPageLayout siteConfig={siteConfig} hideNavbar={customLanding.hideNavbar}>
          <div
            className="custom-page-content flex-1"
            dangerouslySetInnerHTML={{ __html: customLanding.content }}
          />
        </CustomPageLayout>
      </>
    );
  }

  return null;
}

export const getServerSideProps: GetServerSideProps<LandingPageProps> = async () => {
  const siteConfig = await getSiteConfig();

  // Admin → Custom Pages → "Use as Landing Page"
  let customLanding: CustomLanding | null = null;
  try {
    customLanding = await db.customPage.findFirst({
      where: { published: true, isLandingPage: true },
      select: { title: true, content: true, hideNavbar: true },
    });
  } catch (error) {
    console.error("Failed to load custom landing page, using the built-in one:", error);
  }

  // Without one, the home page says what the site is (the old built-in page
  // here spoke in a voice that isn't mine any more; signup audit #12)
  if (!customLanding) return { redirect: { destination: '/', permanent: false } };

  return {
    props: {
      siteConfig,
      customLanding,
    },
  };
};
