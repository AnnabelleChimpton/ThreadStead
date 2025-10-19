import React from 'react';
import Link from 'next/link';
import { WidgetProps, WidgetConfig } from '../types/widget';

const faqConfig: WidgetConfig = {
  id: 'faq-quick',
  title: 'New Here?',
  description: 'Quick FAQ answers for first-time visitors',
  category: 'utility',
  size: 'medium',
  requiresAuth: false,
  defaultEnabled: true
};

function FAQWidget({ user }: WidgetProps) {
  return (
    <div className="py-3 space-y-3">
      <div className="space-y-3 text-xs text-gray-700">
        <div>
          <p className="font-semibold text-gray-900 mb-1">How is this different from Facebook/Twitter?</p>
          <p className="text-gray-600">No algorithms, no tracking. You own your space.</p>
        </div>

        <div>
          <p className="font-semibold text-gray-900 mb-1">What are pixel homes?</p>
          <p className="text-gray-600">Your customizable 8-bit house in our neighborhood.</p>
        </div>

        <div>
          <p className="font-semibold text-gray-900 mb-1">Do I need to code?</p>
          <p className="text-gray-600">Nope! Use our visual builder.</p>
        </div>

        <div>
          <p className="font-semibold text-gray-900 mb-1">How do I join?</p>
          <p className="text-gray-600">Request beta access on our landing page.</p>
        </div>
      </div>

      <div className="text-center pt-2 border-t border-gray-200">
        <Link
          href="/help/faq"
          className="text-xs text-thread-sunset hover:text-thread-pine font-medium underline"
        >
          More questions? Check our FAQ →
        </Link>
      </div>
    </div>
  );
}

export const faqWidget = {
  config: faqConfig,
  component: FAQWidget
};
