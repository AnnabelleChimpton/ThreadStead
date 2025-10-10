'use client';

import React from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';
import { getGlobalToast } from '@/lib/templates/state/ToastProvider';

/**
 * ShowToast Component - Action to show a toast notification
 *
 * This component is used inside event handlers (OnClick, OnChange, etc.)
 * to display toast notifications to users. It does not render anything.
 *
 * Uses react-hot-toast for toast notifications.
 *
 * @example
 * ```xml
 * <button>
 *   <OnClick>
 *     <ShowToast message="Button clicked!" />
 *   </OnClick>
 *   Click Me
 * </button>
 *
 * <button>
 *   <OnClick>
 *     <If condition="$vars.counter" greaterThan="10">
 *       <ShowToast message="Counter exceeded 10!" type="success" />
 *     </If>
 *   </OnClick>
 *   Check Counter
 * </button>
 * ```
 */

export interface ShowToastProps {
  /** Message to display in toast */
  message: string;

  /** Toast type (affects styling and icon) */
  type?: 'success' | 'error' | 'warning' | 'info' | 'loading';

  /** Duration in milliseconds (default: 3000) */
  duration?: number | string;

  /** Position of toast on screen */
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;

  /** Children (ignored - ShowToast is an action component) */
  children?: React.ReactNode;
}

export default function ShowToast(props: ShowToastProps) {
  const {
    message,
    type = 'success',
    duration = 3000,
    position,
    __visualBuilder,
    _isInVisualBuilder
  } = props;

  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    const typeEmoji = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
      loading: '⏳'
    }[type] || '💬';

    return (
      <div className="inline-block px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-300 dark:border-indigo-700 rounded text-xs text-indigo-700 dark:text-indigo-300 font-mono">
        {typeEmoji} ShowToast: &quot;{message}&quot; ({type})
      </div>
    );
  }

  // Normal mode - component doesn't render
  // Action is executed by parent event handler
  return null;
}

/**
 * Execute ShowToast action programmatically
 * Called by event handlers like OnClick
 *
 * @param props ShowToast component props
 * @param templateState Template state context (unused, but kept for consistency)
 * @param forEachContext ForEach loop context (unused, but kept for consistency)
 */
export function executeShowToastAction(
  props: ShowToastProps,
  templateState?: ReturnType<typeof useTemplateState>,
  forEachContext?: { scopeId?: string } | null
): void {
  const { message, type = 'success', duration = 3000 } = props;

  if (!message) {
    console.warn('ShowToast action: message prop is required');
    return;
  }

  const toastContext = getGlobalToast();
  if (!toastContext) {
    console.error('ShowToast: ToastProvider not found in component tree');
    return;
  }

  // Convert duration to number if it's a string
  const durationMs = typeof duration === 'string' ? parseInt(duration) : duration;

  try {
    // Use custom toast system
    switch (type) {
      case 'success':
        toastContext.showSuccess(message);
        break;
      case 'error':
        toastContext.showError(message);
        break;
      case 'warning':
        toastContext.showWarning(message);
        break;
      case 'info':
      case 'loading':  // Map loading to info (custom toast doesn't have loading state)
        toastContext.showInfo(message);
        break;
      default:
        toastContext.showToast(message, 'info', durationMs);
    }
  } catch (error) {
    console.error(`ShowToast action error:`, error);
  }
}
