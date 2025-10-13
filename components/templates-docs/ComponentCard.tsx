import React, { useState } from "react";
import { Component, ComponentCategory } from "@/lib/templates-docs/componentData";

interface ComponentCardProps {
  component: Component & {
    availableInVisualBuilder?: boolean;
    codeOnly?: boolean;
    isRetro?: boolean;
    isInteractive?: boolean;
    tags?: string[];
  };
  category: ComponentCategory;
}

export default function ComponentCard({ component, category }: ComponentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedExample, setCopiedExample] = useState<number | null>(null);

  const copyToClipboard = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedExample(index);
    setTimeout(() => setCopiedExample(null), 2000);
  };

  return (
    <div
      className={`border-3 border-black ${category.color} shadow-[3px_3px_0_#000] overflow-hidden transition-all ${
        isExpanded ? 'shadow-[5px_5px_0_#000]' : ''
      }`}
    >
      {/* Card Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full px-6 py-4 ${category.hoverColor} transition-all text-left`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{category.icon}</span>
              <h3 className="text-xl font-black text-gray-900">{component.name}</h3>
            </div>
            <p className="text-sm text-gray-700 mb-2">{component.description}</p>

            {/* Badges */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {component.availableInVisualBuilder && (
                <span className="px-2 py-0.5 bg-purple-200 border border-purple-400 text-xs font-bold">
                  🎨 Visual Builder
                </span>
              )}
              {component.codeOnly && (
                <span className="px-2 py-0.5 bg-cyan-200 border border-cyan-400 text-xs font-bold">
                  💻 Code Only
                </span>
              )}
              {component.isRetro && (
                <span className="px-2 py-0.5 bg-pink-200 border border-pink-400 text-xs font-bold">
                  📺 Retro
                </span>
              )}
              {component.isInteractive && (
                <span className="px-2 py-0.5 bg-yellow-200 border border-yellow-400 text-xs font-bold">
                  ⚡ Interactive
                </span>
              )}
            </div>
          </div>
          <div className="text-2xl transition-transform" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>
            ▼
          </div>
        </div>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="bg-white border-t-3 border-black p-6 space-y-6">
          {/* Use Cases */}
          {component.useCases && component.useCases.length > 0 && (
            <div>
              <h4 className="font-bold mb-2 flex items-center gap-2">
                <span>💡</span>
                <span>Use Cases:</span>
              </h4>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                {component.useCases.map((useCase, index) => (
                  <li key={index}>{useCase}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Props */}
          {component.props && component.props.length > 0 && (
            <div>
              <h4 className="font-bold mb-2 flex items-center gap-2">
                <span>🔧</span>
                <span>Props:</span>
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-2 border-black">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border border-black px-3 py-2 text-left">Name</th>
                      <th className="border border-black px-3 py-2 text-left">Type</th>
                      <th className="border border-black px-3 py-2 text-left">Required</th>
                      <th className="border border-black px-3 py-2 text-left">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {component.props.map((prop, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="border border-black px-3 py-2 font-mono text-xs font-bold">
                          {prop.name}
                        </td>
                        <td className="border border-black px-3 py-2">
                          <code className="text-xs bg-purple-100 px-2 py-1 rounded">{prop.type}</code>
                          {prop.options && (
                            <div className="text-xs text-gray-500 mt-1">
                              {prop.options.join(' | ')}
                            </div>
                          )}
                        </td>
                        <td className="border border-black px-3 py-2">
                          {prop.required ? (
                            <span className="text-red-600 font-bold">✓</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="border border-black px-3 py-2 text-gray-700">
                          {prop.description}
                          {prop.default && (
                            <div className="text-xs text-gray-500 mt-1">
                              Default: <code>{prop.default}</code>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Examples */}
          {component.examples && component.examples.length > 0 && (
            <div>
              <h4 className="font-bold mb-2 flex items-center gap-2">
                <span>📝</span>
                <span>Examples:</span>
              </h4>
              <div className="space-y-4">
                {component.examples.map((example, index) => (
                  <div key={index} className="border-2 border-gray-300">
                    <div className="bg-gray-100 px-4 py-2 border-b-2 border-gray-300 flex items-center justify-between">
                      <span className="text-sm font-medium">{example.title}</span>
                      <button
                        onClick={() => copyToClipboard(example.code, index)}
                        className="px-3 py-1 bg-cyan-200 border-2 border-black shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all text-xs font-bold"
                      >
                        {copiedExample === index ? '✓ Copied!' : '📋 Copy'}
                      </button>
                    </div>
                    <div className="bg-gray-900 text-green-400 p-4 font-mono text-xs overflow-x-auto">
                      <pre className="whitespace-pre-wrap">{example.code}</pre>
                    </div>
                    {example.description && (
                      <div className="bg-blue-50 px-4 py-2 text-sm text-gray-700">
                        {example.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          {component.tips && component.tips.length > 0 && (
            <div>
              <h4 className="font-bold mb-2 flex items-center gap-2">
                <span>💡</span>
                <span>Tips:</span>
              </h4>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 bg-yellow-50 border-2 border-yellow-300 p-4">
                {component.tips.map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
