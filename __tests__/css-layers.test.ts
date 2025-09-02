// Test suite for CSS layers utility
import { 
  generateLayeredCSS, 
  generatePreviewCSS, 
  generateOptimizedCSS,
  supportsCSSLayers,
  CSS_LAYERS 
} from '../lib/css-layers';

// Mock CSS.supports for testing
global.CSS = {
  supports: jest.fn()
} as any;

describe('CSS Layers Utility', () => {
  const mockSiteCSS = `
    .site-header { background: blue; }
    .site-footer { background: gray; }
  `;
  
  const mockUserCSS = `
    .profile-header { 
      background: red; 
      color: white; 
    }
  `;

  beforeEach(() => {
    (CSS.supports as jest.Mock).mockReturnValue(true);
  });

  describe('generateLayeredCSS', () => {
    it('should generate inherit mode CSS with proper layer order', () => {
      const result = generateLayeredCSS({
        cssMode: 'inherit',
        templateMode: 'default',
        siteWideCSS: mockSiteCSS,
        userCustomCSS: mockUserCSS,
        profileId: 'test-profile'
      });

      expect(result).toContain('@layer threadstead-browser, threadstead-reset');
      expect(result).toContain(`@layer ${CSS_LAYERS.SITE_WIDE}`);
      expect(result).toContain(`@layer ${CSS_LAYERS.USER_CUSTOM}`);
      expect(result).toContain('#test-profile .profile-header');
    });

    it('should generate override mode CSS with higher priority layer', () => {
      const result = generateLayeredCSS({
        cssMode: 'override',
        templateMode: 'enhanced',
        siteWideCSS: mockSiteCSS,
        userCustomCSS: mockUserCSS,
        profileId: 'test-profile'
      });

      expect(result).toContain(`@layer ${CSS_LAYERS.USER_OVERRIDE}`);
      expect(result).not.toContain('!important');
    });

    it('should generate disable mode CSS with only user styles', () => {
      const result = generateLayeredCSS({
        cssMode: 'disable',
        templateMode: 'advanced',
        siteWideCSS: mockSiteCSS,
        userCustomCSS: mockUserCSS,
        profileId: 'test-profile'
      });

      expect(result).not.toContain(mockSiteCSS);
      expect(result).toContain(`@layer ${CSS_LAYERS.USER_OVERRIDE}`);
    });
  });

  describe('CSS scoping', () => {
    it('should scope body selectors to profile container', () => {
      const cssWithBody = `
        body { background: red; }
        body .content { color: blue; }
      `;

      const result = generateLayeredCSS({
        cssMode: 'inherit',
        templateMode: 'default',
        userCustomCSS: cssWithBody,
        profileId: 'test-profile'
      });

      expect(result).toContain('#test-profile {');
      expect(result).toContain('#test-profile .content {');
      expect(result).not.toContain('body {');
    });

    it('should preserve @media queries and @keyframes', () => {
      const cssWithAtRules = `
        @media (max-width: 768px) {
          .mobile { display: block; }
        }
        @keyframes fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `;

      const result = generateLayeredCSS({
        cssMode: 'inherit',
        templateMode: 'default',
        userCustomCSS: cssWithAtRules,
        profileId: 'test-profile'
      });

      expect(result).toContain('@media (max-width: 768px)');
      expect(result).toContain('@keyframes fade');
    });
  });

  describe('CSS mode comment removal', () => {
    it('should remove CSS_MODE comments from user CSS', () => {
      const cssWithComment = `/* CSS_MODE:override */
        .test { color: red; }
      `;

      const result = generateLayeredCSS({
        cssMode: 'override',
        templateMode: 'advanced',
        userCustomCSS: cssWithComment,
        profileId: 'test-profile'
      });

      expect(result).not.toContain('CSS_MODE:override');
      expect(result).toContain('.test { color: red; }');
    });

    it('should remove auto-added !important declarations', () => {
      const cssWithImportant = `
        .test { color: red !important; }
        .another { background: blue !important; }
      `;

      const result = generateLayeredCSS({
        cssMode: 'inherit',
        templateMode: 'default',
        userCustomCSS: cssWithImportant,
        profileId: 'test-profile'
      });

      expect(result).toContain('color: red;');
      expect(result).toContain('background: blue;');
      expect(result).not.toContain('!important');
    });
  });

  describe('fallback behavior', () => {
    it('should use fallback CSS when layers are not supported', () => {
      (CSS.supports as jest.Mock).mockReturnValue(false);

      const mockGlobalCSS = '.global { font-family: Arial; }';
      
      const result = generateOptimizedCSS({
        cssMode: 'inherit',
        templateMode: 'default',
        globalCSS: mockGlobalCSS,
        siteWideCSS: mockSiteCSS,
        userCustomCSS: mockUserCSS,
        profileId: 'test-profile'
      });

      expect(result).not.toContain('@layer');
      expect(result).toContain('/* Global Base CSS */');
      expect(result).toContain('/* Site Wide CSS */');
      expect(result).toContain('/* User Custom CSS (inherit mode) */');
    });
  });

  describe('generatePreviewCSS', () => {
    it('should generate CSS suitable for preview mode', () => {
      const result = generatePreviewCSS({
        cssMode: 'inherit',
        templateMode: 'enhanced',
        siteWideCSS: mockSiteCSS,
        userCustomCSS: mockUserCSS
      });

      expect(result).toContain('@layer');
      expect(result).toContain('#preview-profile');
    });
  });

  describe('supportsCSSLayers', () => {
    it('should return true when CSS.supports indicates layer support', () => {
      (CSS.supports as jest.Mock).mockReturnValue(true);
      expect(supportsCSSLayers()).toBe(true);
    });

    it('should return false when CSS.supports indicates no layer support', () => {
      (CSS.supports as jest.Mock).mockReturnValue(false);
      expect(supportsCSSLayers()).toBe(false);
    });

    it('should return true in SSR environment', () => {
      const originalWindow = global.window;
      delete (global as any).window;
      
      expect(supportsCSSLayers()).toBe(true);
      
      global.window = originalWindow;
    });
  });
});