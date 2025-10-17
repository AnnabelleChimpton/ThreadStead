import React, { useState } from 'react';
import ColorInput from './shared/ColorInput';
import SliderInput from './shared/SliderInput';
import TargetClassSelector from './shared/TargetClassSelector';

interface ShadowGeneratorProps {
  onInsertCSS: (css: string) => void;
}

const SHADOW_TYPES = ['box', 'text'] as const;
type ShadowType = typeof SHADOW_TYPES[number];

export default function ShadowGenerator({ onInsertCSS }: ShadowGeneratorProps) {
  const [shadowType, setShadowType] = useState<ShadowType>('box');
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(4);
  const [blur, setBlur] = useState(6);
  const [spread, setSpread] = useState(0);
  const [color, setColor] = useState('#00000040');
  const [targetClass, setTargetClass] = useState('');

  const handleInsert = () => {
    if (!targetClass) {
      alert('Please select a target element first!');
      return;
    }

    const shadowValue = shadowType === 'box'
      ? `${offsetX}px ${offsetY}px ${blur}px ${spread}px ${color}`
      : `${offsetX}px ${offsetY}px ${blur}px ${color}`;

    const property = shadowType === 'box' ? 'box-shadow' : 'text-shadow';
    const css = `${targetClass} {\n  ${property}: ${shadowValue};\n}`;
    onInsertCSS(css);
  };

  const shadowValue = shadowType === 'box'
    ? `${offsetX}px ${offsetY}px ${blur}px ${spread}px ${color}`
    : `${offsetX}px ${offsetY}px ${blur}px ${color}`;

  const previewStyle = shadowType === 'box'
    ? { boxShadow: shadowValue }
    : { textShadow: shadowValue };

  return (
    <div className="space-y-2.5 overflow-x-hidden">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">💫</span>
        <h3 className="font-bold text-sm">Shadow Generator</h3>
      </div>

      {/* Live Preview */}
      <div className="bg-gray-50 border border-gray-300 rounded p-2.5">
        <p className="text-xs text-gray-500 mb-1.5">Preview:</p>
        {shadowType === 'box' ? (
          <div className="flex items-center justify-center p-4">
            <div
              style={previewStyle}
              className="w-24 h-24 bg-white rounded border border-gray-200"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center p-4 bg-white rounded">
            <p style={previewStyle} className="text-2xl font-bold text-gray-800">
              Text
            </p>
          </div>
        )}
      </div>

      {/* Shadow Type */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-700">Shadow Type</label>
        <div className="grid grid-cols-2 gap-1">
          {SHADOW_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setShadowType(type)}
              className={`px-2 py-1.5 text-xs border rounded transition-colors capitalize ${
                shadowType === type
                  ? 'bg-blue-500 text-white border-blue-600'
                  : 'bg-white border-gray-300 hover:bg-gray-50'
              }`}
            >
              {type === 'box' ? 'Box Shadow' : 'Text Shadow'}
            </button>
          ))}
        </div>
      </div>

      {/* Shadow Controls */}
      <div className="bg-blue-50 border border-blue-200 rounded p-2 space-y-2">
        <h4 className="text-xs font-semibold text-blue-900">Shadow Properties</h4>

        <SliderInput
          label="Horizontal Offset"
          value={offsetX}
          min={-50}
          max={50}
          step={1}
          unit="px"
          onChange={setOffsetX}
        />

        <SliderInput
          label="Vertical Offset"
          value={offsetY}
          min={-50}
          max={50}
          step={1}
          unit="px"
          onChange={setOffsetY}
        />

        <SliderInput
          label="Blur Radius"
          value={blur}
          min={0}
          max={50}
          step={1}
          unit="px"
          onChange={setBlur}
        />

        {shadowType === 'box' && (
          <SliderInput
            label="Spread Radius"
            value={spread}
            min={-20}
            max={20}
            step={1}
            unit="px"
            onChange={setSpread}
          />
        )}

        <ColorInput
          label="Shadow Color"
          value={color}
          onChange={setColor}
        />
      </div>

      <div className="border-t border-gray-200 pt-2.5 space-y-2">
        {/* Target Element */}
        <TargetClassSelector
          value={targetClass}
          onChange={setTargetClass}
        />

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
              {`${targetClass} {\n  ${shadowType === 'box' ? 'box-shadow' : 'text-shadow'}: ${shadowValue};\n}`}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
