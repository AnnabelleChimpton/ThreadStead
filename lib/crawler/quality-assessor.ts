/**
 * Quality assessment for discovered sites
 * Determines if a site should be auto-submitted to the community index
 */

import type { ExtractedContent } from './content-extractor';
import { domainClassifier } from '../community-index/seeding/domain-classifier';

export interface QualityScore {
  totalScore: number;
  maxScore: number;
  breakdown: {
    indieWeb: number;
    personalSite: number;
    contentQuality: number;
    techStack: number;
    language: number;
    freshness: number;
  };
  shouldAutoSubmit: boolean;
  reasons: string[];
  category: 'personal_blog' | 'portfolio' | 'community' | 'resource' | 'other';
  indexingPurpose?: 'full_index' | 'link_extraction' | 'pending_review' | 'rejected';
  platformType?: 'independent' | 'indie_platform' | 'corporate_profile' | 'corporate_generic' | 'unknown';
}

export class QualityAssessor {
  private readonly AUTO_SUBMIT_THRESHOLD = 40; // Aligned with seeding threshold
  private readonly MAX_SCORE = 100;

  /**
   * Assess the quality of extracted content
   */
  assessQuality(content: ExtractedContent, url: string): QualityScore {
    // First check domain classification
    const classification = domainClassifier.classify(url);

    // If it's a corporate profile, return early with link extraction directive
    if (classification.platformType === 'corporate_profile') {
      return {
        totalScore: 0,
        maxScore: this.MAX_SCORE,
        breakdown: {
          indieWeb: 0,
          personalSite: 0,
          contentQuality: 0,
          techStack: 0,
          language: 0,
          freshness: 0
        },
        shouldAutoSubmit: false,
        reasons: ['Corporate profile - link extraction only'],
        category: 'other',
        indexingPurpose: 'link_extraction',
        platformType: 'corporate_profile'
      };
    }

    const breakdown = {
      indieWeb: this.scoreIndieWeb(content),
      personalSite: this.scorePersonalSite(content, url),
      contentQuality: this.scoreContentQuality(content),
      techStack: this.scoreTechStack(content),
      language: this.scoreLanguage(content),
      freshness: this.scoreFreshness(content)
    };

    // Apply score modifier based on platform type
    let totalScore = Object.values(breakdown).reduce((sum, score) => sum + score, 0);
    totalScore = Math.floor(totalScore * classification.scoreModifier);

    const shouldAutoSubmit = totalScore >= this.AUTO_SUBMIT_THRESHOLD &&
                             classification.indexingPurpose === 'full_index';
    const reasons = [...this.generateReasons(breakdown, shouldAutoSubmit), ...classification.reasons];
    const category = this.determineCategory(content, breakdown);

    return {
      totalScore,
      maxScore: this.MAX_SCORE,
      breakdown,
      shouldAutoSubmit,
      reasons,
      category,
      indexingPurpose: classification.indexingPurpose,
      platformType: classification.platformType
    };
  }

  /**
   * Score IndieWeb markers (0-25 points)
   */
  private scoreIndieWeb(content: ExtractedContent): number {
    if (!content.hasIndieWebMarkers) return 0;

    let score = 15; // Base IndieWeb score

    // Bonus points for specific markers
    if (content.author) score += 5; // Has author
    if (content.publishedDate) score += 5; // Has publish date

    return Math.min(score, 25);
  }

  /**
   * Score personal site indicators (0-25 points)
   */
  private scorePersonalSite(content: ExtractedContent, url: string): number {
    let score = 0;

    // Holistic personal site detection - look for patterns, not just keywords
    const indicators = {
      // IndieWeb markers already detected
      hasIndieWeb: content.hasIndieWebMarkers,

      // Author presence (strong personal indicator)
      hasAuthor: !!content.author,

      // URL patterns that suggest personal ownership
      personalDomainPatterns: this.hasPersonalDomainPattern(url),

      // Content structure suggests personal site
      personalContentStructure: this.hasPersonalContentStructure(content),

      // Size/scope suggests individual rather than organization
      appropriateScale: this.hasIndividualScale(content)
    };

    // Score based on multiple indicators, not just explicit keywords
    if (indicators.hasIndieWeb) score += 8;
    if (indicators.hasAuthor) score += 6;
    if (indicators.personalDomainPatterns) score += 4;
    if (indicators.personalContentStructure) score += 4;
    if (indicators.appropriateScale) score += 3;

    return Math.min(score, 25);
  }

  /**
   * Check for personal domain patterns
   */
  private hasPersonalDomainPattern(url: string): boolean {
    const domain = new URL(url).hostname.toLowerCase();

    // Pattern: firstname-lastname, firstnamelastname variations
    const namePattern = /^[a-z]+-[a-z]+\./;
    if (namePattern.test(domain)) return true;

    // Pattern: short domains that could be personal (3-15 chars before TLD)
    const shortPersonalPattern = /^[a-z]{3,15}\.(me|dev|xyz|blog|site|page|co|io)$/;
    if (shortPersonalPattern.test(domain)) return true;

    // Subdomain patterns: name.github.io, name.netlify.app, etc.
    const hostedPersonalPattern = /^[a-z0-9-]+\.(github\.io|netlify\.app|vercel\.app|surge\.sh|neocities\.org)$/;
    if (hostedPersonalPattern.test(domain)) return true;

    return false;
  }

  /**
   * Check for personal content structure patterns
   */
  private hasPersonalContentStructure(content: ExtractedContent): boolean {
    const allText = (content.title + ' ' + content.description + ' ' + content.snippet).toLowerCase();

    // Look for first-person language patterns
    const firstPersonPattern = /\b(i am|i'm|my |me |myself|i have|i work|i build|i create|i write|i love)\b/;
    if (firstPersonPattern.test(allText)) return true;

    // Look for personal narrative patterns (less explicit)
    const narrativePattern = /(welcome to|this is|here you'll find|check out my|take a look)/;
    if (narrativePattern.test(allText)) return true;

    return false;
  }

  /**
   * Check if content scope suggests individual rather than organization
   */
  private hasIndividualScale(content: ExtractedContent): boolean {
    // Small, focused sites are often personal
    if (content.contentLength < 5000 && content.links.length < 20) return true;

    // Avoid corporate language patterns
    const corporateTerms = /(enterprise|corporation|company|business|team|staff|employees|solutions|services)/i;
    const allText = content.title + ' ' + content.description + ' ' + content.snippet;

    return !corporateTerms.test(allText);
  }

  /**
   * Score content quality (0-20 points) - Embrace all types of content
   */
  private scoreContentQuality(content: ExtractedContent): number {
    let score = 8; // Give generous base points - any content has value

    // Very inclusive content assessment - celebrate minimalism too
    if (content.contentLength > 100) score += 2; // Even small sites can be gems
    if (content.contentLength > 500) score += 2; // Modest content is fine
    if (content.contentLength > 2000) score += 2; // Don't require novel-length content

    // Any description is valuable
    if (content.description && content.description.length > 10) score += 3; // Very low bar

    // Keywords indicate some structure (but not required for good sites)
    if (content.keywords.length >= 1) score += 2; // Any keywords help
    if (content.keywords.length >= 5) score += 1; // More is nice but not essential

    return Math.min(score, 20);
  }

  /**
   * Score tech stack (0-15 points) - Celebrate simplicity and old web
   */
  private scoreTechStack(content: ExtractedContent): number {
    // Simple HTML sites are beautiful - give them high base points
    if (!content.techStack || content.techStack.length === 0) return 12; // Embrace simplicity!

    let score = 10; // Good base score for any approach

    // Value ALL approaches equally - from simple to complex
    const allTech = [
      // Simple/classic approaches (the soul of the old web)
      'html', 'css', 'javascript',
      // Modern frameworks
      'react', 'vue', 'svelte', 'angular', 'next.js', 'nuxt',
      // Static site generators
      'gatsby', 'hugo', 'jekyll', 'eleventy', 'astro', 'gridsome',
      // CMS approaches
      'wordpress', 'drupal', 'joomla', 'squarespace', 'wix',
      // Programming languages
      'typescript', 'python', 'php', 'ruby', 'go', 'rust',
      // Styling frameworks
      'bootstrap', 'tailwind', 'sass'
    ];

    const hasAnyTech = content.techStack.some(tech =>
      allTech.some(knownTech => tech.toLowerCase().includes(knownTech))
    );

    if (hasAnyTech) score += 5; // Small bonus for detected tech

    return Math.min(score, 15);
  }

  /**
   * Score language (0-10 points)
   */
  private scoreLanguage(content: ExtractedContent): number {
    // All languages are equally valid - score based on proper language detection
    if (content.language && content.language.length === 2) {
      return 10; // Any properly detected language gets full points
    }
    return 5; // Partial points if language detection is uncertain
  }

  /**
   * Score freshness (0-5 points)
   */
  private scoreFreshness(content: ExtractedContent): number {
    // Give base points for any site, not just recent ones
    let score = 2; // Base points for existing content

    if (!content.publishedDate) return score;

    try {
      const publishDate = new Date(content.publishedDate);
      const now = new Date();
      const daysSincePublish = (now.getTime() - publishDate.getTime()) / (1000 * 60 * 60 * 24);

      // Bonus for recent content, but don't penalize older content
      if (daysSincePublish <= 30) score += 3; // Recent content bonus
      if (daysSincePublish <= 365) score += 1; // Within a year bonus
      // Older content still gets the base score - timeless content is valuable

      return Math.min(score, 5);
    } catch {
      return score; // Return base score if date parsing fails
    }
  }

  /**
   * Determine site category based on content
   */
  private determineCategory(content: ExtractedContent, breakdown: any): QualityScore['category'] {
    if (breakdown.personalSite > 0) {
      if (content.keywords.some(k => ['portfolio', 'work', 'projects'].includes(k.toLowerCase()))) {
        return 'portfolio';
      }
      return 'personal_blog';
    }

    if (breakdown.indieWeb > 0) {
      return 'community';
    }

    if (content.keywords.some(k => ['tutorial', 'guide', 'documentation', 'resource'].includes(k.toLowerCase()))) {
      return 'resource';
    }

    return 'other';
  }

  /**
   * Generate human-readable reasons for the score
   */
  private generateReasons(breakdown: any, shouldAutoSubmit: boolean): string[] {
    const reasons: string[] = [];

    if (breakdown.indieWeb > 0) {
      reasons.push(`IndieWeb markers detected (+${breakdown.indieWeb} points)`);
    }

    if (breakdown.personalSite > 0) {
      reasons.push(`Personal site indicators (+${breakdown.personalSite} points)`);
    }

    if (breakdown.contentQuality > 10) {
      reasons.push(`High content quality (+${breakdown.contentQuality} points)`);
    }

    if (breakdown.techStack > 0) {
      reasons.push(`Tech stack detected (+${breakdown.techStack} points)`);
    }

    if (breakdown.language === 10) {
      reasons.push('English content (+10 points)');
    }

    if (breakdown.freshness > 0) {
      reasons.push(`Recent content (+${breakdown.freshness} points)`);
    }

    if (shouldAutoSubmit) {
      reasons.push('✅ Meets auto-submission threshold');
    } else {
      reasons.push('❌ Below auto-submission threshold');
    }

    return reasons;
  }
}