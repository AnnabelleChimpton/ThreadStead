import React from "react";
import Head from "next/head";
import { getSiteBaseUrl } from "@/lib/config/site-url";
import { SITE_TITLE } from "@/lib/config/site/constants";
import type { PageImage } from "@/lib/share-images";
import { previewText } from "@/lib/utils/metadata/preview-text";

interface PageMetaProps {
  /** The page's own name; the tab reads "<title> | HomePageAgain" */
  title: string;
  /** The tab's exact text instead (a resident's page with its own <title>) */
  tabTitle?: string;
  description?: string;
  /** The page's one true address (a path, or a full URL), for canonical and og:url */
  path?: string;
  /** Without one, the site's default share image (pages/_app.tsx) */
  image?: PageImage;
  type?: "website" | "article" | "profile";
  noIndex?: boolean;
  /** Anything else for <head> (structured data, feed links) */
  children?: React.ReactNode;
}

const absolute = (url: string) => new URL(url, getSiteBaseUrl()).toString();

/**
 * A page's title, description and link-preview tags (Open Graph, Twitter/X).
 * Every tag is keyed: Next only de-duplicates keyed tags, so this replaces the
 * site-wide defaults in pages/_app.tsx instead of sending a second copy, which
 * some apps show as two cards or two images. Every URL is absolute, as
 * previews need. A wide image gets the large card; anything squarer (an
 * avatar) gets the small one rather than a stretched banner.
 */
export default function PageMeta({ title, tabTitle, description: rawDescription, path, image, type = "website", noIndex = false, children }: PageMetaProps) {
  const description = rawDescription ? previewText(rawDescription) : undefined;
  const fullTitle = tabTitle || (title === SITE_TITLE ? title : `${title} | ${SITE_TITLE}`);
  const url = path ? absolute(path) : undefined;
  const wide = !!image?.width && !!image?.height && image.width / image.height >= 1.3;

  return (
    <Head>
      <title key="title">{fullTitle}</title>
      {description && <meta key="description" name="description" content={description} />}
      {url && <link key="canonical" rel="canonical" href={url} />}
      {noIndex && <meta key="robots" name="robots" content="noindex" />}

      <meta key="og:title" property="og:title" content={title} />
      {description && <meta key="og:description" property="og:description" content={description} />}
      <meta key="og:type" property="og:type" content={type} />
      {url && <meta key="og:url" property="og:url" content={url} />}
      <meta key="og:site_name" property="og:site_name" content={SITE_TITLE} />

      <meta key="twitter:title" name="twitter:title" content={title} />
      {description && <meta key="twitter:description" name="twitter:description" content={description} />}

      {image && <meta key="og:image" property="og:image" content={absolute(image.url)} />}
      {!!image?.width && <meta key="og:image:width" property="og:image:width" content={String(image.width)} />}
      {!!image?.height && <meta key="og:image:height" property="og:image:height" content={String(image.height)} />}
      {image && <meta key="og:image:alt" property="og:image:alt" content={image.alt ?? title} />}
      {image && <meta key="twitter:image" name="twitter:image" content={absolute(image.url)} />}
      {image && <meta key="twitter:card" name="twitter:card" content={wide ? "summary_large_image" : "summary"} />}

      {children}
    </Head>
  );
}
