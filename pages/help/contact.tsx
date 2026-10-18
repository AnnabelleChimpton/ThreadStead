import { getSiteBaseUrl } from '@/lib/config/site-url';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '@/components/ui/layout/Layout';
import PageHeader from '@/components/ui/layout/PageHeader';
import Callout from '@/components/ui/feedback/Callout';
import ButtonLink, { buttonClasses } from '@/components/ui/ButtonLink';
import { getSiteConfig, SiteConfig } from '@/lib/config/site/dynamic';

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
          <PageHeader title="Contact" back={{ href: '/help', label: 'Back to Help' }}>
            <p>One person runs this site and reads every message.</p>
          </PageHeader>

          {/* Contact Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <div className="thread-module">
              <h2 className="thread-headline text-xl font-bold mb-2">
                General Inquiries
              </h2>
              <p className="text-nb-ink mb-4">
                A question about how something works, or about {siteConfig.site_name} itself.
              </p>
              <a
                href="mailto:hello@homepageagain.com"
                className={buttonClasses("primary")}
              >
                Send an email
              </a>
            </div>

            <div className="thread-module">
              <h2 className="thread-headline text-xl font-bold mb-2">
                Report a Bug
              </h2>
              <p className="text-nb-ink mb-4">
                Something broken? Say what you clicked and what happened.
              </p>
              <a
                href="mailto:support@homepageagain.com"
                className={buttonClasses("primary")}
              >
                Report a bug
              </a>
            </div>

            <div className="thread-module">
              <h2 className="thread-headline text-xl font-bold mb-2">
                Feature Requests
              </h2>
              <p className="text-nb-ink mb-4">
                An idea for the site? Send it over.
              </p>
              <a
                href="mailto:feedback@homepageagain.com"
                className={buttonClasses("primary")}
              >
                Send an idea
              </a>
            </div>

            <div className="thread-module">
              <h2 className="thread-headline text-xl font-bold mb-2">
                Report Abuse
              </h2>
              <p className="text-nb-ink mb-4">
                Something that breaks the house rules? You can also use the Report button on any post.
              </p>
              <a
                href="mailto:abuse@homepageagain.com"
                className={buttonClasses("secondary")}
              >
                Report Abuse
              </a>
            </div>
          </div>

          <Callout title="Quick answers">
            <p>The FAQ covers the usual questions.</p>
            <p><ButtonLink href="/help/faq">Read the FAQ</ButtonLink></p>
          </Callout>

          <p className="mt-6 text-sm text-nb-ink">
            Replies usually take a day or two. Put &quot;URGENT&quot; in the subject line if it can&apos;t wait.
          </p>
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
