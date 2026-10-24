// What a page of your own HTML can and can't do here, in plain words. The
// rules it describes live in lib/templates/compilation/html-allowlist.ts (tags
// and attributes), lib/utils/sanitization/css.ts (CSS), next.config.ts (the
// Content-Security-Policy: images, fonts, frames, forms), lib/templates/
// limits.ts (size) and lib/templates/embeds.ts (<Embed> hosts). Change this
// page when one of those changes.
import Link from "next/link";
import { GetServerSideProps } from "next";
import Layout from "@/components/ui/layout/Layout";
import RetroCard from "@/components/ui/layout/RetroCard";
import PageHeader from "@/components/ui/layout/PageHeader";
import ButtonLink from "@/components/ui/ButtonLink";
import { getSiteConfig, SiteConfig } from "@/lib/config/site/dynamic";
import { MAX_CSS_CHARS, MAX_TEMPLATE_CHARS } from "@/lib/templates/limits";
import PageMeta from "@/components/ui/layout/PageMeta";

interface WhatWorksHereProps {
  siteConfig: SiteConfig;
}

const kb = (chars: number) => Math.round(chars / 1000);

function Code({ children }: { children: React.ReactNode }) {
  return <code className="px-1 py-0.5 bg-thread-cream border border-thread-sage/40 rounded text-[0.9em]">{children}</code>;
}

function Example({ children }: { children: string }) {
  return (
    <pre className="my-3 p-3 bg-thread-cream border border-thread-sage/40 rounded text-sm overflow-x-auto whitespace-pre-wrap">
      <code>{children}</code>
    </pre>
  );
}

export default function WhatWorksHere({ siteConfig }: WhatWorksHereProps) {
  return (
    <>
      <PageMeta title="What works here" description="What a page of your own HTML can do here: the tags, CSS, images, fonts and embeds that work, and the few things that don't." path="/build/what-works-here" />
      <Layout siteConfig={siteConfig}>
        <div className="space-y-6">
          <PageHeader title="What works here">
            <p>
              Your page here is one HTML page you write yourself, plus some CSS. If you&apos;ve made a page on
              Neocities or GeoCities or anywhere like that, most of what you know works the same. This is the list
              of what&apos;s different, so you don&apos;t have to find out by trial and error.
            </p>
            <p className="flex flex-wrap gap-3 pt-2">
              <ButtonLink href="/build/html">Lessons</ButtonLink>
              <ButtonLink href="/build/templates/components" variant="secondary">
                Component reference
              </ButtonLink>
            </p>
          </PageHeader>

          <RetroCard title="HTML">
            <div className="space-y-3 px-4 sm:px-0">
              <p>
                Nearly all of it. Headings, tables, lists, details and summary, figure, the lot. The old stuff works
                too, so <Code>&lt;center&gt;</Code>, <Code>&lt;font&gt;</Code>, <Code>&lt;marquee&gt;</Code> and{" "}
                <Code>&lt;blink&gt;</Code> are all fine (I couldn&apos;t not). You can draw with inline SVG, including
                gradients and filters.
              </p>
              <p>
                If you paste in a whole page with <Code>&lt;html&gt;</Code> and <Code>&lt;head&gt;</Code> and all,
                the editor keeps your title and moves your <Code>&lt;style&gt;</Code> blocks and Google Fonts links
                over to the CSS tab for you. Anything it had to take out gets listed under the editor, with the line
                it was on.
              </p>
            </div>
          </RetroCard>

          <RetroCard title="No JavaScript, but there are components">
            <div className="space-y-3 px-4 sm:px-0">
              <p>
                Scripts get taken out, and so do <Code>onclick=</Code> style attributes and{" "}
                <Code>javascript:</Code> links. Your page lives at this site&apos;s address, so a script on it could
                act as whoever is visiting, and I&apos;m not willing to take that chance with people&apos;s accounts.
              </p>
              <p>
                For the fun stuff there are components instead. They look like HTML tags with a capital letter, and
                there are ones for clicking things, keeping count, showing and hiding, tabs, and a lot more:
              </p>
              <Example>{`<Var name="likes" type="number" initial="0" />
<Button>
  <OnClick><Increment var="likes" /></OnClick>
  Like this page
</Button>
<p><ShowVar name="likes" /> likes</p>`}</Example>
              <p>
                Some components show your actual ThreadStead stuff, like <Code>&lt;Guestbook /&gt;</Code>, your blog
                posts or your friends. The <Link href="/build/templates/components" className="underline">component reference</Link>{" "}
                has every one of them with an example you can copy.
              </p>
            </div>
          </RetroCard>

          <RetroCard title="Videos and music from other sites">
            <div className="space-y-3 px-4 sm:px-0">
              <p>
                Iframes get taken out, so the embed code YouTube gives you won&apos;t work as is. Use{" "}
                <Code>&lt;Embed&gt;</Code> with the link instead. It works with YouTube, Vimeo, Bandcamp, SoundCloud
                and Spotify:
              </p>
              <Example>{`<Embed src="https://www.youtube.com/watch?v=..." />`}</Example>
              <p>
                For Bandcamp, use their embed code (Share, then Embed). You can paste the whole thing into src, or
                just the link out of it, since their normal page links don&apos;t say which album it is.
              </p>
              <p>
                The player only loads when someone clicks it. Until then the other site doesn&apos;t know anyone
                looked at your page, which is how I&apos;d want it if I were visiting.
              </p>
            </div>
          </RetroCard>

          <RetroCard title="Images, sound and video files">
            <div className="space-y-3 px-4 sm:px-0">
              <p>
                Upload pictures on your Media page and press Copy link to get a link you can use in an{" "}
                <Code>&lt;img&gt;</Code> tag or in your CSS. PNG, GIF and WebP stay exactly as you uploaded them, so
                pixel art stays crisp and GIFs keep moving. The editor has an Insert image button too.
              </p>
              <p>
                Pictures, audio and video from other sites work as long as the link starts with https. The site
                they&apos;re on can see who views them, the same as anywhere else on the web.
              </p>
            </div>
          </RetroCard>

          <RetroCard title="CSS and fonts">
            <div className="space-y-3 px-4 sm:px-0">
              <p>
                Your CSS goes in the CSS tab. It can style everything on your page. The only thing it can&apos;t
                do is <Code>@import</Code> from other sites, with one exception, which is Google Fonts:
              </p>
              <Example>{`@import url("https://fonts.googleapis.com/css2?family=VT323&display=swap");

h1 { font-family: "VT323", monospace; }`}</Example>
              <p>
                Font files can come from anywhere with an https address, as long as the site they&apos;re on lets other
                sites use them:
              </p>
              <Example>{`@font-face {
  font-family: "Pixel";
  src: url("https://yoursite.neocities.org/fonts/pixel.woff2");
}`}</Example>
              <p>
                The site&apos;s own styles can be on or off. On, your CSS adds to
                them. Off, the site&apos;s theme is left out and your CSS does the rest. That&apos;s the Site styles
                menu in the editor.
              </p>
              <p id="theme-options">
                Theme options are a trick I borrowed from Tumblr. Put a <Code>&lt;meta&gt;</Code> tag in your HTML for
                any colour or font you&apos;d like to be easy to change, and use it in your CSS as a variable. The name
                after the colon becomes the variable&apos;s name. Then Settings &gt; Your page shows a picker for each
                one, so you or a friend can change them without opening the code:
              </p>
              <Example>{`<!-- in your HTML -->
<meta name="color:Accent" content="#c96633">
<meta name="font:Headings" content="Georgia, serif">

/* in your CSS */
h1 { color: var(--color-accent); font-family: var(--font-headings); }`}</Example>
            </div>
          </RetroCard>

          <RetroCard title="Forms">
            <div className="space-y-3 px-4 sm:px-0">
              <p>
                Forms show up and people can fill them in, but they can&apos;t send anything to another website.
                That stops anyone putting a fake login box on a page here and collecting what people type. If you
                want people to leave you a message, <Code>&lt;Guestbook /&gt;</Code> is the way to do it.
              </p>
            </div>
          </RetroCard>

          <RetroCard title="One page, and the bits that stay">
            <div className="space-y-3 px-4 sm:px-0">
              <p>
                You get one page. Your posts, pictures and guestbook show up wherever you put{" "}
                <Code>&lt;BlogPosts /&gt;</Code>, <Code>&lt;MediaGrid /&gt;</Code> and <Code>&lt;Guestbook /&gt;</Code>,
                and every post has its own page too, where people can comment. You can link to anything with a
                normal link. A page can be up to {kb(MAX_TEMPLATE_CHARS)} KB of HTML and{" "}
                {kb(MAX_CSS_CHARS)} KB of CSS, which is a lot more than it sounds.
              </p>
              <p>
                You can hide the site&apos;s navigation bar on your page, but a small strip stays at the top so
                visitors can always get back to the rest of the site.
              </p>
              <p>
                If you want people to be able to see how you made your page, tick &quot;Visitors can view my
                source&quot; in the editor. It&apos;s off until you turn it on.
              </p>
              <p>
                If you run into something that should work and doesn&apos;t, tell me! - Annabelle
              </p>
            </div>
          </RetroCard>
        </div>
      </Layout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<WhatWorksHereProps> = async () => {
  const siteConfig = await getSiteConfig();
  return { props: { siteConfig } };
};
