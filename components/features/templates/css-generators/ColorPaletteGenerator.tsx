import React, { useState } from 'react';
import ColorInput from './shared/ColorInput';
import TargetClassSelector from './shared/TargetClassSelector';
import PresetGallery, { type Preset } from './shared/PresetGallery';

interface ColorPaletteGeneratorProps {
  onInsertCSS: (css: string) => void;
}

const COLOR_PRESETS: Preset[] = [
  { id: 'blue', label: 'Blue', icon: '🔵' },
  { id: 'purple', label: 'Purple', icon: '🟣' },
  { id: 'pink', label: 'Pink', icon: '🩷' },
  { id: 'green', label: 'Green', icon: '🟢' },
  { id: 'orange', label: 'Orange', icon: '🟠' },
  { id: 'red', label: 'Red', icon: '🔴' },
];

const PRESET_COLORS: Record<string, string> = {
  blue: '#3b82f6',
  purple: '#a855f7',
  pink: '#ec4899',
  green: '#10b981',
  orange: '#f97316',
  red: '#ef4444',
};

const COLOR_PROPERTIES = [
  { value: 'background-color', label: 'Background Color' },
  { value: 'color', label: 'Text Color' },
  { value: 'border-color', label: 'Border Color' },
];

export default function ColorPaletteGenerator({ onInsertCSS }: ColorPaletteGeneratorProps) {
  const [color, setColor] = useState('#3b82f6');
  const [targetClass, setTargetClass] = useState('');
  const [property, setProperty] = useState('background-color');
  const [colorHistory, setColorHistory] = useState<string[]>([]);

  const handlePresetSelect = (presetId: string) => {
    const presetColor = PRESET_COLORS[presetId];
    if (presetColor) {
      setColor(presetColor);
      addToHistory(presetColor);
    }
  };

  const addToHistory = (newColor: string) => {
    setColorHistory(prev => {
      const filtered = prev.filter(c => c !== newColor);
      return [newColor, ...filtered].slice(0, 6);
    });
  };

  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    addToHistory(newColor);
  };

  const handleInsert = () => {
    if (!targetClass) {
      alert('Please select a target element first!');
      return;
    }

    const css = `${targetClass} {\n  ${property}: ${color};\n}`;
    onInsertCSS(css);
  };

  return (
    <div className="space-y-2.5 overflow-x-hidden">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">🎨</span>
        <h3 className="font-bold text-sm">Color Palette Manager</h3>
      </div>

      {/* Color Picker */}
      <ColorInput
        label="Pick Color"
        value={color}
        onChange={handleColorChange}
      />

      {/* Color Preview */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-700 min-w-[70px]">Preview</span>
        <div
          className="flex-1 h-10 rounded border-2 border-gray-300"
          style={{ backgroundColor: color }}
        />
      </div>

      {/* Presets */}
      <PresetGallery
        label="Quick Colors"
        presets={COLOR_PRESETS}
        onSelect={handlePresetSelect}
      />

      {/* Color History */}
      {colorHistory.length > 0 && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-700">Recent Colors</label>
          <div className="flex gap-2 flex-wrap">
            {colorHistory.map((historyColor, index) => (
              <button
                key={index}
                onClick={() => setColor(historyColor)}
                className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-400 transition-colors"
                style={{ backgroundColor: historyColor }}
                title={historyColor}
              />
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-gray-200 pt-2.5 space-y-2">
        {/* Target Element */}
        <TargetClassSelector
          value={targetClass}
          onChange={setTargetClass}
        />

        {/* Property Selection */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-700">CSS Property</label>
          <select
            value={property}
            onChange={(e) => setProperty(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {COLOR_PROPERTIES.map((prop) => (
              <option key={prop.value} value={prop.value}>
                {prop.label}
              </option>
            ))}
          </select>
        </div>

        {/* Insert Button */}
        <button
          onClick={handleInsert}
          disabled={!targetClass}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded transition-colors text-sm"
        >
          Insert CSS
        </button>

        {/* Preview of what will be inserted */}
        {targetClass && (
          <div className="bg-gray-50 border border-gray-200 rounded p-2">
            <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap break-words overflow-x-auto">
              {`${targetClass} {\n  ${property}: ${color};\n}`}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
