/**
 * Content extraction from HTML pages
 * Extracts metadata and clean text content
 */

import { JSDOM } from 'jsdom';

export interface ExtractedContent {
  title: string;
  description?: string;
  snippet: string;
  language?: string;
  publishedDate?: string;
  author?: string;
  keywords: string[];
  links: string[];
  contentLength: number;
  hasIndieWebMarkers: boolean;
  techStack?: string[];
  isPersonalSite?: boolean;
  isParked?: boolean;
}

export class ContentExtractor {
  private readonly MAX_SNIPPET_LENGTH = 300;
  private readonly MAX_LINKS = 20;

  async extractFromHtml(html: string, url: string, extractAllLinks = false): Promise<ExtractedContent> {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    return {
      title: this.extractTitle(document),
      description: this.extractDescription(document),
      snippet: this.extractSnippet(document),
      language: this.extractLanguage(document),
      publishedDate: this.extractPublishedDate(document),
      author: this.extractAuthor(document),
      keywords: this.extractKeywords(document),
      links: this.extractLinks(document, url, extractAllLinks),
      contentLength: this.getContentLength(document),
      hasIndieWebMarkers: this.detectIndieWebMarkers(document),
      techStack: this.detectTechStack(document, html),
      isPersonalSite: this.detectPersonalSite(document, url),
      isParked: this.detectParkedDomain(document, html)
    };
  }

  private extractTitle(document: Document): string {
    // Try multiple sources for title
    const sources = [
      () => document.querySelector('meta[property="og:title"]')?.getAttribute('content'),
      () => document.querySelector('meta[name="twitter:title"]')?.getAttribute('content'),
      () => document.querySelector('title')?.textContent,
      () => document.querySelector('h1')?.textContent
    ];

    for (const source of sources) {
      const title = source()?.trim();
      if (title && title.length > 0) {
        return title.substring(0, 200); // Reasonable title length
      }
    }

    return 'Untitled';
  }

  private extractDescription(document: Document): string | undefined {
    const sources = [
      () => document.querySelector('meta[name="description"]')?.getAttribute('content'),
      () => document.querySelector('meta[property="og:description"]')?.getAttribute('content'),
      () => document.querySelector('meta[name="twitter:description"]')?.getAttribute('content')
    ];

    for (const source of sources) {
      const description = source()?.trim();
      if (description && description.length > 0) {
        return description.substring(0, 500);
      }
    }

    return undefined;
  }

  private extractSnippet(document: Document): string {
    // Remove script, style, and other non-content elements
    const elementsToRemove = document.querySelectorAll('script, style, nav, header, footer, aside, .nav, .menu, .sidebar');
    elementsToRemove.forEach(el => el.remove());

    // Try to find main content
    const contentSelectors = [
      'main',
      'article',
      '.content',
      '.post',
      '.entry',
      '#content',
      '#main',
      'body'
    ];

    let contentElement = null;
    for (const selector of contentSelectors) {
      contentElement = document.querySelector(selector);
      if (contentElement) break;
    }

    if (!contentElement) {
      contentElement = document.body;
    }

    const textContent = contentElement.textContent || '';
    const cleanText = textContent
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    return cleanText.substring(0, this.MAX_SNIPPET_LENGTH);
  }

  private extractLanguage(document: Document): string | undefined {
    return document.documentElement.getAttribute('lang') ||
      document.querySelector('meta[http-equiv="content-language"]')?.getAttribute('content') ||
      undefined;
  }

  private extractPublishedDate(document: Document): string | undefined {
    const sources = [
      () => document.querySelector('meta[property="article:published_time"]')?.getAttribute('content'),
      () => document.querySelector('meta[name="date"]')?.getAttribute('content'),
      () => document.querySelector('time[datetime]')?.getAttribute('datetime'),
      () => document.querySelector('.published, .date, .post-date')?.textContent
    ];

    for (const source of sources) {
      const date = source()?.trim();
      if (date) {
        // Try to parse and validate the date
        const parsedDate = new Date(date);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate.toISOString().split('T')[0]; // Return YYYY-MM-DD format
        }
      }
    }

    return undefined;
  }

  private extractAuthor(document: Document): string | undefined {
    const sources = [
      () => document.querySelector('meta[name="author"]')?.getAttribute('content'),
      () => document.querySelector('meta[property="article:author"]')?.getAttribute('content'),
      () => document.querySelector('.author, .byline, .by-author')?.textContent,
      () => document.querySelector('a[rel="author"]')?.textContent
    ];

    for (const source of sources) {
      const author = source()?.trim();
      if (author && author.length > 0 && author.length < 100) {
        return author;
      }
    }

    return undefined;
  }

  private extractKeywords(document: Document): string[] {
    const keywords = new Set<string>();

    // Meta keywords
    const metaKeywords = document.querySelector('meta[name="keywords"]')?.getAttribute('content');
    if (metaKeywords) {
      metaKeywords.split(',').forEach(k => {
        const keyword = k.trim().toLowerCase();
        if (keyword.length > 2 && keyword.length < 30) {
          keywords.add(keyword);
        }
      });
    }

    // Extract from headings
    const headings = document.querySelectorAll('h1, h2, h3');
    headings.forEach(heading => {
      const text = heading.textContent?.toLowerCase() || '';
      const words = text.split(/\s+/).filter(w => w.length > 3 && w.length < 20);
      words.slice(0, 3).forEach(word => keywords.add(word)); // Limit per heading
    });

    return Array.from(keywords).slice(0, 10); // Limit total keywords
  }

  private extractLinks(document: Document, baseUrl: string, extractAll = false): string[] {
    const links = new Set<string>();
    const linkElements = document.querySelectorAll('a[href]');
    const maxLinks = extractAll ? Infinity : this.MAX_LINKS;

    for (const link of Array.from(linkElements)) {
      try {
        const href = link.getAttribute('href');
        if (!href) continue;

        // Skip anchors and non-http(s) protocols
        if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
          continue;
        }

        let absoluteUrl;
        if (href.startsWith('http')) {
          absoluteUrl = href;
        } else if (href.startsWith('/')) {
          const base = new URL(baseUrl);
          absoluteUrl = `${base.protocol}//${base.host}${href}`;
        } else {
          absoluteUrl = new URL(href, baseUrl).toString();
        }

        // Include ALL links (both internal and external)
        links.add(absoluteUrl);
        if (links.size >= maxLinks) break;
      } catch {
        // Skip invalid URLs
      }
    }

    return Array.from(links);
  }

  private getContentLength(document: Document): number {
    return (document.body?.textContent || '').length;
  }

  private detectIndieWebMarkers(document: Document): boolean {
    // Look for common IndieWeb markers
    const markers = [
      'rel="me"',
      'class="h-card"',
      'class="h-entry"',
      'class="p-name"',
      'class="dt-published"',
      'microformats',
      'webmention',
      'indieauth'
    ];

    const htmlContent = document.documentElement.outerHTML.toLowerCase();
    return markers.some(marker => htmlContent.includes(marker));
  }

  private detectTechStack(document: Document, html: string): string[] {
    const techStack = new Set<string>();

    // Generator meta tag
    const generator = document.querySelector('meta[name="generator"]')?.getAttribute('content');
    if (generator) {
      const tech = generator.toLowerCase();
      if (tech.includes('hugo')) techStack.add('Hugo');
      if (tech.includes('jekyll')) techStack.add('Jekyll');
      if (tech.includes('gatsby')) techStack.add('Gatsby');
      if (tech.includes('next')) techStack.add('Next.js');
      if (tech.includes('wordpress')) techStack.add('WordPress');
      if (tech.includes('ghost')) techStack.add('Ghost');
    }

    // Framework detection from HTML patterns
    const htmlLower = html.toLowerCase();
    if (htmlLower.includes('_next/')) techStack.add('Next.js');
    if (htmlLower.includes('gatsby')) techStack.add('Gatsby');
    if (htmlLower.includes('nuxt')) techStack.add('Nuxt.js');
    if (htmlLower.includes('wp-content')) techStack.add('WordPress');

    return Array.from(techStack);
  }

  private detectPersonalSite(document: Document, url: string): boolean {
    const title = this.extractTitle(document).toLowerCase();
    const description = this.extractDescription(document)?.toLowerCase() || '';
    const snippet = this.extractSnippet(document).toLowerCase();

    const personalIndicators = [
      'personal', 'blog', 'portfolio', 'about me', 'my name is',
      'i am', "i'm", 'my work', 'my projects', 'my thoughts',
      'resume', 'cv', 'hire me', 'contact me'
    ];

    const text = `${title} ${description} ${snippet}`;

    return personalIndicators.some(indicator => text.includes(indicator)) ||
      this.hasPersonalDomainPattern(url);
  }

  private hasPersonalDomainPattern(url: string): boolean {
    try {
      const hostname = new URL(url).hostname.toLowerCase();

      // Common personal domain patterns
      const personalPatterns = [
        /^[a-z]+\.(me|dev|blog|site)$/,
        /^[a-z]+[a-z-]*\.(com|net|org)$/,
        /^\w+\.name$/
      ];

      return personalPatterns.some(pattern => pattern.test(hostname));
    } catch {
      return false;
    }
  }

  private detectParkedDomain(document: Document, html: string): boolean {
    const htmlLower = html.toLowerCase();

    // 1. Check for known parking scripts and assets
    const parkingIndicators = [
      'parking-lander',
      'sedoparking',
      'parklogic',
      'bodis.com',
      'voodoo.com',
      'domains/caf.js', // Google AdSense for Domains
      'dsnextgen.com',
      'parkingcrew.net',
      'teaminternet.com',
      'px-cloud.net'
    ];

    if (parkingIndicators.some(indicator => htmlLower.includes(indicator))) {
      return true;
    }

    // 2. Check for common parked text patterns
    const title = this.extractTitle(document).toLowerCase();
    const text = document.body?.textContent?.toLowerCase() || '';

    const textIndicators = [
      'domain is for sale',
      'this domain is for sale',
      'buy this domain',
      'inquire about this domain',
      'domain name is available',
      'parked at',
      'domain parked',
      'related searches', // Common on parking pages
      'related links'
    ];

    const combinedText = title + ' ' + text;
    if (textIndicators.some(indicator => combinedText.includes(indicator))) {
      return true;
    }

    // 3. Check for specific GoDaddy/Registrar patterns
    if (htmlLower.includes('lander_system') || htmlLower.includes('window.parked')) {
      return true;
    }

    return false;
  }
}