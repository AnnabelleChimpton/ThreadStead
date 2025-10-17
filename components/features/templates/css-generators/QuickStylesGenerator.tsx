import React, { useState } from 'react';
import SliderInput from './shared/SliderInput';
import TargetClassSelector from './shared/TargetClassSelector';

interface QuickStylesGeneratorProps {
  onInsertCSS: (css: string) => void;
}

const DISPLAY_VALUES = ['block', 'inline-block', 'flex', 'grid', 'none'];
const POSITION_VALUES = ['static', 'relative', 'absolute', 'fixed', 'sticky'];

export default function QuickStylesGenerator({ onInsertCSS }: QuickStylesGeneratorProps) {
  const [opacity, setOpacity] = useState(1);
  const [rotate, setRotate] = useState(0);
  const [scale, setScale] = useState(1);
  const [display, setDisplay] = useState('block');
  const [position, setPosition] = useState('static');
  const [zIndex, setZIndex] = useState(0);
  const [targetClass, setTargetClass] = useState('');

  const handleInsert = () => {
    if (!targetClass) {
      alert('Please select a target element first!');
      return;
    }

    const styles: string[] = [];

    if (opacity !== 1) styles.push(`opacity: ${opacity};`);
    if (rotate !== 0 || scale !== 1) {
      const transforms: string[] = [];
      if (rotate !== 0) transforms.push(`rotate(${rotate}deg)`);
      if (scale !== 1) transforms.push(`scale(${scale})`);
      styles.push(`transform: ${transforms.join(' ')};`);
    }
    if (display !== 'block') styles.push(`display: ${display};`);
    if (position !== 'static') styles.push(`position: ${position};`);
    if (zIndex !== 0) styles.push(`z-index: ${zIndex};`);

    if (styles.length === 0) {
      alert('Please adjust at least one property!');
      return;
    }

    const css = `${targetClass} {\n  ${styles.join('\n  ')}\n}`;
    onInsertCSS(css);
  };

  const previewStyle: React.CSSProperties = {
    opacity,
    transform: `rotate(${rotate}deg) scale(${scale})`,
    display: 'inline-block',
  };

  return (
    <div className="space-y-2.5 overflow-x-hidden">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">🎯</span>
        <h3 className="font-bold text-sm">Quick Styles</h3>
      </div>

      {/* Live Preview */}
      <div className="bg-gray-50 border border-gray-300 rounded p-2.5">
        <p className="text-xs text-gray-500 mb-1.5">Preview:</p>
        <div className="flex items-center justify-center p-4 bg-white rounded">
          <div
            style={previewStyle}
            className="bg-blue-500 text-white px-4 py-2 rounded font-medium text-sm"
          >
            Sample Element
          </div>
        </div>
      </div>

      {/* Opacity */}
      <div className="bg-purple-50 border border-purple-200 rounded p-2">
        <h4 className="text-xs font-semibold text-purple-900 mb-1.5">Opacity</h4>
        <SliderInput
          label="Opacity"
          value={opacity}
          min={0}
          max={1}
          step={0.1}
          onChange={setOpacity}
        />
      </div>

      {/* Transforms */}
      <div className="bg-green-50 border border-green-200 rounded p-2 space-y-2">
        <h4 className="text-xs font-semibold text-green-900">Transforms</h4>
        <SliderInput
          label="Rotate"
          value={rotate}
          min={-180}
          max={180}
          step={15}
          unit="°"
          onChange={setRotate}
        />
        <SliderInput
          label="Scale"
          value={scale}
          min={0.5}
          max={2}
          step={0.1}
          onChange={setScale}
        />
      </div>

      {/* Display */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-700">Display</label>
        <div className="grid grid-cols-3 gap-1">
          {DISPLAY_VALUES.map((val) => (
            <button
              key={val}
              onClick={() => setDisplay(val)}
              className={`px-2 py-1.5 text-xs border rounded transition-colors ${
                display === val
                  ? 'bg-blue-500 text-white border-blue-600'
                  : 'bg-white border-gray-300 hover:bg-gray-50'
              }`}
            >
              {val}
            </button>
          ))}
        </div>
      </div>

      {/* Position */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-700">Position</label>
        <div className="grid grid-cols-3 gap-1">
          {POSITION_VALUES.map((val) => (
            <button
              key={val}
              onClick={() => setPosition(val)}
              className={`px-2 py-1.5 text-xs border rounded transition-colors ${
                position === val
                  ? 'bg-blue-500 text-white border-blue-600'
                  : 'bg-white border-gray-300 hover:bg-gray-50'
              }`}
            >
              {val}
            </button>
          ))}
        </div>
      </div>

      {/* Z-Index */}
      <div className="bg-orange-50 border border-orange-200 rounded p-2">
        <h4 className="text-xs font-semibold text-orange-900 mb-1.5">Stacking Order</h4>
        <SliderInput
          label="Z-Index"
          value={zIndex}
          min={-10}
          max={100}
          step={1}
          onChange={setZIndex}
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
              {`${targetClass} {\n${
                opacity !== 1 ? `  opacity: ${opacity};\n` : ''
              }${
                rotate !== 0 || scale !== 1
                  ? `  transform: ${[
                      rotate !== 0 ? `rotate(${rotate}deg)` : null,
                      scale !== 1 ? `scale(${scale})` : null,
                    ].filter(Boolean).join(' ')};\n`
                  : ''
              }${
                display !== 'block' ? `  display: ${display};\n` : ''
              }${
                position !== 'static' ? `  position: ${position};\n` : ''
              }${
                zIndex !== 0 ? `  z-index: ${zIndex};\n` : ''
              }}`}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
