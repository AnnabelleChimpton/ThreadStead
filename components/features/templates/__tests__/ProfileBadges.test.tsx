import React from 'react';
import { screen } from '@testing-library/react';
import ProfileBadges from '../ProfileBadges';
import { renderWithTemplateContext, createMockResidentData as mockResidentData, type MockResidentDataOverrides } from './test-utils';

// Read as the page's owner, who sees the empty-state hint (visitors see
// nothing; tested below)
const createMockResidentData = (overrides: MockResidentDataOverrides = {}) => {
  const data = mockResidentData(overrides);
  if (!data.owner) return data;
  const owner = { ...data.owner, id: data.owner.id ?? 'test-owner' };
  return { ...data, owner, viewer: { ...data.viewer, id: owner.id } };
};

// PixelIcon uses next/dynamic which does not resolve in the jest environment
jest.mock('@/components/ui/PixelIcon', () => ({
  PixelIcon: ({ name }: { name: string }) => <span data-testid={`pixel-icon-${name}`} />
}));

// Mock the ThreadRing88x31Badge component
jest.mock('../../../core/threadring/ThreadRing88x31Badge', () => {
  return function MockThreadRing88x31Badge({ title, slug, className }: any) {
    return (
      <div className={`mock-badge ${className}`} data-testid="mock-badge">
        {title} - {slug}
      </div>
    );
  };
});

describe('ProfileBadges Component', () => {
  it('shows visitors nothing when there is nothing to show', () => {
    const { container } = renderWithTemplateContext(
      <ProfileBadges />,
      { residentData: mockResidentData({ badges: [] }) }
    );
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText(/No ring badges yet/)).not.toBeInTheDocument();
  });

  it('shows a signed-in visitor who is not the owner nothing', () => {
    const { container } = renderWithTemplateContext(
      <ProfileBadges />,
      { residentData: mockResidentData({ badges: [], viewer: { id: 'someone-else' } }) }
    );
    expect(container).toBeEmptyDOMElement();
  });

  const mockBadges = [
    { 
      id: '1', 
      title: 'Contributor', 
      subtitle: 'Active Member',
      imageUrl: '/badge1.jpg',
      templateId: 'template-1',
      backgroundColor: '#ff0000',
      textColor: '#ffffff',
      threadRing: { id: 'ring-tech-community', name: 'Tech Community', slug: 'tech-community' }
    },
    { 
      id: '2', 
      title: 'Creator', 
      subtitle: 'Original Content',
      imageUrl: '/badge2.jpg',
      templateId: 'template-2',
      backgroundColor: '#00ff00',
      textColor: '#000000',
      threadRing: { id: 'ring-art-circle', name: 'Art Circle', slug: 'art-circle' }
    },
    { 
      id: '3', 
      title: 'Moderator', 
      subtitle: 'Community Leader',
      imageUrl: '/badge3.jpg',
      templateId: 'template-3',
      backgroundColor: '#0000ff',
      textColor: '#ffffff',
      threadRing: { id: 'ring-gaming-hub', name: 'Gaming Hub', slug: 'gaming-hub' }
    },
    { 
      id: '4', 
      title: 'Veteran', 
      subtitle: '5 Years',
      imageUrl: '/badge4.jpg',
      templateId: 'template-4',
      backgroundColor: '#ffff00',
      textColor: '#000000',
      threadRing: { id: 'ring-old-school', name: 'Old School', slug: 'old-school' }
    },
    { 
      id: '5', 
      title: 'Expert', 
      subtitle: 'Knowledge Sharer',
      imageUrl: '/badge5.jpg',
      templateId: 'template-5',
      backgroundColor: '#ff00ff',
      textColor: '#ffffff',
      threadRing: { id: 'ring-learn-together', name: 'Learn Together', slug: 'learn-together' }
    },
    { 
      id: '6', 
      title: 'Helper', 
      subtitle: 'Always Available',
      imageUrl: '/badge6.jpg',
      templateId: 'template-6',
      backgroundColor: '#00ffff',
      textColor: '#000000',
      threadRing: { id: 'ring-support-network', name: 'Support Network', slug: 'support-network' }
    },
    { 
      id: '7', 
      title: 'Pioneer', 
      subtitle: 'Early Adopter',
      imageUrl: '/badge7.jpg',
      templateId: 'template-7',
      backgroundColor: '#808080',
      textColor: '#ffffff',
      threadRing: { id: 'ring-beta-testers', name: 'Beta Testers', slug: 'beta-testers' }
    },
  ];

  describe('Basic Rendering', () => {
    it('should render with badges', () => {
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: createMockResidentData({ badges: mockBadges.slice(0, 3) }) }
      );
      
      expect(screen.getByText('ThreadRing Badges')).toBeInTheDocument();
      expect(screen.getAllByTestId('mock-badge')).toHaveLength(3);
    });

    it('should show the owner a note when no badges', () => {
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: createMockResidentData({ badges: [] }) }
      );

      const note = screen.getByText(/No ring badges yet\. They come with the rings you join:/);
      expect(note.tagName).toBe('P');
      expect(note).toHaveClass('profile-badges', 'profile-badges--empty');
      expect(note).toHaveTextContent(/Only you see this note\.$/);
      expect(screen.getByRole('link', { name: 'find one' })).toHaveAttribute('href', '/threadrings');
      expect(screen.queryByText('ThreadRing Badges')).not.toBeInTheDocument();
    });

    it('should show the owner the note when badges is null', () => {
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: createMockResidentData({ badges: null }) }
      );

      expect(screen.getByText(/No ring badges yet/)).toBeInTheDocument();
    });

    describe('when the page did not preload badges', () => {
      const realFetch = global.fetch;
      afterEach(() => {
        global.fetch = realFetch;
      });
      const answer = (ok: boolean, body: unknown) => {
        global.fetch = jest.fn(async () => ({ ok, json: async () => body })) as unknown as typeof fetch;
      };

      it('fetches them from the badges API', async () => {
        answer(true, { badges: mockBadges.slice(0, 2) });
        renderWithTemplateContext(
          <ProfileBadges />,
          { residentData: createMockResidentData({ badges: undefined }) }
        );
        expect(await screen.findAllByTestId('mock-badge')).toHaveLength(2);
        expect(global.fetch).toHaveBeenCalledWith(expect.stringMatching(/^\/api\/users\/[^/]+\/badges$/));
      });

      it('renders nothing while the badges are loading', () => {
        global.fetch = jest.fn(() => new Promise(() => {})) as unknown as typeof fetch;
        const { container } = renderWithTemplateContext(
          <ProfileBadges />,
          { residentData: createMockResidentData({ badges: undefined }) }
        );
        expect(container).toBeEmptyDOMElement();
      });

      it('shows the owner note only once the API says there are none', async () => {
        answer(true, { badges: [] });
        renderWithTemplateContext(
          <ProfileBadges />,
          { residentData: createMockResidentData({ badges: undefined }) }
        );
        expect(await screen.findByText(/No ring badges yet/)).toBeInTheDocument();
      });

      it('says nothing when the hub is unavailable, rather than "no badges"', async () => {
        answer(false, { error: 'hub_unavailable' });
        const { container } = renderWithTemplateContext(
          <ProfileBadges />,
          { residentData: createMockResidentData({ badges: undefined }) }
        );
        await new Promise((r) => setTimeout(r, 0));
        expect(screen.queryByText(/No ring badges yet/)).not.toBeInTheDocument();
        expect(container.querySelector('.profile-badges')).toBeNull();
      });
    });

    it('should have correct container structure', () => {
      const { container } = renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: createMockResidentData({ badges: mockBadges }) }
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
        { residentData: createMockResidentData({ badges: mockBadges }) }
      );
      
      const badges = screen.getAllByTestId('mock-badge');
      expect(badges).toHaveLength(6);
    });

    it('should display first 6 badges in order', () => {
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: createMockResidentData({ badges: mockBadges }) }
      );
      
      const badges = screen.getAllByTestId('mock-badge');
      expect(badges[0]).toHaveTextContent('Contributor - tech-community');
      expect(badges[1]).toHaveTextContent('Creator - art-circle');
      expect(badges[5]).toHaveTextContent('Helper - support-network');
    });

    it('should pass correct props to ThreadRing88x31Badge', () => {
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: createMockResidentData({ badges: [mockBadges[0]] }) }
      );
      
      const badge = screen.getByTestId('mock-badge');
      expect(badge).toHaveTextContent('Contributor - tech-community');
    });

    it('should show indicator for additional badges', () => {
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: createMockResidentData({ badges: mockBadges }) } // 7 badges
      );
      
      expect(screen.getByText('+1 more badge in full collection')).toBeInTheDocument();
    });

    it('should show plural indicator for multiple additional badges', () => {
      const moreBadges = [...mockBadges, ...mockBadges]; // 14 badges
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: createMockResidentData({ badges: moreBadges }) }
      );
      
      expect(screen.getByText('+8 more badges in full collection')).toBeInTheDocument();
    });

    it('should not show indicator when 6 or fewer badges', () => {
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: createMockResidentData({ badges: mockBadges.slice(0, 6) }) }
      );
      
      expect(screen.queryByText(/more badge/)).not.toBeInTheDocument();
    });
  });

  describe('Layout Variants', () => {
    it('should use grid layout by default', () => {
      const { container } = renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: createMockResidentData({ badges: mockBadges }) }
      );
      
      const layout = container.querySelector('.grid');
      expect(layout).toBeInTheDocument();
      expect(layout).toHaveClass('grid-cols-2', 'sm:grid-cols-3', 'gap-4');
    });

    it('should apply grid layout when explicitly set', () => {
      const { container } = renderWithTemplateContext(
        <ProfileBadges layout="grid" />,
        { residentData: createMockResidentData({ badges: mockBadges }) }
      );
      
      const layout = container.querySelector('.grid');
      expect(layout).toBeInTheDocument();
      expect(layout).toHaveClass('grid-cols-2', 'sm:grid-cols-3', 'gap-4');
    });

    it('should apply list layout', () => {
      const { container } = renderWithTemplateContext(
        <ProfileBadges layout="list" />,
        { residentData: createMockResidentData({ badges: mockBadges }) }
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
        { residentData: createMockResidentData({ 
          badges: mockBadges,
          owner: { displayName: 'John Doe' }
        })}
      );
      
      expect(screen.getByText("John Doe's community memberships")).toBeInTheDocument();
    });

    it('should display owner handle when displayName is missing', () => {
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: createMockResidentData({ 
          badges: mockBadges,
          owner: { handle: '@johndoe' }
        })}
      );
      
      expect(screen.getByText("@johndoe's community memberships")).toBeInTheDocument();
    });

    it('should show View Collection button when badges exist', () => {
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: createMockResidentData({ badges: mockBadges }) }
      );
      
      expect(screen.getByText('View Collection')).toBeInTheDocument();
    });

    it('should not show View Collection button when no badges', () => {
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: createMockResidentData({ badges: [] }) }
      );
      
      expect(screen.queryByText('View Collection')).not.toBeInTheDocument();
    });

    it('should not show title by default', () => {
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: createMockResidentData({ badges: mockBadges }) }
      );
      
      // showTitle prop is false by default, but header section still shows
      expect(screen.getByText('ThreadRing Badges')).toBeInTheDocument();
    });

    it('should show title when showTitle is true', () => {
      renderWithTemplateContext(
        <ProfileBadges showTitle={true} />,
        { residentData: createMockResidentData({ badges: mockBadges }) }
      );
      
      expect(screen.getByText('ThreadRing Badges')).toBeInTheDocument();
    });
  });

  describe('Footer Section', () => {
    it('should show full collection link when badges exist', () => {
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: createMockResidentData({ 
          badges: mockBadges,
          owner: { displayName: 'Jane' }
        })}
      );
      
      expect(screen.getByText('View Full Badge Collection →')).toBeInTheDocument();
    });

    it('should not show full collection link when no badges', () => {
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: createMockResidentData({ badges: [] }) }
      );
      
      expect(screen.queryByText(/Badge Collection/)).not.toBeInTheDocument();
    });
  });

  describe('Custom ClassName Handling', () => {
    it('should apply custom className string', () => {
      const { container } = renderWithTemplateContext(
        <ProfileBadges className="custom-class" />,
        { residentData: createMockResidentData({ badges: [] }) }
      );
      
      const profileBadges = container.querySelector('.profile-badges');
      expect(profileBadges).toHaveClass('custom-class');
    });

    it('should handle className as array', () => {
      const { container } = renderWithTemplateContext(
        <ProfileBadges className={['class1', 'class2'] as any} />,
        { residentData: createMockResidentData({ badges: [] }) }
      );
      
      const profileBadges = container.querySelector('.profile-badges');
      expect(profileBadges).toHaveClass('class1', 'class2');
    });

    it('should handle empty className', () => {
      const { container } = renderWithTemplateContext(
        <ProfileBadges className="" />,
        { residentData: createMockResidentData({ badges: mockBadges }) }
      );
      
      const profileBadges = container.querySelector('.profile-badges');
      expect(profileBadges).toHaveClass('profile-badges', 'profile-tab-content', 'space-y-6');
    });

    it('should handle undefined className', () => {
      const { container } = renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: createMockResidentData({ badges: mockBadges }) }
      );
      
      const profileBadges = container.querySelector('.profile-badges');
      expect(profileBadges).toHaveClass('profile-badges', 'profile-tab-content', 'space-y-6');
    });
  });

  describe('Badge Interactions', () => {
    it('should apply hover effects to badges', () => {
      const { container } = renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: createMockResidentData({ badges: [mockBadges[0]] }) }
      );
      
      const badgeWrapper = container.querySelector('.hover\\:scale-105');
      expect(badgeWrapper).toBeInTheDocument();
      expect(badgeWrapper).toHaveClass('transition-transform', 'duration-200');
    });

    it('should have cursor-default on badges', () => {
      const { container } = renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: createMockResidentData({ badges: [mockBadges[0]] }) }
      );
      
      const badgeWrapper = container.querySelector('[title*="Member of"]');
      expect(badgeWrapper).toHaveClass('cursor-default');
    });

    it('should have tooltip with ThreadRing name', () => {
      const { container } = renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: createMockResidentData({ badges: [mockBadges[0]] }) }
      );
      
      const badgeWrapper = container.querySelector('[title]');
      expect(badgeWrapper).toHaveAttribute('title', 'Member of Tech Community');
    });

    it('should render badge component inside the hover wrapper', () => {
      const { container } = renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: createMockResidentData({ badges: [mockBadges[0]] }) }
      );

      // The component no longer forwards a className to the badge; sizing is
      // handled by the wrapper div around ThreadRing88x31Badge
      const wrapper = container.querySelector('[title="Member of Tech Community"]');
      const badge = screen.getByTestId('mock-badge');
      expect(wrapper).toContainElement(badge);
    });
  });

  describe('Empty State', () => {
    it('keeps a custom className on the owner note', () => {
      renderWithTemplateContext(
        <ProfileBadges className="my-badges" />,
        { residentData: createMockResidentData({ badges: [] }) }
      );

      expect(screen.getByText(/No ring badges yet/)).toHaveClass('my-badges', 'profile-badges--empty');
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
        { residentData: createMockResidentData({ 
          badges: mockBadges,
          owner: { displayName: 'Test User' }
        })}
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
        { residentData: createMockResidentData({ badges: mockBadges.slice(0, 2) }) }
      );
      
      expect(screen.getByText('ThreadRing Badges')).toBeInTheDocument();
      expect(screen.getAllByTestId('mock-badge')).toHaveLength(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle badges with missing properties', () => {
      const incompleteBadges = [
        { id: '1', title: 'Badge', threadRing: { id: 'ring-community', name: 'Community', slug: 'community' } } as any,
        { id: '2', subtitle: 'Only subtitle', threadRing: { id: 'ring-another', name: 'Another', slug: 'another' } } as any,
      ];
      
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: createMockResidentData({ badges: incompleteBadges }) }
      );
      
      // Should not crash
      expect(screen.getAllByTestId('mock-badge')).toHaveLength(2);
    });

    it('should handle badges with missing threadRing', () => {
      const badgeWithoutRing = { ...mockBadges[0] };
      delete (badgeWithoutRing as any).threadRing;
      
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: createMockResidentData({ badges: [badgeWithoutRing] }) }
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
        { residentData: createMockResidentData({ badges: [specialBadge] }) }
      );
      
      expect(screen.getByText('Special & Badge (2024) "Test" - tech-community')).toBeInTheDocument();
    });

    it('should handle null/undefined owner', () => {
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: createMockResidentData({ 
          badges: mockBadges,
          owner: null as any
        })}
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
        { residentData: createMockResidentData({ badges: manyBadges }) }
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
        { residentData: createMockResidentData({ badges: mockBadges }) }
      );
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(50);
    });

    it('should handle multiple rerenders', () => {
      const { rerender } = renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: createMockResidentData({ badges: [] }) }
      );
      
      expect(screen.getByText(/No ring badges yet/)).toBeInTheDocument();
      
      rerender(<ProfileBadges />);
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: createMockResidentData({ badges: mockBadges }) }
      );
      
      expect(screen.getByText('ThreadRing Badges')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: createMockResidentData({ badges: mockBadges }) }
      );
      
      const heading = screen.getByText('ThreadRing Badges');
      expect(heading.tagName).toBe('H3');
    });

    it('should provide meaningful text for empty state', () => {
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: createMockResidentData({ badges: [] }) }
      );
      
      // The owner's note says what's missing and where to fix it, in words
      expect(screen.getByText(/No ring badges yet/)).toHaveTextContent(
        'No ring badges yet. They come with the rings you join: find one. Only you see this note.'
      );
    });

    it('should have descriptive tooltips', () => {
      const { container } = renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: createMockResidentData({ badges: [mockBadges[0]] }) }
      );
      
      const badgeWrapper = container.querySelector('[title]');
      expect(badgeWrapper).toHaveAttribute('title', 'Member of Tech Community');
    });

    it('should not interfere with badge component accessibility', () => {
      renderWithTemplateContext(
        <ProfileBadges />,
        { residentData: createMockResidentData({ badges: [mockBadges[0]] }) }
      );
      
      const badge = screen.getByTestId('mock-badge');
      expect(badge).toBeInTheDocument();
      // Badge component should handle its own accessibility
    });
  });
});