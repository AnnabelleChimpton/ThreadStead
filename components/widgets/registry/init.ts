import { widgetRegistry } from './WidgetRegistry';

// Import all widget definitions
import { welcomeWidget } from '../examples/WelcomeWidget';
import { newNeighborsWidget } from '../examples/NewNeighborsWidget';
import { threadRingActivityWidget } from '../examples/ThreadRingActivityWidget';
import { friendActivityWidget } from '../examples/FriendActivityWidget';
import { trendingContentWidget } from '../examples/TrendingContentWidget';
import { pixelHomesNeighborhoodWidget } from '../examples/PixelHomesNeighborhoodWidget';

// Register all widgets
export function initializeWidgets() {
  // Example widgets
  widgetRegistry.register(welcomeWidget);

  // Social widgets
  widgetRegistry.register(newNeighborsWidget);
  widgetRegistry.register(threadRingActivityWidget);
  widgetRegistry.register(friendActivityWidget);

  // Content widgets
  widgetRegistry.register(trendingContentWidget);

  // Community widgets
  widgetRegistry.register(pixelHomesNeighborhoodWidget);
}

// Auto-initialize when this module is imported
initializeWidgets();