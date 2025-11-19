import React from 'react';
import Link from 'next/link';
import { WidgetProps, WidgetConfig } from '../types/widget';
import { PixelIcon } from '@/components/ui/PixelIcon';

const welcomeConfig: WidgetConfig = {
  id: 'welcome',
  title: 'Welcome to the Revolution',
  description: 'Welcome message with web revival manifesto',
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
  if (user) {
    // Logged-in user gets personalized welcome
    const username = user.primaryHandle?.split('@')[0] || 'friend';
    return (
      <div className="text-center py-4 space-y-2">
        <p className="text-lg font-semibold text-[#2E4B3F]">Welcome back, {username}! <PixelIcon name="human-handsup" className="inline-block align-middle" /></p>
        <p className="text-sm text-gray-600">
          Your space on the web, your rules.
        </p>
      </div>
    );
  }

  // Visitor gets manifesto
  return (
    <div className="py-4 space-y-3">
      <div className="text-center">
        <p className="text-lg font-semibold text-[#2E4B3F] mb-2"><PixelIcon name="human-handsup" className="inline-block align-middle mr-1" /> The internet doesn&apos;t have to suck</p>
      </div>

      <div className="text-sm text-gray-700 space-y-2 px-2">
        <p>
          Create your pixel home, join communities around your interests, and connect with people who get it.
        </p>
        <p>
          No algorithms. No tracking. <strong>Your page, your way.</strong>
        </p>
      </div>

      <div className="text-center pt-2">
        <Link
          href="/signup"
          className="inline-block px-4 py-2 bg-yellow-200 hover:bg-yellow-100 border border-black shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] text-sm font-bold transition-all transform hover:-translate-y-0.5"
        >
          Get Started →
        </Link>
      </div>
    </div>
  );
}

export const welcomeWidget = {
  config: welcomeConfig,
  component: WelcomeWidget
};