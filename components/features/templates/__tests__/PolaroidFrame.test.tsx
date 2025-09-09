import React from 'react';
import { screen } from '@testing-library/react';
import PolaroidFrame from '../PolaroidFrame';
import { renderWithTemplateContext } from './test-utils';

describe('PolaroidFrame Component', () => {
  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      const { container } = renderWithTemplateContext(
        <PolaroidFrame>
          <img src="/test.jpg" alt="Test" />
        </PolaroidFrame>
      );
      
      expect(screen.getByAltText('Test')).toBeInTheDocument();
      expect(container.firstChild).toHaveClass(
        'inline-block',
        'bg-white',
        'p-4',
        'pb-12',
        'shadow-lg',
        'transition-transform',
        'hover:scale-105'
      );
    });

    it('should render children content', () => {
      renderWithTemplateContext(
        <PolaroidFrame>
          <div>Photo content</div>
          <span>Additional content</span>
        </PolaroidFrame>
      );
      
      expect(screen.getByText('Photo content')).toBeInTheDocument();
      expect(screen.getByText('Additional content')).toBeInTheDocument();
    });

    it('should have proper frame structure', () => {
      const { container } = renderWithTemplateContext(
        <PolaroidFrame>
          <img src="/test.jpg" alt="Test" />
        </PolaroidFrame>
      );
      
      const frame = container.firstChild;
      const photoArea = container.querySelector('.bg-gray-100');
      
      expect(frame).toBeInTheDocument();
      expect(photoArea).toBeInTheDocument();
      expect(photoArea).toHaveClass('bg-gray-100', 'border', 'border-gray-200');
    });

    it('should have default transform origin center', () => {
      const { container } = renderWithTemplateContext(
        <PolaroidFrame>Content</PolaroidFrame>
      );
      
      expect(container.firstChild).toHaveStyle({
        transformOrigin: 'center'
      });
    });
  });

  describe('Caption Functionality', () => {
    it('should not show caption by default', () => {
      const { container } = renderWithTemplateContext(
        <PolaroidFrame>
          <img src="/test.jpg" alt="Test" />
        </PolaroidFrame>
      );
      
      const caption = container.querySelector('.mt-3');
      expect(caption).not.toBeInTheDocument();
    });

    it('should show caption when provided', () => {
      renderWithTemplateContext(
        <PolaroidFrame caption="My vacation photo">
          <img src="/test.jpg" alt="Test" />
        </PolaroidFrame>
      );
      
      expect(screen.getByText('My vacation photo')).toBeInTheDocument();
    });

    it('should not show caption for empty string', () => {
      const { container } = renderWithTemplateContext(
        <PolaroidFrame caption="">
          <img src="/test.jpg" alt="Test" />
        </PolaroidFrame>
      );
      
      const caption = container.querySelector('.mt-3');
      expect(caption).not.toBeInTheDocument();
    });

    it('should have correct caption styling', () => {
      const { container } = renderWithTemplateContext(
        <PolaroidFrame caption="Test caption">
          <img src="/test.jpg" alt="Test" />
        </PolaroidFrame>
      );
      
      const caption = container.querySelector('.mt-3');
      expect(caption).toHaveClass(
        'mt-3',
        'text-center',
        'text-sm',
        'text-gray-700',
        'font-handwriting'
      );
    });

    it('should handle long captions', () => {
      const longCaption = 'This is a very long caption that should wrap properly and still look good on the polaroid frame';
      renderWithTemplateContext(
        <PolaroidFrame caption={longCaption}>
          <img src="/test.jpg" alt="Test" />
        </PolaroidFrame>
      );
      
      expect(screen.getByText(longCaption)).toBeInTheDocument();
    });

    it('should handle special characters in caption', () => {
      const specialCaption = 'Photo & memories (2024) - "The best" 🎉';
      renderWithTemplateContext(
        <PolaroidFrame caption={specialCaption}>
          <img src="/test.jpg" alt="Test" />
        </PolaroidFrame>
      );
      
      expect(screen.getByText(specialCaption)).toBeInTheDocument();
    });
  });

  describe('Rotation Functionality', () => {
    it('should have no rotation by default', () => {
      const { container } = renderWithTemplateContext(
        <PolaroidFrame>
          <img src="/test.jpg" alt="Test" />
        </PolaroidFrame>
      );
      
      expect(container.firstChild).toHaveStyle({
        transform: 'rotate(0deg)'
      });
    });

    it('should apply positive rotation', () => {
      const { container } = renderWithTemplateContext(
        <PolaroidFrame rotation={15}>
          <img src="/test.jpg" alt="Test" />
        </PolaroidFrame>
      );
      
      expect(container.firstChild).toHaveStyle({
        transform: 'rotate(15deg)'
      });
    });

    it('should apply negative rotation', () => {
      const { container } = renderWithTemplateContext(
        <PolaroidFrame rotation={-10}>
          <img src="/test.jpg" alt="Test" />
        </PolaroidFrame>
      );
      
      expect(container.firstChild).toHaveStyle({
        transform: 'rotate(-10deg)'
      });
    });

    it('should handle large rotation values', () => {
      const { container } = renderWithTemplateContext(
        <PolaroidFrame rotation={270}>
          <img src="/test.jpg" alt="Test" />
        </PolaroidFrame>
      );
      
      expect(container.firstChild).toHaveStyle({
        transform: 'rotate(270deg)'
      });
    });

    it('should handle decimal rotation values', () => {
      const { container } = renderWithTemplateContext(
        <PolaroidFrame rotation={7.5}>
          <img src="/test.jpg" alt="Test" />
        </PolaroidFrame>
      );
      
      expect(container.firstChild).toHaveStyle({
        transform: 'rotate(7.5deg)'
      });
    });

    it('should handle zero rotation explicitly', () => {
      const { container } = renderWithTemplateContext(
        <PolaroidFrame rotation={0}>
          <img src="/test.jpg" alt="Test" />
        </PolaroidFrame>
      );
      
      expect(container.firstChild).toHaveStyle({
        transform: 'rotate(0deg)'
      });
    });
  });

  describe('Shadow Functionality', () => {
    it('should have shadow by default', () => {
      const { container } = renderWithTemplateContext(
        <PolaroidFrame>
          <img src="/test.jpg" alt="Test" />
        </PolaroidFrame>
      );
      
      expect(container.firstChild).toHaveClass('shadow-lg');
    });

    it('should show shadow when explicitly enabled', () => {
      const { container } = renderWithTemplateContext(
        <PolaroidFrame shadow={true}>
          <img src="/test.jpg" alt="Test" />
        </PolaroidFrame>
      );
      
      expect(container.firstChild).toHaveClass('shadow-lg');
    });

    it('should hide shadow when disabled', () => {
      const { container } = renderWithTemplateContext(
        <PolaroidFrame shadow={false}>
          <img src="/test.jpg" alt="Test" />
        </PolaroidFrame>
      );
      
      expect(container.firstChild).not.toHaveClass('shadow-lg');
    });
  });

  describe('Content Rendering', () => {
    it('should render image content', () => {
      renderWithTemplateContext(
        <PolaroidFrame>
          <img src="/vacation.jpg" alt="Vacation photo" />
        </PolaroidFrame>
      );
      
      const image = screen.getByAltText('Vacation photo');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', '/vacation.jpg');
    });

    it('should render complex content', () => {
      renderWithTemplateContext(
        <PolaroidFrame>
          <div className="photo-collage">
            <img src="/photo1.jpg" alt="Photo 1" />
            <img src="/photo2.jpg" alt="Photo 2" />
            <p>Multiple photos</p>
          </div>
        </PolaroidFrame>
      );
      
      expect(screen.getByAltText('Photo 1')).toBeInTheDocument();
      expect(screen.getByAltText('Photo 2')).toBeInTheDocument();
      expect(screen.getByText('Multiple photos')).toBeInTheDocument();
    });

    it('should render text content', () => {
      renderWithTemplateContext(
        <PolaroidFrame>
          <div>
            <h3>Memory Title</h3>
            <p>This is a text-based memory instead of a photo.</p>
          </div>
        </PolaroidFrame>
      );
      
      expect(screen.getByText('Memory Title')).toBeInTheDocument();
      expect(screen.getByText('This is a text-based memory instead of a photo.')).toBeInTheDocument();
    });

    it('should handle empty content', () => {
      const { container } = renderWithTemplateContext(
        <PolaroidFrame></PolaroidFrame>
      );
      
      const photoArea = container.querySelector('.bg-gray-100');
      expect(photoArea).toBeInTheDocument();
      expect(photoArea).toHaveTextContent('');
    });

    it('should preserve content styling', () => {
      renderWithTemplateContext(
        <PolaroidFrame>
          <div className="custom-photo" style={{ width: '100px', height: '100px' }}>
            Styled content
          </div>
        </PolaroidFrame>
      );
      
      const content = screen.getByText('Styled content');
      expect(content).toHaveClass('custom-photo');
      expect(content).toHaveStyle({ width: '100px', height: '100px' });
    });
  });

  describe('Component Combinations', () => {
    it('should work with all props combined', () => {
      const { container } = renderWithTemplateContext(
        <PolaroidFrame 
          caption="Summer 2024" 
          rotation={-5} 
          shadow={true}
        >
          <img src="/summer.jpg" alt="Summer vacation" />
        </PolaroidFrame>
      );
      
      // Check image
      expect(screen.getByAltText('Summer vacation')).toBeInTheDocument();
      
      // Check caption
      expect(screen.getByText('Summer 2024')).toBeInTheDocument();
      
      // Check rotation
      expect(container.firstChild).toHaveStyle({
        transform: 'rotate(-5deg)'
      });
      
      // Check shadow
      expect(container.firstChild).toHaveClass('shadow-lg');
    });

    it('should work without shadow and with rotation', () => {
      const { container } = renderWithTemplateContext(
        <PolaroidFrame 
          caption="Tilted photo" 
          rotation={20} 
          shadow={false}
        >
          <img src="/tilted.jpg" alt="Tilted" />
        </PolaroidFrame>
      );
      
      expect(screen.getByText('Tilted photo')).toBeInTheDocument();
      expect(container.firstChild).toHaveStyle({
        transform: 'rotate(20deg)'
      });
      expect(container.firstChild).not.toHaveClass('shadow-lg');
    });

    it('should work with extreme rotation values', () => {
      const { container } = renderWithTemplateContext(
        <PolaroidFrame rotation={180} caption="Upside down">
          <img src="/upsidedown.jpg" alt="Upside down photo" />
        </PolaroidFrame>
      );
      
      expect(container.firstChild).toHaveStyle({
        transform: 'rotate(180deg)'
      });
      expect(screen.getByText('Upside down')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should not interfere with image accessibility', () => {
      renderWithTemplateContext(
        <PolaroidFrame caption="Accessible photo">
          <img src="/accessible.jpg" alt="Description for screen readers" />
        </PolaroidFrame>
      );
      
      const image = screen.getByAltText('Description for screen readers');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('alt', 'Description for screen readers');
    });

    it('should maintain focus order with interactive content', () => {
      renderWithTemplateContext(
        <PolaroidFrame caption="Interactive content">
          <div>
            <button>Like photo</button>
            <button>Share photo</button>
          </div>
        </PolaroidFrame>
      );
      
      const likeButton = screen.getByRole('button', { name: 'Like photo' });
      const shareButton = screen.getByRole('button', { name: 'Share photo' });
      
      expect(likeButton).not.toHaveAttribute('tabindex', '-1');
      expect(shareButton).not.toHaveAttribute('tabindex', '-1');
    });

    it('should handle caption as additional context', () => {
      renderWithTemplateContext(
        <PolaroidFrame caption="Group photo at the beach">
          <img src="/group.jpg" alt="Five friends standing on sandy beach" />
        </PolaroidFrame>
      );
      
      expect(screen.getByAltText('Five friends standing on sandy beach')).toBeInTheDocument();
      expect(screen.getByText('Group photo at the beach')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined children', () => {
      const { container } = renderWithTemplateContext(
        <PolaroidFrame>
          {null}
          {undefined}
          <span>Valid content</span>
        </PolaroidFrame>
      );
      
      expect(screen.getByText('Valid content')).toBeInTheDocument();
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should handle very large rotation values', () => {
      const { container } = renderWithTemplateContext(
        <PolaroidFrame rotation={720}>
          <img src="/test.jpg" alt="Test" />
        </PolaroidFrame>
      );
      
      expect(container.firstChild).toHaveStyle({
        transform: 'rotate(720deg)'
      });
    });

    it('should handle very long captions', () => {
      const longCaption = 'A'.repeat(500);
      renderWithTemplateContext(
        <PolaroidFrame caption={longCaption}>
          <img src="/test.jpg" alt="Test" />
        </PolaroidFrame>
      );
      
      expect(screen.getByText(longCaption)).toBeInTheDocument();
    });

    it('should handle special Unicode characters in caption', () => {
      const unicodeCaption = '🎉 Party time! 中文 العربية ñáéíóú';
      renderWithTemplateContext(
        <PolaroidFrame caption={unicodeCaption}>
          <img src="/party.jpg" alt="Party" />
        </PolaroidFrame>
      );
      
      expect(screen.getByText(unicodeCaption)).toBeInTheDocument();
    });

    it('should handle NaN rotation gracefully', () => {
      const { container } = renderWithTemplateContext(
        <PolaroidFrame rotation={NaN}>
          <img src="/test.jpg" alt="Test" />
        </PolaroidFrame>
      );
      
      // Component should still render without crashing
      expect(container.firstChild).toBeInTheDocument();
      expect(screen.getByAltText('Test')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render quickly', () => {
      const startTime = performance.now();
      renderWithTemplateContext(
        <PolaroidFrame caption="Performance test">
          <img src="/perf.jpg" alt="Performance" />
        </PolaroidFrame>
      );
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(50);
    });

    it('should handle multiple rerenders', () => {
      const { rerender } = renderWithTemplateContext(
        <PolaroidFrame rotation={0}>
          <img src="/initial.jpg" alt="Initial" />
        </PolaroidFrame>
      );
      
      expect(screen.getByAltText('Initial')).toBeInTheDocument();
      
      rerender(
        <PolaroidFrame rotation={15} caption="Updated">
          <img src="/updated.jpg" alt="Updated" />
        </PolaroidFrame>
      );
      
      expect(screen.getByAltText('Updated')).toBeInTheDocument();
      expect(screen.getByText('Updated')).toBeInTheDocument();
    });
  });
});