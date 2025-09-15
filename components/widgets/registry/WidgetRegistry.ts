import { Widget, WidgetConfig } from '../types/widget';

export class WidgetRegistry {
  private static instance: WidgetRegistry;
  private widgets: Map<string, Widget> = new Map();

  private constructor() {}

  static getInstance(): WidgetRegistry {
    if (!WidgetRegistry.instance) {
      WidgetRegistry.instance = new WidgetRegistry();
    }
    return WidgetRegistry.instance;
  }

  register(widget: Widget): void {
    this.widgets.set(widget.config.id, widget);
  }

  unregister(widgetId: string): void {
    this.widgets.delete(widgetId);
  }

  get(widgetId: string): Widget | undefined {
    return this.widgets.get(widgetId);
  }

  getAll(): Widget[] {
    return Array.from(this.widgets.values());
  }

  getByCategory(category: string): Widget[] {
    return this.getAll().filter(widget => widget.config.category === category);
  }

  getAvailableForUser(user?: { role: string } | null): Widget[] {
    return this.getAll().filter(widget => {
      // Check auth requirement
      if (widget.config.requiresAuth && !user) {
        return false;
      }

      // Check admin requirement
      if (widget.config.adminOnly && user?.role !== 'admin') {
        return false;
      }

      return true;
    });
  }

  getEnabledWidgets(
    enabledWidgetIds: string[],
    user?: { role: string } | null
  ): Widget[] {
    const availableWidgets = this.getAvailableForUser(user);
    return availableWidgets.filter(widget =>
      enabledWidgetIds.includes(widget.config.id)
    );
  }
}

export const widgetRegistry = WidgetRegistry.getInstance();