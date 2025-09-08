// Basic template compiler tests
import { escapeHtml, optimizeCSS } from '../html-optimizer';
import { generateIslandId } from '../island-detector';
import { validateModeCompatibility } from '../profile-modes';

describe('Template Compiler Basic Functions', () => {
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
      expect(optimized).toContain('color:red');
    });

    it('should minify whitespace', () => {
      const css = `
        .class    {
          color   :   red   ;
          margin  :  10px   5px;
        }
      `;
      
      const optimized = optimizeCSS(css);
      
      expect(optimized).toBe('.class{color:red;margin:10px 5px;}');
    });

    it('should handle empty CSS', () => {
      const optimized = optimizeCSS('');
      expect(optimized).toBe('');
    });
  });

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

  describe('validateModeCompatibility', () => {
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
});