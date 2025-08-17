import React, { useState } from 'react';

interface TabsProps {
  children: React.ReactNode;
}

interface TabProps {
  title: string;
  children: React.ReactNode;
}

export function Tab({ title, children }: TabProps) {
  return <div data-tab-title={title}>{children}</div>;
}

export default function Tabs({ children }: TabsProps) {
  const tabs = React.Children.toArray(children).filter(
    (child): child is React.ReactElement<TabProps> => 
      React.isValidElement(child) && child.type === Tab
  );

  const [activeIndex, setActiveIndex] = useState(0);

  if (tabs.length === 0) {
    return (
      <div className="ts-tabs-empty text-thread-sage italic">
        No tabs to display
      </div>
    );
  }

  return (
    <div className="ts-tabs thread-module p-0 overflow-hidden">
      <div className="ts-tab-list flex flex-wrap border-b border-thread-sage/30">
        {tabs.map((tab, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`ts-tab-button px-4 py-3 border-r border-thread-sage/20 focus:outline-none transition-all ${
                isActive
                  ? 'active bg-thread-cream font-medium text-thread-pine'
                  : 'bg-thread-paper hover:bg-thread-cream/50 text-thread-sage hover:text-thread-pine'
              }`}
            >
              {tab.props.title}
            </button>
          );
        })}
      </div>
      <div className="ts-tab-panel p-6">
        {tabs[activeIndex]?.props.children}
      </div>
    </div>
  );
}