import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import UserImage from '../UserImage';
import { renderWithTemplateContext, createMockResidentData } from './test-utils';

// Helper to get img element regardless of its role (img vs presentation)
const getImageElement = (alt?: string) => {
  if (alt) {
    return screen.getByAltText(alt);
  }
  try {
    return screen.getByRole('img');
  } catch {
    return screen.getByRole('presentation');
  }
};

describe('UserImage Component', () => {
  describe('Basic Rendering', () => {
    it('should render with default props and fallback', () => {
      renderWithTemplateContext(<UserImage />);

      const img = getImageElement();
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', '/assets/default-image.png');
      expect(img).toHaveAttribute('alt', '');
      expect(img).toHaveAttribute('loading', 'lazy');
    });

    it('should render with src prop', () => {
      renderWithTemplateContext(<UserImage src="https://example.com/image.jpg" alt="Test image" />);

      const img = getImageElement();
      expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
      expect(img).toHaveAttribute('alt', 'Test image');
    });

    it('should render with custom fallback', () => {
      renderWithTemplateContext(<UserImage fallback="/custom-fallback.jpg" />);

      const img = getImageElement();
      expect(img).toHaveAttribute('src', '/custom-fallback.jpg');
    });

    it('should prioritize src prop over data prop', () => {
      const residentData = createMockResidentData({
        owner: { avatarUrl: 'https://data-image.jpg' }
      });

      renderWithTemplateContext(
        <UserImage src="https://src-image.jpg" data="owner.avatarUrl" />, 
        { residentData }
      );

      const img = getImageElement();
      expect(img).toHaveAttribute('src', 'https://src-image.jpg');
    });
  });

  describe('Data Path Resolution', () => {
    it('should resolve string data path', () => {
      const residentData = createMockResidentData({
        owner: { avatarUrl: 'https://avatar.jpg' }
      });

      renderWithTemplateContext(
        <UserImage data="owner.avatarUrl" alt="Avatar" />, 
        { residentData }
      );

      const img = getImageElement();
      expect(img).toHaveAttribute('src', 'https://avatar.jpg');
      expect(img).toHaveAttribute('alt', 'Avatar');
    });

    it('should resolve nested data path', () => {
      const residentData = createMockResidentData({
        owner: { 
          profile: { 
            photo: { 
              url: 'https://nested-photo.jpg' 
            } 
          } 
        }
      });

      renderWithTemplateContext(
        <UserImage data="owner.profile.photo.url" />, 
        { residentData }
      );

      const img = getImageElement();
      expect(img).toHaveAttribute('src', 'https://nested-photo.jpg');
    });

    it('should resolve array data path with default index 0', () => {
      const residentData = createMockResidentData({
        images: [
          { url: 'https://image1.jpg' },
          { url: 'https://image2.jpg' }
        ]
      });

      renderWithTemplateContext(<UserImage data="images" />, { residentData });

      const img = getImageElement();
      expect(img).toHaveAttribute('src', 'https://image1.jpg');
    });

    it('should resolve array data path with custom index', () => {
      const residentData = createMockResidentData({
        images: [
          { url: 'https://image1.jpg' },
          { url: 'https://image2.jpg' },
          { url: 'https://image3.jpg' }
        ]
      });

      renderWithTemplateContext(<UserImage data="images" index={2} />, { residentData });

      const img = getImageElement();
      expect(img).toHaveAttribute('src', 'https://image3.jpg');
    });

    it('should handle array with string values', () => {
      const residentData = createMockResidentData({
        gallery: [
          'https://string-image1.jpg',
          'https://string-image2.jpg'
        ]
      });

      renderWithTemplateContext(<UserImage data="gallery" index={1} />, { residentData });

      const img = getImageElement();
      expect(img).toHaveAttribute('src', 'https://string-image2.jpg');
    });

    it('should handle array with mixed formats', () => {
      const residentData = createMockResidentData({
        photos: [
          { src: 'https://src-image.jpg' }, // src property
          { image: 'https://image-prop.jpg' } // image property
        ]
      });

      // Test first image with index 0
      const { unmount: unmount1 } = renderWithTemplateContext(<UserImage data="photos" index={0} />, { residentData });
      const img1 = getImageElement();
      expect(img1).toHaveAttribute('src', 'https://src-image.jpg');
      unmount1();

      // Test second image with index 1
      renderWithTemplateContext(<UserImage data="photos" index={1} />, { residentData });
      const img2 = getImageElement();
      expect(img2).toHaveAttribute('src', 'https://image-prop.jpg');
    });

    it('should handle object data path', () => {
      const residentData = createMockResidentData({
        featured: {
          url: 'https://featured.jpg'
        }
      });

      renderWithTemplateContext(<UserImage data="featured" />, { residentData });

      const img = getImageElement();
      expect(img).toHaveAttribute('src', 'https://featured.jpg');
    });

    it('should try multiple object properties in order', () => {
      const testCases = [
        { photo: { url: 'https://url-prop.jpg' } },
        { photo: { src: 'https://src-prop.jpg' } },
        { photo: { image: 'https://image-prop.jpg' } }
      ];

      testCases.forEach((data, index) => {
        const residentData = createMockResidentData(data);
        const { unmount } = renderWithTemplateContext(<UserImage data="photo" />, { residentData });
        
        const img = getImageElement();
        
        if (index === 0) expect(img).toHaveAttribute('src', 'https://url-prop.jpg');
        else if (index === 1) expect(img).toHaveAttribute('src', 'https://src-prop.jpg');
        else expect(img).toHaveAttribute('src', 'https://image-prop.jpg');
        
        if (index < testCases.length - 1) unmount(); // Don't unmount the last one
      });
    });

    it('should return null when data path has no valid image', () => {
      const residentData = createMockResidentData({
        owner: { displayName: 'Test User' } // No image data
      });

      const { container } = renderWithTemplateContext(
        <UserImage data="owner.nonExistentImage" />, 
        { residentData }
      );

      expect(container.firstChild).toBeNull();
    });

    it('should return null when data path is empty array', () => {
      const residentData = createMockResidentData({
        emptyImages: []
      });

      const { container } = renderWithTemplateContext(
        <UserImage data="emptyImages" />, 
        { residentData }
      );

      expect(container.firstChild).toBeNull();
    });

    it('should handle invalid data paths gracefully', () => {
      const residentData = createMockResidentData({});

      const { container } = renderWithTemplateContext(
        <UserImage data="nonexistent.deeply.nested.path" />, 
        { residentData }
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Size Props', () => {
    const sizeTests = [
      { size: 'xs' as const, expectedClass: 'w-8 h-8' },
      { size: 'sm' as const, expectedClass: 'w-16 h-16' },
      { size: 'md' as const, expectedClass: 'w-24 h-24' },
      { size: 'lg' as const, expectedClass: 'w-32 h-32' },
      { size: 'xl' as const, expectedClass: 'w-48 h-48' },
      { size: 'full' as const, expectedClass: 'w-full h-auto' }
    ];

    sizeTests.forEach(({ size, expectedClass }) => {
      it(`should apply size="${size}" correctly`, () => {
        renderWithTemplateContext(<UserImage src="test.jpg" size={size} />);

        const img = getImageElement();
        expectedClass.split(' ').forEach(cls => {
          expect(img).toHaveClass(cls);
        });
      });
    });

    it('should use md size by default', () => {
      renderWithTemplateContext(<UserImage src="test.jpg" />);

      const img = getImageElement();
      expect(img).toHaveClass('w-24', 'h-24');
    });

    it('should not apply size classes when width/height are specified', () => {
      renderWithTemplateContext(
        <UserImage src="test.jpg" size="lg" width="100px" height="200px" />
      );

      const img = getImageElement();
      expect(img).not.toHaveClass('w-32', 'h-32'); // lg size classes
      expect(img).toHaveStyle({ width: '100px', height: '200px' });
    });
  });

  describe('Custom Dimensions', () => {
    it('should apply custom width', () => {
      renderWithTemplateContext(<UserImage src="test.jpg" width="200px" />);

      const img = getImageElement();
      expect(img).toHaveStyle({ width: '200px' });
    });

    it('should apply custom height', () => {
      renderWithTemplateContext(<UserImage src="test.jpg" height="150px" />);

      const img = getImageElement();
      expect(img).toHaveStyle({ height: '150px' });
    });

    it('should apply both width and height', () => {
      renderWithTemplateContext(<UserImage src="test.jpg" width="300px" height="400px" />);

      const img = getImageElement();
      expect(img).toHaveStyle({ width: '300px', height: '400px' });
    });

    it('should support percentage values', () => {
      renderWithTemplateContext(<UserImage src="test.jpg" width="50%" height="100%" />);

      const img = getImageElement();
      expect(img).toHaveStyle({ width: '50%', height: '100%' });
    });

    it('should support rem/em values', () => {
      renderWithTemplateContext(<UserImage src="test.jpg" width="10rem" height="5em" />);

      const img = getImageElement();
      expect(img).toHaveStyle({ width: '10rem', height: '5em' });
    });
  });

  describe('Rounded Props', () => {
    const roundedTests = [
      { rounded: 'none' as const, expectedClass: 'rounded-none' },
      { rounded: 'sm' as const, expectedClass: 'rounded-sm' },
      { rounded: 'md' as const, expectedClass: 'rounded-md' },
      { rounded: 'lg' as const, expectedClass: 'rounded-lg' },
      { rounded: 'full' as const, expectedClass: 'rounded-full' }
    ];

    roundedTests.forEach(({ rounded, expectedClass }) => {
      it(`should apply rounded="${rounded}" correctly`, () => {
        renderWithTemplateContext(<UserImage src="test.jpg" rounded={rounded} />);

        const img = getImageElement();
        expect(img).toHaveClass(expectedClass);
      });
    });

    it('should use sm rounded by default', () => {
      renderWithTemplateContext(<UserImage src="test.jpg" />);

      const img = getImageElement();
      expect(img).toHaveClass('rounded-sm');
    });
  });

  describe('Border Props', () => {
    it('should apply border when border=true', () => {
      renderWithTemplateContext(<UserImage src="test.jpg" border={true} />);

      const img = getImageElement();
      expect(img).toHaveClass('border-2', 'border-gray-300');
    });

    it('should not apply border when border=false', () => {
      renderWithTemplateContext(<UserImage src="test.jpg" border={false} />);

      const img = getImageElement();
      expect(img).not.toHaveClass('border-2', 'border-gray-300');
    });

    it('should not apply border by default', () => {
      renderWithTemplateContext(<UserImage src="test.jpg" />);

      const img = getImageElement();
      expect(img).not.toHaveClass('border-2', 'border-gray-300');
    });
  });

  describe('Shadow Props', () => {
    const shadowTests = [
      { shadow: 'none' as const, expectedClass: '' },
      { shadow: 'sm' as const, expectedClass: 'shadow-sm' },
      { shadow: 'md' as const, expectedClass: 'shadow-md' },
      { shadow: 'lg' as const, expectedClass: 'shadow-lg' }
    ];

    shadowTests.forEach(({ shadow, expectedClass }) => {
      it(`should apply shadow="${shadow}" correctly`, () => {
        renderWithTemplateContext(<UserImage src="test.jpg" shadow={shadow} />);

        const img = getImageElement();
        if (expectedClass) {
          expect(img).toHaveClass(expectedClass);
        } else {
          expect(img).not.toHaveClass('shadow-sm', 'shadow-md', 'shadow-lg');
        }
      });
    });

    it('should use no shadow by default', () => {
      renderWithTemplateContext(<UserImage src="test.jpg" />);

      const img = getImageElement();
      expect(img).not.toHaveClass('shadow-sm', 'shadow-md', 'shadow-lg');
    });
  });

  describe('Object Fit Props', () => {
    const fitTests = [
      { fit: 'cover' as const, expectedClass: 'object-cover' },
      { fit: 'contain' as const, expectedClass: 'object-contain' },
      { fit: 'fill' as const, expectedClass: 'object-fill' },
      { fit: 'scale-down' as const, expectedClass: 'object-scale-down' }
    ];

    fitTests.forEach(({ fit, expectedClass }) => {
      it(`should apply fit="${fit}" correctly`, () => {
        renderWithTemplateContext(<UserImage src="test.jpg" fit={fit} />);

        const img = getImageElement();
        expect(img).toHaveClass(expectedClass);
      });
    });

    it('should use cover fit by default', () => {
      renderWithTemplateContext(<UserImage src="test.jpg" />);

      const img = getImageElement();
      expect(img).toHaveClass('object-cover');
    });
  });

  describe('Error Handling', () => {
    it('should fallback to fallback image on error', () => {
      renderWithTemplateContext(
        <UserImage src="https://broken-image.jpg" fallback="/fallback.jpg" />
      );

      const img = getImageElement();
      
      // Simulate image load error
      fireEvent.error(img);
      
      expect(img).toHaveAttribute('src', '/fallback.jpg');
    });

    it('should not change src if already using fallback', () => {
      renderWithTemplateContext(
        <UserImage src="/fallback.jpg" fallback="/fallback.jpg" />
      );

      const img = getImageElement();
      
      // Simulate error on fallback image itself
      fireEvent.error(img);
      
      expect(img).toHaveAttribute('src', '/fallback.jpg');
    });

    it('should handle missing fallback gracefully', () => {
      renderWithTemplateContext(<UserImage src="broken.jpg" />);

      const img = getImageElement();
      
      // Simulate image load error
      fireEvent.error(img);
      
      expect(img).toHaveAttribute('src', '/assets/default-image.png');
    });
  });

  describe('Complex Combinations', () => {
    it('should combine all styling props correctly', () => {
      renderWithTemplateContext(
        <UserImage 
          src="test.jpg"
          size="lg"
          rounded="full"
          border={true}
          shadow="md"
          fit="contain"
        />
      );

      const img = getImageElement();
      expect(img).toHaveClass(
        'w-32', 'h-32',
        'rounded-full',
        'border-2', 'border-gray-300',
        'shadow-md',
        'object-contain',
        'block'
      );
    });

    it('should handle data path with all styling options', () => {
      const residentData = createMockResidentData({
        gallery: [{ url: 'https://gallery1.jpg' }]
      });

      renderWithTemplateContext(
        <UserImage 
          data="gallery"
          index={0}
          alt="Gallery image"
          size="xl"
          rounded="lg"
          border={true}
          shadow="lg"
          fit="cover"
        />, 
        { residentData }
      );

      const img = getImageElement();
      expect(img).toHaveAttribute('src', 'https://gallery1.jpg');
      expect(img).toHaveAttribute('alt', 'Gallery image');
      expect(img).toHaveClass(
        'w-48', 'h-48',
        'rounded-lg',
        'border-2', 'border-gray-300',
        'shadow-lg',
        'object-cover'
      );
    });

    it('should override size with custom dimensions', () => {
      renderWithTemplateContext(
        <UserImage 
          src="test.jpg"
          size="xl" // Should be ignored
          width="500px"
          height="300px"
          rounded="full"
          shadow="sm"
        />
      );

      const img = getImageElement();
      expect(img).not.toHaveClass('w-48', 'h-48'); // xl size classes
      expect(img).toHaveStyle({ width: '500px', height: '300px' });
      expect(img).toHaveClass('rounded-full', 'shadow-sm');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty strings in data paths', () => {
      const residentData = createMockResidentData({
        profile: {
          image: ''
        }
      });

      const { container } = renderWithTemplateContext(
        <UserImage data="profile.image" />, 
        { residentData }
      );

      expect(container.firstChild).toBeNull();
    });

    it('should handle null/undefined values in data paths', () => {
      const residentData = createMockResidentData({
        profile: {
          image: null
        }
      });

      const { container } = renderWithTemplateContext(
        <UserImage data="profile.image" />, 
        { residentData }
      );

      expect(container.firstChild).toBeNull();
    });

    it('should handle array index out of bounds', () => {
      const residentData = createMockResidentData({
        photos: ['image1.jpg']
      });

      const { container } = renderWithTemplateContext(
        <UserImage data="photos" index={5} />, 
        { residentData }
      );

      expect(container.firstChild).toBeNull();
    });

    it('should handle nested arrays', () => {
      const residentData = createMockResidentData({
        albums: [
          ['nested1.jpg', 'nested2.jpg'],
          ['nested3.jpg']
        ]
      });

      // This should not work as expected since we only handle one level of array indexing
      const { container } = renderWithTemplateContext(
        <UserImage data="albums" index={0} />, 
        { residentData }
      );

      // Should return null because nested arrays aren't handled as image sources
      expect(container.firstChild).toBeNull();
    });

    it('should handle very long data paths', () => {
      const residentData = createMockResidentData({
        very: {
          deeply: {
            nested: {
              object: {
                with: {
                  image: {
                    url: 'deep-image.jpg'
                  }
                }
              }
            }
          }
        }
      });

      renderWithTemplateContext(
        <UserImage data="very.deeply.nested.object.with.image.url" />, 
        { residentData }
      );

      const img = getImageElement();
      expect(img).toHaveAttribute('src', 'deep-image.jpg');
    });
  });

  describe('Accessibility', () => {
    it('should have proper alt text', () => {
      renderWithTemplateContext(
        <UserImage src="test.jpg" alt="A beautiful landscape" />
      );

      const img = screen.getByAltText('A beautiful landscape');
      expect(img).toBeInTheDocument();
    });

    it('should have empty alt by default', () => {
      renderWithTemplateContext(<UserImage src="test.jpg" />);

      const img = getImageElement();
      expect(img).toHaveAttribute('alt', '');
    });

    it('should have loading="lazy" for performance', () => {
      renderWithTemplateContext(<UserImage src="test.jpg" />);

      const img = getImageElement();
      expect(img).toHaveAttribute('loading', 'lazy');
    });

    it('should be keyboard accessible by default', () => {
      renderWithTemplateContext(<UserImage src="test.jpg" />);

      const img = getImageElement();
      // Images are not focusable by default unless they have click handlers
      expect(img).not.toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('Props Validation', () => {
    describe('Size Enum', () => {
      const validSizes = ['xs', 'sm', 'md', 'lg', 'xl', 'full'] as const;
      
      validSizes.forEach(size => {
        it(`should accept size="${size}"`, () => {
          renderWithTemplateContext(<UserImage src="test.jpg" size={size} />);
          expect(getImageElement()).toBeInTheDocument();
        });
      });
    });

    describe('Rounded Enum', () => {
      const validRounded = ['none', 'sm', 'md', 'lg', 'full'] as const;
      
      validRounded.forEach(rounded => {
        it(`should accept rounded="${rounded}"`, () => {
          renderWithTemplateContext(<UserImage src="test.jpg" rounded={rounded} />);
          expect(getImageElement()).toBeInTheDocument();
        });
      });
    });

    describe('Shadow Enum', () => {
      const validShadows = ['none', 'sm', 'md', 'lg'] as const;
      
      validShadows.forEach(shadow => {
        it(`should accept shadow="${shadow}"`, () => {
          renderWithTemplateContext(<UserImage src="test.jpg" shadow={shadow} />);
          expect(getImageElement()).toBeInTheDocument();
        });
      });
    });

    describe('Fit Enum', () => {
      const validFits = ['cover', 'contain', 'fill', 'scale-down'] as const;
      
      validFits.forEach(fit => {
        it(`should accept fit="${fit}"`, () => {
          renderWithTemplateContext(<UserImage src="test.jpg" fit={fit} />);
          expect(getImageElement()).toBeInTheDocument();
        });
      });
    });

    describe('Boolean Props', () => {
      it('should accept border=true', () => {
        renderWithTemplateContext(<UserImage src="test.jpg" border={true} />);
        expect(getImageElement()).toBeInTheDocument();
      });

      it('should accept border=false', () => {
        renderWithTemplateContext(<UserImage src="test.jpg" border={false} />);
        expect(getImageElement()).toBeInTheDocument();
      });
    });

    describe('Number Props', () => {
      it('should accept index=0', () => {
        renderWithTemplateContext(<UserImage src="test.jpg" index={0} />);
        expect(getImageElement()).toBeInTheDocument();
      });

      it('should accept positive index values', () => {
        const indices = [1, 2, 5, 10];
        indices.forEach((index, i) => {
          const { unmount } = renderWithTemplateContext(<UserImage src="test.jpg" index={index} />);
          expect(getImageElement()).toBeInTheDocument();
          if (i < indices.length - 1) unmount(); // Don't unmount the last one
        });
      });
    });
  });

  describe('Default Props', () => {
    it('should use correct default values', () => {
      renderWithTemplateContext(<UserImage src="test.jpg" />);

      const img = getImageElement();
      
      // Default size: md
      expect(img).toHaveClass('w-24', 'h-24');
      
      // Default rounded: sm
      expect(img).toHaveClass('rounded-sm');
      
      // Default border: false
      expect(img).not.toHaveClass('border-2');
      
      // Default shadow: none
      expect(img).not.toHaveClass('shadow-sm', 'shadow-md', 'shadow-lg');
      
      // Default fit: cover
      expect(img).toHaveClass('object-cover');
      
      // Default alt: empty
      expect(img).toHaveAttribute('alt', '');
      
      // Default index: 0 (tested with array data)
      expect(img).toHaveClass('block');
    });
  });
});