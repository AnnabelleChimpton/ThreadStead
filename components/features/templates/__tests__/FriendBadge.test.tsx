import React from 'react';
import { screen } from '@testing-library/react';
import FriendBadge from '../FriendBadge';
import { renderWithTemplateContext, createMockResidentData } from './test-utils';
import type { ResidentData } from '../ResidentDataProvider';

// pixelarticons ships SVG modules jest can't load
jest.mock('@/components/ui/PixelIcon', () => ({
  PixelIcon: ({ name }: { name: string }) => <span data-testid={`pixel-icon-${name}`} />
}));

const OWNER_ID = 'owner-1';

function renderAs(viewer: ResidentData['viewer'], ui = <FriendBadge />) {
  return renderWithTemplateContext(ui, {
    residentData: createMockResidentData({
      owner: { id: OWNER_ID, handle: 'owner', displayName: 'Owner' },
      viewer,
    }),
  });
}

const friend = { id: 'friend-1', isFriend: true, isFollowing: true, isFollower: true };

describe('FriendBadge', () => {
  describe('only shows for real friends', () => {
    it('shows for a viewer who is a friend (they follow each other)', () => {
      renderAs(friend);
      expect(screen.getByText('Friend')).toBeInTheDocument();
    });

    it('shows nothing to a signed-out visitor', () => {
      const { container } = renderAs({ id: null });
      expect(container).toBeEmptyDOMElement();
    });

    it('shows nothing to a stranger', () => {
      const { container } = renderAs({ id: 'stranger-1', isFriend: false });
      expect(container).toBeEmptyDOMElement();
    });

    it('shows nothing when the follow only goes one way', () => {
      const { container } = renderAs({ id: 'fan-1', isFollowing: true, isFollower: false, isFriend: false });
      expect(container).toBeEmptyDOMElement();
    });

    it('shows nothing to the owner on their own page', () => {
      const { container } = renderAs({ id: OWNER_ID });
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('look', () => {
    it('uses a pixel icon, not an emoji', () => {
      const { container } = renderAs(friend);
      expect(container.textContent).not.toContain('🤝');
      expect(container.textContent?.trim()).toBe('Friend');
      expect(screen.getByTestId('pixel-icon-users')).toBeInTheDocument();
    });

    it('keeps its badge classes', () => {
      const { container } = renderAs(friend);
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('inline-flex', 'items-center', 'gap-1', 'bg-green-200', 'border-black', 'text-xs', 'font-bold', 'rounded');
    });

    it('adds a custom className', () => {
      const { container } = renderAs(friend, <FriendBadge className="my-badge" />);
      expect(container.querySelector('span')).toHaveClass('my-badge');
    });

    it('sits inline in text', () => {
      const { container } = renderAs(friend, <p>They are a <FriendBadge /> of yours.</p>);
      expect(container.querySelector('p')?.textContent).toContain('They are a');
      expect(container.querySelector('p')?.textContent).toContain('Friend');
    });
  });
});
