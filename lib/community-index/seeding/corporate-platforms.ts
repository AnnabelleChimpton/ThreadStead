/**
 * Registry of corporate platforms and their profile patterns
 * Used to identify and filter out corporate profiles from search index
 */

export interface PlatformPattern {
  domain: string;
  profilePatterns: string[];
  excludePatterns?: string[];
  linkLocations: string[];
  category: 'social_media' | 'development' | 'federated' | 'content' | 'creative' | 'streaming' | 'marketplace' | 'community' | 'link_service';
}

export interface PlatformRegistry {
  platforms: PlatformPattern[];
  isDomainCorporate(domain: string): boolean;
  isProfileUrl(url: string): { isProfile: boolean; platform?: PlatformPattern };
  getPlatformForDomain(domain: string): PlatformPattern | null;
}

export const CORPORATE_PLATFORMS: PlatformPattern[] = [
  // Social Media Platforms
  {
    domain: 'youtube.com',
    profilePatterns: ['/@*', '/channel/*', '/c/*', '/user/*'],
    linkLocations: ['about', 'description', 'channel_header'],
    category: 'social_media'
  },
  {
    domain: 'twitter.com',
    profilePatterns: ['/*'],
    excludePatterns: ['/home', '/explore', '/settings', '/login', '/signup'],
    linkLocations: ['bio', 'pinned_tweet'],
    category: 'social_media'
  },
  {
    domain: 'x.com',
    profilePatterns: ['/*'],
    excludePatterns: ['/home', '/explore', '/settings', '/login', '/signup'],
    linkLocations: ['bio', 'pinned_post'],
    category: 'social_media'
  },
  {
    domain: 'instagram.com',
    profilePatterns: ['/*'],
    excludePatterns: ['/accounts/*', '/explore', '/reels', '/direct'],
    linkLocations: ['bio', 'link_in_bio'],
    category: 'social_media'
  },
  {
    domain: 'facebook.com',
    profilePatterns: ['/people/*', '/profile.php', '/*'],
    excludePatterns: ['/groups', '/marketplace', '/watch', '/events', '/pages'],
    linkLocations: ['about', 'intro'],
    category: 'social_media'
  },
  {
    domain: 'linkedin.com',
    profilePatterns: ['/in/*', '/company/*'],
    linkLocations: ['about', 'contact_info'],
    category: 'social_media'
  },
  {
    domain: 'tiktok.com',
    profilePatterns: ['/@*'],
    linkLocations: ['bio'],
    category: 'social_media'
  },
  {
    domain: 'threads.net',
    profilePatterns: ['/@*'],
    linkLocations: ['bio'],
    category: 'social_media'
  },
  {
    domain: 'bsky.app',
    profilePatterns: ['/profile/*'],
    linkLocations: ['bio', 'description'],
    category: 'social_media'
  },
  {
    domain: 'pinterest.com',
    profilePatterns: ['/*'],
    excludePatterns: ['/pin/*', '/search', '/ideas'],
    linkLocations: ['about', 'website'],
    category: 'social_media'
  },
  {
    domain: 'snapchat.com',
    profilePatterns: ['/add/*'],
    linkLocations: ['profile'],
    category: 'social_media'
  },

  // Development Platforms
  {
    domain: 'github.com',
    profilePatterns: ['/*'],
    excludePatterns: ['/features', '/pricing', '/explore', '/marketplace', '/sponsors', '/*/*', '/orgs/*'],
    linkLocations: ['profile_readme', 'bio', 'website_field'],
    category: 'development'
  },
  {
    domain: 'gitlab.com',
    profilePatterns: ['/*'],
    excludePatterns: ['/explore', '/projects', '/groups', '/-/*', '/*/*'],
    linkLocations: ['profile', 'bio'],
    category: 'development'
  },
  {
    domain: 'bitbucket.org',
    profilePatterns: ['/*'],
    excludePatterns: ['/repo', '/product', '/*/*'],
    linkLocations: ['profile'],
    category: 'development'
  },
  {
    domain: 'codepen.io',
    profilePatterns: ['/*'],
    excludePatterns: ['/pen/*', '/pens', '/trending', '/challenges'],
    linkLocations: ['profile', 'website_field'],
    category: 'development'
  },
  {
    domain: 'codesandbox.io',
    profilePatterns: ['/u/*'],
    linkLocations: ['profile'],
    category: 'development'
  },
  {
    domain: 'replit.com',
    profilePatterns: ['/@*'],
    linkLocations: ['profile', 'bio'],
    category: 'development'
  },
  {
    domain: 'glitch.com',
    profilePatterns: ['/@*'],
    linkLocations: ['profile'],
    category: 'development'
  },
  {
    domain: 'stackoverflow.com',
    profilePatterns: ['/users/*'],
    linkLocations: ['profile', 'about'],
    category: 'development'
  },

  // Federated/Mastodon Instances (common ones)
  {
    domain: 'mastodon.social',
    profilePatterns: ['/@*'],
    linkLocations: ['bio', 'profile_metadata'],
    category: 'federated'
  },
  {
    domain: 'mastodon.online',
    profilePatterns: ['/@*'],
    linkLocations: ['bio', 'profile_metadata'],
    category: 'federated'
  },
  {
    domain: 'fosstodon.org',
    profilePatterns: ['/@*'],
    linkLocations: ['bio', 'profile_metadata'],
    category: 'federated'
  },
  {
    domain: 'mastodon.world',
    profilePatterns: ['/@*'],
    linkLocations: ['bio', 'profile_metadata'],
    category: 'federated'
  },
  {
    domain: 'mstdn.social',
    profilePatterns: ['/@*'],
    linkLocations: ['bio', 'profile_metadata'],
    category: 'federated'
  },
  {
    domain: 'mas.to',
    profilePatterns: ['/@*'],
    linkLocations: ['bio', 'profile_metadata'],
    category: 'federated'
  },
  {
    domain: 'techhub.social',
    profilePatterns: ['/@*'],
    linkLocations: ['bio', 'profile_metadata'],
    category: 'federated'
  },

  // Content Platforms
  {
    domain: 'medium.com',
    profilePatterns: ['/@*'],
    linkLocations: ['bio', 'about'],
    category: 'content'
  },
  {
    domain: 'substack.com',
    profilePatterns: ['/@*'],
    linkLocations: ['about', 'bio'],
    category: 'content'
  },
  {
    domain: 'dev.to',
    profilePatterns: ['/*'],
    excludePatterns: ['/t/*', '/tags', '/search', '/top'],
    linkLocations: ['bio', 'links'],
    category: 'content'
  },
  {
    domain: 'hashnode.dev',
    profilePatterns: ['/@*'],
    linkLocations: ['bio', 'social_links'],
    category: 'content'
  },
  {
    domain: 'wordpress.com',
    profilePatterns: ['/*.wordpress.com'],
    linkLocations: ['about', 'sidebar'],
    category: 'content'
  },
  {
    domain: 'blogger.com',
    profilePatterns: ['/*.blogspot.com'],
    linkLocations: ['about', 'sidebar'],
    category: 'content'
  },
  {
    domain: 'tumblr.com',
    profilePatterns: ['/*.tumblr.com'],
    linkLocations: ['about', 'description'],
    category: 'content'
  },
  {
    domain: 'ghost.io',
    profilePatterns: ['/*.ghost.io'],
    linkLocations: ['about', 'author'],
    category: 'content'
  },

  // Creative Platforms
  {
    domain: 'behance.net',
    profilePatterns: ['/*'],
    excludePatterns: ['/gallery/*', '/search', '/joblist'],
    linkLocations: ['about', 'website'],
    category: 'creative'
  },
  {
    domain: 'dribbble.com',
    profilePatterns: ['/*'],
    excludePatterns: ['/shots/*', '/jobs', '/designers'],
    linkLocations: ['bio', 'links'],
    category: 'creative'
  },
  {
    domain: 'deviantart.com',
    profilePatterns: ['/*'],
    excludePatterns: ['/art/*', '/daily-deviations', '/watch'],
    linkLocations: ['bio', 'website'],
    category: 'creative'
  },
  {
    domain: 'artstation.com',
    profilePatterns: ['/*'],
    excludePatterns: ['/artwork/*', '/marketplace', '/learning'],
    linkLocations: ['bio', 'portfolio_link'],
    category: 'creative'
  },
  {
    domain: 'flickr.com',
    profilePatterns: ['/people/*', '/photos/*'],
    linkLocations: ['about', 'website'],
    category: 'creative'
  },
  {
    domain: '500px.com',
    profilePatterns: ['/*'],
    excludePatterns: ['/photo/*', '/popular', '/fresh'],
    linkLocations: ['bio', 'website'],
    category: 'creative'
  },
  {
    domain: 'unsplash.com',
    profilePatterns: ['/@*'],
    linkLocations: ['bio', 'portfolio_link'],
    category: 'creative'
  },

  // Streaming Platforms
  {
    domain: 'twitch.tv',
    profilePatterns: ['/*'],
    excludePatterns: ['/directory', '/videos/*', '/search'],
    linkLocations: ['about', 'panels'],
    category: 'streaming'
  },
  {
    domain: 'spotify.com',
    profilePatterns: ['/artist/*', '/user/*'],
    linkLocations: ['artist_bio', 'profile'],
    category: 'streaming'
  },
  {
    domain: 'soundcloud.com',
    profilePatterns: ['/*'],
    excludePatterns: ['/discover', '/stream', '/upload'],
    linkLocations: ['bio', 'links'],
    category: 'streaming'
  },
  {
    domain: 'bandcamp.com',
    profilePatterns: ['/*.bandcamp.com'],
    linkLocations: ['about', 'links'],
    category: 'streaming'
  },
  {
    domain: 'vimeo.com',
    profilePatterns: ['/*'],
    excludePatterns: ['/watch', '/categories', '/stock'],
    linkLocations: ['about', 'website'],
    category: 'streaming'
  },

  // Marketplace/Support Platforms
  {
    domain: 'etsy.com',
    profilePatterns: ['/shop/*', '/people/*'],
    linkLocations: ['shop_announcement', 'about'],
    category: 'marketplace'
  },
  {
    domain: 'patreon.com',
    profilePatterns: ['/*'],
    excludePatterns: ['/creators', '/c/*', '/login', '/signup'],
    linkLocations: ['about', 'creator_page'],
    category: 'marketplace'
  },
  {
    domain: 'ko-fi.com',
    profilePatterns: ['/*'],
    excludePatterns: ['/explore', '/gold', '/commissions'],
    linkLocations: ['about', 'links'],
    category: 'marketplace'
  },
  {
    domain: 'buymeacoffee.com',
    profilePatterns: ['/*'],
    excludePatterns: ['/explore', '/creators'],
    linkLocations: ['about', 'links'],
    category: 'marketplace'
  },
  {
    domain: 'gumroad.com',
    profilePatterns: ['/*'],
    excludePatterns: ['/discover', '/features'],
    linkLocations: ['profile', 'about'],
    category: 'marketplace'
  },

  // Community Platforms
  {
    domain: 'reddit.com',
    profilePatterns: ['/user/*', '/u/*'],
    excludePatterns: ['/r/*'],
    linkLocations: ['profile', 'about'],
    category: 'community'
  },
  {
    domain: 'discord.com',
    profilePatterns: ['/users/*'],
    linkLocations: ['profile'],
    category: 'community'
  },
  {
    domain: 'discord.gg',
    profilePatterns: ['/*'],
    linkLocations: ['server_about'],
    category: 'community'
  },
  {
    domain: 'slack.com',
    profilePatterns: ['/*.slack.com'],
    linkLocations: ['profile'],
    category: 'community'
  },
  {
    domain: 'telegram.org',
    profilePatterns: ['/*'],
    linkLocations: ['bio'],
    category: 'community'
  },
  {
    domain: 't.me',
    profilePatterns: ['/*'],
    linkLocations: ['bio'],
    category: 'community'
  },

  // Link Services (should never be indexed)
  {
    domain: 'linktr.ee',
    profilePatterns: ['/*'],
    linkLocations: ['links'],
    category: 'link_service'
  },
  {
    domain: 'linkin.bio',
    profilePatterns: ['/*'],
    linkLocations: ['links'],
    category: 'link_service'
  },
  {
    domain: 'bio.link',
    profilePatterns: ['/*'],
    linkLocations: ['links'],
    category: 'link_service'
  },
  {
    domain: 'beacons.ai',
    profilePatterns: ['/*'],
    linkLocations: ['links'],
    category: 'link_service'
  },
  {
    domain: 'carrd.co',
    profilePatterns: ['/*'],
    linkLocations: ['links'],
    category: 'link_service'
  },
  {
    domain: 'about.me',
    profilePatterns: ['/*'],
    linkLocations: ['links'],
    category: 'link_service'
  }
];

/**
 * Check if a URL matches any profile pattern for a platform
 */
function matchesPattern(pathname: string, patterns: string[], excludePatterns?: string[]): boolean {
  // Check exclude patterns first
  if (excludePatterns) {
    for (const pattern of excludePatterns) {
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        if (regex.test(pathname)) {
          return false;
        }
      } else if (pathname === pattern || pathname.startsWith(pattern + '/')) {
        return false;
      }
    }
  }

  // Check include patterns
  for (const pattern of patterns) {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      if (regex.test(pathname)) {
        return true;
      }
    } else if (pathname === pattern || pathname.startsWith(pattern + '/')) {
      return true;
    }
  }

  return false;
}

/**
 * Main registry class for corporate platform detection
 */
export class CorporatePlatformRegistry implements PlatformRegistry {
  platforms: PlatformPattern[];

  constructor() {
    this.platforms = CORPORATE_PLATFORMS;
  }

  /**
   * Check if a domain is a known corporate platform
   */
  isDomainCorporate(domain: string): boolean {
    const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');

    // Check main domains
    if (this.platforms.some(p => p.domain === normalizedDomain)) {
      return true;
    }

    // Check subdomain patterns (*.wordpress.com, *.tumblr.com, etc.)
    for (const platform of this.platforms) {
      if (platform.profilePatterns.some(pattern => {
        if (pattern.includes('*.')) {
          const baseDomain = pattern.replace('*.', '');
          if (normalizedDomain.endsWith(baseDomain)) {
            return true;
          }
        }
        return false;
      })) {
        return true;
      }
    }

    // Check for Mastodon-like federated instances
    // Common patterns: mastodon.*, *.social, *.community
    const federatedPatterns = [
      /^mastodon\./,
      /^mstdn\./,
      /^mas\./,
      /\.social$/,
      /\.community$/,
      /\.im$/,
      /\.club$/
    ];

    if (federatedPatterns.some(pattern => pattern.test(normalizedDomain))) {
      // Additional check: does it look like a Mastodon instance?
      // This is a heuristic, may need refinement
      return true;
    }

    return false;
  }

  /**
   * Check if a URL is a profile URL on a corporate platform
   */
  isProfileUrl(url: string): { isProfile: boolean; platform?: PlatformPattern } {
    try {
      const parsed = new URL(url);
      const domain = parsed.hostname.toLowerCase().replace(/^www\./, '');
      const pathname = parsed.pathname;

      // Find matching platform
      const platform = this.getPlatformForDomain(domain);

      if (!platform) {
        return { isProfile: false };
      }

      // Check if URL matches profile patterns
      const isProfile = matchesPattern(pathname, platform.profilePatterns, platform.excludePatterns);

      return { isProfile, platform: isProfile ? platform : undefined };
    } catch {
      return { isProfile: false };
    }
  }

  /**
   * Get platform configuration for a domain
   */
  getPlatformForDomain(domain: string): PlatformPattern | null {
    const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');

    // Direct match
    const directMatch = this.platforms.find(p => p.domain === normalizedDomain);
    if (directMatch) {
      return directMatch;
    }

    // Check subdomain patterns
    for (const platform of this.platforms) {
      for (const pattern of platform.profilePatterns) {
        if (pattern.includes('*.')) {
          const baseDomain = pattern.replace('*.', '');
          if (normalizedDomain.endsWith(baseDomain)) {
            return platform;
          }
        }
      }
    }

    // Check if it might be a Mastodon instance
    const federatedPatterns = [
      /^mastodon\./,
      /^mstdn\./,
      /^mas\./,
      /\.social$/,
      /\.community$/
    ];

    if (federatedPatterns.some(pattern => pattern.test(normalizedDomain))) {
      // Return a generic Mastodon configuration
      return {
        domain: normalizedDomain,
        profilePatterns: ['/@*'],
        linkLocations: ['bio', 'profile_metadata'],
        category: 'federated'
      };
    }

    return null;
  }
}

// Export singleton instance
export const corporatePlatforms = new CorporatePlatformRegistry();