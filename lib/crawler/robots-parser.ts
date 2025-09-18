/**
 * Simple robots.txt parser
 * Respects crawl delays and disallowed paths
 */

export interface RobotsRules {
  isAllowed: boolean;
  crawlDelay?: number;
  userAgent: string;
}

export class RobotsParser {
  private cache = new Map<string, { rules: any; expires: number }>();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  async checkRobots(url: string, userAgent: string = '*'): Promise<RobotsRules> {
    const domain = this.extractDomain(url);
    const robotsUrl = `${domain}/robots.txt`;

    // Check cache first
    const cached = this.cache.get(robotsUrl);
    if (cached && cached.expires > Date.now()) {
      return this.parseRules(cached.rules, url, userAgent);
    }

    try {
      const response = await fetch(robotsUrl, {
        headers: { 'User-Agent': userAgent },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      if (!response.ok) {
        // No robots.txt found - allow crawling with default delay
        return { isAllowed: true, crawlDelay: 1, userAgent };
      }

      const robotsText = await response.text();
      const rules = this.parseRobotsText(robotsText);

      // Cache the results
      this.cache.set(robotsUrl, {
        rules,
        expires: Date.now() + this.CACHE_TTL
      });

      return this.parseRules(rules, url, userAgent);
    } catch (error) {
      console.warn(`Failed to fetch robots.txt for ${domain}:`, error);
      // Default to allowing with conservative delay
      return { isAllowed: true, crawlDelay: 2, userAgent };
    }
  }

  private extractDomain(url: string): string {
    try {
      const parsed = new URL(url);
      return `${parsed.protocol}//${parsed.host}`;
    } catch {
      throw new Error(`Invalid URL: ${url}`);
    }
  }

  private parseRobotsText(robotsText: string): any {
    const lines = robotsText.split('\n').map(line => line.trim());
    const rules: any = { userAgents: {} };
    let currentUserAgent: string | null = null;

    for (const line of lines) {
      if (line.startsWith('#') || !line) continue; // Skip comments and empty lines

      const [directive, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();

      if (directive.toLowerCase() === 'user-agent') {
        currentUserAgent = value.toLowerCase();
        if (!rules.userAgents[currentUserAgent]) {
          rules.userAgents[currentUserAgent] = {
            disallow: [],
            allow: [],
            crawlDelay: undefined
          };
        }
      } else if (currentUserAgent) {
        const userAgentRules = rules.userAgents[currentUserAgent];

        switch (directive.toLowerCase()) {
          case 'disallow':
            if (value) userAgentRules.disallow.push(value);
            break;
          case 'allow':
            if (value) userAgentRules.allow.push(value);
            break;
          case 'crawl-delay':
            const delay = parseFloat(value);
            if (!isNaN(delay)) userAgentRules.crawlDelay = delay;
            break;
        }
      }
    }

    return rules;
  }

  private parseRules(rules: any, url: string, userAgent: string): RobotsRules {
    const path = new URL(url).pathname;

    // Try specific user agent first, then fallback to *
    const userAgents = [userAgent.toLowerCase(), '*'];
    let applicableRules = null;

    for (const ua of userAgents) {
      if (rules.userAgents[ua]) {
        applicableRules = rules.userAgents[ua];
        break;
      }
    }

    if (!applicableRules) {
      return { isAllowed: true, crawlDelay: 1, userAgent };
    }

    // Check disallow rules first
    for (const disallowPath of applicableRules.disallow) {
      if (this.pathMatches(path, disallowPath)) {
        // Check if there's a more specific allow rule
        let allowed = false;
        for (const allowPath of applicableRules.allow) {
          if (this.pathMatches(path, allowPath) && allowPath.length > disallowPath.length) {
            allowed = true;
            break;
          }
        }
        if (!allowed) {
          return { isAllowed: false, userAgent };
        }
      }
    }

    return {
      isAllowed: true,
      crawlDelay: applicableRules.crawlDelay || 1,
      userAgent
    };
  }

  private pathMatches(path: string, pattern: string): boolean {
    if (pattern === '') return true; // Empty pattern matches all
    if (pattern === '/') return path === '/';

    // Handle wildcards (simple implementation)
    if (pattern.endsWith('*')) {
      return path.startsWith(pattern.slice(0, -1));
    }

    return path.startsWith(pattern);
  }
}