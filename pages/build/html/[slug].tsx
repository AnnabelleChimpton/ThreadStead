import React, { useState } from 'react';
import { GetServerSideProps, NextApiRequest } from 'next';
import Head from 'next/head';
import Layout from '@/components/ui/layout/Layout';
import PageHeader from '@/components/ui/layout/PageHeader';
import ButtonLink from '@/components/ui/ButtonLink';
import CodeBox from '@/components/features/lessons/CodeBox';
import LessonExample, { type CompiledExample } from '@/components/features/lessons/LessonExample';
import { getSiteConfig, SiteConfig } from '@/lib/config/site/dynamic';
import { getLesson, nextLesson, type Lesson } from '@/lib/templates-docs/lessons';
import { autoLinkComponents } from '@/lib/templates-docs/tutorialLinkProcessor';
import { markdownToSafeHtml } from '@/lib/utils/sanitization/html';

interface LessonPageProps {
  siteConfig: SiteConfig;
  lesson: Lesson;
  /** Each step's code compiled for its live example; null when it doesn't run live */
  examples: Array<CompiledExample | null>;
  next: { slug: string; title: string } | null;
  username: string | null;
}

const prose = (markdown: string) => ({ __html: markdownToSafeHtml(autoLinkComponents(markdown)) });

export default function LessonPage({ siteConfig, lesson, examples, next, username }: LessonPageProps) {
  // One live example at a time (they share page variables)
  const [openStep, setOpenStep] = useState<string | null>(null);

  return (
    <Layout siteConfig={siteConfig}>
      <Head>
        <title>{`${lesson.title} | ${siteConfig.site_name}`}</title>
        <meta name="description" content={lesson.lede} />
      </Head>
      <div className="space-y-6 max-w-3xl mx-auto">
        <PageHeader title={lesson.title} back={{ href: '/build/html', label: 'All lessons' }}>
          <p>{lesson.lede}</p>
        </PageHeader>

        {lesson.steps.map((step, i) => (
          <section key={step.id} className="thread-module p-4 sm:p-6" aria-labelledby={`step-${step.id}`}>
            <h2 id={`step-${step.id}`} className="text-xl font-bold text-thread-pine mt-0">
              {i + 1}. {step.title}
            </h2>
            <div className="thread-content text-nb-ink" dangerouslySetInnerHTML={prose(step.body)} />

            <CodeBox code={step.code} label={step.css ? 'HTML' : 'The code'} />
            {step.css && <CodeBox code={step.css} label="CSS (in the CSS tab)" />}

            {examples[i] ? (
              <LessonExample
                example={examples[i]!}
                stepId={step.id}
                open={openStep === step.id}
                onToggle={() => setOpenStep(openStep === step.id ? null : step.id)}
              />
            ) : (
              <p className="mt-3 mb-0 text-sm text-nb-ink-mid">
                This one shows your own {step.css ? 'colours' : 'things'}, so try it in your editor to see it.
              </p>
            )}

            {step.tips && step.tips.length > 0 && (
              <ul className="mt-4 mb-0 pl-5 text-sm text-nb-ink space-y-1">
                {step.tips.map((tip, t) => (
                  <li key={t} dangerouslySetInnerHTML={{ __html: markdownToSafeHtml(autoLinkComponents(tip)).replace(/^<p>|<\/p>\s*$/g, '') }} />
                ))}
              </ul>
            )}

            {username && (
              <p className="mt-4 mb-0 text-sm">
                <a href={`/resident/${username}/template-editor?learn=${lesson.slug}&step=${i + 1}`} className="underline text-thread-pine">
                  Try this in my editor
                </a>
              </p>
            )}
          </section>
        ))}

        <section className="thread-module p-4 sm:p-6">
          <p className="mt-0 text-nb-ink">{lesson.wrapUp}</p>
          <div className="flex flex-wrap gap-3">
            {next ? (
              <ButtonLink href={`/build/html/${next.slug}`}>Next: {next.title}</ButtonLink>
            ) : (
              <ButtonLink href="/build/html">All lessons</ButtonLink>
            )}
            <ButtonLink href="/build/templates/components" variant="secondary">Components</ButtonLink>
          </div>
        </section>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<LessonPageProps> = async ({ params, req }) => {
  const lesson = getLesson(String(params?.slug ?? ''));
  if (!lesson) return { notFound: true };
  const siteConfig = await getSiteConfig();

  // Each example compiled the way a page is, for a visitor
  const { compileTemplateToArtifacts } = await import('@/lib/templates/compilation/compile-pipeline');
  const { pageForRender } = await import('@/lib/templates/rendering/page-tree-server');
  const examples = lesson.steps.map((step) => {
    if (step.live === false) return null;
    const artifacts = compileTemplateToArtifacts(step.code);
    const page = pageForRender({ staticHTML: artifacts.staticHTML, islands: artifacts.islands, ast: artifacts.ast });
    return page ? (JSON.parse(JSON.stringify({ tree: page.tree, islands: page.islands })) as CompiledExample) : null;
  });

  let username: string | null = null;
  try {
    const { getSessionUser } = await import('@/lib/auth/server');
    const user = await getSessionUser(req as NextApiRequest);
    username = user?.primaryHandle?.split('@')[0] ?? null;
  } catch {
    // Signed out: no "Try this in my editor" links
  }

  const after = nextLesson(lesson.slug);
  return {
    props: {
      siteConfig,
      lesson,
      examples,
      next: after ? { slug: after.slug, title: after.title } : null,
      username,
    },
  };
};
