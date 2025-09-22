// Basic analytics events for Pixel Homes
// This is a simple client-side tracking system for understanding user behavior

interface PixelHomeEvent {
  event: string
  properties: Record<string, any>
  timestamp: Date
  userId?: string
  sessionId: string
}

class PixelHomeAnalytics {
  private sessionId: string
  private userId?: string
  private events: PixelHomeEvent[] = []

  constructor() {
    this.sessionId = this.generateSessionId()
    this.setupSession()
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private setupSession() {
    // Set up session tracking
    if (typeof window !== 'undefined') {
      // Track page load time
      window.addEventListener('load', () => {
        this.track('pixel_home_loaded', {
          load_time: Date.now() - performance.timing.navigationStart
        })
      })

      // Track page visibility changes
      document.addEventListener('visibilitychange', () => {
        this.track('pixel_home_visibility_change', {
          hidden: document.hidden
        })
      })
    }
  }

  setUserId(userId: string) {
    this.userId = userId
  }

  track(eventName: string, properties: Record<string, any> = {}) {
    const event: PixelHomeEvent = {
      event: eventName,
      properties: {
        ...properties,
        url: typeof window !== 'undefined' ? window.location.href : '',
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        screen_width: typeof window !== 'undefined' ? window.screen.width : null,
        screen_height: typeof window !== 'undefined' ? window.screen.height : null
      },
      timestamp: new Date(),
      userId: this.userId,
      sessionId: this.sessionId
    }

    this.events.push(event)

    // Store in localStorage for potential batch sending
    this.persistEvent(event)
  }

  private persistEvent(event: PixelHomeEvent) {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem('pixel_home_events') || '[]'
      const events = JSON.parse(stored)
      events.push(event)
      
      // Keep only last 100 events
      if (events.length > 100) {
        events.splice(0, events.length - 100)
      }

      localStorage.setItem('pixel_home_events', JSON.stringify(events))
    } catch (error) {
      console.warn('Failed to persist analytics event:', error)
    }
  }

  // Specific tracking methods for Pixel Homes
  trackHouseLoad(template: string, palette: string, username: string) {
    this.track('pixel_house_loaded', {
      house_template: template,
      color_palette: palette,
      target_username: username
    })
  }

  trackHotspotClick(hotspotType: 'door' | 'mailbox' | 'threadbook' | 'flag', username: string) {
    this.track('pixel_hotspot_clicked', {
      hotspot_type: hotspotType,
      target_username: username
    })
  }

  trackModalOpen(modalType: 'guestbook' | 'threadbook', username: string) {
    this.track('pixel_modal_opened', {
      modal_type: modalType,
      target_username: username
    })
  }

  trackNavigation(fromInterface: 'pixel_home' | 'profile', toInterface: 'pixel_home' | 'profile', username: string) {
    this.track('pixel_navigation', {
      from_interface: fromInterface,
      to_interface: toInterface,
      target_username: username
    })
  }

  trackThemeSelection(template: string, palette: string) {
    this.track('pixel_theme_selected', {
      house_template: template,
      color_palette: palette
    })
  }

  trackHomeCustomization(changes: Record<string, any>) {
    this.track('pixel_home_customized', {
      changes
    })
  }

  trackBadgeInteraction(badgeId: string, action: 'hover' | 'click') {
    this.track('pixel_badge_interaction', {
      badge_id: badgeId,
      action
    })
  }

  // Get analytics summary
  getSummary() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      eventCount: this.events.length,
      events: this.events
    }
  }

  // Send events to server (placeholder for future implementation)
  async flush() {
    if (this.events.length === 0) return

    try {
      // In a real implementation, send to analytics API
      // await fetch('/api/analytics/pixel-homes', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ events: this.events })
      // })

      this.events = []
    } catch (error) {
      console.warn('Failed to send analytics events:', error)
    }
  }
}

// Create singleton instance
let analytics: PixelHomeAnalytics | null = null

export function getPixelHomeAnalytics(): PixelHomeAnalytics {
  if (!analytics) {
    analytics = new PixelHomeAnalytics()
  }
  return analytics
}

// Convenience exports
export function trackHouseLoad(template: string, palette: string, username: string) {
  getPixelHomeAnalytics().trackHouseLoad(template, palette, username)
}

export function trackHotspotClick(hotspotType: 'door' | 'mailbox' | 'threadbook' | 'flag', username: string) {
  getPixelHomeAnalytics().trackHotspotClick(hotspotType, username)
}

export function trackModalOpen(modalType: 'guestbook' | 'threadbook', username: string) {
  getPixelHomeAnalytics().trackModalOpen(modalType, username)
}

export function trackNavigation(fromInterface: 'pixel_home' | 'profile', toInterface: 'pixel_home' | 'profile', username: string) {
  getPixelHomeAnalytics().trackNavigation(fromInterface, toInterface, username)
}

export function trackThemeSelection(template: string, palette: string) {
  getPixelHomeAnalytics().trackThemeSelection(template, palette)
}

export function trackHomeCustomization(changes: Record<string, any>) {
  getPixelHomeAnalytics().trackHomeCustomization(changes)
}

export function trackBadgeInteraction(badgeId: string, action: 'hover' | 'click') {
  getPixelHomeAnalytics().trackBadgeInteraction(badgeId, action)
}