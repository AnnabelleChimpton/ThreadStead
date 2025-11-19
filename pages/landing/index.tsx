/* eslint-disable react/no-unescaped-entities */
import Layout from "../../components/ui/layout/Layout";
import { getSiteConfig, SiteConfig } from "@/lib/config/site/dynamic";
import { GetServerSideProps } from "next";
import Link from "next/link";
import Head from "next/head";
import { contentMetadataGenerator } from "@/lib/utils/metadata/content-metadata";
import Image from "next/image";
import { PixelIcon } from "@/components/ui/PixelIcon";

interface LandingPageProps {
  siteConfig: SiteConfig;
}

export default function LandingPage({ siteConfig }: LandingPageProps) {
  // Generate metadata for landing page
  const homepageMetadata = contentMetadataGenerator.generateHomepageMetadata(siteConfig);

  return (
    <>
      <Head>
        <title>{homepageMetadata.title}</title>
        <meta name="description" content={homepageMetadata.description} />
        {homepageMetadata.keywords && (
          <meta name="keywords" content={homepageMetadata.keywords.join(', ')} />
        )}
        <meta property="og:title" content={homepageMetadata.title} />
        <meta property="og:description" content={homepageMetadata.description} />
        {homepageMetadata.image && (
          <meta property="og:image" content={homepageMetadata.image} />
        )}
        <meta property="og:type" content={homepageMetadata.type || 'website'} />
        {homepageMetadata.url && (
          <meta property="og:url" content={homepageMetadata.url} />
        )}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={homepageMetadata.title} />
        <meta name="twitter:description" content={homepageMetadata.description} />
        {homepageMetadata.image && (
          <meta name="twitter:image" content={homepageMetadata.image} />
        )}
        <style>{`
          /* Custom styles matching retro aesthetic */
          .thread-module {
            background-color: white;
            border: 2px solid #000000;
            box-shadow: 4px 4px 0 #000000;
          }

          .thread-headline {
            color: #1f2937;
          }

          .retro-button {
            border: 2px solid #000000;
            box-shadow: 2px 2px 0 #000000;
            transition: all 0.15s ease;
            text-decoration: none;
            display: inline-block;
          }

          .retro-button:hover {
            transform: translate(1px, 1px);
            box-shadow: 1px 1px 0 #000000;
            text-decoration: none;
          }

          .feature-card {
            border: 1px solid #d1d5db;
            background-color: #f9fafb;
          }

          .faq-item {
            border-left: 3px solid #f59e0b;
            padding-left: 1rem;
            margin-bottom: 1.25rem;
          }

          body {
            background-color: #fef7ed;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          }
        `}</style>
      </Head>
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Hero Section */}
          <section className="thread-module p-8 mb-8 text-center">
            <div className="text-6xl mb-6 flex justify-center">
              <Image
                src="/image-icon-square.png"
                alt="HomePageAgain Logo"
                width={200}
                height={200}
                style={{ width: '200px', height: 'auto' }}
              />
            </div>
            <h1 className="thread-headline text-4xl font-bold mb-6">
              Welcome Home
            </h1>
            <p className="text-xl text-gray-700 mb-4 leading-relaxed">
              Remember when the internet was <strong>fun</strong>? When you could build a weird little corner of the web that was totally <em>yours</em>?
            </p>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
              <strong>That's what we're bringing back.</strong> Build your pixel home, join communities you actually care about, and connect with real people. No algorithms. No tracking. No corporate BS. Just creativity, community, and the joy of making something your own.
            </p>
          </section>

          {/* What This Actually Is Section */}
          <section className="thread-module p-6 mb-8">
            <h2 className="thread-headline text-2xl font-bold mb-6 text-center">What You Get to Do Here</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="feature-card p-4 rounded">
                <h3 className="font-bold text-lg mb-2">Build Your Pixel Home</h3>
                <p className="text-gray-600 text-sm">
                  Design an 8-bit house that's uniquely yours. You can choose templates (cottage, townhouse, loft, cabin), customize colors, add decorations like plants and paths. Explore neighborhoods in Street View, Grid View, or Map View. It's like Neopets meets GeoCities.
                </p>
              </div>

              <div className="feature-card p-4 rounded">
                <h3 className="font-bold text-lg mb-2">Actually Customize Everything</h3>
                <p className="text-gray-600 text-sm">
                  Use our drag-and-drop visual builder (no coding needed) or write custom CSS and dive into our template language. Want a '90s shrine? A minimalist portfolio? A chaotic art project? Go wild. Your page, your rules.
                </p>
              </div>

              <div className="feature-card p-4 rounded">
                <h3 className="font-bold text-lg mb-2">Join ThreadRings</h3>
                <p className="text-gray-600 text-sm">
                  Communities that can branch and evolve like classic WebRings but with family trees. Each has its own 88x31 pixel badge and personality. Find your people, whether that's book clubs, pixel artists, or fellow weirdos.
                </p>
              </div>

              <div className="feature-card p-4 rounded">
                <h3 className="font-bold text-lg mb-2"><PixelIcon name="chat" className="inline-block align-middle mr-1" /> Connect Without Algorithms</h3>
                <p className="text-gray-600 text-sm">
                  Follow people and see their posts in chronological order. That's it. No AI deciding what you should see. No engagement optimization. Sign guestbooks, make friends (yes, there's a Top 8), and actually talk to people.
                </p>
              </div>
            </div>
          </section>

          {/* Your Questions Answered Section */}
          <section className="thread-module p-6 mb-8">
            <h2 className="thread-headline text-2xl font-bold mb-6 text-center">Your Questions Answered</h2>
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="faq-item">
                <h3 className="font-bold text-base mb-2 text-gray-900">What is HomePageAgain?</h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  HomePageAgain is a community-first social platform where you build your own pixel home, join ThreadRings (interest-based communities), and connect with real people. No algorithms deciding what you see, no tracking, no corporate BS. Think of it as a blend of classic GeoCities creativity, modern community features, and the joy of the internet when it was weird and fun. Your page, your way (actually yours, not rented space on someone else's platform).
                </p>
              </div>

              <div className="faq-item">
                <h3 className="font-bold text-base mb-2 text-gray-900">What does "no algorithms" actually mean?</h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  It means we don't use AI to decide what you see. Your feed shows posts from people you follow and ThreadRings you joined, in chronological order, newest first. We don't hide content, boost viral posts, or manipulate what appears based on "engagement." You control what you see by choosing who to follow and which communities to join.
                </p>
              </div>

              <div className="faq-item">
                <h3 className="font-bold text-base mb-2 text-gray-900">What does "no tracking" mean? How do you make money?</h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  We don't use analytics trackers, advertising pixels, or sell your data to third parties. We don't track your behavior across the web or build profiles to sell to advertisers. HomePageAgain is currently in beta and exploring sustainable funding models that actually respect your privacy, likely premium features or memberships and not advertising. Right now, this is a passion project built by one person who thinks the internet can be better.
                </p>
              </div>

              <div className="faq-item">
                <h3 className="font-bold text-base mb-2 text-gray-900">Can I browse without signing up?</h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  Yes! You can explore the community feed, browse pixel homes in the neighborhood, view public profiles, and check out ThreadRings without creating an account. Signing up lets you create your own pixel home, join communities, post content, and connect with others.
                </p>
              </div>

              <div className="faq-item">
                <h3 className="font-bold text-base mb-2 text-gray-900">What happens after I sign up?</h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  After signing up, you'll create your pixel home (choose a house template and customize it), set up your profile page, and can start exploring neighborhoods, joining ThreadRings, and connecting with the community. You'll also automatically join the Welcome Ring to help you get started!
                </p>
              </div>
            </div>
            <div className="text-center mt-6 pt-4 border-t border-gray-200">
              <Link href="/help/faq" className="text-sm text-gray-600 hover:text-gray-800 font-medium underline">
                More questions? Check our full FAQ →
              </Link>
            </div>
          </section>

          {/* Why This Matters Section */}
          <section className="thread-module p-6 mb-8">
            <h2 className="thread-headline text-2xl font-bold mb-4 text-center">Why We're Building This</h2>
            <div className="max-w-2xl mx-auto space-y-4">
              <p className="text-gray-700 leading-relaxed">
                Somewhere along the way, social media stopped being about <em>you</em> and started being about keeping you scrolling. Algorithms replaced chronological feeds. Tracking replaced privacy. Everyone got the same boring template.
              </p>
              <p className="text-gray-700 leading-relaxed">
                <strong>We think the internet can be better.</strong> More creative. More human. More fun. A place where your profile is an actual expression of who you are, not a data point optimized for engagement.
              </p>
              <p className="text-gray-700 leading-relaxed">
                HomePageAgain is a love letter to the weird, creative internet we miss and a blueprint for the internet we still want.
              </p>
            </div>
          </section>

          {/* Getting Started Section */}
          <section className="thread-module p-6 mb-8">
            <h2 className="thread-headline text-2xl font-bold mb-4 text-center">Ready to Get Started?</h2>
            <p className="text-gray-700 text-center mb-6">
              We've got guides to help you build your corner of the indie web.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/build/getting-started" className="retro-button bg-blue-200 hover:bg-blue-100 px-6 py-3 font-medium text-center">
                Getting Started Guide
              </Link>
              <Link href="/build/templates" className="retro-button bg-purple-200 hover:bg-purple-100 px-6 py-3 font-medium text-center">
                Design Documentation
              </Link>
            </div>
          </section>

          {/* Personal Message Section */}
          <section className="thread-module p-6 mb-8">
            <h2 className="thread-headline text-2xl font-bold mb-4 text-center">A Personal Note</h2>
            <div className="max-w-2xl mx-auto text-center">
              <p className="text-gray-700 mb-4 leading-relaxed">
                I'm building this alone, in every spare moment, because I genuinely believe we can have a social internet that doesn't suck. One that's creative, playful, and human-centered instead of optimized for engagement and profit.
              </p>
              <p className="text-gray-700 mb-4 leading-relaxed">
                <strong>This is beta software built by one person who cares.</strong> It's rough around the edges, but it's honest. Your feedback helps me make this better, not for shareholders, but for actual people who just want a fun place to hang out online.
              </p>
              <p className="text-gray-700 leading-relaxed">
                Thank you for being here. Let's build something good together.
              </p>
            </div>
          </section>

          {/* Feedback Section */}
          <section className="thread-module p-6 mb-8">
            <h2 className="thread-headline text-2xl font-bold mb-4 text-center">Your Voice Matters</h2>
            <div className="text-center">
              <p className="text-gray-700 mb-6 max-w-2xl mx-auto leading-relaxed">
                Found a bug? Have an idea? Something confusing? I want to hear it. Your honest feedback makes this project better for everyone.
              </p>
              <a
                href="https://forms.gle/cNJssqoKs9yJTspG6"
                target="_blank"
                rel="noopener noreferrer"
                className="retro-button bg-green-200 hover:bg-green-100 px-8 py-4 font-bold text-lg"
              >
                Share Feedback
              </a>
              <p className="text-sm text-gray-500 mt-3">
                Anonymous feedback form • Help shape HomePageAgain
              </p>
            </div>
          </section>

          {/* Call to Action */}
          <section className="thread-module p-8 text-center">
            <h2 className="thread-headline text-3xl font-bold mb-4">Your Page, Your Way</h2>
            <p className="text-gray-600 mb-6">
              Build something weird. Join some communities. Make some friends. Have fun on the internet again.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup" className="retro-button bg-yellow-200 hover:bg-yellow-100 px-8 py-4 font-bold text-lg">
                Build Your Pixel Home
              </Link>
              <Link href="/discover/feed" className="retro-button bg-orange-200 hover:bg-orange-100 px-8 py-4 font-bold text-lg">
                Explore the Community
              </Link>
            </div>
          </section>
        </div>
      </Layout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<LandingPageProps> = async () => {
  const siteConfig = await getSiteConfig();

  return {
    props: {
      siteConfig,
    },
  };
};
