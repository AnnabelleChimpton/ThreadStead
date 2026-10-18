import React, { useState, useEffect } from 'react';
import { PixelIcon } from '@/components/ui/PixelIcon';

interface ThreadRingFeedScopeProps {
  threadRingSlug: string;
  hasParent: boolean;
  hasChildren: boolean;
  hasSiblings: boolean;
  onScopeChange: (scope: 'current' | 'parent' | 'children' | 'siblings' | 'family') => void;
  currentScope?: 'current' | 'parent' | 'children' | 'siblings' | 'family';
}

export default function ThreadRingFeedScope({
  threadRingSlug,
  hasParent,
  hasChildren,
  hasSiblings,
  onScopeChange,
  currentScope = 'current'
}: ThreadRingFeedScopeProps) {
  const [scope, setScope] = useState<'current' | 'parent' | 'children' | 'siblings' | 'family'>(currentScope);

  const handleScopeChange = (newScope: 'current' | 'parent' | 'children' | 'siblings' | 'family') => {
    setScope(newScope);
    onScopeChange(newScope);
  };

  const getScopeLabel = (scopeValue: string) => {
    switch (scopeValue) {
      case 'current': return 'This Ring';
      case 'parent': return 'Parent Ring';
      case 'children': return 'Descendant Rings';
      case 'siblings': return 'Sibling Rings';
      case 'family': return 'Family Feed';
      default: return scopeValue;
    }
  };

  const getScopeDescription = (scopeValue: string) => {
    switch (scopeValue) {
      case 'current': return 'Posts from members of this ThreadRing only';
      case 'parent': return 'Posts from the parent ThreadRing';
      case 'children': return 'Posts from all direct descendant ThreadRings';
      case 'siblings': return 'Posts from sibling ThreadRings (same parent)';
      case 'family': return 'Posts from parent, siblings, current, and descendant ThreadRings';
      default: return '';
    }
  };

  const getScopeIcon = (scopeValue: string): React.ReactNode => {
    switch (scopeValue) {
      case 'current': return <PixelIcon name="gps" size={14} />;
      case 'parent': return <PixelIcon name="arrow-up" size={14} />;
      case 'children': return <PixelIcon name="arrow-down" size={14} />;
      case 'siblings': return <PixelIcon name="link" size={14} />;
      case 'family': return <PixelIcon name="users" size={14} />;
      default: return <PixelIcon name="gps" size={14} />;
    }
  };

  // Available scope options based on ring relationships
  const availableScopes: Array<'current' | 'parent' | 'children' | 'siblings' | 'family'> = [
    'current',
    ...(hasParent ? ['parent'] as const : []),
    ...(hasChildren ? ['children'] as const : []),
    ...(hasSiblings ? ['siblings'] as const : []),
    ...(hasParent || hasChildren || hasSiblings ? ['family'] as const : [])
  ];

  if (availableScopes.length <= 1) {
    // Don't show scope selector if there's only one option
    return null;
  }

  return (
    <div className="tr-feed-scope tr-widget widget-container widget--flat bg-thread-paper border border-thread-sage rounded-cozy shadow-cozy-sm p-3 mb-4">
      <div className="tr-feed-scope-header flex items-center justify-between mb-2">
        <h3 className="tr-feed-scope-title font-bold text-sm">Feed:</h3>
        <span className="tr-current-scope text-xs text-nb-ink-mid">
          <span className="tr-scope-icon">{getScopeIcon(scope)}</span> <span className="tr-scope-label">{getScopeLabel(scope)}</span>
        </span>
      </div>
      
      <div className="tr-scope-options flex flex-wrap gap-2">
        {availableScopes.map((scopeOption) => (
          <label
            key={scopeOption}
            className={`tr-scope-option flex items-center gap-1 text-xs cursor-pointer ${
              scope === scopeOption
                ? 'tr-scope-active badge badge--butter font-semibold'
                : 'tr-scope-inactive tag hover:border-nb-ink'
            }`}
          >
            <input
              type="radio"
              name="feedScope"
              value={scopeOption}
              checked={scope === scopeOption}
              onChange={() => handleScopeChange(scopeOption)}
              className="tr-scope-radio sr-only"
            />
            <span className="tr-scope-icon">{getScopeIcon(scopeOption)}</span>
            <span className="tr-scope-label font-medium">{getScopeLabel(scopeOption)}</span>
          </label>
        ))}
      </div>

      {/* Show description for current selection */}
      <div className="tr-scope-description mt-2 text-xs text-nb-ink-mid">
        {getScopeDescription(scope)}
      </div>
    </div>
  );
}