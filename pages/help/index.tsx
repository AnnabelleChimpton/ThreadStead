import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '@/components/ui/layout/Layout';
import { getSiteConfig, SiteConfig } from '@/lib/config/site/dynamic';

interface HelpHubProps {
  siteConfig: SiteConfig;
}

export default function HelpHub({ siteConfig }: HelpHubProps) {
  const tabs = [
    { href: '/help/faq', label: 'FAQ', icon: '❓', description: 'Frequently asked questions' },
    { href: '/help/music-guide', label: 'Music Guide', icon: '🎵', description: 'Complete guide for creating and uploading MIDI music' },
    { href: '/help/guidelines', label: 'Guidelines', icon: '📋', description: 'Community standards and expectations' },
    { href: '/help/privacy', label: 'Privacy', icon: '🔒', description: 'How we protect your data' },
    { href: '/help/terms', label: 'Terms', icon: '📜', description: 'Terms of service' },
    { href: '/help/contact', label: 'Contact', icon: '✉️', description: 'Get in touch with us' },
  ];

  return (
    <>
      <Head>
        <title>HomePageAgain — Help</title>
        <meta name="description" content="Find answers to your questions, learn about our community guidelines, and get support." />
        <link rel="canonical" href={`${process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'}/help`} />
        <meta name="robots" content="index, follow" />

        <meta property="og:title" content="HomePageAgain — Help" />
        <meta property="og:description" content="Find answers to your questions, learn about our community guidelines, and get support." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'}/help`} />
      </Head>

      <Layout siteConfig={siteConfig}>
        <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-8 sm:py-12">
          {/* Hero Section */}
          <div className="mb-6 sm:mb-8">
            <div className="bg-gradient-to-br from-blue-100 via-sky-50 to-purple-100 border-2 border-black rounded-lg shadow-[4px_4px_0_#000] p-6 sm:p-8 text-center">
              <h1 className="text-3xl sm:text-4xl font-bold text-thread-pine mb-4">
                How Can We Help?
              </h1>
              <p className="text-lg sm:text-xl text-gray-700 max-w-3xl mx-auto mb-2">
                Find answers, learn about our community, and get the support you need.
              </p>
              <p className="text-base text-gray-600 max-w-2xl mx-auto">
                From FAQs to our privacy policy, everything you need to know is here.
              </p>
            </div>
          </div>

          {/* Sub-navigation Tabs */}
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-8 border-b border-gray-200 pb-4">
            {tabs.map(tab => (
              <Link
                key={tab.href}
                href={tab.href}
                className="px-3 sm:px-4 py-2 text-sm sm:text-base text-thread-pine hover:text-thread-sunset font-medium border-b-2 border-transparent hover:border-thread-sunset transition-colors"
              >
                <span className="sm:hidden">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </Link>
            ))}
          </div>

          {/* Help Topics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-12">
            {tabs.map(tab => (
              <Link
                key={tab.href}
                href={tab.href}
                className="bg-thread-cream border border-thread-sage rounded-lg shadow-[2px_2px_0_#A18463] p-5 hover:shadow-[4px_4px_0_#A18463] transition-shadow"
              >
                <div className="text-3xl mb-3">{tab.icon}</div>
                <h2 className="text-xl font-bold text-thread-pine mb-2">
                  {tab.label}
                </h2>
                <p className="text-gray-700 text-sm">
                  {tab.description}
                </p>
                <div className="mt-3 text-thread-sunset font-medium text-sm">
                  Learn more →
                </div>
              </Link>
            ))}
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="text-lg font-semibold text-green-900 mb-2">
                New to HomePageAgain?
              </h3>
              <p className="text-green-800 mb-4">
                Check out our FAQ to get answers to common questions about getting started.
              </p>
              <Link
                href="/help/faq"
                className="inline-block px-4 py-2 bg-green-600 !text-white rounded hover:bg-green-700 transition-colors font-medium"
              >
                Read FAQ
              </Link>
            </div>

            <div className="p-6 bg-purple-50 border border-purple-200 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-900 mb-2">
                Need to reach us?
              </h3>
              <p className="text-purple-800 mb-4">
                Have a question that isn&apos;t covered? Get in touch with our team.
              </p>
              <Link
                href="/help/contact"
                className="inline-block px-4 py-2 bg-purple-600 !text-white rounded hover:bg-purple-700 transition-colors font-medium"
              >
                Contact Us
              </Link>
            </div>
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
