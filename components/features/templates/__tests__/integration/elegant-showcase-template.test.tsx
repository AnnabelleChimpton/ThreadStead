import React from 'react';
import { render, screen } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import { renderWithTemplateContext, createMockResidentData } from '../test-utils';
import { parseTemplate } from '@/lib/templates/compilation/template-parser';
import { transformNodeToReact } from '@/lib/templates/rendering/template-renderer';
import type { TemplateNode } from '@/lib/templates/compilation/template-parser';

describe('Elegant Showcase Template Integration', () => {
  let templateContent: string;
  let templateHTML: string;
  let templateCSS: string;

  beforeAll(() => {
    // Read the elegant-showcase-template.html file
    const templatePath = path.join(process.cwd(), 'elegant-showcase-template.html');
    templateContent = fs.readFileSync(templatePath, 'utf-8');
    
    // Extract CSS and HTML separately
    const styleMatch = templateContent.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
    if (styleMatch) {
      templateCSS = styleMatch.map(tag => {
        const match = tag.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
        return match ? match[1] : '';
      }).join('\n');
    } else {
      templateCSS = '';
    }
    
    // Remove style tags and get just the body content
    const bodyMatch = templateContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    templateHTML = bodyMatch 
      ? bodyMatch[1].replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').trim()
      : templateContent.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').trim();
  });

  describe('Template Compilation', () => {
    it('should successfully parse the elegant showcase template', () => {
      const parsed = parseTemplate(templateHTML);
      expect(parsed).toBeDefined();
      expect(parsed.type).toBe('template');
      expect(parsed.children).toBeDefined();
      expect(parsed.children.length).toBeGreaterThan(0);
    });

    it('should correctly identify custom components in the template', () => {
      const parsed = parseTemplate(templateHTML);
      
      // Helper to find components recursively
      const findComponents = (node: TemplateNode, components: Set<string> = new Set()): Set<string> => {
        if (node.type === 'component') {
          components.add(node.name);
        }
        if (node.children) {
          node.children.forEach(child => findComponents(child, components));
        }
        return components;
      };
      
      const foundComponents = findComponents(parsed);
      
      // Check for expected components from the elegant template
      expect(foundComponents.has('profilehero')).toBe(true);
      expect(foundComponents.has('centeredbox')).toBe(true);
      expect(foundComponents.has('bio')).toBe(true);
      expect(foundComponents.has('profilephoto')).toBe(true);
      expect(foundComponents.has('gradientbox')).toBe(true);
      expect(foundComponents.has('flexcontainer')).toBe(true);
      expect(foundComponents.has('splitlayout')).toBe(true);
      expect(foundComponents.has('tabs')).toBe(true);
      expect(foundComponents.has('blogposts')).toBe(true);
      expect(foundComponents.has('mediagrid')).toBe(true);
      expect(foundComponents.has('guestbook')).toBe(true);
    });

    it('should preserve HTML structure and classes', () => {
      const parsed = parseTemplate(templateHTML);
      
      // Helper to check for specific classes
      const hasClass = (node: TemplateNode, className: string): boolean => {
        if (node.type === 'element' && node.props?.className?.includes(className)) {
          return true;
        }
        if (node.children) {
          return node.children.some(child => hasClass(child, className));
        }
        return false;
      };
      
      // Check for elegant template classes
      expect(hasClass(parsed, 'hero-section')).toBe(true);
      expect(hasClass(parsed, 'elegant-header')).toBe(true);
      expect(hasClass(parsed, 'content-section')).toBe(true);
      expect(hasClass(parsed, 'section-title')).toBe(true);
      expect(hasClass(parsed, 'elegant-card')).toBe(true);
    });
  });

  describe('Component Rendering', () => {
    it('should render the template with mock data', () => {
      const mockData = createMockResidentData({
        owner: {
          id: 'test-user',
          handle: 'elegantuser',
          displayName: 'Elegant User',
          avatarUrl: '/elegant-avatar.jpg'
        },
        capabilities: {
          bio: 'Welcome to my elegant digital space',
          website: 'https://elegant.example.com'
        },
        posts: [
          {
            id: 'post1',
            bodyHtml: '<p>Latest thought from the elegant template</p>',
            createdAt: new Date().toISOString()
          }
        ],
        guestbook: [
          {
            id: 'gb1',
            content: 'Beautiful template!',
            author: 'Visitor',
            createdAt: new Date().toISOString()
          }
        ]
      });

      const parsed = parseTemplate(templateHTML);
      const reactElement = transformNodeToReact(parsed, mockData);
      
      const { container } = renderWithTemplateContext(
        reactElement,
        { residentData: mockData }
      );

      // Verify structure is preserved
      expect(container.querySelector('.hero-section')).toBeInTheDocument();
      expect(container.querySelector('.elegant-header')).toBeInTheDocument();
      
      // Verify components are rendered with data
      expect(screen.getByText('Elegant User')).toBeInTheDocument(); // DisplayName
      expect(screen.getByText('Welcome to my elegant digital space')).toBeInTheDocument(); // Bio
      
      // Verify interactive sections
      const contentSections = container.querySelectorAll('.content-section');
      expect(contentSections.length).toBeGreaterThan(0);
    });

    it('should handle nested layouts correctly', () => {
      const mockData = createMockResidentData();
      const parsed = parseTemplate(templateHTML);
      const reactElement = transformNodeToReact(parsed, mockData);
      
      const { container } = renderWithTemplateContext(
        reactElement,
        { residentData: mockData }
      );

      // Check for nested layout components
      // The template uses CenteredBox > SplitLayout > FlexContainer structure
      const centeredBox = container.querySelector('[data-component="centered-box"]');
      expect(centeredBox).toBeInTheDocument();
      
      // Within centered box, should have split layout
      const splitLayout = centeredBox?.querySelector('[data-component="split-layout"]');
      expect(splitLayout).toBeInTheDocument();
      
      // Should maintain the 2:1 ratio specified in template
      const layoutChildren = splitLayout?.children;
      expect(layoutChildren?.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle conditional rendering (IfOwner, IfVisitor, Show/When)', () => {
      // Test as owner
      const ownerData = createMockResidentData({
        viewer: { id: 'user123' },
        owner: { id: 'user123', handle: 'owner', displayName: 'Owner' }
      });

      const parsed = parseTemplate(templateHTML);
      let reactElement = transformNodeToReact(parsed, ownerData);
      
      const { container: ownerContainer } = renderWithTemplateContext(
        reactElement,
        { residentData: ownerData }
      );

      // Owner should see owner-specific content
      const stickyNote = ownerContainer.querySelector('[data-component="sticky-note"]');
      expect(stickyNote).toBeInTheDocument();
      
      // Test as visitor
      const visitorData = createMockResidentData({
        viewer: { id: 'visitor123' },
        owner: { id: 'user123', handle: 'owner', displayName: 'Owner' }
      });

      reactElement = transformNodeToReact(parsed, visitorData);
      
      const { container: visitorContainer } = renderWithTemplateContext(
        reactElement,
        { residentData: visitorData }
      );

      // Visitor should see follow button
      const followButton = visitorContainer.querySelector('[data-component="follow-button"]');
      expect(followButton).toBeInTheDocument();
    });
  });

  describe('CSS Extraction and Application', () => {
    it('should extract CSS from style tags', () => {
      expect(templateCSS).toContain('--primary-gold: #d4af37');
      expect(templateCSS).toContain('.elegant-header');
      expect(templateCSS).toContain('.content-section');
      expect(templateCSS).toContain('@keyframes gentle-rotate');
    });

    it('should apply CSS styles to rendered components', () => {
      const mockData = createMockResidentData();
      const parsed = parseTemplate(templateHTML);
      const reactElement = transformNodeToReact(parsed, mockData);
      
      const { container } = renderWithTemplateContext(
        <>
          <style dangerouslySetInnerHTML={{ __html: templateCSS }} />
          {reactElement}
        </>,
        { residentData: mockData }
      );

      // CSS should be in the document
      const styles = container.querySelector('style');
      expect(styles?.textContent).toContain('--primary-gold');
      
      // Elements should have the classes that CSS targets
      const header = container.querySelector('.elegant-header');
      expect(header).toBeInTheDocument();
      expect(header?.classList.contains('elegant-header')).toBe(true);
    });
  });

  describe('Component Props and Attributes', () => {
    it('should correctly parse and apply component props', () => {
      const mockData = createMockResidentData();
      const parsed = parseTemplate(templateHTML);
      
      // Check that components have correct props parsed
      const checkComponentProps = (node: TemplateNode): void => {
        if (node.type === 'component') {
          switch (node.name) {
            case 'centeredbox':
              expect(node.props?.maxWidth).toBe('xl');
              expect(node.props?.padding).toBe('lg');
              break;
            case 'gradientbox':
              expect(node.props?.gradient).toBe('sunset');
              expect(node.props?.direction).toBe('br');
              break;
            case 'splitlayout':
              expect(node.props?.ratio).toBe('2:1');
              expect(node.props?.gap).toBe('xl');
              break;
            case 'imagecarousel':
              expect(node.props?.autoplay).toBe('false');
              expect(node.props?.showThumbnails).toBe('true');
              break;
          }
        }
        node.children?.forEach(checkComponentProps);
      };
      
      checkComponentProps(parsed);
    });

    it('should handle self-closing and nested components', () => {
      const parsed = parseTemplate(templateHTML);
      
      // Count different types of components
      let selfClosingCount = 0;
      let nestedCount = 0;
      
      const analyzeNode = (node: TemplateNode): void => {
        if (node.type === 'component') {
          if (!node.children || node.children.length === 0) {
            selfClosingCount++;
          } else {
            nestedCount++;
          }
        }
        node.children?.forEach(analyzeNode);
      };
      
      analyzeNode(parsed);
      
      // Should have both self-closing (like <bio />) and nested components
      expect(selfClosingCount).toBeGreaterThan(0);
      expect(nestedCount).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should gracefully handle missing components', () => {
      const mockData = createMockResidentData();
      const templateWithUnknown = templateHTML + '<unknowncomponent>Test</unknowncomponent>';
      
      const parsed = parseTemplate(templateWithUnknown);
      expect(parsed).toBeDefined();
      
      // Should still parse without throwing
      const reactElement = transformNodeToReact(parsed, mockData);
      expect(reactElement).toBeDefined();
    });

    it('should handle malformed HTML gracefully', () => {
      const malformedTemplate = '<div><profilehero>Missing closing tag';
      
      const parsed = parseTemplate(malformedTemplate);
      expect(parsed).toBeDefined();
      expect(parsed.type).toBe('template');
    });
  });
});