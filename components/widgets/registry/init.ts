import { widgetRegistry } from './WidgetRegistry';

// Import all widget definitions
import { welcomeWidget } from '../examples/WelcomeWidget';
import { newNeighborsWidget } from '../examples/NewNeighborsWidget';
import { threadRingActivityWidget } from '../examples/ThreadRingActivityWidget';
import { friendActivityWidget } from '../examples/FriendActivityWidget';
import { trendingContentWidget } from '../examples/TrendingContentWidget';
import { pixelHomesNeighborhoodWidget } from '../examples/PixelHomesNeighborhoodWidget';
import { weatherWidget } from '../examples/WeatherWidget';
import { siteNewsWidget } from '../examples/SiteNewsWidget';
import { quickActionsWidget } from '../examples/QuickActionsWidget';

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

  // Utility widgets
  widgetRegistry.register(weatherWidget);
  widgetRegistry.register(quickActionsWidget);

  // Information widgets
  widgetRegistry.register(siteNewsWidget);
}

// Auto-initialize when this module is imported
initializeWidgets();