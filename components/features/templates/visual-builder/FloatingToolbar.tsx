import React, { useCallback, useRef, useEffect, useState } from 'react';

interface FloatingToolbarProps {
  visible: boolean;
  targetElement?: HTMLElement | null;
  onFormat: (type: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'link') => void;
  className?: string;
}

/**
 * Floating formatting toolbar that appears when editing text
 * Provides basic formatting options like bold, italic, etc.
 */
export default function FloatingToolbar({
  visible,
  targetElement,
  onFormat,
  className = '',
}: FloatingToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Update position based on target element
  useEffect(() => {
    if (!visible || !targetElement) {
      return;
    }

    const updatePosition = () => {
      if (!targetElement || !toolbarRef.current) {
        return;
      }

      const targetRect = targetElement.getBoundingClientRect();
      const toolbarRect = toolbarRef.current.getBoundingClientRect();

      // Position above the target element, centered horizontally
      let x = targetRect.left + (targetRect.width / 2) - (toolbarRect.width / 2);
      let y = targetRect.top - toolbarRect.height - 10;

      // Keep toolbar within viewport bounds
      const padding = 10;
      x = Math.max(padding, Math.min(x, window.innerWidth - toolbarRect.width - padding));

      // If not enough space above, position below
      if (y < padding) {
        y = targetRect.bottom + 10;
      }
      setPosition({ x, y });
    };

    // Use a small delay to ensure the target element is properly positioned
    const timer = setTimeout(() => {
      updatePosition();
    }, 50);

    // Update position on scroll/resize
    const handleUpdate = () => updatePosition();
    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [visible, targetElement]);

  // Handle toolbar button clicks
  const handleButtonClick = useCallback((formatType: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'link') => {
    onFormat(formatType);
  }, [onFormat]);

  // Handle link creation
  const handleCreateLink = useCallback(() => {
    const url = prompt('Enter URL:');
    if (url) {
      // For now, just call the format handler
      // In a more advanced implementation, this would create actual links
      onFormat('link');
    }
  }, [onFormat]);

  if (!visible) {
    return null;
  }

  return (
    <div
      ref={toolbarRef}
      className={`bg-gray-900 text-white rounded-lg shadow-lg border border-gray-600 p-2 flex items-center gap-1 ${className}`}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 9999,
        minWidth: 'max-content',
      }}
    >
      {/* Bold */}
      <button
        className="p-2 hover:bg-gray-700 rounded text-sm font-bold transition-colors"
        onClick={() => handleButtonClick('bold')}
        title="Bold (Ctrl+B)"
      >
        <span className="font-bold">B</span>
      </button>

      {/* Italic */}
      <button
        className="p-2 hover:bg-gray-700 rounded text-sm italic transition-colors"
        onClick={() => handleButtonClick('italic')}
        title="Italic (Ctrl+I)"
      >
        <span className="italic">I</span>
      </button>

      {/* Underline */}
      <button
        className="p-2 hover:bg-gray-700 rounded text-sm underline transition-colors"
        onClick={() => handleButtonClick('underline')}
        title="Underline (Ctrl+U)"
      >
        <span className="underline">U</span>
      </button>

      {/* Strikethrough */}
      <button
        className="p-2 hover:bg-gray-700 rounded text-sm line-through transition-colors"
        onClick={() => handleButtonClick('strikethrough')}
        title="Strikethrough"
      >
        <span className="line-through">S</span>
      </button>

      <div className="w-px h-6 bg-gray-600 mx-1" />

      {/* Link */}
      <button
        className="p-2 hover:bg-gray-700 rounded text-sm transition-colors"
        onClick={handleCreateLink}
        title="Create Link (Ctrl+K)"
      >
        🔗
      </button>

      {/* Help text */}
      <div className="text-xs text-gray-400 ml-2 px-2">
        Ctrl+Enter to finish
      </div>
    </div>
  );
}