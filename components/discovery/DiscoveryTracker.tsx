/**
 * React component to initialize discovery tracking
 * Include this in your app layout to enable automatic tracking
 */

import { useEffect } from 'react';
import { discoveryTracker } from '@/lib/community-index/discovery/client-tracker';

interface DiscoveryTrackerProps {
  enabled?: boolean;
  children?: React.ReactNode;
}

export function DiscoveryTracker({ enabled = true, children }: DiscoveryTrackerProps) {
  useEffect(() => {
    discoveryTracker.setTrackingEnabled(enabled);

    // Retry any failed events on component mount
    discoveryTracker.retryFailedEvents();
  }, [enabled]);

  return <>{children}</>;
}

export default DiscoveryTracker;