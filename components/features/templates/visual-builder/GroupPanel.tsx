/**
 * GroupPanel - UI for managing component groups
 * Allows users to create, edit, and manage groups of components
 */

import React, { useState, useCallback, useMemo } from 'react';
import type { ComponentGroup, ComponentItem } from '@/hooks/useCanvasState';

interface GroupPanelProps {
  componentGroups: ComponentGroup[];
  selectedGroupId: string | null;
  selectedComponentIds: Set<string>;
  placedComponents: ComponentItem[];
  onCreateGroup: (name: string, componentIds: string[], color?: string) => void;
  onUpdateGroup: (groupId: string, updates: Partial<ComponentGroup>) => void;
  onDeleteGroup: (groupId: string) => void;
  onSelectGroup: (groupId: string) => void;
  onUngroupComponents: (groupId: string) => void;
  onRemoveComponentsFromGroup: (componentIds: string[]) => void;
  className?: string;
  style?: React.CSSProperties;
}

const DEFAULT_GROUP_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

/**
 * Group Panel Component
 */
export default function GroupPanel({
  componentGroups,
  selectedGroupId,
  selectedComponentIds,
  placedComponents,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
  onSelectGroup,
  onUngroupComponents,
  onRemoveComponentsFromGroup,
  className = '',
  style = {},
}: GroupPanelProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedColor, setSelectedColor] = useState(DEFAULT_GROUP_COLORS[0]);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Check if we can create a group (need at least 2 selected components)
  const canCreateGroup = useMemo(() => {
    return selectedComponentIds.size >= 2;
  }, [selectedComponentIds.size]);

  // Get components that are not in any group
  const ungroupedComponents = useMemo(() => {
    return placedComponents.filter(comp => !comp.visualBuilderState?.groupId);
  }, [placedComponents]);

  // Handle creating a new group
  const handleCreateGroup = useCallback(() => {
    if (!canCreateGroup || !newGroupName.trim()) return;

    const selectedIds = Array.from(selectedComponentIds);
    onCreateGroup(newGroupName.trim(), selectedIds, selectedColor);

    // Reset form
    setNewGroupName('');
    setSelectedColor(DEFAULT_GROUP_COLORS[0]);
    setShowCreateForm(false);
  }, [canCreateGroup, newGroupName, selectedComponentIds, selectedColor, onCreateGroup]);

  // Handle editing group name
  const startEditingGroup = useCallback((group: ComponentGroup) => {
    setEditingGroupId(group.id);
    setEditingName(group.name);
  }, []);

  const handleSaveGroupName = useCallback((groupId: string) => {
    if (editingName.trim()) {
      onUpdateGroup(groupId, { name: editingName.trim() });
    }
    setEditingGroupId(null);
    setEditingName('');
  }, [editingName, onUpdateGroup]);

  // Get component names for display
  const getComponentNames = useCallback((componentIds: string[]) => {
    return componentIds
      .map(id => {
        const comp = placedComponents.find(c => c.id === id);
        return comp ? comp.type : 'Unknown';
      })
      .join(', ');
  }, [placedComponents]);

  // Sort groups by creation date (newest first)
  const sortedGroups = useMemo(() => {
    return [...componentGroups].sort((a, b) => b.createdAt - a.createdAt);
  }, [componentGroups]);

  return (
    <div className={`bg-white border-l border-gray-200 ${className}`} style={style}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-blue-50">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <span>🗂️</span>
          Component Groups
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Organize components into groups for easier management
        </p>
      </div>

      {/* Create Group Section */}
      <div className="p-4 border-b border-gray-100 bg-gray-50">
        {!showCreateForm ? (
          <button
            onClick={() => setShowCreateForm(true)}
            disabled={!canCreateGroup}
            className={`w-full px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
              canCreateGroup
                ? 'bg-blue-500 text-white border-blue-500 hover:bg-blue-600'
                : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
            }`}
          >
            {canCreateGroup
              ? `Create Group from ${selectedComponentIds.size} Selected`
              : 'Select 2+ Components to Group'
            }
          </button>
        ) : (
          <div className="space-y-3">
            {/* Group Name Input */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Group Name
              </label>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Enter group name..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
            </div>

            {/* Color Selection */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Group Color
              </label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_GROUP_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`w-6 h-6 rounded border-2 transition-transform ${
                      selectedColor === color
                        ? 'border-gray-800 scale-110'
                        : 'border-gray-300 hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim()}
                className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-500 rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Create Group
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewGroupName('');
                  setSelectedColor(DEFAULT_GROUP_COLORS[0]);
                }}
                className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Groups List */}
      <div className="flex-1 overflow-y-auto">
        {sortedGroups.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <div className="text-4xl mb-3">📁</div>
            <h4 className="text-lg font-semibold mb-2">No Groups Yet</h4>
            <p className="text-sm">
              Select multiple components and click &quot;Create Group&quot; to organize them.
            </p>
          </div>
        ) : (
          <div className="space-y-2 p-4">
            {sortedGroups.map(group => (
              <div
                key={group.id}
                className={`p-3 rounded-lg border transition-all cursor-pointer ${
                  selectedGroupId === group.id
                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => onSelectGroup(group.id)}
              >
                {/* Group Header */}
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-3 h-3 rounded-full border border-gray-300"
                    style={{ backgroundColor: group.color }}
                  />
                  {editingGroupId === group.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveGroupName(group.id);
                          if (e.key === 'Escape') {
                            setEditingGroupId(null);
                            setEditingName('');
                          }
                        }}
                        onBlur={() => handleSaveGroupName(group.id)}
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-between">
                      <span className="font-medium text-gray-800">{group.name}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditingGroup(group);
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600 rounded"
                          title="Rename group"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onUngroupComponents(group.id);
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600 rounded"
                          title="Ungroup components"
                        >
                          🔓
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteGroup(group.id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-500 rounded"
                          title="Delete group"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Group Info */}
                <div className="text-xs text-gray-600 space-y-1">
                  <div>
                    <span className="font-medium">{group.componentIds.length} components:</span>
                  </div>
                  <div className="text-gray-500 truncate">
                    {getComponentNames(group.componentIds)}
                  </div>
                  <div className="flex items-center gap-4 pt-1">
                    <span className={`inline-flex items-center gap-1 ${
                      group.visible ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      {group.visible ? '👁️' : '🙈'} {group.visible ? 'Visible' : 'Hidden'}
                    </span>
                    <span className={`inline-flex items-center gap-1 ${
                      group.locked ? 'text-orange-600' : 'text-gray-400'
                    }`}>
                      {group.locked ? '🔒' : '🔓'} {group.locked ? 'Locked' : 'Unlocked'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-gray-100 bg-gray-50">
        <div className="text-xs text-gray-500 space-y-1">
          <div>
            📊 {componentGroups.length} groups, {ungroupedComponents.length} ungrouped components
          </div>
          {selectedGroupId && (
            <div className="text-blue-600">
              🎯 Selected: {componentGroups.find(g => g.id === selectedGroupId)?.name}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}