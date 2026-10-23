/**
 * Search FAQ page: where search results come from and what happens when you search.
 * Every answer here should match the code (lib/search, lib/indie-index, SEARCH_PLAN.md §3.4–3.5).
 */

import { GetServerSideProps } from 'next';
import Layout from '@/components/ui/layout/Layout';
import PageHeader from '@/components/ui/layout/PageHeader';
import Callout from '@/components/ui/feedback/Callout';
import ButtonLink from '@/components/ui/ButtonLink';
import { getSiteConfig, SiteConfig } from '@/lib/config/site/dynamic';
import Link from 'next/link';
import PageMeta from '@/components/ui/layout/PageMeta';

interface FAQProps {
  siteConfig: SiteConfig;
}

export default function SearchFAQ({ siteConfig }: FAQProps) {
  const link = 'text-thread-sunset hover:underline font-medium';
  const faqs = [
    {
      question: 'Why have my own index?',
      answer: 'Big search engines mostly send you to big websites. Personal sites and hobby pages and little blogs are still out there, they\'re just hard to find. I wanted a search that goes looking for those first.'
    },
    {
      question: 'Where do the sites in the Indie Index come from?',
      answer: (
        <>
          From people here. A site gets in when residents point at it: it&apos;s in somebody&apos;s Websites list, it&apos;s linked (or has an 88×31 button) on their home, or somebody vouched for it on the <Link href="/indie" className={link}>Indie Index page</Link>. Your own site only needs you, if you tick &ldquo;This is my site&rdquo; in your Websites list. Anyone else&apos;s needs two of us. There&apos;s also a starting pool from Kagi&apos;s Small Web list so search isn&apos;t empty while the index grows, and those rank below the sites you picked.
        </>
      )
    },
    {
      question: 'Does it look at social media?',
      answer: 'No. Links to big platforms (Instagram, YouTube, Discord and so on) and to profiles like mastodon.social/@you don\'t count as sites, even if they\'re in your Websites list. Sites on Neocities, tilde servers, Bear Blog or your own domain count like any other.'
    },
    {
      question: 'What does the bot do?',
      answer: (
        <>
          Once a night it reads the feeds of the sites in the index, so search can find their recent posts, and about once a week it looks at each front page. It goes slowly, follows robots.txt and calls itself ThreadsteadBot. The <Link href="/indie/about" className={link}>about page</Link> has the details, and how to keep a site out.
        </>
      )
    },
    {
      question: 'How are results ordered?',
      answer: `Results from ${siteConfig.site_name} itself are ordered by how well they match what you typed, and an exact username match goes first. In the Indie Index it's how well the site or one of its recent posts matches, then residents' own sites, then ones you vouched for, then the rest, with the Kagi pool last. Sites that posted lately and sites more of you link to get a little nudge. Nobody can pay to be higher.`
    },
    {
      question: 'Which other search engines do you use?',
      answer: 'None behind the scenes any more. Under every search there are links that open the same search on Marginalia, Wiby, Search My Site or DuckDuckGo in a new tab, straight from your browser.'
    },
    {
      question: 'What do you keep about my searches?',
      answer: 'Nothing. Searches here aren\'t saved, and clicking a result doesn\'t record anything. The links to other engines go from your browser to them without passing through this server.'
    }
  ];

  return (
    <Layout siteConfig={siteConfig}>
      <PageMeta title="How search works" description="Where search results here come from: people, posts and pages, and the Indie Index of personal sites." path="/discover/faq" />
      <div className="w-full max-w-4xl mx-auto px-4 py-8">
        <PageHeader title="How search works" back={{ href: '/search', label: 'Back to search' }}>
          <p>
            Search here looks in two places at once: people, posts and pages on {siteConfig.site_name}, and the Indie
            Index, which is personal websites that people here link to and vouch for. Past that it gives you links to a
            few other small search engines. This page explains where the results come from.
          </p>
        </PageHeader>

        <div className="thread-module space-y-6">
          {faqs.map((faq, i) => (
            <div key={i} className="border-l-4 border-nb-rose pl-4">
              <h2 className="text-lg font-semibold text-nb-ink mb-2">{faq.question}</h2>
              <p className="text-nb-ink mb-0">{faq.answer}</p>
            </div>
          ))}
        </div>

        <Callout variant="framed" title="Help build the index" className="mt-8">
          <p>Know a personal site worth finding? Add it, or vouch for one that&apos;s waiting for a second person.</p>
          <p className="flex flex-wrap gap-3">
            <ButtonLink href="/search" variant="secondary">Start searching</ButtonLink>
            <ButtonLink href="/indie#add">Add a site</ButtonLink>
          </p>
        </Callout>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  const siteConfig = await getSiteConfig();

  return {
    props: {
      siteConfig
    }
  };
};
