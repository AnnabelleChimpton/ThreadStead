import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '@/components/ui/layout/Layout';
import { getSiteConfig, SiteConfig } from '@/lib/config/site/dynamic';
import { PixelIcon } from '@/components/ui/PixelIcon';

interface FAQProps {
  siteConfig: SiteConfig;
}

export default function FAQ({ siteConfig }: FAQProps) {
  const faqs = [
    {
      category: 'Why HomePageAgain?',
      questions: [
        {
          question: 'How is this different from Facebook, Twitter, or Instagram?',
          answer: 'Your feed is just the people you follow and the rings you\'ve joined, newest first — nobody ranks it and nothing gets promoted into it. Your posts live on your page instead of scrolling away. You can restyle your whole profile with your own CSS. And there are no ads or trackers, so nothing here is designed to keep you scrolling.'
        },
        {
          question: 'What does "no algorithms" actually mean?',
          answer: 'Your feed is the posts from people you follow and rings you\'ve joined, in the order they were written, newest first. Nothing is hidden, boosted, or reordered. If your feed is boring, the fix is following different people — not fighting a recommendation engine.'
        },
        {
          question: 'What does "no tracking" mean? How do you make money?',
          answer: 'No analytics trackers, no ad pixels, no selling data. Right now this is a one-person project run out of pocket; if it ever needs to pay for itself, the plan is optional memberships or premium features — not advertising.'
        },
        {
          question: 'Can I browse without signing up?',
          answer: 'Yes. The feed, the neighborhoods, public profiles, and ThreadRings are all open to visitors. An account is only needed to get a home of your own, post, and join rings.'
        },
        {
          question: 'Why pixel homes? What\'s the point?',
          answer: 'Because a profile picture in a grid tells you nothing about a person, and a little house with a rose garden, a lava-red roof, and a MIDI song playing tells you a lot. Homes make browsing feel like walking a street; you notice a yard, knock, and end up reading someone\'s page.'
        }
      ]
    },
    {
      category: 'Getting Started',
      questions: [
        {
          question: 'What is HomePageAgain?',
          answer: 'A place to have a home page again. You get a pixel house on a shared street, a profile page you can restyle top to bottom, and ThreadRings — small communities that link to each other like the webrings of old. Posts, guestbooks, and MIDI included.'
        },
        {
          question: 'How do I create my profile?',
          answer: 'Click Sign Up in the navigation. The setup walks you through creating an account and your first page.'
        },
        {
          question: 'Is HomePageAgain free?',
          answer: 'Yes, free. If that ever changes for some premium extra, the basic home and page will stay free.'
        },
        {
          question: 'What happens after I sign up?',
          answer: 'You pick a house and colors, set up your profile page, and you\'re automatically added to the Welcome Ring so your street isn\'t empty on day one. From there: decorate, wander the neighborhoods, join a ring or two.'
        },
        {
          question: 'What should I do first?',
          answer: 'Decorate your house, write a couple of lines of bio, then go walk the neighborhood in Street View — seeing other people\'s homes is the fastest way to figure out what yours could be. Join a ring when one catches your eye.'
        },
        {
          question: 'What\'s the difference between my profile and pixel home?',
          answer: 'The pixel home is the house people see from the street; the profile is what\'s inside — your bio, posts, and links. Knocking on the door of a home takes you to the profile.'
        }
      ]
    },
    {
      category: 'Pixel Homes & Neighborhoods',
      questions: [
        {
          question: 'What is a Pixel Home?',
          answer: 'Your house on the street: pick a cottage, townhouse, loft, or cabin, paint the walls and roof, plant a garden, lay a path, and set the sky — sunset with light rain, if that\'s your mood.'
        },
        {
          question: 'How do I customize my pixel home?',
          answer: 'From your home page, open Decorate. You can change the house style, colors (walls, roof, trim, windows), doors and windows, decorations, terrain, and the weather overhead. Changes show as you make them.'
        },
        {
          question: 'What are the different house templates?',
          answer: 'Four: cottage, townhouse, loft, and cabin. Different silhouettes, same yard to play with — and you can switch anytime without losing your decorations.'
        },
        {
          question: 'Can I add decorations? What kinds?',
          answer: 'Plants (flowers, trees, bushes), paths, features (mailboxes, fences, benches), and seasonal items. Place them anywhere in the yard, in a few sizes. There\'s a 100-decoration limit, which sounds like a lot until you start.'
        },
        {
          question: 'What is Street View vs Grid View vs Map View?',
          answer: 'Street View scrolls past homes like walking a block. Grid View is a card layout for skimming. Map View is the bird\'s-eye version. Same houses, different pace.'
        },
        {
          question: 'How do I explore neighborhoods?',
          answer: 'Discover → Neighborhoods. Browse all homes, recently updated ones, or hit the random button and see whose porch you land on. Filters narrow by house style or palette.'
        },
        {
          question: 'What does "Random Home Adventure" do?',
          answer: 'It deals you a shuffled street of homes from across the site. No goal, no ranking — just houses you\'d never have searched for.'
        },
        {
          question: 'Can I change my house template later?',
          answer: 'Yes — template, colors, decorations, and weather can all change anytime. Nothing is locked in.'
        }
      ]
    },
    {
      category: 'ThreadRings & The Spool',
      questions: [
        {
          question: 'What are ThreadRings?',
          answer: 'Small communities around a topic — writing, tabletop games, whatever. Each ring has members, a feed, and an 88x31 badge. Rings branch off other rings, so the whole thing forms a family tree.'
        },
        {
          question: 'What is The Spool?',
          answer: 'The first ring — every other ring descends from it. It doesn\'t host posts; it\'s the trunk the family tree grows from.'
        },
        {
          question: 'How is a ThreadRing different from a forum or Discord server?',
          answer: 'A few things: rings branch from parent rings, so related communities stay visibly related; every ring has an 88x31 badge you can put on your page; a ring\'s members show up as a neighborhood of houses; and a post can live on your page and in the ring feed at once.'
        },
        {
          question: 'What\'s ThreadRing genealogy?',
          answer: 'Every ring (except The Spool) branched from a parent. "Book Lovers" might spawn "Sci-Fi Readers", which might spawn something stranger. The genealogy page shows the whole lineage.'
        },
        {
          question: 'How do I branch a new ring from an existing one?',
          answer: 'Members of a ring can branch a child ring off it — say, "Pixel Art" out of "Digital Art". The new ring keeps its parent in the family tree.'
        },
        {
          question: 'What\'s the difference between Ring Host, Moderator, and Member?',
          answer: 'Hosts created the ring and control everything, including deleting it. Moderators manage members and posts. Members post and comment. Hosts can promote members to moderators.'
        },
        {
          question: 'What are Open, Invite, and Closed rings?',
          answer: 'Open: anyone can join. Invite: a member has to invite you. Closed: not taking new members. The host picks.'
        },
        {
          question: 'What are 88x31 badges?',
          answer: 'The little button badges of the early web — 88 pixels wide, 31 tall. Every ring has one, members earn them by joining, and you can display yours on your page or anywhere else on the internet.'
        }
      ]
    },
    {
      category: 'Building & Customization',
      questions: [
        {
          question: 'Do I need coding skills to build my page?',
          answer: 'No. Decorating your house is all point-and-click, and the CSS editor comes with five ready-made themes you can apply and tweak. If you do write code, there\'s custom CSS and a full template language waiting for you.'
        },
        {
          question: 'What\'s the difference between Visual Builder, CSS Editor, and Template Language?',
          answer: 'The CSS editor restyles the standard page — colors, fonts, layout — and includes starter themes. The template language goes further: you write the page\'s HTML yourself with components for your posts, photos, and guestbook, plus variables and conditionals if you want them. Most people start with a CSS theme and go from there.'
        },
        {
          question: 'Can I switch between visual and code editing?',
          answer: 'Yes — you can move between plain CSS styling and full templates whenever you like, and switch back. Your CSS comes along with you.'
        },
        {
          question: 'Can I use my own domain?',
          answer: 'Not yet. It\'s on the wishlist.'
        },
        {
          question: 'How do templates work?',
          answer: 'Ready-made page layouts you can apply and then edit — swap the text, restyle with CSS, or open them in the template editor and rearrange the pieces.'
        },
        {
          question: 'How do I add music to my profile?',
          answer: (
            <>
              You can add background music to your page with a MIDI file. Go to Settings → Music to upload a .mid or .midi file (max 1MB). Visitors hear it when they open your page, just like the old days.{' '}
              <Link href="/help/music-guide" className="text-thread-sunset hover:underline font-medium">
                Check out our complete music creator&apos;s guide
              </Link>{' '}
              for technical specs, composition tips, software recommendations, and more.
            </>
          )
        },
        {
          question: 'What are guestbooks?',
          answer: 'The classic kind: visitors leave a note on your page. Yours comes built in — people can sign it from your profile or your pixel home\'s mailbox.'
        }
      ]
    },
    {
      category: 'Community & Social',
      questions: [
        {
          question: 'How do I find other people on HomePageAgain?',
          answer: 'Wander the neighborhoods, read the feed, or search — people turn up by their handles, names, and what they write about.'
        },
        {
          question: 'How do I make friends vs follow someone?',
          answer: 'Following is one-way: their posts show up in your feed. Friendship is mutual — both people agree, you appear on each other\'s friend lists, and some content can be shared friends-only.'
        },
        {
          question: 'Where do my posts appear?',
          answer: 'On your own page, in the feed of any ring you posted to, in your followers\' feeds, and in the site-wide recent feed.'
        },
        {
          question: 'Can I edit or delete posts?',
          answer: 'Yes, anytime. Deleting removes the post everywhere it appeared.'
        },
        {
          question: 'How do I report inappropriate content?',
          answer: 'Use the report button on the content, or contact us directly. Reports go to a human — there\'s only one of us back here, but every report gets read.'
        },
        {
          question: 'Can I block users?',
          answer: 'Yes, from settings. Blocked users can\'t see your content, comment, or interact with you.'
        }
      ]
    },
    {
      category: 'Privacy & Security',
      questions: [
        {
          question: 'Who can see my page?',
          answer: 'Public by default — it\'s a homepage. Privacy settings let you limit who sees what and who can interact.'
        },
        {
          question: 'How is my data used?',
          answer: 'To run the site, and that\'s it. No ad profiles, no selling, no sharing with third parties. The Privacy Policy has the specifics.'
        },
        {
          question: 'Can I delete my account?',
          answer: 'Yes, from account settings. It\'s permanent and removes your data from our servers.'
        },
        {
          question: 'What\'s a Decentralized Identifier (DID)?',
          answer: 'An identifier that belongs to you rather than to a platform. Yours is what lets your posts and ring memberships work across the federation — and it stays yours if you ever take it elsewhere.'
        },
        {
          question: 'How do seed phrases work for account recovery?',
          answer: 'A list of words that works as the master key to your account — if you lose your login, the seed phrase gets you back in. Anyone who has it has your account, so write it down on actual paper and keep it somewhere safe.'
        }
      ]
    }
  ];

  return (
    <>
      <Head>
        <title>HomePageAgain — Help: FAQ</title>
        <meta name="description" content="Comprehensive FAQ about HomePageAgain - learn about Pixel Homes, ThreadRings, The Spool, neighborhood exploration, customization tools, and more. Everything you need to get started!" />
        <link rel="canonical" href={`${process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'}/help/faq`} />
        <meta name="robots" content="index, follow" />

        <meta property="og:title" content="HomePageAgain — Help: FAQ" />
        <meta property="og:description" content="Comprehensive FAQ covering Pixel Homes, ThreadRings, neighborhoods, and all platform features" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'}/help/faq`} />
      </Head>

      <Layout siteConfig={siteConfig}>
        <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-8 sm:py-12">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <Link href="/help" className="text-sm text-thread-sunset hover:underline mb-3 inline-block">
              ← Back to Help
            </Link>
            <div className="bg-gradient-to-br from-blue-100 via-sky-50 to-purple-100 border-2 border-black rounded-lg shadow-[4px_4px_0_#000] p-6 sm:p-8 text-center">
              <h1 className="text-3xl sm:text-4xl font-bold text-thread-pine mb-4">
                Frequently Asked Questions
              </h1>
              <p className="text-lg text-gray-700 mb-3">
                How the houses, rings, and pages work — and what happens to your data (nothing).
              </p>
              <p className="text-base text-gray-700 mb-3">
                <PixelIcon name="human-handsup" size={16} className="inline-block align-middle" /> <strong>First time here?</strong> The details live below; the story of why this site exists is on the <Link href="/landing" className="text-thread-sunset hover:text-thread-pine underline font-medium">landing page</Link>.
              </p>
              <p className="text-base text-thread-sage">
                New here? Start with &quot;Getting Started&quot;.
              </p>
            </div>
          </div>

          {/* FAQ Sections */}
          <div className="space-y-8">
            {faqs.map((section, sectionIndex) => (
              <div key={sectionIndex} className="bg-thread-cream border border-thread-sage rounded-lg p-6">
                <h2 className="text-2xl font-bold text-thread-pine mb-4">
                  {section.category}
                </h2>
                <div className="space-y-6">
                  {section.questions.map((faq, faqIndex) => (
                    <div key={faqIndex} className="border-l-4 border-thread-sunset pl-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {faq.question}
                      </h3>
                      <p className="text-gray-700">
                        {faq.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Founder's Personal Note */}
          <div className="mt-12 mb-8 p-6 sm:p-8 bg-gradient-to-br from-yellow-100 via-orange-100 to-pink-100 border-2 border-black rounded-lg shadow-[3px_3px_0_#000]">
            <h2 className="text-2xl sm:text-3xl font-bold text-thread-pine mb-4 text-center">
              A Personal Note from the Founder
            </h2>
            <div className="max-w-3xl mx-auto space-y-4">
              <p className="text-base text-gray-800 leading-relaxed">
                I&apos;m building this alone, in every spare moment, because I genuinely believe we can have a social internet that doesn&apos;t suck. One that&apos;s creative, playful, and human-centered instead of optimized for engagement and profit.
              </p>
              <p className="text-base text-gray-800 leading-relaxed">
                <strong>This is beta software built by one person who cares.</strong> It&apos;s rough around the edges, but it&apos;s honest. Your feedback helps me make this better—not for shareholders, but for actual people who just want a fun place to hang out online.
              </p>
              <p className="text-base text-gray-800 leading-relaxed">
                Thank you for being here. Let&apos;s build something good together.
              </p>
            </div>
            <div className="text-center mt-6">
              <Link
                href="/landing"
                className="inline-block px-6 py-3 bg-white hover:bg-gray-50 border-2 border-black shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] font-medium transition-all transform hover:-translate-y-0.5"
              >
                Read the complete landing page →
              </Link>
            </div>
          </div>

          {/* Still have questions? */}
          <div className="mt-12 p-6 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <h3 className="text-xl font-semibold text-blue-900 mb-2">
              Still have questions?
            </h3>
            <p className="text-blue-800 mb-4">
              Can&apos;t find what you&apos;re looking for? We&apos;re here to help!
            </p>
            <Link
              href="/help/contact"
              className="inline-block px-6 py-3 bg-blue-600 !text-white rounded hover:bg-blue-700 transition-colors font-medium"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </Layout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  const siteConfig = await getSiteConfig();

  return {
    props: {
      siteConfig,
    }
  };
};
