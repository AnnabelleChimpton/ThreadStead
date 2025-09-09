import React from 'react';
import { screen, cleanup } from '@testing-library/react';
import MediaGrid from '../MediaGrid';
import { renderWithTemplateContext } from './test-utils';

describe('MediaGrid Component', () => {
  beforeEach(() => {
    cleanup(); // Ensure clean state between tests
  });

  afterEach(() => {
    cleanup(); // Additional cleanup after each test
  });
  const mockImages = [
    { id: '1', url: '/image1.jpg', caption: 'First image', createdAt: '2024-01-01' },
    { id: '2', url: '/image2.jpg', caption: 'Second image', createdAt: '2024-01-02' },
    { id: '3', url: '/image3.jpg', alt: 'Third image alt', createdAt: '2024-01-03' },
    { id: '4', url: '/image4.jpg', createdAt: '2024-01-04' },
    { id: '5', url: '/image5.jpg', caption: 'Fifth image', createdAt: '2024-01-05' },
    { id: '6', url: '/image6.jpg', caption: 'Sixth image', createdAt: '2024-01-06' },
    { id: '7', url: '/image7.jpg', caption: 'Seventh image', createdAt: '2024-01-07' },
  ];

  describe('Basic Rendering', () => {
    it('should render with images', () => {
      renderWithTemplateContext(
        <MediaGrid />,
        { residentData: { images: mockImages.slice(0, 3) } }
      );
      
      expect(screen.getByText('Featured Photos')).toBeInTheDocument();
      expect(screen.getAllByRole('img')).toHaveLength(3);
    });

    it('should render empty state when no images', () => {
      renderWithTemplateContext(
        <MediaGrid />,
        { residentData: { images: [] } }
      );
      
      expect(screen.getByText('No featured photos')).toBeInTheDocument();
      expect(screen.getByText('🖼️')).toBeInTheDocument();
    });

    it('should render empty state when images is null', () => {
      renderWithTemplateContext(
        <MediaGrid />,
        { residentData: { images: null } }
      );
      
      expect(screen.getByText('No featured photos')).toBeInTheDocument();
    });

    it('should render empty state when images is undefined', () => {
      renderWithTemplateContext(
        <MediaGrid />,
        { residentData: { images: undefined } }
      );
      
      expect(screen.getByText('No featured photos')).toBeInTheDocument();
    });

    it('should have correct container structure', () => {
      const { container } = renderWithTemplateContext(
        <MediaGrid />,
        { residentData: { images: mockImages } }
      );
      
      const mediaGrid = container.querySelector('.media-grid');
      expect(mediaGrid).toBeInTheDocument();
      expect(mediaGrid).toHaveClass('profile-tab-content', 'space-y-6');
    });
  });

  describe('Image Display', () => {
    it('should limit display to 6 images', () => {
      renderWithTemplateContext(
        <MediaGrid />,
        { residentData: { images: mockImages } }
      );
      
      const images = screen.getAllByRole('img');
      expect(images).toHaveLength(6);
    });

    it('should sort images by creation date (newest first)', () => {
      const unsortedImages = [
        { id: '1', url: '/old.jpg', createdAt: '2023-01-01' },
        { id: '2', url: '/new.jpg', createdAt: '2024-01-01' },
        { id: '3', url: '/middle.jpg', createdAt: '2023-06-01' },
      ];
      
      renderWithTemplateContext(
        <MediaGrid />,
        { residentData: { images: unsortedImages } }
      );
      
      const images = screen.getAllByRole('img');
      expect(images[0]).toHaveAttribute('src', '/new.jpg');
      expect(images[1]).toHaveAttribute('src', '/middle.jpg');
      expect(images[2]).toHaveAttribute('src', '/old.jpg');
    });

    it('should display image captions as alt text', () => {
      // Use images with more recent dates to ensure they appear first after sorting
      const testImages = [
        { id: '1', url: '/image1.jpg', caption: 'First image', createdAt: '2024-12-01' },
        { id: '2', url: '/image2.jpg', caption: 'Second image', createdAt: '2024-12-02' },
      ];
      
      renderWithTemplateContext(
        <MediaGrid />,
        { residentData: { images: testImages } }
      );
      
      expect(screen.getByAltText('Second image')).toBeInTheDocument(); // Most recent first
      expect(screen.getByAltText('First image')).toBeInTheDocument();
    });

    it('should use alt attribute when caption is missing', () => {
      // Explicitly create the test image to avoid array reference issues
      const testImage = { id: '3', url: '/image3.jpg', alt: 'Third image alt', createdAt: '2024-01-03' };
      
      renderWithTemplateContext(
        <MediaGrid />,
        { residentData: { images: [testImage] } } // Has alt but no caption
      );
      
      expect(screen.getByAltText('Third image alt')).toBeInTheDocument();
    });

    it('should use default alt text when both caption and alt are missing', () => {
      renderWithTemplateContext(
        <MediaGrid />,
        { residentData: { images: [mockImages[3]] } } // No caption or alt
      );
      
      expect(screen.getByAltText('Photo')).toBeInTheDocument();
    });

    it('should set lazy loading on images', () => {
      renderWithTemplateContext(
        <MediaGrid />,
        { residentData: { images: mockImages.slice(0, 2) } }
      );
      
      const images = screen.getAllByRole('img');
      images.forEach(img => {
        expect(img).toHaveAttribute('loading', 'lazy');
      });
    });
  });

  describe('Header Section', () => {
    it('should display owner displayName in header', () => {
      renderWithTemplateContext(
        <MediaGrid />,
        { residentData: { 
          images: mockImages,
          owner: { displayName: 'John Doe' }
        }}
      );
      
      expect(screen.getByText("John Doe's favorite photos")).toBeInTheDocument();
    });

    it('should display owner handle when displayName is missing', () => {
      renderWithTemplateContext(
        <MediaGrid />,
        { residentData: { 
          images: mockImages,
          owner: { handle: '@johndoe' }
        }}
      );
      
      expect(screen.getByText("@johndoe's favorite photos")).toBeInTheDocument();
    });

    it('should show View All button when images exist', () => {
      renderWithTemplateContext(
        <MediaGrid />,
        { residentData: { images: mockImages } }
      );
      
      expect(screen.getByText('View All')).toBeInTheDocument();
    });

    it('should not show View All button when no images', () => {
      renderWithTemplateContext(
        <MediaGrid />,
        { residentData: { images: [] } }
      );
      
      expect(screen.queryByText('View All')).not.toBeInTheDocument();
    });
  });

  describe('Footer Section', () => {
    it('should show explore link when images exist', () => {
      renderWithTemplateContext(
        <MediaGrid />,
        { residentData: { 
          images: mockImages,
          owner: { displayName: 'Jane' }
        }}
      );
      
      expect(screen.getByText("Explore Jane's complete photo collection →")).toBeInTheDocument();
    });

    it('should not show explore link when no images', () => {
      renderWithTemplateContext(
        <MediaGrid />,
        { residentData: { images: [] } }
      );
      
      expect(screen.queryByText(/complete photo collection/)).not.toBeInTheDocument();
    });

    it('should use handle in explore link when displayName missing', () => {
      renderWithTemplateContext(
        <MediaGrid />,
        { residentData: { 
          images: mockImages,
          owner: { handle: '@user' }
        }}
      );
      
      expect(screen.getByText("Explore @user's complete photo collection →")).toBeInTheDocument();
    });
  });

  describe('Custom ClassName Handling', () => {
    it('should apply custom className string', () => {
      const { container } = renderWithTemplateContext(
        <MediaGrid className="custom-class" />
      );
      
      const mediaGrid = container.querySelector('.media-grid');
      expect(mediaGrid).toHaveClass('custom-class');
    });

    it('should handle className as array', () => {
      const { container } = renderWithTemplateContext(
        <MediaGrid className={['class1', 'class2'] as any} />
      );
      
      const mediaGrid = container.querySelector('.media-grid');
      expect(mediaGrid).toHaveClass('class1', 'class2');
    });

    it('should handle empty className', () => {
      const { container } = renderWithTemplateContext(
        <MediaGrid className="" />
      );
      
      const mediaGrid = container.querySelector('.media-grid');
      expect(mediaGrid).toHaveClass('media-grid', 'profile-tab-content', 'space-y-6');
    });

    it('should handle undefined className', () => {
      const { container } = renderWithTemplateContext(
        <MediaGrid />
      );
      
      const mediaGrid = container.querySelector('.media-grid');
      expect(mediaGrid).toHaveClass('media-grid', 'profile-tab-content', 'space-y-6');
    });
  });

  describe('Grid Layout', () => {
    it('should use correct grid classes', () => {
      const { container } = renderWithTemplateContext(
        <MediaGrid />,
        { residentData: { images: mockImages } }
      );
      
      const gallery = container.querySelector('.media-gallery');
      expect(gallery).toHaveClass('grid', 'grid-cols-2', 'sm:grid-cols-3', 'gap-4');
    });

    it('should apply aspect-square to images', () => {
      const { container } = renderWithTemplateContext(
        <MediaGrid />,
        { residentData: { images: mockImages.slice(0, 2) } }
      );
      
      const mediaItems = container.querySelectorAll('.media-item');
      mediaItems.forEach(item => {
        expect(item).toHaveClass('aspect-square');
      });
    });

    it('should apply proper image styling', () => {
      const { container } = renderWithTemplateContext(
        <MediaGrid />,
        { residentData: { images: mockImages.slice(0, 1) } }
      );
      
      const img = container.querySelector('img');
      expect(img).toHaveClass('w-full', 'h-full', 'object-cover');
    });

    it('should have hover effect classes', () => {
      const { container } = renderWithTemplateContext(
        <MediaGrid />,
        { residentData: { images: mockImages.slice(0, 1) } }
      );
      
      const img = container.querySelector('img');
      expect(img).toHaveClass('transition-transform', 'group-hover:scale-105');
    });
  });

  describe('Caption Overlay', () => {
    it('should render caption overlay when caption exists', () => {
      const testImage = { id: '1', url: '/image1.jpg', caption: 'Test caption', createdAt: '2024-12-01' };
      const { container } = renderWithTemplateContext(
        <MediaGrid />,
        { residentData: { images: [testImage] } }
      );
      
      const overlay = container.querySelector('.absolute.inset-0');
      expect(overlay).toBeInTheDocument();
      expect(screen.getByText('Test caption')).toBeInTheDocument();
    });

    it('should not render caption overlay when caption is missing', () => {
      const { container } = renderWithTemplateContext(
        <MediaGrid />,
        { residentData: { images: [mockImages[3]] } } // No caption
      );
      
      const overlay = container.querySelector('.absolute.inset-0');
      expect(overlay).not.toBeInTheDocument();
    });

    it('should apply hover opacity classes to overlay', () => {
      const { container } = renderWithTemplateContext(
        <MediaGrid />,
        { residentData: { images: [mockImages[0]] } }
      );
      
      const overlay = container.querySelector('.absolute.inset-0');
      expect(overlay).toHaveClass('opacity-0', 'group-hover:opacity-100', 'transition-opacity');
    });

    it('should apply line-clamp to long captions', () => {
      const longCaption = 'This is a very long caption that should be clamped to prevent overflow in the overlay';
      renderWithTemplateContext(
        <MediaGrid />,
        { residentData: { images: [
          { id: '1', url: '/img.jpg', caption: longCaption, createdAt: '2024-01-01' }
        ]}}
      );
      
      const captionDiv = screen.getByText(longCaption);
      expect(captionDiv).toHaveClass('line-clamp-2');
    });
  });

  describe('Empty State', () => {
    it('should show correct empty state message with displayName', () => {
      renderWithTemplateContext(
        <MediaGrid />,
        { residentData: { 
          images: [],
          owner: { displayName: 'Alice' }
        }}
      );
      
      expect(screen.getByText("Alice hasn't featured any photos yet.")).toBeInTheDocument();
    });

    it('should show correct empty state message with handle', () => {
      renderWithTemplateContext(
        <MediaGrid />,
        { residentData: { 
          images: [],
          owner: { handle: '@alice' }
        }}
      );
      
      expect(screen.getByText("@alice hasn't featured any photos yet.")).toBeInTheDocument();
    });

    it('should have correct empty state styling', () => {
      const { container } = renderWithTemplateContext(
        <MediaGrid />,
        { residentData: { images: [] } }
      );
      
      const emptyState = container.querySelector('.text-center.py-12');
      expect(emptyState).toBeInTheDocument();
      
      const icon = container.querySelector('.text-6xl');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveTextContent('🖼️');
    });
  });

  describe('Edge Cases', () => {
    it('should handle images with invalid dates', () => {
      const invalidImages = [
        { id: '1', url: '/img1.jpg', createdAt: 'invalid-date' },
        { id: '2', url: '/img2.jpg', createdAt: '2024-01-01' },
      ];
      
      renderWithTemplateContext(
        <MediaGrid />,
        { residentData: { images: invalidImages } }
      );
      
      // Should not crash
      expect(screen.getAllByRole('img')).toHaveLength(2);
    });

    it('should handle images with missing required fields', () => {
      const incompleteImages = [
        { id: '1', url: '/img1.jpg' } as any, // Missing createdAt
        { id: '2', createdAt: '2024-01-01' } as any, // Missing url
      ];
      
      renderWithTemplateContext(
        <MediaGrid />,
        { residentData: { images: incompleteImages } }
      );
      
      // Should not crash
      const images = screen.queryAllByRole('img');
      expect(images.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle very long URLs', () => {
      const longUrl = '/image/' + 'a'.repeat(500) + '.jpg';
      renderWithTemplateContext(
        <MediaGrid />,
        { residentData: { images: [
          { id: '1', url: longUrl, createdAt: '2024-01-01' }
        ]}}
      );
      
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', longUrl);
    });

    it('should handle special characters in caption', () => {
      const specialCaption = '!@#$%^&*()_+-=[]{}|;":,./<>? 🎉';
      renderWithTemplateContext(
        <MediaGrid />,
        { residentData: { images: [
          { id: '1', url: '/img.jpg', caption: specialCaption, createdAt: '2024-01-01' }
        ]}}
      );
      
      expect(screen.getByAltText(specialCaption)).toBeInTheDocument();
      expect(screen.getByText(specialCaption)).toBeInTheDocument();
    });

    it('should handle null/undefined owner', () => {
      renderWithTemplateContext(
        <MediaGrid />,
        { residentData: { 
          images: mockImages,
          owner: null as any
        }}
      );
      
      // Should not crash
      expect(screen.getByText('Featured Photos')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render quickly', () => {
      const startTime = performance.now();
      renderWithTemplateContext(
        <MediaGrid />,
        { residentData: { images: mockImages } }
      );
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(50);
    });

    it('should handle multiple rerenders', () => {
      const { rerender } = renderWithTemplateContext(
        <MediaGrid />,
        { residentData: { images: [] } }
      );
      
      expect(screen.getByText('No featured photos')).toBeInTheDocument();
      
      rerender(<MediaGrid />);
      renderWithTemplateContext(
        <MediaGrid />,
        { residentData: { images: mockImages } }
      );
      
      expect(screen.getByText('Featured Photos')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have alt text for all images', () => {
      renderWithTemplateContext(
        <MediaGrid />,
        { residentData: { images: mockImages.slice(0, 4) } }
      );
      
      const images = screen.getAllByRole('img');
      images.forEach(img => {
        expect(img).toHaveAttribute('alt');
      });
    });

    it('should have proper heading hierarchy', () => {
      renderWithTemplateContext(
        <MediaGrid />,
        { residentData: { images: mockImages } }
      );
      
      const heading = screen.getByText('Featured Photos');
      expect(heading.tagName).toBe('H3');
    });

    it('should provide meaningful text for empty state', () => {
      renderWithTemplateContext(
        <MediaGrid />,
        { residentData: { images: [] } }
      );
      
      expect(screen.getByText('No featured photos')).toBeInTheDocument();
      expect(screen.getByText(/hasn't featured any photos yet/)).toBeInTheDocument();
    });
  });
});