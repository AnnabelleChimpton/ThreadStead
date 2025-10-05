import React from 'react';
import { screen } from '@testing-library/react';
import Guestbook from '../Guestbook';
import { renderWithTemplateContext, createMockResidentData } from './test-utils';

// Mock the OriginalGuestbook component since it's imported
jest.mock('@/components/shared/Guestbook', () => {
  return function MockOriginalGuestbook({ username }: { username: string }) {
    return (
      <div data-testid="mock-original-guestbook" data-username={username}>
        Original Guestbook Component for {username}
      </div>
    );
  };
});

describe('Guestbook Component', () => {
  describe('Basic Functionality', () => {
    it('should render OriginalGuestbook with owner handle', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'testuser',
          displayName: 'Test User',
          avatarUrl: '/test.jpg'
        }
      });

      renderWithTemplateContext(
        <Guestbook />,
        { residentData: mockData }
      );

      const guestbook = screen.getByTestId('mock-original-guestbook');
      expect(guestbook).toBeInTheDocument();
      expect(guestbook).toHaveAttribute('data-username', 'testuser');
      expect(guestbook).toHaveTextContent('Original Guestbook Component for testuser');
    });

    it('should pass different owner handles correctly', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'another-user',
          handle: 'anotheruser',
          displayName: 'Another User',
          avatarUrl: '/another.jpg'
        }
      });

      renderWithTemplateContext(
        <Guestbook />,
        { residentData: mockData }
      );

      const guestbook = screen.getByTestId('mock-original-guestbook');
      expect(guestbook).toHaveAttribute('data-username', 'anotheruser');
      expect(guestbook).toHaveTextContent('Original Guestbook Component for anotheruser');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty owner handle', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'empty-handle-user',
          handle: '',
          displayName: 'User With Empty Handle',
          avatarUrl: '/empty.jpg'
        }
      });

      renderWithTemplateContext(
        <Guestbook />,
        { residentData: mockData }
      );

      const guestbook = screen.getByTestId('mock-original-guestbook');
      expect(guestbook).toBeInTheDocument();
      expect(guestbook).toHaveAttribute('data-username', '');
    });

    it('should handle undefined owner gracefully', () => {
      const mockData = createMockResidentData({
        owner: undefined as any
      });

      // This should not crash the component
      expect(() => {
        renderWithTemplateContext(
          <Guestbook />,
          { residentData: mockData }
        );
      }).not.toThrow();
    });

    it('should handle missing owner handle property', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'no-handle-user',
          displayName: 'User Without Handle',
          avatarUrl: '/no-handle.jpg'
        } as any // Missing handle property
      });

      expect(() => {
        renderWithTemplateContext(
          <Guestbook />,
          { residentData: mockData }
        );
      }).not.toThrow();
    });
  });

  describe('Component Integration', () => {
    it('should render without crashing in different data contexts', () => {
      const contexts = [
        createMockResidentData({ owner: { id: '1', handle: 'user1', displayName: 'User 1', avatarUrl: '/1.jpg' } }),
        createMockResidentData({ owner: { id: '2', handle: 'user2', displayName: 'User 2', avatarUrl: '/2.jpg' } }),
        createMockResidentData({ owner: { id: '3', handle: 'specialchars123', displayName: 'Special User', avatarUrl: '/3.jpg' } })
      ];

      contexts.forEach((mockData, index) => {
        const { unmount } = renderWithTemplateContext(
          <Guestbook />,
          { residentData: mockData }
        );

        expect(screen.getByTestId('mock-original-guestbook')).toBeInTheDocument();
        unmount();
      });
    });

    it('should be accessible', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'accessible-user',
          handle: 'accessibleuser',
          displayName: 'Accessible User',
          avatarUrl: '/accessible.jpg'
        }
      });

      renderWithTemplateContext(
        <Guestbook />,
        { residentData: mockData }
      );

      const guestbook = screen.getByTestId('mock-original-guestbook');
      expect(guestbook).toBeInTheDocument();
      // The actual accessibility testing would be done in the OriginalGuestbook component
    });
  });

  describe('Props and Data Flow', () => {
    it('should correctly extract owner data from ResidentDataProvider', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'data-flow-user',
          handle: 'dataflowuser',
          displayName: 'Data Flow User',
          avatarUrl: '/dataflow.jpg'
        },
        posts: [
          { id: '1', bodyHtml: 'Post 1', createdAt: '2023-01-01' },
          { id: '2', bodyHtml: 'Post 2', createdAt: '2023-01-02' }
        ],
        capabilities: { bio: 'Some bio content' }
      });

      renderWithTemplateContext(
        <Guestbook />,
        { residentData: mockData }
      );

      const guestbook = screen.getByTestId('mock-original-guestbook');
      // Should only use owner.handle, ignoring other resident data
      expect(guestbook).toHaveAttribute('data-username', 'dataflowuser');
    });
  });

  describe('Multiple Instances', () => {
    it('should support multiple Guestbook components with different data', () => {
      const mockData1 = createMockResidentData({
        owner: { id: '1', handle: 'user1', displayName: 'User 1', avatarUrl: '/1.jpg' }
      });

      const mockData2 = createMockResidentData({
        owner: { id: '2', handle: 'user2', displayName: 'User 2', avatarUrl: '/2.jpg' }
      });

      // Test that we can render multiple instances (would be in different contexts in real usage)
      const { unmount: unmount1 } = renderWithTemplateContext(
        <Guestbook />,
        { residentData: mockData1 }
      );

      expect(screen.getByTestId('mock-original-guestbook')).toHaveAttribute('data-username', 'user1');
      unmount1();

      renderWithTemplateContext(
        <Guestbook />,
        { residentData: mockData2 }
      );

      expect(screen.getByTestId('mock-original-guestbook')).toHaveAttribute('data-username', 'user2');
    });
  });
});