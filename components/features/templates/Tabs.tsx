import React, { useState } from 'react';
import { UniversalCSSProps, separateCSSProps, applyCSSProps, removeTailwindConflicts } from '@/lib/templates/styling/universal-css-props';

interface TabsProps extends UniversalCSSProps {
  children: React.ReactNode;
  className?: string;
  /** What screen readers call the row of tabs */
  label?: string;
}

interface TabProps {
  title: string;
  children: React.ReactNode;
}

export function Tab({ title, children }: TabProps) {
  // Tab component - exposes its title via data attribute for Islands rendering
  // The Tabs parent will handle the actual rendering
  return <div data-tab-title={title}>{children}</div>;
}

export default function Tabs(props: TabsProps) {
  const { cssProps, componentProps } = separateCSSProps(props);
  const { children, className: customClassName, label = 'Sections' } = componentProps;
  // Ids of its own: two Tabs on a page shared tab-0/panel-0 (template audit 14 #6)
  const baseId = React.useId();
  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  // Handle both direct Tab components and children from Islands rendering
  const childArray = React.Children.toArray(children);
  
  // Keyed on children (not their count): same-count re-renders must still
  // pick up new titles and content. Nothing here sets state, so it cannot loop.
  const tabs = React.useMemo(() => {
    return React.Children.toArray(children).map((child, index) => {
      if (React.isValidElement(child)) {
        // P3.3 FIX: Unwrap IslandErrorBoundary and ResidentDataProvider to find Tab components
        let actualChild = child;
        let actualProps = child.props as any;

        // First, unwrap IslandErrorBoundary if present
        const typeName = (child.type as any)?.name || (child.type as any)?.displayName;
        if (typeName === 'IslandErrorBoundary' && actualProps.children && React.isValidElement(actualProps.children)) {
          actualChild = actualProps.children;
          actualProps = actualChild.props as any;
        }

        // Then, unwrap ResidentDataProvider if present
        const actualTypeName = (actualChild.type as any)?.name || (actualChild.type as any)?.displayName;
        if (actualTypeName === 'ResidentDataProvider' && actualProps.children && React.isValidElement(actualProps.children)) {
          actualChild = actualProps.children;
          actualProps = actualChild.props as any;
        }

        // Now check the unwrapped component
        // Check if it's a Tab component (direct match)
        if (actualChild.type === Tab) {
          return {
            title: actualProps.title,
            content: actualProps.children
          };
        }

        // Check if it's a Tab component by name/displayName (for compiled components)
        const finalTypeName = (actualChild.type as any)?.name || (actualChild.type as any)?.displayName;
        if (finalTypeName === 'Tab') {
          return {
            title: actualProps.title,
            content: actualProps.children
          };
        }

        // Check for data-tab-title attribute (from Tab component rendering) - this is the most reliable method
        if (actualProps['data-tab-title']) {
          return {
            title: actualProps['data-tab-title'],
            content: actualProps.children
          };
        }

        // Fallback: check if child has a title prop directly
        if (actualProps.title) {
          return {
            title: actualProps.title,
            content: actualProps.children || actualChild
          };
        }
      }
      return null;
  }).filter(Boolean) as Array<{ title: string; content: React.ReactNode }>;
  }, [children]);

  const [activeIndex, setActiveIndex] = useState(0);

  const baseClasses = "profile-tabs-wrapper";
  const filteredClasses = removeTailwindConflicts(baseClasses, cssProps);
  const style = applyCSSProps(cssProps);

  const wrapperClassName = customClassName
    ? `${filteredClasses} ${customClassName}`
    : filteredClasses;

  if (tabs.length === 0) {
    return (
      <div className={`profile-tabs-empty text-thread-sage italic p-4 ${wrapperClassName}`} style={style}>
        No tabs to display (received {childArray.length} children)
      </div>
    );
  }

  return (
    <div className={wrapperClassName} style={style}>
      <div className="profile-tabs thread-module p-0 overflow-hidden">
        <div
          role="tablist"
          aria-label={label}
          className="profile-tab-list flex md:flex-wrap border-b border-thread-sage/30"
          // Arrow keys move between tabs, Home and End to the ends; only the
          // open tab is a Tab stop
          onKeyDown={(event) => {
            const last = tabs.length - 1;
            const next = { ArrowRight: activeIndex + 1, ArrowLeft: activeIndex - 1, Home: 0, End: last }[event.key];
            if (next === undefined) return;
            event.preventDefault();
            const index = next > last ? 0 : next < 0 ? last : next;
            setActiveIndex(index);
            tabRefs.current[index]?.focus();
          }}
        >
          {tabs.map((tab, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={index}
                ref={(el) => { tabRefs.current[index] = el; }}
                role="tab"
                aria-selected={isActive}
                aria-controls={`${baseId}-panel-${index}`}
                id={`${baseId}-tab-${index}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveIndex(index)}
                className={`profile-tab-button px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-r border-thread-sage/20 focus:outline-none transition-all min-w-fit ${
                  isActive
                    ? 'active bg-thread-cream font-medium text-thread-pine'
                    : 'bg-thread-paper hover:bg-thread-cream/50 text-thread-sage hover:text-thread-pine'
                }`}
              >
                {tab.title}
              </button>
            );
          })}
        </div>
        <div
          role="tabpanel"
          id={`${baseId}-panel-${activeIndex}`}
          aria-labelledby={`${baseId}-tab-${activeIndex}`}
          tabIndex={0}
          className="profile-tab-panel p-4 sm:p-5 md:p-6"
        >
          {tabs[activeIndex]?.content}
        </div>
      </div>
    </div>
  );
}