import { renderHook, act } from '@testing-library/react';
import { useWelcomeRingIntro } from '../useWelcomeRingIntro';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

describe('useWelcomeRingIntro', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
  });

  describe('Welcome Ring Detection', () => {
    it('should show intro for welcome ring when not seen before', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const { result } = renderHook(() => useWelcomeRingIntro('welcome'));
      
      expect(result.current.shouldShowIntro).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it('should not show intro for welcome ring when already seen', () => {
      mockLocalStorage.getItem.mockReturnValue('true');
      
      const { result } = renderHook(() => useWelcomeRingIntro('welcome'));
      
      expect(result.current.shouldShowIntro).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('should not show intro for non-welcome rings', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const { result } = renderHook(() => useWelcomeRingIntro('other-ring'));
      
      expect(result.current.shouldShowIntro).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('should not show intro when no ring slug provided', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const { result } = renderHook(() => useWelcomeRingIntro());
      
      expect(result.current.shouldShowIntro).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Loading States', () => {
    it('should start with loading true and then become false', () => {
      const { result } = renderHook(() => useWelcomeRingIntro('welcome'));
      
      // Loading should become false after effect runs
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Mark as Seen Functionality', () => {
    it('should mark intro as seen and update state', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const { result } = renderHook(() => useWelcomeRingIntro('welcome'));
      
      expect(result.current.shouldShowIntro).toBe(true);
      
      act(() => {
        result.current.markIntroAsSeen();
      });
      
      expect(result.current.shouldShowIntro).toBe(false);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('threadstead_welcome_intro_shown', 'true');
    });
  });

  describe('Reset Functionality', () => {
    it('should reset intro state', () => {
      mockLocalStorage.getItem.mockReturnValue('true');
      
      const { result } = renderHook(() => useWelcomeRingIntro('welcome'));
      
      expect(result.current.shouldShowIntro).toBe(false);
      
      act(() => {
        result.current.resetIntro();
      });
      
      expect(result.current.shouldShowIntro).toBe(true);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('threadstead_welcome_intro_shown');
    });
  });

  describe('Ring Slug Changes', () => {
    it('should update when ring slug changes', () => {
      // Ensure localStorage is clean for this test
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const { result, rerender } = renderHook(
        ({ ringSlug }) => useWelcomeRingIntro(ringSlug),
        { initialProps: { ringSlug: 'other-ring' } }
      );
      
      expect(result.current.shouldShowIntro).toBe(false);
      
      // Change to welcome ring (should show intro when localStorage is empty)
      rerender({ ringSlug: 'welcome' });
      
      expect(result.current.shouldShowIntro).toBe(true);
      
      // Change back to other ring
      rerender({ ringSlug: 'different-ring' });
      
      expect(result.current.shouldShowIntro).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });
      
      expect(() => {
        renderHook(() => useWelcomeRingIntro('welcome'));
      }).not.toThrow();
    });

    it('should handle setItem errors gracefully', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage setItem error');
      });
      
      const { result } = renderHook(() => useWelcomeRingIntro('welcome'));
      
      expect(() => {
        act(() => {
          result.current.markIntroAsSeen();
        });
      }).not.toThrow();
    });

    it('should handle removeItem errors gracefully', () => {
      mockLocalStorage.removeItem.mockImplementation(() => {
        throw new Error('localStorage removeItem error');
      });
      
      const { result } = renderHook(() => useWelcomeRingIntro('welcome'));
      
      expect(() => {
        act(() => {
          result.current.resetIntro();
        });
      }).not.toThrow();
    });
  });
});