import React, { useState } from 'react';
import ColorInput from './shared/ColorInput';
import SliderInput from './shared/SliderInput';
import TargetClassSelector from './shared/TargetClassSelector';

interface GradientGeneratorProps {
  onInsertCSS: (css: string) => void;
}

const GRADIENT_TYPES = ['linear', 'radial'] as const;
type GradientType = typeof GRADIENT_TYPES[number];

export default function GradientGenerator({ onInsertCSS }: GradientGeneratorProps) {
  const [gradientType, setGradientType] = useState<GradientType>('linear');
  const [angle, setAngle] = useState(135);
  const [color1, setColor1] = useState('#667eea');
  const [color2, setColor2] = useState('#764ba2');
  const [targetClass, setTargetClass] = useState('');

  const handleInsert = () => {
    if (!targetClass) {
      alert('Please select a target element first!');
      return;
    }

    const gradientValue = gradientType === 'linear'
      ? `linear-gradient(${angle}deg, ${color1} 0%, ${color2} 100%)`
      : `radial-gradient(circle, ${color1} 0%, ${color2} 100%)`;

    const css = `${targetClass} {\n  background: ${gradientValue};\n}`;
    onInsertCSS(css);
  };

  const previewStyle = {
    background: gradientType === 'linear'
      ? `linear-gradient(${angle}deg, ${color1} 0%, ${color2} 100%)`
      : `radial-gradient(circle, ${color1} 0%, ${color2} 100%)`,
  };

  return (
    <div className="space-y-2.5 overflow-x-hidden">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">🌈</span>
        <h3 className="font-bold text-sm">Gradient Builder</h3>
      </div>

      {/* Live Preview */}
      <div className="bg-gray-50 border border-gray-300 rounded p-2.5">
        <p className="text-xs text-gray-500 mb-1.5">Preview:</p>
        <div
          style={previewStyle}
          className="w-full h-24 rounded border border-gray-300"
        />
      </div>

      {/* Gradient Type */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-700">Gradient Type</label>
        <div className="grid grid-cols-2 gap-1">
          {GRADIENT_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setGradientType(type)}
              className={`px-2 py-1.5 text-xs border rounded transition-colors capitalize ${
                gradientType === type
                  ? 'bg-blue-500 text-white border-blue-600'
                  : 'bg-white border-gray-300 hover:bg-gray-50'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Angle (Linear only) */}
      {gradientType === 'linear' && (
        <SliderInput
          label="Angle"
          value={angle}
          min={0}
          max={360}
          step={15}
          unit="°"
          onChange={setAngle}
        />
      )}

      {/* Colors */}
      <div className="bg-purple-50 border border-purple-200 rounded p-2 space-y-2">
        <h4 className="text-xs font-semibold text-purple-900">Colors</h4>
        <ColorInput
          label="Start Color"
          value={color1}
          onChange={setColor1}
        />
        <ColorInput
          label="End Color"
          value={color2}
          onChange={setColor2}
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
              {`${targetClass} {\n  background: ${
                gradientType === 'linear'
                  ? `linear-gradient(${angle}deg, ${color1} 0%, ${color2} 100%)`
                  : `radial-gradient(circle, ${color1} 0%, ${color2} 100%)`
              };\n}`}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
