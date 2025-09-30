/**
 * BreakpointSwitcher - UI component for switching between responsive breakpoints
 * Allows users to preview Desktop, Tablet, and Mobile layouts
 */

import React from 'react';

export type ResponsiveBreakpoint = 'desktop' | 'tablet' | 'mobile';

export interface BreakpointSwitcherProps {
  /** Currently active breakpoint */
  activeBreakpoint: ResponsiveBreakpoint;
  /** Callback when breakpoint changes */
  onBreakpointChange: (breakpoint: ResponsiveBreakpoint) => void;
  /** Optional className for styling */
  className?: string;
}

interface BreakpointOption {
  id: ResponsiveBreakpoint;
  label: string;
  icon: string;
  width: string;
  description: string;
}

const BREAKPOINT_OPTIONS: BreakpointOption[] = [
  {
    id: 'desktop',
    label: 'Desktop',
    icon: '🖥️',
    width: 'Full Width',
    description: '1200px+ (full canvas)'
  },
  {
    id: 'tablet',
    label: 'Tablet',
    icon: '📱',
    width: '768px',
    description: '768px preview'
  },
  {
    id: 'mobile',
    label: 'Mobile',
    icon: '📱',
    width: '375px',
    description: '375px preview'
  }
];

export default function BreakpointSwitcher({
  activeBreakpoint,
  onBreakpointChange,
  className = ''
}: BreakpointSwitcherProps) {
  return (
    <div
      className={`breakpoint-switcher ${className}`}
      style={{
        display: 'inline-flex',
        gap: '4px',
        padding: '4px',
        backgroundColor: '#f3f4f6',
        borderRadius: '8px',
        border: '1px solid #e5e7eb'
      }}
    >
      {BREAKPOINT_OPTIONS.map(option => {
        const isActive = activeBreakpoint === option.id;

        return (
          <button
            key={option.id}
            onClick={() => onBreakpointChange(option.id)}
            title={`${option.label} (${option.description})`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: isActive ? '600' : '500',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              backgroundColor: isActive ? '#ffffff' : 'transparent',
              color: isActive ? '#1f2937' : '#6b7280',
              boxShadow: isActive ? '0 1px 3px 0 rgb(0 0 0 / 0.1)' : 'none',
              userSelect: 'none' as const
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = '#e5e7eb';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <span style={{ fontSize: '16px' }}>{option.icon}</span>
            <span>{option.label}</span>
            {isActive && (
              <span
                style={{
                  fontSize: '11px',
                  color: '#9ca3af',
                  fontWeight: '400'
                }}
              >
                {option.width}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Export breakpoint data for use in other components
export { BREAKPOINT_OPTIONS };