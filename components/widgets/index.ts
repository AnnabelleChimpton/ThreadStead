// Core widget system exports
export { default as BaseWidget } from './core/BaseWidget';
export { default as WidgetCard } from './core/WidgetCard';
export { default as WidgetContainer } from './core/WidgetContainer';

// Registry
export { WidgetRegistry, widgetRegistry } from './registry/WidgetRegistry';

// Initialize widgets (auto-registers all widgets)
import './registry/init';

// Types
export type {
  Widget,
  WidgetConfig,
  WidgetProps,
  WidgetData,
  WidgetContainerProps,
  WidgetSize,
  WidgetCategory
} from './types/widget';

// Hooks
export { useWidgets, useDefaultWidgets } from '../../hooks/useWidgets';