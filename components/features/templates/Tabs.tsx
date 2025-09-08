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
  
  
  // Extract tab data from children - handle both Tab components and island-rendered content
  const tabs = childArray.map((child, index) => {
    if (React.isValidElement(child)) {
      const props = child.props as any;
      
      // Check if it's a Tab component
      if (child.type === Tab) {
        return {
          title: props.title,
          content: props.children
        };
      }
      // Check for data-tab-title attribute (from island rendering)
      if (props['data-tab-title']) {
        return {
          title: props['data-tab-title'],
          content: props.children
        };
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