import Link from 'next/link'
import Layout from '@/components/ui/layout/Layout'
import { publicEnv } from '@/lib/config/public-env'
import { botUserAgent, KAGI_SMALLWEB_HOME, LIMITS } from '@/lib/indie-index/public'
import PageMeta from '@/components/ui/layout/PageMeta'

/**
 * /indie/about: what the Indie Index bot fetches, how to keep a site out,
 * and where the starting pool comes from. Every number here comes from the
 * code (lib/indie-index), so keep them linked rather than typed in.
 */
const baseUrl = publicEnv.NEXT_PUBLIC_BASE_URL || 'https://homepageagain.com'
const link = 'underline underline-offset-2'

export default function IndieAboutPage() {
  return (
    <Layout>
      <PageMeta title="About the Indie Index" description="What ThreadsteadBot fetches, how often, and how to keep your site out of the Indie Index." path="/indie/about" />

      <article className="thread-module p-4 sm:p-6 max-w-3xl mx-auto space-y-4 text-nb-ink">
        <h1 className="thread-headline text-2xl sm:text-3xl font-bold">About the Indie Index</h1>

        <p>
          The <Link href="/indie" className={link}>Indie Index</Link> is the part of search that looks past HomePageAgain at
          personal sites. Nothing in it comes from a crawler wandering the web. Apart from a starting pool (more on that
          below), every site is there because somebody here points at it: it&apos;s their own site, or it&apos;s in their Websites list or linked from their home, or they
          vouched for it. Your own site only needs you, and anyone else&apos;s needs two of us. Links from accounts
          younger than a week wait until the account is a week old, and only public profiles count.
        </p>

        <h2 className="thread-headline text-xl font-bold pt-2">The bot</h2>
        <p>
          Once a night a small bot visits the sites in the index. It reads each site&apos;s RSS, Atom or JSON feed and
          keeps the newest {LIMITS.community.items} posts: the title, the link, the date and up to{' '}
          {LIMITS.community.excerpt.toLocaleString()} characters of text, which is what lets search find a post and not
          just a front page. About once a week it also looks at the front page for the site&apos;s name, description and
          feed, and for links to other personal sites. Those links only ever make a site a suggestion; people still decide.
        </p>
        <p>
          It asks each site for one thing at a time and waits at least two seconds between requests. It sends the usual
          &ldquo;has this changed?&rdquo; headers, so a feed with nothing new costs you almost nothing, and it follows
          robots.txt. It introduces itself as:
        </p>
        <pre className="bg-nb-surface border border-nb-ink-mid/40 rounded-md p-3 text-sm overflow-x-auto">{botUserAgent(baseUrl)}</pre>

        <h2 className="thread-headline text-xl font-bold pt-2">Keeping your site out</h2>
        <p>Either of these works, and you don&apos;t need an account. Add this to your robots.txt:</p>
        <pre className="bg-nb-surface border border-nb-ink-mid/40 rounded-md p-3 text-sm overflow-x-auto">{`User-agent: ThreadsteadBot
Disallow: /`}</pre>
        <p>or put this in your front page&apos;s &lt;head&gt;:</p>
        <pre className="bg-nb-surface border border-nb-ink-mid/40 rounded-md p-3 text-sm overflow-x-auto">{`<meta name="robots" content="noindex">`}</pre>
        <p>
          The next time the bot comes by it takes the site out, posts and all, and remembers not to add it back, even if
          people here link to it later. A robots.txt that shuts out every bot counts too. If you can&apos;t change your
          site, <Link href="/help/contact" className={link}>write to me</Link> and I&apos;ll take it out by hand.
        </p>
        <p>
          If you live here and it&apos;s your own site, there&apos;s a &ldquo;Remove my site&rdquo; button on it in
          search. To stop pointing at someone else&apos;s site, take the link off your profile or press Vouched again to
          take your vouch back.
        </p>

        <h2 className="thread-headline text-xl font-bold pt-2">The starting pool</h2>
        <p>
          So search isn&apos;t empty while the index grows, it also looks through the sites on{' '}
          <a href={KAGI_SMALLWEB_HOME} className={link} target="_blank" rel="noopener noreferrer">
            Kagi&apos;s Small Web list
          </a>
          , which is a big hand-picked list of personal blogs, shared under the MIT license (copyright 2023 Kagi Search).
          Those rank below the sites people here picked, the bot only reads them about once a month, and it keeps just
          their newest {LIMITS.pool.items} posts with a line or two of text each. When two of you vouch for one, it
          becomes one of ours.
        </p>
      </article>
    </Layout>
  )
}
