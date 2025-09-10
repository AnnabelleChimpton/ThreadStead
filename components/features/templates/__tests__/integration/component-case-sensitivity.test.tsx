/**
 * Test to verify case-insensitive component parsing works correctly
 */

import { compileTemplate } from '@/lib/templates/compilation/template-parser';

describe('Component Case Sensitivity Test', () => {
  
  test('should handle PascalCase components converted to lowercase by HTML parser', () => {
    // Test a simple template with nested components
    const testTemplate = `
      <div class="hero-section">
        <ProfileHero variant="plain" />
        <div class="content">
          <CenteredBox maxWidth="xl" padding="lg">
            <SkillChart title="My Skills" display="bars">
              <Skill name="Writing" level="85" category="Creative" />
              <Skill name="Design" level="82" category="Visual" />
            </SkillChart>
          </CenteredBox>
        </div>
      </div>
    `;
    
    const result = compileTemplate(testTemplate);
    
    console.log('Compilation result:', JSON.stringify(result, null, 2));
    
    // Should succeed in parsing
    expect(result.success).toBe(true);
    expect(result.ast).toBeDefined();
    expect(result.validation?.stats.componentCounts).toBeDefined();
    
    // Should find all components (even though they're now lowercase internally)
    const componentCounts = result.validation?.stats.componentCounts || {};
    console.log('Component counts found:', componentCounts);
    
    // Should find all our components
    expect(Object.keys(componentCounts)).toContain('ProfileHero');
    expect(Object.keys(componentCounts)).toContain('CenteredBox');
    expect(Object.keys(componentCounts)).toContain('SkillChart');
    expect(Object.keys(componentCounts)).toContain('Skill');
    
    // Should find nested components
    expect(componentCounts['Skill']).toBe(2);
  });

  test('should handle complex elegant showcase components', () => {
    // Test just the component-heavy parts without DOCTYPE
    const complexTemplate = `
      <CenteredBox maxWidth="xl" padding="lg">
        <div class="content-section">
          <Tabs className="elegant-tabs">
            <Tab title="Skills">
              <SkillChart title="Creative Pursuits" display="bars" theme="professional">
                <Skill name="Writing" level="85" category="Creative" color="purple" />
                <Skill name="Photography" level="78" category="Visual" color="blue" />
                <Skill name="Design" level="82" category="Visual" color="green" />
              </SkillChart>
            </Tab>
            <Tab title="Gallery">
              <MediaGrid />
              <ImageCarousel autoplay="false" showThumbnails="true">
                <CarouselImage src="#" alt="Image 1" caption="Test" />
                <CarouselImage src="#" alt="Image 2" caption="Test" />
              </ImageCarousel>
            </Tab>
          </Tabs>
        </div>
        
        <SplitLayout ratio="2:1" gap="xl" responsive="true">
          <div>
            <GridLayout columns="2" gap="lg">
              <RevealBox buttonText="Discover" revealText="Hide">
                <PolaroidFrame caption="Test" rotation="3">
                  <div>Content</div>
                </PolaroidFrame>
              </RevealBox>
              <ProgressTracker title="Projects" display="circles">
                <ProgressItem label="Writing" value="65" max="100" />
                <ProgressItem label="Art" value="40" max="100" />
              </ProgressTracker>
            </GridLayout>
          </div>
          <aside>
            <ContactCard expanded="false" theme="creative">
              <ContactMethod type="email" value="test@test.com" />
              <ContactMethod type="twitter" value="@test" />
            </ContactCard>
          </aside>
        </SplitLayout>
      </CenteredBox>
    `;
    
    const result = compileTemplate(complexTemplate);
    
    console.log('Complex template compilation success:', result.success);
    console.log('Component counts:', result.validation?.stats.componentCounts);
    console.log('Errors:', result.errors);
    
    // Should successfully parse all nested components
    expect(result.success).toBe(true);
    
    const componentCounts = result.validation?.stats.componentCounts || {};
    
    // Should find deeply nested components
    expect(componentCounts['Skill']).toBe(3);
    expect(componentCounts['CarouselImage']).toBe(2);
    expect(componentCounts['ContactMethod']).toBe(2);
    expect(componentCounts['ProgressItem']).toBe(2);
    
    // Should find all types of components
    expect(Object.keys(componentCounts)).toContain('CenteredBox');
    expect(Object.keys(componentCounts)).toContain('Tabs');
    expect(Object.keys(componentCounts)).toContain('Tab');
    expect(Object.keys(componentCounts)).toContain('SkillChart');
    expect(Object.keys(componentCounts)).toContain('ImageCarousel');
    expect(Object.keys(componentCounts)).toContain('SplitLayout');
    expect(Object.keys(componentCounts)).toContain('GridLayout');
    expect(Object.keys(componentCounts)).toContain('RevealBox');
    expect(Object.keys(componentCounts)).toContain('PolaroidFrame');
    expect(Object.keys(componentCounts)).toContain('ProgressTracker');
    expect(Object.keys(componentCounts)).toContain('ContactCard');
  });

});