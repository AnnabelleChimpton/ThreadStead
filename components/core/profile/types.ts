// Shared types for AdvancedProfileRenderer and related components

import type { ProfileUser } from './ProfileModeRenderer';
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider';
import type { Island } from '@/lib/templates/compilation/compiler';
import type { TemplateType } from '@/lib/utils/template-type-detector';

// Extended Island type with htmlStructure for runtime rendering
export interface ExtendedIsland extends Island {
  htmlStructure?: HtmlNode[];
}

export interface HtmlNode {
  type: 'component' | 'html' | 'text';
  componentId?: string;
  tagName?: string;
  attributes?: Record<string, unknown>;
  children?: HtmlNode[];
  content?: string;
}

// Advanced profile renderer props
export interface AdvancedProfileRendererProps {
  user: ProfileUser;
  residentData: ResidentData;
  templateType: TemplateType;
  onFallback?: (reason: string) => void;
  onIslandsReady?: () => void;
  isInVisualBuilder?: boolean;
  onIslandError?: (error: Error, islandId: string) => void;
}

// Direct islands renderer props
export interface DirectIslandsRendererProps {
  islands: Island[];
  residentData: ResidentData;
  onIslandRender: (islandId: string) => void;
  onIslandError: (error: Error, islandId: string) => void;
}

// Profile content renderer props
export interface ProfileContentRendererProps {
  compiledTemplate: any;
  islands: Island[];
  residentData: ResidentData;
  onIslandRender: (islandId: string) => void;
  onIslandError: (error: Error, islandId: string) => void;
  visualBuilderClasses?: string[];
  isInVisualBuilder?: boolean;
  templateType?: TemplateType;
  profileId?: string;
}

// Static HTML with islands props
export interface StaticHTMLWithIslandsProps {
  staticHTML: string;
  islands: Island[];
  residentData: ResidentData;
  onIslandRender: (islandId: string) => void;
  onIslandError: (error: Error, islandId: string) => void;
  visualBuilderClasses?: string[];
  isInVisualBuilder?: boolean;
  templateType?: TemplateType;
  profileId?: string;
}

// Static HTML renderer props (LEGACY - UNUSED)
export interface StaticHTMLRendererProps {
  html: string;
  islands: Island[];
  residentData: ResidentData;
  onIslandRender: (islandId: string) => void;
  onIslandError: (error: Error, islandId: string) => void;
}

// Advanced profile fallback props
export interface AdvancedProfileFallbackProps {
  reason: string;
}

// Hydration debug info props
export interface HydrationDebugInfoProps {
  totalIslands: number;
  loadedIslands: Set<string>;
  failedIslands: Map<string, Error>;
  isHydrated: boolean;
}

// Island renderer props (shared across multiple renderers)
export interface IslandRendererProps {
  island: Island | ExtendedIsland;
  allIslands: Island[];
  residentData: ResidentData;
  onIslandRender: (islandId: string) => void;
  onIslandError: (error: Error, islandId: string) => void;
  htmlChildren?: React.ReactNode;
}
