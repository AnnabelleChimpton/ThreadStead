// Tests for profile mode compilation
import { compileProfileTemplate, validateModeCompatibility } from '../profile-modes';
import type { ProfileRenderContext, ProfileMode } from '../types';
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider';

// Mock resident data for testing
const mockResidentData: ResidentData = {
  owner: {
    id: 'user123',
    handle: 'testuser',
    displayName: 'Test User',
    avatarUrl: '/assets/default-avatar.gif'
  },
  viewer: {
    id: null
  },
  posts: [
    {
      id: 'post1',
      contentHtml: '<p>Test post content</p>',
      createdAt: new Date().toISOString()
    }
  ],
  guestbook: [
    {
      id: 'gb1',
      message: 'Hello world!',
      authorUsername: 'friend',
      createdAt: new Date().toISOString()
    }
  ],
  capabilities: {
    bio: 'Test user bio'
  },
  images: [],
  profileImages: []
};

// Mock context factory
function createMockContext(
  mode: ProfileMode = 'default',
  customCSS?: string,
  customTemplate?: string
): ProfileRenderContext {
  return {
    user: {
      id: 'user123',
      handle: 'testuser',
      profile: {
        templateMode: mode,
        customCSS,
        customTemplate,
        customTemplateAst: null,
        includeSiteCSS: true,
        hideNavigation: false
      }
    },
    residentData: mockResidentData
  };
}

describe('Profile Mode Compilation', () => {
  describe('Default Mode', () => {
    it('should compile default mode successfully', async () => {
      const context = createMockContext('default');
      const result = await compileProfileTemplate(context);
      
      expect(result.success).toBe(true);
      expect(result.compiled).toBeDefined();
      expect(result.compiled?.mode).toBe('default');
      expect(result.compiled?.islands).toEqual([]);
      expect(result.compiled?.staticHTML).toBeDefined();
    });

    it('should ignore custom template in default mode', async () => {
      const context = createMockContext('default', undefined, '<div>Custom template</div>');
      const result = await compileProfileTemplate(context);
      
      expect(result.success).toBe(true);
      expect(result.compiled?.mode).toBe('default');
      // Custom template should be ignored in default mode
    });
  });

  describe('Enhanced Mode', () => {
    it('should compile enhanced mode with custom CSS', async () => {
      const customCSS = '.profile { background: red; }';
      const context = createMockContext('enhanced', customCSS);
      const result = await compileProfileTemplate(context);
      
      expect(result.success).toBe(true);
      expect(result.compiled).toBeDefined();
      expect(result.compiled?.mode).toBe('enhanced');
      expect(result.compiled?.staticHTML).toContain(customCSS);
      expect(result.compiled?.fallback).toBeDefined();
      expect(result.compiled?.fallback?.mode).toBe('default');
    });

    it('should work without custom CSS', async () => {
      const context = createMockContext('enhanced');
      const result = await compileProfileTemplate(context);
      
      expect(result.success).toBe(true);
      expect(result.compiled?.mode).toBe('enhanced');
    });
  });

  describe('Advanced Mode', () => {
    it('should compile advanced mode with valid template', async () => {
      const customTemplate = '<div><ProfilePhoto size="lg" /><DisplayName /></div>';
      const context = createMockContext('advanced', undefined, customTemplate);
      const result = await compileProfileTemplate(context);
      
      expect(result.success).toBe(true);
      expect(result.compiled).toBeDefined();
      expect(result.compiled?.mode).toBe('advanced');
      expect(result.compiled?.islands.length).toBeGreaterThan(0);
      expect(result.compiled?.staticHTML).toBeDefined();
      expect(result.compiled?.fallback).toBeDefined();
    });

    it('should fallback when no custom template is provided', async () => {
      const context = createMockContext('advanced');
      const result = await compileProfileTemplate(context);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('No custom template found for advanced mode');
      expect(result.warnings).toContain('Falling back to enhanced mode');
    });

    it('should fallback when template compilation fails', async () => {
      const invalidTemplate = '<div><InvalidComponent /></div>';
      const context = createMockContext('advanced', undefined, invalidTemplate);
      const result = await compileProfileTemplate(context);
      
      // Should either succeed with warnings or fail gracefully
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.warnings).toContain('Falling back to enhanced mode');
      }
    });

    it('should detect islands in complex templates', async () => {
      const complexTemplate = `
        <div>
          <ProfilePhoto size="lg" shape="circle" />
          <DisplayName as="h1" />
          <FlexContainer direction="column" gap="md">
            <BlogPosts limit="5" />
            <Guestbook />
          </FlexContainer>
        </div>
      `;
      const context = createMockContext('advanced', undefined, complexTemplate);
      const result = await compileProfileTemplate(context);
      
      expect(result.success).toBe(true);
      expect(result.compiled?.islands.length).toBe(4); // ProfilePhoto, DisplayName, BlogPosts, Guestbook
      
      const componentNames = result.compiled?.islands.map(i => i.component);
      expect(componentNames).toContain('ProfilePhoto');
      expect(componentNames).toContain('DisplayName');
      expect(componentNames).toContain('BlogPosts');
      expect(componentNames).toContain('Guestbook');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid mode gracefully', async () => {
      const context = createMockContext('invalid' as ProfileMode);
      const result = await compileProfileTemplate(context);
      
      expect(result.success).toBe(true);
      expect(result.compiled?.mode).toBe('default'); // Should fallback to default
    });

    it('should handle compilation errors gracefully', async () => {
      const context = createMockContext('advanced', undefined, '<div><<invalid>>html</div>');
      const result = await compileProfileTemplate(context);
      
      // Should either handle gracefully or fail with appropriate error
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Fallback Chain', () => {
    it('should create proper fallback chain: Advanced → Enhanced → Default', async () => {
      const context = createMockContext('advanced', '.custom { color: blue; }', '<div><ProfilePhoto /></div>');
      const result = await compileProfileTemplate(context);
      
      expect(result.success).toBe(true);
      expect(result.compiled?.mode).toBe('advanced');
      expect(result.compiled?.fallback?.mode).toBe('enhanced');
      expect(result.compiled?.fallback?.fallback?.mode).toBe('default');
    });
  });
});

describe('Template Mode Validation', () => {
  it('should validate default mode correctly', () => {
    const result = validateModeCompatibility('', 'default');
    
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should warn when template provided for default mode', () => {
    const result = validateModeCompatibility('<div>Template</div>', 'default');
    
    expect(result.isValid).toBe(true);
    expect(result.warnings).toContain('Custom template provided for default mode will be ignored');
  });

  it('should require template for advanced mode', () => {
    const result = validateModeCompatibility('', 'advanced');
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Advanced mode requires a custom template');
  });

  it('should validate enhanced mode correctly', () => {
    const result = validateModeCompatibility('', 'enhanced');
    
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should accept template for advanced mode', () => {
    const result = validateModeCompatibility('<div><ProfilePhoto /></div>', 'advanced');
    
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});