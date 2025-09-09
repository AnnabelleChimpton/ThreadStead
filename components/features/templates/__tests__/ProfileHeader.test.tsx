import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfileHeader from '../ProfileHeader';
import { renderWithTemplateContext, createMockResidentData } from './test-utils';

// Mock Next.js Link to avoid router issues
jest.mock('next/link', () => {
  return function MockLink({ href, children, ...props }: any) {
    return <a href={href} {...props}>{children}</a>;
  };
});

// Mock child components to isolate ProfileHeader testing
jest.mock('../ProfilePhoto', () => {
  return function MockProfilePhoto({ size }: { size?: string }) {
    return <div data-testid="mock-profile-photo" data-size={size}>Mock Photo</div>;
  };
});

jest.mock('../FriendBadge', () => {
  return function MockFriendBadge() {
    return <span data-testid="mock-friend-badge">🤝 Friend</span>;
  };
});

jest.mock('../FollowButton', () => {
  return function MockFollowButton() {
    return <button data-testid="mock-follow-button">Follow</button>;
  };
});

jest.mock('../MutualFriends', () => {
  return function MockMutualFriends() {
    return <div data-testid="mock-mutual-friends">5 mutual friends</div>;
  };
});

describe('ProfileHeader Component', () => {
  const defaultResidentData = createMockResidentData({
    owner: {
      id: 'owner-123',
      handle: 'testuser',
      displayName: 'Test User',
      avatarUrl: 'https://example.com/avatar.jpg'
    },
    viewer: {
      id: 'viewer-456',
      handle: 'viewer',
      displayName: 'Viewer User'
    },
    capabilities: {
      bio: 'This is a test bio about the user.'
    }
  });

  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      renderWithTemplateContext(<ProfileHeader />, {
        residentData: defaultResidentData
      });

      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('Online - Resident of ThreadStead')).toBeInTheDocument();
      expect(screen.getByTestId('mock-profile-photo')).toBeInTheDocument();
    });

    it('should render with all sections visible by default', () => {
      renderWithTemplateContext(<ProfileHeader />, {
        residentData: defaultResidentData
      });

      expect(screen.getByTestId('mock-profile-photo')).toBeInTheDocument();
      expect(screen.getByText('This is a test bio about the user.')).toBeInTheDocument();
      expect(screen.getByTestId('mock-friend-badge')).toBeInTheDocument();
      expect(screen.getByTestId('mock-follow-button')).toBeInTheDocument();
      expect(screen.getByTestId('mock-mutual-friends')).toBeInTheDocument();
      expect(screen.getByText('Contact')).toBeInTheDocument();
    });

    it('should have correct data-component attribute', () => {
      const { container } = renderWithTemplateContext(<ProfileHeader />, {
        residentData: defaultResidentData
      });

      const header = container.querySelector('[data-component="profile-header"]');
      expect(header).toBeInTheDocument();
    });

    it('should have proper CSS classes', () => {
      const { container } = renderWithTemplateContext(<ProfileHeader />, {
        residentData: defaultResidentData
      });

      const header = container.querySelector('.ts-profile-header');
      expect(header).toBeInTheDocument();
      
      const layout = container.querySelector('.ts-profile-header-layout');
      expect(layout).toBeInTheDocument();
    });
  });

  describe('Display Name and Status', () => {
    it('should display owner displayName', () => {
      renderWithTemplateContext(<ProfileHeader />, {
        residentData: defaultResidentData
      });

      const displayName = screen.getByText('Test User');
      expect(displayName).toHaveClass('ts-profile-display-name');
      expect(displayName).toHaveClass('thread-headline');
      expect(displayName.tagName).toBe('H2');
    });

    it('should display status message', () => {
      renderWithTemplateContext(<ProfileHeader />, {
        residentData: defaultResidentData
      });

      const status = screen.getByText('Online - Resident of ThreadStead');
      expect(status).toHaveClass('ts-profile-status');
      expect(status).toHaveClass('thread-label');
      expect(status.tagName).toBe('SPAN');
    });
  });

  describe('Photo Section Control', () => {
    it('should show photo when showPhoto is true (default)', () => {
      renderWithTemplateContext(<ProfileHeader showPhoto={true} />, {
        residentData: defaultResidentData
      });

      expect(screen.getByTestId('mock-profile-photo')).toBeInTheDocument();
    });

    it('should hide photo when showPhoto is false', () => {
      renderWithTemplateContext(<ProfileHeader showPhoto={false} />, {
        residentData: defaultResidentData
      });

      expect(screen.queryByTestId('mock-profile-photo')).not.toBeInTheDocument();
    });

    it('should pass photoSize prop to ProfilePhoto component', () => {
      renderWithTemplateContext(<ProfileHeader photoSize="lg" />, {
        residentData: defaultResidentData
      });

      const photo = screen.getByTestId('mock-profile-photo');
      expect(photo).toHaveAttribute('data-size', 'lg');
    });

    it('should use default photoSize of "md" when not specified', () => {
      renderWithTemplateContext(<ProfileHeader />, {
        residentData: defaultResidentData
      });

      const photo = screen.getByTestId('mock-profile-photo');
      expect(photo).toHaveAttribute('data-size', 'md');
    });
  });

  describe('Bio Section Control', () => {
    it('should show bio when showBio is true and capabilities.bio exists', () => {
      renderWithTemplateContext(<ProfileHeader showBio={true} />, {
        residentData: defaultResidentData
      });

      expect(screen.getByText('This is a test bio about the user.')).toBeInTheDocument();
    });

    it('should hide bio when showBio is false', () => {
      renderWithTemplateContext(<ProfileHeader showBio={false} />, {
        residentData: defaultResidentData
      });

      expect(screen.queryByText('This is a test bio about the user.')).not.toBeInTheDocument();
    });

    it('should hide bio when capabilities.bio is not available', () => {
      const noBioData = createMockResidentData({
        owner: defaultResidentData.owner,
        viewer: defaultResidentData.viewer,
        capabilities: {} // No bio capability
      });

      renderWithTemplateContext(<ProfileHeader showBio={true} />, {
        residentData: noBioData
      });

      expect(screen.queryByText('This is a test bio about the user.')).not.toBeInTheDocument();
    });

    it('should hide bio when capabilities is undefined', () => {
      const noBioData = createMockResidentData({
        owner: defaultResidentData.owner,
        viewer: defaultResidentData.viewer
        // capabilities undefined
      });

      renderWithTemplateContext(<ProfileHeader showBio={true} />, {
        residentData: noBioData
      });

      expect(screen.queryByText('This is a test bio about the user.')).not.toBeInTheDocument();
    });
  });

  describe('Actions Section Control', () => {
    it('should show actions when showActions is true and viewer exists', () => {
      renderWithTemplateContext(<ProfileHeader showActions={true} />, {
        residentData: defaultResidentData
      });

      expect(screen.getByTestId('mock-friend-badge')).toBeInTheDocument();
      expect(screen.getByTestId('mock-follow-button')).toBeInTheDocument();
      expect(screen.getByTestId('mock-mutual-friends')).toBeInTheDocument();
      expect(screen.getByText('Contact')).toBeInTheDocument();
    });

    it('should hide actions when showActions is false', () => {
      renderWithTemplateContext(<ProfileHeader showActions={false} />, {
        residentData: defaultResidentData
      });

      expect(screen.queryByTestId('mock-friend-badge')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mock-follow-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mock-mutual-friends')).not.toBeInTheDocument();
      expect(screen.queryByText('Contact')).not.toBeInTheDocument();
    });

    it('should hide actions when viewer is null', () => {
      const noViewerData = createMockResidentData({
        owner: defaultResidentData.owner,
        viewer: null,
        capabilities: defaultResidentData.capabilities
      });

      renderWithTemplateContext(<ProfileHeader showActions={true} />, {
        residentData: noViewerData
      });

      expect(screen.queryByTestId('mock-friend-badge')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mock-follow-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mock-mutual-friends')).not.toBeInTheDocument();
      expect(screen.queryByText('Contact')).not.toBeInTheDocument();
    });

    it('should hide actions when viewer is undefined', () => {
      const noViewerData = createMockResidentData({
        owner: defaultResidentData.owner,
        capabilities: defaultResidentData.capabilities,
        viewer: undefined
      });

      renderWithTemplateContext(<ProfileHeader showActions={true} />, {
        residentData: noViewerData
      });

      expect(screen.queryByTestId('mock-friend-badge')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mock-follow-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mock-mutual-friends')).not.toBeInTheDocument();
      expect(screen.queryByText('Contact')).not.toBeInTheDocument();
    });
  });

  describe('Contact Link', () => {
    it('should have correct href for contact link', () => {
      renderWithTemplateContext(<ProfileHeader />, {
        residentData: defaultResidentData
      });

      const contactLink = screen.getByRole('link', { name: 'Contact' });
      expect(contactLink).toHaveAttribute('href', '/resident/testuser/contact');
    });

    it('should have correct CSS classes for contact link', () => {
      renderWithTemplateContext(<ProfileHeader />, {
        residentData: defaultResidentData
      });

      const contactLink = screen.getByRole('link', { name: 'Contact' });
      expect(contactLink).toHaveClass('ts-contact-link');
      expect(contactLink).toHaveClass('thread-button-outline');
    });
  });

  describe('Custom ClassName Handling', () => {
    it('should apply custom className when provided as string', () => {
      const { container } = renderWithTemplateContext(
        <ProfileHeader className="custom-header-class" />, 
        { residentData: defaultResidentData }
      );

      const header = container.querySelector('.ts-profile-header.custom-header-class');
      expect(header).toBeInTheDocument();
    });

    it('should apply custom className when provided as array', () => {
      const { container } = renderWithTemplateContext(
        <ProfileHeader className={['custom-class-1', 'custom-class-2']} />, 
        { residentData: defaultResidentData }
      );

      const header = container.querySelector('.ts-profile-header.custom-class-1.custom-class-2');
      expect(header).toBeInTheDocument();
    });

    it('should handle empty array className', () => {
      const { container } = renderWithTemplateContext(
        <ProfileHeader className={[]} />, 
        { residentData: defaultResidentData }
      );

      const header = container.querySelector('.ts-profile-header');
      expect(header).toBeInTheDocument();
      expect(header?.className).toBe('ts-profile-header');
    });

    it('should handle undefined className', () => {
      const { container } = renderWithTemplateContext(
        <ProfileHeader className={undefined} />, 
        { residentData: defaultResidentData }
      );

      const header = container.querySelector('.ts-profile-header');
      expect(header).toBeInTheDocument();
      expect(header?.className).toBe('ts-profile-header');
    });
  });

  describe('Responsive Layout', () => {
    it('should have responsive layout classes', () => {
      const { container } = renderWithTemplateContext(<ProfileHeader />, {
        residentData: defaultResidentData
      });

      const layout = container.querySelector('.ts-profile-header-layout');
      expect(layout).toHaveClass('flex', 'flex-col', 'sm:flex-row', 'sm:items-start', 'sm:gap-6');
    });

    it('should have proper section classes', () => {
      const { container } = renderWithTemplateContext(<ProfileHeader />, {
        residentData: defaultResidentData
      });

      const photoSection = container.querySelector('.ts-profile-photo-section');
      expect(photoSection).toBeInTheDocument();

      const infoSection = container.querySelector('.ts-profile-info-section');
      expect(infoSection).toHaveClass('flex-1');
    });
  });

  describe('Props Validation - photoSize', () => {
    const validSizes = ['xs', 'sm', 'md', 'lg'] as const;
    
    validSizes.forEach(size => {
      it(`should accept photoSize="${size}"`, () => {
        renderWithTemplateContext(<ProfileHeader photoSize={size} />, {
          residentData: defaultResidentData
        });

        const photo = screen.getByTestId('mock-profile-photo');
        expect(photo).toHaveAttribute('data-size', size);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      renderWithTemplateContext(<ProfileHeader />, {
        residentData: defaultResidentData
      });

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Test User');
    });

    it('should have accessible contact link', () => {
      renderWithTemplateContext(<ProfileHeader />, {
        residentData: defaultResidentData
      });

      const contactLink = screen.getByRole('link', { name: 'Contact' });
      expect(contactLink).toBeInTheDocument();
    });

    it('should maintain logical tab order', () => {
      renderWithTemplateContext(<ProfileHeader />, {
        residentData: defaultResidentData
      });

      // The contact link should be focusable
      const contactLink = screen.getByRole('link', { name: 'Contact' });
      expect(contactLink).not.toHaveAttribute('tabindex', '-1');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing owner displayName gracefully', () => {
      const incompleteOwnerData = createMockResidentData({
        owner: {
          id: 'owner-123',
          handle: 'testuser'
          // Missing displayName
        },
        viewer: defaultResidentData.viewer,
        capabilities: defaultResidentData.capabilities
      });

      renderWithTemplateContext(<ProfileHeader />, {
        residentData: incompleteOwnerData
      });

      // Component should render without crashing
      expect(screen.getByText('Online - Resident of ThreadStead')).toBeInTheDocument();
    });

    it('should handle missing owner handle gracefully', () => {
      const incompleteOwnerData = createMockResidentData({
        owner: {
          id: 'owner-123',
          displayName: 'Test User'
          // Missing handle
        },
        viewer: defaultResidentData.viewer,
        capabilities: defaultResidentData.capabilities
      });

      // Should render without crashing, though contact link href may be undefined
      renderWithTemplateContext(<ProfileHeader />, {
        residentData: incompleteOwnerData
      });

      expect(screen.getByText('Test User')).toBeInTheDocument();
    });
  });

  describe('Integration with Child Components', () => {
    it('should render all expected child components when actions are enabled', () => {
      renderWithTemplateContext(<ProfileHeader showActions={true} />, {
        residentData: defaultResidentData
      });

      // Verify all mocked child components are rendered
      expect(screen.getByTestId('mock-profile-photo')).toBeInTheDocument();
      expect(screen.getByTestId('mock-friend-badge')).toBeInTheDocument();
      expect(screen.getByTestId('mock-follow-button')).toBeInTheDocument();
      expect(screen.getByTestId('mock-mutual-friends')).toBeInTheDocument();
    });

    it('should pass correct props to ProfilePhoto', () => {
      renderWithTemplateContext(<ProfileHeader photoSize="lg" />, {
        residentData: defaultResidentData
      });

      const photo = screen.getByTestId('mock-profile-photo');
      expect(photo).toHaveAttribute('data-size', 'lg');
    });
  });

  describe('Component Structure and CSS Classes', () => {
    it('should have all required CSS class names for styling', () => {
      const { container } = renderWithTemplateContext(<ProfileHeader />, {
        residentData: defaultResidentData
      });

      // Main header classes
      expect(container.querySelector('.ts-profile-header')).toBeInTheDocument();
      expect(container.querySelector('.ts-profile-header-layout')).toBeInTheDocument();
      
      // Section classes
      expect(container.querySelector('.ts-profile-photo-section')).toBeInTheDocument();
      expect(container.querySelector('.ts-profile-info-section')).toBeInTheDocument();
      expect(container.querySelector('.ts-profile-identity')).toBeInTheDocument();
      expect(container.querySelector('.ts-profile-display-name')).toBeInTheDocument();
      expect(container.querySelector('.ts-profile-status')).toBeInTheDocument();
      expect(container.querySelector('.ts-profile-bio-section')).toBeInTheDocument();
      expect(container.querySelector('.ts-profile-bio')).toBeInTheDocument();
      expect(container.querySelector('.ts-profile-actions')).toBeInTheDocument();
      expect(container.querySelector('.ts-contact-link')).toBeInTheDocument();
    });

    it('should have proper semantic HTML structure', () => {
      const { container } = renderWithTemplateContext(<ProfileHeader />, {
        residentData: defaultResidentData
      });

      // Should use semantic HTML tags
      expect(container.querySelector('h2')).toBeInTheDocument(); // Display name
      expect(container.querySelector('span')).toBeInTheDocument(); // Status
      expect(container.querySelector('p')).toBeInTheDocument(); // Bio
      expect(container.querySelector('a')).toBeInTheDocument(); // Contact link
    });
  });
});