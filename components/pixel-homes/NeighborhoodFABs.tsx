import React from 'react';

interface NeighborhoodFABsProps {
  onFilterClick: () => void;
  onRandomClick: () => void;
  onViewModeClick?: () => void;
  onBookmarksClick?: () => void;
  hasBookmarks?: boolean;
  filterActive?: boolean;
  filterCount?: number;
}

const NeighborhoodFABs: React.FC<NeighborhoodFABsProps> = ({
  onFilterClick,
  onRandomClick,
  onViewModeClick,
  onBookmarksClick,
  hasBookmarks = false,
  filterActive = false,
  filterCount = 0,
}) => {
  return (
    <>
      {/* Primary FAB - Filter/Sort */}
      <button
        onClick={onFilterClick}
        className={`fixed bottom-[calc(0.5rem+env(safe-area-inset-bottom,0px))] right-4 z-[9999]
          flex items-center justify-center gap-2
          min-h-[56px] min-w-[56px]
          md:min-h-[48px] md:px-4
          rounded-full shadow-lg
          transition-all duration-200 ease-out
          active:scale-95 active:shadow-md
          ${filterActive
            ? 'bg-thread-sunset text-white border-2 border-white'
            : 'bg-white text-thread-pine border-2 border-thread-pine'
          }
          hover:shadow-xl relative`}
        aria-label="Open filters and sorting menu"
      >
        <span className="text-xl md:text-lg">⚙️</span>
        <span className="hidden md:inline text-sm font-semibold button-text">
          Filters
        </span>
        {filterCount > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-thread-sunset text-white text-xs rounded-full flex items-center justify-center font-bold shadow-md">
            {filterCount}
          </div>
        )}
      </button>

      {/* Secondary FAB - Random Jump */}
      <button
        onClick={onRandomClick}
        className="fixed bottom-[calc(0.5rem+env(safe-area-inset-bottom,0px))] left-4 z-[9999]
          flex items-center justify-center gap-2
          min-h-[56px] min-w-[56px]
          md:min-h-[48px] md:px-4
          rounded-full shadow-lg
          bg-thread-pine text-white border-2 border-white
          transition-all duration-200 ease-out
          active:scale-95 active:shadow-md
          hover:shadow-xl"
        aria-label="Jump to random house"
      >
        <span className="text-xl md:text-lg">🎲</span>
        <span className="hidden md:inline text-sm font-semibold button-text">
          Random
        </span>
      </button>

      {/* View Mode Switcher FAB (Mobile only) */}
      {onViewModeClick && (
        <button
          onClick={onViewModeClick}
          className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] left-4 z-[9999] md:hidden
            flex items-center justify-center
            min-h-[48px] min-w-[48px]
            rounded-full shadow-lg
            bg-white text-thread-pine border-2 border-thread-pine
            transition-all duration-200 ease-out
            active:scale-95 active:shadow-md
            hover:shadow-xl"
          aria-label="Change view mode"
        >
          <span className="text-lg">👁️</span>
        </button>
      )}

      {/* Tertiary FAB - Bookmarks (Conditional) */}
      {hasBookmarks && onBookmarksClick && (
        <button
          onClick={onBookmarksClick}
          className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] right-4 z-[9999]
            flex items-center justify-center
            min-h-[48px] min-w-[48px]
            rounded-full shadow-lg
            bg-thread-accent text-white border-2 border-white
            transition-all duration-200 ease-out
            active:scale-95 active:shadow-md
            hover:shadow-xl"
          aria-label="View bookmarked houses"
        >
          <span className="text-lg">⭐</span>
        </button>
      )}
    </>
  );
};

export default NeighborhoodFABs;
