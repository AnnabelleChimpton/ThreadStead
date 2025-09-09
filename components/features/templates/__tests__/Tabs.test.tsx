import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Tabs, { Tab } from '../Tabs';

describe('Tabs Component', () => {
  describe('Basic Functionality', () => {
    it('should render tabs with proper structure', () => {
      render(
        <Tabs>
          <Tab title="Tab 1">Content 1</Tab>
          <Tab title="Tab 2">Content 2</Tab>
          <Tab title="Tab 3">Content 3</Tab>
        </Tabs>
      );

      // Check tab buttons
      expect(screen.getByRole('tab', { name: 'Tab 1' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Tab 2' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Tab 3' })).toBeInTheDocument();

      // Check initial content (first tab should be active)
      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
      expect(screen.queryByText('Content 3')).not.toBeInTheDocument();
    });

    it('should switch tabs when clicked', () => {
      render(
        <Tabs>
          <Tab title="Tab 1">Content 1</Tab>
          <Tab title="Tab 2">Content 2</Tab>
        </Tabs>
      );

      // Initially first tab is active
      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.queryByText('Content 2')).not.toBeInTheDocument();

      // Click second tab
      fireEvent.click(screen.getByRole('tab', { name: 'Tab 2' }));

      // Now second tab should be active
      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });

    it('should apply active styles to current tab', () => {
      render(
        <Tabs>
          <Tab title="Tab 1">Content 1</Tab>
          <Tab title="Tab 2">Content 2</Tab>
        </Tabs>
      );

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });

      // First tab should be active initially
      expect(tab1).toHaveClass('active');
      expect(tab2).not.toHaveClass('active');

      // Click second tab
      fireEvent.click(tab2);

      // Now second tab should be active
      expect(tab1).not.toHaveClass('active');
      expect(tab2).toHaveClass('active');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <Tabs>
          <Tab title="Tab 1">Content 1</Tab>
          <Tab title="Tab 2">Content 2</Tab>
        </Tabs>
      );

      const tablist = screen.getByRole('tablist');
      expect(tablist).toHaveAttribute('aria-label', 'Profile sections');

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });

      // Check tab attributes
      expect(tab1).toHaveAttribute('aria-selected', 'true');
      expect(tab2).toHaveAttribute('aria-selected', 'false');
      expect(tab1).toHaveAttribute('id', 'tab-0');
      expect(tab2).toHaveAttribute('id', 'tab-1');
      expect(tab1).toHaveAttribute('aria-controls', 'panel-0');
      expect(tab2).toHaveAttribute('aria-controls', 'panel-1');

      // Check panel attributes
      const panel = screen.getByRole('tabpanel');
      expect(panel).toHaveAttribute('id', 'panel-0');
      expect(panel).toHaveAttribute('aria-labelledby', 'tab-0');
    });

    it('should update ARIA attributes when switching tabs', () => {
      render(
        <Tabs>
          <Tab title="Tab 1">Content 1</Tab>
          <Tab title="Tab 2">Content 2</Tab>
        </Tabs>
      );

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });

      // Click second tab
      fireEvent.click(tab2);

      // Check updated ARIA attributes
      expect(tab1).toHaveAttribute('aria-selected', 'false');
      expect(tab2).toHaveAttribute('aria-selected', 'true');

      const panel = screen.getByRole('tabpanel');
      expect(panel).toHaveAttribute('id', 'panel-1');
      expect(panel).toHaveAttribute('aria-labelledby', 'tab-1');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty tabs gracefully', () => {
      render(<Tabs>{/* No children */}</Tabs>);
      
      expect(screen.getByText(/No tabs to display/)).toBeInTheDocument();
    });

    it('should handle single tab', () => {
      render(
        <Tabs>
          <Tab title="Only Tab">Only Content</Tab>
        </Tabs>
      );

      expect(screen.getByRole('tab', { name: 'Only Tab' })).toBeInTheDocument();
      expect(screen.getByText('Only Content')).toBeInTheDocument();
    });

    it('should handle tabs with empty content', () => {
      render(
        <Tabs>
          <Tab title="Empty Tab"></Tab>
          <Tab title="Content Tab">Has content</Tab>
        </Tabs>
      );

      expect(screen.getByRole('tab', { name: 'Empty Tab' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Content Tab' })).toBeInTheDocument();
    });

    it('should handle non-Tab children gracefully', () => {
      render(
        <Tabs>
          <Tab title="Tab 1">Content 1</Tab>
          <div>Not a tab</div>
          <Tab title="Tab 2">Content 2</Tab>
        </Tabs>
      );

      // Should still render valid tabs
      expect(screen.getByRole('tab', { name: 'Tab 1' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Tab 2' })).toBeInTheDocument();
    });
  });

  describe('Styling and Layout', () => {
    it('should apply correct CSS classes', () => {
      render(
        <Tabs>
          <Tab title="Tab 1">Content 1</Tab>
        </Tabs>
      );

      const tabsWrapper = screen.getByRole('tablist').closest('.profile-tabs');
      expect(tabsWrapper).toHaveClass('thread-module');

      const tabButton = screen.getByRole('tab', { name: 'Tab 1' });
      expect(tabButton).toHaveClass('profile-tab-button');

      const tabPanel = screen.getByRole('tabpanel');
      expect(tabPanel).toHaveClass('profile-tab-panel');
    });

    it('should handle responsive classes', () => {
      render(
        <Tabs>
          <Tab title="Tab 1">Content 1</Tab>
        </Tabs>
      );

      const tablist = screen.getByRole('tablist');
      expect(tablist).toHaveClass('md:flex-wrap');

      const tabButton = screen.getByRole('tab', { name: 'Tab 1' });
      expect(tabButton).toHaveClass('px-3', 'sm:px-4', 'py-2', 'sm:py-3');
    });
  });

  describe('Islands Rendering Compatibility', () => {
    it('should handle children with data-tab-title attribute', () => {
      const MockIslandChild = ({ 'data-tab-title': title, children }: any) => (
        <div data-tab-title={title}>{children}</div>
      );

      render(
        <Tabs>
          <MockIslandChild data-tab-title="Island Tab 1">Island Content 1</MockIslandChild>
          <MockIslandChild data-tab-title="Island Tab 2">Island Content 2</MockIslandChild>
        </Tabs>
      );

      expect(screen.getByRole('tab', { name: 'Island Tab 1' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Island Tab 2' })).toBeInTheDocument();
      expect(screen.getByText('Island Content 1')).toBeInTheDocument();
    });

    it('should handle mixed Tab components and island-rendered content', () => {
      const MockIslandChild = ({ 'data-tab-title': title, children }: any) => (
        <div data-tab-title={title}>{children}</div>
      );

      render(
        <Tabs>
          <Tab title="Regular Tab">Regular Content</Tab>
          <MockIslandChild data-tab-title="Island Tab">Island Content</MockIslandChild>
        </Tabs>
      );

      expect(screen.getByRole('tab', { name: 'Regular Tab' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Island Tab' })).toBeInTheDocument();
      expect(screen.getByText('Regular Content')).toBeInTheDocument();
    });

    it('should handle children with title props', () => {
      const MockComponent = ({ title, children }: { title: string, children: React.ReactNode }) => (
        <div>{children}</div>
      );

      render(
        <Tabs>
          <MockComponent title="Prop Tab 1">Prop Content 1</MockComponent>
          <MockComponent title="Prop Tab 2">Prop Content 2</MockComponent>
        </Tabs>
      );

      expect(screen.getByRole('tab', { name: 'Prop Tab 1' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Prop Tab 2' })).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should not re-render inactive tab content', () => {
      const ExpensiveComponent = ({ id }: { id: string }) => {
        // This would normally be expensive to render
        return <div data-testid={`expensive-${id}`}>Expensive content {id}</div>;
      };

      render(
        <Tabs>
          <Tab title="Tab 1">
            <ExpensiveComponent id="1" />
          </Tab>
          <Tab title="Tab 2">
            <ExpensiveComponent id="2" />
          </Tab>
        </Tabs>
      );

      // Only first tab content should be rendered
      expect(screen.getByTestId('expensive-1')).toBeInTheDocument();
      expect(screen.queryByTestId('expensive-2')).not.toBeInTheDocument();

      // Switch to second tab
      fireEvent.click(screen.getByRole('tab', { name: 'Tab 2' }));

      // Now only second tab content should be rendered
      expect(screen.queryByTestId('expensive-1')).not.toBeInTheDocument();
      expect(screen.getByTestId('expensive-2')).toBeInTheDocument();
    });

    it('should maintain state when switching tabs quickly', () => {
      render(
        <Tabs>
          <Tab title="Tab 1">Content 1</Tab>
          <Tab title="Tab 2">Content 2</Tab>
          <Tab title="Tab 3">Content 3</Tab>
        </Tabs>
      );

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
      const tab3 = screen.getByRole('tab', { name: 'Tab 3' });

      // Rapidly switch tabs
      fireEvent.click(tab2);
      fireEvent.click(tab3);
      fireEvent.click(tab1);

      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(tab1).toHaveClass('active');
    });
  });
});