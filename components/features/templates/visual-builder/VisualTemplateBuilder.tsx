/**
 * VISUAL_BUILDER_PROGRESS: Main Visual Template Builder Component - Simplified Pixel Homes Pattern
 * Phase 1: Visual Builder Foundation - Direct State Management
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useCanvasState, type ComponentItem } from '@/hooks/useCanvasState';
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider';
import {
  getOptimalSpan,
  getCurrentBreakpoint,
  GRID_BREAKPOINTS,
  type GridBreakpoint
} from '@/lib/templates/visual-builder/grid-utils';
import type { CanvasComponent } from '@/lib/templates/visual-builder/types';
import { parseExistingTemplate } from '@/lib/templates/visual-builder/template-parser-reverse';

// Component imports
import ComponentPalette from './ComponentPalette';
import CanvasRenderer from './CanvasRenderer';
import PropertyPanel from './PropertyPanel';

interface VisualTemplateBuilderProps {
  initialTemplate?: string;
  onTemplateChange?: (html: string) => void;
  residentData?: ResidentData;
  className?: string;
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
}: VisualTemplateBuilderProps) {
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

  // Parse initial template into components
  const initialComponents = useMemo(() => {
    if (!initialTemplate || initialTemplate.trim() === '') {
      setTemplateLoadingState({
        loading: false,
        error: null,
        warnings: [],
        componentCount: 0,
      });
      return [];
    }

    setTemplateLoadingState(prev => ({ ...prev, loading: true, error: null }));

    try {
      console.log('Parsing initial template:', initialTemplate.substring(0, 200) + '...');

      // Parse the HTML template using existing parser
      const parseResult = parseExistingTemplate(initialTemplate);

      // Convert CanvasComponent format to ComponentItem format
      const convertedComponents: ComponentItem[] = parseResult.canvasState.components.map(canvasComp => {
        const componentItem: ComponentItem = {
          id: canvasComp.id,
          type: canvasComp.type,
          position: canvasComp.position || { x: 0, y: 0 },
          positioningMode: (canvasComp.positioningMode === 'flow' ? 'grid' : canvasComp.positioningMode) || 'grid',
          props: canvasComp.props || {},
        };

        // Add grid position if available
        if (canvasComp.gridPosition) {
          componentItem.gridPosition = {
            column: canvasComp.gridPosition.column,
            row: canvasComp.gridPosition.row,
            span: canvasComp.gridPosition.columnSpan || 1,
          };
        }

        // Add children if available
        if (canvasComp.children && canvasComp.children.length > 0) {
          componentItem.children = canvasComp.children.map(child => ({
            id: child.id,
            type: child.type,
            position: child.position || { x: 0, y: 0 },
            positioningMode: (child.positioningMode === 'flow' ? 'grid' : child.positioningMode) || 'grid',
            props: child.props || {},
            gridPosition: child.gridPosition ? {
              column: child.gridPosition.column,
              row: child.gridPosition.row,
              span: child.gridPosition.columnSpan || 1,
            } : undefined,
          }));
        }

        return componentItem;
      });

      console.log(`Successfully parsed ${convertedComponents.length} components from initial template:`);
      convertedComponents.forEach((comp, index) => {
        console.log(`  ${index + 1}. ${comp.type} at grid(${comp.gridPosition?.column || '?'}, ${comp.gridPosition?.row || '?'}, span=${comp.gridPosition?.span || '?'}) pixel(${comp.position.x}, ${comp.position.y}) mode=${comp.positioningMode}`);
        console.log(`    Full gridPosition:`, comp.gridPosition);
        console.log(`    Props:`, comp.props);
      });

      console.log('📋 Full component details for debugging:', JSON.stringify(convertedComponents, null, 2));

      setTemplateLoadingState({
        loading: false,
        error: null,
        warnings: parseResult.warnings,
        componentCount: convertedComponents.length,
      });

      return convertedComponents;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error';
      console.error('Failed to parse initial template:', error);

      setTemplateLoadingState({
        loading: false,
        error: `Failed to load existing template: ${errorMessage}. Starting with empty canvas.`,
        warnings: [],
        componentCount: 0,
      });

      // Return empty array if parsing fails - user can start fresh
      return [];
    }
  }, [initialTemplate]);

  // Simplified canvas state management with initial components
  const originalCanvasState = useCanvasState(initialComponents);
  const [showProperties, setShowProperties] = useState(false);
  const [showComponentPalette, setShowComponentPalette] = useState(true);

  // Breakpoint preview controls
  const [previewBreakpoint, setPreviewBreakpoint] = useState<string | null>(null);
  const currentBreakpoint = getCurrentBreakpoint();
  const effectiveBreakpoint = previewBreakpoint || currentBreakpoint.name;

  // Track if user has made changes to prevent overwriting original template
  const [hasUserMadeChanges, setHasUserMadeChanges] = React.useState(false);

  // Store initial components for deep comparison to detect user changes
  const initialComponentsRef = React.useRef(initialComponents);
  const initialComponentCount = React.useRef(initialComponents.length);

  const {
    placedComponents,
    selectedComponentIds,
    gridConfig,
    positioningMode,
    setPositioningMode,
    setGridConfig,
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

  // Helper function to compare if components have actually changed
  const componentsAreEqual = useCallback((components1: ComponentItem[], components2: ComponentItem[]): boolean => {
    if (components1.length !== components2.length) {
      console.log('[VisualTemplateBuilder] Component count changed:', components1.length, '→', components2.length);
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
        console.log(`[VisualTemplateBuilder] Component ${i} (${comp1.type}) changed:`, {
          typeChanged, positioningModeChanged, gridPositionChanged, pixelPositionChanged, propsChanged, childrenChanged
        });
        return false;
      }
    }

    return true;
  }, []);

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

  // Create modified canvas state with wrapped functions
  const canvasState = {
    ...restCanvasState,
    placedComponents,
    selectedComponentIds,
    gridConfig,
    positioningMode,
    setPositioningMode,
    setGridConfig,
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

  // Get the first selected component for property editing and map to CanvasComponent format
  const selectedComponent: CanvasComponent | null = selectedComponentIds.size === 1
    ? (() => {
        const selectedId = Array.from(selectedComponentIds)[0];
        const comp = findComponentById(placedComponents, selectedId);
        if (!comp) return null;
        return {
          id: comp.id,
          type: comp.type,
          props: comp.props || {},  // All properties including _size, _locked, _hidden
          position: comp.position,
          gridPosition: comp.gridPosition ? {
            column: comp.gridPosition.column,
            row: comp.gridPosition.row,
            columnSpan: comp.gridPosition.span,
            rowSpan: 1
          } : undefined,
          positioningMode: comp.positioningMode,
          children: comp.children as CanvasComponent[] | undefined  // Include children for parent-child relationships
        };
      })()
    : null;

  // Handle component property updates
  const handleComponentUpdate = useCallback((componentId: string, updates: Partial<CanvasComponent>) => {
    markUserChange(); // Mark that user made a change

    // Map CanvasComponent updates to ComponentItem format
    // Only include fields that are actually being updated (not undefined)
    const mappedUpdates: Partial<ComponentItem> = {};

    if (updates.id !== undefined) mappedUpdates.id = updates.id;
    if (updates.type !== undefined) mappedUpdates.type = updates.type;
    if (updates.props !== undefined) mappedUpdates.props = updates.props;
    if (updates.position !== undefined) mappedUpdates.position = updates.position;
    if (updates.positioningMode !== undefined) {
      mappedUpdates.positioningMode = updates.positioningMode === 'flow' ? 'absolute' : updates.positioningMode;
    }
    if (updates.gridPosition !== undefined) {
      mappedUpdates.gridPosition = {
        column: updates.gridPosition.column,
        row: updates.gridPosition.row,
        span: updates.gridPosition.columnSpan || 1
      };
    }
    updateComponent(componentId, mappedUpdates);
  }, [updateComponent, markUserChange]);

  // Helper function to generate HTML for a single component and its children
  const generateComponentHTML = useCallback((component: ComponentItem, indent: string = '  ', isChild: boolean = false): string => {
    const props = component.props || {};

    // Enhanced prop handling with special treatment for sizing
    const propsString = Object.entries(props)
      .filter(([key, value]) => value !== undefined && value !== null)
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
    let positioningAttributes = '';
    if (!isChild && component.positioningMode === 'absolute') {
      const positionData = JSON.stringify({
        x: component.position.x,
        y: component.position.y,
        positioning: 'absolute'
      });
      positioningAttributes = ` data-position="${component.position.x},${component.position.y}" data-pixel-position='${positionData}' data-positioning-mode="absolute"`;
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

    // Check if component has children
    const hasChildren = component.children && component.children.length > 0;

    if (hasChildren) {
      // Generate opening tag
      let html = `${indent}<${component.type}${propsString ? ' ' + propsString : ''}${componentIdAttr}${positioningAttributes}>\n`;

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

      // Generate closing tag
      html += `${indent}</${component.type}>`;
      return html;
    } else {
      // Self-closing tag for components without children
      return `${indent}<${component.type}${propsString ? ' ' + propsString : ''}${componentIdAttr}${positioningAttributes} />`;
    }
  }, []);

  // Generate HTML for template output with enhanced responsive grid and auto-spanning
  const generateHTML = useCallback(() => {
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
  React.useEffect(() => {
    // Check if components have actually changed from the initial state
    const componentsChanged = !componentsAreEqual(placedComponents, initialComponentsRef.current);

    // Don't generate HTML on initial load if components haven't changed
    if (!hasUserMadeChanges && !componentsChanged) {
      console.log('[VisualTemplateBuilder] No component changes detected, preserving original template');
      return;
    }

    // Mark that user has made changes once components differ from initial
    if (!hasUserMadeChanges && componentsChanged) {
      console.log('[VisualTemplateBuilder] Component changes detected, marking as user change');
      setHasUserMadeChanges(true);
    }

    // Only call template change after user has made changes
    if (onTemplateChange && hasUserMadeChanges) {
      console.log('[VisualTemplateBuilder] Generating new HTML template due to user changes');
      const html = generateHTML();
      onTemplateChange(html);
    }
  }, [placedComponents, onTemplateChange, generateHTML, hasUserMadeChanges, componentsAreEqual]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

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
        }
      }

      switch (event.key) {
        case 'Delete':
        case 'Backspace':
          if (selectedComponentIds.size > 0) {
            event.preventDefault();
            removeSelected();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, removeSelected, selectedComponentIds.size]);

  return (
    <div className={`flex flex-col bg-gray-50 ${className}`} style={{ height: '100vh', overflow: 'hidden' }}>
      {/* Compact top toolbar */}
      <div className="flex items-center justify-between bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900">Visual Template Builder</h2>
          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
            Simplified Edition
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Statistics */}
          <div className="text-sm text-gray-600 mr-4">
            {placedComponents.length} component{placedComponents.length !== 1 ? 's' : ''}
            {selectedComponentIds.size > 0 && (
              <span className="text-blue-600 ml-2">
                ({selectedComponentIds.size} selected)
              </span>
            )}
          </div>

          {/* Grid/Positioning controls */}
          <div className="flex items-center gap-2 mr-4 border-r border-gray-200 pr-4">
            <span className="text-sm text-gray-600">Mode:</span>
            <button
              onClick={() => setPositioningMode('absolute')}
              className={`px-3 py-1 text-sm border rounded ${
                positioningMode === 'absolute'
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
              title="Absolute positioning (pixel-perfect)"
            >
              🎯 Absolute
            </button>
            <button
              onClick={() => {
                setPositioningMode('grid');
                setGridConfig({ enabled: true, showGrid: true });
              }}
              className={`px-3 py-1 text-sm border rounded ${
                positioningMode === 'grid'
                  ? 'bg-green-500 text-white border-green-500'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
              title="Grid positioning (responsive)"
            >
              📐 Grid
            </button>
            {positioningMode === 'grid' && (
              <>
                <button
                  onClick={() => setGridConfig({ showGrid: !gridConfig.showGrid })}
                  className={`px-2 py-1 text-xs border rounded ${
                    gridConfig.showGrid
                      ? 'bg-gray-200 text-gray-700 border-gray-300'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                  title="Toggle grid visibility"
                >
                  {gridConfig.showGrid ? '👁️' : '👁️‍🗨️'}
                </button>
                <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {(() => {
                    const breakpoint = getCurrentBreakpoint();
                    return `${breakpoint.name}: ${breakpoint.columns}cols`;
                  })()}
                </div>
              </>
            )}
          </div>

          {/* Breakpoint Preview Controls */}
          <div className="flex items-center gap-2 mr-4 border-r border-gray-200 pr-4">
            <span className="text-sm text-gray-600">Preview:</span>
            {GRID_BREAKPOINTS.map(bp => (
              <button
                key={bp.name}
                onClick={() => setPreviewBreakpoint(previewBreakpoint === bp.name ? null : bp.name)}
                className={`px-2 py-1 text-xs border rounded transition-colors ${
                  (previewBreakpoint === bp.name) || (!previewBreakpoint && bp.name === currentBreakpoint.name)
                    ? 'bg-purple-500 text-white border-purple-500'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
                title={`Preview ${bp.name} (${bp.columns} columns, ${bp.minWidth}px+)`}
              >
                {bp.name === 'mobile' ? '📱' : bp.name === 'tablet' ? '📱' : '💻'} {bp.name}
              </button>
            ))}
            {previewBreakpoint && (
              <button
                onClick={() => setPreviewBreakpoint(null)}
                className="px-2 py-1 text-xs bg-gray-200 text-gray-700 border border-gray-300 rounded hover:bg-gray-300"
                title="Reset to current screen size"
              >
                ↻
              </button>
            )}
          </div>

          {/* History controls */}
          <button
            onClick={undo}
            disabled={!canUndo}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Undo (Ctrl+Z)"
          >
            ↶ Undo
          </button>

          <button
            onClick={redo}
            disabled={!canRedo}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Redo (Ctrl+Y)"
          >
            ↷ Redo
          </button>

          {/* Actions */}
          <button
            onClick={removeSelected}
            disabled={selectedComponentIds.size === 0}
            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Delete Selected (Del)"
          >
            🗑️ Delete
          </button>

          <button
            onClick={resetCanvas}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
            title="Clear Canvas"
          >
            🔄 Reset
          </button>

          <button
            onClick={() => setShowProperties(!showProperties)}
            className={`px-3 py-1 text-sm border rounded transition-colors ${
              showProperties
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            ⚙️ Properties
          </button>

          <button
            onClick={() => setShowComponentPalette(!showComponentPalette)}
            className={`px-3 py-1 text-sm border rounded transition-colors ${
              showComponentPalette
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-300 hover:bg-gray-50'
            }`}
            title="Toggle component palette"
          >
            🧩 {showComponentPalette ? 'Hide' : 'Show'} Components
          </button>
        </div>
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

      {/* Main content area - maximize vertical space */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Canvas area with proper scrolling */}
        <div className="flex-1 bg-gray-100 p-4" style={{ height: '100%', overflow: 'auto' }}>
          <div className="flex justify-center">
            <CanvasRenderer
              canvasState={canvasState}
              residentData={residentData}
              className="shadow-lg rounded-lg"
              previewBreakpoint={previewBreakpoint}
            />
          </div>
        </div>

        {/* Properties panel */}
        {showProperties && (
          <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
            <PropertyPanel
              selectedComponent={selectedComponent}
              canvasState={canvasState}
              onComponentUpdate={handleComponentUpdate}
              className="h-full"
            />
          </div>
        )}
      </div>

      {/* Collapsible component palette */}
      {showComponentPalette && (
        <ComponentPalette
          canvasState={canvasState}
          className="h-48 flex-shrink-0"
        />
      )}

      {/* Compact status bar */}
      <div className="bg-white border-t border-gray-200 px-4 py-1">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <span>Ready for component placement</span>
            {placedComponents.length > 0 && (
              <span>• Drag components to reposition • Click to select</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span>Simplified Builder v1.0</span>
            <div className="w-2 h-2 bg-green-500 rounded-full" title="System Ready" />
          </div>
        </div>
      </div>
    </div>
  );
}