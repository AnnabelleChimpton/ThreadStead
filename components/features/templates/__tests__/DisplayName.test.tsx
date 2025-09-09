import React from 'react';
import { screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DisplayName from '../DisplayName';
import { renderWithTemplateContext, createMockResidentData } from './test-utils';

describe('DisplayName Component', () => {
  const mockResidentData = createMockResidentData({
    owner: {
      id: 'test-user-123',
      handle: 'testuser',
      displayName: 'John Doe',
      avatarUrl: '/test-avatar.jpg'
    }
  });

  describe('Basic Rendering', () => {
    it('should render display name with default props', () => {
      renderWithTemplateContext(<DisplayName />, { residentData: mockResidentData });
      
      const element = screen.getByRole('heading', { level: 2 });
      expect(element).toBeInTheDocument();
      expect(element).toHaveTextContent('John Doe');
    });

    it('should render display name without label by default', () => {
      renderWithTemplateContext(<DisplayName />, { residentData: mockResidentData });
      
      const element = screen.getByRole('heading', { level: 2 });
      expect(element).toHaveTextContent('John Doe');
      expect(element).not.toHaveTextContent('Display Name:');
    });

    it('should include base CSS classes', () => {
      renderWithTemplateContext(<DisplayName />, { residentData: mockResidentData });
      
      const element = screen.getByRole('heading', { level: 2 });
      expect(element).toHaveClass('ts-profile-display-name');
      expect(element).toHaveClass('thread-headline');
      expect(element).toHaveClass('text-3xl');
      expect(element).toHaveClass('font-bold');
      expect(element).toHaveClass('mb-1');
      expect(element).toHaveClass('text-thread-pine');
    });
  });

  describe('HTML Element Variants', () => {
    const elementTestCases = [
      { as: 'h1' as const, expectedLevel: 1 },
      { as: 'h2' as const, expectedLevel: 2 },
      { as: 'h3' as const, expectedLevel: 3 }
    ];

    elementTestCases.forEach(({ as, expectedLevel }) => {
      it(`should render as ${as} element`, () => {
        renderWithTemplateContext(<DisplayName as={as} />, { residentData: mockResidentData });
        
        const element = screen.getByRole('heading', { level: expectedLevel });
        expect(element).toBeInTheDocument();
        expect(element).toHaveTextContent('John Doe');
      });
    });

    it('should render as span element when specified', () => {
      renderWithTemplateContext(<DisplayName as="span" />, { residentData: mockResidentData });
      
      // Span doesn't have a specific role, so we'll check by text content and tag name
      const element = screen.getByText('John Doe');
      expect(element).toBeInTheDocument();
      expect(element.tagName).toBe('SPAN');
    });

    it('should render as div element when specified', () => {
      renderWithTemplateContext(<DisplayName as="div" />, { residentData: mockResidentData });
      
      const element = screen.getByText('John Doe');
      expect(element).toBeInTheDocument();
      expect(element.tagName).toBe('DIV');
    });

    it('should default to h2 element when no as prop provided', () => {
      renderWithTemplateContext(<DisplayName />, { residentData: mockResidentData });
      
      const element = screen.getByRole('heading', { level: 2 });
      expect(element).toBeInTheDocument();
    });
  });

  describe('Label Display', () => {
    it('should show label when showLabel is true', () => {
      renderWithTemplateContext(<DisplayName showLabel={true} />, { residentData: mockResidentData });
      
      const element = screen.getByRole('heading', { level: 2 });
      expect(element).toHaveTextContent('Display Name: John Doe');
    });

    it('should not show label when showLabel is false', () => {
      renderWithTemplateContext(<DisplayName showLabel={false} />, { residentData: mockResidentData });
      
      const element = screen.getByRole('heading', { level: 2 });
      expect(element).toHaveTextContent('John Doe');
      expect(element).not.toHaveTextContent('Display Name:');
    });

    it('should not show label by default', () => {
      renderWithTemplateContext(<DisplayName />, { residentData: mockResidentData });
      
      const element = screen.getByRole('heading', { level: 2 });
      expect(element).not.toHaveTextContent('Display Name:');
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className when provided as string', () => {
      renderWithTemplateContext(
        <DisplayName className="custom-display-name" />, 
        { residentData: mockResidentData }
      );
      
      const element = screen.getByRole('heading', { level: 2 });
      expect(element).toHaveClass('custom-display-name');
      // Should still have base classes
      expect(element).toHaveClass('ts-profile-display-name');
    });

    it('should handle custom className as array', () => {
      renderWithTemplateContext(
        <DisplayName className={['custom-class-1', 'custom-class-2'] as any} />, 
        { residentData: mockResidentData }
      );
      
      const element = screen.getByRole('heading', { level: 2 });
      expect(element).toHaveClass('custom-class-1');
      expect(element).toHaveClass('custom-class-2');
    });

    it('should maintain base classes when custom className is added', () => {
      renderWithTemplateContext(
        <DisplayName className="custom-style" />, 
        { residentData: mockResidentData }
      );
      
      const element = screen.getByRole('heading', { level: 2 });
      expect(element).toHaveClass('ts-profile-display-name');
      expect(element).toHaveClass('thread-headline');
      expect(element).toHaveClass('custom-style');
    });

    it('should not have inline styles', () => {
      renderWithTemplateContext(<DisplayName />, { residentData: mockResidentData });
      
      const element = screen.getByRole('heading', { level: 2 });
      expect(element).not.toHaveAttribute('style');
    });
  });

  describe('Data Handling', () => {
    it('should display owner displayName from resident data', () => {
      const customData = createMockResidentData({
        owner: {
          id: 'user-456',
          handle: 'johndoe',
          displayName: 'Jane Smith',
          avatarUrl: '/jane-avatar.jpg'
        }
      });

      renderWithTemplateContext(<DisplayName />, { residentData: customData });
      
      const element = screen.getByRole('heading', { level: 2 });
      expect(element).toHaveTextContent('Jane Smith');
    });

    it('should handle empty display name', () => {
      const emptyNameData = createMockResidentData({
        owner: {
          id: 'user-789',
          handle: 'noname',
          displayName: '',
          avatarUrl: '/default-avatar.jpg'
        }
      });

      renderWithTemplateContext(<DisplayName />, { residentData: emptyNameData });
      
      const element = screen.getByRole('heading', { level: 2 });
      expect(element).toHaveTextContent('');
    });

    it('should handle special characters in display name', () => {
      const specialNameData = createMockResidentData({
        owner: {
          id: 'user-special',
          handle: 'special',
          displayName: 'João Müller-Smith 🎨',
          avatarUrl: '/special-avatar.jpg'
        }
      });

      renderWithTemplateContext(<DisplayName />, { residentData: specialNameData });
      
      const element = screen.getByRole('heading', { level: 2 });
      expect(element).toHaveTextContent('João Müller-Smith 🎨');
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure for screen readers', () => {
      renderWithTemplateContext(<DisplayName as="h1" />, { residentData: mockResidentData });
      
      const element = screen.getByRole('heading', { level: 1 });
      expect(element).toBeInTheDocument();
      expect(element).toHaveAccessibleName('John Doe');
    });

    it('should maintain semantic meaning with different elements', () => {
      renderWithTemplateContext(<DisplayName as="h3" />, { residentData: mockResidentData });
      
      const element = screen.getByRole('heading', { level: 3 });
      expect(element).toBeInTheDocument();
    });

    it('should be readable by screen readers with label', () => {
      renderWithTemplateContext(<DisplayName showLabel={true} />, { residentData: mockResidentData });
      
      const element = screen.getByRole('heading', { level: 2 });
      expect(element).toHaveAccessibleName('Display Name: John Doe');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing owner data gracefully', () => {
      const noOwnerData = createMockResidentData({
        owner: null as any
      });

      expect(() => {
        renderWithTemplateContext(<DisplayName />, { residentData: noOwnerData });
      }).not.toThrow();
    });

    it('should handle undefined displayName gracefully', () => {
      const undefinedNameData = createMockResidentData({
        owner: {
          id: 'user-undefined',
          handle: 'undefined',
          displayName: undefined as any,
          avatarUrl: '/undefined-avatar.jpg'
        }
      });

      expect(() => {
        renderWithTemplateContext(<DisplayName />, { residentData: undefinedNameData });
      }).not.toThrow();
    });
  });

  describe('Component Integration', () => {
    it('should work with different combinations of props', () => {
      renderWithTemplateContext(
        <DisplayName 
          as="h1" 
          showLabel={true} 
          className="custom-heading"
        />, 
        { residentData: mockResidentData }
      );
      
      const element = screen.getByRole('heading', { level: 1 });
      expect(element).toHaveTextContent('Display Name: John Doe');
      expect(element).toHaveClass('custom-heading');
      expect(element).toHaveClass('ts-profile-display-name');
    });

    it('should render consistently with same props', () => {
      const { rerender } = renderWithTemplateContext(
        <DisplayName as="h2" showLabel={false} />, 
        { residentData: mockResidentData }
      );
      
      const element1 = screen.getByRole('heading', { level: 2 });
      const classes1 = element1.className;
      const content1 = element1.textContent;
      
      rerender(<DisplayName as="h2" showLabel={false} />);
      
      const element2 = screen.getByRole('heading', { level: 2 });
      expect(element2.className).toBe(classes1);
      expect(element2.textContent).toBe(content1);
    });
  });
});