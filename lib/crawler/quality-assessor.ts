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
    userSubmitted?: number; // Bonus for user submissions
  };
  shouldAutoSubmit: boolean;
  reasons: string[];
  category: 'personal_blog' | 'portfolio' | 'community' | 'resource' | 'webring' | 'guestbook' | 'other';
  indexingPurpose?: 'full_index' | 'link_extraction' | 'pending_review' | 'rejected';
  platformType?: 'independent' | 'indie_platform' | 'corporate_profile' | 'corporate_generic' | 'unknown';
}

export class QualityAssessor {
  private readonly AUTO_SUBMIT_THRESHOLD = 40; // Lowered to be more inclusive for genuine indie sites
  private readonly MAX_SCORE = 100;

  /**
   * Assess the quality of extracted content
   */
  assessQuality(content: ExtractedContent, url: string, isUserSubmission: boolean = false): QualityScore {
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
      freshness: this.scoreFreshness(content),
      userSubmitted: isUserSubmission ? 30 : 0 // Massive boost for user submissions
    };

    // Apply score modifier based on platform type
    let totalScore = Object.values(breakdown).reduce((sum, score) => sum + score, 0);

    // Apply corporate penalty if detected
    if (!this.hasIndividualScale(content)) {
      totalScore -= 30; // Increased penalty for corporate-sounding content
    }

    // Apply AI Slop penalty
    const aiSlopScore = this.scoreAiSlop(content);
    if (aiSlopScore > 0) {
      totalScore -= aiSlopScore;
    }

    totalScore = Math.floor(totalScore * classification.scoreModifier);

    // Domain classification is used to EXCLUDE (corporate/spam), not INCLUDE
    // If content quality is good, index it regardless of domain uncertainty
    const shouldAutoSubmit = totalScore >= this.AUTO_SUBMIT_THRESHOLD &&
      classification.indexingPurpose !== 'link_extraction' &&
      classification.indexingPurpose !== 'rejected';

    const reasons = [...this.generateReasons(breakdown, shouldAutoSubmit), ...classification.reasons];

    if (aiSlopScore > 0) {
      reasons.push(`⚠️ AI Slop / Low Quality detected (-${aiSlopScore} points)`);
    }

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
   * Score IndieWeb markers (0-40 points) - Increased weight
   */
  private scoreIndieWeb(content: ExtractedContent): number {
    if (!content.hasIndieWebMarkers) return 0;

    let score = 25; // Increased Base IndieWeb score

    // Bonus points for specific markers
    if (content.author) score += 5; // Has author
    if (content.publishedDate) score += 5; // Has publish date

    // Webmention support is a huge plus
    if (content.links.some((l: string) => l.includes('webmention'))) score += 5;

    return Math.min(score, 40);
  }

  /**
   * Score personal site indicators (0-40 points) - Increased weight
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
      appropriateScale: this.hasIndividualScale(content),

      // Specific indie pages
      hasIndiePages: this.hasIndiePages(content)
    };

    // Score based on multiple indicators, not just explicit keywords
    if (indicators.hasIndieWeb) score += 10;
    if (indicators.hasAuthor) score += 10;
    if (indicators.personalDomainPatterns) score += 10;
    if (indicators.personalContentStructure) score += 10;
    if (indicators.appropriateScale) score += 10;
    if (indicators.hasIndiePages) score += 5;

    return Math.min(score, 40);
  }

  /**
   * Check for personal domain patterns (expanded detection)
   */
  private hasPersonalDomainPattern(url: string): boolean {
    const domain = new URL(url).hostname.toLowerCase();

    // Pattern: firstname-lastname, firstnamelastname variations
    const namePattern = /^[a-z]+-[a-z]+\./;
    if (namePattern.test(domain)) return true;

    // Pattern: short domains that could be personal (expanded TLD list)
    const shortPersonalPattern = /^[a-z]{3,15}\.(me|dev|xyz|blog|site|page|co|cc|io|net|org|info|art|design|studio|works|space|world|digital|online|website|fyi)$/;
    if (shortPersonalPattern.test(domain)) return true;

    // Personal naming patterns (expanded)
    const personalPatterns = [
      /^[a-z]+s?(blog|site|web|page|portfolio|works)\./,  // *blog, *site, etc.
      /^(hello|hey|hi|my|the)[a-z]+\./,                   // hello*, hey*, my*, the*
      /^[a-z]{3,12}\.(me|dev|blog|site|page)$/            // single word on personal TLD
    ];
    if (personalPatterns.some((pattern: RegExp) => pattern.test(domain))) return true;

    // Subdomain patterns: name.github.io, name.netlify.app, etc.
    const hostedPersonalPattern = /^[a-z0-9-]+\.(github\.io|netlify\.app|vercel\.app|surge\.sh|neocities\.org|pages\.dev)$/;
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
   * Check for specific indie pages
   */
  private hasIndiePages(content: ExtractedContent): boolean {
    const indiePages = ['/now', '/uses', '/ideas', '/blogroll', '/links', '/guestbook'];
    // This is a heuristic since we don't have the full site structure here, 
    // but we can check if these terms appear in the links or text in a way that suggests navigation
    const allText = (content.snippet + ' ' + content.links.join(' ')).toLowerCase();
    return indiePages.some((page: string) => allText.includes(page));
  }

  /**
   * Check if content scope suggests individual rather than organization
   */
  private hasIndividualScale(content: ExtractedContent): boolean {
    // Avoid corporate language patterns - CHECK THIS FIRST!
    const corporateTerms = /(enterprise|corporation|company|business|team|staff|employees|solutions|services|pricing|plans|demo|book a call|schedule|consulting|agency|firm|ltd|inc|llc|partners|clients|careers|jobs|investors|shareholders|global leader|innovative strategies|cutting-edge solutions|mission statement|core values|leadership team|board of directors)/i;
    const allText = content.title + ' ' + content.description + ' ' + content.snippet;

    if (corporateTerms.test(allText)) {
      return false; // It IS corporate, so it does NOT have individual scale
    }

    // Small, focused sites are often personal
    if (content.contentLength < 5000 && content.links.length < 20) return true;

    return true; // Default to true if not explicitly corporate
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

    // Penalize SEO spam / Link farms
    const allText = (content.title + ' ' + content.description + ' ' + content.snippet).toLowerCase();
    const linkCount = content.links.length;
    const textLength = content.contentLength;

    // High link density without much text (link farm?)
    if (linkCount > 50 && textLength < 1000) {
      score -= 10;
    }

    // Keyword stuffing check (simple heuristic)
    if (content.keywords.length > 20) {
      score -= 5;
    }

    return Math.max(0, Math.min(score, 20));
  }

  /**
   * Detect AI Slop and Low Quality Content
   * Returns a penalty score (positive number to be subtracted)
   */
  private scoreAiSlop(content: ExtractedContent): number {
    let penalty = 0;
    const allText = (content.title + ' ' + content.description + ' ' + content.snippet).toLowerCase();

    // 1. Common AI Phrases
    const aiPhrases = [
      "as an ai language model",
      "i cannot fulfill this request",
      "in conclusion, it is important",
      "it is worth noting that",
      "delve into",
      "comprehensive guide to",
      "unlock the power of",
      "elevate your",
      "game-changer",
      "realm of",
      "landscape of",
      "tapestry of",
      "testament to",
      "poised to",
      "fostering a sense of"
    ];

    let aiPhraseCount = 0;
    for (const phrase of aiPhrases) {
      if (allText.includes(phrase)) {
        aiPhraseCount++;
      }
    }

    if (aiPhraseCount >= 1) penalty += 20;
    if (aiPhraseCount >= 3) penalty += 30; // High confidence it's AI

    // 2. Generic Listicle Structure (often used in AI spam)
    // Looking for patterns like "1. Introduction", "2. Benefits", etc. in snippet
    const listiclePattern = /\d+\.\s+(introduction|benefits|conclusion|summary|key takeaways)/g;
    const matches = allText.match(listiclePattern);
    if (matches && matches.length >= 3) {
      penalty += 10;
    }

    // 3. Repetitive SEO Spam
    const words = allText.split(/\s+/);
    const uniqueWords = new Set(words);
    const lexicalDiversity = uniqueWords.size / words.length;

    // Very low lexical diversity suggests keyword stuffing or repetitive generated text
    if (words.length > 100 && lexicalDiversity < 0.3) {
      penalty += 15;
    }

    return penalty;
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

    const hasAnyTech = content.techStack.some((tech: string) =>
      allTech.some((knownTech: string) => tech.toLowerCase().includes(knownTech))
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
  private determineCategory(content: ExtractedContent, breakdown: QualityScore['breakdown']): QualityScore['category'] {
    const allText = (content.title + ' ' + content.description + ' ' + content.snippet).toLowerCase();

    // Check for Webrings
    if (allText.includes('webring') || allText.includes('web ring') || content.links.some((l: string) => l.includes('ring'))) {
      return 'webring';
    }

    // Check for Guestbooks
    if (allText.includes('guestbook') || allText.includes('sign my guestbook')) {
      return 'guestbook';
    }

    if (breakdown.personalSite > 0) {
      if (content.keywords.some((k: string) => ['portfolio', 'work', 'projects'].includes(k.toLowerCase()))) {
        return 'portfolio';
      }
      return 'personal_blog';
    }

    if (breakdown.indieWeb > 0) {
      return 'community';
    }

    if (content.keywords.some((k: string) => ['tutorial', 'guide', 'documentation', 'resource'].includes(k.toLowerCase()))) {
      return 'resource';
    }

    return 'other';
  }

  /**
   * Generate human-readable reasons for the score
   */
  private generateReasons(breakdown: QualityScore['breakdown'], shouldAutoSubmit: boolean): string[] {
    const reasons: string[] = [];

    if (breakdown.userSubmitted && breakdown.userSubmitted > 0) {
      reasons.push(`User submitted (+${breakdown.userSubmitted} points)`);
    }

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