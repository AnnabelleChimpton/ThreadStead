/**
 * FloatingPanel - Collapsible floating panel system for the visual builder
 * Provides a modern, space-efficient alternative to fixed sidebars
 */

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface FloatingPanelProps {
  /** Unique identifier for the panel */
  id: string;
  /** Panel title displayed in header */
  title: string;
  /** Icon to display in header and toggle button */
  icon: string;
  /** Panel content */
  children: React.ReactNode;
  /** Controlled open/closed state */
  isOpen?: boolean;
  /** Initial open/closed state (used only if isOpen is not provided) */
  defaultOpen?: boolean;
  /** Panel position */
  side: 'left' | 'right';
  /** Width of the panel when open */
  width?: number;
  /** Whether panel can be resized */
  resizable?: boolean;
  /** Minimum width when resizing */
  minWidth?: number;
  /** Maximum width when resizing */
  maxWidth?: number;
  /** Z-index for the panel */
  zIndex?: number;
  /** Callback when panel open state changes */
  onToggle?: (isOpen: boolean) => void;
  /** Custom class name */
  className?: string;
}

/**
 * FloatingPanel provides a collapsible side panel that slides in/out
 * Perfect for property panels and component palettes
 */
export default function FloatingPanel({
  id,
  title,
  icon,
  children,
  isOpen: controlledIsOpen,
  defaultOpen = false,
  side = 'right',
  width = 320,
  resizable = true,
  minWidth = 280,
  maxWidth = 600,
  zIndex = 1000,
  onToggle,
  className = '',
}: FloatingPanelProps) {
  // Use controlled state if provided, otherwise use internal state
  const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const [currentWidth, setCurrentWidth] = useState(width);
  const [isResizing, setIsResizing] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);

  // Handle panel toggle
  const handleToggle = () => {
    const newState = !isOpen;
    if (controlledIsOpen === undefined) {
      setInternalIsOpen(newState);
    }
    onToggle?.(newState);
  };

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent) => {
    if (!resizable) return;

    e.preventDefault();
    setIsResizing(true);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = currentWidth;
  };

  // Handle mouse move for resizing
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = side === 'left'
        ? e.clientX - resizeStartX.current
        : resizeStartX.current - e.clientX;

      const newWidth = Math.max(
        minWidth,
        Math.min(maxWidth, resizeStartWidth.current + deltaX)
      );

      setCurrentWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, side, minWidth, maxWidth]);

  // Panel styles
  const panelStyles: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    bottom: 0,
    [side]: 0,
    width: isOpen ? currentWidth : 0,
    zIndex,
    background: 'white',
    borderLeft: side === 'right' ? '1px solid #e5e7eb' : 'none',
    borderRight: side === 'left' ? '1px solid #e5e7eb' : 'none',
    boxShadow: side === 'right'
      ? '-4px 0 12px rgba(0, 0, 0, 0.1)'
      : '4px 0 12px rgba(0, 0, 0, 0.1)',
    transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  };

  // Toggle button styles - positioned at screen edge, moves with panel
  const toggleButtonStyles: React.CSSProperties = {
    position: 'fixed',
    top: '50%',
    [side]: isOpen ? currentWidth - 2 : 0, // Slight overlap when open, at edge when closed
    transform: 'translateY(-50%)',
    zIndex: zIndex + 1,
    width: '32px',
    height: '64px',
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: side === 'right' ? '8px 0 0 8px' : '0 8px 8px 0',
    boxShadow: side === 'right' ? '-2px 0 8px rgba(0, 0, 0, 0.1)' : '2px 0 8px rgba(0, 0, 0, 0.1)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    color: '#6b7280',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    userSelect: 'none',
  };

  const panel = (
    <>
      {/* Toggle Button */}
      <div
        style={toggleButtonStyles}
        onClick={handleToggle}
        onMouseEnter={(e) => {
          const target = e.target as HTMLElement;
          target.style.color = '#374151';
          target.style.background = '#f9fafb';
        }}
        onMouseLeave={(e) => {
          const target = e.target as HTMLElement;
          target.style.color = '#6b7280';
          target.style.background = 'white';
        }}
        title={`${isOpen ? 'Close' : 'Open'} ${title}`}
      >
        <span style={{
          transform: `rotate(${isOpen ? (side === 'left' ? '-90deg' : '90deg') : (side === 'left' ? '90deg' : '-90deg')})`,
          transition: 'transform 0.3s ease',
        }}>
          {icon}
        </span>
      </div>

      {/* Panel */}
      <div
        ref={panelRef}
        style={panelStyles}
        className={className}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid #e5e7eb',
          background: '#f9fafb',
          flexShrink: 0,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '16px',
            fontWeight: '600',
            color: '#111827',
          }}>
            <span>{icon}</span>
            {title}
          </div>

          <button
            onClick={handleToggle}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              color: '#6b7280',
              fontSize: '16px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              const target = e.target as HTMLButtonElement;
              target.style.background = '#e5e7eb';
              target.style.color = '#374151';
            }}
            onMouseLeave={(e) => {
              const target = e.target as HTMLButtonElement;
              target.style.background = 'none';
              target.style.color = '#6b7280';
            }}
            title={`Close ${title}`}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          height: 0, // Force flex child to respect parent height
        }}>
          {isOpen && children}
        </div>

        {/* Resize Handle */}
        {resizable && isOpen && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              [side === 'left' ? 'right' : 'left']: 0,
              width: '4px',
              cursor: 'col-resize',
              background: 'transparent',
              zIndex: 10,
            }}
            onMouseDown={handleResizeStart}
            onMouseEnter={(e) => {
              const target = e.target as HTMLElement;
              target.style.background = '#3b82f6';
            }}
            onMouseLeave={(e) => {
              if (!isResizing) {
                const target = e.target as HTMLElement;
                target.style.background = 'transparent';
              }
            }}
          />
        )}

        {/* Resize indicator */}
        {isResizing && (
          <div style={{
            position: 'fixed',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            background: 'rgba(0, 0, 0, 0.1)',
            zIndex: zIndex - 1,
            pointerEvents: 'none',
          }} />
        )}
      </div>
    </>
  );

  // Render to document body to ensure proper layering
  return typeof document !== 'undefined'
    ? createPortal(panel, document.body)
    : null;
}

/**
 * Hook to manage multiple floating panels
 */
export function useFloatingPanels() {
  const [openPanels, setOpenPanels] = useState<Set<string>>(new Set()); // Start with panels closed

  const togglePanel = (id: string, forceState?: boolean) => {
    setOpenPanels(prev => {
      const newSet = new Set(prev);
      const shouldOpen = forceState ?? !newSet.has(id);

      if (shouldOpen) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }

      return newSet;
    });
  };

  const closeAllPanels = () => {
    setOpenPanels(new Set());
  };

  const isPanelOpen = (id: string) => openPanels.has(id);

  return {
    openPanels,
    togglePanel,
    closeAllPanels,
    isPanelOpen,
  };
}