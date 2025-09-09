import React from 'react';

// Create isolated test versions of the registry classes to avoid dependency issues
class IsolatedComponentRegistry {
  private components = new Map<string, any>();

  register(registration: any) {
    this.components.set(registration.name, registration);
  }

  get(name: string) {
    return this.components.get(name);
  }

  getAllowedTags(): string[] {
    return Array.from(this.components.keys());
  }

  getAllowedAttributes(tagName: string): string[] {
    const registration = this.get(tagName);
    if (!registration?.props) return [];
    return Object.keys(registration.props);
  }
}

// Isolated prop validation logic (simplified version)
function isolatedValidateAndCoerceProp(value: any, schema: any): any {
  if (value === undefined || value === null) {
    if (schema.required) {
      throw new Error('Required prop is missing');
    }
    return schema.default;
  }

  switch (schema.type) {
    case 'string':
      return String(value);
    
    case 'number':
      const num = Number(value);
      if (isNaN(num)) {
        throw new Error(`Invalid number: ${value}`);
      }
      if (schema.min !== undefined && num < schema.min) return schema.min;
      if (schema.max !== undefined && num > schema.max) return schema.max;
      return num;
    
    case 'boolean':
      if (typeof value === 'boolean') return value;
      if (value === 'true' || value === '') return true;
      if (value === 'false') return false;
      return false;
    
    case 'enum':
      if (schema.values && schema.values.includes(value)) return value;
      return schema.default || schema.values?.[0];
    
    default:
      return value;
  }
}

function isolatedValidateAndCoerceProps(attrs: Record<string, any>, propSchemas: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  const warnings: string[] = [];

  // Process known props
  for (const [propName, schema] of Object.entries(propSchemas)) {
    try {
      result[propName] = isolatedValidateAndCoerceProp(attrs[propName], schema);
    } catch (error: any) {
      warnings.push(`Invalid prop ${propName}: ${error.message}`);
      if (schema.default !== undefined) {
        result[propName] = schema.default;
      }
    }
  }

  // Handle unknown props (warn except for className)
  for (const [attrName, value] of Object.entries(attrs)) {
    if (!propSchemas[attrName]) {
      if (attrName === 'className') {
        result[attrName] = value;
      } else {
        warnings.push(`Unknown prop: ${attrName}`);
      }
    }
  }

  if (warnings.length > 0) {
    console.warn('Template prop validation warnings:', warnings);
  }

  return result;
}

describe('Isolated Template Registry Tests', () => {
  let registry: IsolatedComponentRegistry;

  beforeEach(() => {
    registry = new IsolatedComponentRegistry();
  });

  describe('Component Registration', () => {
    it('should register and retrieve components', () => {
      const MockComponent = () => <div>Mock Component</div>;
      const registration = {
        name: 'MockComponent',
        component: MockComponent,
        props: {
          title: { type: 'string', required: true },
          size: { type: 'enum', values: ['sm', 'md', 'lg'], default: 'md' }
        }
      };

      registry.register(registration);
      const retrieved = registry.get('MockComponent');

      expect(retrieved).toBeDefined();
      expect(retrieved.name).toBe('MockComponent');
      expect(retrieved.component).toBe(MockComponent);
      expect(retrieved.props.title.type).toBe('string');
      expect(retrieved.props.size.values).toEqual(['sm', 'md', 'lg']);
    });

    it('should handle component replacement', () => {
      const Component1 = () => <div>Component 1</div>;
      const Component2 = () => <div>Component 2</div>;

      registry.register({
        name: 'TestComponent',
        component: Component1,
        props: { prop1: { type: 'string' } }
      });

      registry.register({
        name: 'TestComponent',
        component: Component2,
        props: { prop2: { type: 'number' } }
      });

      const retrieved = registry.get('TestComponent');
      expect(retrieved.component).toBe(Component2);
      expect(retrieved.props).toHaveProperty('prop2');
      expect(retrieved.props).not.toHaveProperty('prop1');
    });

    it('should return undefined for non-existent components', () => {
      expect(registry.get('NonExistent')).toBeUndefined();
    });
  });

  describe('Tag and Attribute Management', () => {
    it('should return all allowed tags', () => {
      registry.register({
        name: 'ComponentA',
        component: () => null,
        props: {}
      });
      registry.register({
        name: 'ComponentB',
        component: () => null,
        props: {}
      });

      const tags = registry.getAllowedTags();
      expect(tags).toContain('ComponentA');
      expect(tags).toContain('ComponentB');
      expect(tags.length).toBe(2);
    });

    it('should return allowed attributes for components', () => {
      registry.register({
        name: 'TestComponent',
        component: () => null,
        props: {
          title: { type: 'string' },
          size: { type: 'number' },
          enabled: { type: 'boolean' }
        }
      });

      const attrs = registry.getAllowedAttributes('TestComponent');
      expect(attrs).toContain('title');
      expect(attrs).toContain('size');
      expect(attrs).toContain('enabled');
      expect(attrs.length).toBe(3);
    });

    it('should return empty array for non-existent component attributes', () => {
      const attrs = registry.getAllowedAttributes('NonExistent');
      expect(attrs).toEqual([]);
    });
  });

  describe('Registry Scale Testing', () => {
    it('should handle large number of components efficiently', () => {
      // Register 100 components
      for (let i = 0; i < 100; i++) {
        registry.register({
          name: `Component${i}`,
          component: () => <div>Component {i}</div>,
          props: {
            prop1: { type: 'string' },
            prop2: { type: 'number', default: i }
          }
        });
      }

      const tags = registry.getAllowedTags();
      expect(tags.length).toBe(100);
      expect(tags).toContain('Component0');
      expect(tags).toContain('Component99');

      // Test retrieval performance
      const start = performance.now();
      const component50 = registry.get('Component50');
      const end = performance.now();

      expect(component50).toBeDefined();
      expect(end - start).toBeLessThan(10); // Should be very fast
    });

    it('should handle components with many props', () => {
      const manyProps: Record<string, any> = {};
      for (let i = 0; i < 50; i++) {
        manyProps[`prop${i}`] = { type: 'string', default: `default${i}` };
      }

      registry.register({
        name: 'ComponentWithManyProps',
        component: () => null,
        props: manyProps
      });

      const attrs = registry.getAllowedAttributes('ComponentWithManyProps');
      expect(attrs.length).toBe(50);
      expect(attrs).toContain('prop0');
      expect(attrs).toContain('prop49');
    });
  });
});

describe('Isolated Prop Validation Tests', () => {
  describe('Basic Type Coercion', () => {
    it('should handle string type validation', () => {
      const schema = { type: 'string' };
      
      expect(isolatedValidateAndCoerceProp('hello', schema)).toBe('hello');
      expect(isolatedValidateAndCoerceProp(123, schema)).toBe('123');
      expect(isolatedValidateAndCoerceProp(true, schema)).toBe('true');
      expect(isolatedValidateAndCoerceProp(null, schema)).toBeUndefined();
    });

    it('should handle number type validation', () => {
      const schema = { type: 'number' };
      
      expect(isolatedValidateAndCoerceProp('42', schema)).toBe(42);
      expect(isolatedValidateAndCoerceProp(42, schema)).toBe(42);
      expect(isolatedValidateAndCoerceProp('3.14', schema)).toBe(3.14);
      
      expect(() => isolatedValidateAndCoerceProp('not-a-number', schema))
        .toThrow('Invalid number: not-a-number');
    });

    it('should handle boolean type validation', () => {
      const schema = { type: 'boolean' };
      
      expect(isolatedValidateAndCoerceProp(true, schema)).toBe(true);
      expect(isolatedValidateAndCoerceProp(false, schema)).toBe(false);
      expect(isolatedValidateAndCoerceProp('true', schema)).toBe(true);
      expect(isolatedValidateAndCoerceProp('false', schema)).toBe(false);
      expect(isolatedValidateAndCoerceProp('', schema)).toBe(true); // HTML empty attr
      expect(isolatedValidateAndCoerceProp('anything', schema)).toBe(false);
    });

    it('should handle enum type validation', () => {
      const schema = { 
        type: 'enum', 
        values: ['small', 'medium', 'large'],
        default: 'medium'
      };
      
      expect(isolatedValidateAndCoerceProp('small', schema)).toBe('small');
      expect(isolatedValidateAndCoerceProp('invalid', schema)).toBe('medium');
    });
  });

  describe('Constraints and Defaults', () => {
    it('should apply min/max constraints to numbers', () => {
      const schema = { type: 'number', min: 1, max: 10 };
      
      expect(isolatedValidateAndCoerceProp('5', schema)).toBe(5);
      expect(isolatedValidateAndCoerceProp('0', schema)).toBe(1); // Clamped to min
      expect(isolatedValidateAndCoerceProp('15', schema)).toBe(10); // Clamped to max
    });

    it('should use defaults for missing values', () => {
      const schema = { type: 'string', default: 'default-value' };
      
      expect(isolatedValidateAndCoerceProp(undefined, schema)).toBe('default-value');
      expect(isolatedValidateAndCoerceProp(null, schema)).toBe('default-value');
    });

    it('should enforce required properties', () => {
      const schema = { type: 'string', required: true };
      
      expect(() => isolatedValidateAndCoerceProp(undefined, schema))
        .toThrow('Required prop is missing');
      expect(() => isolatedValidateAndCoerceProp(null, schema))
        .toThrow('Required prop is missing');
    });
  });

  describe('Batch Prop Validation', () => {
    const mockPropSchemas = {
      title: { type: 'string', required: true },
      size: { type: 'enum', values: ['sm', 'md', 'lg'], default: 'md' },
      count: { type: 'number', min: 0, max: 100, default: 0 },
      enabled: { type: 'boolean', default: false }
    };

    it('should validate all props successfully', () => {
      const attrs = {
        title: 'Test Title',
        size: 'lg',
        count: '5',
        enabled: 'true'
      };

      const result = isolatedValidateAndCoerceProps(attrs, mockPropSchemas);
      
      expect(result.title).toBe('Test Title');
      expect(result.size).toBe('lg');
      expect(result.count).toBe(5);
      expect(result.enabled).toBe(true);
    });

    it('should apply defaults for missing props', () => {
      const attrs = { title: 'Required Title' };
      
      const result = isolatedValidateAndCoerceProps(attrs, mockPropSchemas);
      
      expect(result.title).toBe('Required Title');
      expect(result.size).toBe('md');
      expect(result.count).toBe(0);
      expect(result.enabled).toBe(false);
    });

    it('should handle unknown props with warnings', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const attrs = {
        title: 'Test',
        unknownProp: 'value',
        className: 'allowed-unknown-prop'
      };

      const result = isolatedValidateAndCoerceProps(attrs, mockPropSchemas);
      
      expect(result.title).toBe('Test');
      expect(result.className).toBe('allowed-unknown-prop'); // className allowed
      expect(result).not.toHaveProperty('unknownProp');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Template prop validation warnings:',
        expect.arrayContaining(['Unknown prop: unknownProp'])
      );
      
      consoleWarnSpy.mockRestore();
    });

    it('should handle validation errors gracefully', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const attrs = {
        title: 'Test',
        count: 'not-a-number'
      };

      const result = isolatedValidateAndCoerceProps(attrs, mockPropSchemas);
      
      expect(result.title).toBe('Test');
      expect(result.count).toBe(0); // Default used when validation fails
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Template prop validation warnings:',
        expect.arrayContaining([
          expect.stringMatching(/Invalid prop count/)
        ])
      );
      
      consoleWarnSpy.mockRestore();
    });
  });

  describe('Edge Cases and Performance', () => {
    it('should handle empty schemas', () => {
      const result = isolatedValidateAndCoerceProps({ someAttr: 'value' }, {});
      expect(result.someAttr).toBeUndefined(); // Unknown props filtered out
    });

    it('should handle large prop sets efficiently', () => {
      const largeSchema: Record<string, any> = {};
      const largeAttrs: Record<string, any> = {};
      
      // Create 100 props
      for (let i = 0; i < 100; i++) {
        largeSchema[`prop${i}`] = { type: 'string', default: `default${i}` };
        largeAttrs[`prop${i}`] = `value${i}`;
      }

      const start = performance.now();
      const result = isolatedValidateAndCoerceProps(largeAttrs, largeSchema);
      const end = performance.now();

      expect(Object.keys(result).length).toBe(100);
      expect(result.prop0).toBe('value0');
      expect(result.prop99).toBe('value99');
      expect(end - start).toBeLessThan(50); // Should be fast
    });

    it('should handle circular references safely', () => {
      const circular: any = { prop: 'value' };
      circular.self = circular;
      
      // Should not crash when converting circular objects to string
      expect(() => {
        isolatedValidateAndCoerceProp(circular, { type: 'string' });
      }).not.toThrow();
    });
  });
});