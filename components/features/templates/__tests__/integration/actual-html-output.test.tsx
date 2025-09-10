/**
 * Integration test to verify components render actual HTML content
 * This tests the REAL output, not just empty divs
 */

import React from 'react';
import { render } from '@testing-library/react';
import { renderWithTemplateContext, createMockResidentData } from '../test-utils';

import Bio from '../../Bio';
import ProfilePhoto from '../../ProfilePhoto';
import Guestbook from '../../Guestbook';
import ProfileHero from '../../ProfileHero';

describe('Component HTML Output Verification', () => {
  describe('Bio Component', () => {
    it('should render actual bio text content, not empty div', () => {
      const mockData = createMockResidentData({
        capabilities: {
          bio: 'This is my elegant bio from the template test!'
        }
      });

      const { container } = renderWithTemplateContext(
        <Bio />,
        { residentData: mockData }
      );

      // Should have actual content, not just empty divs
      const bioText = container.textContent;
      expect(bioText).toContain('This is my elegant bio from the template test!');
      expect(bioText).toContain('About Me');
      
      // Should have proper HTML structure
      const bioHeading = container.querySelector('.ts-bio-heading');
      expect(bioHeading).toBeInTheDocument();
      expect(bioHeading?.textContent).toBe('About Me');
      
      const bioContent = container.querySelector('.ts-bio-text');
      expect(bioContent).toBeInTheDocument();
      expect(bioContent?.textContent).toBe('This is my elegant bio from the template test!');

      console.log('Bio HTML output:', container.innerHTML);
    });

    it('should render default bio when none provided', () => {
      const mockData = createMockResidentData({
        capabilities: {} // No bio
      });

      const { container } = renderWithTemplateContext(
        <Bio />,
        { residentData: mockData }
      );

      const bioText = container.textContent;
      expect(bioText).toContain('Welcome to my profile!');
      expect(bioText).toContain('About Me');
    });
  });

  describe('ProfilePhoto Component', () => {
    it('should render actual img tag with avatar, not empty div', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'testuser',
          displayName: 'Test User',
          avatarUrl: '/test-avatar.jpg'
        }
      });

      const { container } = renderWithTemplateContext(
        <ProfilePhoto size="lg" shape="circle" />,
        { residentData: mockData }
      );

      // Should have actual img tag
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img?.src).toContain('test-avatar.jpg');
      expect(img?.alt).toContain('Test User');

      // Should have proper wrapper structure
      const wrapper = container.querySelector('.profile-photo-wrapper');
      expect(wrapper).toBeInTheDocument();

      // Should have proper size and shape classes
      expect(img?.className).toContain('w-48 h-48'); // lg size
      expect(img?.className).toContain('rounded-full'); // circle shape

      console.log('ProfilePhoto HTML output:', container.innerHTML);
    });

    it('should render placeholder when no avatar provided', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user', 
          handle: 'testuser',
          displayName: 'Test User',
          avatarUrl: undefined // No avatar
        }
      });

      const { container } = renderWithTemplateContext(
        <ProfilePhoto />,
        { residentData: mockData }
      );

      // Should have placeholder instead of img
      const placeholder = container.querySelector('.profile-photo-placeholder');
      expect(placeholder).toBeInTheDocument();
      expect(placeholder?.textContent).toBe('No Photo');

      // Should NOT have img tag
      const img = container.querySelector('img');
      expect(img).not.toBeInTheDocument();
    });
  });

  describe('ProfileHero Component', () => {
    it('should render actual hero content with user info, not empty div', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'hero-test',
          handle: 'herouser',
          displayName: 'Hero Test User',
          avatarUrl: '/hero-avatar.jpg'
        }
      });

      const { container } = renderWithTemplateContext(
        <ProfileHero variant="plain" />,
        { residentData: mockData }
      );

      // Should have actual content
      const heroText = container.textContent;
      expect(heroText).toContain('Hero Test User');

      // Should have display name
      const displayName = container.textContent;
      expect(displayName).toContain('Hero Test User');

      console.log('ProfileHero HTML output:', container.innerHTML);
    });
  });

  describe('Guestbook Component', () => {
    it('should render actual guestbook interface, not empty div', () => {
      const mockData = createMockResidentData({
        guestbook: [
          {
            id: 'gb1',
            content: 'Great profile!',
            author: 'Test Visitor',
            createdAt: new Date().toISOString()
          }
        ]
      });

      const { container } = renderWithTemplateContext(
        <Guestbook />,
        { residentData: mockData }
      );

      // Should have actual guestbook content
      const guestbookText = container.textContent;
      expect(guestbookText).toContain('Great profile!');
      expect(guestbookText).toContain('Test Visitor');

      console.log('Guestbook HTML output:', container.innerHTML);
    });
  });

  describe('Expected vs Actual Output', () => {
    it('should produce meaningful HTML that would work in a real template', () => {
      // This test simulates what should happen when elegant-showcase-template components are compiled
      const mockData = createMockResidentData({
        owner: {
          id: 'elegant-user',
          handle: 'elegantuser',
          displayName: 'Elegant User',
          avatarUrl: '/elegant-avatar.jpg'
        },
        capabilities: {
          bio: 'Welcome to my elegant digital space'
        },
        guestbook: [
          {
            id: 'gb1',
            content: 'Beautiful template!',
            author: 'Visitor',
            createdAt: new Date().toISOString()
          }
        ]
      });

      // Test multiple components together like they appear in elegant-showcase
      const { container } = renderWithTemplateContext(
        <div>
          <ProfileHero variant="plain" />
          <Bio />
          <ProfilePhoto size="lg" shape="circle" />
          <Guestbook />
        </div>,
        { residentData: mockData }
      );

      const fullHTML = container.innerHTML;
      const fullText = container.textContent;

      console.log('Full compiled template HTML length:', fullHTML.length);
      console.log('Full compiled template text preview:', fullText.substring(0, 200));

      // Verify this is NOT just empty divs
      expect(fullHTML.length).toBeGreaterThan(500); // Should have substantial HTML
      expect(fullText).toContain('Elegant User'); // ProfileHero content
      expect(fullText).toContain('Welcome to my elegant digital space'); // Bio content  
      expect(fullText).toContain('Beautiful template!'); // Guestbook content
      expect(container.querySelector('img')).toBeInTheDocument(); // ProfilePhoto img

      // Verify structure
      expect(container.querySelectorAll('div').length).toBeGreaterThan(5); // Multiple structured divs
      expect(container.querySelector('.ts-profile-bio-section')).toBeInTheDocument(); // Bio structure
      expect(container.querySelector('.profile-photo-wrapper')).toBeInTheDocument(); // Photo structure

      // This is what the compiled elegant template SHOULD look like instead of empty divs!
      console.log('This is what compiled components should produce:');
      console.log(fullHTML.substring(0, 500) + '...');
    });
  });
});