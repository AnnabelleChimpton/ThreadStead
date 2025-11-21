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
          answer: 'We\'re bringing back the creative, playful internet before it got corporate. Your pixel home and profile are YOUR space - not a cookie-cutter template designed to maximize ad revenue. No algorithm decides what you see; you follow people and join communities YOU choose. Your content lives on your profile forever, not buried by an algorithm. Plus, we don\'t track you, sell your data, or optimize for rage-bait and addiction. It\'s the internet when it was actually fun.'
        },
        {
          question: 'What does "no algorithms" actually mean?',
          answer: 'It means we don\'t use AI to decide what you see. Your feed shows posts from people you follow and ThreadRings you joined, in chronological order - newest first. We don\'t hide content, boost viral posts, or manipulate what appears based on "engagement." You control what you see by choosing who to follow and which communities to join.'
        },
        {
          question: 'What does "no tracking" mean? How do you make money?',
          answer: 'We don\'t use analytics trackers, advertising pixels, or sell your data to third parties. We don\'t track your behavior across the web or build profiles to sell to advertisers. HomePageAgain is currently in beta and exploring sustainable funding models that actually respect your privacy - likely premium features or memberships, not advertising. Right now, this is a passion project built by one person who thinks the internet can be better.'
        },
        {
          question: 'Can I browse without signing up?',
          answer: 'Yes! You can explore the community feed, browse pixel homes in the neighborhood, view public profiles, and check out ThreadRings without creating an account. Signing up lets you create your own pixel home, join communities, post content, and connect with others.'
        },
        {
          question: 'Why pixel homes? What\'s the point?',
          answer: 'Pixel homes bring back the fun of personal expression that\'s been lost on modern social media. Instead of everyone having identical profile layouts, you get a unique visual representation you can customize and decorate. It\'s playful, creative, and makes browsing the community feel like exploring a neighborhood instead of scrolling an infinite feed. Plus, it\'s just fun!'
        }
      ]
    },
    {
      category: 'Getting Started',
      questions: [
        {
          question: 'What is HomePageAgain?',
          answer: 'HomePageAgain is a community-first social platform where you build your own pixel home, join ThreadRings (interest-based communities), and connect with real people. No algorithms deciding what you see, no tracking, no corporate BS. Think of it as a blend of classic GeoCities creativity, modern community features, and the joy of the internet when it was weird and fun. Your page, your way - actually yours, not rented space on someone else\'s platform.'
        },
        {
          question: 'How do I create my profile?',
          answer: 'Click the "Create Profile" button in the navigation bar to get started. You\'ll be guided through a simple setup process to create your account and customize your first page.'
        },
        {
          question: 'Is HomePageAgain free?',
          answer: 'Yes! HomePageAgain is free to use. We believe everyone should have the opportunity to create their own space on the web.'
        },
        {
          question: 'What happens after I sign up?',
          answer: 'After signing up, you\'ll create your pixel home (choose a house template and customize it), set up your profile page, and can start exploring neighborhoods, joining ThreadRings, and connecting with the community. You\'ll also automatically join the Welcome Ring to help you get started!'
        },
        {
          question: 'What should I do first?',
          answer: 'We recommend: 1) Customize your pixel home (pick a house style and colors), 2) Set up your profile page with a bio and links, 3) Explore the neighborhood in Street View to see what others have created, and 4) Join a ThreadRing that interests you to start connecting with people.'
        },
        {
          question: 'What\'s the difference between my profile and pixel home?',
          answer: 'Your profile is your personal page with your bio, posts, links, and content. Your pixel home is the visual 8-bit house that represents you in the neighborhood view - it\'s what people see when they explore in Street, Grid, or Map view. Think of it like your house vs. your living room!'
        }
      ]
    },
    {
      category: 'Pixel Homes & Neighborhoods',
      questions: [
        {
          question: 'What is a Pixel Home?',
          answer: 'A Pixel Home is your unique 8-bit style house that represents you visually in our neighborhoods. You can choose from different house templates (cottages, townhouses, lofts, cabins), customize colors, add decorations like plants and paths, and set the atmosphere (weather, time of day). It\'s a fun, creative way to express your personality!'
        },
        {
          question: 'How do I customize my pixel home?',
          answer: 'Visit your settings or the Build section to access the pixel home customizer. You can change your house template, customize colors (walls, roof, trim, windows), choose door and window styles, add decorations, and adjust atmosphere settings like sky color and weather. All changes appear in real-time!'
        },
        {
          question: 'What are the different house templates?',
          answer: 'We offer four main house templates: Cottages (cozy and classic), Townhouses (urban and tall), Lofts (modern and industrial), and Cabins (rustic and woodland). Each has its own unique architecture and vibe. You can pick whichever matches your personality!'
        },
        {
          question: 'Can I add decorations? What kinds?',
          answer: 'Yes! You can add: Plants (flowers, trees, bushes), Paths (walkways and garden paths), Features (mailboxes, fences, benches), and Seasonal items (holiday decorations). Decorations can be placed around your home in different sizes and positions to create your perfect yard!'
        },
        {
          question: 'What is Street View vs Grid View vs Map View?',
          answer: 'Street View: An immersive horizontal scroll through homes like strolling down a street. Grid View: Browse homes in a organized card grid for efficient browsing. Map View: A bird\'s eye perspective showing home locations spatially. Each view offers a different way to explore the neighborhood!'
        },
        {
          question: 'How do I explore neighborhoods?',
          answer: 'Go to Discover → Neighborhoods to explore! You can browse All Homes, see Recently Updated homes, check out Popular homes, or try Random Home Adventure for serendipitous discovery. Use filters to find homes by style, color theme, or decoration type. Switch between Street, Grid, and Map views anytime.'
        },
        {
          question: 'What does "Random Home Adventure" do?',
          answer: 'It shows you a randomized selection of homes from across the community - perfect for discovering unexpected connections and interesting people you might not find otherwise. It\'s our serendipity feature for when you want to explore without a specific goal!'
        },
        {
          question: 'Can I change my house template later?',
          answer: 'Yes! You can change your house template, colors, decorations, and atmosphere at any time from your settings. Your customizations are always flexible - express yourself however you want, whenever you want.'
        }
      ]
    },
    {
      category: 'ThreadRings & The Spool',
      questions: [
        {
          question: 'What are ThreadRings?',
          answer: 'ThreadRings are interest-based communities where people gather around shared topics, hobbies, or themes. Each ring has its own identity, members, and feed of posts. Think of them like clubs, forums, or Discord servers - but with a unique family tree structure and visual badges!'
        },
        {
          question: 'What is The Spool?',
          answer: 'The Spool is the ancestral root of all ThreadRings - the original ring from which all other rings can trace their genealogy. It doesn\'t host posts itself, but acts as the foundation of the ThreadRing family tree. All rings are ultimately descendants of The Spool, creating a connected genealogy of communities.'
        },
        {
          question: 'How is a ThreadRing different from a forum or Discord server?',
          answer: 'ThreadRings have unique features: 1) Genealogy - rings can branch from parent rings, creating a family tree, 2) Visual identity - each ring has an 88x31 pixel badge, 3) Neighborhood view - see all ring members\' pixel homes together, 4) Cross-posting - your posts can appear in your profile AND the ring feed. It\'s more interconnected than traditional forums!'
        },
        {
          question: 'What\'s ThreadRing genealogy?',
          answer: 'Every ThreadRing (except The Spool) has a parent ring it branched from, creating a family tree of communities. You can view the genealogy to see how rings are related - like how "Book Lovers" might branch into "Sci-Fi Readers" and "Poetry Circle". This shows the evolution and relationships between communities over time.'
        },
        {
          question: 'How do I branch a new ring from an existing one?',
          answer: 'If you\'re a member of a ring, you can create a new "child" ring that branches from it. This is perfect for creating more specific communities (like branching "Pixel Art" from "Digital Art") while maintaining the genealogical connection. The parent ring will show in the new ring\'s family tree!'
        },
        {
          question: 'What\'s the difference between Ring Host, Moderator, and Member?',
          answer: 'Ring Host: Created the ring, has full control including deleting it and managing all settings. Moderator: Can manage members, moderate posts, and edit ring details. Member: Can post, comment, and participate but can\'t manage the ring. Hosts can promote members to moderators.'
        },
        {
          question: 'What are Open, Invite, and Closed rings?',
          answer: 'Open: Anyone can join immediately. Invite: You need an invitation from a ring member to join. Closed: The ring is not accepting new members at all. Ring hosts set the join type to manage their community\'s growth and exclusivity.'
        },
        {
          question: 'What are 88x31 badges?',
          answer: 'These are classic web-style pixel art badges (88 pixels wide by 31 pixels tall) that represent each ThreadRing visually. They\'re inspired by the button badges from the early web. You can see a ring\'s badge on its page, and rings can share badges for others to display on their profiles or websites!'
        }
      ]
    },
    {
      category: 'Building & Customization',
      questions: [
        {
          question: 'Do I need coding skills to build my page?',
          answer: 'No! Our visual builder makes it easy to create beautiful pages without any coding knowledge. However, if you do know how to code, you can use our template language for advanced customization.'
        },
        {
          question: 'What\'s the difference between Visual Builder, CSS Editor, and Template Language?',
          answer: 'Visual Builder: Drag-and-drop interface for creating layouts without code. CSS Editor: Write custom CSS to style your page with advanced control. Template Language: Use our powerful template syntax for dynamic content, variables, and logic. Start with Visual Builder, add CSS for styling tweaks, and use Template Language for advanced features!'
        },
        {
          question: 'Can I switch between visual and code editing?',
          answer: 'Yes! You can switch between Visual Builder and code editing (CSS/Template Language) at any time. Your changes are preserved when switching modes, so you can use whichever editing method feels most comfortable for each task.'
        },
        {
          question: 'Can I use my own domain?',
          answer: 'Custom domains may be available depending on your account type. Check our documentation or contact us for more information about domain options.'
        },
        {
          question: 'How do templates work?',
          answer: 'Templates are pre-designed layouts that you can customize to match your style. Browse our template library, choose one you like, and make it your own using the visual builder.'
        },
        {
          question: 'How do I add music to my profile?',
          answer: (
            <>
              You can add background music to your profile using MIDI files! Go to Settings → Music to upload a .mid or .midi file (max 1MB). Visitors will hear it when they view your page - it&apos;s a throwback to classic web homepages with a modern twist.{' '}
              <Link href="/help/music-guide" className="text-thread-sunset hover:underline font-medium">
                Check out our complete music creator&apos;s guide
              </Link>{' '}
              for technical specs, composition tips, software recommendations, and more.
            </>
          )
        },
        {
          question: 'What are guestbooks?',
          answer: 'Guestbooks are a classic web feature where visitors can leave messages on your profile! It\'s like a comment wall where people can say hello, leave compliments, or share thoughts. Enable your guestbook in settings to let visitors sign it.'
        }
      ]
    },
    {
      category: 'Community & Social',
      questions: [
        {
          question: 'How do I find other people on HomePageAgain?',
          answer: 'Explore the Discover section to browse the community directory, search for specific interests, or check out the feed to see what others are sharing.'
        },
        {
          question: 'How do I make friends vs follow someone?',
          answer: 'Following someone means you\'ll see their posts in your feed - it\'s a one-way connection. Making friends is a mutual connection where both people accept the friendship. Friends appear on each other\'s friend lists and may have special visibility permissions for certain content.'
        },
        {
          question: 'Where do my posts appear?',
          answer: 'Your posts appear in multiple places: 1) Your profile page, 2) The feed of any ThreadRings you posted to, 3) The feeds of people following you, 4) The community-wide Recent Posts feed. This helps your content reach different audiences!'
        },
        {
          question: 'Can I edit or delete posts?',
          answer: 'Yes! You can edit or delete your posts at any time from your profile or the post itself. Deleted posts are permanently removed from all feeds and locations.'
        },
        {
          question: 'How do I report inappropriate content?',
          answer: 'If you see content that violates our community guidelines, please use the report feature or contact us directly. We take all reports seriously and will investigate promptly.'
        },
        {
          question: 'Can I block users?',
          answer: 'Yes, you can block users from your account settings. Blocked users won\'t be able to see your content, comment on your posts, or interact with you on the platform.'
        }
      ]
    },
    {
      category: 'Privacy & Security',
      questions: [
        {
          question: 'Who can see my page?',
          answer: 'By default, your page is publicly visible. You can adjust privacy settings in your profile to control who can view your content and interact with you.'
        },
        {
          question: 'How is my data used?',
          answer: 'We respect your privacy. Your data is used only to provide and improve our services. For detailed information, please read our Privacy Policy.'
        },
        {
          question: 'Can I delete my account?',
          answer: 'Yes, you can delete your account at any time from your account settings. This action is permanent and will remove all your data from our servers.'
        },
        {
          question: 'What\'s a Decentralized Identifier (DID)?',
          answer: 'A DID is a unique identifier you own and control, not tied to any single platform or company. When you sign up with a DID, your identity is portable and secure - you can use it across different services without creating separate accounts. It\'s part of our commitment to giving you ownership of your digital identity!'
        },
        {
          question: 'How do seed phrases work for account recovery?',
          answer: 'A seed phrase is a series of words that acts as a master key to your account. If you ever lose access, you can use your seed phrase to recover your account. IMPORTANT: Keep your seed phrase private and secure - anyone with it can access your account. We recommend writing it down and storing it somewhere safe (not digitally).'
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
                Everything you need to know about Pixel Homes, ThreadRings, neighborhoods, and all our features.
              </p>
              <p className="text-base text-gray-700 mb-3">
                <PixelIcon name="human-handsup" size={16} className="inline-block align-middle" /> <strong>First time here?</strong> This FAQ has all the details, but if you want the full story about why we&apos;re building HomePageAgain, check out our <Link href="/landing" className="text-thread-sunset hover:text-thread-pine underline font-medium">landing page</Link> - it&apos;s a personal note about creating a better internet.
              </p>
              <p className="text-base text-thread-sage">
                New to HomePageAgain? Start with &quot;Why HomePageAgain?&quot; and &quot;Getting Started&quot; below!
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
