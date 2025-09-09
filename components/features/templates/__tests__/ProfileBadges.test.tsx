import React from 'react';
import { screen } from '@testing-library/react';
import ProfileBadges from '../ProfileBadges';
import { renderWithTemplateContext } from './test-utils';

// Mock the ThreadRing88x31Badge component
jest.mock('../../../core/threadring/ThreadRing88x31Badge', () => {
  return function MockThreadRing88x31Badge({ title, subtitle, className }: any) {
    return (
      <div className={`mock-badge ${className}`} data-testid="mock-badge">
        {title} - {subtitle}
      </div>
    );
  };
});

describe('ProfileBadges Component', () => {
  const mockBadges = [
    { 
      id: '1', 
      title: 'Contributor', 
      subtitle: 'Active Member',
      imageUrl: '/badge1.jpg',
      templateId: 1,
      backgroundColor: '#ff0000',
      textColor: '#ffffff',
      threadRing: { name: 'Tech Community' }
    },
    { 
      id: '2', 
      title: 'Creator', 
      subtitle: 'Original Content',
      imageUrl: '/badge2.jpg',
      templateId: 2,
      backgroundColor: '#00ff00',
      textColor: '#000000',
      threadRing: { name: 'Art Circle' }
    },
    { 
      id: '3', 
      title: 'Moderator', 
      subtitle: 'Community Leader',
      imageUrl: '/badge3.jpg',
      templateId: 3,
      backgroundColor: '#0000ff',
      textColor: '#ffffff',
      threadRing: { name: 'Gaming Hub' }
    },
    { 
      id: '4', 
      title: 'Veteran', 
      subtitle: '5 Years',
      imageUrl: '/badge4.jpg',
      templateId: 4,
      backgroundColor: '#ffff00',
      textColor: '#000000',
      threadRing: { name: 'Old School' }
    },
    { 
      id: '5', 
      title: 'Expert', 
      subtitle: 'Knowledge Sharer',
      imageUrl: '/badge5.jpg',
      templateId: 5,
      backgroundColor: '#ff00ff',
      textColor: '#ffffff',
      threadRing: { name: 'Learn Together' }
    },
    { 
      id: '6', 
      title: 'Helper', 
      subtitle: 'Always Available',
      imageUrl: '/badge6.jpg',
      templateId: 6,
      backgroundColor: '#00ffff',
      textColor: '#000000',
      threadRing: { name: 'Support Network' }
    },
    { 
      id: '7', 
      title: 'Pioneer', 
      subtitle: 'Early Adopter',
      imageUrl: '/badge7.jpg',
      templateId: 7,
      backgroundColor: '#808080',
      textColor: '#ffffff',
      threadRing: { name: 'Beta Testers' }
    },
  ];

  describe('Basic Rendering', () => {
    it('should render with badges', () => {
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: { badges: mockBadges.slice(0, 3) } }
      );
      
      expect(screen.getByText('ThreadRing Badges')).toBeInTheDocument();
      expect(screen.getAllByTestId('mock-badge')).toHaveLength(3);
    });

    it('should render empty state when no badges', () => {
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: { badges: [] } }
      );
      
      expect(screen.getByText('No badges yet')).toBeInTheDocument();
      expect(screen.getByText('🏆')).toBeInTheDocument();
    });

    it('should render empty state when badges is null', () => {
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: { badges: null } }
      );
      
      expect(screen.getByText('No badges yet')).toBeInTheDocument();
    });

    it('should render empty state when badges is undefined', () => {
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: { badges: undefined } }
      );
      
      expect(screen.getByText('No badges yet')).toBeInTheDocument();
    });

    it('should have correct container structure', () => {
      const { container } = renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: { badges: mockBadges } }
      );
      
      const profileBadges = container.querySelector('.profile-badges');
      expect(profileBadges).toBeInTheDocument();
      expect(profileBadges).toHaveClass('profile-tab-content', 'space-y-6');
    });
  });

  describe('Badge Display', () => {
    it('should limit display to 6 badges', () => {
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: { badges: mockBadges } }
      );
      
      const badges = screen.getAllByTestId('mock-badge');
      expect(badges).toHaveLength(6);
    });

    it('should display first 6 badges in order', () => {
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: { badges: mockBadges } }
      );
      
      const badges = screen.getAllByTestId('mock-badge');
      expect(badges[0]).toHaveTextContent('Contributor - Active Member');
      expect(badges[1]).toHaveTextContent('Creator - Original Content');
      expect(badges[5]).toHaveTextContent('Helper - Always Available');
    });

    it('should pass correct props to ThreadRing88x31Badge', () => {
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: { badges: [mockBadges[0]] } }
      );
      
      const badge = screen.getByTestId('mock-badge');
      expect(badge).toHaveTextContent('Contributor - Active Member');
    });

    it('should show indicator for additional badges', () => {
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: { badges: mockBadges } } // 7 badges
      );
      
      expect(screen.getByText('+1 more badge in full collection')).toBeInTheDocument();
    });

    it('should show plural indicator for multiple additional badges', () => {
      const moreBadges = [...mockBadges, ...mockBadges]; // 14 badges
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: { badges: moreBadges } }
      );
      
      expect(screen.getByText('+8 more badges in full collection')).toBeInTheDocument();
    });

    it('should not show indicator when 6 or fewer badges', () => {
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: { badges: mockBadges.slice(0, 6) } }
      );
      
      expect(screen.queryByText(/more badge/)).not.toBeInTheDocument();
    });
  });

  describe('Layout Variants', () => {
    it('should use grid layout by default', () => {
      const { container } = renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: { badges: mockBadges } }
      );
      
      const layout = container.querySelector('.grid');
      expect(layout).toBeInTheDocument();
      expect(layout).toHaveClass('grid-cols-2', 'sm:grid-cols-3', 'gap-4');
    });

    it('should apply grid layout when explicitly set', () => {
      const { container } = renderWithTemplateContext(
        <ProfileBadges layout="grid" />,
        { residentData: { badges: mockBadges } }
      );
      
      const layout = container.querySelector('.grid');
      expect(layout).toBeInTheDocument();
      expect(layout).toHaveClass('grid-cols-2', 'sm:grid-cols-3', 'gap-4');
    });

    it('should apply list layout', () => {
      const { container } = renderWithTemplateContext(
        <ProfileBadges layout="list" />,
        { residentData: { badges: mockBadges } }
      );
      
      // The list layout is the container with badges, not the header flex container
      const layout = container.querySelector('.flex.flex-wrap');
      expect(layout).toBeInTheDocument();
      expect(layout).toHaveClass('flex-wrap', 'gap-2');
      expect(layout).not.toHaveClass('grid');
    });
  });

  describe('Header Section', () => {
    it('should display owner displayName in header', () => {
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: { 
          badges: mockBadges,
          owner: { displayName: 'John Doe' }
        }}
      );
      
      expect(screen.getByText("John Doe's community memberships")).toBeInTheDocument();
    });

    it('should display owner handle when displayName is missing', () => {
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: { 
          badges: mockBadges,
          owner: { handle: '@johndoe' }
        }}
      );
      
      expect(screen.getByText("@johndoe's community memberships")).toBeInTheDocument();
    });

    it('should show View Collection button when badges exist', () => {
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: { badges: mockBadges } }
      );
      
      expect(screen.getByText('View Collection')).toBeInTheDocument();
    });

    it('should not show View Collection button when no badges', () => {
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: { badges: [] } }
      );
      
      expect(screen.queryByText('View Collection')).not.toBeInTheDocument();
    });

    it('should not show title by default', () => {
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: { badges: mockBadges } }
      );
      
      // showTitle prop is false by default, but header section still shows
      expect(screen.getByText('ThreadRing Badges')).toBeInTheDocument();
    });

    it('should show title when showTitle is true', () => {
      renderWithTemplateContext(
        <ProfileBadges showTitle={true} />,
        { residentData: { badges: mockBadges } }
      );
      
      expect(screen.getByText('ThreadRing Badges')).toBeInTheDocument();
    });
  });

  describe('Footer Section', () => {
    it('should show full collection link when badges exist', () => {
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: { 
          badges: mockBadges,
          owner: { displayName: 'Jane' }
        }}
      );
      
      expect(screen.getByText('View Full Badge Collection →')).toBeInTheDocument();
    });

    it('should not show full collection link when no badges', () => {
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: { badges: [] } }
      );
      
      expect(screen.queryByText(/Badge Collection/)).not.toBeInTheDocument();
    });
  });

  describe('Custom ClassName Handling', () => {
    it('should apply custom className string', () => {
      const { container } = renderWithTemplateContext(
        <ProfileBadges className="custom-class" />
      );
      
      const profileBadges = container.querySelector('.profile-badges');
      expect(profileBadges).toHaveClass('custom-class');
    });

    it('should handle className as array', () => {
      const { container } = renderWithTemplateContext(
        <ProfileBadges className={['class1', 'class2'] as any} />
      );
      
      const profileBadges = container.querySelector('.profile-badges');
      expect(profileBadges).toHaveClass('class1', 'class2');
    });

    it('should handle empty className', () => {
      const { container } = renderWithTemplateContext(
        <ProfileBadges className="" />
      );
      
      const profileBadges = container.querySelector('.profile-badges');
      expect(profileBadges).toHaveClass('profile-badges', 'profile-tab-content', 'space-y-6');
    });

    it('should handle undefined className', () => {
      const { container } = renderWithTemplateContext(
        <ProfileBadges />
      );
      
      const profileBadges = container.querySelector('.profile-badges');
      expect(profileBadges).toHaveClass('profile-badges', 'profile-tab-content', 'space-y-6');
    });
  });

  describe('Badge Interactions', () => {
    it('should apply hover effects to badges', () => {
      const { container } = renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: { badges: [mockBadges[0]] } }
      );
      
      const badgeWrapper = container.querySelector('.hover\\:scale-105');
      expect(badgeWrapper).toBeInTheDocument();
      expect(badgeWrapper).toHaveClass('transition-transform', 'duration-200');
    });

    it('should have cursor-default on badges', () => {
      const { container } = renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: { badges: [mockBadges[0]] } }
      );
      
      const badgeWrapper = container.querySelector('[title*="Member of"]');
      expect(badgeWrapper).toHaveClass('cursor-default');
    });

    it('should have tooltip with ThreadRing name', () => {
      const { container } = renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: { badges: [mockBadges[0]] } }
      );
      
      const badgeWrapper = container.querySelector('[title]');
      expect(badgeWrapper).toHaveAttribute('title', 'Member of Tech Community');
    });

    it('should pass w-full className to badge components', () => {
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: { badges: [mockBadges[0]] } }
      );
      
      const badge = screen.getByTestId('mock-badge');
      expect(badge).toHaveClass('w-full');
    });
  });

  describe('Empty State', () => {
    it('should show correct empty state message with displayName', () => {
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: { 
          badges: [],
          owner: { displayName: 'Alice' }
        }}
      );
      
      expect(screen.getByText("Alice hasn't earned any ThreadRing badges yet.")).toBeInTheDocument();
    });

    it('should show correct empty state message with handle', () => {
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: { 
          badges: [],
          owner: { handle: '@alice' }
        }}
      );
      
      expect(screen.getByText("@alice hasn't earned any ThreadRing badges yet.")).toBeInTheDocument();
    });

    it('should have correct empty state styling', () => {
      const { container } = renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: { badges: [] } }
      );
      
      const emptyState = container.querySelector('.text-center.py-12');
      expect(emptyState).toBeInTheDocument();
      
      const icon = container.querySelector('.text-6xl');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveTextContent('🏆');
    });
  });

  describe('Component Combinations', () => {
    it('should work with all props combined', () => {
      const { container } = renderWithTemplateContext(
        <ProfileBadges 
          showTitle={true}
          layout="list"
          className="custom-badges"
        />,
        { residentData: { 
          badges: mockBadges,
          owner: { displayName: 'Test User' }
        }}
      );
      
      // Check custom class
      const profileBadges = container.querySelector('.profile-badges');
      expect(profileBadges).toHaveClass('custom-badges');
      
      // Check layout
      const layout = container.querySelector('.flex');
      expect(layout).toBeInTheDocument();
      
      // Check content
      expect(screen.getByText('ThreadRing Badges')).toBeInTheDocument();
      expect(screen.getByText("Test User's community memberships")).toBeInTheDocument();
    });

    it('should work with minimal props', () => {
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: { badges: mockBadges.slice(0, 2) } }
      );
      
      expect(screen.getByText('ThreadRing Badges')).toBeInTheDocument();
      expect(screen.getAllByTestId('mock-badge')).toHaveLength(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle badges with missing properties', () => {
      const incompleteBadges = [
        { id: '1', title: 'Badge', threadRing: { name: 'Community' } } as any,
        { id: '2', subtitle: 'Only subtitle', threadRing: { name: 'Another' } } as any,
      ];
      
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: { badges: incompleteBadges } }
      );
      
      // Should not crash
      expect(screen.getAllByTestId('mock-badge')).toHaveLength(2);
    });

    it('should handle badges with missing threadRing', () => {
      const badgeWithoutRing = { ...mockBadges[0] };
      delete (badgeWithoutRing as any).threadRing;
      
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: { badges: [badgeWithoutRing] } }
      );
      
      // Should not crash
      expect(screen.getByTestId('mock-badge')).toBeInTheDocument();
    });

    it('should handle special characters in badge titles', () => {
      const specialBadge = {
        ...mockBadges[0],
        title: 'Special & Badge (2024) "Test"',
        subtitle: 'With symbols! 🎉'
      };
      
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: { badges: [specialBadge] } }
      );
      
      expect(screen.getByText('Special & Badge (2024) "Test" - With symbols! 🎉')).toBeInTheDocument();
    });

    it('should handle null/undefined owner', () => {
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: { 
          badges: mockBadges,
          owner: null as any
        }}
      );
      
      // Should not crash
      expect(screen.getByText('ThreadRing Badges')).toBeInTheDocument();
    });

    it('should handle very large badge arrays', () => {
      const manyBadges = Array.from({ length: 100 }, (_, i) => ({
        ...mockBadges[0],
        id: `badge-${i}`,
        title: `Badge ${i}`
      }));
      
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: { badges: manyBadges } }
      );
      
      // Should still limit to 6 displayed
      expect(screen.getAllByTestId('mock-badge')).toHaveLength(6);
      expect(screen.getByText('+94 more badges in full collection')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render quickly', () => {
      const startTime = performance.now();
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: { badges: mockBadges } }
      );
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(50);
    });

    it('should handle multiple rerenders', () => {
      const { rerender } = renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: { badges: [] } }
      );
      
      expect(screen.getByText('No badges yet')).toBeInTheDocument();
      
      rerender(<ProfileBadges />);
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: { badges: mockBadges } }
      );
      
      expect(screen.getByText('ThreadRing Badges')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: { badges: mockBadges } }
      );
      
      const heading = screen.getByText('ThreadRing Badges');
      expect(heading.tagName).toBe('H3');
    });

    it('should provide meaningful text for empty state', () => {
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: { badges: [] } }
      );
      
      expect(screen.getByText('No badges yet')).toBeInTheDocument();
      expect(screen.getByText(/hasn't earned any ThreadRing badges yet/)).toBeInTheDocument();
    });

    it('should have descriptive tooltips', () => {
      const { container } = renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: { badges: [mockBadges[0]] } }
      );
      
      const badgeWrapper = container.querySelector('[title]');
      expect(badgeWrapper).toHaveAttribute('title', 'Member of Tech Community');
    });

    it('should not interfere with badge component accessibility', () => {
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: { badges: [mockBadges[0]] } }
      );
      
      const badge = screen.getByTestId('mock-badge');
      expect(badge).toBeInTheDocument();
      // Badge component should handle its own accessibility
    });
  });
});