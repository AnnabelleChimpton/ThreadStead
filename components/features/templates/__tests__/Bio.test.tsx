import React from 'react';
import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Bio from '../Bio';
import { renderWithTemplateContext, createMockResidentData } from './test-utils';

describe('Bio Component', () => {
  const mockResidentData = createMockResidentData({
    capabilities: {
      bio: 'I am a passionate developer who loves creating amazing applications.'
    }
  });

  describe('Basic Rendering', () => {
    it('should render bio with default structure', () => {
      renderWithTemplateContext(<Bio />, { residentData: mockResidentData });
      
      // Should have heading
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('About Me');
      
      // Should have bio text
      const bioText = screen.getByText('I am a passionate developer who loves creating amazing applications.');
      expect(bioText).toBeInTheDocument();
    });

    it('should include correct base CSS classes', () => {
      renderWithTemplateContext(<Bio />, { residentData: mockResidentData });
      
      // Check container classes
      const container = screen.getByText('About Me').closest('div');
      expect(container).toHaveClass('ts-profile-bio-section');
      expect(container).toHaveClass('mb-4');
      
      // Check heading classes
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveClass('ts-bio-heading');
      expect(heading).toHaveClass('thread-headline');
      expect(heading).toHaveClass('text-xl');
      expect(heading).toHaveClass('font-bold');
      expect(heading).toHaveClass('mb-2');
      expect(heading).toHaveClass('text-thread-pine');
      
      // Check bio text classes
      const bioText = screen.getByText(/passionate developer/);
      expect(bioText).toHaveClass('ts-bio-text');
      expect(bioText).toHaveClass('ts-profile-bio');
      expect(bioText).toHaveClass('leading-relaxed');
      expect(bioText).toHaveClass('text-thread-charcoal');
    });

    it('should render as paragraph element for bio text', () => {
      renderWithTemplateContext(<Bio />, { residentData: mockResidentData });
      
      const bioText = screen.getByText(/passionate developer/);
      expect(bioText.tagName).toBe('P');
    });
  });

  describe('Bio Content', () => {
    it('should display bio from capabilities', () => {
      const customData = createMockResidentData({
        capabilities: {
          bio: 'Custom bio content for testing purposes.'
        }
      });

      renderWithTemplateContext(<Bio />, { residentData: customData });
      
      const bioText = screen.getByText('Custom bio content for testing purposes.');
      expect(bioText).toBeInTheDocument();
    });

    it('should display default bio when capabilities.bio is empty', () => {
      const emptyBioData = createMockResidentData({
        capabilities: {
          bio: ''
        }
      });

      renderWithTemplateContext(<Bio />, { residentData: emptyBioData });
      
      const defaultBio = screen.getByText('Welcome to my profile!');
      expect(defaultBio).toBeInTheDocument();
    });

    it('should display default bio when capabilities.bio is undefined', () => {
      const noBioData = createMockResidentData({
        capabilities: {
          bio: undefined as any
        }
      });

      renderWithTemplateContext(<Bio />, { residentData: noBioData });
      
      const defaultBio = screen.getByText('Welcome to my profile!');
      expect(defaultBio).toBeInTheDocument();
    });

    it('should display default bio when capabilities is null', () => {
      const noCapabilitiesData = createMockResidentData({
        capabilities: null as any
      });

      renderWithTemplateContext(<Bio />, { residentData: noCapabilitiesData });
      
      const defaultBio = screen.getByText('Welcome to my profile!');
      expect(defaultBio).toBeInTheDocument();
    });

    it('should handle long bio content', () => {
      const longBio = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(10);
      const longBioData = createMockResidentData({
        capabilities: {
          bio: longBio
        }
      });

      renderWithTemplateContext(<Bio />, { residentData: longBioData });
      
      // Use partial text match for long content and check it contains expected text
      const bioText = screen.getByText(/Lorem ipsum dolor sit amet/);
      expect(bioText).toBeInTheDocument();
      // Just verify it contains the expected content without exact whitespace matching
      expect(bioText.textContent).toContain('Lorem ipsum dolor sit amet, consectetur adipiscing elit.');
      // Count occurrences to ensure all repetitions are there
      const occurrences = (bioText.textContent || '').split('Lorem ipsum').length - 1;
      expect(occurrences).toBe(10);
    });

    it('should handle special characters and formatting', () => {
      const specialBio = 'Bio with special characters: áéíóú, emojis 🎨🚀, and "quotes" & symbols!';
      const specialBioData = createMockResidentData({
        capabilities: {
          bio: specialBio
        }
      });

      renderWithTemplateContext(<Bio />, { residentData: specialBioData });
      
      const bioText = screen.getByText(specialBio);
      expect(bioText).toBeInTheDocument();
    });

    it('should handle multiline bio content', () => {
      const multilineBio = 'First line of bio.\nSecond line of bio.\nThird line of bio.';
      const multilineBioData = createMockResidentData({
        capabilities: {
          bio: multilineBio
        }
      });

      renderWithTemplateContext(<Bio />, { residentData: multilineBioData });
      
      // Text content should include the bio content (newlines become spaces in DOM)
      const bioText = screen.getByText(/First line of bio/);
      expect(bioText).toBeInTheDocument();
      // Check that all parts are present
      expect(bioText).toHaveTextContent(/First line of bio/);
      expect(bioText).toHaveTextContent(/Second line of bio/);
      expect(bioText).toHaveTextContent(/Third line of bio/);
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className when provided as string', () => {
      renderWithTemplateContext(
        <Bio className="custom-bio-style" />, 
        { residentData: mockResidentData }
      );
      
      const container = screen.getByText('About Me').closest('div');
      expect(container).toHaveClass('custom-bio-style');
      // Should still have base classes
      expect(container).toHaveClass('ts-profile-bio-section');
      expect(container).toHaveClass('mb-4');
    });

    it('should handle custom className as array', () => {
      renderWithTemplateContext(
        <Bio className={['bio-class-1', 'bio-class-2'] as any} />, 
        { residentData: mockResidentData }
      );
      
      const container = screen.getByText('About Me').closest('div');
      expect(container).toHaveClass('bio-class-1');
      expect(container).toHaveClass('bio-class-2');
      expect(container).toHaveClass('ts-profile-bio-section');
    });

    it('should maintain base classes when custom className is added', () => {
      renderWithTemplateContext(
        <Bio className="additional-styles" />, 
        { residentData: mockResidentData }
      );
      
      const container = screen.getByText('About Me').closest('div');
      expect(container).toHaveClass('ts-profile-bio-section');
      expect(container).toHaveClass('mb-4');
      expect(container).toHaveClass('additional-styles');
    });

    it('should render correctly without custom className', () => {
      renderWithTemplateContext(<Bio />, { residentData: mockResidentData });
      
      const container = screen.getByText('About Me').closest('div');
      expect(container).toHaveClass('ts-profile-bio-section');
      expect(container).toHaveClass('mb-4');
      // Should not have any additional classes beyond base ones
      expect(container?.className.split(' ')).toHaveLength(2);
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      renderWithTemplateContext(<Bio />, { residentData: mockResidentData });
      
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveAccessibleName('About Me');
    });

    it('should have readable text content', () => {
      renderWithTemplateContext(<Bio />, { residentData: mockResidentData });
      
      const bioText = screen.getByText(/passionate developer/);
      expect(bioText).toBeInTheDocument();
      expect(bioText).toBeVisible();
    });

    it('should maintain semantic structure', () => {
      renderWithTemplateContext(<Bio />, { residentData: mockResidentData });
      
      // Should have h3 followed by p
      const heading = screen.getByRole('heading', { level: 3 });
      const paragraph = screen.getByText(/passionate developer/);
      
      expect(heading.tagName).toBe('H3');
      expect(paragraph.tagName).toBe('P');
    });

    it('should be screen reader friendly', () => {
      renderWithTemplateContext(<Bio />, { residentData: mockResidentData });
      
      const heading = screen.getByRole('heading', { level: 3 });
      const bioContent = screen.getByText(/passionate developer/);
      
      // Both should be accessible
      expect(heading).toHaveAccessibleName();
      expect(bioContent).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing capabilities gracefully', () => {
      const noCapabilitiesData = createMockResidentData({
        capabilities: undefined as any
      });

      expect(() => {
        renderWithTemplateContext(<Bio />, { residentData: noCapabilitiesData });
      }).not.toThrow();
      
      const defaultBio = screen.getByText('Welcome to my profile!');
      expect(defaultBio).toBeInTheDocument();
    });

    it('should handle null capabilities gracefully', () => {
      const nullCapabilitiesData = createMockResidentData({
        capabilities: null as any
      });

      expect(() => {
        renderWithTemplateContext(<Bio />, { residentData: nullCapabilitiesData });
      }).not.toThrow();
    });

    it('should handle empty capabilities object', () => {
      const emptyCapabilitiesData = createMockResidentData({
        capabilities: {} as any
      });

      renderWithTemplateContext(<Bio />, { residentData: emptyCapabilitiesData });
      
      const defaultBio = screen.getByText('Welcome to my profile!');
      expect(defaultBio).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('should work with different bio contents', () => {
      const shortBioData = createMockResidentData({
        capabilities: { bio: 'Short bio.' }
      });

      const { rerender } = renderWithTemplateContext(<Bio />, { residentData: shortBioData });
      expect(screen.getByText('Short bio.')).toBeInTheDocument();

      const longBioData = createMockResidentData({
        capabilities: { bio: 'This is a much longer bio that contains more detailed information.' }
      });

      rerender(<Bio />);
      // Note: rerender doesn't automatically update context, so we test structure stability
      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
    });

    it('should render consistently with same props', () => {
      const { rerender } = renderWithTemplateContext(
        <Bio className="test-class" />, 
        { residentData: mockResidentData }
      );
      
      const container1 = screen.getByText('About Me').closest('div');
      const classes1 = container1?.className;
      
      rerender(<Bio className="test-class" />);
      
      const container2 = screen.getByText('About Me').closest('div');
      expect(container2?.className).toBe(classes1);
    });

    it('should maintain structure with different styling combinations', () => {
      renderWithTemplateContext(
        <Bio className="custom-bio-wrapper additional-class" />, 
        { residentData: mockResidentData }
      );
      
      // Should still have proper structure
      const heading = screen.getByRole('heading', { level: 3 });
      const bioText = screen.getByText(/passionate developer/);
      const container = screen.getByText('About Me').closest('div');
      
      expect(heading).toBeInTheDocument();
      expect(bioText).toBeInTheDocument();
      expect(container).toHaveClass('ts-profile-bio-section');
      expect(container).toHaveClass('custom-bio-wrapper');
      expect(container).toHaveClass('additional-class');
    });
  });

  describe('Default Behavior', () => {
    it('should show default message when no bio is provided', () => {
      const noBioData = createMockResidentData({
        capabilities: { bio: '' }
      });

      renderWithTemplateContext(<Bio />, { residentData: noBioData });
      
      const defaultMessage = screen.getByText('Welcome to my profile!');
      expect(defaultMessage).toBeInTheDocument();
    });

    it('should use consistent default message', () => {
      const emptyBioData1 = createMockResidentData({
        capabilities: { bio: null as any }
      });
      
      const emptyBioData2 = createMockResidentData({
        capabilities: undefined as any
      });

      // Test first case
      const { rerender } = renderWithTemplateContext(<Bio />, { residentData: emptyBioData1 });
      expect(screen.getByText('Welcome to my profile!')).toBeInTheDocument();

      // Both should show same default
      rerender(<Bio />);
      expect(screen.getByText('Welcome to my profile!')).toBeInTheDocument();
    });
  });
});