/**
 * Client-side discovery tracking utility
 * Automatically tracks when users navigate to community-indexed sites
 */

export interface ClientDiscoveryEvent {
  fromSite?: string;
  toSite: string;
  discoveryMethod: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export class ClientDiscoveryTracker {
  private sessionId: string;
  private currentSite: string;
  private trackingEnabled: boolean = true;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.currentSite = typeof window !== 'undefined' ? window.location.origin : '';
    this.initializeTracking();
  }

  /**
   * Initialize automatic link tracking for indexed sites
   */
  private initializeTracking(): void {
    if (typeof window === 'undefined') return;

    // Track clicks on external links
    document.addEventListener('click', this.handleLinkClick.bind(this));

    // Track navigation events
    window.addEventListener('beforeunload', this.handlePageUnload.bind(this));
  }

  /**
   * Handle link clicks to detect navigation to indexed sites
   */
  private async handleLinkClick(event: MouseEvent): Promise<void> {
    if (!this.trackingEnabled) return;

    const target = event.target as HTMLElement;
    const link = target.closest('a') as HTMLAnchorElement;

    if (!link || !link.href) return;

    const url = new URL(link.href);

    // Only track external links
    if (url.origin === window.location.origin) return;

    // Check if destination is an indexed site
    const isIndexed = await this.isIndexedSite(url.origin);
    if (!isIndexed) return;

    // Determine discovery method based on context
    const discoveryMethod = this.getDiscoveryMethod(link);

    // Track the discovery event
    await this.trackDiscovery({
      fromSite: this.currentSite,
      toSite: url.origin,
      discoveryMethod,
      sessionId: this.sessionId,
      metadata: {
        linkText: link.textContent?.trim(),
        linkHref: link.href,
        pageTitle: document.title,
        referrer: document.referrer,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Determine discovery method based on link context
   */
  private getDiscoveryMethod(link: HTMLAnchorElement): string {
    const linkText = link.textContent?.toLowerCase() || '';
    const href = link.href.toLowerCase();
    const className = link.className.toLowerCase();

    // Check for specific UI elements
    if (className.includes('surprise') || linkText.includes('surprise')) {
      return 'surprise';
    }

    if (className.includes('random') || linkText.includes('random')) {
      return 'random';
    }

    if (className.includes('search') || linkText.includes('search')) {
      return 'search_result';
    }

    if (className.includes('webring') || linkText.includes('webring')) {
      return 'webring';
    }

    if (className.includes('recommendation') || linkText.includes('recommend')) {
      return 'recommendation';
    }

    // Check page context
    const pathname = window.location.pathname;
    if (pathname.includes('/search')) {
      return 'search_result';
    }

    if (pathname.includes('/community-index')) {
      return 'validation';
    }

    // Default to link click
    return 'link_click';
  }

  /**
   * Check if a site is in our community index
   */
  private async isIndexedSite(siteUrl: string): Promise<boolean> {
    try {
      const response = await fetch('/api/community-index/check-indexed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: siteUrl })
      });

      if (!response.ok) return false;

      const data = await response.json();
      return data.indexed === true;
    } catch (error) {
      console.warn('Failed to check if site is indexed:', error);
      return false;
    }
  }

  /**
   * Send discovery event to tracking API
   */
  private async trackDiscovery(event: ClientDiscoveryEvent): Promise<void> {
    try {
      await fetch('/api/community-index/track-discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      });
    } catch (error) {
      console.warn('Failed to track discovery event:', error);
      // Store in localStorage for retry later
      this.storeFailedEvent(event);
    }
  }

  /**
   * Store failed tracking events for retry
   */
  private storeFailedEvent(event: ClientDiscoveryEvent): void {
    try {
      const stored = localStorage.getItem('failed_discovery_events');
      const events = stored ? JSON.parse(stored) : [];
      events.push({ ...event, failedAt: Date.now() });

      // Keep only last 10 failed events
      localStorage.setItem('failed_discovery_events',
        JSON.stringify(events.slice(-10))
      );
    } catch (error) {
      // Ignore localStorage errors
    }
  }

  /**
   * Retry failed tracking events
   */
  public async retryFailedEvents(): Promise<void> {
    try {
      const stored = localStorage.getItem('failed_discovery_events');
      if (!stored) return;

      const events = JSON.parse(stored);
      const successful: any[] = [];

      for (const event of events) {
        try {
          await this.trackDiscovery(event);
          successful.push(event);
        } catch (error) {
          // Keep failed events for later retry
        }
      }

      // Remove successful events
      const remaining = events.filter((e: any) => !successful.includes(e));
      localStorage.setItem('failed_discovery_events', JSON.stringify(remaining));
    } catch (error) {
      // Ignore localStorage errors
    }
  }

  /**
   * Handle page unload to track session end
   */
  private handlePageUnload(): void {
    // Send any remaining tracking data
    navigator.sendBeacon?.('/api/community-index/track-discovery',
      JSON.stringify({
        fromSite: this.currentSite,
        toSite: 'session_end',
        discoveryMethod: 'session_end',
        sessionId: this.sessionId,
        metadata: {
          sessionDuration: Date.now() - parseInt(this.sessionId.split('_')[1]),
          pageTitle: document.title
        }
      })
    );
  }

  /**
   * Manually track a discovery event
   */
  public async trackManualDiscovery(
    toSite: string,
    discoveryMethod: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.trackDiscovery({
      fromSite: this.currentSite,
      toSite,
      discoveryMethod,
      sessionId: this.sessionId,
      metadata
    });
  }

  /**
   * Enable or disable tracking
   */
  public setTrackingEnabled(enabled: boolean): void {
    this.trackingEnabled = enabled;
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current session ID
   */
  public getSessionId(): string {
    return this.sessionId;
  }
}

// Export singleton instance
export const discoveryTracker = new ClientDiscoveryTracker();

// Auto-retry failed events on page load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(() => discoveryTracker.retryFailedEvents(), 1000);
  });
}