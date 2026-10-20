import React from 'react';
import { GetServerSideProps, NextApiRequest } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '@/components/ui/layout/Layout';
import PageHeader from '@/components/ui/layout/PageHeader';
import RetroCard from '@/components/ui/layout/RetroCard';
import ButtonLink from '@/components/ui/ButtonLink';
import { getSiteConfig, SiteConfig } from '@/lib/config/site/dynamic';
import { lessons, type Lesson } from '@/lib/templates-docs/lessons';

interface HtmlLessonsProps {
  siteConfig: SiteConfig;
  username: string | null;
}

function Shelf({ items, start = 1 }: { items: Lesson[]; start?: number }) {
  return (
    <ol className="list-none p-0 m-0 space-y-3" start={start}>
      {items.map((lesson, i) => (
        <li key={lesson.slug} className="flex gap-3">
          <span className="font-mono text-sm text-nb-ink-mid pt-0.5 w-6 shrink-0">{start + i}.</span>
          <span>
            <Link href={`/build/html/${lesson.slug}`} className="font-semibold text-thread-pine underline">
              {lesson.title}
            </Link>
            <span className="block text-sm text-nb-ink">{lesson.lede}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export default function HtmlLessons({ siteConfig, username }: HtmlLessonsProps) {
  const start = lessons.filter((l) => l.shelf === 'start');
  const further = lessons.filter((l) => l.shelf === 'further');
  return (
    <Layout siteConfig={siteConfig}>
      <Head>
        <title>{`Your own HTML page | ${siteConfig.site_name}`}</title>
        <meta name="description" content="Lessons for writing your own page here, from your first few words to buttons that remember things." />
      </Head>
      <div className="space-y-6 max-w-3xl mx-auto">
        <PageHeader
          title="Your own HTML page"
          back={{ href: '/build', label: 'Build your page' }}
          actions={
            <ButtonLink href={username ? `/resident/${username}/template-editor` : '/settings?tab=appearance'}>
              Open my editor
            </ButtonLink>
          }
        >
          <p>
            Your page can be HTML you write yourself, the same as on Neocities, plus a few tags that are pieces of the
            site, like your guestbook. These lessons start from nothing and each one makes something for your page.
          </p>
        </PageHeader>

        <RetroCard title="Start here">
          <Shelf items={start} />
        </RetroCard>

        <RetroCard title="Going further">
          <Shelf items={further} start={start.length + 1} />
        </RetroCard>

        <RetroCard title="Good to have open">
          <ul className="pl-5 m-0 space-y-1 text-nb-ink">
            <li><Link href="/build/what-works-here" className="underline text-thread-pine">What works here</Link>: what HTML and CSS can do on a page here, and what can&apos;t</li>
            <li><Link href="/build/templates/components" className="underline text-thread-pine">Components</Link>: every tag that&apos;s a piece of the site, with a snippet to copy</li>
            <li><Link href="/build/showcase" className="underline text-thread-pine">Showcase</Link>: other people&apos;s pages you can read the source of and start from</li>
          </ul>
        </RetroCard>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<HtmlLessonsProps> = async ({ req }) => {
  const siteConfig = await getSiteConfig();
  let username: string | null = null;
  try {
    const { getSessionUser } = await import('@/lib/auth/server');
    const user = await getSessionUser(req as NextApiRequest);
    username = user?.primaryHandle?.split('@')[0] ?? null;
  } catch {
    // Signed out: the button goes to Settings
  }
  return { props: { siteConfig, username } };
};
