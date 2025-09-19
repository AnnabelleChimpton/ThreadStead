/**
 * Quality filtering system for automated site evaluation
 * Determines whether discovered sites should be added to the community index
 */

import type { ExtSearchResultItem } from '@/lib/extsearch/types';
import { SiteType } from './discovery-queries';
import { domainClassifier } from './domain-classifier';

export interface SeedingScore {
  score: number; // 0-100
  reasons: string[];
  shouldSeed: boolean;
  priority: number; // 1-5 for crawl queue
  suggestedCategory: SiteType;
  confidence: number; // 0-1, how confident we are in this evaluation
  indexingPurpose: 'full_index' | 'link_extraction' | 'pending_review' | 'rejected';
  platformType: 'independent' | 'indie_platform' | 'corporate_profile' | 'corporate_generic' | 'unknown';
}

export interface SiteEvaluation {
  url: string;
  title: string;
  snippet?: string;
  seedingScore: SeedingScore;
  engine: string;
  isIndieWeb?: boolean;
  privacyScore?: number;
  hasTrackers?: boolean;
}

export class SeedingFilter {
  /**
   * Evaluate a site from search results for seeding potential
   */
  async evaluateSite(site: ExtSearchResultItem): Promise<SeedingScore> {
    let score = 0;
    const reasons: string[] = [];
    const domain = this.extractDomain(site.url);
    const url = site.url.toLowerCase();
    const title = site.title?.toLowerCase() || '';
    const snippet = site.snippet?.toLowerCase() || '';

    // First, classify the domain using the new classifier
    const classification = domainClassifier.classify(site.url);

    // If it's a corporate profile, return early with link extraction directive
    if (classification.platformType === 'corporate_profile') {
      return {
        score: 0,
        reasons: ['corporate_profile', `platform:${classification.platformName}`],
        shouldSeed: false,
        priority: 3, // Medium priority for link extraction
        suggestedCategory: SiteType.OTHER,
        confidence: classification.confidence,
        indexingPurpose: 'link_extraction',
        platformType: 'corporate_profile'
      };
    }

    // If it's rejected corporate content, return early
    if (classification.indexingPurpose === 'rejected') {
      return {
        score: 0,
        reasons: classification.reasons,
        shouldSeed: false,
        priority: 0,
        suggestedCategory: SiteType.OTHER,
        confidence: classification.confidence,
        indexingPurpose: 'rejected',
        platformType: classification.platformType
      };
    }

    // === POSITIVE INDICATORS ===

    // Indie Web indicators (highest value)
    if (site.isIndieWeb) {
      score += 25;
      reasons.push("indie_web_detected");
    }

    // Domain quality indicators
    if (this.isIndieWebDomain(domain)) {
      score += 25; // Increased from 20 - we love indie platforms!
      reasons.push("indie_web_domain");
    }

    // Extra bonus for community platforms
    if (this.isCommunityPlatform(domain)) {
      score += 10; // Additional bonus for Neocities, Tilde, etc.
      reasons.push("community_platform");
    }

    if (this.isPersonalDomain(domain)) {
      score += 15;
      reasons.push("personal_domain");
    }

    // Privacy and ethics indicators
    if (site.privacyScore && site.privacyScore > 0.7) {
      score += 15;
      reasons.push("privacy_friendly");
    }

    if (!site.hasTrackers) {
      score += 10;
      reasons.push("no_trackers");
    }

    // Content quality indicators
    if (this.hasPersonalIndicators(url, title, snippet)) {
      score += 12;
      reasons.push("personal_content");
    }

    if (this.hasCreativeIndicators(url, title, snippet)) {
      score += 10;
      reasons.push("creative_content");
    }

    if (this.hasTechnicalIndicators(url, title, snippet)) {
      score += 8;
      reasons.push("technical_content");
    }

    if (this.hasPortfolioIndicators(url, title, snippet)) {
      score += 8;
      reasons.push("portfolio_content");
    }

    // Small web indicators
    if (this.hasMinimalIndicators(url, title, snippet)) {
      score += 8;
      reasons.push("minimal_design");
    }

    if (this.hasRetroIndicators(url, title, snippet)) {
      score += 6;
      reasons.push("retro_aesthetic");
    }

    // === NEGATIVE INDICATORS ===

    // Commercial and corporate sites
    if (this.isCommercialDomain(domain)) {
      score -= 15;
      reasons.push("commercial_domain");
    }

    if (this.isBigTechDomain(domain)) {
      score -= 25;
      reasons.push("big_tech_domain");
    }

    if (this.hasCommercialIndicators(title, snippet)) {
      score -= 10;
      reasons.push("commercial_content");
    }

    // Quality red flags
    if (this.hasSpamIndicators(url, title, snippet)) {
      score -= 30;
      reasons.push("spam_indicators");
    }

    if (this.isParkedDomain(title, snippet)) {
      score -= 40;
      reasons.push("parked_domain");
    }

    if (this.hasLowQualityIndicators(title, snippet)) {
      score -= 15;
      reasons.push("low_quality_content");
    }

    // Technical issues
    if (!url.startsWith('https://')) {
      score -= 5;
      reasons.push("no_ssl");
    }

    // === FINAL SCORING ===

    // Apply score modifier from domain classification
    score = Math.floor(score * classification.scoreModifier);

    // Clamp score to 0-100 range
    score = Math.max(0, Math.min(100, score));

    // Determine if we should seed this site
    // For indie platforms and independent sites, use score threshold
    // For corporate profiles, never seed (handled above)
    const shouldSeed = score >= 40 &&
                      !this.hasBlockingIssues(site) &&
                      classification.indexingPurpose === 'full_index';

    // Calculate priority for crawl queue
    const priority = this.calculatePriority(score);

    // Suggest category based on content
    const suggestedCategory = this.suggestCategory(url, title, snippet);

    // Calculate confidence in our evaluation
    const confidence = this.calculateConfidence(site, reasons) * classification.confidence;

    return {
      score,
      reasons: [...reasons, ...classification.reasons],
      shouldSeed,
      priority,
      suggestedCategory,
      confidence: Math.min(1.0, confidence),
      indexingPurpose: classification.indexingPurpose,
      platformType: classification.platformType
    };
  }

  /**
   * Check for blocking issues that prevent seeding regardless of score
   */
  private hasBlockingIssues(site: ExtSearchResultItem): boolean {
    const url = site.url.toLowerCase();

    // Block known problematic domains
    const blockedDomains = [
      'facebook.com', 'twitter.com', 'instagram.com', 'tiktok.com',
      'youtube.com', 'reddit.com', 'pinterest.com', 'linkedin.com',
      'amazon.com', 'ebay.com', 'walmart.com', 'target.com',
      'google.com', 'microsoft.com', 'apple.com', 'adobe.com'
    ];

    return blockedDomains.some(domain => url.includes(domain));
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  }

  /**
   * Check if domain is known indie web friendly
   */
  private isIndieWebDomain(domain: string): boolean {
    const indieWebDomains = [
      'neocities.org', 'github.io', 'gitlab.io', 'netlify.app',
      'vercel.app', 'surge.sh', 'forestry.io', 'ghost.io',
      'bearblog.dev', 'micro.blog', 'write.as', 'hey.world',
      'omg.lol', 'mataroa.blog', 'smol.pub', 'midnight.pub'
    ];

    return indieWebDomains.some(d => domain.includes(d));
  }

  /**
   * Check if domain is a community platform (extra special!)
   */
  private isCommunityPlatform(domain: string): boolean {
    // These platforms are the heart of indie web culture
    const communityPlatforms = [
      'neocities.org',
      'tilde.club', 'tilde.town', 'tilde.team', 'tilde.pink',
      'ctrl-c.club', 'sdf.org', 'envs.net',
      'cosmic.voyage', 'town.com',
      'omg.lol', 'bearblog.dev'
    ];

    return communityPlatforms.some(d => domain.includes(d));
  }

  /**
   * Check if domain appears to be personal
   */
  private isPersonalDomain(domain: string): boolean {
    // Personal domain patterns
    const personalPatterns = [
      /^[a-z]+\.(me|dev|blog|site|xyz|cool|fun|wtf)$/,
      /^[a-z]+[a-z-]*\.(com|net|org)$/,
      /^\w+\.name$/
    ];

    return personalPatterns.some(pattern => pattern.test(domain));
  }


  /**
   * Check if domain is commercial/corporate
   */
  private isCommercialDomain(domain: string): boolean {
    const commercialIndicators = [
      'shop', 'store', 'buy', 'sell', 'market', 'ecommerce',
      'inc.com', 'corp.com', 'ltd.com', 'llc.com'
    ];

    return commercialIndicators.some(indicator => domain.includes(indicator));
  }

  /**
   * Check if domain belongs to big tech
   */
  private isBigTechDomain(domain: string): boolean {
    const bigTechDomains = [
      'google.', 'microsoft.', 'apple.', 'amazon.', 'meta.',
      'facebook.', 'twitter.', 'x.com', 'linkedin.', 'youtube.',
      'instagram.', 'tiktok.', 'snapchat.', 'discord.', 'slack.com'
    ];

    return bigTechDomains.some(d => domain.includes(d));
  }

  /**
   * Check for personal content indicators
   */
  private hasPersonalIndicators(url: string, title: string, snippet: string): boolean {
    const personalKeywords = [
      'personal', 'blog', 'diary', 'journal', 'thoughts', 'notes',
      'about me', 'my life', 'my story', 'personal website', 'homepage'
    ];

    const text = `${url} ${title} ${snippet}`;
    return personalKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Check for creative content indicators
   */
  private hasCreativeIndicators(url: string, title: string, snippet: string): boolean {
    const creativeKeywords = [
      'art', 'creative', 'design', 'portfolio', 'gallery', 'showcase',
      'creative coding', 'generative', 'interactive', 'experiment',
      'visual', 'music', 'photography', 'illustration', 'animation'
    ];

    const text = `${url} ${title} ${snippet}`;
    return creativeKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Check for technical content indicators
   */
  private hasTechnicalIndicators(url: string, title: string, snippet: string): boolean {
    const techKeywords = [
      'code', 'programming', 'developer', 'tech', 'software',
      'project', 'github', 'open source', 'tutorial', 'guide',
      'documentation', 'api', 'library', 'framework', 'tool'
    ];

    const text = `${url} ${title} ${snippet}`;
    return techKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Check for portfolio indicators
   */
  private hasPortfolioIndicators(url: string, title: string, snippet: string): boolean {
    const portfolioKeywords = [
      'portfolio', 'work', 'projects', 'experience', 'resume',
      'cv', 'skills', 'contact', 'hire me', 'freelance'
    ];

    const text = `${url} ${title} ${snippet}`;
    return portfolioKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Check for minimal design indicators
   */
  private hasMinimalIndicators(url: string, title: string, snippet: string): boolean {
    const minimalKeywords = [
      'minimal', 'simple', 'clean', 'lightweight', 'fast',
      'no javascript', 'static', 'plain', 'text only'
    ];

    const text = `${url} ${title} ${snippet}`;
    return minimalKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Check for retro/nostalgic indicators
   */
  private hasRetroIndicators(url: string, title: string, snippet: string): boolean {
    const retroKeywords = [
      'retro', 'vintage', '90s', 'nostalgia', 'old school',
      'geocities', 'web 1.0', 'classic', 'throwback'
    ];

    const text = `${url} ${title} ${snippet}`;
    return retroKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Check for commercial content indicators
   */
  private hasCommercialIndicators(title: string, snippet: string): boolean {
    const commercialKeywords = [
      'buy now', 'for sale', 'price', 'discount', 'deal',
      'shop', 'store', 'product', 'service', 'business',
      'marketing', 'seo', 'affiliate', 'sponsored'
    ];

    const text = `${title} ${snippet}`;
    return commercialKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Check for spam indicators
   */
  private hasSpamIndicators(url: string, title: string, snippet: string): boolean {
    const spamKeywords = [
      'click here', 'make money', 'get rich', 'free money',
      'weight loss', 'casino', 'poker', 'viagra', 'crypto',
      'bitcoin', 'investment', 'loan', 'insurance'
    ];

    const text = `${url} ${title} ${snippet}`;
    return spamKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Check if domain appears to be parked
   */
  private isParkedDomain(title: string, snippet: string): boolean {
    const parkedIndicators = [
      'domain for sale', 'this domain', 'parked domain',
      'coming soon', 'under construction', 'placeholder'
    ];

    const text = `${title} ${snippet}`;
    return parkedIndicators.some(indicator => text.includes(indicator));
  }

  /**
   * Check for low quality content indicators
   */
  private hasLowQualityIndicators(title: string, snippet: string): boolean {
    // Very short or generic titles
    if (title.length < 10 || title === 'untitled' || title === 'home') {
      return true;
    }

    // Excessive punctuation or caps
    if (title.includes('!!!') || title === title.toUpperCase()) {
      return true;
    }

    return false;
  }

  /**
   * Calculate priority for crawl queue based on score
   */
  private calculatePriority(score: number): number {
    if (score >= 80) return 5; // High priority
    if (score >= 60) return 4;
    if (score >= 40) return 3;
    if (score >= 20) return 2;
    return 1; // Low priority
  }

  /**
   * Suggest category based on content analysis
   */
  private suggestCategory(url: string, title: string, snippet: string): SiteType {
    const text = `${url} ${title} ${snippet}`.toLowerCase();

    if (text.includes('portfolio') || text.includes('resume') || text.includes('cv')) {
      return SiteType.PORTFOLIO;
    }
    if (text.includes('project') || text.includes('github') || text.includes('code')) {
      return SiteType.PROJECT;
    }
    if (text.includes('blog') || text.includes('diary') || text.includes('journal')) {
      return SiteType.PERSONAL_BLOG;
    }
    if (text.includes('art') || text.includes('creative') || text.includes('design')) {
      return SiteType.ART;
    }
    if (text.includes('tool') || text.includes('utility') || text.includes('service')) {
      return SiteType.TOOL;
    }
    if (text.includes('resource') || text.includes('guide') || text.includes('tutorial')) {
      return SiteType.RESOURCE;
    }
    if (text.includes('community') || text.includes('forum') || text.includes('webring')) {
      return SiteType.COMMUNITY;
    }
    if (text.includes('zine') || text.includes('magazine') || text.includes('publication')) {
      return SiteType.ZINE;
    }
    if (text.includes('wiki') || text.includes('documentation') || text.includes('docs')) {
      return SiteType.DOCUMENTATION;
    }

    return SiteType.OTHER;
  }

  /**
   * Calculate confidence in evaluation based on available data
   */
  private calculateConfidence(site: ExtSearchResultItem, reasons: string[]): number {
    let confidence = 0.6; // Increased base confidence

    // More confidence if we have rich metadata
    if (site.isIndieWeb !== undefined) confidence += 0.15;
    if (site.privacyScore !== undefined) confidence += 0.1;
    if (site.hasTrackers !== undefined) confidence += 0.05;
    if (site.snippet && site.snippet.length > 100) confidence += 0.05;

    // More confidence with more evaluation reasons (stronger weight)
    confidence += Math.min(0.3, reasons.length * 0.03);

    // Extra confidence for strong indie web indicators
    const strongIndieIndicators = [
      'indie_web_detected',
      'personal_domain',
      'no_trackers',
      'privacy_friendly'
    ];
    const hasStrongIndicators = strongIndieIndicators.some(indicator =>
      reasons.includes(indicator)
    );
    if (hasStrongIndicators) confidence += 0.1;

    return Math.min(1.0, confidence);
  }
}