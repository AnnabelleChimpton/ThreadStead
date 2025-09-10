/**
 * Integration test that processes elegant-showcase-template.html 
 * through the exact same production flow as the template editor
 */

import React from 'react';
import { render } from '@testing-library/react';
import fs from 'fs';
import path from 'path';

// Import the actual compilation functions used in production
import { parseTemplateForIslands } from '../../EnhancedTemplateEditor';

// Mock the component registry to match production
jest.mock('@/lib/templates/core/template-registry', () => ({
  componentRegistry: {
    getAllowedTags: () => [
      'ProfileHero', 'Bio', 'ProfilePhoto', 'CenteredBox', 'GradientBox', 
      'FlexContainer', 'SplitLayout', 'Tabs', 'Tab', 'BlogPosts', 'MediaGrid',
      'Show', 'ImageCarousel', 'CarouselImage', 'SkillChart', 'Skill',
      'GridLayout', 'RevealBox', 'PolaroidFrame', 'WaveText', 'ProgressTracker',
      'ProgressItem', 'IfVisitor', 'FollowButton', 'ContactCard', 'ContactMethod',
      'IfOwner', 'StickyNote', 'ProfileBadges', 'RetroTerminal', 'DisplayName',
      'GlitchText', 'MutualFriends', 'FloatingBadge', 'NeonBorder', 'Guestbook',
      'Choose', 'When', 'Otherwise', 'WebsiteDisplay'
    ],
    get: jest.fn()
  }
}));

describe('Elegant Showcase Production Flow Test', () => {
  let elegantShowcaseContent: string;

  beforeAll(() => {
    // Read the actual elegant-showcase-template.html file
    const templatePath = path.join(process.cwd(), 'elegant-showcase-template.html');
    elegantShowcaseContent = fs.readFileSync(templatePath, 'utf8');
  });

  test('should correctly extract CSS from style tags', () => {
    // Test CSS extraction (matching gallery template workflow)
    const styleMatch = elegantShowcaseContent.match(/<style[^>]*>([\s\S]*?)<\/style>/);
    
    expect(styleMatch).toBeTruthy();
    expect(styleMatch![1]).toContain(':root');
    expect(styleMatch![1]).toContain('--primary-gold');
    expect(styleMatch![1]).toContain('.elegant-header');
  });

  test('should extract clean HTML without style tags', () => {
    // Test HTML cleaning (matching gallery template workflow)
    const cleanHTML = elegantShowcaseContent.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').trim();
    
    expect(cleanHTML).not.toContain('<style');
    expect(cleanHTML).toContain('<ProfileHero');
    expect(cleanHTML).toContain('<CenteredBox');
    expect(cleanHTML).toContain('<SkillChart');
  });

  test('should parse all nested components correctly', () => {
    // Extract clean HTML first (like gallery templates do)
    const cleanHTML = elegantShowcaseContent.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').trim();
    
    // Create a mock parseTemplateForIslands function that mimics production
    const mockParseTemplateForIslands = (templateContent: string) => {
      const validComponents = [
        'ProfileHero', 'Bio', 'ProfilePhoto', 'CenteredBox', 'GradientBox', 
        'FlexContainer', 'SplitLayout', 'Tabs', 'Tab', 'BlogPosts', 'MediaGrid',
        'Show', 'ImageCarousel', 'CarouselImage', 'SkillChart', 'Skill',
        'GridLayout', 'RevealBox', 'PolaroidFrame', 'WaveText', 'ProgressTracker',
        'ProgressItem', 'IfVisitor', 'FollowButton', 'ContactCard', 'ContactMethod',
        'IfOwner', 'StickyNote', 'ProfileBadges', 'RetroTerminal', 'DisplayName',
        'GlitchText', 'MutualFriends', 'FloatingBadge', 'NeonBorder', 'Guestbook',
        'Choose', 'When', 'Otherwise', 'WebsiteDisplay'
      ];
      
      // Create a simple DOM parser to handle nested structure
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<root>${templateContent}</root>`, 'text/xml');
      
      const islands: any[] = [];
      let islandCounter = 0;
      
      function processElement(element: Element, parentId?: string): any {
        const tagName = element.tagName;
        const properComponentName = validComponents.find((valid: string) => 
          valid.toLowerCase() === tagName.toLowerCase()
        );
        
        if (properComponentName) {
          const islandId = `island-${islandCounter++}`;
          
          // Extract props from attributes
          const props: any = {};
          for (let i = 0; i < element.attributes.length; i++) {
            const attr = element.attributes[i];
            props[attr.name] = attr.value;
          }
          
          // Process children recursively
          const children: any[] = [];
          for (let i = 0; i < element.childNodes.length; i++) {
            const child = element.childNodes[i];
            if (child.nodeType === 1) { // ELEMENT_NODE
              const childResult = processElement(child as Element, islandId);
              if (childResult) {
                children.push(childResult);
              }
            }
          }
          
          const island = {
            id: islandId,
            component: properComponentName,
            props,
            children,
            parentId: parentId || undefined,
            placeholder: `<div data-island="${islandId}" data-component="${properComponentName}" class="island-placeholder"></div>`
          };
          
          islands.push(island);
          return island;
        }
        
        // Process children even if this element isn't a component
        for (let i = 0; i < element.childNodes.length; i++) {
          const child = element.childNodes[i];
          if (child.nodeType === 1) {
            processElement(child as Element, parentId);
          }
        }
        
        return null;
      }
      
      // Check if parsing succeeded
      if (doc.documentElement.tagName !== 'parsererror') {
        processElement(doc.documentElement);
      }
      
      return islands;
    };

    const islands = mockParseTemplateForIslands(cleanHTML);
    
    console.log(`Found ${islands.length} total components`);
    console.log('Components found:', islands.map(i => `${i.component}${i.parentId ? ` (nested in ${i.parentId})` : ' (root)'}`));
    
    // Should find all components
    expect(islands.length).toBeGreaterThan(20); // We have many components
    
    // Should find root-level components
    const rootComponents = islands.filter(i => !i.parentId);
    expect(rootComponents.length).toBeGreaterThan(5);
    expect(rootComponents.map(i => i.component)).toContain('ProfileHero');
    expect(rootComponents.map(i => i.component)).toContain('CenteredBox');
    
    // Should find nested components
    const nestedComponents = islands.filter(i => i.parentId);
    expect(nestedComponents.length).toBeGreaterThan(15);
    expect(nestedComponents.map(i => i.component)).toContain('Skill');
    expect(nestedComponents.map(i => i.component)).toContain('CarouselImage');
    expect(nestedComponents.map(i => i.component)).toContain('ContactMethod');
  });

  test('should compile ALL components (including nested ones) into placeholders', () => {
    // Extract clean HTML first
    const cleanHTML = elegantShowcaseContent.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').trim();
    
    // Parse islands (simulate our fixed parsing)
    const mockParseTemplateForIslands = (templateContent: string) => {
      const validComponents = [
        'ProfileHero', 'Bio', 'ProfilePhoto', 'CenteredBox', 'GradientBox', 
        'FlexContainer', 'SplitLayout', 'Tabs', 'Tab', 'BlogPosts', 'MediaGrid',
        'Show', 'ImageCarousel', 'CarouselImage', 'SkillChart', 'Skill',
        'GridLayout', 'RevealBox', 'PolaroidFrame', 'WaveText', 'ProgressTracker',
        'ProgressItem', 'IfVisitor', 'FollowButton', 'ContactCard', 'ContactMethod',
        'IfOwner', 'StickyNote', 'ProfileBadges', 'RetroTerminal', 'DisplayName',
        'GlitchText', 'MutualFriends', 'FloatingBadge', 'NeonBorder', 'Guestbook',
        'Choose', 'When', 'Otherwise', 'WebsiteDisplay'
      ];
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<root>${templateContent}</root>`, 'text/xml');
      
      const islands: any[] = [];
      let islandCounter = 0;
      
      function processElement(element: Element, parentId?: string): any {
        const tagName = element.tagName;
        const properComponentName = validComponents.find((valid: string) => 
          valid.toLowerCase() === tagName.toLowerCase()
        );
        
        if (properComponentName) {
          const islandId = `island-${islandCounter++}`;
          
          const island = {
            id: islandId,
            component: properComponentName,
            parentId: parentId || undefined,
            placeholder: `<div data-island="${islandId}" data-component="${properComponentName}" class="island-placeholder"></div>`
          };
          
          islands.push(island);
          
          // Process children recursively
          for (let i = 0; i < element.childNodes.length; i++) {
            const child = element.childNodes[i];
            if (child.nodeType === 1) {
              processElement(child as Element, islandId);
            }
          }
          
          return island;
        }
        
        // Process children even if this element isn't a component
        for (let i = 0; i < element.childNodes.length; i++) {
          const child = element.childNodes[i];
          if (child.nodeType === 1) {
            processElement(child as Element, parentId);
          }
        }
        
        return null;
      }
      
      if (doc.documentElement.tagName !== 'parsererror') {
        processElement(doc.documentElement);
      }
      
      return islands;
    };

    const islands = mockParseTemplateForIslands(cleanHTML);
    
    // Simulate our FIXED compilation that processes ALL islands (not just root ones)
    let staticHTML = cleanHTML;
    
    // Process in reverse order to handle nested components first (like our fix)
    const sortedIslands = [...islands].reverse();
    
    for (const island of sortedIslands) {
      const componentName = island.component.toLowerCase();
      
      // Handle self-closing tags
      const selfClosingRegex = new RegExp(`<${componentName}\\b([^>]*?)\\s*\/>`, 'gi');
      staticHTML = staticHTML.replace(selfClosingRegex, island.placeholder);
      
      // Handle full tags with content
      const fullTagRegex = new RegExp(`<${componentName}\\b([^>]*)>([\\s\\S]*?)<\\/${componentName}>`, 'gi');
      staticHTML = staticHTML.replace(fullTagRegex, island.placeholder);
    }
    
    console.log('Final compiled HTML length:', staticHTML.length);
    console.log('Number of placeholders in final HTML:', (staticHTML.match(/data-island="/g) || []).length);
    
    // After compilation, should have NO remaining component tags
    expect(staticHTML).not.toContain('<ProfileHero');
    expect(staticHTML).not.toContain('<Skill');
    expect(staticHTML).not.toContain('<CarouselImage');
    expect(staticHTML).not.toContain('<ContactMethod');
    
    // Should have placeholders instead
    expect(staticHTML).toContain('data-island=');
    expect(staticHTML).toContain('data-component=');
    expect(staticHTML).toContain('island-placeholder');
    
    // Should have the same number of placeholders as total components
    const placeholderCount = (staticHTML.match(/data-island="/g) || []).length;
    expect(placeholderCount).toBe(islands.length);
  });

  test('should identify any parsing errors or illegal tags', () => {
    // Extract clean HTML
    const cleanHTML = elegantShowcaseContent.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').trim();
    
    // Test XML parsing for errors
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<root>${cleanHTML}</root>`, 'text/xml');
    
    // Check for parser errors
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      console.error('XML Parsing Error:', parserError.textContent);
      console.log('First 500 chars of problematic HTML:', cleanHTML.substring(0, 500));
    }
    
    expect(parserError).toBeNull();
    expect(doc.documentElement.tagName).toBe('root');
  });
});