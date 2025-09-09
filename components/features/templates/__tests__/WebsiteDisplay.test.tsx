import React from 'react';
import { render, screen } from '@testing-library/react';
import WebsiteDisplay from '../WebsiteDisplay';
import { renderWithTemplateContext } from './test-utils';

describe('WebsiteDisplay Component', () => {
  describe('Empty State', () => {
    it('should render empty state when no websites provided', () => {
      renderWithTemplateContext(
        <WebsiteDisplay />,
        { residentData: { websites: [] } }
      );
      
      expect(screen.getByText('Website Recommendations')).toBeInTheDocument();
      expect(screen.getByText('No websites added yet.')).toBeInTheDocument();
    });

    it('should render empty state when websites is null', () => {
      renderWithTemplateContext(
        <WebsiteDisplay />,
        { residentData: { websites: null } }
      );
      
      expect(screen.getByText('Website Recommendations')).toBeInTheDocument();
      expect(screen.getByText('No websites added yet.')).toBeInTheDocument();
    });

    it('should render empty state when websites is undefined', () => {
      renderWithTemplateContext(
        <WebsiteDisplay />
      );
      
      expect(screen.getByText('Website Recommendations')).toBeInTheDocument();
      expect(screen.getByText('No websites added yet.')).toBeInTheDocument();
    });

    it('should apply correct styling to empty state', () => {
      const { container } = renderWithTemplateContext(
        <WebsiteDisplay />,
        { residentData: { websites: [] } }
      );
      
      const emptyContainer = container.querySelector('div');
      expect(emptyContainer).toHaveClass(
        'border',
        'border-black',
        'p-3',
        'bg-white',
        'shadow-[2px_2px_0_#000]'
      );
      
      const emptyText = screen.getByText('No websites added yet.');
      expect(emptyText).toHaveClass('text-gray-500', 'text-sm');
    });

    it('should have proper heading in empty state', () => {
      renderWithTemplateContext(
        <WebsiteDisplay />,
        { residentData: { websites: [] } }
      );
      
      const heading = screen.getByText('Website Recommendations');
      expect(heading.tagName).toBe('H4');
      expect(heading).toHaveClass('font-bold', 'mb-2');
    });
  });

  describe('Website Display', () => {
    const mockWebsites = [
      {
        id: '1',
        url: 'https://example.com',
        label: 'Example Site',
        blurb: 'A great example website'
      },
      {
        id: '2',
        url: 'https://test.org',
        label: 'Test Organization',
        blurb: 'Testing website functionality'
      },
      {
        id: '3',
        url: 'https://no-blurb.net',
        label: 'No Description Site',
        blurb: null
      }
    ];

    it('should render website list when websites are provided', () => {
      renderWithTemplateContext(
        <WebsiteDisplay />,
        { residentData: { websites: mockWebsites } }
      );
      
      expect(screen.getByText('Example Site')).toBeInTheDocument();
      expect(screen.getByText('Test Organization')).toBeInTheDocument();
      expect(screen.getByText('No Description Site')).toBeInTheDocument();
    });

    it('should render website links correctly', () => {
      renderWithTemplateContext(
        <WebsiteDisplay />,
        { residentData: { websites: mockWebsites } }
      );
      
      const exampleLink = screen.getByRole('link', { name: 'Example Site' });
      expect(exampleLink).toHaveAttribute('href', 'https://example.com');
      expect(exampleLink).toHaveAttribute('target', '_blank');
      expect(exampleLink).toHaveAttribute('rel', 'noopener noreferrer');
      
      const testLink = screen.getByRole('link', { name: 'Test Organization' });
      expect(testLink).toHaveAttribute('href', 'https://test.org');
    });

    it('should render website blurbs when provided', () => {
      renderWithTemplateContext(
        <WebsiteDisplay />,
        { residentData: { websites: mockWebsites } }
      );
      
      expect(screen.getByText('A great example website')).toBeInTheDocument();
      expect(screen.getByText('Testing website functionality')).toBeInTheDocument();
    });

    it('should not render blurb section when blurb is null', () => {
      renderWithTemplateContext(
        <WebsiteDisplay />,
        { residentData: { websites: [mockWebsites[2]] } }
      );
      
      const websiteItem = screen.getByText('No Description Site').closest('.website-item');
      expect(websiteItem?.querySelector('.website-blurb')).not.toBeInTheDocument();
    });

    it('should not render blurb section when blurb is empty', () => {
      const websiteWithEmptyBlurb = {
        id: '4',
        url: 'https://empty-blurb.com',
        label: 'Empty Blurb Site',
        blurb: ''
      };

      renderWithTemplateContext(
        <WebsiteDisplay />,
        { residentData: { websites: [websiteWithEmptyBlurb] } }
      );
      
      const websiteItem = screen.getByText('Empty Blurb Site').closest('.website-item');
      expect(websiteItem?.querySelector('.website-blurb')).not.toBeInTheDocument();
    });

    it('should display website URLs', () => {
      renderWithTemplateContext(
        <WebsiteDisplay />,
        { residentData: { websites: mockWebsites } }
      );
      
      expect(screen.getByText('https://example.com')).toBeInTheDocument();
      expect(screen.getByText('https://test.org')).toBeInTheDocument();
      expect(screen.getByText('https://no-blurb.net')).toBeInTheDocument();
    });
  });

  describe('Styling and CSS Classes', () => {
    const mockWebsites = [
      {
        id: '1',
        url: 'https://example.com',
        label: 'Example Site',
        blurb: 'A great example website'
      }
    ];

    it('should apply correct container styling', () => {
      const { container } = renderWithTemplateContext(
        <WebsiteDisplay />,
        { residentData: { websites: mockWebsites } }
      );
      
      const websitesSection = container.querySelector('.websites-section');
      expect(websitesSection).toHaveClass(
        'websites-section',
        'border',
        'border-black',
        'p-3',
        'bg-white',
        'shadow-[2px_2px_0_#000]'
      );
    });

    it('should apply correct heading styling', () => {
      renderWithTemplateContext(
        <WebsiteDisplay />,
        { residentData: { websites: mockWebsites } }
      );
      
      const heading = screen.getByText('Website Recommendations');
      expect(heading).toHaveClass('section-heading', 'font-bold', 'mb-3');
    });

    it('should apply correct list container styling', () => {
      const { container } = renderWithTemplateContext(
        <WebsiteDisplay />,
        { residentData: { websites: mockWebsites } }
      );
      
      const websitesList = container.querySelector('.websites-list');
      expect(websitesList).toHaveClass('websites-list', 'space-y-3');
    });

    it('should apply correct website item styling', () => {
      const { container } = renderWithTemplateContext(
        <WebsiteDisplay />,
        { residentData: { websites: mockWebsites } }
      );
      
      const websiteItem = container.querySelector('.website-item');
      expect(websiteItem).toHaveClass('website-item', 'border-l-4', 'border-blue-400', 'pl-3');
    });

    it('should apply correct website content styling', () => {
      const { container } = renderWithTemplateContext(
        <WebsiteDisplay />,
        { residentData: { websites: mockWebsites } }
      );
      
      const websiteContent = container.querySelector('.website-content');
      expect(websiteContent).toHaveClass('website-content', 'flex', 'items-start', 'justify-between');
      
      const websiteInfo = container.querySelector('.website-info');
      expect(websiteInfo).toHaveClass('website-info', 'flex-1');
    });

    it('should apply correct link styling', () => {
      renderWithTemplateContext(
        <WebsiteDisplay />,
        { residentData: { websites: mockWebsites } }
      );
      
      const link = screen.getByRole('link', { name: 'Example Site' });
      expect(link).toHaveClass(
        'website-link',
        'text-blue-600',
        'hover:text-blue-800',
        'hover:underline'
      );
    });

    it('should apply correct title styling', () => {
      const { container } = renderWithTemplateContext(
        <WebsiteDisplay />,
        { residentData: { websites: mockWebsites } }
      );
      
      const title = container.querySelector('.website-title');
      expect(title).toHaveClass('website-title', 'font-semibold');
    });

    it('should apply correct blurb styling', () => {
      const { container } = renderWithTemplateContext(
        <WebsiteDisplay />,
        { residentData: { websites: mockWebsites } }
      );
      
      const blurb = container.querySelector('.website-blurb');
      expect(blurb).toHaveClass('website-blurb', 'text-sm', 'text-gray-700', 'mt-1');
    });

    it('should apply correct URL styling', () => {
      const { container } = renderWithTemplateContext(
        <WebsiteDisplay />,
        { residentData: { websites: mockWebsites } }
      );
      
      const url = container.querySelector('.website-url');
      expect(url).toHaveClass('website-url', 'text-xs', 'text-gray-500', 'mt-1');
    });
  });

  describe('Content Handling', () => {
    it('should handle special characters in website labels', () => {
      const specialWebsite = {
        id: '1',
        url: 'https://special.com',
        label: 'Special & "Unique" Site',
        blurb: 'Contains <special> characters'
      };

      renderWithTemplateContext(
        <WebsiteDisplay />,
        { residentData: { websites: [specialWebsite] } }
      );
      
      expect(screen.getByText('Special & "Unique" Site')).toBeInTheDocument();
      expect(screen.getByText('Contains <special> characters')).toBeInTheDocument();
    });

    it('should handle Unicode characters in website data', () => {
      const unicodeWebsite = {
        id: '1',
        url: 'https://unicode.com',
        label: '🌟 Amazing Site 中文',
        blurb: 'Unicode blurb ñáéíóú 🚀'
      };

      renderWithTemplateContext(
        <WebsiteDisplay />,
        { residentData: { websites: [unicodeWebsite] } }
      );
      
      expect(screen.getByText('🌟 Amazing Site 中文')).toBeInTheDocument();
      expect(screen.getByText('Unicode blurb ñáéíóú 🚀')).toBeInTheDocument();
    });

    it('should handle very long website labels', () => {
      const longLabelWebsite = {
        id: '1',
        url: 'https://long.com',
        label: 'A'.repeat(100),
        blurb: 'Regular blurb'
      };

      renderWithTemplateContext(
        <WebsiteDisplay />,
        { residentData: { websites: [longLabelWebsite] } }
      );
      
      expect(screen.getByText('A'.repeat(100))).toBeInTheDocument();
    });

    it('should handle very long blurbs', () => {
      const longBlurbWebsite = {
        id: '1',
        url: 'https://long-blurb.com',
        label: 'Long Blurb Site',
        blurb: 'B'.repeat(200)
      };

      renderWithTemplateContext(
        <WebsiteDisplay />,
        { residentData: { websites: [longBlurbWebsite] } }
      );
      
      expect(screen.getByText('B'.repeat(200))).toBeInTheDocument();
    });

    it('should handle various URL formats', () => {
      const urlVariations = [
        {
          id: '1',
          url: 'http://insecure.com',
          label: 'HTTP Site',
          blurb: null
        },
        {
          id: '2', 
          url: 'https://secure.com/path?query=value#hash',
          label: 'Complex URL',
          blurb: null
        },
        {
          id: '3',
          url: 'https://subdomain.example.com:8080',
          label: 'Port and Subdomain',
          blurb: null
        }
      ];

      renderWithTemplateContext(
        <WebsiteDisplay />,
        { residentData: { websites: urlVariations } }
      );
      
      expect(screen.getByText('http://insecure.com')).toBeInTheDocument();
      expect(screen.getByText('https://secure.com/path?query=value#hash')).toBeInTheDocument();
      expect(screen.getByText('https://subdomain.example.com:8080')).toBeInTheDocument();
      
      const httpLink = screen.getByRole('link', { name: 'HTTP Site' });
      expect(httpLink).toHaveAttribute('href', 'http://insecure.com');
    });
  });

  describe('Multiple Websites', () => {
    const multipleWebsites = [
      {
        id: '1',
        url: 'https://first.com',
        label: 'First Site',
        blurb: 'First website'
      },
      {
        id: '2',
        url: 'https://second.com',
        label: 'Second Site',
        blurb: 'Second website'
      },
      {
        id: '3',
        url: 'https://third.com',
        label: 'Third Site',
        blurb: null
      }
    ];

    it('should render all websites in the list', () => {
      renderWithTemplateContext(
        <WebsiteDisplay />,
        { residentData: { websites: multipleWebsites } }
      );
      
      expect(screen.getByText('First Site')).toBeInTheDocument();
      expect(screen.getByText('Second Site')).toBeInTheDocument();
      expect(screen.getByText('Third Site')).toBeInTheDocument();
    });

    it('should render all website links correctly', () => {
      renderWithTemplateContext(
        <WebsiteDisplay />,
        { residentData: { websites: multipleWebsites } }
      );
      
      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(3);
      expect(links[0]).toHaveAttribute('href', 'https://first.com');
      expect(links[1]).toHaveAttribute('href', 'https://second.com');
      expect(links[2]).toHaveAttribute('href', 'https://third.com');
    });

    it('should maintain correct spacing between websites', () => {
      const { container } = renderWithTemplateContext(
        <WebsiteDisplay />,
        { residentData: { websites: multipleWebsites } }
      );
      
      const websitesList = container.querySelector('.websites-list');
      expect(websitesList).toHaveClass('space-y-3');
    });

    it('should handle mixed content (some with blurbs, some without)', () => {
      renderWithTemplateContext(
        <WebsiteDisplay />,
        { residentData: { websites: multipleWebsites } }
      );
      
      expect(screen.getByText('First website')).toBeInTheDocument();
      expect(screen.getByText('Second website')).toBeInTheDocument();
      
      const thirdSiteItem = screen.getByText('Third Site').closest('.website-item');
      expect(thirdSiteItem?.querySelector('.website-blurb')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle website with missing required fields gracefully', () => {
      const incompleteWebsite = {
        id: '1',
        url: '',
        label: '',
        blurb: 'Has blurb but no URL or label'
      } as any;

      renderWithTemplateContext(
        <WebsiteDisplay />,
        { residentData: { websites: [incompleteWebsite] } }
      );
      
      // Component should render without crashing
      expect(screen.getByText('Website Recommendations')).toBeInTheDocument();
      expect(screen.getByText('Has blurb but no URL or label')).toBeInTheDocument();
    });

    it('should handle websites without IDs', () => {
      const noIdWebsite = {
        url: 'https://no-id.com',
        label: 'No ID Site',
        blurb: 'Missing ID field'
      } as any;

      // Should not crash and should filter out invalid entries
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      renderWithTemplateContext(
        <WebsiteDisplay />,
        { residentData: { websites: [noIdWebsite] } }
      );
      
      // Website without ID should be filtered out, so we should see empty state
      expect(screen.getByText('No websites added yet.')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });

    it('should handle null website objects in array', () => {
      const websitesWithNull = [
        null,
        {
          id: '1',
          url: 'https://valid.com',
          label: 'Valid Site',
          blurb: 'This one is valid'
        },
        undefined
      ] as any;

      // Should not crash and should render valid websites
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      renderWithTemplateContext(
        <WebsiteDisplay />,
        { residentData: { websites: websitesWithNull } }
      );
      
      expect(screen.getByText('Valid Site')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });

    it('should handle empty strings for optional fields', () => {
      const emptyStringWebsite = {
        id: '1',
        url: 'https://empty-fields.com',
        label: 'Empty Fields Site',
        blurb: ''
      };

      renderWithTemplateContext(
        <WebsiteDisplay />,
        { residentData: { websites: [emptyStringWebsite] } }
      );
      
      expect(screen.getByText('Empty Fields Site')).toBeInTheDocument();
      // Blurb section should not render for empty string
      const websiteItem = screen.getByText('Empty Fields Site').closest('.website-item');
      expect(websiteItem?.querySelector('.website-blurb')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    const accessibilityWebsite = {
      id: '1',
      url: 'https://accessible.com',
      label: 'Accessible Site',
      blurb: 'Testing accessibility'
    };

    it('should have semantic heading structure', () => {
      renderWithTemplateContext(
        <WebsiteDisplay />,
        { residentData: { websites: [accessibilityWebsite] } }
      );
      
      const heading = screen.getByRole('heading', { level: 4 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Website Recommendations');
    });

    it('should have proper link accessibility attributes', () => {
      renderWithTemplateContext(
        <WebsiteDisplay />,
        { residentData: { websites: [accessibilityWebsite] } }
      );
      
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should be keyboard navigable', () => {
      renderWithTemplateContext(
        <WebsiteDisplay />,
        { residentData: { websites: [accessibilityWebsite] } }
      );
      
      const link = screen.getByRole('link');
      link.focus();
      expect(link).toHaveFocus();
    });

    it('should have proper color contrast classes', () => {
      renderWithTemplateContext(
        <WebsiteDisplay />,
        { residentData: { websites: [accessibilityWebsite] } }
      );
      
      const link = screen.getByRole('link');
      expect(link).toHaveClass('text-blue-600');
      
      const blurb = screen.getByText('Testing accessibility');
      expect(blurb).toHaveClass('text-gray-700');
    });
  });
});