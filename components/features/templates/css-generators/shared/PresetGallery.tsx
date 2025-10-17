import React from 'react';

export interface Preset {
  id: string;
  label: string;
  icon?: string;
  preview?: React.ReactNode;
}

interface PresetGalleryProps {
  label?: string;
  presets: Preset[];
  onSelect: (presetId: string) => void;
  className?: string;
}

export default function PresetGallery({
  label = 'Quick Presets',
  presets,
  onSelect,
  className = ''
}: PresetGalleryProps) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label className="text-xs font-medium text-gray-700">{label}</label>
      <div className="grid grid-cols-2 gap-2">
        {presets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onSelect(preset.id)}
            className="px-3 py-2 text-xs bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded transition-colors flex items-center gap-2 justify-center"
          >
            {preset.icon && <span>{preset.icon}</span>}
            <span>{preset.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
