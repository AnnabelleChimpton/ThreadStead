/**
 * Test component registry case-insensitive matching
 */

import { componentRegistry } from '@/lib/templates/core/template-registry';

describe('Component Registry Case-Insensitive Matching', () => {
  it('should find components with exact case match', () => {
    const profilePhoto = componentRegistry.get('ProfilePhoto');
    expect(profilePhoto).toBeDefined();
    expect(profilePhoto?.name).toBe('ProfilePhoto');
    
    const bio = componentRegistry.get('Bio');
    expect(bio).toBeDefined();
    expect(bio?.name).toBe('Bio');
  });

  it('should find components with lowercase names', () => {
    const profilePhoto = componentRegistry.get('profilephoto');
    expect(profilePhoto).toBeDefined();
    expect(profilePhoto?.name).toBe('ProfilePhoto');
    
    const bio = componentRegistry.get('bio');
    expect(bio).toBeDefined();
    expect(bio?.name).toBe('Bio');
    
    const guestbook = componentRegistry.get('guestbook');
    expect(guestbook).toBeDefined();
    expect(guestbook?.name).toBe('Guestbook');
    
    const profilehero = componentRegistry.get('profilehero');
    expect(profilehero).toBeDefined();
    expect(profilehero?.name).toBe('ProfileHero');
  });

  it('should return undefined for non-existent components', () => {
    const nonExistent = componentRegistry.get('NonExistentComponent');
    expect(nonExistent).toBeUndefined();
    
    const nonExistentLower = componentRegistry.get('nonexistentcomponent');
    expect(nonExistentLower).toBeUndefined();
  });

  it('should have key components registered', () => {
    const expectedComponents = [
      'profilehero',
      'profilephoto', 
      'bio',
      'blogposts',
      'guestbook',
      'mediagrid',
      'tabs',
      'tab',
      'centeredbox',
      'splitlayout',
      'gridlayout',
      'flexcontainer',
      'gradientbox'
    ];
    
    console.log('Testing component registration for elegant template...');
    
    expectedComponents.forEach(componentName => {
      const registration = componentRegistry.get(componentName);
      console.log(`${componentName}: ${registration ? '✓ Found' : '✗ Missing'} (${registration?.name || 'N/A'})`);
      expect(registration).toBeDefined();
    });
  });

  it('should list all registered components', () => {
    const allTags = componentRegistry.getAllowedTags();
    console.log('All registered components:', allTags.sort());
    expect(allTags.length).toBeGreaterThan(20);
    
    // Check for key components
    const hasProfilePhoto = allTags.includes('ProfilePhoto');
    const hasBio = allTags.includes('Bio');
    const hasGuestbook = allTags.includes('Guestbook');
    
    expect(hasProfilePhoto).toBe(true);
    expect(hasBio).toBe(true); 
    expect(hasGuestbook).toBe(true);
  });
});