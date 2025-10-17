import React, { useState } from 'react';
import ColorInput from './shared/ColorInput';
import SliderInput from './shared/SliderInput';
import UnitInput from './shared/UnitInput';
import TargetClassSelector from './shared/TargetClassSelector';

interface SpacingBorderGeneratorProps {
  onInsertCSS: (css: string) => void;
}

const BORDER_STYLES = ['solid', 'dashed', 'dotted', 'double', 'none'];
const UNITS = ['px', 'rem', 'em', '%'];

export default function SpacingBorderGenerator({ onInsertCSS }: SpacingBorderGeneratorProps) {
  const [paddingValue, setPaddingValue] = useState(20);
  const [paddingUnit, setPaddingUnit] = useState('px');
  const [marginValue, setMarginValue] = useState(16);
  const [marginUnit, setMarginUnit] = useState('px');
  const [borderWidth, setBorderWidth] = useState(1);
  const [borderStyle, setBorderStyle] = useState('solid');
  const [borderColor, setBorderColor] = useState('#e0e0e0');
  const [borderRadius, setBorderRadius] = useState(8);
  const [targetClass, setTargetClass] = useState('');

  const handleInsert = () => {
    if (!targetClass) {
      alert('Please select a target element first!');
      return;
    }

    const styles: string[] = [];

    if (paddingValue > 0) styles.push(`padding: ${paddingValue}${paddingUnit};`);
    if (marginValue > 0) styles.push(`margin: ${marginValue}${marginUnit};`);
    if (borderStyle !== 'none' && borderWidth > 0) {
      styles.push(`border: ${borderWidth}px ${borderStyle} ${borderColor};`);
    }
    if (borderRadius > 0) styles.push(`border-radius: ${borderRadius}px;`);

    const css = `${targetClass} {\n  ${styles.join('\n  ')}\n}`;
    onInsertCSS(css);
  };

  const previewBoxStyle = {
    padding: `${paddingValue}${paddingUnit}`,
    margin: `${marginValue}${marginUnit}`,
    border: borderStyle !== 'none' ? `${borderWidth}px ${borderStyle} ${borderColor}` : 'none',
    borderRadius: `${borderRadius}px`,
  };

  return (
    <div className="space-y-2.5 overflow-x-hidden">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">📐</span>
        <h3 className="font-bold text-sm">Spacing & Borders</h3>
      </div>

      {/* Live Preview */}
      <div className="bg-gray-50 border border-gray-300 rounded p-2.5">
        <p className="text-xs text-gray-500 mb-1.5">Preview:</p>
        <div className="bg-white inline-block">
          <div
            style={previewBoxStyle}
            className="bg-blue-100 text-blue-900 text-xs"
          >
            Content Box
          </div>
        </div>
      </div>

      {/* Padding */}
      <div className="bg-purple-50 border border-purple-200 rounded p-2">
        <h4 className="text-xs font-semibold text-purple-900 mb-1.5">Padding (Inner Spacing)</h4>
        <UnitInput
          label="Padding"
          value={paddingValue}
          unit={paddingUnit}
          units={UNITS}
          onValueChange={setPaddingValue}
          onUnitChange={setPaddingUnit}
          min={0}
          max={100}
        />
      </div>

      {/* Margin */}
      <div className="bg-orange-50 border border-orange-200 rounded p-2">
        <h4 className="text-xs font-semibold text-orange-900 mb-1.5">Margin (Outer Spacing)</h4>
        <UnitInput
          label="Margin"
          value={marginValue}
          unit={marginUnit}
          units={UNITS}
          onValueChange={setMarginValue}
          onUnitChange={setMarginUnit}
          min={0}
          max={100}
        />
      </div>

      {/* Border */}
      <div className="bg-blue-50 border border-blue-200 rounded p-2 space-y-2">
        <h4 className="text-xs font-semibold text-blue-900">Border</h4>

        <SliderInput
          label="Border Width"
          value={borderWidth}
          min={0}
          max={10}
          step={1}
          unit="px"
          onChange={setBorderWidth}
        />

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-700">Border Style</label>
          <div className="grid grid-cols-3 gap-1">
            {BORDER_STYLES.map((style) => (
              <button
                key={style}
                onClick={() => setBorderStyle(style)}
                className={`px-2 py-1.5 text-xs border rounded transition-colors capitalize ${
                  borderStyle === style
                    ? 'bg-blue-500 text-white border-blue-600'
                    : 'bg-white border-gray-300 hover:bg-gray-50'
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        {borderStyle !== 'none' && (
          <ColorInput
            label="Border Color"
            value={borderColor}
            onChange={setBorderColor}
          />
        )}
      </div>

      {/* Border Radius */}
      <div className="bg-green-50 border border-green-200 rounded p-2">
        <h4 className="text-xs font-semibold text-green-900 mb-1.5">Rounded Corners</h4>
        <SliderInput
          label="Border Radius"
          value={borderRadius}
          min={0}
          max={50}
          step={1}
          unit="px"
          onChange={setBorderRadius}
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
                paddingValue > 0 ? `  padding: ${paddingValue}${paddingUnit};\n` : ''
              }${
                marginValue > 0 ? `  margin: ${marginValue}${marginUnit};\n` : ''
              }${
                borderStyle !== 'none' && borderWidth > 0
                  ? `  border: ${borderWidth}px ${borderStyle} ${borderColor};\n`
                  : ''
              }${
                borderRadius > 0 ? `  border-radius: ${borderRadius}px;\n` : ''
              }}`}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
