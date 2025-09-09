import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import SiteBranding from '../SiteBranding';
import { renderWithTemplateContext } from './test-utils';

// Mock Next.js Link component
jest.mock('next/link', () => {
  return function MockLink({ href, children, className, ...props }: any) {
    return (
      <a href={href} className={className} {...props}>
        {children}
      </a>
    );
  };
});

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('SiteBranding Component', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('Initial Rendering', () => {
    it('should render with loading state initially', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolve

      renderWithTemplateContext(<SiteBranding />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Loading...');
    });

    it('should have correct initial structure', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolve

      const { container } = renderWithTemplateContext(<SiteBranding />);
      
      const link = container.querySelector('a[href="/"]');
      expect(link).toBeInTheDocument();
      expect(link).toHaveClass('site-branding', 'text-decoration-none');
      
      const title = container.querySelector('h1.site-title');
      expect(title).toBeInTheDocument();
      expect(title).toHaveClass('thread-headline', 'text-2xl', 'font-bold', 'text-thread-pine');
      
      const tagline = container.querySelector('span.site-tagline');
      expect(tagline).toBeInTheDocument();
      expect(tagline).toHaveClass('thread-label');
    });
  });

  describe('API Integration', () => {
    it('should fetch site config on mount', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          site_name: 'Test Site',
          site_tagline: 'Test Tagline'
        })
      });

      renderWithTemplateContext(<SiteBranding />);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/site-config');
      });
    });

    it('should update state with fetched config', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          site_name: 'Custom Site Name',
          site_tagline: 'Custom Site Tagline'
        })
      });

      renderWithTemplateContext(<SiteBranding />);
      
      await waitFor(() => {
        expect(screen.getByText('Custom Site Name')).toBeInTheDocument();
        expect(screen.getByText('Custom Site Tagline')).toBeInTheDocument();
      });
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      renderWithTemplateContext(<SiteBranding />);
      
      await waitFor(() => {
        // Should still show loading state on error
        expect(screen.getByText('Loading...')).toBeInTheDocument();
      });
    });

    it('should handle non-ok API responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      renderWithTemplateContext(<SiteBranding />);
      
      await waitFor(() => {
        // Should still show loading state on non-ok response
        expect(screen.getByText('Loading...')).toBeInTheDocument();
      });
    });

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => { throw new Error('Invalid JSON'); }
      });

      renderWithTemplateContext(<SiteBranding />);
      
      await waitFor(() => {
        // Should still show loading state on JSON parse error
        expect(screen.getByText('Loading...')).toBeInTheDocument();
      });
    });
  });

  describe('Content Display', () => {
    it('should display site name and tagline', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          site_name: 'ThreadStead Community',
          site_tagline: 'A place for creative minds'
        })
      });

      renderWithTemplateContext(<SiteBranding />);
      
      await waitFor(() => {
        expect(screen.getByText('ThreadStead Community')).toBeInTheDocument();
        expect(screen.getByText('A place for creative minds')).toBeInTheDocument();
      });
    });

    it('should handle empty site name', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          site_name: '',
          site_tagline: 'Some tagline'
        })
      });

      renderWithTemplateContext(<SiteBranding />);
      
      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 1 });
        expect(heading).toHaveTextContent('');
        expect(screen.getByText('Some tagline')).toBeInTheDocument();
      });
    });

    it('should handle empty tagline', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          site_name: 'Test Site',
          site_tagline: ''
        })
      });

      renderWithTemplateContext(<SiteBranding />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Site')).toBeInTheDocument();
        
        const tagline = document.querySelector('.site-tagline');
        expect(tagline).toHaveTextContent('');
      });
    });

    it('should handle very long site names', async () => {
      const longName = 'A'.repeat(100);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          site_name: longName,
          site_tagline: 'Short tagline'
        })
      });

      renderWithTemplateContext(<SiteBranding />);
      
      await waitFor(() => {
        expect(screen.getByText(longName)).toBeInTheDocument();
        expect(screen.getByText('Short tagline')).toBeInTheDocument();
      });
    });

    it('should handle special characters in site name and tagline', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          site_name: 'Site & Co. (2024) – "The Best"',
          site_tagline: 'Tagline with émojis 🚀 & symbols!'
        })
      });

      renderWithTemplateContext(<SiteBranding />);
      
      await waitFor(() => {
        expect(screen.getByText('Site & Co. (2024) – "The Best"')).toBeInTheDocument();
        expect(screen.getByText('Tagline with émojis 🚀 & symbols!')).toBeInTheDocument();
      });
    });
  });

  describe('Link Functionality', () => {
    it('should link to home page', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          site_name: 'Test Site',
          site_tagline: 'Test Tagline'
        })
      });

      const { container } = renderWithTemplateContext(<SiteBranding />);
      
      await waitFor(() => {
        const link = container.querySelector('a');
        expect(link).toHaveAttribute('href', '/');
      });
    });

    it('should have correct link styling', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          site_name: 'Test Site',
          site_tagline: 'Test Tagline'
        })
      });

      const { container } = renderWithTemplateContext(<SiteBranding />);
      
      await waitFor(() => {
        const link = container.querySelector('a');
        expect(link).toHaveClass('site-branding', 'text-decoration-none');
      });
    });

    it('should be accessible as a link', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          site_name: 'Test Site',
          site_tagline: 'Test Tagline'
        })
      });

      renderWithTemplateContext(<SiteBranding />);
      
      await waitFor(() => {
        const link = screen.getByRole('link');
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', '/');
      });
    });
  });

  describe('CSS Classes and Styling', () => {
    it('should have correct heading classes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          site_name: 'Test Site',
          site_tagline: 'Test Tagline'
        })
      });

      renderWithTemplateContext(<SiteBranding />);
      
      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 1 });
        expect(heading).toHaveClass(
          'site-title',
          'thread-headline',
          'text-2xl',
          'font-bold',
          'text-thread-pine'
        );
      });
    });

    it('should have correct tagline classes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          site_name: 'Test Site',
          site_tagline: 'Test Tagline'
        })
      });

      const { container } = renderWithTemplateContext(<SiteBranding />);
      
      await waitFor(() => {
        const tagline = container.querySelector('.site-tagline');
        expect(tagline).toHaveClass('site-tagline', 'thread-label');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          site_name: 'Test Site',
          site_tagline: 'Test Tagline'
        })
      });

      renderWithTemplateContext(<SiteBranding />);
      
      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 1 });
        expect(heading).toBeInTheDocument();
        expect(heading).toHaveTextContent('Test Site');
      });
    });

    it('should be keyboard accessible', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          site_name: 'Test Site',
          site_tagline: 'Test Tagline'
        })
      });

      renderWithTemplateContext(<SiteBranding />);
      
      await waitFor(() => {
        const link = screen.getByRole('link');
        expect(link).not.toHaveAttribute('tabindex', '-1');
      });
    });

    it('should have meaningful content for screen readers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          site_name: 'Accessible Site',
          site_tagline: 'For everyone'
        })
      });

      renderWithTemplateContext(<SiteBranding />);
      
      await waitFor(() => {
        const link = screen.getByRole('link');
        expect(link).toHaveTextContent('Accessible SiteFor everyone');
      });
    });
  });

  describe('Performance', () => {
    it('should render quickly', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolve

      const startTime = performance.now();
      renderWithTemplateContext(<SiteBranding />);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(50);
    });

    it('should handle multiple rerenders', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          site_name: 'Test Site',
          site_tagline: 'Test Tagline'
        })
      });

      const { rerender } = renderWithTemplateContext(<SiteBranding />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Site')).toBeInTheDocument();
      });

      // Rerender should not cause issues
      rerender(<SiteBranding />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Site')).toBeInTheDocument();
      });
    });

    it('should cleanup properly on unmount', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolve

      const { unmount } = renderWithTemplateContext(<SiteBranding />);
      
      expect(() => {
        unmount();
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined config values', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          site_name: null,
          site_tagline: undefined
        })
      });

      renderWithTemplateContext(<SiteBranding />);
      
      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 1 });
        expect(heading).toBeInTheDocument();
        // Should handle null/undefined gracefully
      });
    });

    it('should handle missing properties in config', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          // Missing site_name and site_tagline
        })
      });

      renderWithTemplateContext(<SiteBranding />);
      
      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 1 });
        expect(heading).toBeInTheDocument();
      });
    });

    it('should handle fetch timeout', async () => {
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      renderWithTemplateContext(<SiteBranding />);
      
      await waitFor(() => {
        expect(screen.getByText('Loading...')).toBeInTheDocument();
      }, { timeout: 200 });
    });
  });

  describe('Integration', () => {
    it('should work within other components', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          site_name: 'Integration Test',
          site_tagline: 'Works well'
        })
      });

      renderWithTemplateContext(
        <div>
          <nav>Navigation</nav>
          <SiteBranding />
          <main>Content</main>
        </div>
      );
      
      expect(screen.getByText('Navigation')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('Integration Test')).toBeInTheDocument();
        expect(screen.getByText('Works well')).toBeInTheDocument();
      });
    });
  });
});