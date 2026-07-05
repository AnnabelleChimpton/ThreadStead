import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '@/components/ui/layout/Layout';
import RetroCard from '@/components/ui/layout/RetroCard';
import { PixelIcon } from '@/components/ui/PixelIcon';

export default function CommunityGuidelines() {
  return (
    <>
      <Head>
        <title>Community Guidelines - Threadstead</title>
        <meta name="description" content="The house rules that keep Threadstead creative, welcoming, and safe for everyone." />
      </Head>

      <Layout>
        <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">

          {/* Header */}
          <RetroCard title="Community Guidelines">
            <div className="text-center py-4 space-y-4">
              <div className="flex justify-center"><PixelIcon name="users" size={40} /></div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Welcome to the Neighborhood
              </h1>
              <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
                Threadstead is a place to make things, be yourself, and get to know your neighbors.
                These guidelines keep it that way for everyone.
              </p>
            </div>
          </RetroCard>

          {/* Core Values */}
          <RetroCard title="Our Core Values">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4">
              <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="mb-2 flex justify-center"><PixelIcon name="paint-bucket" size={28} /></div>
                <h3 className="font-bold text-base mb-2">Be Creative</h3>
                <p className="text-sm text-gray-600">
                  Build a pixel home that looks like you, share your art, and post whatever you&apos;re making.
                </p>
              </div>

              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="mb-2 flex justify-center"><PixelIcon name="heart" size={28} /></div>
                <h3 className="font-bold text-base mb-2">Be Kind</h3>
                <p className="text-sm text-gray-600">
                  Treat people with care. We&apos;re all here to hang out and make things together.
                </p>
              </div>

              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="mb-2 flex justify-center"><PixelIcon name="mood-happy" size={28} /></div>
                <h3 className="font-bold text-base mb-2">Be Yourself</h3>
                <p className="text-sm text-gray-600">
                  Nobody else sees things quite the way you do. Share what you&apos;re into.
                </p>
              </div>
            </div>
          </RetroCard>

          {/* Do's and Don'ts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-green-50 border-2 border-green-300 rounded-lg shadow-[4px_4px_0_#000] p-6">
              <div className="flex items-center gap-2 mb-4">
                <PixelIcon name="check" size={22} className="text-green-800" />
                <h3 className="text-xl font-bold text-green-800">Do&apos;s</h3>
              </div>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="text-green-600 text-lg font-bold flex-shrink-0 mt-0.5">✓</span>
                  <div>
                    <div className="font-semibold text-green-900 mb-1">Share original content</div>
                    <div className="text-sm text-green-700">Your creations, thoughts, and experiences</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-600 text-lg font-bold flex-shrink-0 mt-0.5">✓</span>
                  <div>
                    <div className="font-semibold text-green-900 mb-1">Support others</div>
                    <div className="text-sm text-green-700">Leave encouraging comments and celebrate achievements</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-600 text-lg font-bold flex-shrink-0 mt-0.5">✓</span>
                  <div>
                    <div className="font-semibold text-green-900 mb-1">Report issues</div>
                    <div className="text-sm text-green-700">Help us maintain a safe space by reporting violations</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-600 text-lg font-bold flex-shrink-0 mt-0.5">✓</span>
                  <div>
                    <div className="font-semibold text-green-900 mb-1">Respect boundaries</div>
                    <div className="text-sm text-green-700">Ask before sharing others&apos; content elsewhere</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-600 text-lg font-bold flex-shrink-0 mt-0.5">✓</span>
                  <div>
                    <div className="font-semibold text-green-900 mb-1">Have fun</div>
                    <div className="text-sm text-green-700">Explore, experiment, and enjoy yourself</div>
                  </div>
                </li>
              </ul>
            </div>

            <div className="bg-red-50 border-2 border-red-300 rounded-lg shadow-[4px_4px_0_#000] p-6">
              <div className="flex items-center gap-2 mb-4">
                <PixelIcon name="close" size={22} className="text-red-800" />
                <h3 className="text-xl font-bold text-red-800">Don&apos;ts</h3>
              </div>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="text-red-600 text-lg font-bold flex-shrink-0 mt-0.5">✗</span>
                  <div>
                    <div className="font-semibold text-red-900 mb-1">No harassment</div>
                    <div className="text-sm text-red-700">Bullying, threats, or targeted attacks</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-600 text-lg font-bold flex-shrink-0 mt-0.5">✗</span>
                  <div>
                    <div className="font-semibold text-red-900 mb-1">No hate speech</div>
                    <div className="text-sm text-red-700">Discrimination based on identity or beliefs</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-600 text-lg font-bold flex-shrink-0 mt-0.5">✗</span>
                  <div>
                    <div className="font-semibold text-red-900 mb-1">No spam</div>
                    <div className="text-sm text-red-700">Excessive self-promotion or repetitive content</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-600 text-lg font-bold flex-shrink-0 mt-0.5">✗</span>
                  <div>
                    <div className="font-semibold text-red-900 mb-1">No inappropriate content</div>
                    <div className="text-sm text-red-700">Keep it friendly for all ages</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-600 text-lg font-bold flex-shrink-0 mt-0.5">✗</span>
                  <div>
                    <div className="font-semibold text-red-900 mb-1">No impersonation</div>
                    <div className="text-sm text-red-700">Be yourself, not someone else</div>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* ThreadRing Specific Rules */}
          <RetroCard title="ThreadRing Guidelines">
            <div className="space-y-4">
              <p className="text-sm sm:text-base text-gray-700">
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
              <p className="text-sm sm:text-base text-gray-700">
                We want everyone to have a good time here. Breaking these guidelines may result in:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="font-medium text-yellow-800 mb-1"><PixelIcon name="warning-box" size={14} className="inline-block align-middle" /> Warning</div>
                  <p className="text-xs text-gray-600">First-time or minor violations</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="font-medium text-orange-800 mb-1"><PixelIcon name="pause" size={14} className="inline-block align-middle" /> Suspension</div>
                  <p className="text-xs text-gray-600">Repeated or serious violations</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="font-medium text-red-800 mb-1"><PixelIcon name="close" size={14} className="inline-block align-middle" /> Ban</div>
                  <p className="text-xs text-gray-600">Severe or repeated offenses</p>
                </div>
              </div>

              <p className="text-sm text-gray-600">
                Decisions are made case by case, with the aim of keeping this a good place to be.
              </p>
            </div>
          </RetroCard>

          {/* Contact & Resources */}
          <RetroCard title="Need Help?">
            <div className="text-center space-y-4 py-4">
              <p className="text-sm sm:text-base text-gray-700">
                Questions about the guidelines, or something to report? Get in touch.
              </p>

              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  href="/getting-started"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-200 hover:bg-blue-100 border border-black shadow-[2px_2px_0_#000] font-medium text-sm transition-colors"
                >
                  <PixelIcon name="article" size={16} />
                  <span>Getting Started Guide</span>
                </Link>

                <a
                  href="mailto:support@threadstead.com"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-200 hover:bg-green-100 border border-black shadow-[2px_2px_0_#000] font-medium text-sm transition-colors"
                >
                  <PixelIcon name="mail" size={16} />
                  <span>Contact Support</span>
                </a>
              </div>

              <p className="text-xs text-gray-500 italic">
                These guidelines may be updated periodically. Last updated: {new Date().toLocaleDateString()}
              </p>
            </div>
          </RetroCard>

          {/* Back to Top */}
          <div className="text-center py-4">
            <Link
              href="/"
              className="text-sm text-thread-pine hover:text-thread-sunset underline"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </Layout>
    </>
  );
}