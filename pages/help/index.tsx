import { getSiteBaseUrl } from '@/lib/config/site-url';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '@/components/ui/layout/Layout';
import { getSiteConfig, SiteConfig } from '@/lib/config/site/dynamic';
import PageHeader from '@/components/ui/layout/PageHeader';
import Callout from '@/components/ui/feedback/Callout';
import ButtonLink from '@/components/ui/ButtonLink';

interface HelpHubProps {
  siteConfig: SiteConfig;
}

export default function HelpHub({ siteConfig }: HelpHubProps) {
  const tabs = [
    { href: '/help/faq', label: 'FAQ', description: 'Answers to the usual questions' },
    { href: '/help/music-guide', label: 'Music Guide', description: 'Finding, making and uploading MIDI music' },
    { href: '/help/guidelines', label: 'Guidelines', description: 'The house rules' },
    { href: '/help/privacy', label: 'Privacy', description: 'What gets stored and who sees it' },
    { href: '/help/terms', label: 'Terms', description: 'Terms of service' },
    { href: '/help/contact', label: 'Contact', description: 'Bugs, ideas, reports' },
  ];

  return (
    <>
      <Head>
        <title>{`${siteConfig.site_name} — Help`}</title>
        <meta name="description" content="The FAQ covers most things. Still stuck? Write in — a person reads every message." />
        <link rel="canonical" href={`${getSiteBaseUrl()}/help`} />
        <meta name="robots" content="index, follow" />

        <meta property="og:title" content={`${siteConfig.site_name} — Help`} />
        <meta property="og:description" content="The FAQ covers most things. Still stuck? Write in — a person reads every message." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${getSiteBaseUrl()}/help`} />
      </Head>

      <Layout siteConfig={siteConfig}>
        <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-8 sm:py-12">
          <PageHeader title="Help">
            <p>The FAQ covers most things. Still stuck? Write in — a person reads every message.</p>
            <p className="text-base text-nb-ink-mid">House rules, privacy and terms are here too.</p>
          </PageHeader>

          {/* Help Topics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-12">
            {tabs.map(tab => (
              <Link
                key={tab.href}
                href={tab.href}
                className="thread-module ts-card-link block"
              >
                <h2 className="thread-headline text-xl font-bold mb-1 underline decoration-nb-ink-mid/50 underline-offset-2">
                  {tab.label}
                </h2>
                <p className="text-nb-ink-mid text-sm mb-0">
                  {tab.description}
                </p>
              </Link>
            ))}
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Callout variant="framed" title={`New to ${siteConfig.site_name}?`}>
              <p>The FAQ starts with the getting-started questions.</p>
              <p>
                <ButtonLink href="/help/faq">Read FAQ</ButtonLink>
              </p>
            </Callout>

            <Callout variant="framed" title="Need a person?">
              <p>If the FAQ doesn&apos;t cover it, write in. The person who runs the site reads every message.</p>
              <p>
                <ButtonLink href="/help/contact" variant="secondary">Contact Us</ButtonLink>
              </p>
            </Callout>
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
