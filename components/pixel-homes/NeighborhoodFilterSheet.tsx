import React, { useEffect, useState } from 'react';
import { PixelIcon } from '@/components/ui/PixelIcon';

export interface FilterState {
  activeOnly: boolean;
  templates: string[];
  palettes: string[];
  sortBy: 'recent' | 'alphabetical' | 'random';
}

interface NeighborhoodFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  availableTemplates: string[];
  availablePalettes: string[];
  resultCount: number;
  totalCount: number;
}

const NeighborhoodFilterSheet: React.FC<NeighborhoodFilterSheetProps> = ({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  availableTemplates,
  availablePalettes,
  resultCount,
  totalCount,
}) => {
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleApply = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters: FilterState = {
      activeOnly: false,
      templates: [],
      palettes: [],
      sortBy: 'recent',
    };
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
  };

  const toggleTemplate = (template: string) => {
    setLocalFilters(prev => ({
      ...prev,
      templates: prev.templates.includes(template)
        ? prev.templates.filter(t => t !== template)
        : [...prev.templates, template],
    }));
  };

  const togglePalette = (palette: string) => {
    setLocalFilters(prev => ({
      ...prev,
      palettes: prev.palettes.includes(palette)
        ? prev.palettes.filter(p => p !== palette)
        : [...prev.palettes, palette],
    }));
  };

  // Template display names
  const templateNames: Record<string, string> = {
    'cozy-cottage': '🏡 Cottage',
    'modern-minimalist': '🏠 Modern',
    'victorian-manor': '🏛️ Victorian',
    'cabin-retreat': '🛖 Cabin',
    'beach-house': '🏖️ Beach',
    'treehouse': '🌳 Treehouse',
  };

  // Palette display names and colors
  const paletteInfo: Record<string, { name: string; colors: string[] }> = {
    'warm-autumn': { name: '🍂 Autumn', colors: ['#D97543', '#C85A3A', '#8B4513'] },
    'cool-winter': { name: '❄️ Winter', colors: ['#5B9BD5', '#7CB9E8', '#4682B4'] },
    'fresh-spring': { name: '🌸 Spring', colors: ['#90EE90', '#98D8C8', '#77DD77'] },
    'bright-summer': { name: '☀️ Summer', colors: ['#FFD700', '#FFA500', '#FF6347'] },
    'pastel-dream': { name: '🌈 Pastel', colors: ['#FFB3BA', '#BAFFC9', '#BAE1FF'] },
    'earth-tones': { name: '🌍 Earth', colors: ['#8B7355', '#A0826D', '#C4A57B'] },
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`bottom-sheet-backdrop ${isOpen ? 'visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom Sheet */}
      <div className={`mobile-bottom-sheet ${isOpen ? 'open' : ''}`}>
        {/* Drag Handle */}
        <div className="bottom-sheet-handle" />

        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Filters & Sorting</h3>
            <button
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 hover:text-gray-700 -mr-2"
              aria-label="Close filters"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Showing {resultCount} of {totalCount} houses
          </p>
        </div>

        {/* Scrollable Content */}
        <div className="bottom-sheet-content">
          <div className="p-4 pb-6 space-y-6 bottom-sheet-safe-area">
            {/* Activity Filter */}
            <div className="space-y-2">
              <label className="flex items-center justify-between min-h-[48px] cursor-pointer">
                <span className="text-base font-medium text-gray-900">Active users only</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={localFilters.activeOnly}
                    onChange={(e) => setLocalFilters({ ...localFilters, activeOnly: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-8 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-thread-pine/20 rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-thread-pine"></div>
                </div>
              </label>
              <p className="text-xs text-gray-600">
                Only show houses of users who have been active in the past 7 days
              </p>
            </div>

            {/* Templates */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-900">House Templates</h4>
              <div className="grid grid-cols-2 gap-2">
                {availableTemplates.map(template => (
                  <button
                    key={template}
                    onClick={() => toggleTemplate(template)}
                    className={`min-h-[48px] px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all
                      ${localFilters.templates.includes(template)
                        ? 'bg-thread-pine text-white border-thread-pine'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-thread-pine'
                      }`}
                  >
                    {templateNames[template] || template}
                  </button>
                ))}
              </div>
            </div>

            {/* Palettes */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-900">Color Palettes</h4>
              <div className="grid grid-cols-2 gap-2">
                {availablePalettes.map(palette => {
                  const info = paletteInfo[palette];
                  return (
                    <button
                      key={palette}
                      onClick={() => togglePalette(palette)}
                      className={`min-h-[48px] px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all
                        ${localFilters.palettes.includes(palette)
                          ? 'bg-thread-pine text-white border-thread-pine'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-thread-pine'
                        }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span>{info?.name || palette}</span>
                        {info && (
                          <div className="flex gap-1">
                            {info.colors.map((color, i) => (
                              <div
                                key={i}
                                className="w-3 h-3 rounded-full border border-white"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sorting */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-900">Sort By</h4>
              <div className="space-y-2">
                {[
                  { value: 'recent' as const, label: 'Recently Active', icon: 'clock' as const, desc: 'Most recently active users first' },
                  { value: 'alphabetical' as const, label: 'Alphabetical', icon: 'sort' as const, desc: 'Sorted by username A-Z' },
                  { value: 'random' as const, label: 'Random', icon: 'dice' as const, desc: 'Shuffle order each time' },
                ].map(option => (
                  <label
                    key={option.value}
                    className={`flex items-start gap-3 min-h-[48px] p-3 rounded-lg border-2 cursor-pointer transition-all
                      ${localFilters.sortBy === option.value
                        ? 'bg-thread-pine bg-opacity-10 border-thread-pine'
                        : 'bg-gray-50 border-gray-200 hover:border-thread-pine'
                      }`}
                  >
                    <input
                      type="radio"
                      name="sortBy"
                      value={option.value}
                      checked={localFilters.sortBy === option.value}
                      onChange={() => setLocalFilters({ ...localFilters, sortBy: option.value })}
                      className="mt-1 w-4 h-4 text-thread-pine focus:ring-thread-pine"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                        <PixelIcon name={option.icon} size={16} />
                        {option.label}
                      </div>
                      <div className="text-xs text-gray-600">{option.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons - Sticky at bottom */}
        <div className="px-4 py-3 border-t border-gray-200 flex gap-3 bg-white flex-shrink-0"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <button
            onClick={handleReset}
            className="flex-1 min-h-[48px] px-4 py-2 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={handleApply}
            className="flex-1 min-h-[48px] px-4 py-2 bg-thread-pine text-white font-semibold rounded-lg hover:bg-opacity-90 transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </>
  );
};

export default NeighborhoodFilterSheet;
