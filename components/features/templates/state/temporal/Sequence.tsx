'use client';

import React, { createContext, useContext } from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';

/**
 * Sequence Component - Execute actions in sequence with delays
 *
 * Container component that executes Step children sequentially.
 * Each Step can have a delay before it executes.
 *
 * @example
 * ```xml
 * <Button>
 *   <OnClick>
 *     <Sequence>
 *       <Step delay="0">
 *         <Set var="step" value="1" />
 *         <ShowToast message="Step 1" type="info" />
 *       </Step>
 *       <Step delay="1000">
 *         <Set var="step" value="2" />
 *         <ShowToast message="Step 2" type="info" />
 *       </Step>
 *       <Step delay="2000">
 *         <Set var="step" value="3" />
 *         <ShowToast message="Complete!" type="success" />
 *       </Step>
 *     </Sequence>
 *   </OnClick>
 *   Start Sequence
 * </Button>
 * ```
 */

export interface SequenceProps {
  /** Step components to execute in sequence */
  children?: React.ReactNode;

  /** Internal: Visual builder mode flag */
  __visualBuilder?: boolean;
  _isInVisualBuilder?: boolean;
}

/**
 * Sequence Context Type
 * Shared between Sequence container and Step children
 */
export interface SequenceContextType {
  /** Indicate this is a sequence context */
  isSequence: boolean;
}

// Create context for Sequence/Step communication
const SequenceContext = createContext<SequenceContextType | null>(null);

/**
 * Hook to access Sequence context from Step components
 */
export function useSequenceContext(): SequenceContextType | null {
  return useContext(SequenceContext);
}

export default function Sequence(props: SequenceProps) {
  const {
    children,
    __visualBuilder,
    _isInVisualBuilder
  } = props;

  const templateState = useTemplateState();
  const isVisualBuilder = __visualBuilder === true || _isInVisualBuilder === true;

  // Visual builder mode - show indicator
  if (isVisualBuilder) {
    return (
      <div className="inline-block px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-300 dark:border-indigo-700 rounded text-xs text-indigo-700 dark:text-indigo-300 font-mono">
        ⏩ Sequence
        {children && (
          <div className="mt-1 pl-2 border-l-2 border-indigo-400 dark:border-indigo-600 space-y-1">
            {children}
          </div>
        )}
      </div>
    );
  }

  // Normal mode - component doesn't render
  // Execution is handled by parent event handler
  return null;
}

/**
 * Execute Sequence actions programmatically
 * Called by event handlers like OnClick
 *
 * Executes Step children sequentially with delays
 *
 * @param props Sequence component props
 * @param executeActions Function to execute child actions
 * @param templateState Template state context
 * @param residentData Resident data for condition evaluation
 * @param forEachContext ForEach loop context
 * @returns Promise that resolves when all steps complete
 */
export async function executeSequenceActions(
  props: SequenceProps,
  executeActions: (
    children: React.ReactNode,
    templateState: any,
    residentData: any,
    forEachContext?: any,
    currentElement?: HTMLElement
  ) => void,
  templateState: ReturnType<typeof useTemplateState>,
  residentData: any,
  forEachContext?: any,
  currentElement?: HTMLElement
): Promise<void> {
  const { children } = props;

  if (!children) {
    return;
  }

  // Get all Step children
  const childArray = React.Children.toArray(children);
  const steps: Array<{ delay: number; children: React.ReactNode }> = [];

  // Extract Step components and their props
  for (const child of childArray) {
    if (!React.isValidElement(child)) continue;

    // Unwrap ResidentDataProvider if present (islands architecture)
    let actualChild = child;
    if (typeof child.type === 'function' &&
        (child.type.name === 'ResidentDataProvider' ||
         (child.type as any).displayName === 'ResidentDataProvider')) {
      const providerChildren = React.Children.toArray((child.props as any).children);
      if (providerChildren.length > 0 && React.isValidElement(providerChildren[0])) {
        actualChild = providerChildren[0];
      }
    }

    // Get component name
    const componentName = typeof actualChild.type === 'function'
      ? actualChild.type.name || (actualChild.type as any).displayName
      : '';

    // Only process Step components
    if (componentName === 'Step') {
      const stepProps = actualChild.props as any;
      steps.push({
        delay: stepProps.delay || 0,
        children: stepProps.children
      });
    }
  }

  // Execute steps sequentially
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    // Wait for the delay
    if (step.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, step.delay));
    }

    // Execute step actions
    try {
      if (step.children) {
        executeActions(step.children, templateState, residentData, forEachContext, currentElement);
      }
    } catch (error) {
      console.error(`[Sequence] Error executing step ${i + 1}:`, error);
      // Continue to next step despite error
    }
  }
}
