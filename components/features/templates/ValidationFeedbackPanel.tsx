// Validation feedback panel for template editor
import React, { useState } from 'react';
import { PixelIcon } from '@/components/ui/PixelIcon';

export type StrippedCategory = 'document' | 'unsupported' | 'safety';

export interface StrippedEntry {
  name: string;
  line?: number;
  reason?: string;
  /** 'document' wrappers (expected), 'unsupported' here, or removed for 'safety' */
  category?: StrippedCategory;
  /** Further occurrences of the same tag */
  count?: number;
}

/**
 * Whether any stripped tag is worth stopping a save for. Document wrappers
 * (<html>, <head>, <body>…) are expected when a whole page is pasted.
 */
export function hasStrippedNeedingAttention(entries: StrippedEntry[] | undefined): boolean {
  return (entries || []).some((entry) => entry.category !== 'document');
}

const STRIPPED_GROUPS: Array<{
  category: StrippedCategory;
  title: string;
  /** Summary-line ending after "N tag(s)" */
  summary: string;
  /** The reason's leading label, which the group title already says */
  reasonPrefix: RegExp;
  header: string;
  body: string;
  card: string;
  tagText: string;
  noteText: string;
  lineBadge: string;
}> = [
  {
    category: 'document',
    title: 'Document wrappers (expected)',
    summary: 'set aside',
    reasonPrefix: /^Document wrapper \(expected\):\s*/,
    header: 'bg-gray-50 hover:bg-gray-100 text-gray-800',
    body: 'bg-gray-50',
    card: 'border-gray-200',
    tagText: 'text-gray-900',
    noteText: 'text-gray-600',
    lineBadge: 'text-gray-600 bg-gray-100',
  },
  {
    category: 'unsupported',
    title: 'Not supported here',
    summary: 'not supported here',
    reasonPrefix: /^Not supported here( as written)?:\s*/,
    header: 'bg-orange-50 hover:bg-orange-100 text-orange-800',
    body: 'bg-orange-50',
    card: 'border-orange-200',
    tagText: 'text-orange-900',
    noteText: 'text-orange-700',
    lineBadge: 'text-orange-600 bg-orange-100',
  },
  {
    category: 'safety',
    title: 'Removed for safety',
    summary: 'removed for safety',
    reasonPrefix: /^Removed for safety(:\s*|\.$)/,
    header: 'bg-red-50 hover:bg-red-100 text-red-800',
    body: 'bg-red-50',
    card: 'border-red-200',
    tagText: 'text-red-900',
    noteText: 'text-red-700',
    lineBadge: 'text-red-600 bg-red-100',
  },
];

/** Entries with no category come from older compiles; treat them as unsupported */
function categoryOf(entry: StrippedEntry): StrippedCategory {
  return entry.category ?? 'unsupported';
}

function occurrences(entry: StrippedEntry): number {
  return 1 + (entry.count || 0);
}

export interface ValidationFeedbackProps {
  validationResult: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    strippedComponents?: StrippedEntry[];
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
    document: false,
    unsupported: true,
    safety: true,
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
  const stripped = validationResult.strippedComponents || [];
  const strippedGroups = STRIPPED_GROUPS
    .map((group) => {
      const entries = stripped.filter((entry) => categoryOf(entry) === group.category);
      return { ...group, entries, total: entries.reduce((sum, entry) => sum + occurrences(entry), 0) };
    })
    .filter((group) => group.entries.length > 0);
  const documentGroup = strippedGroups.find((group) => group.category === 'document');
  // Only tags that aren't expected wrappers count as a problem
  const hasStripped = hasStrippedNeedingAttention(stripped);

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
              <span className="text-xl">✗</span>
              <span>{validationResult.errors.length} Error{validationResult.errors.length !== 1 ? 's' : ''} (Must Fix)</span>
            </div>
          )}
          {hasWarnings && (
            <div className="text-yellow-700 font-medium flex items-center gap-2">
              <PixelIcon name="warning-box" size={20} />
              <span>{validationResult.warnings.length} Warning{validationResult.warnings.length !== 1 ? 's' : ''}</span>
            </div>
          )}
          {strippedGroups
            .filter((group) => group.category !== 'document')
            .map((group) => (
              <div key={group.category} className={`${group.noteText} font-medium flex items-center gap-2`}>
                <PixelIcon name="trash" size={20} />
                <span>{group.total} tag{group.total !== 1 ? 's' : ''} {group.summary}</span>
              </div>
            ))}
          {!hasErrors && !hasWarnings && !hasStripped && (
            <div className="text-green-700 font-medium flex items-center gap-2">
              <span className="text-xl">✓</span>
              <span>Template is valid!</span>
            </div>
          )}
          {documentGroup && (
            <div className="text-gray-600 text-sm">
              Only what’s inside &lt;body&gt; becomes your page; the {documentGroup.total} document tag{documentGroup.total !== 1 ? 's' : ''} around it {documentGroup.total !== 1 ? 'were' : 'was'} set aside.
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

        {/* Stripped tags, grouped: expected wrappers, not supported here, removed for safety */}
        {strippedGroups.map((group) => (
          <div key={group.category} className="border-b border-gray-200">
            <button
              onClick={() => toggleSection(group.category)}
              className={`w-full px-4 py-3 ${group.header} transition-colors text-left flex items-center justify-between`}
              aria-expanded={expandedSections[group.category]}
            >
              <span className="font-semibold flex items-center gap-2">
                <span>{group.title} ({group.total})</span>
              </span>
              <span>{expandedSections[group.category] ? '▼' : '▶'}</span>
            </button>
            {expandedSections[group.category] && (
              <div className={`px-4 py-3 ${group.body} space-y-2`}>
                {group.entries.map((entry, index) => {
                  const times = occurrences(entry);
                  const rest = entry.reason?.replace(group.reasonPrefix, '').trim();
                  const note = rest && rest.charAt(0).toUpperCase() + rest.slice(1);
                  return (
                    <div key={index} className={`bg-white border ${group.card} rounded p-3`}>
                      <div className="flex items-start gap-2 flex-wrap">
                        <span className={`font-mono text-sm font-semibold ${group.tagText}`}>&lt;{entry.name}&gt;</span>
                        {times > 1 && (
                          <span className={`text-xs ${group.lineBadge} px-2 py-0.5 rounded`}>
                            {times} times
                          </span>
                        )}
                        {entry.line && (
                          <span className={`text-xs ${group.lineBadge} px-2 py-0.5 rounded`}>
                            {times > 1 ? 'First on line' : 'Line'} {entry.line}
                          </span>
                        )}
                      </div>
                      {note && (
                        <p className={`text-xs ${group.noteText} mt-1`}>{note}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {/* Template Stats Section */}
        {validationResult.stats && (
          <div className="border-b border-gray-200">
            <button
              onClick={() => toggleSection('stats')}
              className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left flex items-center justify-between"
            >
              <span className="font-semibold text-gray-800 flex items-center gap-2">
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
