// Tests for island detection
import { identifyIslands, generateIslandId } from '../island-detector';
import { compileTemplate } from '@/lib/templates/compilation/template-parser';
import type { TemplateNode } from '@/lib/templates/compilation/template-parser';

describe('Island Detection', () => {
  describe('generateIslandId', () => {
    it('should generate consistent IDs for the same input', () => {
      const id1 = generateIslandId('ProfilePhoto', ['root', '0']);
      const id2 = generateIslandId('ProfilePhoto', ['root', '0']);
      
      expect(id1).toBe(id2);
    });

    it('should generate different IDs for different inputs', () => {
      const id1 = generateIslandId('ProfilePhoto', ['root', '0']);
      const id2 = generateIslandId('ProfilePhoto', ['root', '1']);
      const id3 = generateIslandId('DisplayName', ['root', '0']);
      
      expect(id1).not.toBe(id2);
      expect(id1).not.toBe(id3);
      expect(id2).not.toBe(id3);
    });

    it('should include component type in ID', () => {
      const id = generateIslandId('ProfilePhoto', ['root']);
      
      expect(id).toContain('profilephoto');
    });
  });

  describe('identifyIslands', () => {
    it('should identify single component as island', () => {
      // First test simple HTML to see if parser works at all
      const simpleResult = compileTemplate('<div>Hello</div>');
      console.log('Simple HTML test:');
      console.log('Success:', simpleResult.success);
      console.log('Errors:', simpleResult.errors);
      console.log('AST children count:', simpleResult.ast?.children?.length || 0);
      
      const result = compileTemplate('<ProfilePhoto size="lg" />');
      console.log('Component test:');
      console.log('Success:', result.success);
      console.log('Errors:', result.errors);
      console.log('AST children count:', result.ast?.children?.length || 0);
      
      expect(result.success).toBe(true);
      
      if (result.ast) {
        const islands = identifyIslands(result.ast);
        
        expect(islands).toHaveLength(1);
        expect(islands[0].component).toBe('ProfilePhoto');
        expect(islands[0].props.size).toBe('lg');
        expect(islands[0].id).toContain('island-profilephoto');
        expect(islands[0].placeholder).toContain('data-island');
        expect(islands[0].placeholder).toContain('data-component="ProfilePhoto"');
      }
    });

    it('should identify multiple components as separate islands', () => {
      const template = `
        <div>
          <ProfilePhoto size="md" />
          <DisplayName as="h1" />
          <BlogPosts limit="3" />
        </div>
      `;
      
      const result = compileTemplate(template);
      expect(result.success).toBe(true);
      
      if (result.ast) {
        const islands = identifyIslands(result.ast);
        
        expect(islands).toHaveLength(3);
        
        const componentNames = islands.map(i => i.component);
        expect(componentNames).toContain('ProfilePhoto');
        expect(componentNames).toContain('DisplayName');
        expect(componentNames).toContain('BlogPosts');
      }
    });

    it('should handle nested components correctly', () => {
      const template = `
        <FlexContainer direction="column">
          <ProfilePhoto size="lg" />
          <DisplayName as="h2" />
        </FlexContainer>
      `;
      
      const result = compileTemplate(template);
      expect(result.success).toBe(true);
      
      if (result.ast) {
        const islands = identifyIslands(result.ast);
        
        expect(islands).toHaveLength(3); // FlexContainer, ProfilePhoto, DisplayName
        
        const componentNames = islands.map(i => i.component);
        expect(componentNames).toContain('FlexContainer');
        expect(componentNames).toContain('ProfilePhoto');
        expect(componentNames).toContain('DisplayName');
      }
    });

    it('should ignore regular HTML elements', () => {
      const template = `
        <div>
          <h1>Regular HTML</h1>
          <p>Some text</p>
          <ProfilePhoto size="sm" />
        </div>
      `;
      
      const result = compileTemplate(template);
      expect(result.success).toBe(true);
      
      if (result.ast) {
        const islands = identifyIslands(result.ast);
        
        expect(islands).toHaveLength(1);
        expect(islands[0].component).toBe('ProfilePhoto');
      }
    });

    it('should preserve component props correctly', () => {
      const template = '<BlogPosts limit="5" />';
      
      const result = compileTemplate(template);
      expect(result.success).toBe(true);
      
      if (result.ast) {
        const islands = identifyIslands(result.ast);
        
        expect(islands).toHaveLength(1);
        expect(islands[0].component).toBe('BlogPosts');
        expect(islands[0].props).toEqual({ limit: 5 }); // Should be coerced to number
      }
    });

    it('should handle components with no props', () => {
      const template = '<Guestbook />';
      
      const result = compileTemplate(template);
      expect(result.success).toBe(true);
      
      if (result.ast) {
        const islands = identifyIslands(result.ast);
        
        expect(islands).toHaveLength(1);
        expect(islands[0].component).toBe('Guestbook');
        expect(islands[0].props).toEqual({});
      }
    });

    it('should handle complex nested structure', () => {
      const template = `
        <div className="profile-container">
          <FlexContainer direction="column" gap="lg">
            <ProfilePhoto size="xl" shape="circle" />
            <DisplayName as="h1" showLabel="true" />
            <GridLayout columns="2" gap="md">
              <BlogPosts limit="3" />
              <Guestbook />
            </GridLayout>
          </FlexContainer>
        </div>
      `;
      
      const result = compileTemplate(template);
      expect(result.success).toBe(true);
      
      if (result.ast) {
        const islands = identifyIslands(result.ast);
        
        expect(islands).toHaveLength(5);
        
        const componentNames = islands.map(i => i.component);
        expect(componentNames).toContain('FlexContainer');
        expect(componentNames).toContain('ProfilePhoto');
        expect(componentNames).toContain('DisplayName');
        expect(componentNames).toContain('GridLayout');
        expect(componentNames).toContain('BlogPosts');
        expect(componentNames).toContain('Guestbook');
      }
    });

    it('should create unique IDs for multiple instances of same component', () => {
      const template = `
        <div>
          <ProfilePhoto size="sm" />
          <ProfilePhoto size="md" />
          <ProfilePhoto size="lg" />
        </div>
      `;
      
      const result = compileTemplate(template);
      expect(result.success).toBe(true);
      
      if (result.ast) {
        const islands = identifyIslands(result.ast);
        
        expect(islands).toHaveLength(3);
        
        const ids = islands.map(i => i.id);
        expect(new Set(ids).size).toBe(3); // All IDs should be unique
        
        islands.forEach(island => {
          expect(island.component).toBe('ProfilePhoto');
        });
      }
    });

    it('should handle conditional rendering components', () => {
      const template = `
        <div>
          <Show when="posts">
            <BlogPosts limit="5" />
          </Show>
          <Choose>
            <When condition="hasGuestbook">
              <Guestbook />
            </When>
            <Otherwise>
              <p>No guestbook</p>
            </Otherwise>
          </Choose>
        </div>
      `;
      
      const result = compileTemplate(template);
      expect(result.success).toBe(true);
      
      if (result.ast) {
        const islands = identifyIslands(result.ast);
        
        // Should include Show, BlogPosts, Choose, When, Otherwise, Guestbook
        expect(islands.length).toBeGreaterThan(0);
        
        const componentNames = islands.map(i => i.component);
        expect(componentNames).toContain('Show');
        expect(componentNames).toContain('BlogPosts');
        expect(componentNames).toContain('Choose');
      }
    });
  });
});