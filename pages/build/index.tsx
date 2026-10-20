import { getSiteBaseUrl } from '@/lib/config/site-url';
import { GetServerSideProps, NextApiRequest } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '@/components/ui/layout/Layout';
import ButtonLink from '@/components/ui/ButtonLink';
import PageHeader from '@/components/ui/layout/PageHeader';
import RetroCard from '@/components/ui/layout/RetroCard';
import { getSiteConfig, SiteConfig } from '@/lib/config/site/dynamic';

interface BuildHubProps {
  siteConfig: SiteConfig;
  username: string | null;
}

export default function BuildHub({ siteConfig, username }: BuildHubProps) {
  const description = "Two ways to change how your page looks: CSS on the normal page, or a page you write yourself.";
  return (
    <>
      <Head>
        <title>{`Build your page | ${siteConfig.site_name}`}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={`${getSiteBaseUrl()}/build`} />
        <meta name="robots" content="index, follow" />

        <meta property="og:title" content={`Build your page | ${siteConfig.site_name}`} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${getSiteBaseUrl()}/build`} />
      </Head>

      <Layout siteConfig={siteConfig}>
        <div className="space-y-6 max-w-4xl mx-auto">
          <PageHeader title="Build your page">
            <p>
              There are two ways to change how your page looks. CSS restyles the normal page, and you can write the
              whole page&apos;s HTML yourself. I&apos;d start with CSS, or a theme, and only write your own page when you
              want a completely different layout.
            </p>
          </PageHeader>

          <div className="grid gap-6 md:grid-cols-2">
            <RetroCard title="Change how it looks with CSS">
              <p className="mt-0 text-nb-ink">
                Your page keeps its normal layout and you change the colours, fonts and spacing. Start from a theme if
                you like.
              </p>
              <div className="flex flex-wrap gap-3">
                <ButtonLink href={username ? `/resident/${username}/css-editor` : '/settings?tab=appearance'}>
                  Open the CSS editor
                </ButtonLink>
                <ButtonLink href="/build/css" variant="secondary">CSS guide</ButtonLink>
              </div>
            </RetroCard>

            <RetroCard title="Write your own HTML page">
              <p className="mt-0 text-nb-ink">
                The whole page is HTML you write, the way it was on Neocities, plus tags for your guestbook, friends and
                the rest. The lessons start from nothing.
              </p>
              <div className="flex flex-wrap gap-3">
                <ButtonLink href={username ? `/resident/${username}/template-editor` : '/settings?tab=appearance'}>
                  Open the HTML editor
                </ButtonLink>
                <ButtonLink href="/build/html" variant="secondary">Lessons</ButtonLink>
              </div>
            </RetroCard>
          </div>

          <RetroCard title="Also here">
            <ul className="pl-5 m-0 space-y-1 text-nb-ink">
              <li><Link href="/build/showcase" className="underline text-thread-pine">Showcase</Link>: pages people share the source of, to look through or start from</li>
              <li><Link href="/build/what-works-here" className="underline text-thread-pine">What works here</Link>: what your own HTML page can do, and the few things it can&apos;t</li>
              <li><Link href="/build/templates/components" className="underline text-thread-pine">Components</Link>: every tag that&apos;s a piece of the site</li>
              <li><Link href="/build/getting-started" className="underline text-thread-pine">Getting started</Link>: a tour of rings, your page, your house and posting, no code needed</li>
            </ul>
          </RetroCard>
        </div>
      </Layout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<BuildHubProps> = async ({ req }) => {
  const siteConfig = await getSiteConfig();

  // Signed in: the buttons open your own editors
  let username: string | null = null;
  try {
    const { getSessionUser } = await import('@/lib/auth/server');
    const user = await getSessionUser(req as NextApiRequest);
    username = user?.primaryHandle?.split('@')[0] ?? null;
  } catch {
    // Signed out or the lookup failed: the buttons go to Settings
  }

  return {
    props: {
      siteConfig,
      username,
    }
  };
};
