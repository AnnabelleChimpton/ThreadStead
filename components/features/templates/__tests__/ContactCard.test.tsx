import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ContactCard, { ContactMethod } from '../ContactCard';
import { renderWithTemplateContext, createMockResidentData } from './test-utils';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockImplementation(() => Promise.resolve()),
  },
});

describe('ContactCard', () => {
  const mockData = createMockResidentData();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render contact card with contact methods', () => {
      renderWithTemplateContext(
        <ContactCard>
          <ContactMethod type="email" value="test@example.com" />
          <ContactMethod type="phone" value="+1-555-0123" />
          <ContactMethod type="website" value="https://example.com" />
        </ContactCard>,
        { residentData: mockData }
      );

      expect(screen.getByText('Contact Me')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByText('+1-555-0123')).toBeInTheDocument();
      expect(screen.getByText('https://example.com')).toBeInTheDocument();
    });

    it('should render custom title when provided', () => {
      renderWithTemplateContext(
        <ContactCard title="Get In Touch">
          <ContactMethod type="email" value="hello@test.com" />
        </ContactCard>,
        { residentData: mockData }
      );

      expect(screen.getByText('Get In Touch')).toBeInTheDocument();
    });

    it('should handle empty state gracefully', () => {
      renderWithTemplateContext(
        <ContactCard />,
        { residentData: mockData }
      );

      expect(screen.getByText('No contact information provided')).toBeInTheDocument();
      expect(screen.getByText('Add ContactMethod components to display contact details')).toBeInTheDocument();
    });

    it('should hide header when showHeader is false', () => {
      renderWithTemplateContext(
        <ContactCard showHeader={false}>
          <ContactMethod type="email" value="test@example.com" />
        </ContactCard>,
        { residentData: mockData }
      );

      expect(screen.queryByText('Contact Me')).not.toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
  });

  describe('Contact Method Types', () => {
    it('should render email with mailto link', () => {
      renderWithTemplateContext(
        <ContactCard>
          <ContactMethod type="email" value="contact@example.com" />
        </ContactCard>,
        { residentData: mockData }
      );

      const emailLink = screen.getByRole('link', { name: 'contact@example.com' });
      expect(emailLink).toHaveAttribute('href', 'mailto:contact@example.com');
    });

    it('should render phone with tel link', () => {
      renderWithTemplateContext(
        <ContactCard>
          <ContactMethod type="phone" value="+1-555-0123" />
        </ContactCard>,
        { residentData: mockData }
      );

      const phoneLink = screen.getByRole('link', { name: '+1-555-0123' });
      expect(phoneLink).toHaveAttribute('href', 'tel:+1-555-0123');
    });

    it('should render website with https link', () => {
      renderWithTemplateContext(
        <ContactCard>
          <ContactMethod type="website" value="example.com" />
        </ContactCard>,
        { residentData: mockData }
      );

      const websiteLink = screen.getByRole('link', { name: 'example.com' });
      expect(websiteLink).toHaveAttribute('href', 'https://example.com');
      expect(websiteLink).toHaveAttribute('target', '_blank');
      expect(websiteLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should render social links correctly', () => {
      renderWithTemplateContext(
        <ContactCard>
          <ContactMethod type="linkedin" value="linkedin.com/in/user" />
          <ContactMethod type="github" value="github.com/user" />
          <ContactMethod type="twitter" value="twitter.com/user" />
        </ContactCard>,
        { residentData: mockData }
      );

      expect(screen.getByRole('link', { name: 'linkedin.com/in/user' }))
        .toHaveAttribute('href', 'https://linkedin.com/in/user');
      expect(screen.getByRole('link', { name: 'github.com/user' }))
        .toHaveAttribute('href', 'https://github.com/user');
      expect(screen.getByRole('link', { name: 'twitter.com/user' }))
        .toHaveAttribute('href', 'https://twitter.com/user');
    });

    it('should handle custom contact type without link', () => {
      renderWithTemplateContext(
        <ContactCard>
          <ContactMethod type="custom" value="Discord: user#1234" label="Gaming" />
        </ContactCard>,
        { residentData: mockData }
      );

      expect(screen.getByText('Discord: user#1234')).toBeInTheDocument();
      expect(screen.getByText('Gaming')).toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
  });

  describe('Default Labels and Icons', () => {
    it('should use default labels when not provided', () => {
      renderWithTemplateContext(
        <ContactCard layout="compact">
          <ContactMethod type="email" value="test@example.com" />
          <ContactMethod type="phone" value="+1-555-0123" />
          <ContactMethod type="linkedin" value="linkedin.com/in/user" />
        </ContactCard>,
        { residentData: mockData }
      );

      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Phone')).toBeInTheDocument();
      expect(screen.getByText('LinkedIn')).toBeInTheDocument();
    });

    it('should use custom labels when provided', () => {
      renderWithTemplateContext(
        <ContactCard layout="detailed">
          <ContactMethod type="email" value="test@example.com" label="Business Email" />
          <ContactMethod type="phone" value="+1-555-0123" label="Direct Line" />
        </ContactCard>,
        { residentData: mockData }
      );

      expect(screen.getByText('Business Email')).toBeInTheDocument();
      expect(screen.getByText('Direct Line')).toBeInTheDocument();
    });

    it('should display default icons for contact types', () => {
      const { container } = renderWithTemplateContext(
        <ContactCard>
          <ContactMethod type="email" value="test@example.com" />
          <ContactMethod type="phone" value="+1-555-0123" />
          <ContactMethod type="github" value="github.com/user" />
        </ContactCard>,
        { residentData: mockData }
      );

      const icons = container.querySelectorAll('.ts-contact-icon');
      expect(icons[0]).toHaveTextContent('📧'); // email
      expect(icons[1]).toHaveTextContent('📞'); // phone
      expect(icons[2]).toHaveTextContent('🐙'); // github
    });

    it('should use custom icons when provided', () => {
      const { container } = renderWithTemplateContext(
        <ContactCard>
          <ContactMethod type="custom" value="Discord: user#1234" icon="🎮" />
        </ContactCard>,
        { residentData: mockData }
      );

      const icon = container.querySelector('.ts-contact-icon');
      expect(icon).toHaveTextContent('🎮');
    });
  });

  describe('Layout Options', () => {
    it('should render compact layout correctly', () => {
      const { container } = renderWithTemplateContext(
        <ContactCard layout="compact">
          <ContactMethod type="email" value="test@example.com" />
          <ContactMethod type="phone" value="+1-555-0123" />
        </ContactCard>,
        { residentData: mockData }
      );

      const contactList = container.querySelector('.ts-contact-list');
      expect(contactList).toHaveClass('space-y-2');
    });

    it('should render detailed layout correctly', () => {
      const { container } = renderWithTemplateContext(
        <ContactCard layout="detailed">
          <ContactMethod type="email" value="test@example.com" label="Business Email" />
        </ContactCard>,
        { residentData: mockData }
      );

      const contactList = container.querySelector('.ts-contact-list');
      expect(contactList).toHaveClass('space-y-4');
      expect(screen.getByText('Business Email')).toBeInTheDocument();
    });

    it('should render grid layout correctly', () => {
      const { container } = renderWithTemplateContext(
        <ContactCard layout="grid">
          <ContactMethod type="email" value="test@example.com" />
          <ContactMethod type="phone" value="+1-555-0123" />
          <ContactMethod type="website" value="example.com" />
          <ContactMethod type="linkedin" value="linkedin.com/in/user" />
        </ContactCard>,
        { residentData: mockData }
      );

      const gridContainer = container.querySelector('.grid.grid-cols-2');
      expect(gridContainer).toBeInTheDocument();
    });
  });

  describe('Theme Variations', () => {
    it('should apply modern theme classes by default', () => {
      const { container } = renderWithTemplateContext(
        <ContactCard>
          <ContactMethod type="email" value="test@example.com" />
        </ContactCard>,
        { residentData: mockData }
      );

      const card = container.querySelector('.ts-contact-card');
      expect(card).toHaveClass('bg-white', 'border-gray-200');
    });

    it('should apply business theme classes', () => {
      const { container } = renderWithTemplateContext(
        <ContactCard theme="business">
          <ContactMethod type="email" value="test@example.com" />
        </ContactCard>,
        { residentData: mockData }
      );

      const card = container.querySelector('.ts-contact-card');
      expect(card).toHaveClass('bg-slate-50', 'border-slate-300');
    });

    it('should apply creative theme classes', () => {
      const { container } = renderWithTemplateContext(
        <ContactCard theme="creative">
          <ContactMethod type="email" value="test@example.com" />
        </ContactCard>,
        { residentData: mockData }
      );

      const card = container.querySelector('.ts-contact-card');
      expect(card).toHaveClass('bg-gradient-to-br', 'from-purple-50', 'to-pink-50');
    });

    it('should apply minimal theme classes', () => {
      const { container } = renderWithTemplateContext(
        <ContactCard theme="minimal">
          <ContactMethod type="email" value="test@example.com" />
        </ContactCard>,
        { residentData: mockData }
      );

      const card = container.querySelector('.ts-contact-card');
      expect(card).toHaveClass('bg-white', 'border-gray-300');
    });
  });

  describe('Expand/Collapse Functionality', () => {
    it('should show limited methods initially when collapsed', () => {
      renderWithTemplateContext(
        <ContactCard maxMethods={2}>
          <ContactMethod type="email" value="email@example.com" />
          <ContactMethod type="phone" value="+1-555-0123" />
          <ContactMethod type="website" value="example.com" />
          <ContactMethod type="linkedin" value="linkedin.com/in/user" />
        </ContactCard>,
        { residentData: mockData }
      );

      expect(screen.getByText('email@example.com')).toBeInTheDocument();
      expect(screen.getByText('+1-555-0123')).toBeInTheDocument();
      expect(screen.queryByText('example.com')).not.toBeInTheDocument();
      expect(screen.getByText('Show 2 more methods')).toBeInTheDocument();
    });

    it('should expand to show all methods when expand button is clicked', () => {
      renderWithTemplateContext(
        <ContactCard maxMethods={1}>
          <ContactMethod type="email" value="email@example.com" />
          <ContactMethod type="phone" value="+1-555-0123" />
          <ContactMethod type="website" value="example.com" />
        </ContactCard>,
        { residentData: mockData }
      );

      expect(screen.queryByText('+1-555-0123')).not.toBeInTheDocument();
      
      const expandButton = screen.getByText('Show 2 more methods');
      fireEvent.click(expandButton);

      expect(screen.getByText('+1-555-0123')).toBeInTheDocument();
      expect(screen.getByText('example.com')).toBeInTheDocument();
    });

    it('should toggle expand/collapse with header button', () => {
      renderWithTemplateContext(
        <ContactCard maxMethods={1}>
          <ContactMethod type="email" value="email@example.com" />
          <ContactMethod type="phone" value="+1-555-0123" />
        </ContactCard>,
        { residentData: mockData }
      );

      const toggleButton = screen.getByLabelText('Show more');
      
      // Initially collapsed
      expect(screen.queryByText('+1-555-0123')).not.toBeInTheDocument();
      
      // Click to expand
      fireEvent.click(toggleButton);
      expect(screen.getByText('+1-555-0123')).toBeInTheDocument();
      expect(screen.getByLabelText('Show less')).toBeInTheDocument();
      
      // Click to collapse
      fireEvent.click(toggleButton);
      expect(screen.queryByText('+1-555-0123')).not.toBeInTheDocument();
    });

    it('should start expanded when expanded prop is true', () => {
      renderWithTemplateContext(
        <ContactCard expanded maxMethods={1}>
          <ContactMethod type="email" value="email@example.com" />
          <ContactMethod type="phone" value="+1-555-0123" />
        </ContactCard>,
        { residentData: mockData }
      );

      expect(screen.getByText('email@example.com')).toBeInTheDocument();
      expect(screen.getByText('+1-555-0123')).toBeInTheDocument();
      expect(screen.getByLabelText('Show less')).toBeInTheDocument();
    });

    it('should not show expand/collapse when collapsible is false', () => {
      renderWithTemplateContext(
        <ContactCard collapsible={false} maxMethods={1}>
          <ContactMethod type="email" value="email@example.com" />
          <ContactMethod type="phone" value="+1-555-0123" />
        </ContactCard>,
        { residentData: mockData }
      );

      expect(screen.queryByLabelText('Show more')).not.toBeInTheDocument();
      expect(screen.queryByText('Show 1 more method')).not.toBeInTheDocument();
    });
  });

  describe('Copy to Clipboard Functionality', () => {
    it('should copy value to clipboard when copy button is clicked', async () => {
      renderWithTemplateContext(
        <ContactCard>
          <ContactMethod type="email" value="test@example.com" />
        </ContactCard>,
        { residentData: mockData }
      );

      const copyButton = screen.getByLabelText('Copy Email');
      fireEvent.click(copyButton);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test@example.com');
      
      await waitFor(() => {
        expect(screen.getByText('Email copied!')).toBeInTheDocument();
      });
    });

    it('should show copy feedback and hide it after timeout', async () => {
      jest.useFakeTimers();
      
      renderWithTemplateContext(
        <ContactCard>
          <ContactMethod type="phone" value="+1-555-0123" />
        </ContactCard>,
        { residentData: mockData }
      );

      const copyButton = screen.getByLabelText('Copy Phone');
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText('Phone copied!')).toBeInTheDocument();
      });

      // Fast-forward time
      jest.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(screen.queryByText('Phone copied!')).not.toBeInTheDocument();
      });
      
      jest.useRealTimers();
    });

    it('should not show copy button when copyable is false', () => {
      renderWithTemplateContext(
        <ContactCard>
          <ContactMethod type="email" value="test@example.com" copyable={false} />
        </ContactCard>,
        { residentData: mockData }
      );

      expect(screen.queryByLabelText('Copy Email')).not.toBeInTheDocument();
    });

    it('should handle copy failure gracefully', async () => {
      const mockWriteText = jest.fn().mockRejectedValue(new Error('Copy failed'));
      Object.assign(navigator, {
        clipboard: { writeText: mockWriteText }
      });

      renderWithTemplateContext(
        <ContactCard>
          <ContactMethod type="email" value="test@example.com" />
        </ContactCard>,
        { residentData: mockData }
      );

      const copyButton = screen.getByLabelText('Copy Email');
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText('Copy failed')).toBeInTheDocument();
      });
    });
  });

  describe('Priority Ordering', () => {
    it('should order contact methods by priority', () => {
      const { container } = renderWithTemplateContext(
        <ContactCard>
          <ContactMethod type="website" value="example.com" priority={1} />
          <ContactMethod type="email" value="test@example.com" priority={10} />
          <ContactMethod type="phone" value="+1-555-0123" priority={5} />
        </ContactCard>,
        { residentData: mockData }
      );

      const methods = container.querySelectorAll('.ts-contact-method');
      const values = Array.from(methods).map(method => 
        method.querySelector('.ts-contact-value')?.textContent
      );

      // Should be ordered by priority: email (10), phone (5), website (1)
      expect(values[0]).toBe('test@example.com');
      expect(values[1]).toBe('+1-555-0123');
      expect(values[2]).toBe('example.com');
    });
  });

  describe('Custom Styling Support', () => {
    it('should apply custom className', () => {
      const { container } = renderWithTemplateContext(
        <ContactCard className="custom-contact-style">
          <ContactMethod type="email" value="test@example.com" />
        </ContactCard>,
        { residentData: mockData }
      );

      const card = container.querySelector('.ts-contact-card');
      expect(card).toHaveClass('custom-contact-style');
    });

    it('should handle className as array', () => {
      const { container } = renderWithTemplateContext(
        <ContactCard className={['custom-style-1', 'custom-style-2']}>
          <ContactMethod type="email" value="test@example.com" />
        </ContactCard>,
        { residentData: mockData }
      );

      const card = container.querySelector('.ts-contact-card');
      expect(card).toHaveClass('custom-style-1', 'custom-style-2');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for expand/collapse', () => {
      renderWithTemplateContext(
        <ContactCard maxMethods={1}>
          <ContactMethod type="email" value="test@example.com" />
          <ContactMethod type="phone" value="+1-555-0123" />
        </ContactCard>,
        { residentData: mockData }
      );

      const toggleButton = screen.getByLabelText('Show more');
      expect(toggleButton).toBeInTheDocument();
    });

    it('should announce state changes to screen readers', () => {
      renderWithTemplateContext(
        <ContactCard maxMethods={1}>
          <ContactMethod type="email" value="test@example.com" />
          <ContactMethod type="phone" value="+1-555-0123" />
        </ContactCard>,
        { residentData: mockData }
      );

      expect(screen.getByText('Showing 1 of 2 contact methods')).toBeInTheDocument();

      const expandButton = screen.getByText('Show 1 more method');
      fireEvent.click(expandButton);

      expect(screen.getByText('Showing all 2 contact methods')).toBeInTheDocument();
    });

    it('should have proper focus management for interactive elements', () => {
      renderWithTemplateContext(
        <ContactCard>
          <ContactMethod type="email" value="test@example.com" />
        </ContactCard>,
        { residentData: mockData }
      );

      const copyButton = screen.getByLabelText('Copy Email');
      expect(copyButton).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-blue-500');
    });
  });

  describe('Data Attribute Support (Template Rendering)', () => {
    it('should handle contact methods from template data attributes', () => {
      renderWithTemplateContext(
        <ContactCard>
          <div 
            data-contact-type="email"
            data-contact-value="template@example.com"
            data-contact-label="Template Email"
            data-contact-priority="8"
          />
          <div
            data-contact-type="website"
            data-contact-value="https://template.com"
            data-contact-copyable="false"
          />
        </ContactCard>,
        { residentData: mockData }
      );

      expect(screen.getByText('template@example.com')).toBeInTheDocument();
      expect(screen.getByText('Template Email')).toBeInTheDocument();
      expect(screen.getByText('https://template.com')).toBeInTheDocument();
      
      // First method should have copy button, second should not
      expect(screen.getByLabelText('Copy Template Email')).toBeInTheDocument();
      expect(screen.queryByLabelText('Copy Website')).not.toBeInTheDocument();
    });
  });
});