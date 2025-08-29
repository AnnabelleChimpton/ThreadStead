import React, { useState, useEffect, useRef } from "react";

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

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="border border-black px-2 py-1 bg-yellow-200 hover:bg-yellow-100 shadow-[1px_1px_0_#000] transition-all text-sm"
        title="Insert emoji"
      >
        😀
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute bottom-full right-0 mb-1 bg-white border border-black shadow-[2px_2px_0_#000] z-50 w-64 max-h-48 overflow-y-auto">
          {loading ? (
            <div className="p-3 text-center text-sm text-gray-500">Loading emojis...</div>
          ) : emojis.length === 0 ? (
            <div className="p-3 text-center text-sm text-gray-500">
              No custom emojis available
              <div className="text-xs mt-1">Ask an admin to add some!</div>
            </div>
          ) : (
            <>
              <div className="p-2 border-b border-gray-200 bg-gray-50 text-xs font-bold">
                Custom Emojis ({emojis.length})
              </div>
              <div className="grid grid-cols-6 gap-1 p-2">
                {emojis.map((emoji) => (
                  <button
                    key={emoji.id}
                    type="button"
                    onClick={() => handleEmojiClick(emoji)}
                    className="p-2 hover:bg-gray-100 border border-transparent hover:border-gray-300 rounded transition-all group"
                    title={`:${emoji.name}:`}
                  >
                    <img
                      src={emoji.imageUrl}
                      alt={emoji.name}
                      className="w-6 h-6 mx-auto"
                      onError={(e) => {
                        // Hide broken images
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </button>
                ))}
              </div>
              <div className="p-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-600">
                Click an emoji to insert it as :name:
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}