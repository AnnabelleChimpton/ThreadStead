import React, { useState } from 'react';

interface ComponentCardProps {
  name: string;
  description: string;
  whenToUse?: string;
  props?: Array<{
    name: string;
    type: string;
    options: string[];
    default: string;
    description: string;
  }> | string[];
  example: string;
  preview?: React.ReactNode;
  stylingGuide?: {
    classes: Array<{
      name: string;
      description: string;
    }>;
    examples: Array<{
      title: string;
      css: string;
    }>;
  };
}

export default function ComponentCard({ 
  name, 
  description, 
  whenToUse,
  props, 
  example, 
  preview, 
  stylingGuide 
}: ComponentCardProps) {
  const [activeTab, setActiveTab] = useState<'example' | 'styling'>('example');
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-yellow-100 border-4 border-black shadow-[8px_8px_0_#000] mb-8 overflow-hidden transition-all duration-300">
      {/* Clickable Header */}
      <div 
        className="flex items-center justify-between p-6 cursor-pointer hover:bg-yellow-200 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
              <div className="w-6 h-6 bg-black flex items-center justify-center">
                <span className="text-yellow-100 font-bold text-sm">▶</span>
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-black mb-1">
                &lt;{name} /&gt;
              </h3>
              <p className="text-gray-700 text-base leading-snug">{description}</p>
              {whenToUse && (
                <p className="text-purple-700 text-sm mt-2 font-medium">
                  💡 When to use: {whenToUse}
                </p>
              )}
            </div>
          </div>
        </div>
        {preview && (
          <div className="ml-6 flex-shrink-0">
            <div className="bg-white border-2 border-black p-3 shadow-[4px_4px_0_#000]">
              {preview}
            </div>
          </div>
        )}
      </div>

      {/* Expandable Content */}
      <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-6 pb-6 space-y-6">
          
          {/* Props */}
          {props && props.length > 0 && (
            <div>
              <h4 className="font-bold text-black mb-3 text-lg">📋 Props:</h4>
              {Array.isArray(props) && props.length > 0 && typeof props[0] === 'object' && 'name' in props[0] ? (
                // New detailed prop format
                <div className="grid gap-4">
                  {(props as Array<{name: string; type: string; options: string[]; default: string; description: string}>).map((prop) => (
                    <div key={prop.name} className="bg-white border-2 border-black p-4 shadow-[2px_2px_0_#000]">
                      <div className="flex items-start justify-between mb-2">
                        <code className="bg-purple-600 text-white px-3 py-1 font-mono text-sm font-bold rounded">
                          {prop.name}
                        </code>
                        <div className="text-right">
                          <div className="text-xs text-gray-600 mb-1">Type: {prop.type}</div>
                          <div className="text-xs text-gray-600">Default: <code className="bg-gray-200 px-1 rounded">{prop.default}</code></div>
                        </div>
                      </div>
                      <p className="text-gray-800 mb-2 text-sm">{prop.description}</p>
                      <div className="mt-2">
                        <div className="text-xs font-bold text-gray-700 mb-1">Available options:</div>
                        <div className="flex flex-wrap gap-1">
                          {prop.options.map((option) => (
                            <code 
                              key={option}
                              className="bg-cyan-200 text-gray-800 px-2 py-1 text-xs rounded font-mono"
                            >
                              {option}
                            </code>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Legacy simple format
                <div className="flex flex-wrap gap-2">
                  {(props as string[]).map((prop) => (
                    <code 
                      key={prop}
                      className="bg-black text-green-400 px-2 py-1 font-mono text-sm border-2 border-green-400"
                    >
                      {prop}
                    </code>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tabs */}
          <div>
            <div className="flex border-b-4 border-black">
              <button
                onClick={() => setActiveTab('example')}
                className={`px-4 py-2 font-bold text-lg border-r-4 border-black transition-colors ${
                  activeTab === 'example'
                    ? 'bg-pink-300 text-black'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                📝 Code Example
              </button>
              {stylingGuide && (
                <button
                  onClick={() => setActiveTab('styling')}
                  className={`px-4 py-2 font-bold text-lg transition-colors ${
                    activeTab === 'styling'
                      ? 'bg-cyan-300 text-black'
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  🎨 Custom Styling
                </button>
              )}
            </div>

            {/* Tab Content */}
            <div className="mt-4">
              {activeTab === 'example' && (
                <div className="bg-black text-green-400 p-4 font-mono text-sm overflow-x-auto border-4 border-green-400">
                  <pre>{example}</pre>
                </div>
              )}

              {activeTab === 'styling' && stylingGuide && (
                <div className="space-y-6">
                  {/* CSS Classes */}
                  <div>
                    <h4 className="font-bold text-black mb-3 text-lg">🎯 CSS Classes</h4>
                    <div className="grid md:grid-cols-2 gap-3">
                      {stylingGuide.classes.map((cssClass) => (
                        <div key={cssClass.name} className="bg-white border-2 border-black p-3 shadow-[2px_2px_0_#000]">
                          <code className="bg-purple-200 px-2 py-1 rounded font-mono text-sm">
                            {cssClass.name}
                          </code>
                          <p className="text-sm text-gray-700 mt-1">{cssClass.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Styling Examples */}
                  <div>
                    <h4 className="font-bold text-black mb-3 text-lg">✨ Styling Examples</h4>
                    <div className="space-y-4">
                      {stylingGuide.examples.map((example, index) => (
                        <div key={index} className="bg-white border-2 border-black p-4 shadow-[2px_2px_0_#000]">
                          <h5 className="font-bold text-purple-600 mb-2">{example.title}</h5>
                          <div className="bg-gray-900 text-cyan-400 p-3 rounded font-mono text-xs overflow-x-auto">
                            <pre>{example.css}</pre>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}