import React, { useState, useEffect } from 'react';

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

  const getScopeIcon = (scopeValue: string) => {
    switch (scopeValue) {
      case 'current': return '📍';
      case 'parent': return '⬆️';
      case 'children': return '⬇️';
      case 'siblings': return '↔️';
      case 'family': return '👨‍👩‍👧‍👦';
      default: return '📍';
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
    <div className="tr-feed-scope tr-widget border border-black bg-white shadow-[2px_2px_0_#000] p-3 mb-4">
      <div className="tr-feed-scope-header flex items-center justify-between mb-2">
        <h3 className="tr-feed-scope-title font-bold text-sm">Feed:</h3>
        <span className="tr-current-scope text-xs text-gray-600">
          <span className="tr-scope-icon">{getScopeIcon(scope)}</span> <span className="tr-scope-label">{getScopeLabel(scope)}</span>
        </span>
      </div>
      
      <div className="tr-scope-options flex flex-wrap gap-2">
        {availableScopes.map((scopeOption) => (
          <label
            key={scopeOption}
            className={`tr-scope-option flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer transition-colors border ${
              scope === scopeOption 
                ? 'tr-scope-active bg-blue-100 border-blue-300 text-blue-800' 
                : 'tr-scope-inactive bg-gray-50 border-gray-200 hover:bg-gray-100'
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
      <div className="tr-scope-description mt-2 text-xs text-gray-600">
        {getScopeDescription(scope)}
      </div>
    </div>
  );
}