import React, { useState, useEffect } from 'react';
import { BADGE_TEMPLATES } from '@/lib/threadring-badges';
import ThreadRing88x31Badge from './ThreadRing88x31Badge';

interface BadgeSelectorProps {
  threadRingName: string;
  onBadgeChange: (badgeData: {
    templateId?: string;
    backgroundColor?: string;
    textColor?: string;
    title?: string;
    subtitle?: string;
  }) => void;
  initialBadge?: {
    templateId?: string;
    backgroundColor?: string;
    textColor?: string;
    title?: string;
    subtitle?: string;
  };
  compact?: boolean;
}

export default function BadgeSelector({
  threadRingName,
  onBadgeChange,
  initialBadge,
  compact = false
}: BadgeSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | undefined>(
    initialBadge?.templateId || 'classic_blue'
  );
  const [customColors, setCustomColors] = useState({
    backgroundColor: initialBadge?.backgroundColor || '#4A90E2',
    textColor: initialBadge?.textColor || '#FFFFFF'
  });
  const [badgeText, setBadgeText] = useState({
    title: initialBadge?.title || threadRingName,
    subtitle: initialBadge?.subtitle || ''
  });
  const [mode, setMode] = useState<'template' | 'custom'>('template');

  // Update badge text when threadRingName changes
  useEffect(() => {
    setBadgeText(prev => ({
      ...prev,
      title: prev.title === threadRingName ? threadRingName : prev.title || threadRingName
    }));
  }, [threadRingName]);

  // Notify parent of changes
  useEffect(() => {
    if (mode === 'template' && selectedTemplate) {
      onBadgeChange({
        templateId: selectedTemplate,
        title: badgeText.title,
        subtitle: badgeText.subtitle
      });
    } else {
      onBadgeChange({
        backgroundColor: customColors.backgroundColor,
        textColor: customColors.textColor,
        title: badgeText.title,
        subtitle: badgeText.subtitle
      });
    }
  }, [mode, selectedTemplate, customColors, badgeText, onBadgeChange]);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    setMode('template');
  };

  const handleCustomColorChange = (field: 'backgroundColor' | 'textColor', value: string) => {
    setCustomColors(prev => ({
      ...prev,
      [field]: value
    }));
    setMode('custom');
  };

  const getCurrentBadgeProps = () => {
    if (mode === 'template' && selectedTemplate) {
      return {
        templateId: selectedTemplate,
        title: badgeText.title,
        subtitle: badgeText.subtitle
      };
    } else {
      return {
        backgroundColor: customColors.backgroundColor,
        textColor: customColors.textColor,
        title: badgeText.title,
        subtitle: badgeText.subtitle
      };
    }
  };

  if (compact) {
    return (
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-2">
            88x31 Badge Preview:
          </label>
          <div className="flex items-center gap-3">
            <ThreadRing88x31Badge {...getCurrentBadgeProps()} />
            <div className="text-xs text-gray-600">
              <p>Classic webring badge</p>
              <p>Customize after creation</p>
            </div>
          </div>
        </div>

        {/* Quick template selector */}
        <div>
          <label className="block text-sm font-medium mb-1">Style:</label>
          <select
            value={selectedTemplate || 'custom'}
            onChange={(e) => {
              if (e.target.value === 'custom') {
                setMode('custom');
              } else {
                handleTemplateSelect(e.target.value);
              }
            }}
            className="w-full border border-black p-2 bg-white text-sm"
          >
            {BADGE_TEMPLATES.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
            <option value="custom">Custom Colors</option>
          </select>
        </div>

        {mode === 'custom' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium mb-1">Background:</label>
              <input
                type="color"
                value={customColors.backgroundColor}
                onChange={(e) => handleCustomColorChange('backgroundColor', e.target.value)}
                className="w-full h-8 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Text:</label>
              <input
                type="color"
                value={customColors.textColor}
                onChange={(e) => handleCustomColorChange('textColor', e.target.value)}
                className="w-full h-8 border border-gray-300 rounded"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full badge selector
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          88x31 Webring Badge
        </label>
        <div className="flex items-center gap-4 mb-3">
          <ThreadRing88x31Badge {...getCurrentBadgeProps()} />
          <div className="text-sm text-gray-600">
            <p>This classic webring badge will represent your ThreadRing</p>
            <p>Members can use it to link back to your community</p>
          </div>
        </div>
      </div>

      {/* Mode Selection */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('template')}
          className={`px-3 py-2 text-sm rounded border ${
            mode === 'template' 
              ? 'bg-blue-500 text-white border-blue-500' 
              : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
          }`}
        >
          Use Template
        </button>
        <button
          type="button"
          onClick={() => setMode('custom')}
          className={`px-3 py-2 text-sm rounded border ${
            mode === 'custom' 
              ? 'bg-blue-500 text-white border-blue-500' 
              : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
          }`}
        >
          Custom Colors
        </button>
      </div>

      {/* Template Selection */}
      {mode === 'template' && (
        <div>
          <label className="block text-sm font-medium mb-2">Choose Template:</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {BADGE_TEMPLATES.map((template) => (
              <div
                key={template.id}
                onClick={() => handleTemplateSelect(template.id)}
                className={`p-2 border rounded cursor-pointer text-center transition-colors ${
                  selectedTemplate === template.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <ThreadRing88x31Badge
                  templateId={template.id}
                  title={badgeText.title}
                  subtitle={badgeText.subtitle}
                />
                <p className="text-xs mt-1">{template.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom Colors */}
      {mode === 'custom' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Background Color:</label>
            <input
              type="color"
              value={customColors.backgroundColor}
              onChange={(e) => handleCustomColorChange('backgroundColor', e.target.value)}
              className="w-full h-10 border border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Text Color:</label>
            <input
              type="color"
              value={customColors.textColor}
              onChange={(e) => handleCustomColorChange('textColor', e.target.value)}
              className="w-full h-10 border border-gray-300 rounded"
            />
          </div>
        </div>
      )}

      {/* Badge Text Customization */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Badge Title:</label>
          <input
            type="text"
            placeholder={threadRingName}
            maxLength={15}
            value={badgeText.title}
            onChange={(e) => setBadgeText(prev => ({ ...prev, title: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded"
          />
          <p className="text-xs text-gray-500 mt-1">Max 15 characters</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Subtitle (optional):</label>
          <input
            type="text"
            placeholder="@threadring"
            maxLength={12}
            value={badgeText.subtitle}
            onChange={(e) => setBadgeText(prev => ({ ...prev, subtitle: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded"
          />
          <p className="text-xs text-gray-500 mt-1">Max 12 characters</p>
        </div>
      </div>
    </div>
  );
}