import React from 'react';
import { screen } from '@testing-library/react';
import ProfilePhoto from '../ProfilePhoto';
import { renderWithTemplateContext, createMockResidentData } from './test-utils';

describe('ProfilePhoto Component', () => {
  describe('Basic Functionality', () => {
    it('should render profile photo when avatar URL exists', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'testuser',
          displayName: 'Test User',
          avatarUrl: '/test-avatar.jpg'
        }
      });

      renderWithTemplateContext(
        <ProfilePhoto />,
        { residentData: mockData }
      );

      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', '/test-avatar.jpg');
      expect(img).toHaveAttribute('alt', "Test User's profile photo");
    });

    it('should render placeholder when no avatar URL exists', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'testuser',
          displayName: 'Test User',
          avatarUrl: ''
        }
      });

      renderWithTemplateContext(
        <ProfilePhoto />,
        { residentData: mockData }
      );

      expect(screen.queryByRole('img')).not.toBeInTheDocument();
      expect(screen.getByText('No Photo')).toBeInTheDocument();
    });

    it('should render placeholder when avatar URL is null/undefined', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'testuser',
          displayName: 'Test User',
          avatarUrl: undefined as any
        }
      });

      renderWithTemplateContext(
        <ProfilePhoto />,
        { residentData: mockData }
      );

      expect(screen.queryByRole('img')).not.toBeInTheDocument();
      expect(screen.getByText('No Photo')).toBeInTheDocument();
    });
  });

  describe('Size Prop', () => {
    const testSizes = [
      { size: 'xs' as const, expectedClasses: 'w-8 h-8' },
      { size: 'sm' as const, expectedClasses: 'w-16 h-16' },
      { size: 'md' as const, expectedClasses: 'w-32 h-32' },
      { size: 'lg' as const, expectedClasses: 'w-48 h-48' }
    ];

    testSizes.forEach(({ size, expectedClasses }) => {
      it(`should apply correct size classes for size="${size}"`, () => {
        const mockData = createMockResidentData({
          owner: {
            id: 'test-user',
            handle: 'testuser',
            displayName: 'Test User',
            avatarUrl: '/test-avatar.jpg'
          }
        });

        renderWithTemplateContext(
          <ProfilePhoto size={size} />,
          { residentData: mockData }
        );

        const img = screen.getByRole('img');
        expect(img).toHaveClass(expectedClasses);
      });

      it(`should apply correct size classes to placeholder for size="${size}"`, () => {
        const mockData = createMockResidentData({
          owner: {
            id: 'test-user',
            handle: 'testuser',
            displayName: 'Test User',
            avatarUrl: ''
          }
        });

        renderWithTemplateContext(
          <ProfilePhoto size={size} />,
          { residentData: mockData }
        );

        const placeholder = screen.getByText('No Photo');
        expect(placeholder).toHaveClass(expectedClasses);
      });
    });

    it('should default to medium size when no size prop provided', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'testuser',
          displayName: 'Test User',
          avatarUrl: '/test-avatar.jpg'
        }
      });

      renderWithTemplateContext(
        <ProfilePhoto />,
        { residentData: mockData }
      );

      const img = screen.getByRole('img');
      expect(img).toHaveClass('w-32 h-32'); // md size
    });
  });

  describe('Shape Prop', () => {
    it('should apply circle shape by default', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'testuser',
          displayName: 'Test User',
          avatarUrl: '/test-avatar.jpg'
        }
      });

      renderWithTemplateContext(
        <ProfilePhoto />,
        { residentData: mockData }
      );

      const img = screen.getByRole('img');
      expect(img).toHaveClass('rounded-full');
      expect(img).not.toHaveClass('rounded-none');
    });

    it('should apply circle shape when shape="circle"', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'testuser',
          displayName: 'Test User',
          avatarUrl: '/test-avatar.jpg'
        }
      });

      renderWithTemplateContext(
        <ProfilePhoto shape="circle" />,
        { residentData: mockData }
      );

      const img = screen.getByRole('img');
      expect(img).toHaveClass('rounded-full');
    });

    it('should apply square shape when shape="square"', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'testuser',
          displayName: 'Test User',
          avatarUrl: '/test-avatar.jpg'
        }
      });

      renderWithTemplateContext(
        <ProfilePhoto shape="square" />,
        { residentData: mockData }
      );

      const img = screen.getByRole('img');
      expect(img).toHaveClass('rounded-none');
      expect(img).not.toHaveClass('rounded-full');
    });

    it('should apply shape classes to placeholder', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'testuser',
          displayName: 'Test User',
          avatarUrl: ''
        }
      });

      const { rerender } = renderWithTemplateContext(
        <ProfilePhoto shape="circle" />,
        { residentData: mockData }
      );

      const placeholder = screen.getByText('No Photo');
      expect(placeholder).toHaveClass('rounded-full');

      rerender(<ProfilePhoto shape="square" />);
      expect(screen.getByText('No Photo')).toHaveClass('rounded-none');
    });
  });

  describe('Combined Props', () => {
    it('should handle both size and shape props together', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'testuser',
          displayName: 'Test User',
          avatarUrl: '/test-avatar.jpg'
        }
      });

      renderWithTemplateContext(
        <ProfilePhoto size="lg" shape="square" />,
        { residentData: mockData }
      );

      const img = screen.getByRole('img');
      expect(img).toHaveClass('w-48 h-48'); // lg size
      expect(img).toHaveClass('rounded-none'); // square shape
    });
  });

  describe('Custom ClassName', () => {
    it('should apply custom className when provided as string', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'testuser',
          displayName: 'Test User',
          avatarUrl: '/test-avatar.jpg'
        }
      });

      renderWithTemplateContext(
        <ProfilePhoto className="custom-photo-class" />,
        { residentData: mockData }
      );

      const wrapper = screen.getByRole('img').closest('.profile-photo-wrapper');
      expect(wrapper).toHaveClass('custom-photo-class');
      expect(wrapper).toHaveClass('profile-photo-wrapper');
    });

    it('should handle className provided as array', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'testuser',
          displayName: 'Test User',
          avatarUrl: '/test-avatar.jpg'
        }
      });

      renderWithTemplateContext(
        <ProfilePhoto className={['class1', 'class2', 'class3'] as any} />,
        { residentData: mockData }
      );

      const wrapper = screen.getByRole('img').closest('.profile-photo-wrapper');
      expect(wrapper).toHaveClass('class1');
      expect(wrapper).toHaveClass('class2');
      expect(wrapper).toHaveClass('class3');
    });

    it('should not break when className is empty', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'testuser',
          displayName: 'Test User',
          avatarUrl: '/test-avatar.jpg'
        }
      });

      renderWithTemplateContext(
        <ProfilePhoto className="" />,
        { residentData: mockData }
      );

      const wrapper = screen.getByRole('img').closest('.profile-photo-wrapper');
      expect(wrapper).toHaveClass('profile-photo-wrapper');
    });
  });

  describe('CSS Classes and Structure', () => {
    it('should apply correct wrapper classes', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'testuser',
          displayName: 'Test User',
          avatarUrl: '/test-avatar.jpg'
        }
      });

      renderWithTemplateContext(
        <ProfilePhoto />,
        { residentData: mockData }
      );

      const wrapper = screen.getByRole('img').closest('.profile-photo-wrapper');
      expect(wrapper).toHaveClass('profile-photo-wrapper');
      expect(wrapper).toHaveClass('flex');
      expect(wrapper).toHaveClass('flex-col');
      expect(wrapper).toHaveClass('items-center');
      expect(wrapper).toHaveClass('mb-4');
    });

    it('should apply correct frame classes', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'testuser',
          displayName: 'Test User',
          avatarUrl: '/test-avatar.jpg'
        }
      });

      renderWithTemplateContext(
        <ProfilePhoto />,
        { residentData: mockData }
      );

      const frame = screen.getByRole('img').parentElement;
      expect(frame).toHaveClass('profile-photo-frame');
      expect(frame).toHaveClass('border-4');
      expect(frame).toHaveClass('border-black');
      expect(frame).toHaveClass('shadow-[4px_4px_0_#000]');
      expect(frame).toHaveClass('bg-white');
      expect(frame).toHaveClass('p-1');
    });

    it('should apply correct image classes', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'testuser',
          displayName: 'Test User',
          avatarUrl: '/test-avatar.jpg'
        }
      });

      renderWithTemplateContext(
        <ProfilePhoto />,
        { residentData: mockData }
      );

      const img = screen.getByRole('img');
      expect(img).toHaveClass('profile-photo-image');
      expect(img).toHaveClass('object-cover');
    });

    it('should apply correct placeholder classes', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'testuser',
          displayName: 'Test User',
          avatarUrl: ''
        }
      });

      renderWithTemplateContext(
        <ProfilePhoto />,
        { residentData: mockData }
      );

      const placeholder = screen.getByText('No Photo');
      expect(placeholder).toHaveClass('profile-photo-placeholder');
      expect(placeholder).toHaveClass('flex');
      expect(placeholder).toHaveClass('items-center');
      expect(placeholder).toHaveClass('justify-center');
      expect(placeholder).toHaveClass('bg-yellow-200');
      expect(placeholder).toHaveClass('text-black');
      expect(placeholder).toHaveClass('text-sm');
    });
  });

  describe('Owner Data Handling', () => {
    it('should handle missing displayName gracefully', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'testuser',
          displayName: '',
          avatarUrl: '/test-avatar.jpg'
        }
      });

      renderWithTemplateContext(
        <ProfilePhoto />,
        { residentData: mockData }
      );

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('alt', "Unknown's profile photo");
    });

    it('should handle missing owner gracefully', () => {
      const mockData = createMockResidentData({
        owner: undefined as any
      });

      expect(() => {
        renderWithTemplateContext(
          <ProfilePhoto />,
          { residentData: mockData }
        );
      }).not.toThrow();
    });

    it('should use different avatar URLs correctly', () => {
      const testUrls = [
        '/avatar1.jpg',
        'https://example.com/avatar2.png',
        '/assets/images/profile.webp',
        'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='
      ];

      testUrls.forEach((url, index) => {
        const mockData = createMockResidentData({
          owner: {
            id: `test-user-${index}`,
            handle: `testuser${index}`,
            displayName: `Test User ${index}`,
            avatarUrl: url
          }
        });

        const { unmount } = renderWithTemplateContext(
          <ProfilePhoto />,
          { residentData: mockData }
        );

        const img = screen.getByRole('img');
        expect(img).toHaveAttribute('src', url);
        unmount();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in displayName for alt text', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'testuser',
          displayName: 'John "Johnny" O\'Connor & Co.',
          avatarUrl: '/test-avatar.jpg'
        }
      });

      renderWithTemplateContext(
        <ProfilePhoto />,
        { residentData: mockData }
      );

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('alt', 'John "Johnny" O\'Connor & Co.\'s profile photo');
    });

    it('should handle very long displayName', () => {
      const longName = 'A'.repeat(200);
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'testuser',
          displayName: longName,
          avatarUrl: '/test-avatar.jpg'
        }
      });

      renderWithTemplateContext(
        <ProfilePhoto />,
        { residentData: mockData }
      );

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('alt', `${longName}'s profile photo`);
    });

    it('should handle empty array className', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'testuser',
          displayName: 'Test User',
          avatarUrl: '/test-avatar.jpg'
        }
      });

      renderWithTemplateContext(
        <ProfilePhoto className={[] as any} />,
        { residentData: mockData }
      );

      const wrapper = screen.getByRole('img').closest('.profile-photo-wrapper');
      expect(wrapper).toHaveClass('profile-photo-wrapper');
    });
  });

  describe('Accessibility', () => {
    it('should have proper alt text for profile photos', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'testuser',
          displayName: 'John Doe',
          avatarUrl: '/test-avatar.jpg'
        }
      });

      renderWithTemplateContext(
        <ProfilePhoto />,
        { residentData: mockData }
      );

      const img = screen.getByRole('img');
      expect(img).toHaveAccessibleName('John Doe\'s profile photo');
    });

    it('should not have img role when showing placeholder', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'testuser',
          displayName: 'Test User',
          avatarUrl: ''
        }
      });

      renderWithTemplateContext(
        <ProfilePhoto />,
        { residentData: mockData }
      );

      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('should maintain visual hierarchy with proper structure', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'testuser',
          displayName: 'Test User',
          avatarUrl: '/test-avatar.jpg'
        }
      });

      renderWithTemplateContext(
        <ProfilePhoto />,
        { residentData: mockData }
      );

      const wrapper = screen.getByRole('img').closest('.profile-photo-wrapper');
      const frame = screen.getByRole('img').parentElement;
      const img = screen.getByRole('img');

      expect(wrapper).toContainElement(frame);
      expect(frame).toContainElement(img);
    });
  });

  describe('Integration', () => {
    it('should work with different data contexts', () => {
      const contexts = [
        { id: 'user1', handle: 'user1', displayName: 'User One', avatarUrl: '/avatar1.jpg' },
        { id: 'user2', handle: 'user2', displayName: 'User Two', avatarUrl: '' },
        { id: 'user3', handle: 'user3', displayName: 'User Three', avatarUrl: '/avatar3.png' }
      ];

      contexts.forEach((owner, index) => {
        const mockData = createMockResidentData({ owner });
        const { unmount } = renderWithTemplateContext(
          <ProfilePhoto size="sm" />,
          { residentData: mockData }
        );

        if (owner.avatarUrl) {
          const img = screen.getByRole('img');
          expect(img).toHaveAttribute('src', owner.avatarUrl);
          expect(img).toHaveAttribute('alt', `${owner.displayName}'s profile photo`);
        } else {
          expect(screen.getByText('No Photo')).toBeInTheDocument();
        }

        unmount();
      });
    });

    it('should maintain consistent sizing across re-renders', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'testuser',
          displayName: 'Test User',
          avatarUrl: '/test-avatar.jpg'
        }
      });

      const { rerender } = renderWithTemplateContext(
        <ProfilePhoto size="lg" />,
        { residentData: mockData }
      );

      let img = screen.getByRole('img');
      expect(img).toHaveClass('w-48 h-48');

      rerender(<ProfilePhoto size="xs" />);
      img = screen.getByRole('img');
      expect(img).toHaveClass('w-8 h-8');
      expect(img).not.toHaveClass('w-48 h-48');
    });
  });
});