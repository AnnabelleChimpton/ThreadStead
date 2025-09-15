import React from 'react';
import { WidgetProps, WidgetConfig } from '../types/widget';

const welcomeConfig: WidgetConfig = {
  id: 'welcome',
  title: 'Welcome',
  description: 'A simple welcome message widget',
  category: 'utility',
  size: 'medium',
  requiresAuth: false,
  defaultEnabled: true
};

interface WelcomeWidgetProps extends WidgetProps {
  data?: {
    message?: string;
  };
}

function WelcomeWidget({ user, data }: WelcomeWidgetProps) {
  const message = data?.message || `Welcome${user?.primaryHandle ? `, ${user.primaryHandle}` : ''}!`;

  return (
    <div className="text-center py-4">
      <p className="text-gray-700 mb-2">{message}</p>
      <p className="text-sm text-gray-500">
        {user ? 'You are logged in' : 'You are visiting as a guest'}
      </p>
    </div>
  );
}

export const welcomeWidget = {
  config: welcomeConfig,
  component: WelcomeWidget
};