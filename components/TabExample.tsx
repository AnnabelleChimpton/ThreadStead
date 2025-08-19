import { useTabRouting } from '@/hooks/useTabRouting';

interface TabExampleProps {
  defaultTab?: string;
}

export default function TabExample({ defaultTab = 'overview' }: TabExampleProps) {
  const { activeTab, getTabProps, isActiveTab } = useTabRouting({ 
    defaultTab 
  });

  return (
    <div className="w-full">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-300 mb-4">
        <button
          {...getTabProps('overview')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            isActiveTab('overview')
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          Overview
        </button>
        <button
          {...getTabProps('settings')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            isActiveTab('settings')
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          Settings
        </button>
        <button
          {...getTabProps('advanced')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            isActiveTab('advanced')
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          Advanced
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {isActiveTab('overview') && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Overview</h2>
            <p>This is the overview tab content. The URL will show ?tab=overview when this tab is active.</p>
          </div>
        )}

        {isActiveTab('settings') && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Settings</h2>
            <p>This is the settings tab content. The URL will show ?tab=settings when this tab is active.</p>
          </div>
        )}

        {isActiveTab('advanced') && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Advanced</h2>
            <p>This is the advanced tab content. The URL will show ?tab=advanced when this tab is active.</p>
          </div>
        )}
      </div>
    </div>
  );
}