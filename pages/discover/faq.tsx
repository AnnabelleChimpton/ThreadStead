/**
 * Search FAQ page: where search results come from and what happens when you search.
 * Every answer here should match the code (lib/search, lib/extsearch, lib/crawler, community-index).
 */

import { GetServerSideProps } from 'next';
import Layout from '@/components/ui/layout/Layout';
import PageHeader from '@/components/ui/layout/PageHeader';
import Callout from '@/components/ui/feedback/Callout';
import ButtonLink from '@/components/ui/ButtonLink';
import { getSiteConfig, SiteConfig } from '@/lib/config/site/dynamic';
import Link from 'next/link';

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
          Mostly from people here. If you have an account you can <Link href="/community-index/submit" className={link}>submit a site</Link>, and it gets a quick automatic check when you do. A crawler also follows links out of sites that are already in the index to find new ones. And when you click a web result in search, that site can get added to the index too.
        </>
      )
    },
    {
      question: 'Who decides what gets in?',
      answer: (
        <>
          Sites that pass the automatic quality check go straight in, and ones that score too low don&apos;t. The rest wait in <Link href="/community-index/validate" className={link}>Community Validation</Link>, where anyone signed in can vote Approve, Reject or Needs Work. A site needs at least three votes and 60% approval to get in.
        </>
      )
    },
    {
      question: 'What does the crawler do?',
      answer: (
        <>
          It identifies itself as <code>ThreadsteadBot/1.0 (+https://threadstead.com/crawler)</code>. It follows robots.txt, only fetches a few sites at a time, and gives up on a page after 15 seconds. To keep it off your site, add a <code>User-agent: ThreadsteadBot</code> block with Disallow rules to your robots.txt. If you&apos;re curious how big the index is, the <Link href="/community-index/analytics" className={link}>analytics page</Link> has the real numbers.
        </>
      )
    },
    {
      question: 'Does it look at social media?',
      answer: 'A little. Some social profile pages are on the crawler\'s starting list, so it can follow the links people put on them to their own sites. Sites on Neocities, tilde servers, Bear Blog, omg.lol or GitHub Pages, and sites on their own domain, get a small boost in the quality score.'
    },
    {
      question: 'How are results ordered?',
      answer: `Results from ${siteConfig.site_name} itself are ordered by how well they match what you typed, and an exact username match goes first. Indie Index and web results come in the order their source gives them. Nobody can pay to be higher.`
    },
    {
      question: 'Which other search engines do you use?',
      answer: 'Web results come from SearchMySite, which only indexes personal and independent sites, and from Brave Search.'
    },
    {
      question: 'What do you keep about my searches?',
      answer: 'Searches on the site itself aren\'t saved. Web searches get sent to those other engines, and the results are kept in memory for half an hour so the same search doesn\'t ask them twice. When you click a web result that isn\'t in the index yet, the site gets added to the review queue.'
    }
  ];

  return (
    <Layout siteConfig={siteConfig}>
      <div className="w-full max-w-4xl mx-auto px-4 py-8">
        <PageHeader title="How search works" back={{ href: '/search', label: 'Back to search' }}>
          <p>
            Search here looks in a few places at once: people, posts and pages on {siteConfig.site_name}, an index of
            personal websites that people here have found and checked, and some other small search engines. This page
            explains where the results come from and what happens when you use it.
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
          <p>Know a personal site worth finding? Submit it! You can also help review the queue in Community Validation.</p>
          <p className="flex flex-wrap gap-3">
            <ButtonLink href="/search" variant="secondary">Start searching</ButtonLink>
            <ButtonLink href="/community-index/submit">Submit a site</ButtonLink>
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
