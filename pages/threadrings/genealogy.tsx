import { GetServerSideProps } from 'next';
import ThreadRingGenealogy from '@/components/core/threadring/ThreadRingGenealogy';
import Layout from '@/components/ui/layout/Layout';
import { getSiteConfig, SiteConfig } from '@/lib/config/site/dynamic';
import PageMeta from '@/components/ui/layout/PageMeta';

export default function GenealogyPage({ siteConfig }: { siteConfig: SiteConfig }) {
  return (
    <Layout siteConfig={siteConfig}>
      <PageMeta title="ThreadRing family tree" description="Every ThreadRing and the rings it grew from, as one family tree." path="/threadrings/genealogy" />
      <div className="max-w-3xl mx-auto">
        <section className="thread-module p-4 sm:p-5 md:p-6 !mt-0 !mb-5">
          <h1 className="thread-headline text-3xl font-bold mb-2">Family tree</h1>
          <p className="text-thread-sage leading-relaxed m-0">Which ring was started from which. Every ring goes back to The Spool.</p>
        </section>
        <section className="thread-module p-4 sm:p-6 !mt-0">
          <ThreadRingGenealogy />
        </section>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => ({ props: { siteConfig: await getSiteConfig() } });
