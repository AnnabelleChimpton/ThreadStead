import React, { useState } from 'react';

interface TabsProps {
  children: React.ReactNode;
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

export default function Tabs({ children }: TabsProps) {
  // Handle both direct Tab components and children from Islands rendering
  const childArray = React.Children.toArray(children);
  
  // Memoize tabs calculation with stable key to prevent infinite re-renders
  const tabs = React.useMemo(() => {
    return childArray.map((child, index) => {
      if (React.isValidElement(child)) {
        const props = child.props as any;
        
        // Debug logging to understand what we're receiving (temporarily enabled for production debugging)
        const wrappedChild = props.children;
        const wrappedProps = React.isValidElement(wrappedChild) ? wrappedChild.props as any : null;
        
        console.log(`Tabs child ${index}:`, {
          type: child.type,
          typeName: (child.type as any)?.name || (child.type as any)?.displayName,
          hasDataTabTitle: !!props['data-tab-title'],
          dataTabTitle: props['data-tab-title'],
          hasTitle: !!props.title,
          title: props.title,
          propKeys: Object.keys(props),
          isTab: child.type === Tab,
          wrappedChild: wrappedChild ? {
            type: wrappedChild.type,
            typeName: (wrappedChild.type as any)?.name || (wrappedChild.type as any)?.displayName,
            hasTitle: !!wrappedProps?.title,
            title: wrappedProps?.title,
            hasDataTabTitle: !!wrappedProps?.['data-tab-title'],
            dataTabTitle: wrappedProps?.['data-tab-title'],
            isTab: wrappedChild.type === Tab
          } : null,
          env: process.env.NODE_ENV
        });
        
        // Check if it's a Tab component (direct match)
        if (child.type === Tab) {
          return {
            title: props.title,
            content: props.children
          };
        }
        
        // Check if it's a Tab component by name/displayName (for compiled components)
        const typeName = (child.type as any)?.name || (child.type as any)?.displayName;
        if (typeName === 'Tab') {
          return {
            title: props.title,
            content: props.children
          };
        }
        
        // Check for data-tab-title attribute (from Tab component rendering) - this is the most reliable method
        if (props['data-tab-title']) {
          return {
            title: props['data-tab-title'],
            content: props.children
          };
        }
        
        // Check if it's wrapped in ResidentDataProvider (from island rendering)
        // In production, component names are minified, so also check for wrapper patterns
        const isWrapper = typeName === 'ResidentDataProvider' || 
                         (typeName && typeName.length === 1 && props.data && props.children); // Minified wrapper pattern
        
        if (isWrapper && props.children && React.isValidElement(props.children)) {
          const wrappedChild = props.children;
          const wrappedProps = wrappedChild.props as any;
          
          // Check if the wrapped child is a Tab component (direct reference)
          if (wrappedChild.type === Tab) {
            return {
              title: wrappedProps.title,
              content: wrappedProps.children
            };
          }
          
          // Check by name for compiled Tab components
          const wrappedTypeName = (wrappedChild.type as any)?.name || (wrappedChild.type as any)?.displayName;
          if (wrappedTypeName === 'Tab') {
            return {
              title: wrappedProps.title,
              content: wrappedProps.children
            };
          }
          
          // Check for data-tab-title attribute on wrapped child (most reliable for production)
          if (wrappedProps['data-tab-title']) {
            return {
              title: wrappedProps['data-tab-title'],
              content: wrappedProps.children
            };
          }
          
          // If wrapped child has title prop, treat it as a tab
          if (wrappedProps.title) {
            return {
              title: wrappedProps.title,
              content: wrappedProps.children || wrappedChild
            };
          }
        }
        
        // Fallback: check if child has a title prop directly
        if (props.title) {
          return {
            title: props.title,
            content: props.children || child
          };
        }
      }
      return null;
  }).filter(Boolean) as Array<{ title: string; content: React.ReactNode }>;
  }, [childArray.length]);

  const [activeIndex, setActiveIndex] = useState(0);

  if (tabs.length === 0) {
    return (
      <div className="profile-tabs-empty text-thread-sage italic p-4">
        No tabs to display (received {childArray.length} children)
      </div>
    );
  }

  return (
    <div className="profile-tabs-wrapper">
      <div className="profile-tabs thread-module p-0 overflow-hidden">
        <div role="tablist" aria-label="Profile sections" className="profile-tab-list flex md:flex-wrap border-b border-thread-sage/30">
          {tabs.map((tab, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={index}
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${index}`}
                id={`tab-${index}`}
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
          id={`panel-${activeIndex}`}
          aria-labelledby={`tab-${activeIndex}`}
          className="profile-tab-panel p-4 sm:p-5 md:p-6"
        >
          {tabs[activeIndex]?.content}
        </div>
      </div>
    </div>
  );
}