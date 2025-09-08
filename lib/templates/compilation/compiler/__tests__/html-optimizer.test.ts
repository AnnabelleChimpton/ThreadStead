// Tests for HTML optimization
import { generateStaticHTML, optimizeCSS, escapeHtml, calculateMetrics } from '../html-optimizer';
import { identifyIslands } from '../island-detector';
import { compileTemplate } from '@/lib/templates/compilation/template-parser';
import type { Island, TemplateNode } from '../types';

describe('HTML Optimization', () => {
  describe('generateStaticHTML', () => {
    it('should generate static HTML from simple AST', () => {
      const ast: TemplateNode = {
        type: 'root',
        children: [
          {
            type: 'element',
            tagName: 'div',
            properties: { className: 'container' },
            children: [
              {
                type: 'element',
                tagName: 'h1',
                properties: {},
                children: [
                  { type: 'text', value: 'Hello World' }
                ]
              }
            ]
          }
        ]
      };
      
      const html = generateStaticHTML(ast, []);
      
      expect(html).toContain('<div className="container">');
      expect(html).toContain('<h1>Hello World</h1>');
      expect(html).toContain('</div>');
    });

    it('should replace components with island placeholders', () => {
      const result = compileTemplate('<div><ProfilePhoto size="lg" /></div>');
      expect(result.success).toBe(true);
      
      if (result.ast) {
        const islands = identifyIslands(result.ast);
        const html = generateStaticHTML(result.ast, islands);
        
        expect(html).toContain('data-island');
        expect(html).toContain('data-component="ProfilePhoto"');
        expect(html).not.toContain('<ProfilePhoto');
      }
    });

    it('should handle multiple island replacements', () => {
      const template = '<div><ProfilePhoto size="md" /><DisplayName as="h1" /></div>';
      const result = compileTemplate(template);
      expect(result.success).toBe(true);
      
      if (result.ast) {
        const islands = identifyIslands(result.ast);
        const html = generateStaticHTML(result.ast, islands);
        
        expect(html).toContain('data-component="ProfilePhoto"');
        expect(html).toContain('data-component="DisplayName"');
        expect(islands).toHaveLength(2);
      }
    });

    it('should preserve regular HTML structure', () => {
      const template = `
        <div className="profile">
          <header>
            <h1>User Profile</h1>
            <ProfilePhoto size="sm" />
          </header>
          <main>
            <p>Some content here</p>
          </main>
        </div>
      `;
      
      const result = compileTemplate(template);
      expect(result.success).toBe(true);
      
      if (result.ast) {
        const islands = identifyIslands(result.ast);
        const html = generateStaticHTML(result.ast, islands);
        
        expect(html).toContain('<header>');
        expect(html).toContain('<h1>User Profile</h1>');
        expect(html).toContain('<main>');
        expect(html).toContain('<p>Some content here</p>');
        expect(html).toContain('data-component="ProfilePhoto"');
      }
    });

    it('should handle void elements correctly', () => {
      const ast: TemplateNode = {
        type: 'root',
        children: [
          {
            type: 'element',
            tagName: 'div',
            properties: {},
            children: [
              { type: 'element', tagName: 'br', properties: {}, children: [] },
              { type: 'element', tagName: 'hr', properties: {}, children: [] }
            ]
          }
        ]
      };
      
      const html = generateStaticHTML(ast, []);
      
      expect(html).toContain('<br />');
      expect(html).toContain('<hr />');
    });

    it('should handle boolean attributes', () => {
      const ast: TemplateNode = {
        type: 'root',
        children: [
          {
            type: 'element',
            tagName: 'input',
            properties: { 
              type: 'checkbox',
              checked: true,
              disabled: false
            },
            children: []
          }
        ]
      };
      
      const html = generateStaticHTML(ast, []);
      
      expect(html).toContain('checked');
      expect(html).not.toContain('disabled');
    });
  });

  describe('escapeHtml', () => {
    it('should escape HTML entities', () => {
      const unsafe = '<script>alert("xss")</script>';
      const safe = escapeHtml(unsafe);
      
      expect(safe).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    it('should escape all dangerous characters', () => {
      const unsafe = `<>"'&`;
      const safe = escapeHtml(unsafe);
      
      expect(safe).toBe('&lt;&gt;&quot;&#039;&amp;');
    });

    it('should leave safe content unchanged', () => {
      const safe = 'Hello world 123';
      const escaped = escapeHtml(safe);
      
      expect(escaped).toBe(safe);
    });
  });

  describe('optimizeCSS', () => {
    it('should remove comments', () => {
      const css = `
        /* This is a comment */
        .class { 
          color: red; /* Another comment */
        }
      `;
      
      const optimized = optimizeCSS(css);
      
      expect(optimized).not.toContain('/* This is a comment */');
      expect(optimized).not.toContain('/* Another comment */');
      expect(optimized).toContain('.class');
      expect(optimized).toContain('color: red');
    });

    it('should minify whitespace', () => {
      const css = `
        .class    {
          color   :   red   ;
          margin  :  10px   5px;
        }
      `;
      
      const optimized = optimizeCSS(css);
      
      expect(optimized).toBe('.class{color:red;margin:10px 5px}');
    });

    it('should handle empty CSS', () => {
      const optimized = optimizeCSS('');
      expect(optimized).toBe('');
    });

    it('should preserve important declarations', () => {
      const css = '.class { color: red !important; }';
      const optimized = optimizeCSS(css);
      
      expect(optimized).toContain('!important');
    });
  });

  describe('calculateMetrics', () => {
    it('should calculate basic metrics', () => {
      const html = '<div><p>Test</p></div>';
      const islands: Island[] = [
        {
          id: 'island-1',
          component: 'TestComponent',
          props: {},
          placeholder: '<div data-island="island-1"></div>'
        }
      ];
      
      const ast: TemplateNode = {
        type: 'root',
        children: [
          {
            type: 'element',
            tagName: 'div',
            properties: {},
            children: [
              {
                type: 'element',
                tagName: 'p',
                properties: {},
                children: [
                  { type: 'text', value: 'Test' }
                ]
              }
            ]
          }
        ]
      };
      
      const metrics = calculateMetrics(html, islands, ast);
      
      expect(metrics.nodeCount).toBe(3); // root, div, p, text
      expect(metrics.islandCount).toBe(1);
      expect(metrics.htmlSize).toBeGreaterThan(0);
      expect(metrics.estimatedRenderTime).toBeGreaterThan(0);
    });

    it('should calculate metrics for complex structure', () => {
      const html = '<div><section><h1>Title</h1><p>Content</p></section></div>';
      const islands: Island[] = [];
      
      const ast: TemplateNode = {
        type: 'root',
        children: [
          {
            type: 'element',
            tagName: 'div',
            properties: {},
            children: [
              {
                type: 'element',
                tagName: 'section',
                properties: {},
                children: [
                  {
                    type: 'element',
                    tagName: 'h1',
                    properties: {},
                    children: [{ type: 'text', value: 'Title' }]
                  },
                  {
                    type: 'element',
                    tagName: 'p',
                    properties: {},
                    children: [{ type: 'text', value: 'Content' }]
                  }
                ]
              }
            ]
          }
        ]
      };
      
      const metrics = calculateMetrics(html, islands, ast);
      
      expect(metrics.nodeCount).toBe(6); // root, div, section, h1, text, p, text
      expect(metrics.islandCount).toBe(0);
      expect(metrics.htmlSize).toBeGreaterThan(html.length * 0.5); // Roughly the size
    });
  });
});