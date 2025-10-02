/**
 * VISUAL_BUILDER_PROGRESS: Main Visual Template Builder Component - Simplified Pixel Homes Pattern
 * Phase 1: Visual Builder Foundation - Direct State Management
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useCanvasState, type ComponentItem } from '@/hooks/useCanvasState';
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider';
import {
  getOptimalSpan,
  getCurrentBreakpoint,
  GRID_BREAKPOINTS,
  type GridBreakpoint
} from '@/lib/templates/visual-builder/grid-utils';

// Import new pure positioning system
import {
  AbsolutePositioningUtils,
  PositioningMigration,
  type AbsoluteComponent,
  type AbsoluteCanvasState,
  DEFAULT_CANVAS_CONTAINER
} from '@/lib/templates/visual-builder/pure-positioning';
import { generatePureHTML, generateResponsiveCSS } from '@/lib/templates/visual-builder/pure-html-generator';
import type { CanvasComponent } from '@/lib/templates/visual-builder/types';
import { parseExistingTemplate } from '@/lib/templates/visual-builder/template-parser-reverse';
import { generateCSSFromGlobalSettings } from '@/lib/templates/visual-builder/css-class-generator';
import { deepEqualsComponentArray } from '@/lib/templates/visual-builder/component-equality';

// New modern components
import FloatingPanel, { useFloatingPanels } from './FloatingPanel';
import SmartToolbar from './SmartToolbar';
import CanvasRenderer from './CanvasRenderer';
import TemplateGallery, { type TemplatePreset } from './TemplateGallery';
import BreakpointSwitcher, { type ResponsiveBreakpoint } from './BreakpointSwitcher';

// Legacy components (to be updated)
import ComponentPalette from './ComponentPalette';
import PropertyPanel from './PropertyPanel';
import GlobalSettingsPanel, { type GlobalSettings } from './GlobalSettingsPanel';
import CSSExportPanel from './CSSExportPanel';
import GroupPanel from './GroupPanel';
import BulkPropertyEditor from './BulkPropertyEditor';

interface VisualTemplateBuilderProps {
  initialTemplate?: string;
  onTemplateChange?: (html: string) => void;
  residentData?: ResidentData;
  className?: string;
  // Navigation state props
  showNavigation?: boolean;
  onNavigationToggle?: (show: boolean) => void;
}

/**
 * Main Visual Template Builder component - simplified like pixel homes
 */
export default function VisualTemplateBuilder({
  initialTemplate = '',
  onTemplateChange,
  residentData = {
    owner: { id: 'demo', handle: 'demo', displayName: 'Demo User' },
    viewer: { id: 'demo' },
    posts: [],
    guestbook: []
  },
  className = '',
  showNavigation = false,
  onNavigationToggle,
}: VisualTemplateBuilderProps) {
  // Change tracking to prevent echo/feedback loops
  const isInternalChange = React.useRef(false);
  const lastGeneratedHTML = React.useRef<string>('');
  const pendingTemplateChange = React.useRef<NodeJS.Timeout | null>(null);

  // Render debugging and circuit breaker
  const renderCount = React.useRef(0);
  const lastRenderTime = React.useRef(Date.now());
  const rapidRenderCount = React.useRef(0);

  renderCount.current += 1;
  const now = Date.now();

  // Circuit breaker: detect rapid re-renders
  if (now - lastRenderTime.current < 50) { // Less than 50ms between renders
    rapidRenderCount.current += 1;
    if (rapidRenderCount.current > 10) {
      // Force stop by setting internal change flag
      isInternalChange.current = true;
      setTimeout(() => {
        isInternalChange.current = false;
        rapidRenderCount.current = 0;
      }, 1000);
    }
  } else {
    rapidRenderCount.current = 0;
  }

  lastRenderTime.current = now;

  // State for template loading
  const [templateLoadingState, setTemplateLoadingState] = useState<{
    loading: boolean;
    error: string | null;
    warnings: string[];
    componentCount: number;
  }>({
    loading: false,
    error: null,
    warnings: [],
    componentCount: 0,
  });

  // Parse initial template into components (pure function - no side effects)
  const initialComponents = useMemo(() => {
    if (!initialTemplate || initialTemplate.trim() === '') {
      return [];
    }

    try {
      // Helper function to recursively convert CanvasComponent children to ComponentItem format
      const convertCanvasComponentToItemRecursively = (canvasComponents: any[]): ComponentItem[] => {
        return canvasComponents.map(canvasComp => {
          const componentItem: ComponentItem = {
            id: canvasComp.id,
            type: canvasComp.type,
            position: canvasComp.position || { x: 0, y: 0 },
            positioningMode: (canvasComp.positioningMode === 'flow' ? 'grid' : canvasComp.positioningMode) || 'grid',
            publicProps: canvasComp.props || {},
            visualBuilderState: {
              isSelected: false,
              isLocked: false,
              isHidden: false,
              lastModified: Date.now(),
              // Track if columns was explicitly set in HTML for GridLayout components
              hasUserSetColumns: canvasComp.type === 'GridLayout' && canvasComp.props && 'columns' in canvasComp.props
            }
          };

          // Add grid position if available
          if (canvasComp.gridPosition) {
            componentItem.gridPosition = {
              column: canvasComp.gridPosition.column,
              row: canvasComp.gridPosition.row,
              span: canvasComp.gridPosition.columnSpan || 1,
            };
          }

          // Recursively convert children
          if (canvasComp.children && canvasComp.children.length > 0) {
            componentItem.children = convertCanvasComponentToItemRecursively(canvasComp.children);
          }

          return componentItem;
        });
      };

      // Parse the HTML template using existing parser
      const parseResult = parseExistingTemplate(initialTemplate);

      // Convert CanvasComponent format to ComponentItem format
      const convertedComponents: ComponentItem[] = parseResult.canvasState.components.map(canvasComp => {
        const componentItem: ComponentItem = {
          id: canvasComp.id,
          type: canvasComp.type,
          position: canvasComp.position || { x: 0, y: 0 },
          positioningMode: (canvasComp.positioningMode === 'flow' ? 'grid' : canvasComp.positioningMode) || 'grid',
          publicProps: canvasComp.props || {},
          visualBuilderState: {
            isSelected: false,
            isLocked: false,
            isHidden: false,
            lastModified: Date.now(),
            // Track if columns was explicitly set in HTML for GridLayout components
            hasUserSetColumns: canvasComp.type === 'GridLayout' && canvasComp.props && 'columns' in canvasComp.props
          }
        };

        // Add grid position if available
        if (canvasComp.gridPosition) {
          componentItem.gridPosition = {
            column: canvasComp.gridPosition.column,
            row: canvasComp.gridPosition.row,
            span: canvasComp.gridPosition.columnSpan || 1,
          };
        }

        // Add children if available - recursively convert nested children
        if (canvasComp.children && canvasComp.children.length > 0) {
          componentItem.children = canvasComp.children.map(child => ({
            id: child.id,
            type: child.type,
            position: child.position || { x: 0, y: 0 },
            positioningMode: (child.positioningMode === 'flow' ? 'grid' : child.positioningMode) || 'grid',
            publicProps: child.props || {},
            visualBuilderState: {
              isSelected: false,
              isLocked: false,
              isHidden: false,
              lastModified: Date.now()
            },
            gridPosition: child.gridPosition ? {
              column: child.gridPosition.column,
              row: child.gridPosition.row,
              span: child.gridPosition.columnSpan || 1,
            } : undefined,
            // Recursively handle grandchildren
            children: child.children && child.children.length > 0 ?
              convertCanvasComponentToItemRecursively(child.children) : undefined
          }));
        }

        return componentItem;
      });

      return convertedComponents;
    } catch (error) {
      console.error('Failed to parse initial template:', error);
      // Return empty array if parsing fails - user can start fresh
      return [];
    }
  }, [initialTemplate]);


  // Separate useEffect to handle loading state updates (moved from useMemo)
  React.useEffect(() => {
    if (!initialTemplate || initialTemplate.trim() === '') {
      setTemplateLoadingState({
        loading: false,
        error: null,
        warnings: [],
        componentCount: 0,
      });
      return;
    }

    setTemplateLoadingState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const parseResult = parseExistingTemplate(initialTemplate);
      setTemplateLoadingState({
        loading: false,
        error: null,
        warnings: parseResult.warnings,
        componentCount: initialComponents.length,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error';
      setTemplateLoadingState({
        loading: false,
        error: `Failed to load existing template: ${errorMessage}. Starting with empty canvas.`,
        warnings: [],
        componentCount: 0,
      });
    }
  }, [initialTemplate, initialComponents.length]);

  // Modern panel management
  const { togglePanel, isPanelOpen } = useFloatingPanels();

  // Template gallery state
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);


  // Panel toggle functions
  const handleToggleProperties = () => {
    togglePanel('properties');
  };

  const handleToggleComponents = () => {
    togglePanel('components');
  };

  const handleToggleGlobal = () => {
    togglePanel('global');
  };

  const handleToggleCSSExport = () => {
    togglePanel('cssExport');
  };

  const handleToggleGroups = () => {
    togglePanel('groups');
  };

  const handleToggleBulkEdit = () => {
    togglePanel('bulkEdit');
  };

  // Simplified canvas state management with initial components
  const originalCanvasState = useCanvasState(initialComponents);

  // Apply global settings from parsed template (only on initial load)
  const [hasLoadedInitialSettings, setHasLoadedInitialSettings] = React.useState(false);

  React.useEffect(() => {
    // Only run on first load when we have a template and haven't loaded settings yet
    if (initialTemplate && initialTemplate.trim() !== '' && !hasLoadedInitialSettings) {
      try {
        const parseResult = parseExistingTemplate(initialTemplate);
        if (parseResult.globalSettings) {
          originalCanvasState.setGlobalSettings(parseResult.globalSettings);
          setHasLoadedInitialSettings(true);
        }
      } catch (error) {
        setHasLoadedInitialSettings(true); // Mark as attempted to prevent infinite retries
      }
    }
  }, [initialTemplate, hasLoadedInitialSettings]); // Removed function dependency

  // Breakpoint preview controls
  const [activeBreakpoint, setActiveBreakpoint] = useState<ResponsiveBreakpoint>('desktop');
  const currentBreakpoint = getCurrentBreakpoint();
  const effectiveBreakpoint = activeBreakpoint;

  // Track if user has made changes to prevent overwriting original template
  const [hasUserMadeChanges, setHasUserMadeChanges] = React.useState(false);

  // Store initial components for deep comparison to detect user changes
  const initialComponentsRef = React.useRef(initialComponents);
  const initialComponentCount = React.useRef(initialComponents.length);

  // Navigation management - automatically add/remove navigation component
  React.useEffect(() => {
    const NAVIGATION_ID = 'system-navigation';
    const hasNavigation = originalCanvasState.placedComponents.find(comp => comp.id === NAVIGATION_ID);

    if (showNavigation && !hasNavigation) {
      // Add navigation component at the top
      const navigationComponent: ComponentItem = {
        id: NAVIGATION_ID,
        type: 'ThreadsteadNavigation',
        position: { x: 0, y: 0 },
        positioningMode: 'absolute',
        publicProps: {
          width: 'auto',
          height: 'auto',
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          color: 'inherit',
          opacity: 1,
          blur: 10,
          borderColor: 'rgba(255, 255, 255, 0.2)',
          borderWidth: 1
        },
        visualBuilderState: {
          isSelected: false,
          isLocked: true, // Prevent user from moving/deleting
          isHidden: false,
          lastModified: Date.now()
        }
      };
      originalCanvasState.addComponent(navigationComponent);
    } else if (!showNavigation && hasNavigation) {
      // Remove navigation component
      originalCanvasState.removeComponent(NAVIGATION_ID);
    }
  }, [showNavigation, originalCanvasState]);

  const {
    placedComponents,
    selectedComponentIds,
    gridConfig,
    positioningMode,
    setPositioningMode,
    setGridConfig,
    globalSettings,
    setGlobalSettings,
    componentGroups,
    selectedGroupId,
    createGroup,
    updateGroup,
    deleteGroup,
    selectGroup,
    ungroupComponents,
    removeComponentsFromGroup,
    getGroupedComponents,
    getComponentGroup,
    undo,
    redo,
    canUndo,
    canRedo,
    resetCanvas: originalResetCanvas,
    removeSelected: originalRemoveSelected,
    updateComponent: originalUpdateComponent,
    addComponent: originalAddComponent,
    removeComponent: originalRemoveComponent,
    addChildComponent: originalAddChildComponent,
    removeChildComponent: originalRemoveChildComponent,
    ...restCanvasState
  } = originalCanvasState;

  // Helper function to compare if components have actually changed (memoized to prevent recreation)
  const componentsAreEqual = useCallback((components1: ComponentItem[], components2: ComponentItem[]): boolean => {
    if (components1.length !== components2.length) {
      return false;
    }

    for (let i = 0; i < components1.length; i++) {
      const comp1 = components1[i];
      const comp2 = components2[i];

      // Focus on user-meaningful changes, be more lenient with parser changes
      const typeChanged = comp1.type !== comp2.type;
      const positioningModeChanged = comp1.positioningMode !== comp2.positioningMode;

      // Compare positions more carefully
      const gridPos1 = comp1.gridPosition;
      const gridPos2 = comp2.gridPosition;
      const gridPositionChanged = (gridPos1?.column !== gridPos2?.column) ||
                                  (gridPos1?.row !== gridPos2?.row) ||
                                  (gridPos1?.span !== gridPos2?.span);

      const pixelPos1 = comp1.position;
      const pixelPos2 = comp2.position;
      const pixelPositionChanged = (pixelPos1?.x !== pixelPos2?.x) || (pixelPos1?.y !== pixelPos2?.y);

      // Compare meaningful props (exclude internal parser props)
      const props1 = { ...comp1.props };
      const props2 = { ...comp2.props };
      delete props1._size;
      delete props2._size;
      const propsChanged = JSON.stringify(props1) !== JSON.stringify(props2);

      const childrenChanged = (comp1.children?.length || 0) !== (comp2.children?.length || 0);

      if (typeChanged || positioningModeChanged || gridPositionChanged || pixelPositionChanged || propsChanged || childrenChanged) {
        return false;
      }
    }

    return true;
  }, []); // Stable callback

  // Track when user makes ANY changes (add, remove, update, move)
  const markUserChange = useCallback(() => {
    if (!hasUserMadeChanges) {
      setHasUserMadeChanges(true);
    }
  }, [hasUserMadeChanges]);

  // Wrap operations to mark user changes
  const resetCanvas = useCallback(() => {
    markUserChange();
    originalResetCanvas();
  }, [markUserChange, originalResetCanvas]);

  const removeSelected = useCallback(() => {
    markUserChange();
    originalRemoveSelected();
  }, [markUserChange, originalRemoveSelected]);

  const updateComponent = useCallback((id: string, updates: any) => {
    markUserChange();
    originalUpdateComponent(id, updates);
  }, [markUserChange, originalUpdateComponent]);

  const addComponent = useCallback((component: any) => {
    markUserChange();
    originalAddComponent(component);
  }, [markUserChange, originalAddComponent]);

  const removeComponent = useCallback((id: string) => {
    markUserChange();
    originalRemoveComponent(id);
  }, [markUserChange, originalRemoveComponent]);

  const addChildComponent = useCallback((parentId: string, child: any) => {
    markUserChange();
    originalAddChildComponent(parentId, child);
  }, [markUserChange, originalAddChildComponent]);

  const removeChildComponent = useCallback((parentId: string, childId: string) => {
    markUserChange();
    originalRemoveChildComponent(parentId, childId);
  }, [markUserChange, originalRemoveChildComponent]);

  // Handle template selection from gallery
  const handleTemplateSelect = useCallback((template: TemplatePreset) => {
    // Clear current canvas
    resetCanvas();

    // Add template components
    template.components.forEach(component => {
      // Generate new IDs to avoid conflicts
      const newComponent = {
        ...component,
        id: `${component.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        // Ensure children also get new IDs
        children: component.children?.map(child => ({
          ...child,
          id: `${child.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }))
      };
      addComponent(newComponent);
    });

    // Apply global settings if provided
    if (template.globalSettings) {
      setGlobalSettings(template.globalSettings);
    }

    // Mark as user change
    markUserChange();

    // Close gallery
    setShowTemplateGallery(false);
  }, [resetCanvas, addComponent, setGlobalSettings, markUserChange]);

  // Create modified canvas state with wrapped functions
  const canvasState = {
    ...restCanvasState,
    placedComponents,
    selectedComponentIds,
    gridConfig,
    positioningMode,
    setPositioningMode,
    setGridConfig,
    globalSettings,
    setGlobalSettings,
    componentGroups,
    selectedGroupId,
    createGroup,
    updateGroup,
    deleteGroup,
    selectGroup,
    ungroupComponents,
    removeComponentsFromGroup,
    getGroupedComponents,
    getComponentGroup,
    undo,
    redo,
    canUndo,
    canRedo,
    resetCanvas,
    removeSelected,
    updateComponent,
    addComponent,
    removeComponent,
    addChildComponent,
    removeChildComponent,
  };

  // Helper function to find a component by ID (including children)
  const findComponentById = (components: ComponentItem[], targetId: string): ComponentItem | null => {
    for (const comp of components) {
      if (comp.id === targetId) return comp;

      // Search in children recursively
      if (comp.children) {
        const found = findComponentById(comp.children, targetId);
        if (found) return found;
      }
    }
    return null;
  };

  // Get selected component ID
  const selectedId = selectedComponentIds.size === 1 ? Array.from(selectedComponentIds)[0] : null;

  // ROOT CAUSE FIX: Create hash of ONLY the selected component's data (not entire array!)
  // This prevents re-renders when OTHER components change
  const selectedComponentDataHash = useMemo(() => {
    if (!selectedId) return null;

    const comp = findComponentById(placedComponents, selectedId);
    if (!comp) return null;

    // Create hash of only the data that matters for PropertyPanel
    // Exclude lastModified and other internal state that changes constantly
    return JSON.stringify({
      id: comp.id,
      type: comp.type,
      props: comp.props,
      publicProps: comp.publicProps,
      position: comp.position,
      gridPosition: comp.gridPosition,
      responsivePositions: comp.responsivePositions,
      children: comp.children?.map(c => c.id) // Only track child IDs, not full data
    });
  }, [selectedId, placedComponents]);

  // Now only recreate when the HASH changes, not when array reference changes
  const selectedComponentForPanel = useMemo(() => {
    if (!selectedId) return null;
    return findComponentById(placedComponents, selectedId);
  }, [selectedId, selectedComponentDataHash]) // ← Use hash instead of placedComponents!

  // Get the actual current selected component for other uses (canvas, etc.)
  const selectedComponent = useMemo(() => {
    if (!selectedId) return null;
    return findComponentById(placedComponents, selectedId);
  }, [selectedId, placedComponents]);

  // Handle component property updates - properly memoized to prevent re-renders
  const handleComponentUpdate = useCallback((componentId: string, updates: Partial<ComponentItem>) => {
    // Use the wrapped updateComponent that marks user changes
    updateComponent(componentId, updates);
  }, [updateComponent]);

  // PHASE 1 FIX: Use refs for callbacks to keep propertyPanelCanvasState stable
  const removeComponentRef = useRef(removeComponent);
  const updateResponsivePositionRef = useRef(restCanvasState.updateResponsivePosition);
  const getEffectivePositionRef = useRef(restCanvasState.getEffectivePosition);
  const copyPositionToBreakpointRef = useRef(restCanvasState.copyPositionToBreakpoint);

  useEffect(() => {
    removeComponentRef.current = removeComponent;
    updateResponsivePositionRef.current = restCanvasState.updateResponsivePosition;
    getEffectivePositionRef.current = restCanvasState.getEffectivePosition;
    copyPositionToBreakpointRef.current = restCanvasState.copyPositionToBreakpoint;
  }, [removeComponent, restCanvasState.updateResponsivePosition, restCanvasState.getEffectivePosition, restCanvasState.copyPositionToBreakpoint]);

  // Memoize the subset of canvasState that PropertyPanel needs
  // Now only re-creates when gridConfig or globalSettings actually change
  const propertyPanelCanvasState = useMemo(() => ({
    gridConfig,
    globalSettings,
    removeComponent: (id: string) => removeComponentRef.current(id),
    // PHASE 4.2: Add responsive positioning methods with stable references
    updateResponsivePosition: (id: string, breakpoint: 'tablet' | 'mobile', position: any) =>
      updateResponsivePositionRef.current?.(id, breakpoint, position),
    getEffectivePosition: (component: ComponentItem, breakpoint: 'desktop' | 'tablet' | 'mobile') =>
      getEffectivePositionRef.current?.(component, breakpoint),
    copyPositionToBreakpoint: (id: string, from: 'desktop' | 'tablet' | 'mobile', to: 'tablet' | 'mobile') =>
      copyPositionToBreakpointRef.current?.(id, from, to)
  }), [gridConfig, globalSettings]);

  // Convert current canvas state to pure absolute positioning format
  const convertToPureCanvasState = useCallback((): AbsoluteCanvasState => {
    const absoluteComponents: AbsoluteComponent[] = placedComponents.map(component => {
      return PositioningMigration.convertLegacyComponent(component);
    });

    const now = new Date(); // Create once to avoid different timestamps
    return {
      container: DEFAULT_CANVAS_CONTAINER,
      components: absoluteComponents,
      version: '2.0',
      createdAt: now,
      updatedAt: now
    };
  }, [placedComponents]);

  // Memoize CSS generation separately to prevent duplication
  const globalCSS = useMemo(() => {
    if (!globalSettings) return { css: '', classNames: [] };

    try {
      return generateCSSFromGlobalSettings(globalSettings);
    } catch (error) {
      console.error('Failed to generate global settings CSS:', error);
      return { css: '', classNames: [] };
    }
  }, [globalSettings]);

  // Generate HTML using new pure positioning system
  const generatePureHTMLOutput = useCallback((): string => {
    const pureCanvasState = convertToPureCanvasState();
    const result = generatePureHTML(pureCanvasState, {
      containerClass: 'pure-absolute-container',
      includeMetadata: true,
      prettyPrint: true
    });

    if (result.warnings.length > 0) {
      console.warn('Pure HTML generation warnings:', result.warnings);
    }

    // PHASE 4.2: Generate responsive CSS for components with responsive positioning
    const responsiveCSS = generateResponsiveCSS(pureCanvasState.components);

    // Add global settings as CSS classes (CSS already generated in memoized globalCSS)
    let finalHTML = result.html;
    if (globalSettings && globalCSS.classNames.length > 0) {
      const classString = globalCSS.classNames.join(' ');
      // Find the container div and add classes
      finalHTML = finalHTML.replace(
        /class="pure-absolute-container"/,
        `class="pure-absolute-container ${classString}"`
      );
    }

    // Combine global CSS with responsive CSS
    let combinedCSS = globalCSS.css || '';
    if (responsiveCSS && responsiveCSS.trim()) {
      combinedCSS += '\n\n/* Responsive Positioning */\n' + responsiveCSS;
    }

    // Add the CSS styles to the document (only if not already present)
    if (combinedCSS && combinedCSS.trim()) {
      // Validate CSS is not empty and has proper structure
      if (combinedCSS.includes('{') && combinedCSS.includes('}')) {
        // Always inject CSS for Visual Builder - we handle CSS merging at the EnhancedTemplateEditor level
        // This ensures CSS is always included in the HTML output for proper extraction
        const shouldInjectCSS = true;

        if (shouldInjectCSS) {
          // Inject/update CSS - allows theme changes while preserving user customizations
          const styleTag = `<style>
${combinedCSS}
</style>`;

          // Insert style tag at the beginning of the HTML
          if (finalHTML.includes('<head>')) {
            finalHTML = finalHTML.replace('<head>', `<head>\n${styleTag}`);
          } else {
            finalHTML = styleTag + '\n' + finalHTML;
          }
        }
      } else {
        console.warn('Generated CSS appears to be invalid, skipping CSS injection');
      }
    }

    return finalHTML;
  }, [convertToPureCanvasState, globalCSS]);

  // Helper function to generate HTML for a single component and its children (LEGACY - to be removed)
  const generateComponentHTML = useCallback((component: ComponentItem, indent: string = '  ', isChild: boolean = false): string => {
    const props = component.props || {};

    // Check if this is a text component
    const isTextComponent = ['TextElement', 'Heading', 'Paragraph'].includes(component.type);

    // Extract content for text components
    let textContent = '';
    if (isTextComponent && props.content) {
      textContent = String(props.content);
    }

    // Enhanced prop handling with special treatment for sizing and text components
    const propsString = Object.entries(props)
      .filter(([key, value]) => {
        // Skip content prop for text components (it becomes the element's text content)
        if (isTextComponent && key === 'content') return false;
        return value !== undefined && value !== null;
      })
      .map(([key, value]) => {
        // Handle _size prop specially for better formatting
        if (key === '_size' && typeof value === 'object') {
          const sizeData = JSON.stringify(value);
          return `data-component-size='${sizeData.replace(/'/g, '&#39;')}'`;
        }

        // Handle different prop types
        if (typeof value === 'boolean') {
          // Boolean props: if true, include attribute name only; if false, omit
          return value ? key : null;
        } else if (typeof value === 'string') {
          // String props: escape quotes and include value
          return `${key}="${value.replace(/"/g, '&quot;')}"`;
        } else if (typeof value === 'number') {
          // Number props: include as-is
          return `${key}="${value}"`;
        } else {
          // Complex props: JSON stringify (for arrays/objects)
          return `${key}='${JSON.stringify(value).replace(/'/g, '&#39;')}'`;
        }
      })
      .filter(Boolean)
      .join(' ');

    // Generate component ID attribute to preserve component identity across parsing
    const componentIdAttr = ` data-component-id="${component.id}"`;

    // Add positioning data based on component's positioning mode (skip for child components)
    // NOTE: HTML generator will also add positioning attributes, so we keep this minimal to avoid duplicates
    let positioningAttributes = '';
    if (!isChild && component.positioningMode === 'absolute') {
      // Include essential positioning data for profile renderer to detect absolute positioning
      positioningAttributes = ` data-position="${component.position.x},${component.position.y}" data-positioning-mode="absolute"`;
    } else if (!isChild && component.positioningMode === 'grid' && component.gridPosition) {
      // Use auto-spanning if component doesn't have manual span set
      let finalSpan = component.gridPosition.span;
      if (!finalSpan || finalSpan === 1) {
        const currentBreakpoint = getCurrentBreakpoint();
        finalSpan = getOptimalSpan(component.type, currentBreakpoint.name, currentBreakpoint.columns);
      }

      // Calculate the actual size this grid component will have
      const currentBreakpoint = getCurrentBreakpoint();
      const canvasWidth = 800; // TODO: Make this dynamic based on actual canvas
      const columnWidth = (canvasWidth - (currentBreakpoint.columns + 1) * currentBreakpoint.gap) / currentBreakpoint.columns;
      const componentWidth = (finalSpan * columnWidth) + ((finalSpan - 1) * currentBreakpoint.gap);

      const gridData = JSON.stringify({
        column: component.gridPosition.column,
        row: component.gridPosition.row,
        span: finalSpan,
        positioning: 'grid',
        breakpoint: currentBreakpoint.name,
        autoSpan: !component.gridPosition.span || component.gridPosition.span === 1,
        calculatedSize: {
          width: Math.round(componentWidth),
          height: currentBreakpoint.rowHeight
        }
      });

      positioningAttributes = ` data-grid-column="${component.gridPosition.column}" data-grid-row="${component.gridPosition.row}" data-grid-span="${finalSpan}" data-grid-position='${gridData}' data-positioning-mode="grid"`;
    }

    // Check if component has children or is a text component with content
    const hasChildren = component.children && component.children.length > 0;
    const hasTextContent = isTextComponent && textContent;

    if (hasChildren || hasTextContent) {
      // Generate opening tag
      let html = `${indent}<${component.type}${propsString ? ' ' + propsString : ''}${componentIdAttr}${positioningAttributes}>`;

      // Add text content for text components
      if (hasTextContent) {
        html += textContent;
      }

      // Add children content
      if (hasChildren) {
        html += '\n';
        // Generate children HTML based on component type
        const childIndent = indent + '  ';

        // Handle different child rendering patterns
        if (component.type === 'ContactCard') {
          // ContactCard expects ContactMethod children as React components
          component.children!.forEach(child => {
            if (child.type === 'ContactMethod') {
              html += generateComponentHTML(child, childIndent, true) + '\n';
            }
          });
        } else {
          // Container components (GradientBox, PolaroidFrame, etc.) expect children as nested components
          component.children!.forEach(child => {
            html += generateComponentHTML(child, childIndent, true) + '\n';
          });
        }
        html += indent;
      }

      // Generate closing tag
      html += `</${component.type}>`;
      return html;
    } else {
      // Self-closing tag for components without children or content
      return `${indent}<${component.type}${propsString ? ' ' + propsString : ''}${componentIdAttr}${positioningAttributes} />`;
    }
  }, []);

  // Generate HTML for template output using pure absolute positioning
  const generateHTML = useCallback(() => {
    // Always use pure HTML generation system to ensure CSS injection works
    // even when no components are placed (important for theme/global settings)
    return generatePureHTMLOutput();
  }, [generatePureHTMLOutput]);

  // LEGACY HTML generation (kept for reference, will be removed)
  const generateLegacyHTML = useCallback(() => {
    if (placedComponents.length === 0) {
      return '<div class="template-empty">No components placed</div>';
    }

    // Get current breakpoint for responsive sizing
    const currentBreakpoint = getCurrentBreakpoint();

    // Separate components by positioning mode
    const absoluteComponents = placedComponents.filter(c => c.positioningMode === 'absolute');
    const gridComponents = placedComponents.filter(c => c.positioningMode === 'grid');

    // Generate absolute positioned components using recursive helper
    const absoluteHTML = absoluteComponents
      .map(component => generateComponentHTML(component))
      .join('\n');

    // Generate grid positioned components using recursive helper
    const gridHTML = gridComponents
      .map(component => generateComponentHTML(component))
      .join('\n');

    // Combine all components
    const allComponents = [absoluteHTML, gridHTML].filter(html => html.length > 0).join('\n');

    // Generate responsive container styling
    if (gridComponents.length > 0) {
      // Use responsive grid system
      const containerStyle = `width: 100%; max-width: 100vw; min-height: 100vh; display: grid; grid-template-columns: repeat(${currentBreakpoint.columns}, 1fr); gap: ${currentBreakpoint.gap}px; padding: ${currentBreakpoint.containerPadding}px; box-sizing: border-box;`;

      const finalHTML = `<div class="template-container grid-container responsive-grid" style="${containerStyle}">\n${allComponents}\n</div>`;
      return finalHTML;
    } else {
      // Absolute positioning container
      const containerStyle = `width: 100%; max-width: 100vw; min-height: 100vh; position: relative;`;
      const finalHTML = `<div class="template-container relative" style="${containerStyle}">\n${allComponents}\n</div>`;
      return finalHTML;
    }
  }, [placedComponents, gridConfig, generateComponentHTML]);


  // Call template change callback only when user makes actual changes
  // Store initial global settings for comparison (null if no template)
  const [initialGlobalSettingsState] = React.useState(() => {
    if (initialTemplate && initialTemplate.trim() !== '') {
      try {
        const parseResult = parseExistingTemplate(initialTemplate);
        return parseResult.globalSettings || null;
      } catch (error) {
        console.warn('[VisualTemplateBuilder] Failed to extract initial global settings:', error);
        return null;
      }
    }
    return null;
  });
  const initialGlobalSettingsRef = React.useRef(initialGlobalSettingsState);

  // Debounced template change function to prevent rapid-fire updates
  const debouncedTemplateChange = React.useCallback((html: string) => {
    // Clear any pending template change
    if (pendingTemplateChange.current) {
      clearTimeout(pendingTemplateChange.current);
    }

    // Debounce the template change call
    pendingTemplateChange.current = setTimeout(() => {
      if (onTemplateChange && html !== lastGeneratedHTML.current) {
        isInternalChange.current = true; // Mark as internal change
        lastGeneratedHTML.current = html;
        onTemplateChange(html);

        // Reset internal change flag after a short delay
        setTimeout(() => {
          isInternalChange.current = false;
        }, 100);
      }
    }, 150); // 150ms debounce
  }, [onTemplateChange]);

  // Store previous components for deep comparison to avoid unnecessary template generation
  const prevPlacedComponentsRef = useRef<ComponentItem[]>([]);

  React.useEffect(() => {
    // Ignore changes that are coming from our own onTemplateChange calls
    if (isInternalChange.current) {
      return;
    }

    // Use deep comparison to check if components have actually changed
    const componentsChanged = !deepEqualsComponentArray(placedComponents, prevPlacedComponentsRef.current);

    // Check if global settings have changed from initial state
    const globalSettingsChanged = JSON.stringify(globalSettings) !== JSON.stringify(initialGlobalSettingsRef.current);

    // Update the previous components reference only if components actually changed
    if (componentsChanged) {
      prevPlacedComponentsRef.current = [...placedComponents];
    }

    // Don't generate HTML on initial load if nothing has changed
    if (!hasUserMadeChanges && !componentsChanged && !globalSettingsChanged) {
      return;
    }

    // Mark that user has made changes once components or global settings differ from initial
    // Use functional update to avoid dependency issues
    if (!hasUserMadeChanges && (componentsChanged || globalSettingsChanged)) {
      setHasUserMadeChanges(prev => prev ? prev : true);
    }

    // Only call template change after user has made changes AND components actually changed
    if (hasUserMadeChanges && (componentsChanged || globalSettingsChanged)) {
      const html = generateHTML();
      debouncedTemplateChange(html);
    }
  }, [placedComponents, globalSettings, generateHTML, debouncedTemplateChange, hasUserMadeChanges]);

  // Enhanced keyboard shortcuts and accessibility
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if typing in input fields
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ctrl/Cmd + key combinations
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'z':
            event.preventDefault();
            if (event.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
          case 'y':
            event.preventDefault();
            redo();
            break;
          case 'd':
            event.preventDefault();
            if (selectedComponentIds.size > 0) {
              removeSelected();
            }
            break;
          case 'a':
            event.preventDefault();
            // Select all components
            placedComponents.forEach(comp => restCanvasState.selectComponent(comp.id, true));
            break;
        }
      }
      // Alt + key combinations for panel toggles
      else if (event.altKey) {
        switch (event.key) {
          case 'p':
            event.preventDefault();
            togglePanel('properties');
            break;
          case 'c':
            event.preventDefault();
            togglePanel('components');
            break;
          case 'g':
            event.preventDefault();
            setGridConfig({ showGrid: !gridConfig.showGrid });
            break;
        }
      }
      // Regular keys
      else {
        switch (event.key) {
          case 'Delete':
          case 'Backspace':
            if (selectedComponentIds.size > 0) {
              event.preventDefault();
              removeSelected();
            }
            break;
          case 'Escape':
            event.preventDefault();
            restCanvasState.clearSelection();
            break;
          case 'Tab':
            if (selectedComponentIds.size === 0 && placedComponents.length > 0) {
              event.preventDefault();
              restCanvasState.selectComponent(placedComponents[0].id);
            } else if (selectedComponentIds.size === 1) {
              event.preventDefault();
              const currentId = Array.from(selectedComponentIds)[0];
              const currentIndex = placedComponents.findIndex(comp => comp.id === currentId);
              const nextIndex = event.shiftKey
                ? (currentIndex - 1 + placedComponents.length) % placedComponents.length
                : (currentIndex + 1) % placedComponents.length;
              restCanvasState.selectComponent(placedComponents[nextIndex].id);
            }
            break;
        }

        // Arrow key nudging for selected components
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
          event.preventDefault();
          if (selectedComponentIds.size > 0) {
            const nudgeDistance = event.shiftKey ? 10 : 1;
            const dx = event.key === 'ArrowLeft' ? -nudgeDistance :
                      event.key === 'ArrowRight' ? nudgeDistance : 0;
            const dy = event.key === 'ArrowUp' ? -nudgeDistance :
                      event.key === 'ArrowDown' ? nudgeDistance : 0;

            selectedComponentIds.forEach(componentId => {
              const component = placedComponents.find(c => c.id === componentId);
              if (component && component.position) {
                updateComponent(componentId, {
                  position: {
                    x: Math.max(0, component.position.x + dx),
                    y: Math.max(0, component.position.y + dy)
                  }
                });
              }
            });
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    undo, redo, removeSelected, selectedComponentIds, placedComponents,
    updateComponent, restCanvasState.selectComponent, restCanvasState.clearSelection, togglePanel, setGridConfig
  ]);

  return (
    <div className={`flex flex-col bg-gray-50 ${className}`} style={{ height: '100vh', overflow: 'hidden' }}>
      {/* Global CSS for navigation components */}
      <style jsx global>{`
        /* Force full width for all navigation components */
        div[data-component-id*="threadsteadnavigation"],
        div[data-component-id*="ThreadsteadNavigation"] {
          width: 100% !important;
          min-width: 100% !important;
          height: auto !important;
          min-height: 70px !important;
          max-height: 100px !important;
          left: 0 !important;
        }
      `}</style>

      {/* Modern Smart Toolbar */}
      <SmartToolbar
        canvasState={canvasState}
        positioningMode={positioningMode}
        onPositioningModeChange={setPositioningMode}
        gridConfig={gridConfig}
        onGridConfigChange={setGridConfig}
        componentCount={placedComponents.length}
        selectedCount={selectedComponentIds.size}
        onToggleProperties={handleToggleProperties}
        onToggleComponents={handleToggleComponents}
        onToggleGlobal={handleToggleGlobal}
        showNavigation={showNavigation}
        onToggleNavigation={() => onNavigationToggle?.(!showNavigation)}
        onToggleGroups={handleToggleGroups}
        onToggleBulkEdit={handleToggleBulkEdit}
        isPropertiesOpen={isPanelOpen('properties')}
        isComponentsOpen={isPanelOpen('components')}
        isGlobalOpen={isPanelOpen('global')}
        isGroupsOpen={isPanelOpen('groups')}
        isBulkEditOpen={isPanelOpen('bulkEdit')}
        groupCount={componentGroups.length}
        onOpenTemplateGallery={() => setShowTemplateGallery(true)}
      />

      {/* Breakpoint Switcher */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <span style={{
          fontSize: '13px',
          fontWeight: '500',
          color: '#6b7280'
        }}>
          Preview:
        </span>
        <BreakpointSwitcher
          activeBreakpoint={activeBreakpoint}
          onBreakpointChange={setActiveBreakpoint}
        />
      </div>

      {/* Template Loading Status */}
      {templateLoadingState.loading && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
            <span>Loading existing template...</span>
          </div>
        </div>
      )}

      {templateLoadingState.error && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
          <div className="flex items-center gap-2 text-sm text-yellow-800">
            <span>⚠️</span>
            <span>{templateLoadingState.error}</span>
          </div>
        </div>
      )}

      {templateLoadingState.componentCount > 0 && !templateLoadingState.loading && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-2">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <span>✅</span>
            <span>Loaded {templateLoadingState.componentCount} component{templateLoadingState.componentCount !== 1 ? 's' : ''} from existing template</span>
            {templateLoadingState.warnings.length > 0 && (
              <span className="text-green-600 ml-2">
                ({templateLoadingState.warnings.length} warning{templateLoadingState.warnings.length !== 1 ? 's' : ''})
              </span>
            )}
          </div>
        </div>
      )}

      {/* Full-screen canvas experience with proper scrolling */}
      <div
        className="flex-1 bg-gray-50"
        style={{
          position: 'relative',
          overflow: 'auto',
          marginLeft: isPanelOpen('components') ? '350px' : '0', // Make space for fixed sidebar
        }}
      >
        <div
          className={`min-h-full flex items-start ${activeBreakpoint === 'desktop' ? '' : 'justify-center'}`}
          style={{ padding: activeBreakpoint === 'desktop' ? '24px 24px' : '24px' }}
        >
          <CanvasRenderer
            canvasState={canvasState}
            residentData={residentData}
            className="shadow-2xl rounded-xl border border-gray-200"
            activeBreakpoint={activeBreakpoint}
          />
        </div>
      </div>

      {/* Temporary: Simple inline panels for debugging */}
      {isPanelOpen('components') && (
        <div style={{
          position: 'fixed',
          top: '64px',
          left: '0',
          width: '350px',
          height: 'calc(100vh - 64px)',
          background: 'white',
          borderRight: '1px solid #e5e7eb',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            padding: '16px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>🧩 Components</h3>
            <button
              onClick={() => togglePanel('components')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <ComponentPalette canvasState={canvasState} />
          </div>
        </div>
      )}

      {isPanelOpen('properties') && (
        <div style={{
          position: 'fixed',
          top: '64px',
          right: '0',
          width: '380px',
          height: 'calc(100vh - 64px)',
          background: 'white',
          borderLeft: '1px solid #e5e7eb',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '16px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0
          }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>⚙️ Properties</h3>
            <button
              onClick={() => togglePanel('properties')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {selectedComponentForPanel && (
              <PropertyPanel
                selectedComponent={selectedComponentForPanel}
                canvasState={propertyPanelCanvasState}
                onComponentUpdate={handleComponentUpdate}
                activeBreakpoint={activeBreakpoint}
              />
            )}
          </div>
        </div>
      )}

      {/* Global Settings Panel */}
      {isPanelOpen('global') && (
        <div style={{
          position: 'fixed',
          top: '64px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '400px',
          height: 'calc(100vh - 64px)',
          background: 'white',
          borderLeft: '1px solid #e5e7eb',
          borderRight: '1px solid #e5e7eb',
          borderBottom: '1px solid #e5e7eb',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '16px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#f8fafc'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>🌐</span>
              <h3 style={{ margin: '0', fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                Global Settings
              </h3>
            </div>
            <button
              onClick={() => togglePanel('global')}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '18px',
                cursor: 'pointer',
                color: '#6b7280',
                padding: '4px',
                borderRadius: '4px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
                e.currentTarget.style.color = '#374151';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#6b7280';
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
            <GlobalSettingsPanel
              canvasState={canvasState}
              onGlobalSettingsChange={(settings) => {
                setGlobalSettings(settings);
                markUserChange();
              }}
            />
          </div>
        </div>
      )}

      {/* CSS Export Panel */}
      {isPanelOpen('cssExport') && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '20px',
          width: '400px',
          height: 'calc(100vh - 120px)',
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#374151' }}>
              Export CSS
            </h3>
            <button
              onClick={() => togglePanel('cssExport')}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '18px',
                cursor: 'pointer',
                color: '#6b7280',
                padding: '4px',
                borderRadius: '4px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
                e.currentTarget.style.color = '#374151';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#6b7280';
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
            <CSSExportPanel globalSettings={globalSettings} />
          </div>
        </div>
      )}

      {/* Group Panel */}
      {isPanelOpen('groups') && (
        <div style={{
          position: 'fixed',
          top: '64px',
          right: '400px', // Position to the left of properties panel
          width: '320px',
          height: 'calc(100vh - 64px)',
          background: 'white',
          borderLeft: '1px solid #e5e7eb',
          borderRight: '1px solid #e5e7eb',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            padding: '16px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>🗂️ Groups</h3>
            <button
              onClick={() => togglePanel('groups')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <GroupPanel
              componentGroups={componentGroups}
              selectedGroupId={selectedGroupId}
              selectedComponentIds={selectedComponentIds}
              placedComponents={placedComponents}
              onCreateGroup={createGroup}
              onUpdateGroup={updateGroup}
              onDeleteGroup={deleteGroup}
              onSelectGroup={selectGroup}
              onUngroupComponents={ungroupComponents}
              onRemoveComponentsFromGroup={removeComponentsFromGroup}
            />
          </div>
        </div>
      )}

      {/* Bulk Property Editor */}
      {isPanelOpen('bulkEdit') && selectedComponentIds.size > 1 && (
        <div style={{
          position: 'fixed',
          top: '64px',
          right: isPanelOpen('properties') ? '380px' : '0', // Position based on properties panel
          width: '350px',
          height: 'calc(100vh - 64px)',
          background: 'white',
          borderLeft: '1px solid #e5e7eb',
          zIndex: 998,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            padding: '16px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>🎛️ Bulk Edit</h3>
            <button
              onClick={() => togglePanel('bulkEdit')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <BulkPropertyEditor
              selectedComponents={placedComponents.filter(comp => selectedComponentIds.has(comp.id))}
              onComponentUpdate={updateComponent}
            />
          </div>
        </div>
      )}

      {/* Toggle buttons at screen edges */}
      {!isPanelOpen('components') && (
        <button
          onClick={() => togglePanel('components')}
          style={{
            position: 'fixed',
            top: '50%',
            left: '0',
            transform: 'translateY(-50%)',
            width: '32px',
            height: '64px',
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '0 8px 8px 0',
            cursor: 'pointer',
            zIndex: 1001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px'
          }}
        >
          🧩
        </button>
      )}

      {!isPanelOpen('properties') && (
        <button
          onClick={() => togglePanel('properties')}
          style={{
            position: 'fixed',
            top: '50%',
            right: '0',
            transform: 'translateY(-50%)',
            width: '32px',
            height: '64px',
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px 0 0 8px',
            cursor: 'pointer',
            zIndex: 1001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px'
          }}
        >
          ⚙️
        </button>
      )}

      {!isPanelOpen('global') && (
        <button
          onClick={() => togglePanel('global')}
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '48px',
            height: '48px',
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '50%',
            cursor: 'pointer',
            zIndex: 1001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateX(-50%) scale(1.05)';
            e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateX(-50%) scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
          }}
          title="Global Settings"
        >
          🌐
        </button>
      )}

      {!isPanelOpen('cssExport') && (
        <button
          onClick={() => togglePanel('cssExport')}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '48px',
            height: '48px',
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '50%',
            cursor: 'pointer',
            zIndex: 1001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
          }}
          title="Export CSS"
        >
          📄
        </button>
      )}

      {/* Template Gallery Modal */}
      {showTemplateGallery && (
        <TemplateGallery
          onSelectTemplate={handleTemplateSelect}
          onClose={() => setShowTemplateGallery(false)}
        />
      )}

    </div>
  );
}