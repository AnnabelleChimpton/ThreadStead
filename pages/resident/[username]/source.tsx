import React, { useState } from 'react';
import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '@/components/ui/layout/Layout';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { db } from '@/lib/config/database/connection';
import { SITE_NAME } from '@/lib/config/site/constants';

interface SourcePageProps {
  username: string;
  sharing: boolean;
  isOwner: boolean;
  templateMode: string;
  cssMode: string;
  customTemplate: string;
  customCSS: string;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="px-3 py-1.5 text-xs font-medium bg-thread-pine text-white rounded hover:opacity-90 transition-opacity flex items-center gap-1"
    >
      <PixelIcon name={copied ? 'check' : 'copy'} size={12} />
      {copied ? 'Copied' : label}
    </button>
  );
}

// The old-web learning loop: see a page you love, view its source, remix it.
export default function ViewSourcePage({
  username,
  sharing,
  isOwner,
  templateMode,
  cssMode,
  customTemplate,
  customCSS,
}: SourcePageProps) {
  if (!sharing && !isOwner) {
    return (
      <Layout>
        <Head><title>{`Source | ThreadStead`}</title></Head>
        <div className="max-w-lg mx-auto mt-16 p-8 bg-thread-paper border-2 border-thread-sage rounded-lg text-center">
          <div className="flex justify-center mb-3"><PixelIcon name="lock" size={32} /></div>
          <h1 className="text-xl font-semibold text-thread-charcoal mb-2">
            This source isn&apos;t shared
          </h1>
          <p className="text-sm text-thread-sage mb-4">
            @{username} hasn&apos;t turned on view source for their page.
          </p>
          <Link href={`/resident/${username}`} className="text-blue-600 hover:underline text-sm">
            Back to their page
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>{`@${username}'s page source | ThreadStead`}</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-thread-charcoal flex items-center gap-2">
            <PixelIcon name="code" size={24} /> @{username}&apos;s page source
          </h1>
          <p className="text-sm text-thread-sage mt-1">
            {isOwner && !sharing
              ? 'Only you can see this right now — turn on sharing in the editor to let others learn from it.'
              : 'Shared by the resident. Copy anything you like into your own editor and make it yours.'}
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs text-thread-sage">
            <span className="px-2 py-0.5 bg-thread-cream border border-thread-sage/30 rounded">mode: {templateMode}</span>
            <span className="px-2 py-0.5 bg-thread-cream border border-thread-sage/30 rounded">css: {cssMode}</span>
            <Link href={`/resident/${username}`} className="text-blue-600 hover:underline">
              View the live page →
            </Link>
          </div>
        </div>

        {customTemplate.trim() !== '' && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-thread-charcoal">Template</h2>
              <CopyButton text={customTemplate} label="Copy template" />
            </div>
            <pre className="bg-thread-paper border-2 border-thread-sage/40 rounded-lg p-4 overflow-x-auto text-xs font-mono leading-relaxed whitespace-pre-wrap break-words">
              {customTemplate}
            </pre>
          </section>
        )}

        {customCSS.trim() !== '' && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-thread-charcoal">CSS</h2>
              <CopyButton text={customCSS} label="Copy CSS" />
            </div>
            <pre className="bg-thread-paper border-2 border-thread-sage/40 rounded-lg p-4 overflow-x-auto text-xs font-mono leading-relaxed whitespace-pre-wrap break-words">
              {customCSS}
            </pre>
          </section>
        )}

        {customTemplate.trim() === '' && customCSS.trim() === '' && (
          <p className="text-sm text-thread-sage">
            Nothing custom here yet — this page uses the site&apos;s default look.
          </p>
        )}
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<SourcePageProps> = async ({ params, req }) => {
  const username = Array.isArray(params?.username) ? params.username[0] : String(params?.username || '');
  if (!username) return { notFound: true };

  const handle = await db.handle.findFirst({
    where: { handle: username, host: SITE_NAME },
    include: { user: { include: { profile: true } } }
  });
  if (!handle || !handle.user.profile) return { notFound: true };
  const profile = handle.user.profile;

  const { getSessionUser } = await import('@/lib/auth/server');
  const currentUser = await getSessionUser(req as Parameters<typeof getSessionUser>[0]);
  const isOwner = currentUser?.id === handle.user.id;

  const canSee = profile.showTemplateSource || isOwner;

  return {
    props: {
      username,
      sharing: profile.showTemplateSource,
      isOwner,
      templateMode: profile.templateMode,
      cssMode: profile.cssMode,
      customTemplate: canSee ? (profile.customTemplate || '') : '',
      customCSS: canSee ? (profile.customCSS || '') : '',
    },
  };
};
