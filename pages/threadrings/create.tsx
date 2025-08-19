import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import CreateThreadRingForm from "../../components/forms/CreateThreadRingForm";
import { getSiteConfig, SiteConfig } from "@/lib/get-site-config";
import { GetServerSideProps } from "next";

interface CreateThreadRingPageProps {
  siteConfig: SiteConfig;
}

export default function CreateThreadRingPage({ siteConfig }: CreateThreadRingPageProps) {
  const router = useRouter();

  const handleRingCreated = async (ring: any) => {
    // Redirect to the newly created ThreadRing page
    await router.push(`/threadrings/${ring.slug}`);
  };

  return (
    <Layout siteConfig={siteConfig}>
      <div className="thread-module p-6 mb-6">
        <div className="mb-4">
          <h1 className="thread-headline text-3xl font-bold mb-2">Create ThreadRing</h1>
          <p className="text-thread-sage leading-relaxed">
            Create a new community space where members can share posts and engage around common interests.
            As the creator, you'll become the curator and can invite others to join.
          </p>
        </div>
        <div className="thread-divider"></div>
        <div className="mt-6">
          <span className="thread-label">new threadring</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        <CreateThreadRingForm onCreated={handleRingCreated} />
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<CreateThreadRingPageProps> = async () => {
  const siteConfig = await getSiteConfig();
  
  return {
    props: {
      siteConfig,
    },
  };
};