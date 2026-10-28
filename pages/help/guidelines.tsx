import React from 'react';
import Link from 'next/link';
import Layout from '@/components/ui/layout/Layout';
import RetroCard from '@/components/ui/layout/RetroCard';
import ButtonLink, { buttonClasses } from '@/components/ui/ButtonLink';
import PageHeader from '@/components/ui/layout/PageHeader';
import { PixelIcon } from '@/components/ui/PixelIcon';
import PageMeta from '@/components/ui/layout/PageMeta';
import { SITE_TITLE } from '@/lib/config/site/constants';

export default function CommunityGuidelines() {
  return (
    <>
      <PageMeta title="Community guidelines" description={`The house rules that keep ${SITE_TITLE} creative, welcoming and safe for everyone.`} path="/help/guidelines" />

      <Layout>
        <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">

          <PageHeader title="Community Guidelines">
            <p className="font-semibold">Welcome to the Neighborhood</p>
            <p>
              {SITE_TITLE} is a place to make things, be yourself, and get to know your neighbors.
              These guidelines keep it that way for everyone.
            </p>
          </PageHeader>

          {/* Core Values */}
          <RetroCard title="Our Core Values">
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-2">
              <div className="border-l-4 border-nb-rose pl-4">
                <dt className="font-bold text-base mb-1">Be Creative</dt>
                <dd className="text-sm text-nb-ink">Build a pixel home that looks like you, share your art, and post whatever you&apos;re making.</dd>
              </div>
              <div className="border-l-4 border-nb-rose pl-4">
                <dt className="font-bold text-base mb-1">Be Kind</dt>
                <dd className="text-sm text-nb-ink">Treat people with care. We&apos;re all here to hang out and make things together.</dd>
              </div>
              <div className="border-l-4 border-nb-rose pl-4">
                <dt className="font-bold text-base mb-1">Be Yourself</dt>
                <dd className="text-sm text-nb-ink">Nobody else sees things quite the way you do. Share what you&apos;re into.</dd>
              </div>
            </dl>
          </RetroCard>

          {/* Do's and Don'ts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="thread-module">
              <h3 className="thread-headline text-xl font-bold mb-4">Do&apos;s</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <PixelIcon name="check" size={24} className="text-nb-ink-mid flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-nb-ink">Share original content</div>
                    <div className="text-sm text-nb-ink-mid">Your creations, thoughts, and experiences</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <PixelIcon name="check" size={24} className="text-nb-ink-mid flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-nb-ink">Support others</div>
                    <div className="text-sm text-nb-ink-mid">Leave encouraging comments and celebrate achievements</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <PixelIcon name="check" size={24} className="text-nb-ink-mid flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-nb-ink">Report issues</div>
                    <div className="text-sm text-nb-ink-mid">Help us maintain a safe space by reporting violations</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <PixelIcon name="check" size={24} className="text-nb-ink-mid flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-nb-ink">Respect boundaries</div>
                    <div className="text-sm text-nb-ink-mid">Ask before sharing others&apos; content elsewhere</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <PixelIcon name="check" size={24} className="text-nb-ink-mid flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-nb-ink">Have fun</div>
                    <div className="text-sm text-nb-ink-mid">Explore, experiment, and enjoy yourself</div>
                  </div>
                </li>
              </ul>
            </div>

            <div className="thread-module">
              <h3 className="thread-headline text-xl font-bold mb-4">Don&apos;ts</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <PixelIcon name="close" size={24} className="text-nb-ink-mid flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-nb-ink">No harassment</div>
                    <div className="text-sm text-nb-ink-mid">Bullying, threats, or targeted attacks</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <PixelIcon name="close" size={24} className="text-nb-ink-mid flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-nb-ink">No hate speech</div>
                    <div className="text-sm text-nb-ink-mid">Discrimination based on identity or beliefs</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <PixelIcon name="close" size={24} className="text-nb-ink-mid flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-nb-ink">No spam</div>
                    <div className="text-sm text-nb-ink-mid">Excessive self-promotion or repetitive content</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <PixelIcon name="close" size={24} className="text-nb-ink-mid flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-nb-ink">No inappropriate content</div>
                    <div className="text-sm text-nb-ink-mid">Keep it friendly for all ages</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <PixelIcon name="close" size={24} className="text-nb-ink-mid flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-nb-ink">No impersonation</div>
                    <div className="text-sm text-nb-ink-mid">Be yourself, not someone else</div>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* ThreadRing Specific Rules */}
          <RetroCard title="ThreadRing Guidelines">
            <div className="space-y-4">
              <p className="text-sm sm:text-base text-nb-ink">
                Each ThreadRing may have additional rules specific to their community theme. When joining a Ring:
              </p>
              <ul className="space-y-2 text-sm sm:text-base ml-4">
                <li>• <strong>Read the Ring description</strong> to understand its focus</li>
                <li>• <strong>Post relevant content</strong> that fits the Ring&apos;s theme</li>
                <li>• <strong>Respect Ring moderators</strong> and their decisions</li>
                <li>• <strong>Contribute positively</strong> to Ring discussions</li>
              </ul>
            </div>
          </RetroCard>

          {/* Consequences */}
          <RetroCard title="Enforcement">
            <div className="space-y-4">
              <p className="text-sm sm:text-base text-nb-ink">
                We want everyone to have a good time here. Breaking these guidelines may result in:
              </p>

              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="border-2 border-dotted border-nb-ink-mid/60 rounded-md p-3">
                  <dt className="font-semibold text-nb-ink mb-1">Warning</dt>
                  <dd className="text-xs text-nb-ink-mid">First-time or minor violations</dd>
                </div>
                <div className="border-2 border-dotted border-nb-ink-mid/60 rounded-md p-3">
                  <dt className="font-semibold text-nb-ink mb-1">Suspension</dt>
                  <dd className="text-xs text-nb-ink-mid">Repeated or serious violations</dd>
                </div>
                <div className="border-2 border-dotted border-nb-ink-mid/60 rounded-md p-3">
                  <dt className="font-semibold text-nb-ink mb-1">Ban</dt>
                  <dd className="text-xs text-nb-ink-mid">Severe or repeated offenses</dd>
                </div>
              </dl>

              <p className="text-sm text-nb-ink-mid">
                Decisions are made case by case, with the aim of keeping this a good place to be.
              </p>
            </div>
          </RetroCard>

          {/* Contact & Resources */}
          <RetroCard title="Need Help?">
            <div className="text-center space-y-4 py-4">
              <p className="text-sm sm:text-base text-nb-ink">
                Questions about the guidelines, or something to report? Get in touch.
              </p>

              <div className="flex flex-wrap justify-center gap-3">
                <ButtonLink href="/getting-started" size="sm">Getting Started Guide</ButtonLink>

                <a href="mailto:support@homepageagain.com" className={buttonClasses('secondary', 'sm')}>
                  Contact Support
                </a>
              </div>

              <p className="text-xs text-nb-ink-mid italic">
                These guidelines may be updated periodically.
              </p>
            </div>
          </RetroCard>

          {/* Back to Top */}
          <div className="text-center py-4">
            <Link
              href="/"
              className="text-sm"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </Layout>
    </>
  );
}