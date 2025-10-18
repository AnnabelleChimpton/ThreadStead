import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '@/components/ui/layout/Layout';
import { getSiteConfig, SiteConfig } from '@/lib/config/site/dynamic';

interface ContactProps {
  siteConfig: SiteConfig;
}

export default function Contact({ siteConfig }: ContactProps) {
  return (
    <>
      <Head>
        <title>HomePageAgain — Help: Contact</title>
        <meta name="description" content="Get in touch with the HomePageAgain team. We're here to help with questions, feedback, and support." />
        <link rel="canonical" href={`${process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'}/help/contact`} />
        <meta name="robots" content="index, follow" />

        <meta property="og:title" content="HomePageAgain — Help: Contact" />
        <meta property="og:description" content="Get in touch with the HomePageAgain team" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'}/help/contact`} />
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
                Contact Us
              </h1>
              <p className="text-lg text-gray-700">
                We&apos;re here to help! Get in touch with our team.
              </p>
            </div>
          </div>

          {/* Contact Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <div className="bg-thread-cream border border-thread-sage rounded-lg shadow-[2px_2px_0_#A18463] p-6">
              <div className="text-4xl mb-4">💬</div>
              <h2 className="text-2xl font-bold text-thread-pine mb-3">
                General Inquiries
              </h2>
              <p className="text-gray-700 mb-4">
                Have a question about HomePageAgain? Want to learn more about our platform?
              </p>
              <a
                href="mailto:hello@homepageagain.com"
                className="inline-block px-4 py-2 bg-thread-pine !text-thread-cream rounded hover:bg-thread-sunset transition-colors font-medium"
              >
                Email Us
              </a>
            </div>

            <div className="bg-thread-cream border border-thread-sage rounded-lg shadow-[2px_2px_0_#A18463] p-6">
              <div className="text-4xl mb-4">🐛</div>
              <h2 className="text-2xl font-bold text-thread-pine mb-3">
                Report a Bug
              </h2>
              <p className="text-gray-700 mb-4">
                Found something not working quite right? Let us know so we can fix it.
              </p>
              <a
                href="mailto:support@homepageagain.com"
                className="inline-block px-4 py-2 bg-thread-pine !text-thread-cream rounded hover:bg-thread-sunset transition-colors font-medium"
              >
                Report Issue
              </a>
            </div>

            <div className="bg-thread-cream border border-thread-sage rounded-lg shadow-[2px_2px_0_#A18463] p-6">
              <div className="text-4xl mb-4">💡</div>
              <h2 className="text-2xl font-bold text-thread-pine mb-3">
                Feature Requests
              </h2>
              <p className="text-gray-700 mb-4">
                Have an idea to make HomePageAgain better? We&apos;d love to hear it!
              </p>
              <a
                href="mailto:feedback@homepageagain.com"
                className="inline-block px-4 py-2 bg-thread-pine !text-thread-cream rounded hover:bg-thread-sunset transition-colors font-medium"
              >
                Share Your Idea
              </a>
            </div>

            <div className="bg-thread-cream border border-thread-sage rounded-lg shadow-[2px_2px_0_#A18463] p-6">
              <div className="text-4xl mb-4">🚨</div>
              <h2 className="text-2xl font-bold text-thread-pine mb-3">
                Report Abuse
              </h2>
              <p className="text-gray-700 mb-4">
                See something that violates our community guidelines?
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
              Looking for quick answers?
            </h3>
            <p className="text-blue-800 mb-4">
              Many common questions are answered in our FAQ.
            </p>
            <Link
              href="/help/faq"
              className="inline-block px-6 py-3 bg-blue-600 !text-white rounded hover:bg-blue-700 transition-colors font-medium"
            >
              Visit FAQ
            </Link>
          </div>

          {/* Response Time Notice */}
          <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-600 text-center">
              We typically respond to inquiries within 1-2 business days. For urgent matters, please indicate &quot;URGENT&quot; in your subject line.
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
