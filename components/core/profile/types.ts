// Shared types for AdvancedProfileRenderer and related components

import type { ProfileUser } from './ProfileModeRenderer';
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider';
import type { Island } from '@/lib/templates/compilation/compiler';
import type { PageTreeNode } from '@/lib/templates/rendering/page-tree';

// Advanced profile renderer props
export interface AdvancedProfileRendererProps {
  user: ProfileUser;
  residentData: ResidentData;
}

// Static HTML with islands props
export interface StaticHTMLWithIslandsProps {
  /** The page tree, when the server built one (renders on the server) */
  tree?: PageTreeNode[];
  /** Otherwise the compiled HTML, parsed in the browser */
  staticHTML?: string;
  islands: Island[];
  residentData: ResidentData;
  /** Unused; kept so existing callers (WidgetSlot) type-check */
  onIslandRender?: (islandId: string) => void;
  onIslandError?: (error: Error, islandId: string) => void;
}
