import React, { useState, useEffect, useRef } from "react";
import { PixelIcon } from '@/components/ui/PixelIcon';

type Emoji = {
  id: string;
  name: string;
  imageUrl: string;
};

type EmojiPickerProps = {
  onEmojiSelect: (emojiName: string) => void;
  className?: string;
};

export default function EmojiPicker({ onEmojiSelect, className = "" }: EmojiPickerProps) {
  const [emojis, setEmojis] = useState<Emoji[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState<{ top?: string; bottom?: string; left?: string; right?: string; maxHeight?: string }>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load emojis from API
  useEffect(() => {
    let mounted = true;

    async function loadEmojis() {
      setLoading(true);
      try {
        const response = await fetch('/api/emojis');
        if (response.ok && mounted) {
          const data = await response.json();
          setEmojis(data.emojis || []);
        }
      } catch (error) {
        console.error('Failed to load emojis:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadEmojis();

    return () => {
      mounted = false;
    };
  }, []);

  // Calculate position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      // Default to opening upwards (bottom-full) unless too close to top
      // But actually, for chat inputs at bottom, we usually want to open UP.
      // Let's check space above and below.
      const spaceAbove = buttonRect.top;
      const spaceBelow = viewportHeight - buttonRect.bottom;
      const pickerHeight = 200; // Approx max height
      const pickerWidth = 256; // w-64

      const newPosition: any = {};

      // Vertical positioning
      if (spaceAbove > pickerHeight || spaceAbove > spaceBelow) {
        // Open upwards
        newPosition.bottom = '100%';
        newPosition.marginBottom = '0.25rem'; // mb-1
        newPosition.maxHeight = `${Math.min(spaceAbove - 10, 300)}px`;
      } else {
        // Open downwards
        newPosition.top = '100%';
        newPosition.marginTop = '0.25rem'; // mt-1
        newPosition.maxHeight = `${Math.min(spaceBelow - 10, 300)}px`;
      }

      // Horizontal positioning
      // Check if it would overflow right
      if (buttonRect.left + pickerWidth > viewportWidth) {
        // Align right edge with button right edge
        newPosition.right = '0';
      } else {
        // Align left edge with button left edge
        newPosition.left = '0';
      }

      setPosition(newPosition);
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleEmojiClick = (emoji: Emoji) => {
    onEmojiSelect(emoji.name);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {/* Emoji Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="border border-black px-2 py-1 bg-yellow-200 hover:bg-yellow-100 shadow-[1px_1px_0_#000] transition-all text-sm flex items-center justify-center h-full"
        title="Insert emoji"
      >
        <PixelIcon name="mood-happy" size={16} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute bg-white border border-black shadow-[2px_2px_0_#000] z-50 w-64 overflow-y-auto mobile-emoji-picker"
          style={{
            ...position,
            maxWidth: 'calc(100vw - 2rem)',
          }}
        >
          {loading ? (
            <div className="p-3 text-center text-sm text-gray-500">Loading emojis...</div>
          ) : emojis.length === 0 ? (
            <div className="p-3 text-center text-sm text-gray-500">
              No custom emojis available
              <div className="text-xs mt-1">Ask an admin to add some!</div>
            </div>
          ) : (
            <>
              <div className="p-2 border-b border-gray-200 bg-gray-50 text-xs font-bold sticky top-0 z-10">
                Custom Emojis ({emojis.length})
              </div>
              <div className="grid grid-cols-6 sm:grid-cols-6 grid-cols-5 gap-1 p-2">
                {emojis.map((emoji) => (
                  <button
                    key={emoji.id}
                    type="button"
                    onClick={() => handleEmojiClick(emoji)}
                    className="hover:bg-gray-100 active:bg-gray-200 border border-transparent hover:border-gray-300 rounded transition-all group flex items-center justify-center
                               w-10 h-10 sm:w-10 sm:h-10 
                               min-h-[44px] min-w-[44px] sm:min-h-[40px] sm:min-w-[40px]"
                    title={`:${emoji.name}:`}
                  >
                    <img
                      src={emoji.imageUrl}
                      alt={emoji.name}
                      className="w-6 h-6 sm:w-6 sm:h-6 object-contain"
                      style={{
                        imageRendering: '-webkit-optimize-contrast',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'translateZ(0)',
                        filter: 'contrast(1.05)'
                      }}
                      onError={(e) => {
                        // Hide broken images
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </button>
                ))}
              </div>
              <div className="p-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-600 sticky bottom-0 z-10">
                Tap an emoji to insert it as :name:
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}