import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

interface UseTabRoutingOptions {
  defaultTab?: string;
  tabParam?: string; // URL parameter name for the tab (defaults to 'tab')
}

export function useTabRouting(options: UseTabRoutingOptions = {}) {
  const router = useRouter();
  const { defaultTab = '', tabParam = 'tab' } = options;
  
  // Get current tab from URL or use default
  const currentTab = (router.query[tabParam] as string) || defaultTab;
  const [activeTab, setActiveTab] = useState(currentTab);

  // Update active tab when URL changes
  useEffect(() => {
    const urlTab = (router.query[tabParam] as string) || defaultTab;
    setActiveTab(urlTab);
  }, [router.query, tabParam, defaultTab]);

  // Function to change tab and update URL
  const changeTab = (newTab: string, options?: { shallow?: boolean; scroll?: boolean }) => {
    const { shallow = true, scroll = false } = options || {};
    
    // Update URL with new tab parameter
    const newQuery = { ...router.query };
    if (newTab && newTab !== defaultTab) {
      newQuery[tabParam] = newTab;
    } else {
      delete newQuery[tabParam];
    }

    router.push(
      {
        pathname: router.pathname,
        query: newQuery,
      },
      undefined,
      { shallow, scroll }
    );
  };

  // Generate tab button props for easy integration
  const getTabProps = (tabId: string) => ({
    id: `tab-${tabId}`,
    'data-tab': tabId,
    className: `tab-${tabId}`,
    onClick: () => changeTab(tabId),
    'aria-selected': activeTab === tabId,
  });

  return {
    activeTab,
    changeTab,
    getTabProps,
    isActiveTab: (tabId: string) => activeTab === tabId,
  };
}