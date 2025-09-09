import React from 'react';
import { screen } from '@testing-library/react';
import { IfOwner, IfVisitor } from '../IfOwner';
import { renderWithTemplateContext, createMockResidentData } from '../../__tests__/test-utils';

// Helper to render with specific viewer/owner IDs
const renderWithProvider = (component: React.ReactElement, viewerId: string, ownerId: string) => {
  const residentData = createMockResidentData({
    viewer: { id: viewerId, displayName: 'Test Viewer' },
    owner: { id: ownerId, displayName: 'Test Owner' }
  });
  return renderWithTemplateContext(component, { residentData });
};

describe('IfOwner Component', () => {
  describe('Basic Functionality', () => {
    it('should render children when viewer is the owner', () => {
      renderWithProvider(
        <IfOwner>
          <div data-testid="owner-content">Owner only content</div>
        </IfOwner>,
        'user123',
        'user123' // Same ID = viewer is owner
      );

      expect(screen.getByTestId('owner-content')).toBeInTheDocument();
      expect(screen.getByText('Owner only content')).toBeInTheDocument();
    });

    it('should not render children when viewer is not the owner', () => {
      renderWithProvider(
        <IfOwner>
          <div data-testid="owner-content">Owner only content</div>
        </IfOwner>,
        'visitor456',
        'user123' // Different IDs = viewer is not owner
      );

      expect(screen.queryByTestId('owner-content')).not.toBeInTheDocument();
      expect(screen.queryByText('Owner only content')).not.toBeInTheDocument();
    });

    it('should render multiple children when viewer is owner', () => {
      renderWithProvider(
        <IfOwner>
          <span data-testid="child1">First child</span>
          <span data-testid="child2">Second child</span>
          <div data-testid="child3">Third child</div>
        </IfOwner>,
        'owner123',
        'owner123'
      );

      expect(screen.getByTestId('child1')).toBeInTheDocument();
      expect(screen.getByTestId('child2')).toBeInTheDocument();
      expect(screen.getByTestId('child3')).toBeInTheDocument();
    });

    it('should not render any children when viewer is not owner', () => {
      renderWithProvider(
        <IfOwner>
          <span data-testid="child1">First child</span>
          <span data-testid="child2">Second child</span>
        </IfOwner>,
        'visitor456',
        'owner123'
      );

      expect(screen.queryByTestId('child1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('child2')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string IDs consistently', () => {
      renderWithProvider(
        <IfOwner>
          <div data-testid="content">Content</div>
        </IfOwner>,
        '',
        ''
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('should handle numeric string IDs', () => {
      renderWithProvider(
        <IfOwner>
          <div data-testid="content">Content</div>
        </IfOwner>,
        '123',
        '123'
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('should handle very long IDs', () => {
      const longId = 'a'.repeat(1000);
      renderWithProvider(
        <IfOwner>
          <div data-testid="content">Content</div>
        </IfOwner>,
        longId,
        longId
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('should be case sensitive with IDs', () => {
      renderWithProvider(
        <IfOwner>
          <div data-testid="content">Content</div>
        </IfOwner>,
        'User123',
        'user123' // Different case
      );

      expect(screen.queryByTestId('content')).not.toBeInTheDocument();
    });

    it('should handle special characters in IDs', () => {
      const specialId = 'user-123_test@domain.com';
      renderWithProvider(
        <IfOwner>
          <div data-testid="content">Content</div>
        </IfOwner>,
        specialId,
        specialId
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });
  });

  describe('Complex Children', () => {
    it('should render nested components when viewer is owner', () => {
      renderWithProvider(
        <IfOwner>
          <div data-testid="parent">
            <span data-testid="nested-child">Nested content</span>
            <IfOwner>
              <div data-testid="double-nested">Double nested</div>
            </IfOwner>
          </div>
        </IfOwner>,
        'owner123',
        'owner123'
      );

      expect(screen.getByTestId('parent')).toBeInTheDocument();
      expect(screen.getByTestId('nested-child')).toBeInTheDocument();
      expect(screen.getByTestId('double-nested')).toBeInTheDocument();
    });

    it('should render functional components as children', () => {
      const TestComponent = () => <div data-testid="functional">Functional component</div>;
      
      renderWithProvider(
        <IfOwner>
          <TestComponent />
        </IfOwner>,
        'owner123',
        'owner123'
      );

      expect(screen.getByTestId('functional')).toBeInTheDocument();
    });

    it('should handle React fragments as children', () => {
      renderWithProvider(
        <IfOwner>
          <>
            <div data-testid="fragment-child1">Fragment child 1</div>
            <div data-testid="fragment-child2">Fragment child 2</div>
          </>
        </IfOwner>,
        'owner123',
        'owner123'
      );

      expect(screen.getByTestId('fragment-child1')).toBeInTheDocument();
      expect(screen.getByTestId('fragment-child2')).toBeInTheDocument();
    });
  });

  describe('Integration with IfVisitor', () => {
    it('should work correctly alongside IfVisitor component', () => {
      renderWithProvider(
        <div>
          <IfOwner>
            <div data-testid="owner-section">Owner content</div>
          </IfOwner>
          <IfVisitor>
            <div data-testid="visitor-section">Visitor content</div>
          </IfVisitor>
        </div>,
        'owner123',
        'owner123'
      );

      expect(screen.getByTestId('owner-section')).toBeInTheDocument();
      expect(screen.queryByTestId('visitor-section')).not.toBeInTheDocument();
    });
  });
});

describe('IfVisitor Component', () => {
  describe('Basic Functionality', () => {
    it('should render children when viewer is not the owner', () => {
      renderWithProvider(
        <IfVisitor>
          <div data-testid="visitor-content">Visitor only content</div>
        </IfVisitor>,
        'visitor456',
        'owner123' // Different IDs = viewer is visitor
      );

      expect(screen.getByTestId('visitor-content')).toBeInTheDocument();
      expect(screen.getByText('Visitor only content')).toBeInTheDocument();
    });

    it('should not render children when viewer is the owner', () => {
      renderWithProvider(
        <IfVisitor>
          <div data-testid="visitor-content">Visitor only content</div>
        </IfVisitor>,
        'owner123',
        'owner123' // Same ID = viewer is owner, not visitor
      );

      expect(screen.queryByTestId('visitor-content')).not.toBeInTheDocument();
      expect(screen.queryByText('Visitor only content')).not.toBeInTheDocument();
    });

    it('should render multiple children when viewer is visitor', () => {
      renderWithProvider(
        <IfVisitor>
          <span data-testid="child1">First child</span>
          <span data-testid="child2">Second child</span>
          <div data-testid="child3">Third child</div>
        </IfVisitor>,
        'visitor456',
        'owner123'
      );

      expect(screen.getByTestId('child1')).toBeInTheDocument();
      expect(screen.getByTestId('child2')).toBeInTheDocument();
      expect(screen.getByTestId('child3')).toBeInTheDocument();
    });

    it('should not render any children when viewer is owner', () => {
      renderWithProvider(
        <IfVisitor>
          <span data-testid="child1">First child</span>
          <span data-testid="child2">Second child</span>
        </IfVisitor>,
        'owner123',
        'owner123'
      );

      expect(screen.queryByTestId('child1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('child2')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string IDs consistently', () => {
      renderWithProvider(
        <IfVisitor>
          <div data-testid="content">Content</div>
        </IfVisitor>,
        'visitor',
        '' // Different from visitor
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('should not render when both IDs are empty strings', () => {
      renderWithProvider(
        <IfVisitor>
          <div data-testid="content">Content</div>
        </IfVisitor>,
        '',
        '' // Same empty strings = not visitor
      );

      expect(screen.queryByTestId('content')).not.toBeInTheDocument();
    });

    it('should handle numeric string IDs', () => {
      renderWithProvider(
        <IfVisitor>
          <div data-testid="content">Content</div>
        </IfVisitor>,
        '456',
        '123' // Different numeric IDs
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('should be case sensitive with IDs', () => {
      renderWithProvider(
        <IfVisitor>
          <div data-testid="content">Content</div>
        </IfVisitor>,
        'User123',
        'user123' // Different case = visitor
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('should handle special characters in IDs', () => {
      renderWithProvider(
        <IfVisitor>
          <div data-testid="content">Content</div>
        </IfVisitor>,
        'visitor-456_test@domain.com',
        'owner-123_test@domain.com' // Different special character IDs
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });
  });

  describe('Complex Children', () => {
    it('should render nested components when viewer is visitor', () => {
      renderWithProvider(
        <IfVisitor>
          <div data-testid="parent">
            <span data-testid="nested-child">Nested content</span>
            <IfVisitor>
              <div data-testid="double-nested">Double nested</div>
            </IfVisitor>
          </div>
        </IfVisitor>,
        'visitor456',
        'owner123'
      );

      expect(screen.getByTestId('parent')).toBeInTheDocument();
      expect(screen.getByTestId('nested-child')).toBeInTheDocument();
      expect(screen.getByTestId('double-nested')).toBeInTheDocument();
    });

    it('should render functional components as children', () => {
      const TestComponent = () => <div data-testid="functional">Functional component</div>;
      
      renderWithProvider(
        <IfVisitor>
          <TestComponent />
        </IfVisitor>,
        'visitor456',
        'owner123'
      );

      expect(screen.getByTestId('functional')).toBeInTheDocument();
    });

    it('should handle React fragments as children', () => {
      renderWithProvider(
        <IfVisitor>
          <>
            <div data-testid="fragment-child1">Fragment child 1</div>
            <div data-testid="fragment-child2">Fragment child 2</div>
          </>
        </IfVisitor>,
        'visitor456',
        'owner123'
      );

      expect(screen.getByTestId('fragment-child1')).toBeInTheDocument();
      expect(screen.getByTestId('fragment-child2')).toBeInTheDocument();
    });
  });

  describe('Integration with IfOwner', () => {
    it('should work correctly alongside IfOwner component', () => {
      renderWithProvider(
        <div>
          <IfOwner>
            <div data-testid="owner-section">Owner content</div>
          </IfOwner>
          <IfVisitor>
            <div data-testid="visitor-section">Visitor content</div>
          </IfVisitor>
        </div>,
        'visitor456',
        'owner123'
      );

      expect(screen.queryByTestId('owner-section')).not.toBeInTheDocument();
      expect(screen.getByTestId('visitor-section')).toBeInTheDocument();
    });

    it('should handle mutual exclusivity correctly', () => {
      const testCases = [
        { viewerId: 'owner123', ownerId: 'owner123', expectOwner: true, expectVisitor: false },
        { viewerId: 'visitor456', ownerId: 'owner123', expectOwner: false, expectVisitor: true },
        { viewerId: 'guest789', ownerId: 'owner123', expectOwner: false, expectVisitor: true },
      ];

      testCases.forEach(({ viewerId, ownerId, expectOwner, expectVisitor }) => {
        const { unmount } = renderWithProvider(
          <div>
            <IfOwner>
              <div data-testid="owner-content">Owner</div>
            </IfOwner>
            <IfVisitor>
              <div data-testid="visitor-content">Visitor</div>
            </IfVisitor>
          </div>,
          viewerId,
          ownerId
        );

        if (expectOwner) {
          expect(screen.getByTestId('owner-content')).toBeInTheDocument();
        } else {
          expect(screen.queryByTestId('owner-content')).not.toBeInTheDocument();
        }

        if (expectVisitor) {
          expect(screen.getByTestId('visitor-content')).toBeInTheDocument();
        } else {
          expect(screen.queryByTestId('visitor-content')).not.toBeInTheDocument();
        }

        unmount();
      });
    });
  });
});

describe('Both Components Logic Consistency', () => {
  it('should ensure IfOwner and IfVisitor are mutually exclusive', () => {
    const testScenarios = [
      { viewer: 'user1', owner: 'user1', description: 'viewer is owner' },
      { viewer: 'user2', owner: 'user1', description: 'viewer is visitor' },
      { viewer: '', owner: '', description: 'both empty strings' },
      { viewer: 'guest', owner: '', description: 'empty owner' },
      { viewer: '', owner: 'owner', description: 'empty viewer' },
    ];

    testScenarios.forEach(({ viewer, owner, description }) => {
      const { unmount } = renderWithProvider(
        <div>
          <IfOwner>
            <div data-testid="owner-indicator">OWNER</div>
          </IfOwner>
          <IfVisitor>
            <div data-testid="visitor-indicator">VISITOR</div>
          </IfVisitor>
        </div>,
        viewer,
        owner
      );

      const ownerVisible = screen.queryByTestId('owner-indicator') !== null;
      const visitorVisible = screen.queryByTestId('visitor-indicator') !== null;

      // Exactly one should be visible, never both or neither
      expect(ownerVisible !== visitorVisible).toBe(true);
      
      // Log for debugging
      console.log(`${description}: owner=${ownerVisible}, visitor=${visitorVisible}`);
      
      unmount();
    });
  });

  it('should handle null/undefined behavior gracefully', () => {
    // This test documents current behavior - if viewer/owner data is malformed,
    // components should still not crash
    const residentDataWithNulls = createMockResidentData({
      viewer: { id: null as any, displayName: 'Viewer' },
      owner: { id: null as any, displayName: 'Owner' }
    });

    const { container } = renderWithTemplateContext(
      <div>
        <IfOwner>
          <div data-testid="owner-content">Owner content</div>
        </IfOwner>
        <IfVisitor>
          <div data-testid="visitor-content">Visitor content</div>
        </IfVisitor>
      </div>,
      { residentData: residentDataWithNulls }
    );

    // Should not crash and should handle null comparison gracefully
    expect(container).toBeInTheDocument();
  });
});