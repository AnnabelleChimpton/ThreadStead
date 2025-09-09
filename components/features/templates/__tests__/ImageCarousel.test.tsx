import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ImageCarousel, { CarouselImage } from '../ImageCarousel';
import { renderWithTemplateContext, createMockResidentData } from './test-utils';

// Mock timers for autoplay testing
jest.useFakeTimers();

describe('ImageCarousel', () => {
  const mockImagesData = [
    {
      id: 'img-1',
      url: '/test-images/image1.jpg',
      alt: 'Test image 1',
      caption: 'First test image',
      createdAt: new Date().toISOString()
    },
    {
      id: 'img-2',
      url: '/test-images/image2.jpg',
      alt: 'Test image 2',
      caption: 'Second test image',
      createdAt: new Date().toISOString()
    },
    {
      id: 'img-3',
      url: '/test-images/image3.jpg',
      alt: 'Test image 3',
      caption: 'Third test image',
      createdAt: new Date().toISOString()
    }
  ];

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Basic Rendering', () => {
    it('should render carousel with resident data images', () => {
      const mockData = createMockResidentData({
        images: mockImagesData
      });

      renderWithTemplateContext(
        <ImageCarousel />,
        { residentData: mockData }
      );

      expect(screen.getByRole('region', { name: 'Image carousel' })).toBeInTheDocument();
      expect(screen.getByAltText('Test image 1')).toBeInTheDocument();
      expect(screen.getByText('First test image')).toBeInTheDocument();
    });

    it('should render with custom carousel images', () => {
      const mockData = createMockResidentData();

      renderWithTemplateContext(
        <ImageCarousel>
          <CarouselImage src="/custom1.jpg" alt="Custom image 1" caption="Custom caption 1" />
          <CarouselImage src="/custom2.jpg" alt="Custom image 2" caption="Custom caption 2" />
        </ImageCarousel>,
        { residentData: mockData }
      );

      expect(screen.getByAltText('Custom image 1')).toBeInTheDocument();
      expect(screen.getByText('Custom caption 1')).toBeInTheDocument();
      expect(screen.getByAltText('Custom image 2')).toBeInTheDocument();
      expect(screen.getByText('Custom caption 2')).toBeInTheDocument();
    });

    it('should handle empty state gracefully', () => {
      const mockData = createMockResidentData({ images: [] });

      renderWithTemplateContext(
        <ImageCarousel />,
        { residentData: mockData }
      );

      expect(screen.getByText('No images to display')).toBeInTheDocument();
      expect(screen.getByText('Upload some images to create a carousel')).toBeInTheDocument();
    });

    it('should prefer custom images over resident data', () => {
      const mockData = createMockResidentData({
        images: mockImagesData
      });

      renderWithTemplateContext(
        <ImageCarousel>
          <CarouselImage src="/override.jpg" alt="Override image" />
        </ImageCarousel>,
        { residentData: mockData }
      );

      expect(screen.getByAltText('Override image')).toBeInTheDocument();
      expect(screen.queryByAltText('Test image 1')).not.toBeInTheDocument();
    });
  });

  describe('Navigation Controls', () => {
    it('should show navigation arrows by default', () => {
      const mockData = createMockResidentData({ images: mockImagesData });

      renderWithTemplateContext(
        <ImageCarousel />,
        { residentData: mockData }
      );

      expect(screen.getByLabelText('Previous image')).toBeInTheDocument();
      expect(screen.getByLabelText('Next image')).toBeInTheDocument();
    });

    it('should navigate to next image when next arrow is clicked', () => {
      const mockData = createMockResidentData({ images: mockImagesData });

      renderWithTemplateContext(
        <ImageCarousel />,
        { residentData: mockData }
      );

      const nextButton = screen.getByLabelText('Next image');
      fireEvent.click(nextButton);

      expect(screen.getByText('Image 2 of 3: Test image 2')).toBeInTheDocument();
    });

    it('should navigate to previous image when previous arrow is clicked', () => {
      const mockData = createMockResidentData({ images: mockImagesData });

      renderWithTemplateContext(
        <ImageCarousel />,
        { residentData: mockData }
      );

      // Go to second image first
      const nextButton = screen.getByLabelText('Next image');
      fireEvent.click(nextButton);

      // Then go back
      const prevButton = screen.getByLabelText('Previous image');
      fireEvent.click(prevButton);

      expect(screen.getByText('Image 1 of 3: Test image 1')).toBeInTheDocument();
    });

    it('should show dot indicators by default', () => {
      const mockData = createMockResidentData({ images: mockImagesData });

      const { container } = renderWithTemplateContext(
        <ImageCarousel />,
        { residentData: mockData }
      );

      const dots = container.querySelectorAll('.ts-carousel-dot');
      expect(dots).toHaveLength(3);
    });

    it('should navigate when dot is clicked', () => {
      const mockData = createMockResidentData({ images: mockImagesData });

      renderWithTemplateContext(
        <ImageCarousel />,
        { residentData: mockData }
      );

      const thirdDot = screen.getByLabelText('Go to image 3');
      fireEvent.click(thirdDot);

      expect(screen.getByText('Image 3 of 3: Test image 3')).toBeInTheDocument();
    });

    it('should show thumbnails by default', () => {
      const mockData = createMockResidentData({ images: mockImagesData });

      const { container } = renderWithTemplateContext(
        <ImageCarousel />,
        { residentData: mockData }
      );

      const thumbnails = container.querySelectorAll('.ts-carousel-thumbnail');
      expect(thumbnails).toHaveLength(3);
    });

    it('should navigate when thumbnail is clicked', () => {
      const mockData = createMockResidentData({ images: mockImagesData });

      renderWithTemplateContext(
        <ImageCarousel />,
        { residentData: mockData }
      );

      const secondThumbnail = screen.getByLabelText('Go to image 2: Test image 2');
      fireEvent.click(secondThumbnail);

      expect(screen.getByText('Image 2 of 3: Test image 2')).toBeInTheDocument();
    });
  });

  describe('Control Visibility Options', () => {
    it('should hide arrows when showArrows is false', () => {
      const mockData = createMockResidentData({ images: mockImagesData });

      renderWithTemplateContext(
        <ImageCarousel showArrows={false} />,
        { residentData: mockData }
      );

      expect(screen.queryByLabelText('Previous image')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Next image')).not.toBeInTheDocument();
    });

    it('should hide dots when showDots is false', () => {
      const mockData = createMockResidentData({ images: mockImagesData });

      const { container } = renderWithTemplateContext(
        <ImageCarousel showDots={false} />,
        { residentData: mockData }
      );

      const dots = container.querySelectorAll('.ts-carousel-dot');
      expect(dots).toHaveLength(0);
    });

    it('should hide thumbnails when showThumbnails is false', () => {
      const mockData = createMockResidentData({ images: mockImagesData });

      const { container } = renderWithTemplateContext(
        <ImageCarousel showThumbnails={false} />,
        { residentData: mockData }
      );

      const thumbnails = container.querySelectorAll('.ts-carousel-thumbnail');
      expect(thumbnails).toHaveLength(0);
    });

    it('should show only arrows when controls is set to arrows', () => {
      const mockData = createMockResidentData({ images: mockImagesData });

      const { container } = renderWithTemplateContext(
        <ImageCarousel controls="arrows" />,
        { residentData: mockData }
      );

      expect(screen.getByLabelText('Previous image')).toBeInTheDocument();
      expect(screen.getByLabelText('Next image')).toBeInTheDocument();
      
      const dots = container.querySelectorAll('.ts-carousel-dot');
      const thumbnails = container.querySelectorAll('.ts-carousel-thumbnail');
      expect(dots).toHaveLength(0);
      expect(thumbnails).toHaveLength(0);
    });

    it('should show only dots when controls is set to dots', () => {
      const mockData = createMockResidentData({ images: mockImagesData });

      const { container } = renderWithTemplateContext(
        <ImageCarousel controls="dots" />,
        { residentData: mockData }
      );

      expect(screen.queryByLabelText('Previous image')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Next image')).not.toBeInTheDocument();
      
      const dots = container.querySelectorAll('.ts-carousel-dot');
      const thumbnails = container.querySelectorAll('.ts-carousel-thumbnail');
      expect(dots).toHaveLength(3);
      expect(thumbnails).toHaveLength(0);
    });
  });

  describe('Height Variations', () => {
    it('should apply small height classes', () => {
      const mockData = createMockResidentData({ images: mockImagesData });

      const { container } = renderWithTemplateContext(
        <ImageCarousel height="sm" />,
        { residentData: mockData }
      );

      const mainCarousel = container.querySelector('.ts-carousel-main');
      expect(mainCarousel).toHaveClass('h-48');
    });

    it('should apply large height classes', () => {
      const mockData = createMockResidentData({ images: mockImagesData });

      const { container } = renderWithTemplateContext(
        <ImageCarousel height="lg" />,
        { residentData: mockData }
      );

      const mainCarousel = container.querySelector('.ts-carousel-main');
      expect(mainCarousel).toHaveClass('h-96');
    });

    it('should apply extra large height classes', () => {
      const mockData = createMockResidentData({ images: mockImagesData });

      const { container } = renderWithTemplateContext(
        <ImageCarousel height="xl" />,
        { residentData: mockData }
      );

      const mainCarousel = container.querySelector('.ts-carousel-main');
      expect(mainCarousel).toHaveClass('h-[32rem]');
    });
  });

  describe('Autoplay Functionality', () => {
    it('should show play/pause button when autoplay is enabled', () => {
      const mockData = createMockResidentData({ images: mockImagesData });

      renderWithTemplateContext(
        <ImageCarousel autoplay />,
        { residentData: mockData }
      );

      expect(screen.getByLabelText('Pause slideshow')).toBeInTheDocument();
    });

    it('should auto-advance slides when autoplay is enabled', async () => {
      const mockData = createMockResidentData({ images: mockImagesData });

      renderWithTemplateContext(
        <ImageCarousel autoplay interval={2} />,
        { residentData: mockData }
      );

      expect(screen.getByText('Image 1 of 3: Test image 1')).toBeInTheDocument();

      // Fast-forward timer wrapped in act
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(screen.getByText('Image 2 of 3: Test image 2')).toBeInTheDocument();
      });
    });

    it('should pause autoplay when play/pause button is clicked', () => {
      const mockData = createMockResidentData({ images: mockImagesData });

      renderWithTemplateContext(
        <ImageCarousel autoplay />,
        { residentData: mockData }
      );

      const pauseButton = screen.getByLabelText('Pause slideshow');
      fireEvent.click(pauseButton);

      expect(screen.getByLabelText('Play slideshow')).toBeInTheDocument();
    });

    it('should pause autoplay when manual navigation occurs', () => {
      const mockData = createMockResidentData({ images: mockImagesData });

      renderWithTemplateContext(
        <ImageCarousel autoplay />,
        { residentData: mockData }
      );

      expect(screen.getByLabelText('Pause slideshow')).toBeInTheDocument();

      // Click next arrow
      const nextButton = screen.getByLabelText('Next image');
      fireEvent.click(nextButton);

      // Should still show pause button but autoplay should be paused
      expect(screen.getByLabelText('Play slideshow')).toBeInTheDocument();
    });
  });

  describe('Loop Behavior', () => {
    it('should loop back to first image when loop is true', () => {
      const mockData = createMockResidentData({ images: mockImagesData });

      renderWithTemplateContext(
        <ImageCarousel loop />,
        { residentData: mockData }
      );

      // Go to last image
      const nextButton = screen.getByLabelText('Next image');
      fireEvent.click(nextButton); // Image 2
      fireEvent.click(nextButton); // Image 3

      expect(screen.getByText('Image 3 of 3: Test image 3')).toBeInTheDocument();

      // Click next again - should loop to first
      fireEvent.click(nextButton);
      expect(screen.getByText('Image 1 of 3: Test image 1')).toBeInTheDocument();
    });

    it('should not loop when loop is false', () => {
      const mockData = createMockResidentData({ images: mockImagesData });

      renderWithTemplateContext(
        <ImageCarousel loop={false} />,
        { residentData: mockData }
      );

      // Go to last image
      const nextButton = screen.getByLabelText('Next image');
      fireEvent.click(nextButton); // Image 2
      fireEvent.click(nextButton); // Image 3

      expect(screen.getByText('Image 3 of 3: Test image 3')).toBeInTheDocument();

      // Next button should be disabled
      expect(nextButton).toBeDisabled();
    });

    it('should disable previous button on first image when loop is false', () => {
      const mockData = createMockResidentData({ images: mockImagesData });

      renderWithTemplateContext(
        <ImageCarousel loop={false} />,
        { residentData: mockData }
      );

      const prevButton = screen.getByLabelText('Previous image');
      expect(prevButton).toBeDisabled();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate with arrow keys', () => {
      const mockData = createMockResidentData({ images: mockImagesData });

      const { container } = renderWithTemplateContext(
        <ImageCarousel />,
        { residentData: mockData }
      );

      const carousel = container.querySelector('.ts-image-carousel');
      carousel?.focus();

      fireEvent.keyDown(carousel!, { key: 'ArrowRight' });
      expect(screen.getByText('Image 2 of 3: Test image 2')).toBeInTheDocument();

      fireEvent.keyDown(carousel!, { key: 'ArrowLeft' });
      expect(screen.getByText('Image 1 of 3: Test image 1')).toBeInTheDocument();
    });

    it('should navigate to first/last image with Home/End keys', () => {
      const mockData = createMockResidentData({ images: mockImagesData });

      const { container } = renderWithTemplateContext(
        <ImageCarousel />,
        { residentData: mockData }
      );

      const carousel = container.querySelector('.ts-image-carousel');
      carousel?.focus();

      fireEvent.keyDown(carousel!, { key: 'End' });
      expect(screen.getByText('Image 3 of 3: Test image 3')).toBeInTheDocument();

      fireEvent.keyDown(carousel!, { key: 'Home' });
      expect(screen.getByText('Image 1 of 3: Test image 1')).toBeInTheDocument();
    });

    it('should toggle play/pause with spacebar', () => {
      const mockData = createMockResidentData({ images: mockImagesData });

      const { container } = renderWithTemplateContext(
        <ImageCarousel autoplay />,
        { residentData: mockData }
      );

      const carousel = container.querySelector('.ts-image-carousel');
      carousel?.focus();

      expect(screen.getByLabelText('Pause slideshow')).toBeInTheDocument();

      fireEvent.keyDown(carousel!, { key: ' ' });
      expect(screen.getByLabelText('Play slideshow')).toBeInTheDocument();
    });
  });

  describe('Transition Effects', () => {
    it('should apply slide transition by default', () => {
      const mockData = createMockResidentData({ images: mockImagesData });

      const { container } = renderWithTemplateContext(
        <ImageCarousel transition="slide" />,
        { residentData: mockData }
      );

      const slides = container.querySelectorAll('.ts-carousel-slide');
      expect(slides[0]).toHaveStyle('transform: translateX(0%)');
      expect(slides[1]).toHaveStyle('transform: translateX(100%)');
    });

    it('should apply fade transition when specified', () => {
      const mockData = createMockResidentData({ images: mockImagesData });

      const { container } = renderWithTemplateContext(
        <ImageCarousel transition="fade" />,
        { residentData: mockData }
      );

      const slides = container.querySelectorAll('.ts-carousel-slide');
      expect(slides[0]).toHaveClass('opacity-100');
      expect(slides[1]).toHaveClass('opacity-0');
    });

    it('should apply zoom transition when specified', () => {
      const mockData = createMockResidentData({ images: mockImagesData });

      const { container } = renderWithTemplateContext(
        <ImageCarousel transition="zoom" />,
        { residentData: mockData }
      );

      const slides = container.querySelectorAll('.ts-carousel-slide');
      expect(slides[0]).toHaveClass('scale-100', 'opacity-100');
      expect(slides[1]).toHaveClass('scale-95', 'opacity-0');
    });
  });

  describe('Custom Styling Support', () => {
    it('should apply custom className', () => {
      const mockData = createMockResidentData({ images: mockImagesData });

      const { container } = renderWithTemplateContext(
        <ImageCarousel className="custom-carousel-style" />,
        { residentData: mockData }
      );

      const carousel = container.querySelector('.ts-image-carousel');
      expect(carousel).toHaveClass('custom-carousel-style');
    });

    it('should handle className as array', () => {
      const mockData = createMockResidentData({ images: mockImagesData });

      const { container } = renderWithTemplateContext(
        <ImageCarousel className={['custom-style-1', 'custom-style-2']} />,
        { residentData: mockData }
      );

      const carousel = container.querySelector('.ts-image-carousel');
      expect(carousel).toHaveClass('custom-style-1', 'custom-style-2');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const mockData = createMockResidentData({ images: mockImagesData });

      renderWithTemplateContext(
        <ImageCarousel />,
        { residentData: mockData }
      );

      const carousel = screen.getByRole('region', { name: 'Image carousel' });
      expect(carousel).toHaveAttribute('tabIndex', '0');
    });

    it('should announce current slide to screen readers', () => {
      const mockData = createMockResidentData({ images: mockImagesData });

      renderWithTemplateContext(
        <ImageCarousel />,
        { residentData: mockData }
      );

      expect(screen.getByText('Image 1 of 3: Test image 1')).toBeInTheDocument();
    });

    it('should have proper alt text for images', () => {
      const mockData = createMockResidentData({ images: mockImagesData });

      renderWithTemplateContext(
        <ImageCarousel />,
        { residentData: mockData }
      );

      expect(screen.getByAltText('Test image 1')).toBeInTheDocument();
    });

    it('should hide non-active slides from screen readers', () => {
      const mockData = createMockResidentData({ images: mockImagesData });

      const { container } = renderWithTemplateContext(
        <ImageCarousel />,
        { residentData: mockData }
      );

      const slides = container.querySelectorAll('.ts-carousel-slide');
      expect(slides[0]).toHaveAttribute('aria-hidden', 'false');
      expect(slides[1]).toHaveAttribute('aria-hidden', 'true');
      expect(slides[2]).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Image Links', () => {
    it('should make images clickable when link is provided', () => {
      const mockData = createMockResidentData();

      renderWithTemplateContext(
        <ImageCarousel>
          <CarouselImage 
            src="/test.jpg" 
            alt="Test image" 
            link="https://example.com"
          />
        </ImageCarousel>,
        { residentData: mockData }
      );

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', 'https://example.com');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('Data Attribute Support (Template Rendering)', () => {
    it('should handle carousel images from template data attributes', () => {
      const mockData = createMockResidentData();

      renderWithTemplateContext(
        <ImageCarousel>
          <div 
            data-carousel-src="/template1.jpg"
            data-carousel-alt="Template image 1"
            data-carousel-caption="From template"
          />
          <div
            data-carousel-src="/template2.jpg"
            data-carousel-alt="Template image 2"
            data-carousel-link="https://example.com"
          />
        </ImageCarousel>,
        { residentData: mockData }
      );

      expect(screen.getByAltText('Template image 1')).toBeInTheDocument();
      expect(screen.getByText('From template')).toBeInTheDocument();
      expect(screen.getByAltText('Template image 2')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should handle single image without controls', () => {
      const mockData = createMockResidentData({
        images: [mockImagesData[0]]
      });

      const { container } = renderWithTemplateContext(
        <ImageCarousel />,
        { residentData: mockData }
      );

      // Single image should not show navigation controls
      expect(screen.queryByLabelText('Previous image')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Next image')).not.toBeInTheDocument();
      
      const dots = container.querySelectorAll('.ts-carousel-dot');
      const thumbnails = container.querySelectorAll('.ts-carousel-thumbnail');
      expect(dots).toHaveLength(0);
      expect(thumbnails).toHaveLength(0);
    });

    it('should load first image eagerly and others lazily', () => {
      const mockData = createMockResidentData({ images: mockImagesData });

      const { container } = renderWithTemplateContext(
        <ImageCarousel />,
        { residentData: mockData }
      );

      const slideImages = container.querySelectorAll('.ts-carousel-slide img');
      
      expect(slideImages[0]).toHaveAttribute('loading', 'eager');
      expect(slideImages[1]).toHaveAttribute('loading', 'lazy');
      expect(slideImages[2]).toHaveAttribute('loading', 'lazy');
    });
  });
});