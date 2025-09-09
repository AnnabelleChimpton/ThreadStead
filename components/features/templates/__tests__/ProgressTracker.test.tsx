import React from 'react';
import { render, screen } from '@testing-library/react';
import ProgressTracker, { ProgressItem } from '../ProgressTracker';
import { renderWithTemplateContext, createMockResidentData } from './test-utils';

describe('ProgressTracker', () => {
  const mockData = createMockResidentData();

  describe('Basic Rendering', () => {
    it('should render with title and progress items', () => {
      renderWithTemplateContext(
        <ProgressTracker title="My Skills">
          <ProgressItem label="React" value={85} />
          <ProgressItem label="TypeScript" value={75} />
        </ProgressTracker>,
        { residentData: mockData }
      );

      expect(screen.getByText('My Skills')).toBeInTheDocument();
      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('TypeScript')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('should render without title when not provided', () => {
      renderWithTemplateContext(
        <ProgressTracker>
          <ProgressItem label="JavaScript" value={90} />
        </ProgressTracker>,
        { residentData: mockData }
      );

      expect(screen.getByText('JavaScript')).toBeInTheDocument();
      expect(screen.getByText('90%')).toBeInTheDocument();
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });

    it('should handle empty children gracefully', () => {
      renderWithTemplateContext(
        <ProgressTracker title="Empty Skills" />,
        { residentData: mockData }
      );

      expect(screen.getByText('No progress items to display')).toBeInTheDocument();
    });
  });

  describe('Progress Bar Display (default)', () => {
    it('should render progress bars with correct percentages', () => {
      const { container } = renderWithTemplateContext(
        <ProgressTracker display="bars">
          <ProgressItem label="React" value={75} />
          <ProgressItem label="CSS" value={50} />
        </ProgressTracker>,
        { residentData: mockData }
      );

      const progressBars = container.querySelectorAll('.ts-progress-bar-fill');
      expect(progressBars[0]).toHaveStyle('width: 75%');
      expect(progressBars[1]).toHaveStyle('width: 50%');
    });

    it('should handle values over 100% by capping at 100%', () => {
      const { container } = renderWithTemplateContext(
        <ProgressTracker display="bars">
          <ProgressItem label="Overachiever" value={150} />
        </ProgressTracker>,
        { residentData: mockData }
      );

      const progressBar = container.querySelector('.ts-progress-bar-fill');
      expect(progressBar).toHaveStyle('width: 100%');
    });

    it('should apply correct color classes', () => {
      const { container } = renderWithTemplateContext(
        <ProgressTracker display="bars" theme="modern">
          <ProgressItem label="React" value={75} color="blue" />
          <ProgressItem label="Vue" value={50} color="green" />
        </ProgressTracker>,
        { residentData: mockData }
      );

      const progressBars = container.querySelectorAll('.ts-progress-bar-fill');
      expect(progressBars[0]).toHaveClass('bg-blue-500');
      expect(progressBars[1]).toHaveClass('bg-green-500');
    });
  });

  describe('Star Rating Display', () => {
    it('should render star ratings correctly', () => {
      renderWithTemplateContext(
        <ProgressTracker display="stars">
          <ProgressItem label="Project A" value={4} max={5} />
          <ProgressItem label="Project B" value={3.5} max={5} />
        </ProgressTracker>,
        { residentData: mockData }
      );

      expect(screen.getByText('Project A')).toBeInTheDocument();
      expect(screen.getByText('Project B')).toBeInTheDocument();
      expect(screen.getByText('4/5')).toBeInTheDocument();
      expect(screen.getByText('3.5/5')).toBeInTheDocument();
    });

    it('should default to max 5 for stars', () => {
      renderWithTemplateContext(
        <ProgressTracker display="stars">
          <ProgressItem label="Rating" value={4} />
        </ProgressTracker>,
        { residentData: mockData }
      );

      // Should show as 4/5 since max defaults to 5 for stars
      expect(screen.getByText('4/5')).toBeInTheDocument();
    });
  });

  describe('Circular Progress Display', () => {
    it('should render circular progress indicators', () => {
      const { container } = renderWithTemplateContext(
        <ProgressTracker display="circles">
          <ProgressItem label="Goal 1" value={75} />
          <ProgressItem label="Goal 2" value={30} />
        </ProgressTracker>,
        { residentData: mockData }
      );

      expect(screen.getByText('Goal 1')).toBeInTheDocument();
      expect(screen.getByText('Goal 2')).toBeInTheDocument();
      
      // Circular progress shows percentages in both center and value area
      const seventyFivePercent = screen.getAllByText('75%');
      const thirtyPercent = screen.getAllByText('30%');
      expect(seventyFivePercent.length).toBeGreaterThan(0);
      expect(thirtyPercent.length).toBeGreaterThan(0);
      
      const circles = container.querySelectorAll('.ts-progress-circle');
      expect(circles).toHaveLength(2);
    });
  });

  describe('Dot Progress Display', () => {
    it('should render dot progress indicators', () => {
      const { container } = renderWithTemplateContext(
        <ProgressTracker display="dots">
          <ProgressItem label="Skill Level" value={7} max={10} />
        </ProgressTracker>,
        { residentData: mockData }
      );

      expect(screen.getByText('Skill Level')).toBeInTheDocument();
      expect(screen.getByText('7/10')).toBeInTheDocument();
      
      const dotsContainer = container.querySelector('.ts-progress-dots');
      expect(dotsContainer).toBeInTheDocument();
    });

    it('should default to max 10 for dots', () => {
      renderWithTemplateContext(
        <ProgressTracker display="dots">
          <ProgressItem label="Level" value={8} />
        </ProgressTracker>,
        { residentData: mockData }
      );

      expect(screen.getByText('8/10')).toBeInTheDocument();
    });
  });

  describe('Themes', () => {
    it('should apply modern theme classes', () => {
      const { container } = renderWithTemplateContext(
        <ProgressTracker theme="modern" display="bars">
          <ProgressItem label="React" value={75} color="blue" />
        </ProgressTracker>,
        { residentData: mockData }
      );

      const progressBar = container.querySelector('.ts-progress-bar-fill');
      expect(progressBar).toHaveClass('bg-blue-500');
    });

    it('should apply retro theme classes', () => {
      const { container } = renderWithTemplateContext(
        <ProgressTracker theme="retro" display="bars">
          <ProgressItem label="React" value={75} color="blue" />
        </ProgressTracker>,
        { residentData: mockData }
      );

      const progressBar = container.querySelector('.ts-progress-bar-fill');
      expect(progressBar).toHaveClass('bg-cyan-400');
    });

    it('should apply neon theme classes with glow effects', () => {
      const { container } = renderWithTemplateContext(
        <ProgressTracker theme="neon" display="bars">
          <ProgressItem label="React" value={75} color="blue" />
        </ProgressTracker>,
        { residentData: mockData }
      );

      const tracker = container.querySelector('.ts-progress-tracker');
      expect(tracker).toHaveClass('filter', 'drop-shadow-lg');
      
      const progressBar = container.querySelector('.ts-progress-bar-fill');
      expect(progressBar).toHaveClass('bg-blue-400', 'shadow-blue-400/50');
    });

    it('should apply minimal theme classes', () => {
      const { container } = renderWithTemplateContext(
        <ProgressTracker theme="minimal" display="bars">
          <ProgressItem label="React" value={75} color="blue" />
        </ProgressTracker>,
        { residentData: mockData }
      );

      const progressBar = container.querySelector('.ts-progress-bar-fill');
      expect(progressBar).toHaveClass('bg-slate-600');
    });
  });

  describe('Layout Options', () => {
    it('should render in vertical layout by default', () => {
      const { container } = renderWithTemplateContext(
        <ProgressTracker>
          <ProgressItem label="Skill 1" value={75} />
          <ProgressItem label="Skill 2" value={85} />
        </ProgressTracker>,
        { residentData: mockData }
      );

      const tracker = container.querySelector('.ts-progress-tracker');
      expect(tracker).not.toHaveClass('flex', 'flex-wrap', 'gap-4');
    });

    it('should render in horizontal layout when specified', () => {
      const { container } = renderWithTemplateContext(
        <ProgressTracker layout="horizontal">
          <ProgressItem label="Skill 1" value={75} />
          <ProgressItem label="Skill 2" value={85} />
        </ProgressTracker>,
        { residentData: mockData }
      );

      const tracker = container.querySelector('.ts-progress-tracker');
      expect(tracker).toHaveClass('flex', 'flex-wrap', 'gap-4');
    });
  });

  describe('Size Variations', () => {
    it('should apply small size classes', () => {
      const { container } = renderWithTemplateContext(
        <ProgressTracker size="sm" title="Small Skills">
          <ProgressItem label="React" value={75} />
        </ProgressTracker>,
        { residentData: mockData }
      );

      const tracker = container.querySelector('.ts-progress-tracker');
      expect(tracker).toHaveClass('text-sm');
      
      const title = container.querySelector('.ts-progress-tracker-title');
      expect(title).toHaveClass('text-base', 'font-medium', 'mb-2');
    });

    it('should apply large size classes', () => {
      const { container } = renderWithTemplateContext(
        <ProgressTracker size="lg" title="Large Skills">
          <ProgressItem label="React" value={75} />
        </ProgressTracker>,
        { residentData: mockData }
      );

      const tracker = container.querySelector('.ts-progress-tracker');
      expect(tracker).toHaveClass('text-lg');
      
      const title = container.querySelector('.ts-progress-tracker-title');
      expect(title).toHaveClass('text-xl', 'font-bold', 'mb-4');
    });
  });

  describe('Show Values Option', () => {
    it('should show values by default', () => {
      renderWithTemplateContext(
        <ProgressTracker>
          <ProgressItem label="React" value={85} />
        </ProgressTracker>,
        { residentData: mockData }
      );

      expect(screen.getByText('85%')).toBeInTheDocument();
    });

    it('should hide values when showValues is false', () => {
      renderWithTemplateContext(
        <ProgressTracker showValues={false}>
          <ProgressItem label="React" value={85} />
        </ProgressTracker>,
        { residentData: mockData }
      );

      expect(screen.queryByText('85%')).not.toBeInTheDocument();
      expect(screen.getByText('React')).toBeInTheDocument();
    });
  });

  describe('Custom Max Values', () => {
    it('should handle custom max values correctly', () => {
      renderWithTemplateContext(
        <ProgressTracker display="bars">
          <ProgressItem label="Score" value={8} max={10} />
          <ProgressItem label="Rating" value={3} max={4} />
        </ProgressTracker>,
        { residentData: mockData }
      );

      expect(screen.getByText('8/10')).toBeInTheDocument();
      expect(screen.getByText('3/4')).toBeInTheDocument();
    });

    it('should calculate percentages correctly with custom max', () => {
      const { container } = renderWithTemplateContext(
        <ProgressTracker display="bars">
          <ProgressItem label="Score" value={8} max={10} />
        </ProgressTracker>,
        { residentData: mockData }
      );

      const progressBar = container.querySelector('.ts-progress-bar-fill');
      expect(progressBar).toHaveStyle('width: 80%'); // 8/10 = 80%
    });
  });

  describe('Custom Styling Support', () => {
    it('should apply custom className', () => {
      const { container } = renderWithTemplateContext(
        <ProgressTracker className="custom-tracker-style">
          <ProgressItem label="React" value={75} />
        </ProgressTracker>,
        { residentData: mockData }
      );

      const tracker = container.querySelector('.ts-progress-tracker');
      expect(tracker).toHaveClass('custom-tracker-style');
    });

    it('should handle className as array', () => {
      const { container } = renderWithTemplateContext(
        <ProgressTracker className={['custom-style-1', 'custom-style-2']}>
          <ProgressItem label="React" value={75} />
        </ProgressTracker>,
        { residentData: mockData }
      );

      const tracker = container.querySelector('.ts-progress-tracker');
      expect(tracker).toHaveClass('custom-style-1', 'custom-style-2');
    });
  });

  describe('Accessibility', () => {
    it('should include appropriate ARIA attributes for progress bars', () => {
      const { container } = renderWithTemplateContext(
        <ProgressTracker display="bars">
          <ProgressItem label="React" value={75} description="React proficiency level" />
        </ProgressTracker>,
        { residentData: mockData }
      );

      const progressBar = container.querySelector('.ts-progress-bar-fill');
      expect(progressBar).toHaveAttribute('title', 'React proficiency level');
    });

    it('should provide meaningful text content for screen readers', () => {
      renderWithTemplateContext(
        <ProgressTracker>
          <ProgressItem label="React" value={75} />
        </ProgressTracker>,
        { residentData: mockData }
      );

      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
    });
  });

  describe('Data Attribute Support (Template Rendering)', () => {
    it('should handle progress items from template data attributes', () => {
      renderWithTemplateContext(
        <ProgressTracker>
          <div 
            data-progress-label="JavaScript"
            data-progress-value="85"
            data-progress-max="100"
            data-progress-color="yellow"
          />
          <div
            data-progress-label="Python"
            data-progress-value="7"
            data-progress-max="10"
            data-progress-color="green"
          />
        </ProgressTracker>,
        { residentData: mockData }
      );

      expect(screen.getByText('JavaScript')).toBeInTheDocument();
      expect(screen.getByText('Python')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('7/10')).toBeInTheDocument();
    });
  });
});