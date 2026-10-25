import Head from "next/head";

/**
 * A page's Google Fonts as links in the head, where the browser finds them
 * first (lib/templates/rendering/page-css.ts takes them out of the page's
 * CSS). The live page and the editor's preview both render it.
 */
export default function PageFonts({ hrefs }: { hrefs: readonly string[] }) {
  if (hrefs.length === 0) return null;
  return (
    <Head>
      <link key="fonts-googleapis" rel="preconnect" href="https://fonts.googleapis.com" />
      <link key="fonts-gstatic" rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      {hrefs.map((href) => (
        <link key={`font:${href}`} rel="stylesheet" href={href} />
      ))}
    </Head>
  );
}
