import { getSiteBaseUrl } from '@/lib/config/site-url';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '@/components/ui/layout/Layout';
import { getSiteConfig, SiteConfig } from '@/lib/config/site/dynamic';
import { PixelIcon } from '@/components/ui/PixelIcon';

interface ContactProps {
  siteConfig: SiteConfig;
}

export default function Contact({ siteConfig }: ContactProps) {
  return (
    <>
      <Head>
        <title>{`${siteConfig.site_name} — Help: Contact`}</title>
        <meta name="description" content="Questions, bugs, ideas or reports. One person runs the site and reads every message." />
        <link rel="canonical" href={`${getSiteBaseUrl()}/help/contact`} />
        <meta name="robots" content="index, follow" />

        <meta property="og:title" content={`${siteConfig.site_name} — Help: Contact`} />
        <meta property="og:description" content="Questions, bugs, ideas or reports. One person runs the site and reads every message." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${getSiteBaseUrl()}/help/contact`} />
      </Head>

      <Layout siteConfig={siteConfig}>
        <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-8 sm:py-12">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <Link href="/help" className="text-sm text-thread-sunset hover:underline mb-3 inline-block">
              ← Back to Help
            </Link>
            <div className="bg-gradient-to-br from-purple-100 via-indigo-50 to-blue-100 border-2 border-black rounded-lg shadow-[4px_4px_0_#000] p-6 sm:p-8 text-center">
              <h1 className="text-3xl sm:text-4xl font-bold text-thread-pine mb-4">
                Contact
              </h1>
              <p className="text-lg text-gray-700">
                One person runs this site and reads every message.
              </p>
            </div>
          </div>

          {/* Contact Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <div className="bg-thread-cream border border-thread-sage rounded-lg shadow-[2px_2px_0_#A18463] p-6">
              <div className="mb-4 flex justify-center">
                <PixelIcon name="chat" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-thread-pine mb-3">
                General Inquiries
              </h2>
              <p className="text-gray-700 mb-4">
                A question about how something works, or about {siteConfig.site_name} itself.
              </p>
              <a
                href="mailto:hello@homepageagain.com"
                className="inline-block px-4 py-2 bg-thread-pine !text-thread-cream rounded hover:bg-thread-sunset transition-colors font-medium"
              >
                Send an email
              </a>
            </div>

            <div className="bg-thread-cream border border-thread-sage rounded-lg shadow-[2px_2px_0_#A18463] p-6">
              <div className="mb-4 flex justify-center">
                <PixelIcon name="debug" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-thread-pine mb-3">
                Report a Bug
              </h2>
              <p className="text-gray-700 mb-4">
                Something broken? Say what you clicked and what happened.
              </p>
              <a
                href="mailto:support@homepageagain.com"
                className="inline-block px-4 py-2 bg-thread-pine !text-thread-cream rounded hover:bg-thread-sunset transition-colors font-medium"
              >
                Report a bug
              </a>
            </div>

            <div className="bg-thread-cream border border-thread-sage rounded-lg shadow-[2px_2px_0_#A18463] p-6">
              <div className="mb-4 flex justify-center">
                <PixelIcon name="lightbulb" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-thread-pine mb-3">
                Feature Requests
              </h2>
              <p className="text-gray-700 mb-4">
                An idea for the site? Send it over.
              </p>
              <a
                href="mailto:feedback@homepageagain.com"
                className="inline-block px-4 py-2 bg-thread-pine !text-thread-cream rounded hover:bg-thread-sunset transition-colors font-medium"
              >
                Send an idea
              </a>
            </div>

            <div className="bg-thread-cream border border-thread-sage rounded-lg shadow-[2px_2px_0_#A18463] p-6">
              <div className="mb-4 flex justify-center">
                <PixelIcon name="flag" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-thread-pine mb-3">
                Report Abuse
              </h2>
              <p className="text-gray-700 mb-4">
                Something that breaks the house rules? You can also use the Report button on any post.
              </p>
              <a
                href="mailto:abuse@homepageagain.com"
                className="inline-block px-4 py-2 bg-red-600 !text-white rounded hover:bg-red-700 transition-colors font-medium"
              >
                Report Abuse
              </a>
            </div>
          </div>

          {/* FAQ Link */}
          <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <h3 className="text-xl font-semibold text-blue-900 mb-2">
              Quick answers
            </h3>
            <p className="text-blue-800 mb-4">
              The FAQ covers the usual questions.
            </p>
            <Link
              href="/help/faq"
              className="inline-block px-6 py-3 bg-blue-600 !text-white rounded hover:bg-blue-700 transition-colors font-medium"
            >
              Read the FAQ
            </Link>
          </div>

          {/* Response Time Notice */}
          <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-600 text-center">
              Replies usually take a day or two. Put &quot;URGENT&quot; in the subject line if it can&apos;t wait.
            </p>
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
