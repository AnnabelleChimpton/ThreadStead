/**
 * Visual indicators for components in the canvas
 * Shows constraints, type, sizing behavior, groups, children count, positioning mode, selection, and drag state
 */

import React from 'react';
import type { ComponentItem } from '@/hooks/useCanvasState';
import type { MeasuredDimensions } from '../../ResizableComponent';
import { getComponentConstraints } from '../utils/component-constraints';
import { isContainerComponent, isTextComponent } from '../utils/component-type-checkers';

interface ComponentIndicatorsProps {
  component: ComponentItem;
  isSelected: boolean;
  isDragging: boolean;
  componentDimensions: Map<string, MeasuredDimensions>;
  hoveredComponentId: string | null;
  getComponentGroup: (componentId: string) => { name: string; color: string; id: string } | null;
  getCSSProp: (key: string) => any;
}

export default function ComponentIndicators({
  component,
  isSelected,
  isDragging,
  componentDimensions,
  hoveredComponentId,
  getComponentGroup,
  getCSSProp,
}: ComponentIndicatorsProps) {
  return (
    <>
      {/* Component constraint indicators */}
      {(() => {
        const constraints = getComponentConstraints(component.type);
        if (!constraints.canResize && isSelected) {
          return (
            <div
              className="absolute -top-6 left-0 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-md shadow-sm z-50 pointer-events-none"
              style={{
                fontSize: '11px',
                fontWeight: '500',
                whiteSpace: 'nowrap'
              }}
            >
              🔒 {constraints.description}
            </div>
          );
        }
        return null;
      })()}

      {/* Container indicator for components that can accept children */}
      {isContainerComponent(component.type) && (
        <div className={`absolute -top-2 -left-2 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold z-10 border-2 border-white shadow-sm transition-all ${
          isDragging ? 'bg-blue-500 animate-pulse' : 'bg-blue-600'
        }`}>
          📦
        </div>
      )}

      {/* Text component indicator for editable text elements */}
      {isTextComponent(component.type) && (
        <div className={`absolute -top-2 -left-2 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold z-10 border-2 border-white shadow-sm transition-all ${
          isDragging ? 'bg-green-500 animate-pulse' : isSelected ? 'bg-green-600' : 'bg-green-500 opacity-70'
        }`}>
          📝
        </div>
      )}

      {/* Sizing behavior indicator */}
      {(() => {
        const componentType = component.type.toLowerCase();

        // Match the categorization logic from AdvancedProfileRenderer
        const containerFillers = [
          'gradientbox', 'stickynote', 'retroterminal', 'polaroidframe',
          'centeredbox', 'neonborder', 'revealbox', 'floatingbadge'
        ];

        const contentDriven = [
          'textelement', 'paragraph', 'contactcard', 'progresstracker',
          'bio', 'blogposts', 'guestbook', 'tabs'
        ];

        const autoSize = [
          'profilephoto', 'displayname', 'followbutton', 'mutualfriends',
          'friendbadge', 'userimage', 'mediagrid'
        ];

        let sizingInfo = null;

        if (containerFillers.includes(componentType)) {
          sizingInfo = { emoji: '📐', color: 'bg-orange-500', label: 'Fixed size' };
        } else if (contentDriven.includes(componentType)) {
          sizingInfo = { emoji: '📏', color: 'bg-purple-500', label: 'Expands with content' };
        } else if (autoSize.includes(componentType)) {
          sizingInfo = { emoji: '⚖️', color: 'bg-blue-500', label: 'Smart sizing' };
        }

        return sizingInfo && isSelected ? (
          <div
            className={`absolute -bottom-2 -left-2 ${sizingInfo.color} text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold z-10 border-2 border-white shadow-sm`}
            title={sizingInfo.label}
          >
            {sizingInfo.emoji}
          </div>
        ) : null;
      })()}

      {/* Group indicator */}
      {(() => {
        const group = getComponentGroup(component.id);
        if (!group) return null;

        return (
          <div
            className="absolute -top-2 -right-2 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold z-10 border-2 border-white shadow-sm"
            style={{ backgroundColor: group.color }}
            title={`Group: ${group.name}`}
          >
            🗂️
          </div>
        );
      })()}

      {/* Simple visual indicator for children count */}
      {component.children && component.children.length > 0 && (
        <div className="absolute -top-2 right-6 bg-purple-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold z-10">
          {component.children.length}
        </div>
      )}

      {/* Positioning mode indicator (Phase 4.1) */}
      {isSelected && (() => {
        const positionMode = getCSSProp('position');
        const zIndex = getCSSProp('zIndex');

        // Only show indicator for non-default positioning
        if (!positionMode || positionMode === 'static') return null;

        const positionInfo: Record<string, { emoji: string; color: string; label: string }> = {
          'relative': { emoji: '↔️', color: 'bg-indigo-500', label: 'Relative positioning' },
          'absolute': { emoji: '📍', color: 'bg-red-500', label: 'Absolute positioning' },
          'fixed': { emoji: '📌', color: 'bg-pink-500', label: 'Fixed positioning (shown as absolute in editor)' },
          'sticky': { emoji: '📎', color: 'bg-yellow-500', label: 'Sticky positioning' }
        };

        const info = positionInfo[positionMode as string];
        if (!info) return null;

        return (
          <div
            className={`absolute -bottom-2 -right-2 ${info.color} text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold z-10 border-2 border-white shadow-sm`}
            title={`${info.label}${zIndex !== undefined ? ` • z-index: ${zIndex}` : ''}`}
          >
            {info.emoji}
          </div>
        );
      })()}

      {/* Selection indicator - positioned to wrap actual component content */}
      {isSelected && (() => {
        const measuredDims = componentDimensions.get(component.id);

        // Use measured dimensions if available, otherwise fallback to container sizing
        const selectorStyle = measuredDims ? {
          left: measuredDims.offsetX - 2,
          top: measuredDims.offsetY - 2,
          width: measuredDims.width + 4,
          height: measuredDims.height + 4
        } : {
          left: -2,
          top: -2,
          width: 'calc(100% + 4px)',
          height: 'calc(100% + 4px)'
        };

        return (
          <div
            className="absolute border-2 border-blue-500 border-dashed rounded pointer-events-none z-20"
            style={selectorStyle}
          >
            <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 rounded-full" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-500 rounded-full" />
            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
          </div>
        );
      })()}

      {/* Drag indicator */}
      {isDragging && (() => {
        const measuredDims = componentDimensions.get(component.id);

        // Use measured dimensions if available, otherwise fallback to container sizing
        const dragStyle = measuredDims ? {
          left: measuredDims.offsetX - 2,
          top: measuredDims.offsetY - 2,
          width: measuredDims.width + 4,
          height: measuredDims.height + 4
        } : {
          left: -2,
          top: -2,
          width: 'calc(100% + 4px)',
          height: 'calc(100% + 4px)'
        };

        return (
          <div
            className="absolute bg-blue-100 border-2 border-blue-300 border-dashed rounded pointer-events-none opacity-50 z-10"
            style={dragStyle}
          />
        );
      })()}
    </>
  );
}
