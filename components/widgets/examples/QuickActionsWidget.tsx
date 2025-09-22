import React from 'react';
import Link from 'next/link';
import { WidgetProps, WidgetConfig } from '../types/widget';

const quickActionsConfig: WidgetConfig = {
  id: 'quick-actions',
  title: 'Quick Actions',
  description: 'Common site actions and shortcuts',
  category: 'utility',
  size: 'small',
  requiresAuth: true,
  defaultEnabled: true
};

interface QuickAction {
  id: string;
  label: string;
  href: string;
  icon: string;
  color: string;
  description?: string;
}

function QuickActionsWidget({ user, isLoading, error }: WidgetProps) {
  const actions: QuickAction[] = [
    {
      id: 'new-post',
      label: 'New Post',
      href: '/post/new',
      icon: '✏️',
      color: 'bg-blue-500 hover:bg-blue-600',
      description: 'Create a new post'
    },
    {
      id: 'profile',
      label: 'Profile',
      href: user?.primaryHandle ? `/resident/${user.primaryHandle.split('@')[0]}` : '/profile',
      icon: '👤',
      color: 'bg-green-500 hover:bg-green-600',
      description: 'View your profile'
    },
    {
      id: 'pixel-home',
      label: 'Pixel Home',
      href: '/pixel-homes/build',
      icon: '🏠',
      color: 'bg-purple-500 hover:bg-purple-600',
      description: 'Customize your pixel home'
    },
    {
      id: 'settings',
      label: 'Settings',
      href: '/settings',
      icon: '⚙️',
      color: 'bg-gray-500 hover:bg-gray-600',
      description: 'Account settings'
    },
    {
      id: 'feed',
      label: 'Feed',
      href: '/feed',
      icon: '📰',
      color: 'bg-orange-500 hover:bg-orange-600',
      description: 'View your feed'
    },
    {
      id: 'discover',
      label: 'Discover',
      href: '/discover',
      icon: '🔍',
      color: 'bg-indigo-500 hover:bg-indigo-600',
      description: 'Discover new content'
    }
  ];

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-2 gap-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4 text-gray-500">
        <p className="text-sm">Unable to load quick actions</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action) => (
          <Link
            key={action.id}
            href={action.href}
            className={`
              ${action.color}
              text-white rounded-lg p-3 text-center transition-all duration-200
              hover:scale-105 hover:shadow-md
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
              flex flex-col items-center justify-center space-y-1
              min-h-[4rem]
            `}
            title={action.description}
          >
            <span className="text-lg">{action.icon}</span>
            <span className="text-xs font-medium leading-tight">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export const quickActionsWidget = {
  config: quickActionsConfig,
  component: QuickActionsWidget as React.ComponentType<WidgetProps & { data?: any }>
};