/**
 * Domain classifier for categorizing sites by platform type
 * Determines how sites should be processed and indexed
 */

import { corporatePlatforms } from './corporate-platforms';

export type PlatformType = 'independent' | 'indie_platform' | 'corporate_profile' | 'corporate_generic' | 'unknown';
export type IndexingPurpose = 'full_index' | 'link_extraction' | 'pending_review' | 'rejected';

export interface ClassificationResult {
  platformType: PlatformType;
  indexingPurpose: IndexingPurpose;
  confidence: number;
  reasons: string[];
  scoreModifier: number;
  platformName?: string;
  shouldExtractLinks: boolean;
}

/**
 * Indie-friendly hosting platforms that should be indexed
 * These platforms are treasured parts of the indie web!
 */
const INDIE_PLATFORMS = [
  // Community-first platforms (highest priority - these are indie web gems!)
  'neocities.org',
  'tilde.club',
  'tilde.town',
  'tilde.team',
  'tilde.pink',
  'tilde.zone',
  'tilde.institute',
  'tilde.guru',
  'tilde.fun',
  'tildeverse.org',
  'envs.net',
  'ctrl-c.club',
  'sdf.org',
  'cosmic.voyage',
  'town.com',

  // Static site hosts (great for indie creators)
  'github.io',
  'gitlab.io',
  'codeberg.page',
  'netlify.app',
  'vercel.app',
  'surge.sh',
  'render.com',
  'fly.dev',
  'deno.dev',
  'pages.dev', // Cloudflare Pages

  // Personal site builders (indie-friendly)
  'bearblog.dev',
  'micro.blog',
  'write.as',
  'hey.world',
  'mataroa.blog',
  'prose.sh',
  'omg.lol',
  'midnight.pub',
  'lists.sh',
  'smol.pub',

  // Gemini and alternative web
  'gemini.space',
  'flounder.online',
  'srht.site',
  'sourcehut.org',

  // Other indie communities
  'exozyme.me',
  'dimension.sh',
  'circumlunar.space',
  'rawtext.club',
  'republic.circumlunar.space'
];

/**
 * URL shorteners and redirects to follow but not index
 */
const URL_SHORTENERS = [
  'bit.ly',
  'tinyurl.com',
  'short.link',
  'ow.ly',
  'buff.ly',
  't.co',
  'goo.gl',
  'rebrand.ly',
  'bl.ink',
  'lnk.to',
  'smarturl.it'
];

export class DomainClassifier {
  /**
   * Classify a URL for processing and indexing decisions
   */
  classify(url: string): ClassificationResult {
    try {
      const parsed = new URL(url);
      const domain = parsed.hostname.toLowerCase().replace(/^www\./, '');
      const pathname = parsed.pathname;

      // Check for URL shorteners first
      if (this.isUrlShortener(domain)) {
        return {
          platformType: 'corporate_generic',
          indexingPurpose: 'rejected',
          confidence: 1.0,
          reasons: ['url_shortener'],
          scoreModifier: 0,
          shouldExtractLinks: false
        };
      }

      // Check if it's a corporate platform
      const corporateCheck = corporatePlatforms.isProfileUrl(url);
      if (corporateCheck.platform) {
        // Special handling for knowledge bases (Wikipedia, etc.) - these should be rejected, not link extraction
        if (corporateCheck.platform.category === 'knowledge_base') {
          return {
            platformType: 'corporate_generic',
            indexingPurpose: 'rejected',
            confidence: 0.95,
            reasons: ['knowledge_base_platform', `platform:${corporateCheck.platform.domain}`],
            scoreModifier: 0,
            platformName: corporateCheck.platform.domain,
            shouldExtractLinks: false
          };
        }

        // It's a corporate platform profile (for link extraction)
        return {
          platformType: 'corporate_profile',
          indexingPurpose: corporateCheck.platform.category === 'link_service' ? 'link_extraction' : 'link_extraction',
          confidence: 0.95,
          reasons: ['corporate_platform_profile', `platform:${corporateCheck.platform.domain}`],
          scoreModifier: 0,
          platformName: corporateCheck.platform.domain,
          shouldExtractLinks: true
        };
      }

      // Check if it's an indie platform (before corporate check)
      if (this.isIndiePlatform(domain) || this.isTildeUrl(url)) {
        const platformDetails = this.getIndiePlatformDetails(domain, url);
        return {
          platformType: 'indie_platform',
          indexingPurpose: 'full_index',
          confidence: 0.95, // High confidence - we love these platforms!
          reasons: ['indie_hosting_platform', platformDetails.reason],
          scoreModifier: platformDetails.scoreModifier, // Bonus for community platforms
          shouldExtractLinks: false
        };
      }

      // Check if it's a corporate domain but not a profile
      if (corporatePlatforms.isDomainCorporate(domain)) {
        return {
          platformType: 'corporate_generic',
          indexingPurpose: 'rejected',
          confidence: 0.9,
          reasons: ['corporate_platform_non_profile'],
          scoreModifier: 0,
          shouldExtractLinks: false
        };
      }

      // Check for GitHub Pages special case
      if (domain.endsWith('.github.io')) {
        return {
          platformType: 'indie_platform',
          indexingPurpose: 'full_index',
          confidence: 0.9,
          reasons: ['github_pages_site'],
          scoreModifier: 0.95,
          shouldExtractLinks: false
        };
      }

      // Check for custom subdomains on content platforms (often indie)
      if (this.isCustomSubdomainBlog(domain)) {
        return {
          platformType: 'indie_platform',
          indexingPurpose: 'pending_review',
          confidence: 0.7,
          reasons: ['custom_subdomain_blog'],
          scoreModifier: 0.8,
          shouldExtractLinks: false
        };
      }

      // Check characteristics of independent sites
      const independenceScore = this.scoreIndependence(domain, pathname);
      if (independenceScore > 0.7) {
        return {
          platformType: 'independent',
          indexingPurpose: 'full_index',
          confidence: independenceScore,
          reasons: ['independent_domain', 'custom_hosting'],
          scoreModifier: 1.2, // Bonus for full independence
          shouldExtractLinks: false
        };
      }

      // Default: unknown, needs review
      return {
        platformType: 'unknown',
        indexingPurpose: 'pending_review',
        confidence: 0.5,
        reasons: ['classification_uncertain'],
        scoreModifier: 1.0,
        shouldExtractLinks: false
      };

    } catch (error) {
      // Invalid URL
      return {
        platformType: 'unknown',
        indexingPurpose: 'rejected',
        confidence: 1.0,
        reasons: ['invalid_url'],
        scoreModifier: 0,
        shouldExtractLinks: false
      };
    }
  }

  /**
   * Check if domain is a URL shortener
   */
  private isUrlShortener(domain: string): boolean {
    return URL_SHORTENERS.includes(domain);
  }

  /**
   * Check if domain is an indie-friendly platform
   */
  private isIndiePlatform(domain: string): boolean {
    return INDIE_PLATFORMS.some(platform => {
      // Direct match
      if (domain === platform) return true;
      // Subdomain match (e.g., username.neocities.org)
      if (domain.endsWith('.' + platform)) return true;
      return false;
    });
  }

  /**
   * Check if URL is a tilde/pubnix user page
   */
  private isTildeUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      const domain = parsed.hostname.toLowerCase();
      const pathname = parsed.pathname;

      // Check if it's a tilde domain with user path
      const tildeDomains = [
        'tilde.club', 'tilde.town', 'tilde.team', 'tilde.pink', 'tilde.zone',
        'tilde.institute', 'tilde.guru', 'tilde.fun', 'tildeverse.org',
        'ctrl-c.club', 'sdf.org', 'envs.net', 'rawtext.club'
      ];
      if (tildeDomains.some(td => domain.includes(td)) && pathname.includes('/~')) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Get scoring details for indie platforms
   * Community platforms get bonuses, not penalties!
   */
  private getIndiePlatformDetails(domain: string, url: string): { scoreModifier: number; reason: string } {
    // Neocities - the champion of indie web!
    if (domain.includes('neocities.org')) {
      return { scoreModifier: 1.15, reason: 'neocities_community' };
    }

    // Tilde/Pubnix communities - old school cool
    if (this.isTildeUrl(url) || domain.includes('tilde.') || domain.includes('ctrl-c.club') || domain.includes('sdf.org')) {
      return { scoreModifier: 1.1, reason: 'tilde_community' };
    }

    // Bear Blog, omg.lol, and other indie darlings
    if (['bearblog.dev', 'omg.lol', 'midnight.pub', 'smol.pub', 'micro.blog'].some(p => domain.includes(p))) {
      return { scoreModifier: 1.1, reason: 'indie_blog_platform' };
    }

    // GitHub Pages - often used for great indie projects
    if (domain.endsWith('.github.io')) {
      return { scoreModifier: 1.05, reason: 'github_pages' };
    }

    // Static hosts - neutral, they can go either way
    if (['netlify.app', 'vercel.app', 'surge.sh'].some(p => domain.includes(p))) {
      return { scoreModifier: 1.0, reason: 'static_hosting' };
    }

    // Default for other indie platforms
    return { scoreModifier: 1.05, reason: 'indie_platform' };
  }

  /**
   * Check if it's a custom subdomain on a blogging platform
   */
  private isCustomSubdomainBlog(domain: string): boolean {
    const patterns = [
      /^[^.]+\.wordpress\.com$/,
      /^[^.]+\.blogspot\.com$/,
      /^[^.]+\.tumblr\.com$/,
      /^[^.]+\.medium\.com$/,
      /^[^.]+\.substack\.com$/,
      /^[^.]+\.ghost\.io$/,
      /^[^.]+\.wixsite\.com$/,
      /^[^.]+\.squarespace\.com$/,
      /^[^.]+\.weebly\.com$/
    ];

    return patterns.some(pattern => pattern.test(domain));
  }

  /**
   * Score how likely a domain is to be truly independent
   */
  private scoreIndependence(domain: string, pathname: string): number {
    let score = 0.5; // Base score

    // Custom TLD suggests independence
    const customTlds = ['.com', '.net', '.org', '.io', '.dev', '.me', '.co', '.xyz', '.app', '.blog', '.site', '.page', '.tech', '.codes', '.wtf', '.cool', '.fun'];
    if (customTlds.some(tld => domain.endsWith(tld))) {
      score += 0.2;
    }

    // Short domain (likely personal)
    if (domain.split('.').length === 2 && domain.split('.')[0].length < 20) {
      score += 0.1;
    }

    // Personal naming patterns
    const personalPatterns = [
      /^[a-z]+-[a-z]+\./, // firstname-lastname
      /^[a-z]{3,15}\./, // short personal name
      /^(my|the)[a-z]+\./ // my*, the*
    ];
    if (personalPatterns.some(pattern => pattern.test(domain))) {
      score += 0.15;
    }

    // Not on any known platform subdomain
    const platformSubdomains = ['www', 'blog', 'shop', 'store', 'app', 'api', 'cdn', 'images', 'static'];
    const subdomain = domain.split('.')[0];
    if (!platformSubdomains.includes(subdomain)) {
      score += 0.1;
    }

    // Path suggests personal site
    const pathIndicators = ['/about', '/blog', '/projects', '/portfolio', '/contact'];
    if (pathIndicators.some(indicator => pathname.includes(indicator))) {
      score += 0.1;
    }

    return Math.min(1.0, score);
  }

  /**
   * Determine if a site should be crawled for link extraction
   */
  shouldExtractLinks(url: string): boolean {
    const classification = this.classify(url);
    return classification.shouldExtractLinks;
  }

  /**
   * Get indexing recommendation for a URL
   */
  getIndexingRecommendation(url: string): {
    shouldIndex: boolean;
    shouldExtractLinks: boolean;
    reason: string;
  } {
    const classification = this.classify(url);

    switch (classification.indexingPurpose) {
      case 'full_index':
        return {
          shouldIndex: true,
          shouldExtractLinks: false,
          reason: `Index as ${classification.platformType}`
        };

      case 'link_extraction':
        return {
          shouldIndex: false,
          shouldExtractLinks: true,
          reason: `Extract links from ${classification.platformName || 'corporate profile'}`
        };

      case 'pending_review':
        return {
          shouldIndex: false,
          shouldExtractLinks: false,
          reason: 'Requires manual review'
        };

      case 'rejected':
        return {
          shouldIndex: false,
          shouldExtractLinks: false,
          reason: classification.reasons.join(', ')
        };

      default:
        return {
          shouldIndex: false,
          shouldExtractLinks: false,
          reason: 'Unknown classification'
        };
    }
  }
}

// Export singleton instance
export const domainClassifier = new DomainClassifier();