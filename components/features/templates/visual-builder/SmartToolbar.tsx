/**
 * SmartToolbar - Streamlined, essential-only toolbar for the visual builder
 * Context-aware tools that adapt to user's current task
 */

import React from 'react';
import type { UseCanvasStateResult } from '@/hooks/useCanvasState';

export interface SmartToolbarProps {
  /** Canvas state for context-aware tools */
  canvasState: UseCanvasStateResult;
  /** Current positioning mode */
  positioningMode: 'grid' | 'absolute';
  /** Set positioning mode */
  onPositioningModeChange: (mode: 'grid' | 'absolute') => void;
  /** Grid configuration */
  gridConfig: {
    enabled: boolean;
    showGrid: boolean;
  };
  /** Update grid configuration */
  onGridConfigChange: (config: { enabled?: boolean; showGrid?: boolean }) => void;
  /** Mode switching callback */
  onModeSwitch?: () => void;
  /** Whether we're in visual mode */
  isVisualMode?: boolean;
  /** Component count for display */
  componentCount: number;
  /** Selected component count */
  selectedCount: number;
  /** Callback to toggle property panel */
  onToggleProperties?: () => void;
  /** Callback to toggle component palette */
  onToggleComponents?: () => void;
  /** Callback to toggle global settings panel */
  onToggleGlobal?: () => void;
  /** Whether property panel is open */
  isPropertiesOpen?: boolean;
  /** Whether component palette is open */
  isComponentsOpen?: boolean;
  /** Whether global settings panel is open */
  isGlobalOpen?: boolean;
}

/**
 * Tool button component with consistent styling
 */
interface ToolButtonProps {
  icon: string;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md';
  tooltip?: string;
}

function ToolButton({
  icon,
  label,
  onClick,
  active = false,
  disabled = false,
  variant = 'secondary',
  size = 'md',
  tooltip,
}: ToolButtonProps) {
  const baseStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: size === 'sm' ? '6px 12px' : '8px 16px',
    border: 'none',
    borderRadius: '8px',
    fontSize: size === 'sm' ? '13px' : '14px',
    fontWeight: '500',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    userSelect: 'none' as const,
    opacity: disabled ? 0.5 : 1,
  };

  const variantStyles = {
    primary: {
      background: active ? '#2563eb' : '#3b82f6',
      color: 'white',
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
    },
    secondary: {
      background: active ? '#e0e7ff' : '#f8fafc',
      color: active ? '#3730a3' : '#475569',
      border: `1px solid ${active ? '#c7d2fe' : '#e2e8f0'}`,
    },
    ghost: {
      background: active ? '#f1f5f9' : 'transparent',
      color: active ? '#0f172a' : '#64748b',
    },
  };

  const combinedStyles = {
    ...baseStyles,
    ...variantStyles[variant],
  };

  return (
    <button
      style={combinedStyles}
      onClick={onClick}
      disabled={disabled}
      title={tooltip || label}
      onMouseEnter={(e) => {
        if (!disabled) {
          const target = e.target as HTMLButtonElement;
          if (variant === 'secondary') {
            target.style.background = active ? '#ddd6fe' : '#f1f5f9';
            target.style.borderColor = active ? '#a5b4fc' : '#cbd5e1';
          } else if (variant === 'ghost') {
            target.style.background = active ? '#e2e8f0' : '#f8fafc';
          }
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          const target = e.target as HTMLButtonElement;
          if (variant === 'secondary') {
            target.style.background = active ? '#e0e7ff' : '#f8fafc';
            target.style.borderColor = active ? '#c7d2fe' : '#e2e8f0';
          } else if (variant === 'ghost') {
            target.style.background = active ? '#f1f5f9' : 'transparent';
          }
        }
      }}
    >
      <span style={{ fontSize: '16px' }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

/**
 * Toolbar separator for visual grouping
 */
function ToolbarSeparator() {
  return (
    <div style={{
      width: '1px',
      height: '32px',
      background: '#e2e8f0',
      margin: '0 8px',
    }} />
  );
}

/**
 * Status indicator showing current state
 */
interface StatusIndicatorProps {
  count: number;
  label: string;
  color?: string;
}

function StatusIndicator({ count, label, color = '#10b981' }: StatusIndicatorProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '6px 12px',
      background: '#f8fafc',
      borderRadius: '8px',
      fontSize: '13px',
      color: '#475569',
    }}>
      <div style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: count > 0 ? color : '#cbd5e1',
      }} />
      <span>
        <strong>{count}</strong> {label}
      </span>
    </div>
  );
}

/**
 * SmartToolbar provides essential tools with intelligent context awareness
 */
export default function SmartToolbar({
  canvasState,
  positioningMode,
  onPositioningModeChange,
  gridConfig,
  onGridConfigChange,
  onModeSwitch,
  isVisualMode = true,
  componentCount,
  selectedCount,
  onToggleProperties,
  onToggleComponents,
  onToggleGlobal,
  isPropertiesOpen = false,
  isComponentsOpen = false,
  isGlobalOpen = false,
}: SmartToolbarProps) {
  const {
    canUndo,
    canRedo,
    undo,
    redo,
    removeSelected,
    resetCanvas,
  } = canvasState;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 24px',
      background: 'white',
      borderBottom: '1px solid #e5e7eb',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      position: 'relative',
      zIndex: 100,
    }}>
      {/* Left: Essential Actions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        {/* Brand/Title */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginRight: '16px',
        }}>
          <h1 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: '700',
            color: '#0f172a',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            🎨 Visual Builder
          </h1>

          {!isVisualMode && (
            <span style={{
              background: '#fbbf24',
              color: '#92400e',
              fontSize: '11px',
              fontWeight: '600',
              padding: '2px 6px',
              borderRadius: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Code Mode
            </span>
          )}
        </div>

        {/* History Actions */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <ToolButton
            icon="↶"
            label="Undo"
            onClick={undo}
            disabled={!canUndo}
            size="sm"
            variant="ghost"
            tooltip="Undo last action (Ctrl+Z)"
          />
          <ToolButton
            icon="↷"
            label="Redo"
            onClick={redo}
            disabled={!canRedo}
            size="sm"
            variant="ghost"
            tooltip="Redo last action (Ctrl+Y)"
          />
        </div>

        <ToolbarSeparator />

        {/* Positioning Mode */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <ToolButton
            icon="📐"
            label="Grid"
            onClick={() => {
              onPositioningModeChange('grid');
              onGridConfigChange({ enabled: true, showGrid: true });
            }}
            active={positioningMode === 'grid'}
            size="sm"
            tooltip="Grid positioning (responsive)"
          />
          <ToolButton
            icon="🎯"
            label="Free"
            onClick={() => onPositioningModeChange('absolute')}
            active={positioningMode === 'absolute'}
            size="sm"
            tooltip="Free positioning (pixel perfect)"
          />
        </div>

        {/* Grid Controls */}
        {positioningMode === 'grid' && (
          <ToolButton
            icon={gridConfig.showGrid ? "👁️" : "👁️‍🗨️"}
            label={gridConfig.showGrid ? "Hide Grid" : "Show Grid"}
            onClick={() => onGridConfigChange({ showGrid: !gridConfig.showGrid })}
            active={gridConfig.showGrid}
            size="sm"
            variant="ghost"
            tooltip="Toggle grid visibility"
          />
        )}

        <ToolbarSeparator />

        {/* Quick Actions */}
        <ToolButton
          icon="🗑️"
          label="Delete"
          onClick={removeSelected}
          disabled={selectedCount === 0}
          size="sm"
          variant="ghost"
          tooltip={`Delete ${selectedCount} selected component${selectedCount !== 1 ? 's' : ''}`}
        />
      </div>

      {/* Center: Status & Context */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}>
        <StatusIndicator count={componentCount} label="components" />
        {selectedCount > 0 && (
          <StatusIndicator
            count={selectedCount}
            label="selected"
            color="#3b82f6"
          />
        )}
      </div>

      {/* Right: Panel Controls & Mode Switch */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        {/* Panel Controls */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {onToggleComponents && (
            <ToolButton
              icon="🧩"
              label="Components"
              onClick={onToggleComponents}
              active={isComponentsOpen}
              size="sm"
              variant="ghost"
              tooltip="Toggle component palette"
            />
          )}

          {onToggleProperties && (
            <ToolButton
              icon="⚙️"
              label="Properties"
              onClick={onToggleProperties}
              active={isPropertiesOpen}
              size="sm"
              variant="ghost"
              tooltip="Toggle property panel"
            />
          )}

          {onToggleGlobal && (
            <ToolButton
              icon="🌐"
              label="Global"
              onClick={onToggleGlobal}
              active={isGlobalOpen}
              size="sm"
              variant="ghost"
              tooltip="Toggle global settings"
            />
          )}
        </div>

        <ToolbarSeparator />

        {/* Mode Switch */}
        {onModeSwitch && (
          <ToolButton
            icon={isVisualMode ? "💻" : "🎨"}
            label={isVisualMode ? "Code" : "Visual"}
            onClick={onModeSwitch}
            variant="primary"
            tooltip={`Switch to ${isVisualMode ? 'code' : 'visual'} editor`}
          />
        )}

        {/* Emergency Reset (hidden by default) */}
        <div style={{ position: 'relative' }}>
          <ToolButton
            icon="🔄"
            label=""
            onClick={resetCanvas}
            size="sm"
            variant="ghost"
            tooltip="Reset canvas (removes all components)"
          />
        </div>
      </div>
    </div>
  );
}