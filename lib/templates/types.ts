/**
 * Common component prop types for template components
 */

import { CSSProperties, ReactNode } from 'react';

/**
 * Base props that all template components should support
 */
export interface ComponentProps {
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}