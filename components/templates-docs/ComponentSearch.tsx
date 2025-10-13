import React from "react";

interface ComponentSearchProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  categories: Array<{ id: string; title: string; icon: string; color: string }>;
  availabilityFilter?: 'all' | 'visual-builder' | 'code-only';
  onAvailabilityFilterChange?: (filter: 'all' | 'visual-builder' | 'code-only') => void;
}

export default function ComponentSearch({
  searchTerm,
  onSearchChange,
  activeCategory,
  onCategoryChange,
  categories,
  availabilityFilter = 'all',
  onAvailabilityFilterChange,
}: ComponentSearchProps) {
  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          placeholder="🔍 Search components..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-6 py-4 text-lg border-3 border-black shadow-[4px_4px_0_#000] focus:shadow-[6px_6px_0_#000] focus:outline-none transition-all"
        />
        {searchTerm && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 px-3 py-1 bg-red-200 border-2 border-black shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all font-bold"
          >
            ✕
          </button>
        )}
      </div>

      {/* Availability Filter */}
      {onAvailabilityFilterChange && (
        <div className="flex flex-wrap gap-2 pb-4 border-b-2 border-gray-300">
          <div className="w-full text-sm font-bold text-gray-700 mb-2">Component Availability:</div>
          <button
            onClick={() => onAvailabilityFilterChange('all')}
            className={`px-4 py-2 border-2 border-black shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all font-medium ${
              availabilityFilter === 'all'
                ? 'bg-gray-800 text-white font-bold'
                : 'bg-white hover:bg-gray-50'
            }`}
          >
            🌐 All Components
          </button>
          <button
            onClick={() => onAvailabilityFilterChange('visual-builder')}
            className={`px-4 py-2 border-2 border-black shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all font-medium ${
              availabilityFilter === 'visual-builder'
                ? 'bg-purple-300 text-black font-bold'
                : 'bg-white hover:bg-gray-50'
            }`}
          >
            🎨 Visual Builder
          </button>
          <button
            onClick={() => onAvailabilityFilterChange('code-only')}
            className={`px-4 py-2 border-2 border-black shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all font-medium ${
              availabilityFilter === 'code-only'
                ? 'bg-cyan-300 text-black font-bold'
                : 'bg-white hover:bg-gray-50'
            }`}
          >
            💻 Code Only
          </button>
        </div>
      )}

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onCategoryChange('all')}
          className={`px-4 py-2 border-2 border-black shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all font-medium ${
            activeCategory === 'all'
              ? 'bg-gray-800 text-white'
              : 'bg-white hover:bg-gray-50'
          }`}
        >
          All Categories
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={`px-4 py-2 border-2 border-black shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] transition-all font-medium ${
              activeCategory === category.id
                ? `${category.color} font-bold`
                : 'bg-white hover:bg-gray-50'
            }`}
          >
            <span className="mr-1">{category.icon}</span>
            <span className="hidden sm:inline">{category.title}</span>
          </button>
        ))}
      </div>

      {/* Results Count */}
      {searchTerm && (
        <div className="text-sm text-gray-600 italic">
          Searching for &quot;{searchTerm}&quot;...
        </div>
      )}
    </div>
  );
}
