// Tests for island hydration system
/**
 * @jest-environment jsdom
 */

// Mock React DOM createRoot
jest.mock('react-dom/client');

import { hydrateProfileIslands, cleanupIslands, isIslandsSupported } from '../hydrator';
import type { HydrationContext, Island } from '../hydrator';
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider';
import { createRoot } from 'react-dom/client';

// Mock ProfileIslandWrapper
jest.mock('@/components/islands/ProfileIslandWrapper', () => ({
  __esModule: true,
  default: ({ componentType, islandId }: any) => `MockedIsland-${componentType}-${islandId}`
}));

// Set up React DOM mocks
const mockRender = jest.fn();
const mockUnmount = jest.fn();
const mockCreateRoot = jest.fn(() => ({
  render: mockRender,
  unmount: mockUnmount
}));

(createRoot as jest.Mock).mockImplementation(mockCreateRoot);

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeAll(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

describe('Island Hydration System', () => {
  const mockResidentData: ResidentData = {
    owner: {
      id: 'user123',
      handle: 'testuser',
      displayName: 'Test User',
      avatarUrl: '/test-avatar.png'
    },
    viewer: { id: null },
    posts: [],
    guestbook: [],
    capabilities: {},
    images: [],
    profileImages: []
  };

  const mockIslands: Island[] = [
    {
      id: 'island-1',
      component: 'ProfilePhoto',
      props: { size: 'lg' },
      placeholder: '<div data-island="island-1" data-component="ProfilePhoto"></div>'
    },
    {
      id: 'island-2', 
      component: 'DisplayName',
      props: { as: 'h1' },
      placeholder: '<div data-island="island-2" data-component="DisplayName"></div>'
    }
  ];

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
    
    // Reset island storage first
    cleanupIslands();
    
    // Clear mocks after cleanup
    jest.clearAllMocks();
    mockRender.mockClear();
    mockUnmount.mockClear();
    mockCreateRoot.mockClear();
  });

  describe('isIslandsSupported', () => {
    it('should detect island support correctly', () => {
      expect(isIslandsSupported()).toBe(true);
    });
  });

  describe('hydrateProfileIslands', () => {
    it('should successfully hydrate islands', async () => {
      // Setup DOM with island placeholders
      document.body.innerHTML = `
        <div id="test-container">
          <div data-island="island-1" data-component="ProfilePhoto"></div>
          <div data-island="island-2" data-component="DisplayName"></div>
        </div>
      `;

      const context: HydrationContext = {
        containerId: 'test-container',
        residentData: mockResidentData,
        profileMode: 'advanced',
        islands: mockIslands
      };

      const result = await hydrateProfileIslands(context);

      expect(result.hydratedCount).toBe(2);
      expect(result.failedCount).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockCreateRoot).toHaveBeenCalledTimes(2);
      expect(mockRender).toHaveBeenCalledTimes(2);
    });

    it('should handle missing container', async () => {
      const context: HydrationContext = {
        containerId: 'nonexistent-container',
        residentData: mockResidentData,
        profileMode: 'advanced',
        islands: mockIslands
      };

      await expect(hydrateProfileIslands(context)).rejects.toThrow(
        'Container with ID "nonexistent-container" not found'
      );
    });

    it('should handle islands with missing configuration', async () => {
      document.body.innerHTML = `
        <div id="test-container">
          <div data-island="island-1" data-component="ProfilePhoto"></div>
          <div data-island="unknown-island" data-component="UnknownComponent"></div>
        </div>
      `;

      const context: HydrationContext = {
        containerId: 'test-container',
        residentData: mockResidentData,
        profileMode: 'advanced',
        islands: [mockIslands[0]] // Only include first island
      };

      const result = await hydrateProfileIslands(context);

      expect(result.hydratedCount).toBe(1);
      expect(result.failedCount).toBe(0); // Missing config is warned, not failed
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Island configuration not found for unknown-island')
      );
    });

    it('should handle placeholders with missing attributes', async () => {
      document.body.innerHTML = `
        <div id="test-container">
          <div data-island="island-1" data-component="ProfilePhoto"></div>
          <div data-island=""><!-- Missing component type --></div>
          <div data-component="SomeComponent"><!-- Missing island id --></div>
        </div>
      `;

      const context: HydrationContext = {
        containerId: 'test-container',
        residentData: mockResidentData,
        profileMode: 'advanced',
        islands: mockIslands
      };

      const result = await hydrateProfileIslands(context);

      expect(result.hydratedCount).toBe(1);
      expect(result.failedCount).toBe(0);
      expect(console.warn).toHaveBeenCalledWith(
        'Island placeholder missing required attributes:', expect.any(Element)
      );
    });

    it('should track performance metrics', async () => {
      document.body.innerHTML = `
        <div id="test-container">
          <div data-island="island-1" data-component="ProfilePhoto"></div>
        </div>
      `;

      const context: HydrationContext = {
        containerId: 'test-container',
        residentData: mockResidentData,
        profileMode: 'advanced',
        islands: [mockIslands[0]]
      };

      const result = await hydrateProfileIslands(context);

      expect(result.startTime).toBeGreaterThan(0);
      expect(result.endTime).toBeGreaterThan(result.startTime);
      expect(result.endTime - result.startTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle hydration errors gracefully', async () => {
      // Mock createRoot to throw an error
      mockCreateRoot.mockImplementationOnce(() => {
        throw new Error('React createRoot failed');
      });

      document.body.innerHTML = `
        <div id="test-container">
          <div data-island="island-1" data-component="ProfilePhoto"></div>
        </div>
      `;

      const context: HydrationContext = {
        containerId: 'test-container',
        residentData: mockResidentData,
        profileMode: 'advanced',
        islands: [mockIslands[0]]
      };

      const result = await hydrateProfileIslands(context);

      expect(result.hydratedCount).toBe(0);
      expect(result.failedCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].islandId).toBe('island-1');
      expect(result.errors[0].componentType).toBe('ProfilePhoto');
    });

    it('should mark elements as hydrated', async () => {
      document.body.innerHTML = `
        <div id="test-container">
          <div data-island="island-1" data-component="ProfilePhoto"></div>
        </div>
      `;

      const context: HydrationContext = {
        containerId: 'test-container',
        residentData: mockResidentData,
        profileMode: 'advanced',
        islands: [mockIslands[0]]
      };

      await hydrateProfileIslands(context);

      const element = document.querySelector('[data-island="island-1"]');
      expect(element).toHaveAttribute('data-hydrated', 'true');
      expect(element).toHaveAttribute('data-hydration-time');
    });
  });

  describe('cleanupIslands', () => {
    it('should cleanup all island roots', async () => {
      document.body.innerHTML = `
        <div id="test-container">
          <div data-island="island-1" data-component="ProfilePhoto"></div>
          <div data-island="island-2" data-component="DisplayName"></div>
        </div>
      `;

      const context: HydrationContext = {
        containerId: 'test-container',
        residentData: mockResidentData,
        profileMode: 'advanced',
        islands: mockIslands
      };

      await hydrateProfileIslands(context);
      
      // Should have created roots
      expect(mockCreateRoot).toHaveBeenCalledTimes(2);

      // Cleanup
      cleanupIslands();

      // Should have called unmount on all roots
      expect(mockUnmount).toHaveBeenCalledTimes(2);
    });

    it('should handle cleanup errors gracefully', async () => {
      mockUnmount.mockImplementationOnce(() => {
        throw new Error('Unmount failed');
      });

      document.body.innerHTML = `
        <div id="test-container">
          <div data-island="island-1" data-component="ProfilePhoto"></div>
        </div>
      `;

      const context: HydrationContext = {
        containerId: 'test-container',
        residentData: mockResidentData,
        profileMode: 'advanced',
        islands: [mockIslands[0]]
      };

      await hydrateProfileIslands(context);
      
      // Should not throw when cleanup encounters an error
      expect(() => cleanupIslands()).not.toThrow();
      
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to unmount island'),
        expect.any(Error)
      );
    });
  });

  describe('Error Display', () => {
    it('should show error UI when hydration fails', async () => {
      mockCreateRoot.mockImplementationOnce(() => {
        throw new Error('Test hydration error');
      });

      document.body.innerHTML = `
        <div id="test-container">
          <div data-island="island-1" data-component="ProfilePhoto"></div>
        </div>
      `;

      const context: HydrationContext = {
        containerId: 'test-container',
        residentData: mockResidentData,
        profileMode: 'advanced',
        islands: [mockIslands[0]]
      };

      await hydrateProfileIslands(context);

      const element = document.querySelector('[data-island="island-1"]');
      expect(element).toHaveAttribute('data-hydration-error', 'true');
      expect(element?.innerHTML).toContain('Hydration Failed');
      expect(element?.innerHTML).toContain('ProfilePhoto component could not be loaded');
    });

    it('should include error details in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      mockCreateRoot.mockImplementationOnce(() => {
        throw new Error('Detailed test error');
      });

      document.body.innerHTML = `
        <div id="test-container">
          <div data-island="island-1" data-component="ProfilePhoto"></div>
        </div>
      `;

      const context: HydrationContext = {
        containerId: 'test-container',
        residentData: mockResidentData,
        profileMode: 'advanced',
        islands: [mockIslands[0]]
      };

      await hydrateProfileIslands(context);

      const element = document.querySelector('[data-island="island-1"]');
      expect(element?.innerHTML).toContain('Error details');
      expect(element?.innerHTML).toContain('Detailed test error');

      process.env.NODE_ENV = originalEnv;
    });
  });
});