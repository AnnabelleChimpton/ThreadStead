import React, { useState } from 'react';
import ColorInput from './shared/ColorInput';
import SliderInput from './shared/SliderInput';
import TargetClassSelector from './shared/TargetClassSelector';

interface TypographyGeneratorProps {
  onInsertCSS: (css: string) => void;
}

const FONT_FAMILIES = [
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Helvetica, sans-serif', label: 'Helvetica' },
  { value: '"Trebuchet MS", sans-serif', label: 'Trebuchet MS' },
  { value: 'Verdana, sans-serif', label: 'Verdana' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: '"Times New Roman", serif', label: 'Times New Roman' },
  { value: '"Courier New", monospace', label: 'Courier New' },
  { value: 'monospace', label: 'Monospace' },
];

const FONT_WEIGHTS = [
  { value: '300', label: 'Light' },
  { value: '400', label: 'Normal' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semi-Bold' },
  { value: '700', label: 'Bold' },
  { value: '900', label: 'Black' },
];

const TEXT_ALIGNS = ['left', 'center', 'right', 'justify'];
const TEXT_TRANSFORMS = ['none', 'uppercase', 'lowercase', 'capitalize'];

export default function TypographyGenerator({ onInsertCSS }: TypographyGeneratorProps) {
  const [fontFamily, setFontFamily] = useState('Arial, sans-serif');
  const [fontSize, setFontSize] = useState(16);
  const [fontWeight, setFontWeight] = useState('400');
  const [color, setColor] = useState('#000000');
  const [lineHeight, setLineHeight] = useState(1.5);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [textAlign, setTextAlign] = useState('left');
  const [textTransform, setTextTransform] = useState('none');
  const [targetClass, setTargetClass] = useState('');

  const handleInsert = () => {
    if (!targetClass) {
      alert('Please select a target element first!');
      return;
    }

    const styles: string[] = [];

    if (fontFamily) styles.push(`font-family: ${fontFamily};`);
    if (fontSize) styles.push(`font-size: ${fontSize}px;`);
    if (fontWeight !== '400') styles.push(`font-weight: ${fontWeight};`);
    if (color !== '#000000') styles.push(`color: ${color};`);
    if (lineHeight !== 1.5) styles.push(`line-height: ${lineHeight};`);
    if (letterSpacing !== 0) styles.push(`letter-spacing: ${letterSpacing}px;`);
    if (textAlign !== 'left') styles.push(`text-align: ${textAlign};`);
    if (textTransform !== 'none') styles.push(`text-transform: ${textTransform};`);

    const css = `${targetClass} {\n  ${styles.join('\n  ')}\n}`;
    onInsertCSS(css);
  };

  const previewStyle = {
    fontFamily,
    fontSize: `${fontSize}px`,
    fontWeight,
    color,
    lineHeight,
    letterSpacing: `${letterSpacing}px`,
    textAlign: textAlign as any,
    textTransform: textTransform as any,
  };

  return (
    <div className="space-y-2.5 overflow-x-hidden">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">✏️</span>
        <h3 className="font-bold text-sm">Typography Designer</h3>
      </div>

      {/* Live Preview */}
      <div className="bg-gray-50 border-2 border-gray-300 rounded p-2.5">
        <p className="text-xs text-gray-500 mb-1.5">Preview:</p>
        <p style={previewStyle}>
          The quick brown fox jumps over the lazy dog
        </p>
      </div>

      {/* Font Family */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-700">Font Family</label>
        <select
          value={fontFamily}
          onChange={(e) => setFontFamily(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {FONT_FAMILIES.map((font) => (
            <option key={font.value} value={font.value}>
              {font.label}
            </option>
          ))}
        </select>
      </div>

      {/* Font Size */}
      <SliderInput
        label="Font Size"
        value={fontSize}
        min={10}
        max={72}
        step={1}
        unit="px"
        onChange={setFontSize}
      />

      {/* Font Weight */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-700">Font Weight</label>
        <div className="grid grid-cols-3 gap-1">
          {FONT_WEIGHTS.map((weight) => (
            <button
              key={weight.value}
              onClick={() => setFontWeight(weight.value)}
              className={`px-2 py-1.5 text-xs border rounded transition-colors ${
                fontWeight === weight.value
                  ? 'bg-blue-500 text-white border-blue-600'
                  : 'bg-white border-gray-300 hover:bg-gray-50'
              }`}
            >
              {weight.label}
            </button>
          ))}
        </div>
      </div>

      {/* Text Color */}
      <ColorInput
        label="Text Color"
        value={color}
        onChange={setColor}
      />

      {/* Line Height */}
      <SliderInput
        label="Line Height"
        value={lineHeight}
        min={1.0}
        max={2.5}
        step={0.1}
        onChange={setLineHeight}
      />

      {/* Letter Spacing */}
      <SliderInput
        label="Letter Spacing"
        value={letterSpacing}
        min={-2}
        max={10}
        step={0.5}
        unit="px"
        onChange={setLetterSpacing}
      />

      {/* Text Align */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-700">Text Align</label>
        <div className="grid grid-cols-4 gap-1">
          {TEXT_ALIGNS.map((align) => (
            <button
              key={align}
              onClick={() => setTextAlign(align)}
              className={`px-2 py-1.5 text-xs border rounded transition-colors capitalize ${
                textAlign === align
                  ? 'bg-blue-500 text-white border-blue-600'
                  : 'bg-white border-gray-300 hover:bg-gray-50'
              }`}
            >
              {align}
            </button>
          ))}
        </div>
      </div>

      {/* Text Transform */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-700">Text Transform</label>
        <div className="grid grid-cols-2 gap-1">
          {TEXT_TRANSFORMS.map((transform) => (
            <button
              key={transform}
              onClick={() => setTextTransform(transform)}
              className={`px-2 py-1.5 text-xs border rounded transition-colors capitalize ${
                textTransform === transform
                  ? 'bg-blue-500 text-white border-blue-600'
                  : 'bg-white border-gray-300 hover:bg-gray-50'
              }`}
            >
              {transform}
            </button>
          ))}
        </div>
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
              {`${targetClass} {\n  font-family: ${fontFamily};\n  font-size: ${fontSize}px;${
                fontWeight !== '400' ? `\n  font-weight: ${fontWeight};` : ''
              }${
                color !== '#000000' ? `\n  color: ${color};` : ''
              }${
                lineHeight !== 1.5 ? `\n  line-height: ${lineHeight};` : ''
              }${
                letterSpacing !== 0 ? `\n  letter-spacing: ${letterSpacing}px;` : ''
              }${
                textAlign !== 'left' ? `\n  text-align: ${textAlign};` : ''
              }${
                textTransform !== 'none' ? `\n  text-transform: ${textTransform};` : ''
              }\n}`}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
