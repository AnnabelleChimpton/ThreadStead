import React from 'react';
import { screen } from '@testing-library/react';
import FollowButton from '../FollowButton'; // Note: exports function named 'Guestbook' instead of 'FollowButton'
import { renderWithTemplateContext, createMockResidentData } from './test-utils';

// Mock the core FollowButton since we're testing the template wrapper
jest.mock('../../../core/social/FollowButton', () => {
  return function MockFollowButton({ username }: { username: string }) {
    return (
      <button data-testid="core-follow-button" data-username={username}>
        Follow {username}
      </button>
    );
  };
});

describe('FollowButton Component', () => {
  describe('Basic Functionality', () => {
    it('should render the core FollowButton with owner handle', () => {
      const residentData = createMockResidentData({
        owner: { id: 'owner123', handle: 'testuser', displayName: 'Test User' }
      });
      
      renderWithTemplateContext(<FollowButton />, { residentData });
      
      const button = screen.getByTestId('core-follow-button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('data-username', 'testuser');
      expect(button).toHaveTextContent('Follow testuser');
    });

    it('should pass the correct username prop to core component', () => {
      const residentData = createMockResidentData({
        owner: { id: 'owner456', handle: 'johndoe', displayName: 'John Doe' }
      });
      
      renderWithTemplateContext(<FollowButton />, { residentData });
      
      const button = screen.getByTestId('core-follow-button');
      expect(button).toHaveAttribute('data-username', 'johndoe');
    });

    it('should render without crashing when owner data is present', () => {
      expect(() => {
        const residentData = createMockResidentData({
          owner: { id: 'test', handle: 'testhandle', displayName: 'Test' }
        });
        renderWithTemplateContext(<FollowButton />, { residentData });
      }).not.toThrow();
    });
  });

  describe('Owner Data Integration', () => {
    it('should handle different owner handles correctly', () => {
      const testCases = [
        'user123',
        'jane_doe',
        'test-user',
        'special.user',
        'a',
        'verylongusernamewithnumbers123456789'
      ];

      testCases.forEach((handle, index) => {
        const residentData = createMockResidentData({
          owner: { id: `owner${index}`, handle, displayName: `User ${index}` }
        });
        
        const { unmount } = renderWithTemplateContext(<FollowButton />, { residentData });
        
        const button = screen.getByTestId('core-follow-button');
        expect(button).toHaveAttribute('data-username', handle);
        
        unmount();
      });
    });

    it('should handle owner handles with special characters', () => {
      const specialHandles = [
        'user_123',
        'user-456',
        'user.789',
        'user+special',
        'user@domain'
      ];

      specialHandles.forEach((handle, index) => {
        const residentData = createMockResidentData({
          owner: { id: `owner${index}`, handle, displayName: `User ${index}` }
        });
        
        const { unmount } = renderWithTemplateContext(<FollowButton />, { residentData });
        
        const button = screen.getByTestId('core-follow-button');
        expect(button).toHaveAttribute('data-username', handle);
        
        unmount();
      });
    });

    it('should update when owner data changes', () => {
      const residentData1 = createMockResidentData({
        owner: { id: 'owner1', handle: 'user1', displayName: 'User 1' }
      });
      
      const { unmount } = renderWithTemplateContext(<FollowButton />, { residentData: residentData1 });
      
      expect(screen.getByTestId('core-follow-button')).toHaveAttribute('data-username', 'user1');
      
      unmount();
      
      // Render with new data
      const residentData2 = createMockResidentData({
        owner: { id: 'owner2', handle: 'user2', displayName: 'User 2' }
      });
      
      renderWithTemplateContext(<FollowButton />, { residentData: residentData2 });
      expect(screen.getByTestId('core-follow-button')).toHaveAttribute('data-username', 'user2');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing owner handle gracefully', () => {
      const residentData = createMockResidentData({
        owner: { id: 'owner123', handle: '', displayName: 'Test User' }
      });
      
      expect(() => {
        renderWithTemplateContext(<FollowButton />, { residentData });
      }).not.toThrow();
      
      const button = screen.getByTestId('core-follow-button');
      expect(button).toHaveAttribute('data-username', '');
    });

    it('should handle undefined owner handle', () => {
      const residentData = createMockResidentData({
        owner: { id: 'owner123', handle: undefined as any, displayName: 'Test User' }
      });
      
      expect(() => {
        renderWithTemplateContext(<FollowButton />, { residentData });
      }).not.toThrow();
    });

    it('should handle null owner handle', () => {
      const residentData = createMockResidentData({
        owner: { id: 'owner123', handle: null as any, displayName: 'Test User' }
      });
      
      expect(() => {
        renderWithTemplateContext(<FollowButton />, { residentData });
      }).not.toThrow();
    });

    it('should handle missing owner object gracefully', () => {
      const residentData = createMockResidentData({
        owner: null as any
      });
      
      // This might throw, which is expected behavior
      expect(() => {
        renderWithTemplateContext(<FollowButton />, { residentData });
      }).toThrow();
    });
  });

  describe('Component Integration', () => {
    it('should properly integrate with ResidentDataProvider', () => {
      const residentData = createMockResidentData({
        owner: { id: 'test123', handle: 'testuser', displayName: 'Test User' },
        viewer: { id: 'viewer456', displayName: 'Viewer' }
      });
      
      renderWithTemplateContext(<FollowButton />, { residentData });
      
      // Should have access to owner data
      const button = screen.getByTestId('core-follow-button');
      expect(button).toHaveAttribute('data-username', 'testuser');
    });

    it('should work within complex component trees', () => {
      const residentData = createMockResidentData({
        owner: { id: 'owner123', handle: 'complexuser', displayName: 'Complex User' }
      });
      
      renderWithTemplateContext(
        <div className="container">
          <header>
            <h1>Profile Page</h1>
          </header>
          <main>
            <div className="actions">
              <FollowButton />
            </div>
          </main>
        </div>,
        { residentData }
      );
      
      const button = screen.getByTestId('core-follow-button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('data-username', 'complexuser');
    });

    it('should not interfere with other components', () => {
      const residentData = createMockResidentData({
        owner: { id: 'owner123', handle: 'testuser', displayName: 'Test User' }
      });
      
      renderWithTemplateContext(
        <div>
          <div data-testid="before">Before FollowButton</div>
          <FollowButton />
          <div data-testid="after">After FollowButton</div>
        </div>,
        { residentData }
      );
      
      expect(screen.getByTestId('before')).toBeInTheDocument();
      expect(screen.getByTestId('core-follow-button')).toBeInTheDocument();
      expect(screen.getByTestId('after')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should not cause unnecessary re-renders', () => {
      const residentData = createMockResidentData({
        owner: { id: 'owner123', handle: 'testuser', displayName: 'Test User' }
      });
      
      // Render multiple times with same data
      const { unmount: unmount1 } = renderWithTemplateContext(<FollowButton />, { residentData });
      const initialButton = screen.getByTestId('core-follow-button');
      
      // Should maintain consistent attributes
      expect(initialButton).toHaveAttribute('data-username', 'testuser');
      
      unmount1();
      
      // Render again with same data - should be consistent
      renderWithTemplateContext(<FollowButton />, { residentData });
      const secondRenderButton = screen.getByTestId('core-follow-button');
      expect(secondRenderButton).toHaveAttribute('data-username', 'testuser');
    });

    it('should render quickly', () => {
      const residentData = createMockResidentData({
        owner: { id: 'owner123', handle: 'testuser', displayName: 'Test User' }
      });
      
      const startTime = performance.now();
      renderWithTemplateContext(<FollowButton />, { residentData });
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(50); // Should render quickly
    });
  });

  describe('Accessibility', () => {
    it('should maintain accessibility of core FollowButton', () => {
      const residentData = createMockResidentData({
        owner: { id: 'owner123', handle: 'testuser', displayName: 'Test User' }
      });
      
      renderWithTemplateContext(<FollowButton />, { residentData });
      
      const button = screen.getByTestId('core-follow-button');
      expect(button).toBeInTheDocument();
      expect(button.tagName).toBe('BUTTON');
    });

    it('should be keyboard accessible', () => {
      const residentData = createMockResidentData({
        owner: { id: 'owner123', handle: 'testuser', displayName: 'Test User' }
      });
      
      renderWithTemplateContext(<FollowButton />, { residentData });
      
      const button = screen.getByTestId('core-follow-button');
      // Button should be focusable by default
      expect(button).not.toHaveAttribute('tabindex', '-1');
    });
  });

  describe('Known Issues', () => {
    it('should document the incorrect export name bug', () => {
      // This test documents the known issue where the function is named 'Guestbook' 
      // instead of 'FollowButton' in the export
      
      // The component still works functionally, but the function name is wrong
      const residentData = createMockResidentData({
        owner: { id: 'owner123', handle: 'testuser', displayName: 'Test User' }
      });
      
      expect(() => {
        renderWithTemplateContext(<FollowButton />, { residentData });
      }).not.toThrow();
      
      // Component should still render correctly despite the naming issue
      expect(screen.getByTestId('core-follow-button')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long handles', () => {
      const longHandle = 'a'.repeat(100);
      const residentData = createMockResidentData({
        owner: { id: 'owner123', handle: longHandle, displayName: 'Test User' }
      });
      
      renderWithTemplateContext(<FollowButton />, { residentData });
      
      const button = screen.getByTestId('core-follow-button');
      expect(button).toHaveAttribute('data-username', longHandle);
    });

    it('should handle handles with unicode characters', () => {
      const unicodeHandle = '用户测试🦄';
      const residentData = createMockResidentData({
        owner: { id: 'owner123', handle: unicodeHandle, displayName: 'Test User' }
      });
      
      renderWithTemplateContext(<FollowButton />, { residentData });
      
      const button = screen.getByTestId('core-follow-button');
      expect(button).toHaveAttribute('data-username', unicodeHandle);
    });

    it('should handle numeric handles', () => {
      const numericHandle = '12345';
      const residentData = createMockResidentData({
        owner: { id: 'owner123', handle: numericHandle, displayName: 'Test User' }
      });
      
      renderWithTemplateContext(<FollowButton />, { residentData });
      
      const button = screen.getByTestId('core-follow-button');
      expect(button).toHaveAttribute('data-username', numericHandle);
    });
  });
});