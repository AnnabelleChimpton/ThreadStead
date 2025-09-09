import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SkillChart, { Skill } from '../SkillChart';

// Test data
const sampleSkills = [
  <Skill key="1" name="React" level={90} category="Frontend" color="#3B82F6" icon="⚛️" description="React library" yearsExperience={3} priority={10} />,
  <Skill key="2" name="TypeScript" level={85} category="Languages" color="#3178C6" icon="📘" description="TypeScript language" yearsExperience={2} priority={9} />,
  <Skill key="3" name="Node.js" level={80} category="Backend" color="#339933" icon="🟢" description="Node.js runtime" yearsExperience={3} priority={8} />,
  <Skill key="4" name="CSS" level={95} category="Frontend" color="#1572B6" icon="🎨" description="CSS styling" yearsExperience={5} priority={7} />
];

describe('SkillChart', () => {
  describe('Basic Rendering', () => {
    it('should render skill chart with skills', () => {
      render(
        <SkillChart title="My Skills">
          {sampleSkills}
        </SkillChart>
      );

      expect(screen.getByText('My Skills')).toBeInTheDocument();
      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('TypeScript')).toBeInTheDocument();
      expect(screen.getByText('Node.js')).toBeInTheDocument();
      expect(screen.getByText('CSS')).toBeInTheDocument();
    });

    it('should render custom title when provided', () => {
      render(
        <SkillChart title="Technical Expertise">
          {sampleSkills}
        </SkillChart>
      );

      expect(screen.getByText('Technical Expertise')).toBeInTheDocument();
    });

    it('should handle empty state gracefully', () => {
      render(<SkillChart />);

      expect(screen.getByText('No skills provided')).toBeInTheDocument();
      expect(screen.getByText('Add Skill components to display your skills')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <SkillChart className="custom-skill-chart">
          {sampleSkills}
        </SkillChart>
      );

      expect(container.querySelector('.custom-skill-chart')).toBeInTheDocument();
    });

    it('should handle className as array', () => {
      const { container } = render(
        <SkillChart className={['custom-skill-chart', 'another-class']}>
          {sampleSkills}
        </SkillChart>
      );

      const chartElement = container.querySelector('.custom-skill-chart.another-class');
      expect(chartElement).toBeInTheDocument();
    });
  });

  describe('Display Modes', () => {
    it('should render bars display mode correctly', () => {
      render(
        <SkillChart display="bars">
          {sampleSkills}
        </SkillChart>
      );

      // Check for progress bars
      const progressBars = document.querySelectorAll('.ts-skill-bar-fill');
      expect(progressBars.length).toBeGreaterThan(0);
    });

    it('should render radial display mode correctly', () => {
      render(
        <SkillChart display="radial">
          {sampleSkills}
        </SkillChart>
      );

      // Check for SVG circles
      const circles = document.querySelectorAll('svg circle');
      expect(circles.length).toBeGreaterThan(0);
    });

    it('should render bubbles display mode correctly', () => {
      render(
        <SkillChart display="bubbles">
          {sampleSkills}
        </SkillChart>
      );

      // Check for bubble elements
      const bubbles = document.querySelectorAll('.ts-skill-bubble');
      expect(bubbles.length).toBeGreaterThan(0);
    });

    it('should render tags display mode correctly', () => {
      render(
        <SkillChart display="tags">
          {sampleSkills}
        </SkillChart>
      );

      // Check for tag elements
      const tags = document.querySelectorAll('.ts-skill-tag');
      expect(tags.length).toBeGreaterThan(0);
    });
  });

  describe('Theme Variations', () => {
    it('should apply modern theme classes by default', () => {
      const { container } = render(
        <SkillChart>
          {sampleSkills}
        </SkillChart>
      );

      const chartElement = container.querySelector('.ts-skill-chart');
      expect(chartElement).toHaveClass('bg-white', 'border-gray-200');
    });

    it('should apply neon theme classes', () => {
      const { container } = render(
        <SkillChart theme="neon">
          {sampleSkills}
        </SkillChart>
      );

      const chartElement = container.querySelector('.ts-skill-chart');
      expect(chartElement).toHaveClass('bg-gray-900', 'border-cyan-400');
    });

    it('should apply professional theme classes', () => {
      const { container } = render(
        <SkillChart theme="professional">
          {sampleSkills}
        </SkillChart>
      );

      const chartElement = container.querySelector('.ts-skill-chart');
      expect(chartElement).toHaveClass('bg-slate-50', 'border-slate-300');
    });

    it('should apply minimal theme classes', () => {
      const { container } = render(
        <SkillChart theme="minimal">
          {sampleSkills}
        </SkillChart>
      );

      const chartElement = container.querySelector('.ts-skill-chart');
      expect(chartElement).toHaveClass('bg-white', 'border-gray-300');
    });
  });

  describe('Size Variations', () => {
    it('should apply small size classes', () => {
      const { container } = render(
        <SkillChart size="sm">
          {sampleSkills}
        </SkillChart>
      );

      const chartElement = container.querySelector('.ts-skill-chart');
      expect(chartElement).toHaveClass('text-sm');
    });

    it('should apply medium size classes by default', () => {
      const { container } = render(
        <SkillChart>
          {sampleSkills}
        </SkillChart>
      );

      const chartElement = container.querySelector('.ts-skill-chart');
      expect(chartElement).toHaveClass('text-base');
    });

    it('should apply large size classes', () => {
      const { container } = render(
        <SkillChart size="lg">
          {sampleSkills}
        </SkillChart>
      );

      const chartElement = container.querySelector('.ts-skill-chart');
      expect(chartElement).toHaveClass('text-lg');
    });
  });

  describe('Layout Options', () => {
    it('should render grid layout correctly with radial display', () => {
      const { container } = render(
        <SkillChart layout="grid" display="radial" showCategories={false}>
          {sampleSkills}
        </SkillChart>
      );

      const skillsList = container.querySelector('.ts-skill-list');
      expect(skillsList).toHaveClass('grid');
    });

    it('should render columns layout correctly', () => {
      const { container } = render(
        <SkillChart layout="columns" showCategories={false}>
          {sampleSkills}
        </SkillChart>
      );

      // Columns layout should be present
      const skillsList = container.querySelector('.ts-skill-list');
      expect(skillsList).toBeInTheDocument();
    });

    it('should render flow layout correctly', () => {
      const { container } = render(
        <SkillChart layout="flow" showCategories={false}>
          {sampleSkills}
        </SkillChart>
      );

      const skillsList = container.querySelector('.ts-skill-list');
      expect(skillsList).toHaveClass('flex', 'flex-wrap');
    });
  });

  describe('Sorting Options', () => {
    it('should sort by proficiency by default', () => {
      render(
        <SkillChart showCategories={false}>
          {sampleSkills}
        </SkillChart>
      );

      const skills = document.querySelectorAll('.ts-skill-item');
      // CSS should appear first (95%), then React (90%)
      expect(skills[0]).toHaveTextContent('CSS');
      expect(skills[1]).toHaveTextContent('React');
    });

    it('should sort by name when specified', () => {
      render(
        <SkillChart sortBy="name" showCategories={false}>
          {sampleSkills}
        </SkillChart>
      );

      const skills = document.querySelectorAll('.ts-skill-item');
      // Should be alphabetical: CSS, Node.js, React, TypeScript
      expect(skills[0]).toHaveTextContent('CSS');
      expect(skills[1]).toHaveTextContent('Node.js');
    });

    it('should sort by custom priority when specified', () => {
      render(
        <SkillChart sortBy="custom" showCategories={false}>
          {sampleSkills}
        </SkillChart>
      );

      const skills = document.querySelectorAll('.ts-skill-item');
      // Should be by priority: React (10), TypeScript (9), Node.js (8), CSS (7)
      expect(skills[0]).toHaveTextContent('React');
      expect(skills[1]).toHaveTextContent('TypeScript');
    });
  });

  describe('Category Functionality', () => {
    it('should group skills by category when showCategories is true', () => {
      render(
        <SkillChart showCategories={true}>
          {sampleSkills}
        </SkillChart>
      );

      expect(screen.getByText('Frontend')).toBeInTheDocument();
      expect(screen.getByText('Backend')).toBeInTheDocument();
      expect(screen.getByText('Languages')).toBeInTheDocument();
    });

    it('should not show category groupings when showCategories is false', () => {
      render(
        <SkillChart showCategories={false}>
          {sampleSkills}
        </SkillChart>
      );

      // Should not have category headers
      expect(screen.queryByText('Frontend')).not.toBeInTheDocument();
      expect(screen.queryByText('Backend')).not.toBeInTheDocument();
    });

    it('should allow collapsing/expanding categories', async () => {
      render(
        <SkillChart showCategories={true}>
          {sampleSkills}
        </SkillChart>
      );

      // Find the frontend category toggle button
      const frontendButton = screen.getByText('Frontend').closest('button');
      expect(frontendButton).toBeInTheDocument();
      
      // Initially expanded, should show React and CSS
      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('CSS')).toBeInTheDocument();

      // Collapse the category
      fireEvent.click(frontendButton!);

      await waitFor(() => {
        // After collapse, the skills should not be present in DOM
        expect(screen.queryByText('React')).not.toBeInTheDocument();
        expect(screen.queryByText('CSS')).not.toBeInTheDocument();
      });
    });
  });

  describe('Value Display', () => {
    it('should show values when showValues is true', () => {
      render(
        <SkillChart showValues={true}>
          {sampleSkills}
        </SkillChart>
      );

      expect(screen.getByText(/90\/100/)).toBeInTheDocument();
      expect(screen.getByText(/85\/100/)).toBeInTheDocument();
    });

    it('should hide values when showValues is false', () => {
      render(
        <SkillChart showValues={false}>
          {sampleSkills}
        </SkillChart>
      );

      expect(screen.queryByText(/90\/100/)).not.toBeInTheDocument();
      expect(screen.queryByText(/85\/100/)).not.toBeInTheDocument();
    });

    it('should handle custom max values correctly', () => {
      render(
        <SkillChart showValues={true}>
          <Skill name="Language Skills" level={4} max={5} />
        </SkillChart>
      );

      expect(screen.getByText(/4\/5/)).toBeInTheDocument();
    });
  });

  describe('Max Display Limit', () => {
    it('should limit the number of skills displayed when maxDisplay is set', () => {
      render(
        <SkillChart maxDisplay={2}>
          {sampleSkills}
        </SkillChart>
      );

      const skills = document.querySelectorAll('.ts-skill-item');
      expect(skills).toHaveLength(2);
    });

    it('should show all skills when maxDisplay is not set', () => {
      render(
        <SkillChart>
          {sampleSkills}
        </SkillChart>
      );

      const skills = document.querySelectorAll('.ts-skill-item');
      expect(skills).toHaveLength(4);
    });
  });

  describe('Tooltips and Descriptions', () => {
    it('should show tooltip on hover when description is provided', async () => {
      render(
        <SkillChart>
          {sampleSkills}
        </SkillChart>
      );

      const reactSkill = screen.getByText('React').closest('.ts-skill-item');
      
      fireEvent.mouseEnter(reactSkill!);

      await waitFor(() => {
        expect(screen.getByText('React library')).toBeInTheDocument();
        expect(screen.getByText('3 years experience')).toBeInTheDocument();
      });
    });

    it('should hide tooltip on mouse leave', async () => {
      render(
        <SkillChart>
          {sampleSkills}
        </SkillChart>
      );

      const reactSkill = screen.getByText('React').closest('.ts-skill-item');
      
      fireEvent.mouseEnter(reactSkill!);
      fireEvent.mouseLeave(reactSkill!);

      await waitFor(() => {
        expect(screen.queryByText('React library')).not.toBeInTheDocument();
      });
    });
  });

  describe('Icons and Colors', () => {
    it('should display custom icons when provided', () => {
      render(
        <SkillChart>
          {sampleSkills}
        </SkillChart>
      );

      expect(screen.getByText('⚛️')).toBeInTheDocument(); // React icon
      expect(screen.getByText('📘')).toBeInTheDocument(); // TypeScript icon
    });

    it('should apply custom colors to skill elements', () => {
      render(
        <SkillChart display="bars">
          <Skill name="Custom Skill" level={80} color="#FF5733" />
        </SkillChart>
      );

      const skillBar = document.querySelector('.ts-skill-bar-fill');
      expect(skillBar).toHaveStyle('background-color: #FF5733');
    });
  });

  describe('Data Attribute Support (Template Rendering)', () => {
    it('should handle skills from template data attributes', () => {
      const templateSkill = (
        <div 
          data-skill-name="Template Skill"
          data-skill-level="75"
          data-skill-category="Other"
          data-skill-max="100"
          data-skill-priority="5"
        />
      );

      render(
        <SkillChart>
          {templateSkill}
        </SkillChart>
      );

      expect(screen.getByText('Template Skill')).toBeInTheDocument();
    });

    it('should handle template skills with custom max values', () => {
      const templateSkill = (
        <div 
          data-skill-name="Rating"
          data-skill-level="4"
          data-skill-max="5"
        />
      );

      render(
        <SkillChart showValues={true}>
          {templateSkill}
        </SkillChart>
      );

      expect(screen.getByText(/4\/5/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <SkillChart>
          {sampleSkills}
        </SkillChart>
      );

      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
    });

    it('should announce chart information to screen readers', () => {
      render(
        <SkillChart display="radial" theme="neon">
          {sampleSkills}
        </SkillChart>
      );

      expect(screen.getByText(/Showing 4 skills in radial format, theme: neon/)).toBeInTheDocument();
    });

    it('should have proper heading structure', () => {
      render(
        <SkillChart title="My Skills">
          {sampleSkills}
        </SkillChart>
      );

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('My Skills');
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle skills with zero level', () => {
      render(
        <SkillChart>
          <Skill name="Learning Skill" level={0} />
        </SkillChart>
      );

      expect(screen.getByText('Learning Skill')).toBeInTheDocument();
    });

    it('should handle skills with maximum level', () => {
      render(
        <SkillChart showValues={true}>
          <Skill name="Expert Skill" level={100} />
        </SkillChart>
      );

      expect(screen.getByText(/100\/100 \(100%\)/)).toBeInTheDocument();
    });

    it('should handle very long skill names gracefully', () => {
      const longName = 'Very Long Skill Name That Should Be Handled Properly Without Breaking Layout';
      
      render(
        <SkillChart>
          <Skill name={longName} level={50} />
        </SkillChart>
      );

      expect(screen.getByText(longName)).toBeInTheDocument();
    });

    it('should handle many skills efficiently', () => {
      const manySkills = Array.from({ length: 50 }, (_, i) => (
        <Skill key={i} name={`Skill ${i + 1}`} level={Math.random() * 100} />
      ));

      render(
        <SkillChart>
          {manySkills}
        </SkillChart>
      );

      expect(screen.getByText('Skill 1')).toBeInTheDocument();
      expect(screen.getByText('Skill 50')).toBeInTheDocument();
    });
  });
});