'use client';

import React, { createContext, useContext } from 'react';
import { useTemplateState } from '@/lib/templates/state/TemplateStateProvider';

/**
 * Sequence Component - Execute actions in sequence with delays
 *
 * Container component that executes actions sequentially.
 * Supports two patterns:
 *
 * 1. Step-based (explicit delays per step)
 * 2. Direct children (with Delay components for timing)
 *
 * @example Step-based pattern
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
 *
 * @example Direct children pattern
 * ```xml
 * <Button>
 *   <OnClick>
 *     <Sequence>
 *       <Set var="message" value="Starting..." />
 *       <Delay milliseconds="1000" />
 *       <Set var="message" value="Loading..." />
 *       <Delay milliseconds="1000" />
 *       <Set var="message" value="Complete!" />
 *     </Sequence>
 *   </OnClick>
 *   Click Me
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
 * Supports two patterns:
 * 1. Step-based: Executes Step children sequentially with delay props
 * 2. Direct children: Executes action children sequentially, handling Delay components
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

  // Get all children
  const childArray = React.Children.toArray(children);

  // Helper function to unwrap island architecture wrappers
  function unwrapChild(child: any): any {
    if (!React.isValidElement(child)) return child;

    let actualChild = child;

    // Unwrap IslandErrorBoundary
    if (typeof child.type === 'function' &&
        (child.type.name === 'IslandErrorBoundary' ||
         (child.type as any).displayName === 'IslandErrorBoundary')) {
      const boundaryChildren = React.Children.toArray((child.props as any).children);
      if (boundaryChildren.length > 0 && React.isValidElement(boundaryChildren[0])) {
        actualChild = boundaryChildren[0];
      }
    }

    // Unwrap ResidentDataProvider
    if (typeof actualChild.type === 'function' &&
        (actualChild.type.name === 'ResidentDataProvider' ||
         (actualChild.type as any).displayName === 'ResidentDataProvider')) {
      const providerChildren = React.Children.toArray((actualChild.props as any).children);
      if (providerChildren.length > 0 && React.isValidElement(providerChildren[0])) {
        actualChild = providerChildren[0];
      }
    }

    return actualChild;
  }

  // Check if children contain Step components
  const hasSteps = childArray.some(child => {
    const actualChild = unwrapChild(child);
    if (!React.isValidElement(actualChild)) return false;

    const componentName = typeof actualChild.type === 'function'
      ? actualChild.type.name || (actualChild.type as any).displayName
      : '';

    return componentName === 'Step';
  });

  // PATTERN 1: Step-based execution (backwards compatible)
  if (hasSteps) {
    const steps: Array<{ delay: number; children: React.ReactNode }> = [];

    // Extract Step components and their props
    for (const child of childArray) {
      const actualChild = unwrapChild(child);
      if (!React.isValidElement(actualChild)) continue;

      const componentName = typeof actualChild.type === 'function'
        ? actualChild.type.name || (actualChild.type as any).displayName
        : '';

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
  // PATTERN 2: Direct children execution (better UX)
  else {
    // Execute children sequentially, handling Delay components specially
    for (let i = 0; i < childArray.length; i++) {
      const child = childArray[i];
      const actualChild = unwrapChild(child);

      if (!React.isValidElement(actualChild)) continue;

      const componentName = typeof actualChild.type === 'function'
        ? actualChild.type.name || (actualChild.type as any).displayName
        : '';

      // Handle Delay component specially - await the timeout
      if (componentName === 'Delay') {
        const delayProps = actualChild.props as any;
        const milliseconds = delayProps.milliseconds || (delayProps.seconds ? delayProps.seconds * 1000 : 0);

        if (milliseconds > 0) {
          await new Promise(resolve => setTimeout(resolve, milliseconds));
        }

        // Execute any children of the Delay component
        if (delayProps.children) {
          try {
            executeActions(delayProps.children, templateState, residentData, forEachContext, currentElement);
          } catch (error) {
            console.error('[Sequence] Error executing Delay children:', error);
          }
        }
      }
      // Execute other actions immediately
      else {
        try {
          executeActions(actualChild, templateState, residentData, forEachContext, currentElement);
        } catch (error) {
          console.error(`[Sequence] Error executing action ${i + 1}:`, error);
          // Continue to next action despite error
        }
      }
    }
  }
}
