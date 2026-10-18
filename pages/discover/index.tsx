import { getSiteBaseUrl } from '@/lib/config/site-url';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '@/components/ui/layout/Layout';
import { getSiteConfig, SiteConfig } from '@/lib/config/site/dynamic';
import PageHeader from '@/components/ui/layout/PageHeader';
import Callout from '@/components/ui/feedback/Callout';
import ButtonLink from '@/components/ui/ButtonLink';

interface DiscoverHubProps {
  siteConfig: SiteConfig;
}

export default function DiscoverHub({ siteConfig }: DiscoverHubProps) {
  return (
    <>
      <Head>
        <title>{`${siteConfig.site_name} — Discover`}</title>
        <meta name="description" content="Walk the streets of pixel houses, look people up, read the feed, or let the dice pick a house." />
        <link rel="canonical" href={`${getSiteBaseUrl()}/discover`} />
        <meta name="robots" content="index, follow" />

        <meta property="og:title" content={`${siteConfig.site_name} — Discover`} />
        <meta property="og:description" content="Walk the streets of pixel houses, look people up, read the feed, or let the dice pick a house." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${getSiteBaseUrl()}/discover`} />
      </Head>

      <Layout siteConfig={siteConfig}>
        <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-8 sm:py-12">
          <PageHeader title="Around the neighborhood">
            <p>Walk the streets, look people up, read the feed, or let the dice pick a house.</p>
            <p className="text-base text-nb-ink-mid">Everyone who lives here gets a house. Click one to visit.</p>
          </PageHeader>

          {/* Neighborhoods */}
          <section className="thread-module mb-10">
            <div className="sm:p-2">
              <h2 className="thread-headline text-2xl sm:text-3xl font-bold mb-1">Pixel Home Neighborhoods</h2>
              <p className="text-nb-ink-mid mb-5">The same houses three ways: a street, a grid, or a map.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {[
                  { href: '/neighborhood/explore/all', title: 'Street View', blurb: 'Walk past each house' },
                  { href: '/neighborhood/explore/all', title: 'Grid View', blurb: 'Every house at once' },
                  { href: '/neighborhood/explore/all', title: 'Map View', blurb: "Bird's eye" },
                  { href: '/neighborhood/explore/random', title: 'Random', blurb: 'Any house, at random' },
                ].map(option => (
                  <Link
                    key={option.title}
                    href={option.href}
                    className="ts-card-link block border-2 border-dotted border-nb-ink-mid/60 rounded-md p-4 hover:border-solid hover:border-nb-ink-mid"
                  >
                    <div className="font-bold text-nb-ink underline decoration-nb-ink-mid/50 underline-offset-2">{option.title}</div>
                    <div className="text-sm text-nb-ink-mid">{option.blurb}</div>
                  </Link>
                ))}
              </div>

              <ButtonLink href="/neighborhood/explore/all" size="lg">Walk the neighborhood</ButtonLink>
            </div>
          </section>

          {/* Other ways in */}
          <section className="mb-10">
            <h2 className="thread-headline text-2xl font-bold mb-4">Other ways in</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { href: '/discover/residents', title: 'Meet Residents', blurb: 'Everyone who lives here. Search by name, handle, or bio.', cta: 'Browse Profiles →' },
                { href: '/discover/feed', title: 'Community Feed', blurb: 'Recent posts and active threads from everyone here.', cta: 'View Feed →' },
                { href: '/discover/search', title: 'Search', blurb: 'Search posts, people and rings here, or the indie web index.', cta: 'Start Searching →' },
              ].map(card => (
                <Link key={card.href} href={card.href} className="thread-module ts-card-link block">
                  <h3 className="thread-headline text-xl font-bold mb-1">{card.title}</h3>
                  <p className="text-nb-ink-mid mb-3">{card.blurb}</p>
                  <span className="font-semibold text-nb-ink underline underline-offset-2">{card.cta}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* Serendipity */}
          <Callout variant="framed" title="Can't decide?">
            <p>Roll the dice. You never know whose porch you&apos;ll end up on.</p>
            <p><ButtonLink href="/neighborhood/explore/random" variant="secondary">Visit a random house</ButtonLink></p>
          </Callout>
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
