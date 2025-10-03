/**
 * Main site crawler that respects robots.txt and extracts content
 */

import { RobotsParser, type RobotsRules } from './robots-parser';
import { ContentExtractor, type ExtractedContent } from './content-extractor';

export interface CrawlResult {
  url: string;
  success: boolean;
  statusCode?: number;
  content?: ExtractedContent;
  error?: string;
  crawlTime: number;
  robotsAllowed: boolean;
  robotsDelay?: number;
}

export interface CrawlerOptions {
  userAgent?: string;
  timeout?: number;
  maxRetries?: number;
  respectRobots?: boolean;
  maxContentSize?: number;
}

export class SiteCrawler {
  private robotsParser = new RobotsParser();
  private contentExtractor = new ContentExtractor();
  private readonly options: Required<CrawlerOptions>;

  // Rate limiting per domain
  private domainLastCrawl = new Map<string, number>();
  private domainCrawlDelay = new Map<string, number>();

  constructor(options: CrawlerOptions = {}) {
    this.options = {
      userAgent: options.userAgent || 'ThreadsteadBot/1.0 (+https://threadstead.com/crawler)',
      timeout: options.timeout || 10000, // 10 seconds
      maxRetries: options.maxRetries || 2,
      respectRobots: options.respectRobots ?? true,
      maxContentSize: options.maxContentSize || 5 * 1024 * 1024 // 5MB
    };
  }

  async crawlSite(url: string, extractAllLinks = false): Promise<CrawlResult> {
    const startTime = Date.now();

    try {
      // Validate URL
      new URL(url); // Throws if invalid

      // Check robots.txt if enabled
      let robotsRules: RobotsRules | null = null;
      if (this.options.respectRobots) {
        robotsRules = await this.robotsParser.checkRobots(url, this.options.userAgent);

        if (!robotsRules.isAllowed) {
          return {
            url,
            success: false,
            error: 'Disallowed by robots.txt',
            crawlTime: Date.now() - startTime,
            robotsAllowed: false
          };
        }
      }

      // Apply rate limiting
      await this.applyRateLimit(url, robotsRules?.crawlDelay);

      // Perform the crawl
      const crawlResult = await this.performCrawl(url, extractAllLinks);

      return {
        ...crawlResult,
        crawlTime: Date.now() - startTime,
        robotsAllowed: robotsRules?.isAllowed ?? true,
        robotsDelay: robotsRules?.crawlDelay
      };

    } catch (error) {
      return {
        url,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        crawlTime: Date.now() - startTime,
        robotsAllowed: true
      };
    }
  }

  private async applyRateLimit(url: string, robotsDelay?: number): Promise<void> {
    const domain = new URL(url).hostname;
    const lastCrawl = this.domainLastCrawl.get(domain) || 0;
    const delay = robotsDelay || this.domainCrawlDelay.get(domain) || 1;

    // Store the delay for future requests
    if (robotsDelay) {
      this.domainCrawlDelay.set(domain, robotsDelay);
    }

    const timeSinceLastCrawl = Date.now() - lastCrawl;
    const requiredDelay = delay * 1000; // Convert to milliseconds

    if (timeSinceLastCrawl < requiredDelay) {
      const waitTime = requiredDelay - timeSinceLastCrawl;
      console.log(`Rate limiting: waiting ${waitTime}ms for ${domain}`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.domainLastCrawl.set(domain, Date.now());
  }

  private async performCrawl(url: string, extractAllLinks = false): Promise<Omit<CrawlResult, 'crawlTime' | 'robotsAllowed'>> {
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < this.options.maxRetries) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': this.options.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
          },
          signal: AbortSignal.timeout(this.options.timeout)
        });

        // Check response size
        const contentLength = response.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > this.options.maxContentSize) {
          return {
            url,
            success: false,
            statusCode: response.status,
            error: `Content too large: ${contentLength} bytes`
          };
        }

        // Check content type
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('text/html')) {
          return {
            url,
            success: false,
            statusCode: response.status,
            error: `Invalid content type: ${contentType}`
          };
        }

        if (!response.ok) {
          return {
            url,
            success: false,
            statusCode: response.status,
            error: `HTTP ${response.status}: ${response.statusText}`
          };
        }

        // Read response with size limit
        const html = await this.readResponseWithLimit(response);

        // Extract content
        const content = await this.contentExtractor.extractFromHtml(html, url, extractAllLinks);

        return {
          url,
          success: true,
          statusCode: response.status,
          content
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        attempt++;

        if (attempt < this.options.maxRetries) {
          // Exponential backoff
          const backoffDelay = Math.min(1000 * Math.pow(2, attempt), 5000);
          console.log(`Crawl attempt ${attempt} failed for ${url}, retrying in ${backoffDelay}ms`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
      }
    }

    return {
      url,
      success: false,
      error: `Failed after ${this.options.maxRetries} attempts: ${lastError?.message}`
    };
  }

  private async readResponseWithLimit(response: Response): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let html = '';
    let totalBytes = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        totalBytes += value.length;
        if (totalBytes > this.options.maxContentSize) {
          throw new Error(`Content exceeds size limit: ${totalBytes} bytes`);
        }

        html += decoder.decode(value, { stream: true });
      }

      // Final decode
      html += decoder.decode();
      return html;

    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Crawl multiple sites with controlled concurrency
   */
  async crawlMultiple(urls: string[], concurrency: number = 3): Promise<CrawlResult[]> {
    const results: CrawlResult[] = [];

    // Process in batches to respect rate limits
    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency);

      console.log(`Crawling batch ${Math.floor(i / concurrency) + 1}/${Math.ceil(urls.length / concurrency)}: ${batch.length} sites`);

      const batchPromises = batch.map(url => this.crawlSite(url));
      const batchResults = await Promise.all(batchPromises);

      results.push(...batchResults);

      // Brief pause between batches
      if (i + concurrency < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Get crawler statistics
   */
  getStats(): {
    domainsTracked: number;
    averageDelay: number;
    userAgent: string;
  } {
    const delays = Array.from(this.domainCrawlDelay.values());
    const averageDelay = delays.length > 0 ? delays.reduce((a, b) => a + b, 0) / delays.length : 1;

    return {
      domainsTracked: this.domainLastCrawl.size,
      averageDelay,
      userAgent: this.options.userAgent
    };
  }

  /**
   * Clear rate limiting cache (useful for testing)
   */
  clearCache(): void {
    this.domainLastCrawl.clear();
    this.domainCrawlDelay.clear();
  }
}