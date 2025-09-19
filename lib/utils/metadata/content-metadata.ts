/**
 * Content-specific metadata generators
 * Specialized functions for user profiles, posts, ThreadRings, etc.
 */

import { MetadataGenerator, MetadataConfig } from './metadata-generator';

export interface UserProfile {
  handle: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  postCount?: number;
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

export class ContentMetadataGenerator extends MetadataGenerator {
  /**
   * Generate metadata for user profile pages
   */
  generateUserProfileMetadata(user: UserProfile): MetadataConfig {
    const displayName = user.displayName || user.handle;
    const handle = user.handle.startsWith('@') ? user.handle : `@${user.handle}`;

    // Create title
    const title = user.displayName && user.displayName !== user.handle
      ? `${displayName} (${handle})`
      : handle;

    // Create description
    let description = '';
    if (user.bio) {
      description = MetadataGenerator.cleanText(user.bio);
      description = MetadataGenerator.truncateText(description, 155);
    } else {
      description = `${displayName}'s profile on ThreadStead. Join the community to connect and discover their content.`;
    }

    // Extract keywords from bio
    const keywords = user.bio
      ? ['profile', 'user', 'threadstead', 'community', ...MetadataGenerator.extractKeywords(user.bio, 5)]
      : ['profile', 'user', 'threadstead', 'community'];

    // Generate structured data
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      mainEntity: {
        '@type': 'Person',
        name: displayName,
        alternateName: handle,
        description: user.bio || `${displayName}'s profile`,
        url: `${this.baseUrl}/resident/${user.handle}`,
        image: user.avatarUrl,
        ...(user.joinedAt && {
          memberOf: {
            '@type': 'Organization',
            name: 'ThreadStead',
            url: this.baseUrl
          }
        })
      }
    };

    return {
      title,
      description,
      keywords,
      image: user.avatarUrl,
      imageAlt: `${displayName}'s profile picture`,
      url: `/resident/${user.handle}`,
      type: 'profile',
      structuredData
    };
  }

  /**
   * Generate metadata for individual blog posts
   */
  generateBlogPostMetadata(post: BlogPost, userHandle: string): MetadataConfig {
    const authorDisplayName = post.author.displayName || post.author.handle;
    const authorHandle = post.author.handle.startsWith('@') ? post.author.handle : `@${post.author.handle}`;

    // Extract title from content if not provided
    let title = post.title;
    if (!title) {
      const content = post.bodyMarkdown || post.bodyText || post.bodyHtml || '';
      const lines = content.split('\n').filter(line => line.trim());
      if (lines.length > 0) {
        title = MetadataGenerator.cleanText(lines[0]);
        title = MetadataGenerator.truncateText(title, 60);
      } else {
        title = `Post by ${authorDisplayName}`;
      }
    }

    // Create description from post content
    let description = '';
    const content = post.bodyMarkdown || post.bodyText || post.bodyHtml || '';
    if (content) {
      // Remove markdown/HTML formatting for description
      const cleanContent = content
        .replace(/#{1,6}\s+/g, '') // Remove markdown headers
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
        .replace(/\*(.*?)\*/g, '$1') // Remove italic
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Remove markdown links

      description = MetadataGenerator.cleanText(cleanContent);
      description = MetadataGenerator.truncateText(description, 155);
    }

    if (!description) {
      description = `A post by ${authorDisplayName} on ThreadStead.`;
    }

    // Extract keywords from content
    const keywords = content
      ? ['post', 'blog', 'threadstead', authorHandle.replace('@', ''), ...MetadataGenerator.extractKeywords(content, 6)]
      : ['post', 'blog', 'threadstead', authorHandle.replace('@', '')];

    // Add ThreadRing keywords if available
    if (post.threadRings && post.threadRings.length > 0) {
      keywords.push(...post.threadRings.map(ring => ring.name.toLowerCase()));
    }

    // Generate structured data
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: title,
      description,
      author: {
        '@type': 'Person',
        name: authorDisplayName,
        url: `${this.baseUrl}/resident/${post.author.handle}`,
        ...(post.author.avatarUrl && { image: post.author.avatarUrl })
      },
      datePublished: post.createdAt,
      ...(post.updatedAt && { dateModified: post.updatedAt }),
      publisher: {
        '@type': 'Organization',
        name: 'ThreadStead',
        url: this.baseUrl
      },
      url: `${this.baseUrl}/resident/${userHandle}/post/${post.id}`,
      ...(post.threadRings && post.threadRings.length > 0 && {
        keywords: post.threadRings.map(ring => ring.name).join(', ')
      })
    };

    return {
      title,
      description,
      keywords,
      image: post.author.avatarUrl || undefined,
      imageAlt: `${authorDisplayName}'s avatar`,
      url: `/resident/${userHandle}/post/${post.id}`,
      type: 'article',
      author: authorDisplayName,
      publishedTime: post.createdAt,
      modifiedTime: post.updatedAt,
      structuredData
    };
  }

  /**
   * Generate metadata for ThreadRing pages
   */
  generateThreadRingMetadata(ring: ThreadRing): MetadataConfig {
    const title = ring.name;

    // Create description from ring description and stats
    let description = '';
    if (ring.description) {
      description = MetadataGenerator.cleanText(ring.description);
    } else if (ring.curatorNote) {
      description = MetadataGenerator.cleanText(ring.curatorNote);
    } else {
      description = `${ring.name} - A ThreadRing community`;
    }

    // Add community stats to description
    if (ring.memberCount || ring.postCount) {
      const stats = [];
      if (ring.memberCount) stats.push(`${ring.memberCount} members`);
      if (ring.postCount) stats.push(`${ring.postCount} posts`);
      description += ` • ${stats.join(' • ')}`;
    }

    description = MetadataGenerator.truncateText(description, 155);

    // Extract keywords from ring content
    const keywords = ['threadring', 'community', 'threadstead'];
    if (ring.description) {
      keywords.push(...MetadataGenerator.extractKeywords(ring.description, 5));
    }
    keywords.push(ring.name.toLowerCase().replace(/\s+/g, ''));

    // Generate structured data
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: ring.name,
      description: ring.description || ring.curatorNote || `${ring.name} ThreadRing community`,
      url: `${this.baseUrl}/tr/${ring.slug}`,
      ...(ring.curator && {
        founder: {
          '@type': 'Person',
          name: ring.curator.displayName || ring.curator.handle,
          url: `${this.baseUrl}/resident/${ring.curator.handle}`
        }
      }),
      ...(ring.memberCount && { numberOfEmployees: ring.memberCount }),
      ...(ring.createdAt && { foundingDate: ring.createdAt }),
      parentOrganization: {
        '@type': 'Organization',
        name: 'ThreadStead',
        url: this.baseUrl
      }
    };

    return {
      title,
      description,
      keywords,
      url: `/tr/${ring.slug}`,
      type: 'website',
      structuredData
    };
  }

  /**
   * Generate metadata for homepage
   */
  generateHomepageMetadata(siteConfig?: any): MetadataConfig {
    const title = siteConfig?.site_name || 'ThreadStead';
    const description = siteConfig?.site_description ||
      'Join ThreadStead - a community platform where you can connect through ThreadRings, share content, and discover new voices. Create your profile and start building connections today.';

    const keywords = [
      'threadstead', 'community', 'social', 'threadrings', 'blogging',
      'connections', 'profiles', 'content sharing', 'indie web'
    ];

    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: title,
      description,
      url: this.baseUrl,
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${this.baseUrl}/discover?q={search_term_string}`
        },
        'query-input': 'required name=search_term_string'
      },
      ...(siteConfig?.site_name && {
        publisher: {
          '@type': 'Organization',
          name: siteConfig.site_name,
          url: this.baseUrl
        }
      })
    };

    return {
      title,
      description,
      keywords,
      url: '/',
      type: 'website',
      structuredData
    };
  }

  /**
   * Generate metadata for discover/search pages
   */
  generateDiscoverMetadata(searchQuery?: string): MetadataConfig {
    const title = searchQuery
      ? `Search results for "${searchQuery}"`
      : 'Discover Communities';

    const description = searchQuery
      ? `Find ThreadRings, users, and content related to "${searchQuery}" on ThreadStead.`
      : 'Explore ThreadRings, discover new communities, and find interesting content on ThreadStead. Search the indie web and connect with like-minded people.';

    const keywords = searchQuery
      ? ['search', 'discover', 'results', 'threadstead', ...searchQuery.split(' ').filter(word => word.length > 2)]
      : ['discover', 'explore', 'community', 'threadrings', 'search', 'threadstead'];

    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'SearchResultsPage',
      name: title,
      description,
      url: searchQuery
        ? `${this.baseUrl}/discover?q=${encodeURIComponent(searchQuery)}`
        : `${this.baseUrl}/discover`
    };

    return {
      title,
      description,
      keywords,
      url: searchQuery ? `/discover?q=${encodeURIComponent(searchQuery)}` : '/discover',
      type: 'website',
      structuredData
    };
  }
}

// Default content metadata generator instance
export const contentMetadataGenerator = new ContentMetadataGenerator();