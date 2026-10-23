/**
 * The title, description and structured data (JSON-LD) of the pages people
 * share most: profiles, posts, rings and the homepage. PageMeta puts them in
 * the <head>.
 */
import { getSiteBaseUrl } from '@/lib/config/site-url';
import { SITE_TITLE } from '@/lib/config/site/constants';
import { UNTITLED_POST } from '@/lib/domain/posts/title';
import { countOf } from '@/lib/utils/count-of';
import { previewText } from '@/lib/utils/metadata/preview-text';

export interface PageMetadata {
  title: string;
  description: string;
  /** The page's path */
  url: string;
  structuredData: Record<string, unknown>;
}

export interface PostMetadata extends PageMetadata {
  author: string;
  publishedTime: string;
  modifiedTime?: string;
}

export interface UserProfile {
  handle: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  joinedAt?: string;
}

export interface BlogPost {
  id: string;
  title?: string | null;
  bodyText?: string | null;
  bodyMarkdown?: string | null;
  bodyHtml?: string | null;
  createdAt: string;
  updatedAt?: string;
  author: {
    handle: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  };
  threadRings?: Array<{
    name: string;
    slug: string;
  }>;
}

export interface ThreadRing {
  slug: string;
  name: string;
  description?: string;
  curatorNote?: string;
  memberCount?: number;
  postCount?: number;
  visibility: string;
  curator?: {
    handle: string;
    displayName?: string;
  };
  createdAt?: string;
}

/** A post's words without markdown or HTML. */
function plainText(content: string): string {
  return content
    .replace(/#{1,6}\s+/g, '') // headers
    .replace(/\*\*(.*?)\*\*/g, '$1') // bold
    .replace(/\*(.*?)\*/g, '$1') // italic
    .replace(/<[^>]*>/g, '') // HTML tags
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // links
}

export class ContentMetadataGenerator {
  private baseUrl: string;

  constructor(baseUrl: string = getSiteBaseUrl()) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private get site() {
    return { '@type': 'Organization', name: SITE_TITLE, url: this.baseUrl };
  }

  generateUserProfileMetadata(user: UserProfile): PageMetadata {
    const displayName = user.displayName || user.handle;
    const handle = user.handle.startsWith('@') ? user.handle : `@${user.handle}`;
    const title = user.displayName && user.displayName !== user.handle ? `${displayName} (${handle})` : handle;

    return {
      title,
      description: user.bio ? previewText(user.bio) : `${displayName}'s page on ${SITE_TITLE}.`,
      url: `/resident/${user.handle}`,
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        mainEntity: {
          '@type': 'Person',
          name: displayName,
          alternateName: handle,
          description: user.bio || `${displayName}'s profile`,
          url: `${this.baseUrl}/resident/${user.handle}`,
          image: user.avatarUrl,
          ...(user.joinedAt && { memberOf: this.site }),
        },
      },
    };
  }

  generateBlogPostMetadata(post: BlogPost, userHandle: string): PostMetadata {
    const authorDisplayName = post.author.displayName || post.author.handle;
    // An untitled post's words go in the description, so the title doesn't repeat them
    const title = post.title && post.title !== UNTITLED_POST ? post.title : `A post by ${authorDisplayName}`;
    const content = post.bodyMarkdown || post.bodyText || post.bodyHtml || '';
    const description = previewText(plainText(content)) || `A post by ${authorDisplayName} on ${SITE_TITLE}.`;

    return {
      title,
      description,
      url: `/resident/${userHandle}/post/${post.id}`,
      author: authorDisplayName,
      publishedTime: post.createdAt,
      modifiedTime: post.updatedAt,
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: title,
        description,
        author: {
          '@type': 'Person',
          name: authorDisplayName,
          url: `${this.baseUrl}/resident/${post.author.handle}`,
          ...(post.author.avatarUrl && { image: post.author.avatarUrl }),
        },
        datePublished: post.createdAt,
        ...(post.updatedAt && { dateModified: post.updatedAt }),
        publisher: this.site,
        url: `${this.baseUrl}/resident/${userHandle}/post/${post.id}`,
        ...(post.threadRings?.length && { keywords: post.threadRings.map((ring) => ring.name).join(', ') }),
      },
    };
  }

  generateThreadRingMetadata(ring: ThreadRing): PageMetadata {
    const about = ring.description || ring.curatorNote || `${ring.name} - A ThreadRing community`;
    const stats = [
      ring.memberCount ? countOf(ring.memberCount, 'member') : null,
      ring.postCount ? countOf(ring.postCount, 'post') : null,
    ].filter(Boolean);

    return {
      title: ring.name,
      description: previewText([about, ...stats].join(' • ')),
      url: `/tr/${ring.slug}`,
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: ring.name,
        description: ring.description || ring.curatorNote || `${ring.name} ThreadRing community`,
        url: `${this.baseUrl}/tr/${ring.slug}`,
        ...(ring.curator && {
          founder: {
            '@type': 'Person',
            name: ring.curator.displayName || ring.curator.handle,
            url: `${this.baseUrl}/resident/${ring.curator.handle}`,
          },
        }),
        ...(ring.memberCount && { numberOfEmployees: ring.memberCount }),
        ...(ring.createdAt && { foundingDate: ring.createdAt }),
        parentOrganization: this.site,
      },
    };
  }

  generateHomepageMetadata(siteConfig?: { site_description?: string }): PageMetadata {
    const description = siteConfig?.site_description ||
      `Join ${SITE_TITLE}, a community platform where you can connect through ThreadRings, share content, and discover new voices. Create your profile and start building connections today.`;

    return {
      title: SITE_TITLE,
      description,
      url: '/',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_TITLE,
        description,
        url: this.baseUrl,
        potentialAction: {
          '@type': 'SearchAction',
          target: { '@type': 'EntryPoint', urlTemplate: `${this.baseUrl}/search?q={search_term_string}` },
          'query-input': 'required name=search_term_string',
        },
        publisher: this.site,
      },
    };
  }
}

export const contentMetadataGenerator = new ContentMetadataGenerator();
