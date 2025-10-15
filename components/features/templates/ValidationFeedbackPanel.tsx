// Validation feedback panel for template editor
import React, { useState } from 'react';

export interface ValidationFeedbackProps {
  validationResult: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    strippedComponents?: Array<{
      name: string;
      line?: number;
      reason?: string;
    }>;
    stats?: {
      nodeCount: number;
      maxDepth: number;
      componentCounts: Record<string, number>;
    };
  };
  onDismiss: () => void;
  onSaveAnyway?: () => void;
}

export default function ValidationFeedbackPanel({
  validationResult,
  onDismiss,
  onSaveAnyway
}: ValidationFeedbackProps) {
  const [expandedSections, setExpandedSections] = useState({
    errors: true,
    warnings: true,
    stripped: true,
    stats: false
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const hasErrors = validationResult.errors.length > 0;
  const hasWarnings = validationResult.warnings.length > 0;
  const hasStripped = (validationResult.strippedComponents?.length || 0) > 0;

  return (
    <div className="fixed right-4 top-20 bottom-4 w-96 bg-white border-2 border-gray-300 rounded-lg shadow-2xl overflow-hidden flex flex-col z-[10000]">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 flex items-center justify-between">
        <h3 className="font-semibold text-lg !text-white">Validation Results</h3>
        <button
          onClick={onDismiss}
          className="text-white hover:bg-blue-800 rounded p-1 transition-colors"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* Summary */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="space-y-1">
          {hasErrors && (
            <div className="text-red-700 font-medium flex items-center gap-2">
              <span className="text-xl">❌</span>
              <span>{validationResult.errors.length} Error{validationResult.errors.length !== 1 ? 's' : ''} (Must Fix)</span>
            </div>
          )}
          {hasWarnings && (
            <div className="text-yellow-700 font-medium flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              <span>{validationResult.warnings.length} Warning{validationResult.warnings.length !== 1 ? 's' : ''}</span>
            </div>
          )}
          {hasStripped && (
            <div className="text-orange-700 font-medium flex items-center gap-2">
              <span className="text-xl">🗑️</span>
              <span>{validationResult.strippedComponents?.length} Component{(validationResult.strippedComponents?.length || 0) !== 1 ? 's' : ''} Stripped</span>
            </div>
          )}
          {!hasErrors && !hasWarnings && !hasStripped && (
            <div className="text-green-700 font-medium flex items-center gap-2">
              <span className="text-xl">✓</span>
              <span>Template is valid!</span>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Errors Section */}
        {hasErrors && (
          <div className="border-b border-gray-200">
            <button
              onClick={() => toggleSection('errors')}
              className="w-full px-4 py-3 bg-red-50 hover:bg-red-100 transition-colors text-left flex items-center justify-between"
            >
              <span className="font-semibold text-red-800 flex items-center gap-2">
                <span>🔴</span>
                <span>Errors ({validationResult.errors.length})</span>
              </span>
              <span className="text-red-600">{expandedSections.errors ? '▼' : '▶'}</span>
            </button>
            {expandedSections.errors && (
              <div className="px-4 py-3 bg-red-50 space-y-2">
                {validationResult.errors.map((error, index) => (
                  <div key={index} className="bg-white border border-red-200 rounded p-3">
                    <p className="text-sm text-red-800 whitespace-pre-wrap">{error}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Warnings Section */}
        {hasWarnings && (
          <div className="border-b border-gray-200">
            <button
              onClick={() => toggleSection('warnings')}
              className="w-full px-4 py-3 bg-yellow-50 hover:bg-yellow-100 transition-colors text-left flex items-center justify-between"
            >
              <span className="font-semibold text-yellow-800 flex items-center gap-2">
                <span>🟡</span>
                <span>Warnings ({validationResult.warnings.length})</span>
              </span>
              <span className="text-yellow-600">{expandedSections.warnings ? '▼' : '▶'}</span>
            </button>
            {expandedSections.warnings && (
              <div className="px-4 py-3 bg-yellow-50 space-y-2">
                {validationResult.warnings.map((warning, index) => (
                  <div key={index} className="bg-white border border-yellow-200 rounded p-3">
                    <p className="text-sm text-yellow-800">{warning}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stripped Components Section */}
        {hasStripped && (
          <div className="border-b border-gray-200">
            <button
              onClick={() => toggleSection('stripped')}
              className="w-full px-4 py-3 bg-orange-50 hover:bg-orange-100 transition-colors text-left flex items-center justify-between"
            >
              <span className="font-semibold text-orange-800 flex items-center gap-2">
                <span>🟠</span>
                <span>Stripped Components ({validationResult.strippedComponents?.length})</span>
              </span>
              <span className="text-orange-600">{expandedSections.stripped ? '▼' : '▶'}</span>
            </button>
            {expandedSections.stripped && (
              <div className="px-4 py-3 bg-orange-50 space-y-2">
                {validationResult.strippedComponents?.map((comp, index) => (
                  <div key={index} className="bg-white border border-orange-200 rounded p-3">
                    <div className="flex items-start gap-2">
                      <span className="font-mono text-sm font-semibold text-orange-900">&lt;{comp.name}&gt;</span>
                      {comp.line && (
                        <span className="text-xs text-orange-600 bg-orange-100 px-2 py-0.5 rounded">
                          Line {comp.line}
                        </span>
                      )}
                    </div>
                    {comp.reason && (
                      <p className="text-xs text-orange-700 mt-1">{comp.reason}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Template Stats Section */}
        {validationResult.stats && (
          <div className="border-b border-gray-200">
            <button
              onClick={() => toggleSection('stats')}
              className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left flex items-center justify-between"
            >
              <span className="font-semibold text-gray-800 flex items-center gap-2">
                <span>📊</span>
                <span>Template Stats</span>
              </span>
              <span className="text-gray-600">{expandedSections.stats ? '▼' : '▶'}</span>
            </button>
            {expandedSections.stats && (
              <div className="px-4 py-3 bg-gray-50 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-white border border-gray-200 rounded p-2">
                    <div className="text-gray-600 text-xs">Nodes</div>
                    <div className="text-gray-900 font-semibold">{validationResult.stats.nodeCount}</div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded p-2">
                    <div className="text-gray-600 text-xs">Max Depth</div>
                    <div className="text-gray-900 font-semibold">{validationResult.stats.maxDepth}</div>
                  </div>
                </div>
                {Object.keys(validationResult.stats.componentCounts).length > 0 && (
                  <div className="bg-white border border-gray-200 rounded p-2">
                    <div className="text-gray-600 text-xs mb-2">Components Used</div>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {Object.entries(validationResult.stats.componentCounts).map(([name, count]) => (
                        <div key={name} className="flex justify-between text-xs">
                          <span className="text-gray-700">{name}</span>
                          <span className="text-gray-900 font-semibold">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 flex gap-2">
        <button
          onClick={onDismiss}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors font-medium"
        >
          {hasErrors ? 'Close' : 'OK'}
        </button>
        {!hasErrors && (hasWarnings || hasStripped) && onSaveAnyway && (
          <button
            onClick={onSaveAnyway}
            className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors font-medium"
          >
            Save Anyway
          </button>
        )}
        {!hasErrors && !hasWarnings && !hasStripped && onSaveAnyway && (
          <button
            onClick={onSaveAnyway}
            className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium"
          >
            Save
          </button>
        )}
      </div>
    </div>
  );
}
