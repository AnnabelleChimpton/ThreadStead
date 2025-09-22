/**
 * Keyboard Shortcuts and Gesture Support for Visual Builder
 * Provides professional keyboard navigation and shortcuts
 */

import { useEffect, useRef, useCallback } from 'react';
import type { UseCanvasStateResult } from '@/hooks/useCanvasState';

interface KeyboardShortcutsProps {
  canvasState: UseCanvasStateResult;
  onToggleProperties?: () => void;
  onToggleComponents?: () => void;
  onFocusCanvas?: () => void;
  onSave?: () => void;
  isEnabled?: boolean;
}

interface KeyCombination {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
}

interface ShortcutHandler {
  combination: KeyCombination;
  handler: () => void;
  description: string;
  category: string;
}

/**
 * Hook that provides keyboard shortcuts and gesture support
 */
export function useKeyboardShortcuts({
  canvasState,
  onToggleProperties,
  onToggleComponents,
  onFocusCanvas,
  onSave,
  isEnabled = true,
}: KeyboardShortcutsProps) {
  const keysPressed = useRef<Set<string>>(new Set());
  const lastKeyTime = useRef<number>(0);
  const sequenceBuffer = useRef<string[]>([]);

  const {
    undo,
    redo,
    canUndo,
    canRedo,
    removeSelected,
    selectedComponentIds,
    selectComponent,
    clearSelection,
  } = canvasState;

  // Define keyboard shortcuts
  const shortcuts: ShortcutHandler[] = [
    // History
    {
      combination: { key: 'z', ctrl: true },
      handler: () => canUndo && undo(),
      description: 'Undo last action',
      category: 'History',
    },
    {
      combination: { key: 'y', ctrl: true },
      handler: () => canRedo && redo(),
      description: 'Redo last action',
      category: 'History',
    },
    {
      combination: { key: 'z', ctrl: true, shift: true },
      handler: () => canRedo && redo(),
      description: 'Redo last action (alternative)',
      category: 'History',
    },

    // Selection
    {
      combination: { key: 'Escape' },
      handler: () => clearSelection(),
      description: 'Deselect all',
      category: 'Selection',
    },

    // Component Actions
    {
      combination: { key: 'Delete' },
      handler: () => selectedComponentIds.size > 0 && removeSelected(),
      description: 'Delete selected components',
      category: 'Components',
    },
    {
      combination: { key: 'Backspace' },
      handler: () => selectedComponentIds.size > 0 && removeSelected(),
      description: 'Delete selected components (alternative)',
      category: 'Components',
    },


    // Panel Controls
    {
      combination: { key: 'p', ctrl: true },
      handler: () => onToggleProperties?.(),
      description: 'Toggle properties panel',
      category: 'Panels',
    },
    {
      combination: { key: 'k', ctrl: true },
      handler: () => onToggleComponents?.(),
      description: 'Toggle component palette',
      category: 'Panels',
    },

    // Focus and Navigation
    {
      combination: { key: 'Tab' },
      handler: () => onFocusCanvas?.(),
      description: 'Focus canvas',
      category: 'Navigation',
    },

    // Save
    {
      combination: { key: 's', ctrl: true },
      handler: () => onSave?.(),
      description: 'Save template',
      category: 'File',
    },
  ];

  // Check if key combination matches
  const matchesShortcut = useCallback((combination: KeyCombination, event: KeyboardEvent): boolean => {
    const { key, ctrl = false, shift = false, alt = false, meta = false } = combination;

    return (
      event.key === key &&
      event.ctrlKey === ctrl &&
      event.shiftKey === shift &&
      event.altKey === alt &&
      event.metaKey === meta
    );
  }, []);

  // Handle keydown events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isEnabled) return;

    // Don't interfere with input fields
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    keysPressed.current.add(event.key.toLowerCase());

    // Check for shortcuts
    for (const shortcut of shortcuts) {
      if (matchesShortcut(shortcut.combination, event)) {
        event.preventDefault();
        event.stopPropagation();
        shortcut.handler();
        break;
      }
    }

    // Track key sequences for advanced shortcuts
    const now = Date.now();
    if (now - lastKeyTime.current > 1000) {
      sequenceBuffer.current = [];
    }
    lastKeyTime.current = now;
    sequenceBuffer.current.push(event.key.toLowerCase());

    // Limit sequence buffer
    if (sequenceBuffer.current.length > 5) {
      sequenceBuffer.current.shift();
    }

    // Check for sequence shortcuts (like gg for go to top)
    checkSequenceShortcuts();
  }, [isEnabled, shortcuts, matchesShortcut]);

  // Handle keyup events
  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    keysPressed.current.delete(event.key.toLowerCase());
  }, []);

  // Check for sequence-based shortcuts
  const checkSequenceShortcuts = useCallback(() => {
    const sequence = sequenceBuffer.current.join('');

    // Example sequence shortcuts
    if (sequence.endsWith('gg')) {
      // Go to top of canvas
      window.scrollTo({ top: 0, behavior: 'smooth' });
      sequenceBuffer.current = [];
    } else if (sequence.endsWith('??')) {
      // Show help
      showShortcutHelp();
      sequenceBuffer.current = [];
    }
  }, []);

  // Show shortcut help
  const showShortcutHelp = useCallback(() => {
    const helpContent = shortcuts
      .reduce((acc, shortcut) => {
        if (!acc[shortcut.category]) {
          acc[shortcut.category] = [];
        }
        acc[shortcut.category].push(shortcut);
        return acc;
      }, {} as Record<string, ShortcutHandler[]>);

    let message = 'Keyboard Shortcuts:\n\n';

    Object.entries(helpContent).forEach(([category, categoryShortcuts]) => {
      message += `${category}:\n`;
      categoryShortcuts.forEach((shortcut) => {
        const { key, ctrl, shift, alt, meta } = shortcut.combination;
        const modifiers = [
          ctrl && 'Ctrl',
          shift && 'Shift',
          alt && 'Alt',
          meta && 'Cmd',
        ].filter(Boolean).join(' + ');

        const keyCombo = modifiers ? `${modifiers} + ${key}` : key;
        message += `  ${keyCombo}: ${shortcut.description}\n`;
      });
      message += '\n';
    });

    message += 'Sequences:\n';
    message += '  ??: Show this help\n';
    message += '  gg: Scroll to top\n';

    alert(message);
  }, [shortcuts]);

  // Add event listeners
  useEffect(() => {
    if (!isEnabled) return;

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp, isEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      keysPressed.current.clear();
      sequenceBuffer.current = [];
    };
  }, []);

  return {
    shortcuts,
    keysPressed: keysPressed.current,
    showHelp: showShortcutHelp,
  };
}

/**
 * Gesture support hook for touch devices
 */
export function useGestureSupport({
  canvasState,
  isEnabled = true,
}: {
  canvasState: UseCanvasStateResult;
  isEnabled?: boolean;
}) {
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const touchHistory = useRef<Array<{ x: number; y: number; time: number }>>([]);
  const lastTap = useRef<number>(0);

  const { clearSelection, undo, redo } = canvasState;

  // Handle touch start
  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (!isEnabled || event.touches.length !== 1) return;

    const touch = event.touches[0];
    const touchData = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };

    touchStartRef.current = touchData;
    touchHistory.current = [touchData];
  }, [isEnabled]);

  // Handle touch move
  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (!isEnabled || !touchStartRef.current || event.touches.length !== 1) return;

    const touch = event.touches[0];
    const touchData = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };

    touchHistory.current.push(touchData);

    // Limit history size
    if (touchHistory.current.length > 10) {
      touchHistory.current.shift();
    }
  }, [isEnabled]);

  // Handle touch end
  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (!isEnabled || !touchStartRef.current) return;

    const touchEnd = {
      x: event.changedTouches[0].clientX,
      y: event.changedTouches[0].clientY,
      time: Date.now(),
    };

    const touchStart = touchStartRef.current;
    const deltaX = touchEnd.x - touchStart.x;
    const deltaY = touchEnd.y - touchStart.y;
    const deltaTime = touchEnd.time - touchStart.time;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Tap detection
    if (distance < 10 && deltaTime < 300) {
      const now = Date.now();
      if (now - lastTap.current < 300) {
        // Double tap - clear selection
        clearSelection();
      }
      lastTap.current = now;
    }

    // Swipe detection
    if (distance > 50 && deltaTime < 500) {
      const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

      // Horizontal swipes
      if (Math.abs(angle) < 30 || Math.abs(angle) > 150) {
        if (deltaX > 0) {
          // Swipe right - redo
          redo();
        } else {
          // Swipe left - undo
          undo();
        }
      }

      // Vertical swipes
      if (Math.abs(angle - 90) < 30 || Math.abs(angle + 90) < 30) {
        if (deltaY > 0) {
          // Swipe down - deselect all
          clearSelection();
        }
        // Removed swipe up selectAll since that method doesn't exist
      }
    }

    // Cleanup
    touchStartRef.current = null;
    touchHistory.current = [];
  }, [isEnabled, clearSelection, undo, redo]);

  // Add gesture event listeners
  useEffect(() => {
    if (!isEnabled) return;

    const options = { passive: false };

    document.addEventListener('touchstart', handleTouchStart, options);
    document.addEventListener('touchmove', handleTouchMove, options);
    document.addEventListener('touchend', handleTouchEnd, options);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, isEnabled]);

  return {
    touchHistory: touchHistory.current,
  };
}

/**
 * Component that provides keyboard shortcuts and gesture support
 */
export default function KeyboardShortcuts(props: KeyboardShortcutsProps) {
  const keyboardShortcuts = useKeyboardShortcuts(props);
  const gestureSupport = useGestureSupport({
    canvasState: props.canvasState,
    isEnabled: props.isEnabled,
  });

  // This component doesn't render anything, it just manages shortcuts
  return null;
}