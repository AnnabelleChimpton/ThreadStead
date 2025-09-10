/**
 * Test to verify component registry case-insensitive matching works
 */

import { componentRegistry } from '@/lib/templates/core/template-registry';

describe('Component Registry Case Sensitivity Test', () => {
  
  test('should find components with exact PascalCase match', () => {
    const component = componentRegistry.get('ProfileHero');
    expect(component).toBeDefined();
    expect(component?.name).toBe('ProfileHero');
  });

  test('should find components with lowercase match', () => {
    const component = componentRegistry.get('profilehero');
    expect(component).toBeDefined();
    expect(component?.name).toBe('ProfileHero');
  });

  test('should find nested components with lowercase match', () => {
    const skill = componentRegistry.get('skill');
    expect(skill).toBeDefined();
    expect(skill?.name).toBe('Skill');
    
    const carouselImage = componentRegistry.get('carouselimage');
    expect(carouselImage).toBeDefined();
    expect(carouselImage?.name).toBe('CarouselImage');
    
    const contactMethod = componentRegistry.get('contactmethod');
    expect(contactMethod).toBeDefined();
    expect(contactMethod?.name).toBe('ContactMethod');
  });

  test('should return undefined for non-existent components', () => {
    const component = componentRegistry.get('nonexistentcomponent');
    expect(component).toBeUndefined();
  });

  test('should list all allowed tags', () => {
    const allowedTags = componentRegistry.getAllowedTags();
    console.log('Allowed tags:', allowedTags);
    
    expect(allowedTags).toContain('ProfileHero');
    expect(allowedTags).toContain('Skill');
    expect(allowedTags).toContain('CarouselImage');
    expect(allowedTags).toContain('ContactMethod');
    expect(allowedTags).toContain('ProgressItem');
    expect(allowedTags.length).toBeGreaterThan(20);
  });

});