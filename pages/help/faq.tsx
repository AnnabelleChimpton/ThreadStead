import { GetServerSideProps } from 'next';
import Link from 'next/link';
import Layout from '@/components/ui/layout/Layout';
import PageHeader from '@/components/ui/layout/PageHeader';
import Callout from '@/components/ui/feedback/Callout';
import ButtonLink from '@/components/ui/ButtonLink';
import { getSiteConfig, SiteConfig } from '@/lib/config/site/dynamic';
import PageMeta from '@/components/ui/layout/PageMeta';

interface FAQProps {
  siteConfig: SiteConfig;
}

export default function FAQ({ siteConfig }: FAQProps) {
  const link = 'text-thread-sunset hover:underline font-medium';
  const faqs = [
    {
      category: 'Getting started',
      questions: [
        {
          question: 'What is HomePageAgain?',
          answer: 'It\'s a little neighborhood of pixel houses. You get a house on the street and a page you can make look however you want, and you can join small groups about whatever you\'re into. I wanted a place online that felt like the old personal home page internet, so I made one.'
        },
        {
          question: 'Is it free?',
          answer: 'Yes! There are no ads, and I don\'t sell anything about you or put trackers on the site. I pay for it myself right now. If that ever stops working, I\'d rather do optional memberships than ads.'
        },
        {
          question: 'Can I look around before I sign up?',
          answer: 'Of course! The street, people\'s pages, Recent Posts and the rings are all open to everyone. You only need an account once you want a house of your own.'
        },
        {
          question: 'How do I sign up?',
          answer: 'Hit Sign Up and pick a username. Then you choose how you\'ll sign in, either with a password or with a 12-word seed phrase if you\'d rather not have one. Adding an email is optional, but it means you can get sign-in links and reset your password. After the house rules you set up your profile and pick your house and its colors. If sign-ups are invite-only when you get here, you\'ll need a beta key too.'
        },
        {
          question: 'What should I do first?',
          answer: 'For your first couple of months, the main page shows a little list when you\'re signed in: pick your house, put something in your yard, write a post, sign someone\'s guestbook and join a ring. You don\'t have to do them in order. Walking the street and looking at other people\'s houses is honestly the best way to figure out what you want yours to look like.'
        },
        {
          question: 'Is there a tour?',
          answer: (
            <>
              Sort of! The <Link href="/tr/welcome" className={link}>Welcome Ring</Link> walks you through how rings work in five small steps, like reading a post and leaving your first comment. It&apos;s optional, so you only end up in it if you join.
            </>
          )
        },
        {
          question: 'What\'s the difference between my house and my page?',
          answer: 'The house is what people see from the street. Your page is what\'s inside it, so your bio and posts and guestbook and whatever else you put there. Click the front door of someone\'s house and you end up on their page.'
        }
      ]
    },
    {
      category: 'Why it\'s different',
      questions: [
        {
          question: 'How is this different from Facebook, Twitter or Instagram?',
          answer: 'Your Following feed is the people you follow, newest first. I don\'t rank it or decide what you see. Your posts stay on your page instead of scrolling away, and that page is yours to restyle with your own CSS. There are no ads here either, so nothing is trying to keep you scrolling.'
        },
        {
          question: 'What does "no algorithms" actually mean?',
          answer: 'The Following tab shows posts from the people you follow in the order they were written, and nothing gets hidden or boosted. There is an Active Discussions tab that puts posts with recent comments near the top, but you have to go click on it. If Following feels quiet, follow a few more people!'
        },
        {
          question: 'Do you track me? How do you pay for it?',
          answer: (
            <>
              There are no ad pixels or third-party trackers, and I don&apos;t sell your data. The site keeps what it needs to run, and the <Link href="/help/privacy" className={link}>privacy page</Link> has the details. As for money, I pay for it myself right now (see &quot;Is it free?&quot; up top).
            </>
          )
        },
        {
          question: 'Why pixel houses?',
          answer: 'A little house tells you way more about someone than a profile picture in a grid does. One neighbor has a cabin at night with a pond out front, someone else has a pink cottage with a garden path, and after a while you start recognizing people by their houses. You notice a yard you like, click, and suddenly you\'re reading their page.'
        }
      ]
    },
    {
      category: 'Houses and the neighborhood',
      questions: [
        {
          question: 'How do I decorate my house?',
          answer: 'Go to your house and click Decorate Home (it\'s in Settings → Pixel Home too). Themes is where you pick your house, out of the Cozy Cottage, Urban Townhouse, Creative Loft and Rustic Cabin, and a palette. Colors lets you change the wall, roof, trim, window and detail colors one by one. The House tab has doors, windows, roof trim and the little stuff like the chimney, welcome mat, house number and lights. Nothing saves until you hit Save, so play around!'
        },
        {
          question: 'What can I put in the yard?',
          answer: 'The Decor tab has plants, furniture, lighting, water, structures, paths and a few other features, and Terrain lets you paint the ground with things like grass, sand, a stone path or a wood deck. You can also upload your own pixel art under My Art (up to 100KB per image). There\'s a 100-decoration limit, which sounds like a lot until you start.'
        },
        {
          question: 'Can I change the sky or the weather?',
          answer: 'The sky, yes. In the Sky tab you can pick sunny, cloudy, sunset or night. Weather isn\'t something you can choose yet.'
        },
        {
          question: 'Can I change my house later?',
          answer: 'Anytime. Switching to a different house or palette keeps all your decorations where they are.'
        },
        {
          question: 'How do I explore the neighborhood?',
          answer: (
            <>
              <Link href="/neighborhood" className={link}>The street</Link> is every house on the site. You can sort it by recently updated or A to Z, and under Filters you can narrow it down by house style or colors. You can walk it as a street, skim it as a grid, or look at it as a map. On a phone it starts out as cards.
            </>
          )
        },
        {
          question: 'Can I visit a random house?',
          answer: 'Yep! Under Neighborhood there\'s an "A random house" link that drops you on someone\'s porch. It\'s a nice way to find people you\'d never have searched for.'
        }
      ]
    },
    {
      category: 'ThreadRings',
      questions: [
        {
          question: 'What are ThreadRings?',
          answer: (
            <>
              Small groups around one topic, kind of like the old webrings. Each one has its own feed and a little 88×31 badge you can put on your page. Rings can branch off into new rings, and you can follow any ring back through its <Link href="/threadrings/genealogy" className={link}>family tree</Link>.
            </>
          )
        },
        {
          question: 'How is a ring different from a forum or a Discord server?',
          answer: 'It\'s tied into the rest of the site. When you post to a ring, the post lives on your page and shows up in the ring\'s feed at the same time. The members of a ring get their own little neighborhood of houses you can walk through. And since rings branch off each other, related groups stay connected in one tree instead of being scattered around.'
        },
        {
          question: 'What is The Spool?',
          answer: 'The very first ring. Every other ring branches off it somewhere up the tree. It doesn\'t have a feed of its own. Its page is more like the front door to the family tree, and it\'s where new rings start.'
        },
        {
          question: 'How do I start a ring, or branch one off?',
          answer: 'Every ring\'s page has a Branch This Ring button, and anyone with an account can use it. You don\'t have to be a member, unless the ring is private. Your new ring keeps its parent in the family tree, so "Pixel Art" can branch off "Digital Art". A brand new ring is just a branch off The Spool.'
        },
        {
          question: 'Who runs a ring?',
          answer: 'Whoever starts a ring is its host (some pages call that the curator). The host can make members into moderators to help look after the ring, and can hand the whole ring over to someone else. Deleting a ring isn\'t possible yet.'
        },
        {
          question: 'What are Open, Invite and Closed rings?',
          answer: 'It\'s how a ring takes new people, and the host picks. Anyone can join an open ring right away. For an invite-only ring, the host or a moderator has to invite you. Closed rings aren\'t taking anyone new.'
        },
        {
          question: 'What are 88×31 badges?',
          answer: 'The tiny buttons old websites used to link to each other, 88 pixels wide and 31 tall. A ring gets one when it\'s made. Once you\'re in a ring you can show its badge on your page from Settings → Badges, and they collect on the Badges tab of your page.'
        }
      ]
    },
    {
      category: 'Your page',
      questions: [
        {
          question: 'Do I need to know how to code?',
          answer: 'Nope! The house is all point and click. For your page, Settings → Your page has five themes you can use as they are: Classic Linen, Charcoal Nights, Pixel Petals, Retro Social and Starfield. If you do want to write code, you can change any of the CSS, or write the whole page yourself with a template.'
        },
        {
          question: 'What\'s the difference between CSS and my own HTML page?',
          answer: 'You\'ll find both in Settings → Your page. CSS changes how the normal page looks, from colours and fonts to the whole layout. Your own HTML page means writing the page\'s HTML yourself, with components for things like your posts, photos and guestbook. There are variables and if/else in there too, if you\'re into that. I\'d start with CSS and see how far it gets you.'
        },
        {
          question: 'Can I switch between CSS and a template?',
          answer: 'Yes. Your CSS comes with you into the template editor, and if you save an empty template you\'re back on the normal page with your CSS still on it. Reset to Default Template wipes both, so be careful with that one.'
        },
        {
          question: 'How do templates work?',
          answer: (
            <>
              The HTML editor comes with five starter pages. Load one and start changing things. The <Link href="/build/html" className={link}>lessons</Link> start from nothing, and the <Link href="/build/templates/components" className={link}>components page</Link> lists every component you can use.
            </>
          )
        },
        {
          question: 'Can I use my own domain?',
          answer: 'Not yet.'
        },
        {
          question: 'How do I add music to my page?',
          answer: (
            <>
              Go to Settings → Music and upload a MIDI file (.mid or .midi, up to 1MB). Autoplay is off unless you turn it on, and even then most browsers wait until a visitor clicks something before music can start. If you need a MIDI, the <Link href="/help/music-guide" className={link}>music guide</Link> has places to find them and tips for making your own.
            </>
          )
        },
        {
          question: 'How do I stop music playing on other people\'s pages?',
          answer: (
            <>
              Press the × on the player to close it for the rest of your visit. To stop songs starting on their own anywhere, untick &quot;Play music automatically when I visit a profile&quot;, either in the player&apos;s controls or in Settings → Music. The <Link href="/help/music-guide#visitors" className={link}>music guide</Link> has the details.
            </>
          )
        },
        {
          question: 'What are guestbooks?',
          answer: 'Just like the old ones! Visitors leave you a note on the Guestbook tab of your page. Your mailbox out front opens the same guestbook, so neighbors walking by can sign it too.'
        }
      ]
    },
    {
      category: 'People and posts',
      questions: [
        {
          question: 'How do I find people?',
          answer: 'Walk around the neighborhood, read Recent Posts, or use search. Search finds people by username or display name, and posts by what\'s in them.'
        },
        {
          question: 'What\'s the difference between following and friends?',
          answer: 'Following is one way. Their posts show up in your Following feed, and they don\'t have to follow you back. If you both follow each other, you\'re friends, which means you can see each other\'s friends-only posts.'
        },
        {
          question: 'Who sees my posts?',
          answer: 'You pick for each post: Public, Followers, Friends or Only me. Every post goes on your page for whoever\'s allowed to see it. Your followers see it in their Following feed, and public posts also show up in Recent Posts for everyone. If you tick a ring when you post, it goes into that ring\'s feed too.'
        },
        {
          question: 'Can people follow my posts without an account?',
          answer: 'Yes, with a feed reader. Every public page has an RSS feed, and its address is in Settings → Profile, under your own address, with a copy button. Anyone can paste it into their feed reader and your new posts show up there. It only has your public posts, and only while your page is public.'
        },
        {
          question: 'Can I edit or delete posts?',
          answer: 'Yes, anytime. Deleting a post takes it off your page and out of any rings you sent it to.'
        },
        {
          question: 'How do I report something?',
          answer: (
            <>
              Posts and comments have a Report button. For anything else, like a profile or a guestbook note, <Link href="/help/contact" className={link}>email me</Link>. Every report comes straight to me and I read all of them.
            </>
          )
        },
        {
          question: 'Can I block someone?',
          answer: (
            <>
              Yes. There&apos;s a Block button on people&apos;s pages, and you can also click their name in the Chat Lounge. Once you block someone, their posts stop showing up in your feeds, in search and on their page, their comments are hidden from you, and they can&apos;t send you messages or whispers. They don&apos;t get told. They can still see your public page though, so if someone is really bothering you, <Link href="/help/contact" className={link}>email me</Link> as well. You can see and undo your blocks from Settings → Privacy & Consent.
            </>
          )
        }
      ]
    },
    {
      category: 'Privacy and your account',
      questions: [
        {
          question: 'Who can see my page?',
          answer: 'Everyone, unless you change it. Settings → Profile has Profile Visibility, where you can pick Public, Followers Only, Friends Only or Private.'
        },
        {
          question: 'How is my data used?',
          answer: (
            <>
              To run the site, and that&apos;s it. I don&apos;t build ad profiles and I don&apos;t sell or share it with anyone. The <Link href="/help/privacy" className={link}>privacy policy</Link> has the specifics, and you can download a copy of your data from Settings → Privacy &amp; Consent.
            </>
          )
        },
        {
          question: 'Can I delete my account?',
          answer: 'Yes. Go to Settings → Privacy & Consent, and it\'s under Leave HomePageAgain. Your page is hidden as soon as you confirm, and everything is deleted for good 14 days later, so until then you can sign in and change your mind. If you look after a ring that has other members, you\'ll hand it to one of them first. Download a copy of your data on the same page before you go if you want one.'
        },
        {
          question: 'What\'s a decentralized identifier (DID)?',
          answer: 'It\'s an ID that belongs to you instead of to the site. Every account gets one, and it\'s how your posts and ring memberships work with the ring hub, which is its own separate service.'
        },
        {
          question: 'How do seed phrases work?',
          answer: 'A seed phrase is 12 words that work like a master key to your account. You get one at sign-up if you pick it there, and you can make one (or a new one) in Settings → Account & Security. If you\'re ever locked out, go to Login → Sign in with Seed Phrase. Anyone with those words has your account, so write them down on actual paper and keep them somewhere safe.'
        }
      ]
    }
  ];

  return (
    <>
      <PageMeta title="FAQ" description="How the houses, rings and pages on HomePageAgain work, and what happens with your data." path="/help/faq" />

      <Layout siteConfig={siteConfig}>
        <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-8 sm:py-12">
          <PageHeader title="Questions people ask me" back={{ href: '/help', label: 'Back to Help' }}>
            <p>Here&apos;s how the houses, rings and pages work, and what happens with your data.</p>
            <p className="text-base">If you&apos;re brand new, start with the first section. The <Link href="/landing">landing page</Link> has the short version.</p>
          </PageHeader>

          {/* FAQ Sections */}
          <div className="space-y-8">
            {faqs.map((section, sectionIndex) => (
              <div key={sectionIndex} className="thread-module">
                <h2 className="thread-headline text-2xl font-bold mb-4">
                  {section.category}
                </h2>
                <div className="space-y-6">
                  {section.questions.map((faq, faqIndex) => (
                    <div key={faqIndex} className="border-l-4 border-nb-rose pl-4">
                      <h3 className="text-lg font-semibold text-nb-ink mb-2">
                        {faq.question}
                      </h3>
                      <p className="text-nb-ink mb-0">
                        {faq.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <Callout variant="framed" title="A note from me" className="mt-12">
            <p className="leading-relaxed">
              Hi, I&apos;m Annabelle! I&apos;m building HomePageAgain by myself in my spare time. It&apos;s still in beta, so some things are rough. If something breaks or confuses you, please tell me through the{' '}
              <a href="https://forms.gle/cNJssqoKs9yJTspG6" target="_blank" rel="noopener noreferrer" className={link}>feedback form</a>{' '}
              (it&apos;s anonymous, and I read every one).
            </p>
            <p className="leading-relaxed">Thanks for stopping by &lt;3</p>
          </Callout>

          <Callout title="Still stuck?" className="mt-8">
            <p>If your question isn&apos;t here, just ask me.</p>
            <p><ButtonLink href="/help/contact">Contact me</ButtonLink></p>
          </Callout>
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
