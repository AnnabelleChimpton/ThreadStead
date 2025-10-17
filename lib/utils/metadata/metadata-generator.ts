/**
 * Metadata generation utilities for ThreadStead
 * Provides consistent, SEO-optimized metadata across all pages
 */

export interface MetadataConfig {
  title: string;
  description?: string;
  keywords?: string[];
  image?: string;
  imageAlt?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  siteName?: string;
  locale?: string;
  canonical?: string;
  noIndex?: boolean;
  structuredData?: Record<string, any>;
}

export interface SiteConfig {
  site_name?: string;
  site_description?: string;
  site_url?: string;
  default_og_image?: string;
}

export class MetadataGenerator {
  protected baseUrl: string;
  protected siteName: string;
  protected defaultDescription: string;
  protected defaultImage: string;

  constructor(
    baseUrl: string = process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000',
    siteConfig?: SiteConfig
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    // ThreadStead is the platform name - fallback when site_name unavailable
    this.siteName = siteConfig?.site_name || 'ThreadStead';
    this.defaultDescription = siteConfig?.site_description || 'A community platform for connecting through ThreadRings and sharing content.';
    this.defaultImage = siteConfig?.default_og_image || '/assets/default-og-image.png';
  }

  /**
   * Generate complete HTML head metadata
   */
  generateHeadMetadata(config: MetadataConfig): string {
    const title = this.formatTitle(config.title);
    const description = config.description || this.defaultDescription;
    const image = this.resolveImageUrl(config.image || this.defaultImage);
    const url = config.url ? `${this.baseUrl}${config.url}` : undefined;
    const type = config.type || 'website';

    let html = '';

    // Basic meta tags
    html += `<title>${this.escapeHtml(title)}</title>\n`;
    html += `<meta name="description" content="${this.escapeHtml(description)}" />\n`;

    if (config.keywords && config.keywords.length > 0) {
      html += `<meta name="keywords" content="${this.escapeHtml(config.keywords.join(', '))}" />\n`;
    }

    if (config.author) {
      html += `<meta name="author" content="${this.escapeHtml(config.author)}" />\n`;
    }

    // Canonical URL
    if (url) {
      html += `<link rel="canonical" href="${url}" />\n`;
    }

    // Robots meta
    if (config.noIndex) {
      html += `<meta name="robots" content="noindex, nofollow" />\n`;
    } else {
      html += `<meta name="robots" content="index, follow" />\n`;
    }

    // OpenGraph meta tags
    html += `<meta property="og:title" content="${this.escapeHtml(title)}" />\n`;
    html += `<meta property="og:description" content="${this.escapeHtml(description)}" />\n`;
    html += `<meta property="og:type" content="${type}" />\n`;
    html += `<meta property="og:image" content="${image}" />\n`;

    if (config.imageAlt) {
      html += `<meta property="og:image:alt" content="${this.escapeHtml(config.imageAlt)}" />\n`;
    }

    if (url) {
      html += `<meta property="og:url" content="${url}" />\n`;
    }

    html += `<meta property="og:site_name" content="${this.escapeHtml(this.siteName)}" />\n`;
    html += `<meta property="og:locale" content="${config.locale || 'en_US'}" />\n`;

    // Article-specific OpenGraph
    if (type === 'article') {
      if (config.author) {
        html += `<meta property="article:author" content="${this.escapeHtml(config.author)}" />\n`;
      }
      if (config.publishedTime) {
        html += `<meta property="article:published_time" content="${config.publishedTime}" />\n`;
      }
      if (config.modifiedTime) {
        html += `<meta property="article:modified_time" content="${config.modifiedTime}" />\n`;
      }
    }

    // Social media card meta tags
    html += `<meta name="twitter:card" content="summary_large_image" />\n`;
    html += `<meta name="twitter:title" content="${this.escapeHtml(title)}" />\n`;
    html += `<meta name="twitter:description" content="${this.escapeHtml(description)}" />\n`;
    html += `<meta name="twitter:image" content="${image}" />\n`;

    // Structured data (JSON-LD)
    if (config.structuredData) {
      const jsonLd = JSON.stringify(config.structuredData, null, 0);
      html += `<script type="application/ld+json">${jsonLd}</script>\n`;
    }

    return html;
  }


  /**
   * Format page title with site name
   */
  private formatTitle(title: string): string {
    if (title === this.siteName) {
      return title;
    }
    return `${title} | ${this.siteName}`;
  }

  /**
   * Resolve relative image URLs to absolute URLs
   */
  private resolveImageUrl(imageUrl: string): string {
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    if (imageUrl.startsWith('/')) {
      return `${this.baseUrl}${imageUrl}`;
    }
    return `${this.baseUrl}/${imageUrl}`;
  }

  /**
   * Escape HTML entities in strings
   */
  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Truncate text to specified length with ellipsis
   */
  static truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3).trim() + '...';
  }

  /**
   * Clean and normalize text for metadata use
   */
  static cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[\r\n\t]/g, ' ') // Remove line breaks and tabs
      .trim();
  }

  /**
   * Extract keywords from text content
   */
  static extractKeywords(text: string, maxKeywords: number = 10): string[] {
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3); // Filter out short words

    // Count word frequency
    const wordCount: Record<string, number> = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    // Sort by frequency and return top keywords
    return Object.entries(wordCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, maxKeywords)
      .map(([word]) => word);
  }
}

// Default metadata generator instance
export const metadataGenerator = new MetadataGenerator();