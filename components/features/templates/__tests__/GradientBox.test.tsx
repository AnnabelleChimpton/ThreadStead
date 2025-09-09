import React from 'react';
import { screen } from '@testing-library/react';
import GradientBox from '../GradientBox';
import { renderWithTemplateContext, createMockResidentData } from './test-utils';

describe('GradientBox Component', () => {
  const testChildren = <div data-testid="gradient-content">Test Content</div>;

  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      const { container } = renderWithTemplateContext(
        <GradientBox>{testChildren}</GradientBox>
      );

      expect(screen.getByTestId('gradient-content')).toBeInTheDocument();
      
      const gradientDiv = container.firstChild as HTMLElement;
      expect(gradientDiv).toBeInTheDocument();
    });

    it('should render children correctly', () => {
      renderWithTemplateContext(
        <GradientBox>
          <span data-testid="child1">Child 1</span>
          <span data-testid="child2">Child 2</span>
        </GradientBox>
      );

      expect(screen.getByTestId('child1')).toBeInTheDocument();
      expect(screen.getByTestId('child2')).toBeInTheDocument();
    });

    it('should handle string children', () => {
      renderWithTemplateContext(
        <GradientBox>Hello World</GradientBox>
      );

      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });
  });

  describe('Legacy Gradient Props', () => {
    const gradientTests = [
      { gradient: 'sunset' as const, expectedColors: 'from-orange-400 via-red-500 to-pink-500' },
      { gradient: 'ocean' as const, expectedColors: 'from-blue-400 via-blue-500 to-blue-600' },
      { gradient: 'forest' as const, expectedColors: 'from-green-400 via-green-500 to-green-600' },
      { gradient: 'neon' as const, expectedColors: 'from-purple-400 via-pink-500 to-red-500' },
      { gradient: 'rainbow' as const, expectedColors: 'from-red-400 via-yellow-400 via-green-400 via-blue-400 to-purple-500' },
      { gradient: 'fire' as const, expectedColors: 'from-yellow-400 via-orange-500 to-red-600' }
    ];

    gradientTests.forEach(({ gradient, expectedColors }) => {
      it(`should apply ${gradient} gradient correctly`, () => {
        const { container } = renderWithTemplateContext(
          <GradientBox gradient={gradient}>{testChildren}</GradientBox>
        );

        const gradientDiv = container.firstChild as HTMLElement;
        expect(gradientDiv).toHaveClass('bg-gradient-to-br');
        expectedColors.split(' ').forEach(colorClass => {
          expect(gradientDiv).toHaveClass(colorClass);
        });
      });
    });

    it('should use sunset gradient by default', () => {
      const { container } = renderWithTemplateContext(
        <GradientBox>{testChildren}</GradientBox>
      );

      const gradientDiv = container.firstChild as HTMLElement;
      expect(gradientDiv).toHaveClass('bg-gradient-to-br', 'from-orange-400', 'via-red-500', 'to-pink-500');
    });
  });

  describe('Direction Props', () => {
    const directionTests = [
      { direction: 'r' as const, expectedClass: 'bg-gradient-to-r' },
      { direction: 'l' as const, expectedClass: 'bg-gradient-to-l' },
      { direction: 'b' as const, expectedClass: 'bg-gradient-to-b' },
      { direction: 't' as const, expectedClass: 'bg-gradient-to-t' },
      { direction: 'br' as const, expectedClass: 'bg-gradient-to-br' },
      { direction: 'bl' as const, expectedClass: 'bg-gradient-to-bl' },
      { direction: 'tr' as const, expectedClass: 'bg-gradient-to-tr' },
      { direction: 'tl' as const, expectedClass: 'bg-gradient-to-tl' }
    ];

    directionTests.forEach(({ direction, expectedClass }) => {
      it(`should apply direction="${direction}" correctly`, () => {
        const { container } = renderWithTemplateContext(
          <GradientBox direction={direction}>{testChildren}</GradientBox>
        );

        const gradientDiv = container.firstChild as HTMLElement;
        expect(gradientDiv).toHaveClass(expectedClass);
      });
    });

    it('should use br direction by default', () => {
      const { container } = renderWithTemplateContext(
        <GradientBox>{testChildren}</GradientBox>
      );

      const gradientDiv = container.firstChild as HTMLElement;
      expect(gradientDiv).toHaveClass('bg-gradient-to-br');
    });
  });

  describe('Padding Props', () => {
    const paddingTests = [
      { padding: 'xs' as const, expectedClass: 'p-2' },
      { padding: 'sm' as const, expectedClass: 'p-4' },
      { padding: 'md' as const, expectedClass: 'p-6' },
      { padding: 'lg' as const, expectedClass: 'p-8' },
      { padding: 'xl' as const, expectedClass: 'p-12' }
    ];

    paddingTests.forEach(({ padding, expectedClass }) => {
      it(`should apply padding="${padding}" correctly`, () => {
        const { container } = renderWithTemplateContext(
          <GradientBox padding={padding}>{testChildren}</GradientBox>
        );

        const gradientDiv = container.firstChild as HTMLElement;
        expect(gradientDiv).toHaveClass(expectedClass);
      });
    });

    it('should use md padding by default', () => {
      const { container } = renderWithTemplateContext(
        <GradientBox>{testChildren}</GradientBox>
      );

      const gradientDiv = container.firstChild as HTMLElement;
      expect(gradientDiv).toHaveClass('p-6');
    });

    it('should not apply padding when custom className is provided', () => {
      const { container } = renderWithTemplateContext(
        <GradientBox padding="lg" className="custom-class">{testChildren}</GradientBox>
      );

      const gradientDiv = container.firstChild as HTMLElement;
      expect(gradientDiv).not.toHaveClass('p-8');
      expect(gradientDiv).toHaveClass('custom-class');
    });
  });

  describe('Rounded Props', () => {
    it('should apply rounded corners when rounded=true', () => {
      const { container } = renderWithTemplateContext(
        <GradientBox rounded={true}>{testChildren}</GradientBox>
      );

      const gradientDiv = container.firstChild as HTMLElement;
      expect(gradientDiv).toHaveClass('rounded-lg');
    });

    it('should not apply rounded corners when rounded=false', () => {
      const { container } = renderWithTemplateContext(
        <GradientBox rounded={false}>{testChildren}</GradientBox>
      );

      const gradientDiv = container.firstChild as HTMLElement;
      expect(gradientDiv).not.toHaveClass('rounded-lg');
    });

    it('should apply rounded corners by default', () => {
      const { container } = renderWithTemplateContext(
        <GradientBox>{testChildren}</GradientBox>
      );

      const gradientDiv = container.firstChild as HTMLElement;
      expect(gradientDiv).toHaveClass('rounded-lg');
    });

    it('should not apply rounded when custom className is provided', () => {
      const { container } = renderWithTemplateContext(
        <GradientBox rounded={true} className="custom-class">{testChildren}</GradientBox>
      );

      const gradientDiv = container.firstChild as HTMLElement;
      expect(gradientDiv).not.toHaveClass('rounded-lg');
      expect(gradientDiv).toHaveClass('custom-class');
    });
  });

  describe('Modern Colors Prop', () => {
    it('should apply white background when colors="white"', () => {
      const { container } = renderWithTemplateContext(
        <GradientBox colors="white">{testChildren}</GradientBox>
      );

      const gradientDiv = container.firstChild as HTMLElement;
      expect(gradientDiv).toHaveClass('bg-white');
    });

    it('should apply black background when colors="black"', () => {
      const { container } = renderWithTemplateContext(
        <GradientBox colors="black">{testChildren}</GradientBox>
      );

      const gradientDiv = container.firstChild as HTMLElement;
      expect(gradientDiv).toHaveClass('bg-black');
    });

    it('should apply transparent background when colors="transparent"', () => {
      const { container } = renderWithTemplateContext(
        <GradientBox colors="transparent">{testChildren}</GradientBox>
      );

      const gradientDiv = container.firstChild as HTMLElement;
      expect(gradientDiv).toHaveClass('bg-transparent');
    });

    it('should apply blue-purple gradient when colors="blue-purple"', () => {
      const { container } = renderWithTemplateContext(
        <GradientBox colors="blue-purple">{testChildren}</GradientBox>
      );

      const gradientDiv = container.firstChild as HTMLElement;
      expect(gradientDiv).toHaveClass('bg-gradient-to-br', 'from-blue-400', 'via-purple-500', 'to-pink-500');
    });

    it('should use gradient presets when colors matches preset name', () => {
      const { container } = renderWithTemplateContext(
        <GradientBox colors="sunset" direction="r">{testChildren}</GradientBox>
      );

      const gradientDiv = container.firstChild as HTMLElement;
      expect(gradientDiv).toHaveClass('bg-gradient-to-r', 'from-orange-400', 'via-red-500', 'to-pink-500');
    });

    it('should fallback to bg-{colors} for unknown colors', () => {
      const { container } = renderWithTemplateContext(
        <GradientBox colors="red-500">{testChildren}</GradientBox>
      );

      const gradientDiv = container.firstChild as HTMLElement;
      expect(gradientDiv).toHaveClass('bg-red-500');
    });

    it('should prioritize colors prop over gradient prop', () => {
      const { container } = renderWithTemplateContext(
        <GradientBox gradient="ocean" colors="white">{testChildren}</GradientBox>
      );

      const gradientDiv = container.firstChild as HTMLElement;
      expect(gradientDiv).toHaveClass('bg-white');
      expect(gradientDiv).not.toHaveClass('from-blue-400');
    });
  });

  describe('Opacity Prop', () => {
    it('should apply opacity when opacity prop is provided', () => {
      const { container } = renderWithTemplateContext(
        <GradientBox opacity="50">{testChildren}</GradientBox>
      );

      const gradientDiv = container.firstChild as HTMLElement;
      expect(gradientDiv).toHaveClass('bg-opacity-50');
    });

    it('should work with different opacity values', () => {
      const opacityTests = ['10', '20', '50', '75', '90'];
      
      opacityTests.forEach(opacity => {
        const { container } = renderWithTemplateContext(
          <GradientBox opacity={opacity}>{testChildren}</GradientBox>
        );

        const gradientDiv = container.firstChild as HTMLElement;
        expect(gradientDiv).toHaveClass(`bg-opacity-${opacity}`);
      });
    });

    it('should not apply opacity when opacity prop is not provided', () => {
      const { container } = renderWithTemplateContext(
        <GradientBox>{testChildren}</GradientBox>
      );

      const gradientDiv = container.firstChild as HTMLElement;
      expect(gradientDiv.className).not.toMatch(/bg-opacity-/);
    });
  });

  describe('Custom ClassName', () => {
    it('should apply custom className', () => {
      const { container } = renderWithTemplateContext(
        <GradientBox className="custom-gradient-class">{testChildren}</GradientBox>
      );

      const gradientDiv = container.firstChild as HTMLElement;
      expect(gradientDiv).toHaveClass('custom-gradient-class');
    });

    it('should combine background classes with custom className', () => {
      const { container } = renderWithTemplateContext(
        <GradientBox colors="white" className="custom-class">{testChildren}</GradientBox>
      );

      const gradientDiv = container.firstChild as HTMLElement;
      expect(gradientDiv).toHaveClass('bg-white', 'custom-class');
    });

    it('should handle array className', () => {
      const { container } = renderWithTemplateContext(
        <GradientBox className={['class1', 'class2']}>{testChildren}</GradientBox>
      );

      const gradientDiv = container.firstChild as HTMLElement;
      // Array className would be converted to string by React
      expect(gradientDiv.className).toContain('class1,class2');
    });
  });

  describe('Complex Combinations', () => {
    it('should combine legacy props correctly', () => {
      const { container } = renderWithTemplateContext(
        <GradientBox 
          gradient="neon" 
          direction="tl" 
          padding="xl" 
          rounded={true}
        >
          {testChildren}
        </GradientBox>
      );

      const gradientDiv = container.firstChild as HTMLElement;
      expect(gradientDiv).toHaveClass(
        'bg-gradient-to-tl',
        'from-purple-400',
        'via-pink-500', 
        'to-red-500',
        'p-12',
        'rounded-lg'
      );
    });

    it('should combine modern props correctly', () => {
      const { container } = renderWithTemplateContext(
        <GradientBox 
          colors="blue-purple" 
          opacity="75" 
          className="shadow-lg"
        >
          {testChildren}
        </GradientBox>
      );

      const gradientDiv = container.firstChild as HTMLElement;
      expect(gradientDiv).toHaveClass(
        'bg-gradient-to-br',
        'from-blue-400',
        'via-purple-500',
        'to-pink-500',
        'bg-opacity-75',
        'shadow-lg'
      );
    });

    it('should handle mixed legacy and modern props', () => {
      const { container } = renderWithTemplateContext(
        <GradientBox 
          gradient="fire"
          direction="b"
          colors="ocean" // Should override gradient
          opacity="25"
          padding="sm"
          rounded={false}
        >
          {testChildren}
        </GradientBox>
      );

      const gradientDiv = container.firstChild as HTMLElement;
      expect(gradientDiv).toHaveClass(
        'bg-gradient-to-b',
        'from-blue-400',
        'via-blue-500',
        'to-blue-600',
        'bg-opacity-25',
        'p-4'
      );
      expect(gradientDiv).not.toHaveClass('rounded-lg');
      expect(gradientDiv).not.toHaveClass('from-yellow-400'); // fire gradient should be overridden
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty children', () => {
      const { container } = renderWithTemplateContext(
        <GradientBox></GradientBox>
      );

      const gradientDiv = container.firstChild as HTMLElement;
      expect(gradientDiv).toBeInTheDocument();
      expect(gradientDiv).toBeEmptyDOMElement();
    });

    it('should handle null children', () => {
      const { container } = renderWithTemplateContext(
        <GradientBox>{null}</GradientBox>
      );

      const gradientDiv = container.firstChild as HTMLElement;
      expect(gradientDiv).toBeInTheDocument();
    });

    it('should handle undefined props gracefully', () => {
      const { container } = renderWithTemplateContext(
        <GradientBox 
          gradient={undefined}
          direction={undefined}
          colors={undefined}
          opacity={undefined}
          className={undefined}
        >
          {testChildren}
        </GradientBox>
      );

      const gradientDiv = container.firstChild as HTMLElement;
      expect(gradientDiv).toBeInTheDocument();
      expect(screen.getByTestId('gradient-content')).toBeInTheDocument();
    });

    it('should filter out empty class names correctly', () => {
      const { container } = renderWithTemplateContext(
        <GradientBox colors="white" opacity="">{testChildren}</GradientBox>
      );

      const gradientDiv = container.firstChild as HTMLElement;
      expect(gradientDiv).toHaveClass('bg-white');
      // Should not have empty opacity class when opacity is empty string
      expect(gradientDiv.className).not.toContain('bg-opacity-');
    });
  });

  describe('Class Name Ordering and Formatting', () => {
    it('should produce clean className without extra spaces', () => {
      const { container } = renderWithTemplateContext(
        <GradientBox 
          gradient="sunset" 
          direction="br"
          padding="md"
          rounded={true}
        >
          {testChildren}
        </GradientBox>
      );

      const gradientDiv = container.firstChild as HTMLElement;
      const className = gradientDiv.className;
      expect(className).not.toMatch(/^\s|\s$/); // No leading/trailing spaces
      expect(className).not.toMatch(/\s{2,}/); // No multiple consecutive spaces
    });

    it('should handle all empty classes gracefully', () => {
      const { container } = renderWithTemplateContext(
        <GradientBox 
          colors="white" 
          opacity=""
          className=""
          rounded={false}
        >
          {testChildren}
        </GradientBox>
      );

      const gradientDiv = container.firstChild as HTMLElement;
      expect(gradientDiv).toHaveClass('bg-white');
      // Should only have the background class and padding
      const classList = Array.from(gradientDiv.classList);
      expect(classList).toContain('bg-white');
    });
  });

  describe('Accessibility', () => {
    it('should preserve child accessibility attributes', () => {
      renderWithTemplateContext(
        <GradientBox>
          <button aria-label="Test button" data-testid="accessible-button">
            Click me
          </button>
        </GradientBox>
      );

      const button = screen.getByLabelText('Test button');
      expect(button).toBeInTheDocument();
    });

    it('should not interfere with child focus management', () => {
      renderWithTemplateContext(
        <GradientBox>
          <input data-testid="test-input" placeholder="Test input" />
        </GradientBox>
      );

      const input = screen.getByTestId('test-input');
      expect(input).toBeInTheDocument();
      expect(input).not.toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('Props Validation', () => {
    describe('Gradient Enum', () => {
      const validGradients = ['sunset', 'ocean', 'forest', 'neon', 'rainbow', 'fire'] as const;
      
      validGradients.forEach(gradient => {
        it(`should accept gradient="${gradient}"`, () => {
          renderWithTemplateContext(
            <GradientBox gradient={gradient}>{testChildren}</GradientBox>
          );
          expect(screen.getByTestId('gradient-content')).toBeInTheDocument();
        });
      });
    });

    describe('Direction Enum', () => {
      const validDirections = ['r', 'l', 'b', 't', 'br', 'bl', 'tr', 'tl'] as const;
      
      validDirections.forEach(direction => {
        it(`should accept direction="${direction}"`, () => {
          renderWithTemplateContext(
            <GradientBox direction={direction}>{testChildren}</GradientBox>
          );
          expect(screen.getByTestId('gradient-content')).toBeInTheDocument();
        });
      });
    });

    describe('Padding Enum', () => {
      const validPaddings = ['xs', 'sm', 'md', 'lg', 'xl'] as const;
      
      validPaddings.forEach(padding => {
        it(`should accept padding="${padding}"`, () => {
          renderWithTemplateContext(
            <GradientBox padding={padding}>{testChildren}</GradientBox>
          );
          expect(screen.getByTestId('gradient-content')).toBeInTheDocument();
        });
      });
    });

    describe('Boolean Props', () => {
      it('should accept rounded=true', () => {
        renderWithTemplateContext(
          <GradientBox rounded={true}>{testChildren}</GradientBox>
        );
        expect(screen.getByTestId('gradient-content')).toBeInTheDocument();
      });

      it('should accept rounded=false', () => {
        renderWithTemplateContext(
          <GradientBox rounded={false}>{testChildren}</GradientBox>
        );
        expect(screen.getByTestId('gradient-content')).toBeInTheDocument();
      });
    });
  });
});