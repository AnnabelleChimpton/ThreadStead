import { 
  getWelcomeProgress, 
  updateWelcomeProgress, 
  saveWelcomeProgress, 
  clearWelcomeProgress,
  getDefaultProgress,
  isWelcomeGraduate
} from '../progress';

// Mock localStorage
const localStorageMock = (() => {
  const mockObj: any = {
    __store: {} as Record<string, string>,
    getItem: jest.fn((key: string) => mockObj.__store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      mockObj.__store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete mockObj.__store[key];
    }),
    clear: jest.fn(() => {
      mockObj.__store = {};
    })
  };
  return mockObj;
})();

// Mock window.dispatchEvent
const mockDispatchEvent = jest.fn();

// Mock window object
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

Object.defineProperty(window, 'dispatchEvent', {
  value: mockDispatchEvent
});

describe('Welcome Progress System', () => {
  beforeEach(() => {
    localStorageMock.clear();
    // Clear all mock call history and reset to original implementations
    jest.clearAllMocks();
    // Restore the localStorage mock implementations
    Object.assign(localStorageMock, {
      getItem: jest.fn((key: string) => (localStorageMock as any).__store[key] || null),
      setItem: jest.fn((key: string, value: string) => {
        (localStorageMock as any).__store[key] = value;
      }),
      removeItem: jest.fn((key: string) => {
        delete (localStorageMock as any).__store[key];
      }),
      clear: jest.fn(() => {
        (localStorageMock as any).__store = {};
      })
    });
    (localStorageMock as any).__store = {};
  });

  describe('getDefaultProgress', () => {
    it('should return all steps as incomplete', () => {
      const defaultProgress = getDefaultProgress();
      
      expect(defaultProgress).toEqual({
        joinedRing: false,
        readFirstPost: false,
        leftFirstComment: false,
        visitedProfile: false,
        browseRings: false,
        completedWelcome: false
      });
    });
  });

  describe('getWelcomeProgress', () => {
    it('should return default progress when localStorage is empty', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const progress = getWelcomeProgress();
      
      expect(progress).toEqual(getDefaultProgress());
      expect(localStorageMock.getItem).toHaveBeenCalledWith('threadstead_welcome_progress');
    });

    it('should return saved progress from localStorage', () => {
      const savedProgress = {
        joinedRing: true,
        readFirstPost: true,
        leftFirstComment: false,
        visitedProfile: false,
        browseRings: false,
        completedWelcome: false,
        startedAt: '2024-01-01T00:00:00.000Z'
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedProgress));
      
      const progress = getWelcomeProgress();
      
      expect(progress).toEqual(savedProgress);
    });

    it('should handle corrupted localStorage data gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');
      
      const progress = getWelcomeProgress();
      
      expect(progress).toEqual(getDefaultProgress());
    });

    it('should handle partial progress data', () => {
      const partialProgress = {
        joinedRing: true,
        readFirstPost: true
        // Missing other fields
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(partialProgress));
      
      const progress = getWelcomeProgress();
      
      expect(progress).toEqual({
        joinedRing: true,
        readFirstPost: true,
        leftFirstComment: false,
        visitedProfile: false,
        browseRings: false,
        completedWelcome: false
      });
    });
  });

  describe('saveWelcomeProgress', () => {
    it('should save progress to localStorage', () => {
      const progress = {
        joinedRing: true,
        readFirstPost: false,
        leftFirstComment: false,
        visitedProfile: false,
        browseRings: false,
        completedWelcome: false,
        startedAt: '2024-01-01T00:00:00.000Z'
      };
      
      saveWelcomeProgress(progress);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'threadstead_welcome_progress',
        JSON.stringify(progress)
      );
    });

    it('should auto-complete when all steps are done', () => {
      const progress = {
        joinedRing: true,
        readFirstPost: true,
        leftFirstComment: true,
        visitedProfile: true,
        browseRings: true,
        completedWelcome: false
      };
      
      const result = saveWelcomeProgress(progress);
      
      // Check the returned progress object
      expect(result.completedWelcome).toBe(true);
      expect(result.completedAt).toBeDefined();
      
      // Also check that localStorage was called
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'threadstead_welcome_progress',
        expect.stringContaining('"completedWelcome":true')
      );
    });

    it('should not auto-complete when some steps are missing', () => {
      const progress = {
        joinedRing: true,
        readFirstPost: true,
        leftFirstComment: true,
        visitedProfile: false, // Missing this step
        browseRings: true,
        completedWelcome: false
      };
      
      saveWelcomeProgress(progress);
      
      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData.completedWelcome).toBe(false);
      expect(savedData.completedAt).toBeUndefined();
    });

    it('should preserve existing completedAt when already completed', () => {
      const existingCompletedAt = '2024-01-01T12:00:00.000Z';
      const progress = {
        joinedRing: true,
        readFirstPost: true,
        leftFirstComment: true,
        visitedProfile: true,
        browseRings: true,
        completedWelcome: true,
        completedAt: existingCompletedAt
      };
      
      const result = saveWelcomeProgress(progress);
      
      // Should not overwrite existing completedAt
      expect(result.completedAt).toBe(existingCompletedAt);
      
      // Check that localStorage was called with preserved completedAt
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'threadstead_welcome_progress',
        expect.stringContaining(`"completedAt":"${existingCompletedAt}"`)
      );
    });
  });

  describe('updateWelcomeProgress', () => {
    it('should update specific fields while preserving others', () => {
      const existingProgress = {
        joinedRing: true,
        readFirstPost: false,
        leftFirstComment: false,
        visitedProfile: false,
        browseRings: false,
        completedWelcome: false,
        startedAt: '2024-01-01T00:00:00.000Z'
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingProgress));
      
      const updated = updateWelcomeProgress({ readFirstPost: true });
      
      expect(updated).toEqual({
        joinedRing: true,
        readFirstPost: true,
        leftFirstComment: false,
        visitedProfile: false,
        browseRings: false,
        completedWelcome: false,
        startedAt: '2024-01-01T00:00:00.000Z'
      });
    });

    it('should set startedAt on first action', () => {
      localStorageMock.getItem.mockReturnValue(null); // No existing progress
      
      const beforeUpdate = Date.now();
      const updated = updateWelcomeProgress({ joinedRing: true });
      const afterUpdate = Date.now();
      
      expect(updated.startedAt).toBeDefined();
      const startedAt = new Date(updated.startedAt!).getTime();
      expect(startedAt).toBeGreaterThanOrEqual(beforeUpdate);
      expect(startedAt).toBeLessThanOrEqual(afterUpdate);
    });

    it('should not update startedAt if already set', () => {
      const existingStartedAt = '2024-01-01T00:00:00.000Z';
      const existingProgress = {
        joinedRing: true,
        readFirstPost: false,
        leftFirstComment: false,
        visitedProfile: false,
        browseRings: false,
        completedWelcome: false,
        startedAt: existingStartedAt
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingProgress));
      
      const updated = updateWelcomeProgress({ readFirstPost: true });
      
      expect(updated.startedAt).toBe(existingStartedAt);
    });

    it('should dispatch welcomeProgressUpdate event', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const updated = updateWelcomeProgress({ joinedRing: true });
      
      expect(mockDispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'welcomeProgressUpdate',
          detail: updated
        })
      );
    });

    it('should handle multiple updates at once', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const updated = updateWelcomeProgress({ 
        joinedRing: true, 
        readFirstPost: true,
        leftFirstComment: true 
      });
      
      expect(updated.joinedRing).toBe(true);
      expect(updated.readFirstPost).toBe(true);
      expect(updated.leftFirstComment).toBe(true);
    });
  });

  describe('clearWelcomeProgress', () => {
    it('should remove progress from localStorage', () => {
      clearWelcomeProgress();
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('threadstead_welcome_progress');
    });

    it('should handle missing localStorage gracefully in SSR', () => {
      const originalWindow = global.window;
      delete (global as any).window;
      
      expect(() => clearWelcomeProgress()).not.toThrow();
      
      global.window = originalWindow;
    });
  });

  describe('isWelcomeGraduate', () => {
    it('should return true when user has completed welcome', () => {
      const completedProgress = {
        joinedRing: true,
        readFirstPost: true,
        leftFirstComment: true,
        visitedProfile: true,
        browseRings: true,
        completedWelcome: true
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(completedProgress));
      
      expect(isWelcomeGraduate()).toBe(true);
    });

    it('should return false when user has not completed welcome', () => {
      const incompleteProgress = {
        joinedRing: true,
        readFirstPost: true,
        leftFirstComment: false,
        visitedProfile: false,
        browseRings: false,
        completedWelcome: false
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(incompleteProgress));
      
      expect(isWelcomeGraduate()).toBe(false);
    });

    it('should return false for new users', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      expect(isWelcomeGraduate()).toBe(false);
    });
  });

  describe('SSR Safety', () => {
    it('should handle missing window object gracefully', () => {
      const originalWindow = global.window;
      delete (global as any).window;
      
      expect(() => getWelcomeProgress()).not.toThrow();
      expect(() => updateWelcomeProgress({ joinedRing: true })).not.toThrow();
      expect(() => saveWelcomeProgress(getDefaultProgress())).not.toThrow();
      expect(() => clearWelcomeProgress()).not.toThrow();
      
      global.window = originalWindow;
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete user journey', () => {
      // Start with no progress - localStorage is already cleared in beforeEach
      
      // Step 1: Join ring
      let progress = updateWelcomeProgress({ joinedRing: true });
      expect(progress.joinedRing).toBe(true);
      expect(progress.startedAt).toBeDefined();
      expect(progress.completedWelcome).toBe(false);
      
      // Step 2: Read first post
      progress = updateWelcomeProgress({ readFirstPost: true });
      expect(progress.readFirstPost).toBe(true);
      expect(progress.completedWelcome).toBe(false);
      
      // Step 3: Leave first comment
      progress = updateWelcomeProgress({ leftFirstComment: true });
      expect(progress.leftFirstComment).toBe(true);
      expect(progress.completedWelcome).toBe(false);
      
      // Step 4: Visit profile
      progress = updateWelcomeProgress({ visitedProfile: true });
      expect(progress.visitedProfile).toBe(true);
      expect(progress.completedWelcome).toBe(false);
      
      // Step 5: Browse rings (should auto-complete)
      progress = updateWelcomeProgress({ browseRings: true });
      expect(progress.browseRings).toBe(true);
      expect(progress.completedWelcome).toBe(true);
      expect(progress.completedAt).toBeDefined();
      
      // Verify graduate status
      expect(isWelcomeGraduate()).toBe(true);
    });

    it('should handle out-of-order step completion', () => {
      // Start with no progress - localStorage is already cleared in beforeEach
      
      // Complete steps out of order
      updateWelcomeProgress({ browseRings: true });
      updateWelcomeProgress({ visitedProfile: true });
      updateWelcomeProgress({ leftFirstComment: true });
      updateWelcomeProgress({ readFirstPost: true });
      
      // Should not be complete yet (missing joinedRing)
      expect(isWelcomeGraduate()).toBe(false);
      
      // Complete final step
      const finalProgress = updateWelcomeProgress({ joinedRing: true });
      
      // Should now be complete
      expect(finalProgress.completedWelcome).toBe(true);
      expect(isWelcomeGraduate()).toBe(true);
    });

    it('should handle repeated updates to same step', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      // Set a step multiple times
      updateWelcomeProgress({ joinedRing: true });
      const progress1 = updateWelcomeProgress({ joinedRing: true });
      const progress2 = updateWelcomeProgress({ joinedRing: true });
      
      expect(progress1.joinedRing).toBe(true);
      expect(progress2.joinedRing).toBe(true);
      expect(progress1.startedAt).toBe(progress2.startedAt); // Should not change
    });
  });
});