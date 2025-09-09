import React from 'react';
import { screen } from '@testing-library/react';
import ProfileHero from '../ProfileHero';
import { renderWithTemplateContext } from './test-utils';

describe('ProfileHero Component', () => {
  describe('Basic Rendering', () => {
    it('should render with default plain variant', () => {
      const { container } = renderWithTemplateContext(
        <ProfileHero />
      );
      
      const hero = container.querySelector('.ts-profile-hero');
      expect(hero).toBeInTheDocument();
      expect(hero).toHaveClass('bg-thread-cream', 'border', 'border-thread-sage/30', 'rounded-cozy');
    });

    it('should render owner display name', () => {
      renderWithTemplateContext(
        <ProfileHero />,
        { residentData: { owner: { displayName: 'John Doe' } } }
      );
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should render welcome message', () => {
      renderWithTemplateContext(
        <ProfileHero />
      );
      
      expect(screen.getByText('Welcome to my corner of the internet')).toBeInTheDocument();
    });

    it('should have proper heading structure', () => {
      renderWithTemplateContext(
        <ProfileHero />,
        { residentData: { owner: { displayName: 'Test User' } } }
      );
      
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Test User');
    });

    it('should have base classes applied', () => {
      const { container } = renderWithTemplateContext(
        <ProfileHero />
      );
      
      const hero = container.querySelector('.ts-profile-hero');
      expect(hero).toHaveClass('w-full', 'p-6', 'mb-6', 'text-center');
    });
  });

  describe('Variant Styles', () => {
    it('should apply plain variant by default', () => {
      const { container } = renderWithTemplateContext(
        <ProfileHero />
      );
      
      const hero = container.querySelector('.ts-profile-hero');
      expect(hero).toHaveClass('bg-thread-cream', 'border', 'border-thread-sage/30', 'rounded-cozy');
      expect(hero).not.toHaveClass('transform', '-rotate-1');
    });

    it('should apply tape variant styles', () => {
      const { container } = renderWithTemplateContext(
        <ProfileHero variant="tape" />
      );
      
      const hero = container.querySelector('.ts-profile-hero');
      expect(hero).toHaveClass(
        'bg-gradient-to-r',
        'from-yellow-200',
        'to-yellow-300',
        'border-2',
        'border-black',
        'shadow-[4px_4px_0_#000]',
        'transform',
        '-rotate-1'
      );
    });

    it('should apply plain variant when explicitly set', () => {
      const { container } = renderWithTemplateContext(
        <ProfileHero variant="plain" />
      );
      
      const hero = container.querySelector('.ts-profile-hero');
      expect(hero).toHaveClass('bg-thread-cream', 'border', 'border-thread-sage/30', 'rounded-cozy');
    });

    it('should handle invalid variant gracefully', () => {
      const { container } = renderWithTemplateContext(
        <ProfileHero variant={'invalid' as any} />
      );
      
      // Should not crash and maintain basic structure
      const hero = container.querySelector('.ts-profile-hero');
      expect(hero).toBeInTheDocument();
      expect(screen.getByText('Welcome to my corner of the internet')).toBeInTheDocument();
    });
  });

  describe('Owner Data Handling', () => {
    it('should display owner displayName', () => {
      renderWithTemplateContext(
        <ProfileHero />,
        { residentData: { owner: { displayName: 'Alice Smith' } } }
      );
      
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Alice Smith');
    });

    it('should handle empty displayName', () => {
      renderWithTemplateContext(
        <ProfileHero />,
        { residentData: { owner: { displayName: '' } } }
      );
      
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('');
    });

    it('should handle missing owner data', () => {
      renderWithTemplateContext(
        <ProfileHero />,
        { residentData: { owner: {} } }
      );
      
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
    });

    it('should handle special characters in displayName', () => {
      renderWithTemplateContext(
        <ProfileHero />,
        { residentData: { owner: { displayName: 'User & Co. (2024) "Test"' } } }
      );
      
      expect(screen.getByText('User & Co. (2024) "Test"')).toBeInTheDocument();
    });

    it('should handle Unicode in displayName', () => {
      renderWithTemplateContext(
        <ProfileHero />,
        { residentData: { owner: { displayName: '🎉 Party Person ñáéíóú' } } }
      );
      
      expect(screen.getByText('🎉 Party Person ñáéíóú')).toBeInTheDocument();
    });

    it('should handle very long displayName', () => {
      const longName = 'A'.repeat(100);
      renderWithTemplateContext(
        <ProfileHero />,
        { residentData: { owner: { displayName: longName } } }
      );
      
      expect(screen.getByText(longName)).toBeInTheDocument();
    });
  });

  describe('Text Styling', () => {
    it('should apply correct heading styles', () => {
      renderWithTemplateContext(
        <ProfileHero />
      );
      
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveClass('text-4xl', 'font-bold', 'text-thread-pine', 'mb-2');
    });

    it('should apply correct paragraph styles', () => {
      const { container } = renderWithTemplateContext(
        <ProfileHero />
      );
      
      const paragraph = container.querySelector('p');
      expect(paragraph).toHaveClass('text-thread-charcoal', 'opacity-80');
    });

    it('should maintain text center alignment', () => {
      const { container } = renderWithTemplateContext(
        <ProfileHero />
      );
      
      const hero = container.querySelector('.ts-profile-hero');
      expect(hero).toHaveClass('text-center');
    });

    it('should apply text styles consistently across variants', () => {
      const variants = ['plain', 'tape'] as const;
      
      variants.forEach(variant => {
        const { container } = renderWithTemplateContext(
          <ProfileHero variant={variant} />
        );
        
        const heading = container.querySelector('h1');
        const paragraph = container.querySelector('p');
        
        expect(heading).toHaveClass('text-4xl', 'font-bold', 'text-thread-pine');
        expect(paragraph).toHaveClass('text-thread-charcoal', 'opacity-80');
      });
    });
  });

  describe('Component Combinations', () => {
    it('should work with tape variant and custom name', () => {
      renderWithTemplateContext(
        <ProfileHero variant="tape" />,
        { residentData: { owner: { displayName: 'Creative User' } } }
      );
      
      expect(screen.getByText('Creative User')).toBeInTheDocument();
      expect(screen.getByText('Welcome to my corner of the internet')).toBeInTheDocument();
    });

    it('should work with plain variant and long name', () => {
      const { container } = renderWithTemplateContext(
        <ProfileHero variant="plain" />,
        { residentData: { owner: { displayName: 'Very Long Display Name Here' } } }
      );
      
      const hero = container.querySelector('.ts-profile-hero');
      expect(hero).toHaveClass('bg-thread-cream', 'rounded-cozy');
      expect(screen.getByText('Very Long Display Name Here')).toBeInTheDocument();
    });
  });

  describe('Visual Effects', () => {
    it('should apply rotation transform for tape variant', () => {
      const { container } = renderWithTemplateContext(
        <ProfileHero variant="tape" />
      );
      
      const hero = container.querySelector('.ts-profile-hero');
      expect(hero).toHaveClass('transform', '-rotate-1');
    });

    it('should apply shadow effect for tape variant', () => {
      const { container } = renderWithTemplateContext(
        <ProfileHero variant="tape" />
      );
      
      const hero = container.querySelector('.ts-profile-hero');
      expect(hero).toHaveClass('shadow-[4px_4px_0_#000]');
    });

    it('should apply gradient background for tape variant', () => {
      const { container } = renderWithTemplateContext(
        <ProfileHero variant="tape" />
      );
      
      const hero = container.querySelector('.ts-profile-hero');
      expect(hero).toHaveClass('bg-gradient-to-r', 'from-yellow-200', 'to-yellow-300');
    });

    it('should apply border styles correctly', () => {
      // Plain variant
      const { container: plainContainer } = renderWithTemplateContext(
        <ProfileHero variant="plain" />
      );
      const plainHero = plainContainer.querySelector('.ts-profile-hero');
      expect(plainHero).toHaveClass('border', 'border-thread-sage/30');
      
      // Tape variant
      const { container: tapeContainer } = renderWithTemplateContext(
        <ProfileHero variant="tape" />
      );
      const tapeHero = tapeContainer.querySelector('.ts-profile-hero');
      expect(tapeHero).toHaveClass('border-2', 'border-black');
    });
  });

  describe('Accessibility', () => {
    it('should have semantic heading structure', () => {
      renderWithTemplateContext(
        <ProfileHero />
      );
      
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
    });

    it('should have readable text contrast', () => {
      renderWithTemplateContext(
        <ProfileHero />
      );
      
      const heading = screen.getByRole('heading');
      const paragraph = screen.getByText('Welcome to my corner of the internet');
      
      expect(heading).toHaveClass('text-thread-pine');
      expect(paragraph).toHaveClass('text-thread-charcoal');
    });

    it('should maintain text readability with tape variant', () => {
      renderWithTemplateContext(
        <ProfileHero variant="tape" />,
        { residentData: { owner: { displayName: 'Accessible Name' } } }
      );
      
      expect(screen.getByText('Accessible Name')).toBeInTheDocument();
      expect(screen.getByText('Welcome to my corner of the internet')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null owner data', () => {
      renderWithTemplateContext(
        <ProfileHero />,
        { residentData: { owner: null as any } }
      );
      
      // Should not crash
      expect(screen.getByText('Welcome to my corner of the internet')).toBeInTheDocument();
    });

    it('should handle undefined owner data', () => {
      renderWithTemplateContext(
        <ProfileHero />,
        { residentData: { owner: undefined as any } }
      );
      
      // Should not crash
      expect(screen.getByText('Welcome to my corner of the internet')).toBeInTheDocument();
    });

    it('should handle displayName with only spaces', () => {
      renderWithTemplateContext(
        <ProfileHero />,
        { residentData: { owner: { displayName: '   ' } } }
      );
      
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
      // Component renders spaces as-is
      expect(heading.textContent).toBe('   ');
    });

    it('should handle displayName with HTML-like content', () => {
      renderWithTemplateContext(
        <ProfileHero />,
        { residentData: { owner: { displayName: '<script>alert("xss")</script>' } } }
      );
      
      // Should render as text, not execute
      expect(screen.getByText('<script>alert("xss")</script>')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render quickly', () => {
      const startTime = performance.now();
      renderWithTemplateContext(
        <ProfileHero variant="tape" />
      );
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(50);
    });

    it('should handle multiple rerenders', () => {
      const { rerender } = renderWithTemplateContext(
        <ProfileHero variant="plain" />
      );
      
      expect(screen.getByText('Welcome to my corner of the internet')).toBeInTheDocument();
      
      rerender(<ProfileHero variant="tape" />);
      expect(screen.getByText('Welcome to my corner of the internet')).toBeInTheDocument();
      
      rerender(<ProfileHero variant="plain" />);
      expect(screen.getByText('Welcome to my corner of the internet')).toBeInTheDocument();
    });
  });
});