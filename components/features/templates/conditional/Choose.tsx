'use client';

import React from 'react';
import { useResidentData } from '../ResidentDataProvider';
import { evaluateFullCondition, type ConditionConfig } from '@/lib/templates/conditional/condition-evaluator';

interface ChooseProps {
  children: React.ReactNode;
}

interface WhenProps {
  // Simple condition expressions
  condition?: string;
  when?: string;
  data?: string;

  // Comparison operators
  equals?: string;
  notEquals?: string;
  greaterThan?: string | number;
  lessThan?: string | number;
  greaterThanOrEqual?: string | number;
  lessThanOrEqual?: string | number;

  // String operators
  contains?: string;
  startsWith?: string;
  endsWith?: string;
  matches?: string;

  // Existence check
  exists?: string | boolean;

  // Logical operators
  and?: string | string[];
  or?: string | string[];
  not?: string;

  children: React.ReactNode;
}

interface OtherwiseProps {
  children: React.ReactNode;
}

/**
 * When Component - Conditional branch within Choose
 *
 * @example
 * <Choose>
 *   <When data="posts.length" greaterThan="10">
 *     <p>Prolific poster!</p>
 *   </When>
 *   <When data="posts.length" greaterThan="0">
 *     <BlogPosts />
 *   </When>
 *   <Otherwise>
 *     <p>No posts yet</p>
 *   </Otherwise>
 * </Choose>
 */
export function When(props: WhenProps): React.ReactElement | null {
  const { children, ...conditionProps } = props;
  const residentData = useResidentData();

  // Support both 'condition' and 'when' for backwards compatibility
  const config: ConditionConfig = {
    ...conditionProps,
    when: conditionProps.when || conditionProps.condition,
  };

  const shouldShow = evaluateFullCondition(config, residentData);

  // This component is only used inside Choose, which handles the rendering logic
  return shouldShow ? <>{children}</> : null;
}

/**
 * Otherwise Component - Fallback branch within Choose
 */
export function Otherwise({ children }: OtherwiseProps): React.ReactElement {
  // This component is only used inside Choose, which handles the rendering logic
  return <>{children}</>;
}

/**
 * Choose Component - Multi-condition switch statement
 * Renders the first When child that matches, or Otherwise if none match
 *
 * @example
 * <Choose>
 *   <When data="posts.length" equals="0">
 *     <p>No posts yet</p>
 *   </When>
 *   <When data="posts" greaterThan="0">
 *     <BlogPosts limit="5" />
 *   </When>
 *   <Otherwise>
 *     <p>Welcome!</p>
 *   </Otherwise>
 * </Choose>
 */
export default function Choose({ children }: ChooseProps) {
  const residentData = useResidentData();
  const childArray = React.Children.toArray(children);

  for (const child of childArray) {
    if (React.isValidElement(child)) {
      // P3.3 FIX: Unwrap IslandErrorBoundary if present
      let actualChild = child;
      let actualProps = child.props;

      // Check if this is an IslandErrorBoundary wrapper
      if (typeof child.type === 'function' &&
          (child.type.name === 'IslandErrorBoundary' ||
           (child.type as any).displayName === 'IslandErrorBoundary')) {
        const boundaryChildren = React.Children.toArray((child.props as any).children);
        if (boundaryChildren.length > 0 && React.isValidElement(boundaryChildren[0])) {
          actualChild = boundaryChildren[0];
          actualProps = actualChild.props;
        }
      }

      // CRITICAL FIX: Unwrap ResidentDataProvider to find the actual component
      // Islands rendering wraps every component in ResidentDataProvider, breaking child detection
      // Check if this is a ResidentDataProvider wrapper
      if (typeof actualChild.type === 'function' &&
          (actualChild.type.name === 'ResidentDataProvider' ||
           (actualChild.type as any).displayName === 'ResidentDataProvider')) {
        // Get the actual child inside the provider
        const providerChildren = React.Children.toArray((actualChild.props as any).children);
        if (providerChildren.length > 0 && React.isValidElement(providerChildren[0])) {
          actualChild = providerChildren[0];
          actualProps = actualChild.props;
        }
      }

      // Check if this is a When component - try both direct comparison and name-based comparison
      const isWhenComponent =
        actualChild.type === When ||
        (typeof actualChild.type === 'function' && actualChild.type.name === 'When') ||
        (typeof actualChild.type === 'function' && (actualChild.type as any).displayName === 'When');

      if (isWhenComponent) {
        const props = actualProps as WhenProps;

        // Build condition config from props (exclude children)
        const { children: _, ...conditionProps } = props;
        const config: ConditionConfig = {
          ...conditionProps,
          when: props.when || props.condition,
        };

        const shouldShow = evaluateFullCondition(config, residentData);

        if (shouldShow) {
          return <>{props.children}</>;
        }
      } else {
        // Check if this is an Otherwise component
        const isOtherwiseComponent =
          actualChild.type === Otherwise ||
          (typeof actualChild.type === 'function' && actualChild.type.name === 'Otherwise') ||
          (typeof actualChild.type === 'function' && (actualChild.type as any).displayName === 'Otherwise');

        if (isOtherwiseComponent) {
          // If we reach Otherwise, no When conditions were met
          return <>{(actualProps as OtherwiseProps).children}</>;
        }
      }
    }
  }

  return null;
}
