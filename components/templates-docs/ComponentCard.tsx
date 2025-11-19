import React, { useState } from "react";
import Link from "next/link";
import { PixelIcon } from "@/components/ui/PixelIcon";
import { Component, ComponentCategory } from "@/lib/templates-docs/componentData";
import { getCachedTutorialsForComponent, ComponentTutorialInfo } from "@/lib/templates-docs/componentTutorialMap";

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
  const [copiedLink, setCopiedLink] = useState(false);

  // Get tutorials that feature this component
  const tutorialsForComponent = getCachedTutorialsForComponent(component.id);

  const copyToClipboard = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedExample(index);
    setTimeout(() => setCopiedExample(null), 2000);
  };

  const copyLink = () => {
    const url = `${window.location.origin}/templates/components#${component.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div
      id={component.id}
      className={`border-3 border-black ${category.color} shadow-[3px_3px_0_#000] overflow-hidden transition-all ${
        isExpanded ? 'shadow-[5px_5px_0_#000]' : ''
      }`}
      style={{ scrollMarginTop: '100px' }}
    >
      {/* Card Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full px-6 py-4 ${category.hoverColor} transition-all text-left cursor-pointer`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {category.icon && <span className="text-2xl"><PixelIcon name={category.icon as any} size={24} /></span>}
              <h3 className="text-xl font-black text-gray-900">{component.name}</h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  copyLink();
                }}
                className="ml-2 px-2 py-1 bg-gray-200 border border-gray-400 text-xs font-medium hover:bg-gray-300 transition-colors flex items-center gap-1"
                title="Copy link to this component"
              >
                {copiedLink ? <><PixelIcon name="check" size={12} /> Copied!</> : <><PixelIcon name="link" size={12} /> Link</>}
              </button>
            </div>
            <p className="text-sm text-gray-700 mb-2">{component.description}</p>

            {/* Badges */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {component.availableInVisualBuilder && (
                <span className="px-2 py-0.5 bg-purple-200 border border-purple-400 text-xs font-bold flex items-center gap-1">
                  <PixelIcon name="paint-bucket" size={12} /> Visual Builder
                </span>
              )}
              {component.codeOnly && (
                <span className="px-2 py-0.5 bg-cyan-200 border border-cyan-400 text-xs font-bold flex items-center gap-1">
                  <PixelIcon name="code" size={12} /> Code Only
                </span>
              )}
              {component.isRetro && (
                <span className="px-2 py-0.5 bg-pink-200 border border-pink-400 text-xs font-bold flex items-center gap-1">
                  <PixelIcon name="zap" size={12} /> Retro
                </span>
              )}
              {component.isInteractive && (
                <span className="px-2 py-0.5 bg-yellow-200 border border-yellow-400 text-xs font-bold flex items-center gap-1">
                  <PixelIcon name="zap" size={12} /> Interactive
                </span>
              )}
              {component.difficulty && (
                <span className={`px-2 py-0.5 border text-xs font-bold flex items-center gap-1 ${
                  component.difficulty === 'beginner' ? 'bg-green-200 border-green-400' :
                  component.difficulty === 'intermediate' ? 'bg-orange-200 border-orange-400' :
                  'bg-red-200 border-red-400'
                }`}>
                  {component.difficulty === 'beginner' && <PixelIcon name="drop" size={12} />}
                  {component.difficulty === 'intermediate' && <PixelIcon name="sliders" size={12} />}
                  {component.difficulty === 'advanced' && <PixelIcon name="zap" size={12} />}
                  {component.difficulty.charAt(0).toUpperCase() + component.difficulty.slice(1)}
                </span>
              )}
            </div>
          </div>
          <div className="text-2xl transition-transform" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>
            ▼
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="bg-white border-t-3 border-black p-6 space-y-6">
          {/* Use Cases */}
          {component.useCases && component.useCases.length > 0 && (
            <div>
              <h4 className="font-bold mb-2 flex items-center gap-2">
                <PixelIcon name="lightbulb" size={16} />
                <span>Use Cases:</span>
              </h4>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                {component.useCases.map((useCase, index) => (
                  <li key={index}>{useCase}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Pairs Well With */}
          {component.pairsWellWith && component.pairsWellWith.length > 0 && (
            <div>
              <h4 className="font-bold mb-2 flex items-center gap-2">
                <PixelIcon name="link" size={16} />
                <span>Pairs Well With:</span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {component.pairsWellWith.map((componentId, index) => (
                  <a
                    key={index}
                    href={`/templates/components#${componentId}`}
                    className="px-3 py-1 bg-blue-100 border-2 border-blue-300 text-sm font-medium hover:bg-blue-200 transition-colors"
                  >
                    {componentId}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Featured In Tutorials */}
          {tutorialsForComponent.length > 0 && (
            <div>
              <h4 className="font-bold mb-2 flex items-center gap-2">
                <PixelIcon name="article" size={16} />
                <span>Learn in Tutorials:</span>
              </h4>
              <div className="space-y-2">
                {tutorialsForComponent.map((tutorialInfo, index) => (
                  <Link
                    key={index}
                    href={`/templates/tutorials/${tutorialInfo.tutorial.slug}`}
                    className="block p-3 bg-purple-50 border-2 border-purple-300 hover:bg-purple-100 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-lg"><PixelIcon name="script" size={18} /></span>
                      <div className="flex-1">
                        <div className="font-bold text-sm">{tutorialInfo.tutorial.title}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          {tutorialInfo.appearsInSteps.length > 0 ? (
                            <>Used in step{tutorialInfo.appearsInSteps.length > 1 ? 's' : ''} {tutorialInfo.appearsInSteps.join(', ')}</>
                          ) : (
                            <>Related component</>
                          )}
                          {' • '}
                          <span className={`font-medium ${
                            tutorialInfo.tutorial.difficulty === 'beginner' ? 'text-green-600' :
                            tutorialInfo.tutorial.difficulty === 'intermediate' ? 'text-orange-600' :
                            'text-red-600'
                          }`}>
                            {tutorialInfo.tutorial.difficulty}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Common Operators (for conditional components) */}
          {component.operators && component.operators.length > 0 && (
            <div>
              <h4 className="font-bold mb-2 flex items-center gap-2">
                <PixelIcon name="sliders" size={16} />
                <span>Common Operators:</span>
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-2 border-black">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border border-black px-3 py-2 text-left">Operator</th>
                      <th className="border border-black px-3 py-2 text-left">Syntax</th>
                      <th className="border border-black px-3 py-2 text-left">Example</th>
                      <th className="border border-black px-3 py-2 text-left">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {component.operators.map((op, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="border border-black px-3 py-2 font-mono text-xs font-bold">
                          {op.name}
                        </td>
                        <td className="border border-black px-3 py-2">
                          <code className="text-xs bg-purple-100 px-2 py-1 rounded block">{op.syntax}</code>
                        </td>
                        <td className="border border-black px-3 py-2">
                          <code className="text-xs bg-green-100 px-2 py-1 rounded block">{op.example}</code>
                        </td>
                        <td className="border border-black px-3 py-2 text-gray-700">
                          {op.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Accessibility */}
          {component.accessibility && component.accessibility.length > 0 && (
            <div>
              <h4 className="font-bold mb-2 flex items-center gap-2">
                <PixelIcon name="user" size={16} />
                <span>Accessibility:</span>
              </h4>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 bg-blue-50 border-2 border-blue-300 p-4">
                {component.accessibility.map((note, index) => (
                  <li key={index}>{note}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Performance Notes */}
          {component.performanceNotes && component.performanceNotes.length > 0 && (
            <div>
              <h4 className="font-bold mb-2 flex items-center gap-2">
                <PixelIcon name="zap" size={16} />
                <span>Performance:</span>
              </h4>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 bg-yellow-50 border-2 border-yellow-300 p-4">
                {component.performanceNotes.map((note, index) => (
                  <li key={index}>{note}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Props */}
          {component.props && component.props.length > 0 && (
            <div>
              <h4 className="font-bold mb-2 flex items-center gap-2">
                <PixelIcon name="sliders" size={16} />
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
                            <span className="text-red-600 font-bold"><PixelIcon name="check" size={12} /></span>
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
                <PixelIcon name="edit" size={16} />
                <span>Examples:</span>
              </h4>
              <div className="space-y-4">
                {component.examples.map((example, index) => (
                  <div key={index} className="border-2 border-gray-300">
                    <div className="bg-gray-100 px-4 py-2 border-b-2 border-gray-300 flex items-center justify-between">
                      <span className="text-sm font-medium">{example.title}</span>
                      <button
                        onClick={() => copyToClipboard(example.code, index)}
                        className="px-3 py-1 bg-cyan-200 border-2 border-black shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all text-xs font-bold flex items-center gap-1"
                      >
                        {copiedExample === index ? <><PixelIcon name="check" size={12} /> Copied!</> : <><PixelIcon name="clipboard" size={12} /> Copy</>}
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
                <PixelIcon name="lightbulb" size={16} />
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
