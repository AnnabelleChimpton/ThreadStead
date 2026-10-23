import React from 'react';
import { GetServerSideProps, NextApiRequest } from 'next';
import Link from 'next/link';
import Layout from '@/components/ui/layout/Layout';
import PageHeader from '@/components/ui/layout/PageHeader';
import RetroCard from '@/components/ui/layout/RetroCard';
import ButtonLink from '@/components/ui/ButtonLink';
import CodeBox from '@/components/features/lessons/CodeBox';
import ThemeSwatch from '@/components/features/profile/ThemeSwatch';
import { getSiteConfig, SiteConfig } from '@/lib/config/site/dynamic';
import { THEMES } from '@/lib/templates/appearance';
import { CSS_CLASSES } from '@/lib/templates-docs/css-classes';
import PageMeta from '@/components/ui/layout/PageMeta';

interface CssGuideProps {
  siteConfig: SiteConfig;
  username: string | null;
}

const TRY = [
  {
    label: 'The page behind everything',
    code: `.thread-surface {
  background: #fdf3d9;
}`,
  },
  {
    label: 'Your name',
    code: `.ts-profile-display-name {
  font-family: Georgia, serif;
  color: #b2432f;
}`,
  },
  {
    label: 'Each post',
    code: `.blog-post-card {
  border: 2px dashed #3a2f26;
  border-radius: 0;
}`,
  },
];

export default function CssGuide({ siteConfig, username }: CssGuideProps) {
  return (
    <Layout siteConfig={siteConfig}>
      <PageMeta title="CSS guide" description="The class names on the normal page, how your CSS fits with the site's, and the themes to start from." path="/build/css" />
      <div className="space-y-6 max-w-4xl mx-auto">
        <PageHeader
          title="CSS guide"
          back={{ href: '/build', label: 'Build your page' }}
          actions={
            <ButtonLink href={username ? `/resident/${username}/css-editor` : '/settings?tab=appearance'}>
              Open the CSS editor
            </ButtonLink>
          }
        >
          <p>
            CSS changes how your page looks without changing what&apos;s on it. These are the class names on the normal
            page, grouped by which part they are. Find the bit you want to change, copy its name into the CSS editor and
            start playing.
          </p>
        </PageHeader>

        <RetroCard title="Start from a theme">
          <p className="mt-0 text-nb-ink">
            Pick one in Settings, under Your page, or load one in the CSS editor with Choose theme. It&apos;s your CSS from
            then on, so change anything you like.
          </p>
          <ul className="grid grid-cols-2 md:grid-cols-3 gap-3 list-none p-0 m-0">
            {THEMES.map((theme) => (
              <li key={theme.id}>
                <ThemeSwatch vars={theme.vars} name={theme.name} line={theme.description} />
              </li>
            ))}
          </ul>
        </RetroCard>

        <RetroCard title="How your CSS and the site's fit together">
          <div className="text-nb-ink space-y-3">
            <p className="mt-0">
              With site styles on, the site&apos;s own look sits underneath and yours goes on top. With them off, only yours
              counts. You switch them in the CSS editor.
            </p>
            <p>
              Your CSS comes after the site&apos;s, so a plain rule like <code>.ts-profile-header {'{'} background: pink; {'}'}</code>{' '}
              already wins. You don&apos;t need !important. If something won&apos;t change, tell me which class it is,
              because that&apos;s a bug.
            </p>
            <p className="mb-0">
              With a theme on, Settings also has a few pickers for its colours and fonts, if you&apos;d rather not touch
              the CSS at all.
            </p>
          </div>
        </RetroCard>

        <RetroCard title="A few to try">
          {TRY.map((t) => (
            <CodeBox key={t.label} code={t.code} label={t.label} />
          ))}
        </RetroCard>

        <RetroCard title="Every class name">
          <div className="space-y-6">
            {Object.entries(CSS_CLASSES).map(([group, classes]) => (
              <section key={group}>
                <h3 className="text-lg font-semibold text-thread-pine mt-0 mb-2">{group}</h3>
                <dl className="m-0 grid sm:grid-cols-[minmax(12rem,auto)_1fr] gap-x-4 gap-y-1 text-sm">
                  {classes.map((c) => (
                    <React.Fragment key={c.name}>
                      <dt className="font-mono text-nb-ink">{c.name}</dt>
                      <dd className="m-0 text-nb-ink">{c.description}</dd>
                    </React.Fragment>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        </RetroCard>

        <p className="text-nb-ink">
          Writing your whole page instead? The <Link href="/build/html" className="underline text-thread-pine">lessons</Link>{' '}
          start from nothing.
        </p>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<CssGuideProps> = async ({ req }) => {
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
