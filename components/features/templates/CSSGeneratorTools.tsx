import React, { useState } from 'react';
import ColorPaletteGenerator from './css-generators/ColorPaletteGenerator';
import TypographyGenerator from './css-generators/TypographyGenerator';
import SpacingBorderGenerator from './css-generators/SpacingBorderGenerator';
import GradientGenerator from './css-generators/GradientGenerator';
import ShadowGenerator from './css-generators/ShadowGenerator';
import QuickStylesGenerator from './css-generators/QuickStylesGenerator';

interface CSSGeneratorToolsProps {
  onInsertCSS: (css: string) => void;
}

type GeneratorId = 'color' | 'typography' | 'spacing' | 'gradient' | 'shadow' | 'quick';

export default function CSSGeneratorTools({ onInsertCSS }: CSSGeneratorToolsProps) {
  const [expandedGenerator, setExpandedGenerator] = useState<GeneratorId | null>('color');

  const toggleGenerator = (id: GeneratorId) => {
    setExpandedGenerator(expandedGenerator === id ? null : id);
  };

  const generators = [
    {
      id: 'color' as GeneratorId,
      icon: '🎨',
      title: 'Color Palette',
      description: 'Pick colors for backgrounds, text, and borders',
      component: <ColorPaletteGenerator onInsertCSS={onInsertCSS} />,
    },
    {
      id: 'typography' as GeneratorId,
      icon: '✏️',
      title: 'Typography',
      description: 'Customize fonts, sizes, and text styles',
      component: <TypographyGenerator onInsertCSS={onInsertCSS} />,
    },
    {
      id: 'spacing' as GeneratorId,
      icon: '📐',
      title: 'Spacing & Borders',
      description: 'Adjust padding, margins, borders, and corners',
      component: <SpacingBorderGenerator onInsertCSS={onInsertCSS} />,
    },
    {
      id: 'gradient' as GeneratorId,
      icon: '🌈',
      title: 'Gradient Builder',
      description: 'Create beautiful linear and radial gradients',
      component: <GradientGenerator onInsertCSS={onInsertCSS} />,
    },
    {
      id: 'shadow' as GeneratorId,
      icon: '💫',
      title: 'Shadow Generator',
      description: 'Add depth with box and text shadows',
      component: <ShadowGenerator onInsertCSS={onInsertCSS} />,
    },
    {
      id: 'quick' as GeneratorId,
      icon: '🎯',
      title: 'Quick Styles',
      description: 'Opacity, transforms, display, position, and more',
      component: <QuickStylesGenerator onInsertCSS={onInsertCSS} />,
    },
  ];

  return (
    <div className="h-full flex flex-col bg-white overflow-x-hidden">
      {/* Header */}
      <div className="pb-3 border-b border-gray-200">
        <h3 className="font-bold text-base mb-1">CSS Generators</h3>
        <p className="text-xs text-gray-600">
          Create CSS visually without writing code.
        </p>
      </div>

      {/* Generators List */}
      <div className="flex-1 overflow-y-auto">
        {generators.map((generator) => (
          <div key={generator.id} className="border-b border-gray-200">
            {/* Generator Header - Clickable */}
            <button
              onClick={() => toggleGenerator(generator.id)}
              className="w-full py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{generator.icon}</span>
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-sm break-words">{generator.title}</h4>
                  <p className="text-xs text-gray-600 break-words">{generator.description}</p>
                </div>
              </div>
              <span className="text-gray-400 text-sm flex-shrink-0">
                {expandedGenerator === generator.id ? '▼' : '▶'}
              </span>
            </button>

            {/* Generator Content - Collapsible */}
            {expandedGenerator === generator.id && (
              <div className="bg-gray-50 border-t border-gray-200">
                {generator.component}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-600">
          <p className="mb-1 font-semibold">
            How to use:
          </p>
          <ol className="list-decimal list-inside space-y-0.5 text-xs">
            <li>Expand a tool above</li>
            <li>Adjust visual controls</li>
            <li>Select target element</li>
            <li>Click &quot;Insert CSS&quot;</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
