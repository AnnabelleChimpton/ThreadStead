import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '@/components/ui/layout/Layout';
import { getSiteConfig, SiteConfig } from '@/lib/config/site/dynamic';

interface BuildHubProps {
  siteConfig: SiteConfig;
}

export default function BuildHub({ siteConfig }: BuildHubProps) {
  const tabs = [
    { href: '/build/templates', label: 'Templates', description: 'Visual Builder & Template Language' },
    { href: '/build/getting-started', label: 'Getting Started', description: 'Create your profile in minutes' },
  ];

  return (
    <>
      <Head>
        <title>HomePageAgain — Build</title>
        <meta name="description" content="Build your presence with our visual template builder and get started creating your unique home on the web." />
        <link rel="canonical" href={`${process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'}/build`} />
        <meta name="robots" content="index, follow" />

        <meta property="og:title" content="HomePageAgain — Build" />
        <meta property="og:description" content="Build your presence with our visual template builder and get started creating your unique home on the web." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'}/build`} />
      </Head>

      <Layout siteConfig={siteConfig}>
        <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-8 sm:py-12">
          {/* Hero Section */}
          <div className="mb-6 sm:mb-8">
            <div className="bg-gradient-to-br from-purple-100 via-pink-50 to-orange-100 border-2 border-black rounded-lg shadow-[4px_4px_0_#000] p-6 sm:p-8 text-center">
              <h1 className="text-3xl sm:text-4xl font-bold text-thread-pine mb-4">
                Build Your Web Presence
              </h1>
              <p className="text-lg sm:text-xl text-gray-700 max-w-3xl mx-auto mb-2">
                Create a unique home on the web with our powerful visual builder and intuitive template language.
              </p>
              <p className="text-base text-gray-600 max-w-2xl mx-auto">
                Whether you&apos;re a designer or a developer, our tools make it easy to express yourself online.
              </p>
            </div>
          </div>

          {/* Sub-navigation Tabs */}
          <div className="flex justify-center gap-4 mb-8 border-b border-gray-200 pb-4">
            {tabs.map(tab => (
              <Link
                key={tab.href}
                href={tab.href}
                className="px-4 py-2 text-thread-pine hover:text-thread-sunset font-medium border-b-2 border-transparent hover:border-thread-sunset transition-colors"
              >
                {tab.label}
              </Link>
            ))}
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {tabs.map(tab => (
              <Link
                key={tab.href}
                href={tab.href}
                className="bg-thread-cream border border-thread-sage rounded-lg shadow-[2px_2px_0_#A18463] p-6 hover:shadow-[4px_4px_0_#A18463] transition-shadow"
              >
                <h2 className="text-2xl font-bold text-thread-pine mb-3">
                  {tab.label}
                </h2>
                <p className="text-gray-700">
                  {tab.description}
                </p>
                <div className="mt-4 text-thread-sunset font-medium">
                  Learn more →
                </div>
              </Link>
            ))}
          </div>

          {/* Additional Info */}
          <div className="mt-12 p-6 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              New to building on the web?
            </h3>
            <p className="text-blue-800 mb-4">
              Start with our Getting Started guide to create your first profile in minutes. No coding required!
            </p>
            <Link
              href="/build/getting-started"
              className="inline-block px-4 py-2 bg-blue-600 !text-white rounded hover:bg-blue-700 transition-colors font-medium"
            >
              Get Started Now
            </Link>
          </div>
        </div>
      </Layout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  const siteConfig = await getSiteConfig();

  return {
    props: {
      siteConfig,
    }
  };
};
